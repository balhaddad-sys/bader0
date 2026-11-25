package app.bedsidefield;

import android.Manifest;
import android.app.admin.DevicePolicyManager;
import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraDevice;
import android.hardware.camera2.CameraManager;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.webkit.WebView;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/**
 * Finds out, natively, why the page could not get the camera: app permission, device-management policy,
 * no camera, another app holding it, or a camera that works natively (which points at the WebView).
 * Runs on the JavaBridge thread when the page shows its "Camera not available" panel.
 */
final class CameraDoctor {
    private CameraDoctor() { }

    static String frontId(Context ctx) throws CameraAccessException {
        CameraManager cm = (CameraManager) ctx.getSystemService(Context.CAMERA_SERVICE);
        for (String id : cm.getCameraIdList()) {
            Integer f = cm.getCameraCharacteristics(id).get(CameraCharacteristics.LENS_FACING);
            if (f != null && f == CameraCharacteristics.LENS_FACING_FRONT) return id;
        }
        return "";
    }

    static String report(Context ctx, String lastEvent) {
        List<String> facts = new ArrayList<>();
        facts.add("Android " + Build.VERSION.RELEASE + " on " + Build.MANUFACTURER + " " + Build.MODEL);
        String wv = webViewVersion(ctx);
        if (wv != null) facts.add("Android System WebView " + wv);

        boolean perm = ctx.checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
        facts.add("camera permission " + (perm ? "allowed" : "NOT allowed"));

        boolean policyOff = false;
        try {
            DevicePolicyManager dpm = (DevicePolicyManager) ctx.getSystemService(Context.DEVICE_POLICY_SERVICE);
            policyOff = dpm != null && dpm.getCameraDisabled(null);
        } catch (Exception ignored) { }
        if (policyOff) facts.add("camera DISABLED by device management");

        CameraManager cm = (CameraManager) ctx.getSystemService(Context.CAMERA_SERVICE);
        String[] ids = new String[0];
        String frontId = null;
        List<String> cams = new ArrayList<>();
        try {
            ids = cm.getCameraIdList();
            for (String id : ids) {
                Integer f = cm.getCameraCharacteristics(id).get(CameraCharacteristics.LENS_FACING);
                String side = f == null ? "unknown" : f == CameraCharacteristics.LENS_FACING_FRONT ? "front"
                    : f == CameraCharacteristics.LENS_FACING_BACK ? "back" : "external";
                if ("front".equals(side) && frontId == null) frontId = id;
                cams.add(id + ":" + side);
            }
        } catch (Exception e) {
            facts.add("camera list error: " + e.getMessage());
        }
        facts.add("cameras " + (cams.isEmpty() ? "none" : cams.toString()));
        String testId = frontId != null ? frontId : (ids.length > 0 ? ids[0] : null);

        HandlerThread thread = new HandlerThread("camera-doctor");
        thread.start();
        Handler handler = new Handler(thread.getLooper());
        String open = null;
        boolean busy = false, disabled = policyOff, broken = false, opened = false;
        try {
            // Which cameras another app is holding right now (reported straight after registering).
            final Set<String> held = Collections.synchronizedSet(new HashSet<String>());
            CameraManager.AvailabilityCallback cb = new CameraManager.AvailabilityCallback() {
                @Override public void onCameraAvailable(String id) { held.remove(id); }
                @Override public void onCameraUnavailable(String id) { held.add(id); }
            };
            cm.registerAvailabilityCallback(cb, handler);
            sleep(400);
            cm.unregisterAvailabilityCallback(cb);
            if (testId != null && held.contains(testId)) { busy = true; facts.add("camera " + testId + " is in use by another app"); }

            // Try to open the camera ourselves, then close it straight away.
            if (perm && !policyOff && testId != null) {
                final CountDownLatch done = new CountDownLatch(1);
                final String[] result = new String[1];
                final int[] code = { 0 };
                try {
                    cm.openCamera(testId, new CameraDevice.StateCallback() {
                        @Override public void onOpened(CameraDevice d) { result[0] = "opens normally"; code[0] = 0; d.close(); done.countDown(); }
                        @Override public void onDisconnected(CameraDevice d) { result[0] = "was taken by another app"; code[0] = -1; d.close(); done.countDown(); }
                        @Override public void onError(CameraDevice d, int e) { result[0] = deviceError(e); code[0] = e; d.close(); done.countDown(); }
                    }, handler);
                    if (!done.await(4, TimeUnit.SECONDS)) { result[0] = "did not answer within 4 s"; code[0] = 99; }
                } catch (CameraAccessException e) {
                    result[0] = accessError(e.getReason());
                    code[0] = e.getReason() == CameraAccessException.CAMERA_DISABLED ? CameraDevice.StateCallback.ERROR_CAMERA_DISABLED
                        : e.getReason() == CameraAccessException.CAMERA_IN_USE || e.getReason() == CameraAccessException.MAX_CAMERAS_IN_USE
                        ? CameraDevice.StateCallback.ERROR_CAMERA_IN_USE : 98;
                } catch (SecurityException e) {
                    result[0] = "refused (no permission)"; code[0] = 97;
                }
                open = result[0];
                int c = code[0];
                opened = c == 0;
                if (c == CameraDevice.StateCallback.ERROR_CAMERA_DISABLED) disabled = true;
                else if (c == -1 || c == CameraDevice.StateCallback.ERROR_CAMERA_IN_USE || c == CameraDevice.StateCallback.ERROR_MAX_CAMERAS_IN_USE) busy = true;
                else if (c != 0 && c != 97) broken = true;
                facts.add("native open test: camera " + testId + " " + open);
            }
        } catch (Exception e) {
            facts.add("check error: " + e);
        } finally {
            thread.quitSafely();
        }

        String verdict;
        if (!perm) verdict = "Bedside Field does not have camera permission. Open Android Settings → Apps → Bedside Field → Permissions → Camera → Allow, then tap “Try the camera again”.";
        else if (disabled) verdict = "This tablet's device management (hospital IT / MDM policy) has switched the camera off for all apps. Ask IT to allow the camera, or use examiner scoring.";
        else if (ids.length == 0) verdict = "Android reports no camera on this device.";
        else if (busy) verdict = "Another app is holding the camera (video call, camera app, screen recorder or a background app). Close it, or restart the tablet, then tap “Try the camera again”.";
        else if (broken) verdict = "The camera service is not responding. Restart the tablet, then try again.";
        else if (opened) verdict = "The camera itself works, so the in-app browser engine (Android System WebView) is failing to use it. Update “Android System WebView” and “Chrome” in the Play Store, restart the tablet, and try again.";
        else verdict = "Cause not identified.";

        StringBuilder sb = new StringBuilder("App check: ").append(verdict).append(" [");
        for (int i = 0; i < facts.size(); i++) sb.append(i == 0 ? "" : " · ").append(facts.get(i));
        sb.append(" · last camera event: ").append(lastEvent).append("]");
        return sb.toString();
    }

    private static String deviceError(int e) {
        switch (e) {
            case CameraDevice.StateCallback.ERROR_CAMERA_IN_USE: return "is in use by another app";
            case CameraDevice.StateCallback.ERROR_MAX_CAMERAS_IN_USE: return "refused: too many cameras open";
            case CameraDevice.StateCallback.ERROR_CAMERA_DISABLED: return "is disabled by device policy";
            case CameraDevice.StateCallback.ERROR_CAMERA_DEVICE: return "hardware error";
            case CameraDevice.StateCallback.ERROR_CAMERA_SERVICE: return "camera service error";
            default: return "error " + e;
        }
    }

    private static String accessError(int r) {
        switch (r) {
            case CameraAccessException.CAMERA_DISABLED: return "is disabled by device policy";
            case CameraAccessException.CAMERA_DISCONNECTED: return "is disconnected";
            case CameraAccessException.CAMERA_ERROR: return "reported an error";
            case CameraAccessException.CAMERA_IN_USE: return "is in use by another app";
            case CameraAccessException.MAX_CAMERAS_IN_USE: return "refused: too many cameras open";
            default: return "access error " + r;
        }
    }

    private static String webViewVersion(Context ctx) {
        try {
            if (Build.VERSION.SDK_INT >= 26) { // WebView.getCurrentWebViewPackage() is API 26
                PackageInfo p = (PackageInfo) WebView.class.getMethod("getCurrentWebViewPackage").invoke(null);
                if (p != null) return p.versionName;
            }
        } catch (Exception ignored) { }
        return null;
    }

    private static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException ignored) { Thread.currentThread().interrupt(); }
    }
}

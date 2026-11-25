package app.bedsidefield;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.provider.Settings;
import android.webkit.PermissionRequest;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/**
 * Connects the page's camera requests (WebView PermissionRequest) to Android's camera permission.
 * Android allows only one permission prompt at a time, and the page may ask twice in a row (it retries with looser
 * constraints), so page requests are queued until the single prompt is answered. All methods run on the UI thread.
 */
final class CameraPermissions {
    private final Activity activity;
    private final int requestCode;
    private final List<PermissionRequest> waiting = new ArrayList<>();
    private boolean asking;
    private String lastEvent = "the page has not asked for the camera yet";

    CameraPermissions(Activity activity, int requestCode) {
        this.activity = activity;
        this.requestCode = requestCode;
    }

    /** The last thing that happened, with a time stamp (shown in the page's camera diagnosis). */
    String lastEvent() { return lastEvent; }

    boolean granted() {
        return activity.checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
    }

    /** Asked once at start-up, so the page's camera request later is granted instantly (no prompt mid-getUserMedia). */
    void askAtStartup() {
        if (!granted()) ask();
    }

    void onPageRequest(PermissionRequest req) {
        String[] res = req.getResources();
        boolean video = false;
        for (String r : res) if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) video = true;
        Uri origin = req.getOrigin();
        if (!video || origin == null || !AssetServer.HOST.equals(origin.getHost())) {
            note("refused a page request for " + Arrays.toString(res) + " from " + origin);
            req.deny();
            return;
        }
        if (granted()) {
            req.grant(new String[] { PermissionRequest.RESOURCE_VIDEO_CAPTURE });
            note("page asked for the camera → granted");
        } else {
            waiting.add(req);
            note("page asked for the camera → waiting for the Android permission prompt");
            ask();
        }
    }

    void onPageRequestCanceled(PermissionRequest req) {
        waiting.remove(req);
    }

    /** Shows Android's camera prompt unless one is already on screen (a second request would be cancelled). */
    private void ask() {
        if (asking) return;
        asking = true;
        activity.requestPermissions(new String[] { Manifest.permission.CAMERA }, requestCode);
    }

    /** Android's answer; `answered` is false when the prompt was closed without a choice. */
    void onResult(boolean answered) {
        asking = false;
        boolean ok = granted(); // the real state, whatever the result array says
        boolean pageWaiting = !waiting.isEmpty();
        for (PermissionRequest req : waiting) {
            if (ok) req.grant(new String[] { PermissionRequest.RESOURCE_VIDEO_CAPTURE });
            else req.deny();
        }
        waiting.clear();
        note("Android camera permission " + (ok ? "allowed" : answered ? "refused" : "prompt closed without an answer")
            + (pageWaiting ? (ok ? " → page granted" : " → page refused") : ""));
        // Refused with "don't ask again" (or twice on Android 11+): Android will not prompt any more.
        if (pageWaiting && answered && !ok && !activity.shouldShowRequestPermissionRationale(Manifest.permission.CAMERA)) offerAppSettings();
    }

    /** Activity is going away: refuse whatever is still waiting. */
    void denyAll() {
        for (PermissionRequest req : waiting) req.deny();
        waiting.clear();
    }

    private void offerAppSettings() {
        new AlertDialog.Builder(activity)
            .setTitle("Camera is turned off")
            .setMessage("Android is blocking the camera for Bedside Field, so the eye-movement camera mode cannot run. "
                + "Open settings → Permissions → Camera → Allow, then come back and tap “Try the camera again”.")
            .setPositiveButton("Open settings", new DialogInterface.OnClickListener() {
                @Override public void onClick(DialogInterface d, int w) {
                    try {
                        activity.startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + activity.getPackageName())));
                    } catch (Exception ignored) { }
                }
            })
            .setNegativeButton("Not now", null)
            .show();
    }

    private void note(String event) {
        lastEvent = new SimpleDateFormat("HH:mm:ss", Locale.ROOT).format(new Date()) + " " + event;
    }
}

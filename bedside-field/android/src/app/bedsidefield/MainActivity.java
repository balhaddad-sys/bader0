package app.bedsidefield;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;

/**
 * Bedside Field as an Android app: one full-screen, landscape WebView showing the bundled web app.
 *   AssetServer        serves assets/www at https://appassets.androidplatform.net/ (secure origin, offline)
 *   NativeBridge       window.BedsideNative: saveFile, print, cameraReport, frontCameraId
 *   Exports            Download/BedsideField files and the print dialog
 *   CameraPermissions  page camera requests <-> Android's camera permission
 *   CameraDoctor       native diagnosis when the camera will not start
 * This class only sets up the window and the WebView, and routes lifecycle and permission results.
 */
public class MainActivity extends Activity {
    private static final int REQ_CAMERA = 1;
    private static final int REQ_STORAGE = 2;
    private static final int BG = Color.rgb(11, 15, 20);

    private WebView web;
    private CameraPermissions camera;
    private Exports exports;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        camera = new CameraPermissions(this, REQ_CAMERA);
        exports = new Exports(this, REQ_STORAGE);

        web = new WebView(this);
        web.setBackgroundColor(BG);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // settings and sessions live in localStorage
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setUserAgentString(s.getUserAgentString() + " BedsideFieldApp/" + versionName());
        web.addJavascriptInterface(new NativeBridge(this, web, exports, camera), NativeBridge.NAME);
        web.setWebViewClient(new AssetServer(this));
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest req) {
                runOnUiThread(new Runnable() { @Override public void run() { camera.onPageRequest(req); } });
            }

            @Override
            public void onPermissionRequestCanceled(final PermissionRequest req) {
                runOnUiThread(new Runnable() { @Override public void run() { camera.onPageRequestCanceled(req); } });
            }
        });

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(BG);
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        // Keep the page out from under a camera notch / punch-hole (edge-to-edge is enforced on Android 15+), with equal
        // padding on both sides so the page stays centred on the physical screen.
        root.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override
            public WindowInsets onApplyWindowInsets(View v, WindowInsets insets) {
                int[] p = ScreenInsets.centred(cutoutInsets(insets));
                v.setPadding(p[0], p[1], p[2], p[3]);
                return insets;
            }
        });
        setContentView(root);
        hideSystemUi();

        web.loadUrl(AssetServer.START_URL);
        camera.askAtStartup();
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] results) {
        boolean answered = results.length > 0;
        if (code == REQ_CAMERA) camera.onResult(answered);
        else if (code == REQ_STORAGE) exports.onStoragePermission(answered && results[0] == android.content.pm.PackageManager.PERMISSION_GRANTED);
    }

    // ---------------------------------------------------------------- window

    private void hideSystemUi() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }

    /** Safe insets of the display cutout {left, top, right, bottom}; zero before Android 9. */
    private static int[] cutoutInsets(WindowInsets insets) {
        int[] r = new int[4];
        if (Build.VERSION.SDK_INT < 28) return r;
        try { // DisplayCutout is API 28; reflected so this builds against an older android.jar.
            Object c = WindowInsets.class.getMethod("getDisplayCutout").invoke(insets);
            if (c == null) return r;
            String[] m = { "getSafeInsetLeft", "getSafeInsetTop", "getSafeInsetRight", "getSafeInsetBottom" };
            for (int i = 0; i < 4; i++) r[i] = (Integer) c.getClass().getMethod(m[i]).invoke(c);
        } catch (Exception ignored) { }
        return r;
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemUi();
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (web.canGoBack()) { web.goBack(); return; }      // e.g. back from the camera test page
        new AlertDialog.Builder(this)
            .setMessage("Close Bedside Field?")
            .setPositiveButton("Close", new DialogInterface.OnClickListener() {
                @Override public void onClick(DialogInterface d, int w) { finish(); }
            })
            .setNegativeButton("Stay", null)
            .show();
    }

    // ---------------------------------------------------------------- lifecycle

    // The WebView is paused in onStop, not onPause: Android's permission prompt pauses the activity, and pausing
    // the WebView there hides the page in the middle of its camera request.
    @Override
    protected void onStart() {
        super.onStart();
        web.onResume();
    }

    @Override
    protected void onResume() {
        super.onResume();
        hideSystemUi();
    }

    @Override
    protected void onStop() {
        web.onPause();
        super.onStop();
    }

    @Override
    protected void onDestroy() {
        camera.denyAll();
        web.destroy();
        super.onDestroy();
    }

    private String versionName() {
        try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; }
        catch (Exception e) { return "1"; }
    }
}

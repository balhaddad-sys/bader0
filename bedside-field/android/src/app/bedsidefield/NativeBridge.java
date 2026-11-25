package app.bedsidefield;

import android.app.Activity;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

/**
 * window.BedsideNative for the page (see web/js/platform.js). JavaScript calls arrive on a background thread;
 * anything that touches views or dialogs is moved to the UI thread.
 */
final class NativeBridge {
    static final String NAME = "BedsideNative";

    private final Activity activity;
    private final WebView web;
    private final Exports exports;
    private final CameraPermissions camera;

    NativeBridge(Activity activity, WebView web, Exports exports, CameraPermissions camera) {
        this.activity = activity;
        this.web = web;
        this.exports = exports;
        this.camera = camera;
    }

    @JavascriptInterface
    public void saveFile(final String name, final String type, final String text) {
        activity.runOnUiThread(new Runnable() { @Override public void run() { exports.save(name, type, text); } });
    }

    @JavascriptInterface
    public void print() {
        activity.runOnUiThread(new Runnable() { @Override public void run() { exports.print(web); } });
    }

    /** Camera2 id of the first front-facing camera ("" if none), so the page can pick it by its label. */
    @JavascriptInterface
    public String frontCameraId() {
        try { return CameraDoctor.frontId(activity); } catch (Throwable t) { return ""; }
    }

    /** Plain-text diagnosis of why the camera could not start, shown in the page's error panel. */
    @JavascriptInterface
    public String cameraReport() {
        try { return CameraDoctor.report(activity, camera.lastEvent()); }
        catch (Throwable t) { return "Camera check failed: " + t; }
    }
}

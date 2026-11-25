package app.bedsidefield;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Color;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.provider.Settings;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Bedside Field as an Android app: a full-screen WebView that serves the bundled PWA from
 * assets/www at https://appassets.androidplatform.net/ (a secure origin, so getUserMedia and
 * ES modules work), grants the front camera, and implements the page's `BedsideNative` bridge
 * (saveFile → Download/BedsideField, print → Android print dialog).
 */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/index.html";
    private static final int REQ_CAMERA = 1;
    private static final int REQ_STORAGE = 2;
    private static final int BG = Color.rgb(11, 15, 20);

    private WebView web;
    // Page camera requests waiting for Android's answer. Android allows only one permission prompt at a time,
    // and the page may ask twice in a row (it retries with looser constraints), so requests are queued.
    private final List<PermissionRequest> waitingCamera = new ArrayList<>();
    private boolean askingCamera;
    private String lastCameraEvent = "the page has not asked for the camera yet";
    private String[] pendingSave; // {name, type, text} waiting for the legacy storage permission

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

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
        web.addJavascriptInterface(new Bridge(), "BedsideNative");
        web.setWebViewClient(new Client());
        web.setWebChromeClient(new Chrome());

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(BG);
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        // Keep the page out from under a camera notch / punch-hole (edge-to-edge is enforced on Android 15+).
        root.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override
            public WindowInsets onApplyWindowInsets(View v, WindowInsets insets) {
                int[] c = cutoutInsets(insets);
                v.setPadding(c[0], c[1], c[2], c[3]);
                return insets;
            }
        });
        setContentView(root);
        hideSystemUi();

        web.loadUrl(START_URL);
        // Ask for the camera up front, so the page's camera request later is granted instantly
        // (no Android prompt in the middle of getUserMedia).
        if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) askCamera();
    }

    // ---------------------------------------------------------------- page ⇄ Android bridge

    private class Bridge {
        @JavascriptInterface
        public void saveFile(final String name, final String type, final String text) {
            runOnUiThread(new Runnable() { @Override public void run() { save(name, type, text); } });
        }

        @JavascriptInterface
        public void print() {
            runOnUiThread(new Runnable() { @Override public void run() { printPage(); } });
        }

        /** Camera2 id of the first front-facing camera ("" if none), so the page can pick it by its label. */
        @JavascriptInterface
        public String frontCameraId() {
            try { return CameraDoctor.frontId(MainActivity.this); } catch (Throwable t) { return ""; }
        }

        /** Plain-text diagnosis of why the camera could not start, shown in the page's error panel. */
        @JavascriptInterface
        public String cameraReport() {
            try { return CameraDoctor.report(MainActivity.this, lastCameraEvent); }
            catch (Throwable t) { return "Camera check failed: " + t; }
        }
    }

    private void save(String name, String type, String text) {
        String file = cleanName(name);
        String mime = (type == null || type.trim().isEmpty()) ? "application/octet-stream" : type.split(";")[0].trim();
        byte[] bytes = (text == null ? "" : text).getBytes(StandardCharsets.UTF_8);
        try {
            String saved;
            if (Build.VERSION.SDK_INT >= 29) {
                saved = saveMediaStore(file, mime, bytes);
            } else {
                if (checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                    pendingSave = new String[] { name, type, text };
                    requestPermissions(new String[] { Manifest.permission.WRITE_EXTERNAL_STORAGE }, REQ_STORAGE);
                    return;
                }
                saved = saveLegacy(file, mime, bytes);
            }
            toast("Saved to Download/BedsideField/" + saved);
        } catch (Exception e) {
            toast("Could not save " + file + ": " + e.getMessage());
        }
    }

    /** Android 10+: write into the shared Downloads collection (no permission needed). */
    private String saveMediaStore(String file, String mime, byte[] bytes) throws Exception {
        // MediaStore.Downloads is API 29; looked up by name so this compiles against an older android.jar.
        Uri collection = (Uri) Class.forName("android.provider.MediaStore$Downloads").getField("EXTERNAL_CONTENT_URI").get(null);
        ContentResolver cr = getContentResolver();
        ContentValues cv = new ContentValues();
        cv.put("_display_name", file);
        cv.put("mime_type", mime);
        cv.put("relative_path", Environment.DIRECTORY_DOWNLOADS + "/BedsideField");
        cv.put("is_pending", 1);
        Uri item = cr.insert(collection, cv);
        if (item == null) throw new IOException("the Downloads folder refused the file");
        try {
            OutputStream os = cr.openOutputStream(item);
            if (os == null) throw new IOException("cannot open the new file");
            try { os.write(bytes); } finally { os.close(); }
            cv.clear();
            cv.put("is_pending", 0);
            cr.update(item, cv, null, null);
        } catch (Exception e) {
            cr.delete(item, null, null);
            throw e;
        }
        String shown = file; // MediaStore may have renamed it, e.g. "name (1).csv"
        Cursor q = cr.query(item, new String[] { "_display_name" }, null, null, null);
        if (q != null) {
            try { if (q.moveToFirst() && q.getString(0) != null) shown = q.getString(0); } finally { q.close(); }
        }
        return shown;
    }

    /** Android 7–9: plain file in the public Download folder. */
    private String saveLegacy(String file, String mime, byte[] bytes) throws IOException {
        File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "BedsideField");
        if (!dir.isDirectory() && !dir.mkdirs()) throw new IOException("cannot create " + dir);
        File f = new File(dir, file);
        int dot = file.lastIndexOf('.');
        String stem = dot > 0 ? file.substring(0, dot) : file, ext = dot > 0 ? file.substring(dot) : "";
        for (int i = 1; f.exists(); i++) f = new File(dir, stem + " (" + i + ")" + ext);
        FileOutputStream os = new FileOutputStream(f);
        try { os.write(bytes); } finally { os.close(); }
        MediaScannerConnection.scanFile(this, new String[] { f.getPath() }, new String[] { mime }, null);
        return f.getName();
    }

    private static String cleanName(String name) {
        String n = name == null ? "" : name.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_").trim();
        while (n.startsWith(".")) n = n.substring(1);
        return n.isEmpty() ? "bedside-field-export.txt" : n;
    }

    private void printPage() {
        PrintManager pm = (PrintManager) getSystemService(PRINT_SERVICE);
        if (pm == null) { toast("Printing is not available on this device."); return; }
        String job = "Bedside Field report";
        pm.print(job, web.createPrintDocumentAdapter(job), new PrintAttributes.Builder().build());
    }

    // ---------------------------------------------------------------- serving the bundled app

    private class Client extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
            Uri u = req.getUrl();
            if (!"https".equals(u.getScheme()) || !HOST.equals(u.getHost())) return null;
            String path = u.getPath();
            if (path == null || path.isEmpty()) path = "/";
            if (path.endsWith("/")) path += "index.html";
            Map<String, String> headers = new HashMap<>();
            headers.put("Cache-Control", "no-cache");
            if (path.contains("..")) return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", headers, null);
            try {
                InputStream in = getAssets().open("www" + path);
                String mime = mimeOf(path);
                String enc = mime.startsWith("text/") || mime.endsWith("json") || mime.endsWith("+xml") ? "utf-8" : null;
                return new WebResourceResponse(mime, enc, 200, "OK", headers, in);
            } catch (IOException e) {
                return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", headers, null);
            }
        }

        @Override
        @SuppressWarnings("deprecation")
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            Uri u = Uri.parse(url);
            if (HOST.equals(u.getHost())) return false;     // our own pages (e.g. camera-test.html)
            try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
            return true;                                     // anything else opens outside the app
        }
    }

    private static String mimeOf(String path) {
        String p = path.toLowerCase(Locale.ROOT);
        if (p.endsWith(".html") || p.endsWith(".htm")) return "text/html";
        if (p.endsWith(".js") || p.endsWith(".mjs")) return "text/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".webmanifest")) return "application/manifest+json";
        if (p.endsWith(".wasm")) return "application/wasm";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".ico")) return "image/x-icon";
        if (p.endsWith(".txt") || p.endsWith(".md") || p.endsWith("notice")) return "text/plain";
        return "application/octet-stream";
    }

    // ---------------------------------------------------------------- camera permission

    private class Chrome extends WebChromeClient {
        @Override
        public void onPermissionRequest(final PermissionRequest req) {
            runOnUiThread(new Runnable() { @Override public void run() { handleWebPermission(req); } });
        }

        @Override
        public void onPermissionRequestCanceled(final PermissionRequest req) {
            runOnUiThread(new Runnable() { @Override public void run() { waitingCamera.remove(req); } });
        }
    }

    private void handleWebPermission(PermissionRequest req) {
        String[] res = req.getResources();
        boolean video = false;
        for (String r : res) if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) video = true;
        Uri origin = req.getOrigin();
        if (!video || origin == null || !HOST.equals(origin.getHost())) {
            note("refused a page request for " + java.util.Arrays.toString(res) + " from " + origin);
            req.deny();
            return;
        }
        if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            req.grant(new String[] { PermissionRequest.RESOURCE_VIDEO_CAPTURE });
            note("page asked for the camera → granted");
        } else {
            waitingCamera.add(req);
            note("page asked for the camera → waiting for the Android permission prompt");
            askCamera();
        }
    }

    /** Shows Android's camera prompt unless one is already on screen (a second request would be cancelled). */
    private void askCamera() {
        if (askingCamera) return;
        askingCamera = true;
        requestPermissions(new String[] { Manifest.permission.CAMERA }, REQ_CAMERA);
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] results) {
        boolean answered = results.length > 0;
        boolean ok = answered && results[0] == PackageManager.PERMISSION_GRANTED;
        if (code == REQ_CAMERA) {
            askingCamera = false;
            ok = checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED; // the real state
            boolean pageWaiting = !waitingCamera.isEmpty();
            for (PermissionRequest req : waitingCamera) {
                if (ok) req.grant(new String[] { PermissionRequest.RESOURCE_VIDEO_CAPTURE });
                else req.deny();
            }
            waitingCamera.clear();
            note("Android camera permission " + (ok ? "allowed" : answered ? "refused" : "prompt closed without an answer")
                + (pageWaiting ? (ok ? " → page granted" : " → page refused") : ""));
            // Refused with "don't ask again" (or twice on Android 11+): Android will not prompt any more.
            if (pageWaiting && answered && !ok && !shouldShowRequestPermissionRationale(Manifest.permission.CAMERA)) offerAppSettings();
        } else if (code == REQ_STORAGE) {
            String[] s = pendingSave;
            pendingSave = null;
            if (s == null) return;
            if (ok) save(s[0], s[1], s[2]);
            else toast("Storage permission refused, so the file was not saved.");
        }
    }

    private void offerAppSettings() {
        new AlertDialog.Builder(this)
            .setTitle("Camera is turned off")
            .setMessage("Android is blocking the camera for Bedside Field, so the eye-movement camera mode cannot run. "
                + "Open settings → Permissions → Camera → Allow, then come back and tap “Try the camera again”.")
            .setPositiveButton("Open settings", new DialogInterface.OnClickListener() {
                @Override public void onClick(DialogInterface d, int w) {
                    try {
                        startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName())));
                    } catch (Exception ignored) { }
                }
            })
            .setNegativeButton("Not now", null)
            .show();
    }

    // ---------------------------------------------------------------- window / lifecycle

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
        for (PermissionRequest req : waitingCamera) req.deny();
        waitingCamera.clear();
        web.destroy();
        super.onDestroy();
    }

    private void note(String event) {
        lastCameraEvent = new SimpleDateFormat("HH:mm:ss", Locale.ROOT).format(new Date()) + " " + event;
    }

    private String versionName() {
        try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; }
        catch (Exception e) { return "1"; }
    }

    private void toast(String msg) {
        Toast.makeText(this, msg, Toast.LENGTH_LONG).show();
    }
}

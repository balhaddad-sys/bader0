package app.bedsidefield;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Serves the bundled web app (assets/www) at https://appassets.androidplatform.net/. Being https, the page is a
 * secure context, so getUserMedia and ES modules work offline. Links to any other site open outside the app.
 */
final class AssetServer extends WebViewClient {
    static final String HOST = "appassets.androidplatform.net";
    static final String START_URL = "https://" + HOST + "/index.html";

    private final Activity activity;

    AssetServer(Activity activity) {
        this.activity = activity;
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
        Uri u = req.getUrl();
        if (!"https".equals(u.getScheme()) || !HOST.equals(u.getHost())) return null;
        Map<String, String> headers = new HashMap<>();
        headers.put("Cache-Control", "no-cache");
        String asset = WebFiles.assetFor(u.getPath());
        if (asset == null) return notFound(headers);
        try {
            InputStream in = activity.getAssets().open(asset);
            String mime = WebFiles.mimeOf(asset);
            return new WebResourceResponse(mime, WebFiles.encodingOf(mime), 200, "OK", headers, in);
        } catch (IOException e) {
            return notFound(headers);
        }
    }

    private static WebResourceResponse notFound(Map<String, String> headers) {
        return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", headers, null);
    }

    @Override
    @SuppressWarnings("deprecation")
    public boolean shouldOverrideUrlLoading(WebView view, String url) {
        Uri u = Uri.parse(url);
        if (HOST.equals(u.getHost())) return false;     // our own pages (e.g. camera-test.html)
        try { activity.startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
        return true;                                     // anything else opens outside the app
    }
}

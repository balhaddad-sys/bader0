package app.epilepsyclassifier;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;

/**
 * Hosts the offline web app from the APK's assets in a locked-down WebView.
 *
 * Privacy posture (defence in depth):
 *  1. The manifest declares no permissions, so the OS blocks all network access.
 *  2. WebView network loads are disabled.
 *  3. Only bundled assets may be loaded or navigated to; anything else is
 *     answered with an empty response.
 *  4. File-system access, content providers, DOM storage, caching, form-data
 *     saving and geolocation are all disabled — nothing is persisted.
 */
public class MainActivity extends Activity {
    private static final String ASSET_PREFIX = "file:///android_asset/";
    private static final String START_URL = ASSET_PREFIX + "www/index.html";

    private WebView web;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);          // the app is a JavaScript application
        s.setBlockNetworkLoads(true);
        s.setAllowFileAccess(false);           // file:///android_asset stays reachable
        s.setAllowContentAccess(false);
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setDomStorageEnabled(false);
        s.setDatabaseEnabled(false);
        s.setSaveFormData(false);
        s.setGeolocationEnabled(false);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        s.setDisplayZoomControls(false);
        s.setBuiltInZoomControls(true);        // pinch-zoom for accessibility

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // true = we handled it (by ignoring it) unless it is a bundled asset
                return !(url.startsWith(ASSET_PREFIX) || url.startsWith("data:"));
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String u = request.getUrl().toString();
                // bundled assets and inline data: URIs (the embedded font) only
                if (!u.startsWith(ASSET_PREFIX) && !u.startsWith("data:")) {
                    return new WebResourceResponse("text/plain", "utf-8", new ByteArrayInputStream(new byte[0]));
                }
                return null;
            }
        });

        setContentView(web);
        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
        } else {
            web.loadUrl(START_URL);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.loadUrl("about:blank");
            web.destroy();
        }
        super.onDestroy();
    }
}

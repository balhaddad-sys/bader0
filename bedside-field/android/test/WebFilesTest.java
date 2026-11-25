package app.bedsidefield;

/** Plain-JVM checks for WebFiles (run by android/build.sh before packaging; no Android SDK classes needed). */
public final class WebFilesTest {
    private static int failures = 0;

    private static void eq(Object actual, Object expected, String what) {
        boolean ok = expected == null ? actual == null : expected.equals(actual);
        if (!ok) { failures++; System.out.println("FAIL " + what + ": expected " + expected + ", got " + actual); }
    }

    public static void main(String[] args) {
        eq(WebFiles.assetFor("/index.html"), "www/index.html", "plain path");
        eq(WebFiles.assetFor("/"), "www/index.html", "root");
        eq(WebFiles.assetFor(""), "www/index.html", "empty path");
        eq(WebFiles.assetFor(null), "www/index.html", "null path");
        eq(WebFiles.assetFor("/js/screens/"), "www/js/screens/index.html", "directory");
        eq(WebFiles.assetFor("/../secret"), null, "parent escape");
        eq(WebFiles.assetFor("/js/../../x"), null, "nested escape");

        eq(WebFiles.mimeOf("www/js/main.js"), "text/javascript", "js");
        eq(WebFiles.mimeOf("www/x.MJS"), "text/javascript", "mjs upper case");
        eq(WebFiles.mimeOf("www/vendor/a.wasm"), "application/wasm", "wasm");
        eq(WebFiles.mimeOf("www/manifest.webmanifest"), "application/manifest+json", "manifest");
        eq(WebFiles.mimeOf("www/icons/icon.svg"), "image/svg+xml", "svg");
        eq(WebFiles.mimeOf("www/NOTICE"), "text/plain", "notice");
        eq(WebFiles.mimeOf("www/vendor/face_mesh.binarypb"), "application/octet-stream", "binary");
        eq(WebFiles.encodingOf("text/html"), "utf-8", "text encoding");
        eq(WebFiles.encodingOf("application/manifest+json"), "utf-8", "json encoding");
        eq(WebFiles.encodingOf("image/svg+xml"), "utf-8", "svg encoding");
        eq(WebFiles.encodingOf("application/wasm"), null, "binary encoding");

        eq(WebFiles.cleanFileName("field-2026-11-24-07-43.csv"), "field-2026-11-24-07-43.csv", "normal name");
        eq(WebFiles.cleanFileName("../a/b:c*.json"), "_a_b_c_.json", "separators");
        eq(WebFiles.cleanFileName("..hidden"), "hidden", "leading dots");
        eq(WebFiles.cleanFileName("  "), "bedside-field-export.txt", "blank");
        eq(WebFiles.cleanFileName(null), "bedside-field-export.txt", "null");
        eq(WebFiles.baseMime("text/csv;charset=utf-8"), "text/csv", "mime parameters");
        eq(WebFiles.baseMime(""), "application/octet-stream", "empty mime");
        eq(WebFiles.baseMime(null), "application/octet-stream", "null mime");

        if (failures > 0) { System.out.println(failures + " WebFiles check(s) failed"); System.exit(1); }
        System.out.println("WebFiles: all checks passed");
    }
}

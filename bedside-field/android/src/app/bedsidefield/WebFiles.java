package app.bedsidefield;

import java.util.Locale;

/**
 * Pure helpers (no Android classes, so they are unit-tested on a plain JVM: android/test/WebFilesTest.java):
 * which bundled asset a URL path maps to, its MIME type and text encoding, and safe names for exported files.
 */
final class WebFiles {
    private WebFiles() { }

    /** Asset path ("www/…") for a request path, or null if the path tries to leave the bundle. */
    static String assetFor(String path) {
        if (path == null || path.isEmpty()) path = "/";
        if (path.endsWith("/")) path += "index.html";
        if (path.contains("..")) return null;
        return "www" + path;
    }

    static String mimeOf(String path) {
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

    /** "utf-8" for text types, null for binary ones. */
    static String encodingOf(String mime) {
        return mime.startsWith("text/") || mime.endsWith("json") || mime.endsWith("+xml") ? "utf-8" : null;
    }

    /** A file name safe for the Downloads folder (no path separators, control characters or leading dots). */
    static String cleanFileName(String name) {
        String n = name == null ? "" : name.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_").trim();
        while (n.startsWith(".")) n = n.substring(1);
        return n.isEmpty() ? "bedside-field-export.txt" : n;
    }

    /** "text/csv;charset=utf-8" -> "text/csv"; empty -> application/octet-stream. */
    static String baseMime(String type) {
        return (type == null || type.trim().isEmpty()) ? "application/octet-stream" : type.split(";")[0].trim();
    }
}

package app.bedsidefield;

import android.Manifest;
import android.app.Activity;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.webkit.WebView;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/** The page's exports: text files to Download/BedsideField (CSV / JSON), and printing the report. */
final class Exports {
    private final Activity activity;
    private final int storageRequestCode;
    private String[] pendingSave; // {name, type, text} waiting for the legacy storage permission

    Exports(Activity activity, int storageRequestCode) {
        this.activity = activity;
        this.storageRequestCode = storageRequestCode;
    }

    void save(String name, String type, String text) {
        String file = WebFiles.cleanFileName(name);
        String mime = WebFiles.baseMime(type);
        byte[] bytes = (text == null ? "" : text).getBytes(StandardCharsets.UTF_8);
        try {
            String saved;
            if (Build.VERSION.SDK_INT >= 29) {
                saved = saveMediaStore(file, mime, bytes);
            } else {
                if (activity.checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                    pendingSave = new String[] { name, type, text };
                    activity.requestPermissions(new String[] { Manifest.permission.WRITE_EXTERNAL_STORAGE }, storageRequestCode);
                    return;
                }
                saved = saveLegacy(file, mime, bytes);
            }
            toast("Saved to Download/BedsideField/" + saved);
        } catch (Exception e) {
            toast("Could not save " + file + ": " + e.getMessage());
        }
    }

    /** Answer to the storage permission asked for in save() (Android 9 and older). */
    void onStoragePermission(boolean granted) {
        String[] s = pendingSave;
        pendingSave = null;
        if (s == null) return;
        if (granted) save(s[0], s[1], s[2]);
        else toast("Storage permission refused, so the file was not saved.");
    }

    /** Android 10+: write into the shared Downloads collection (no permission needed). */
    private String saveMediaStore(String file, String mime, byte[] bytes) throws Exception {
        // MediaStore.Downloads is API 29; looked up by name so this compiles against an older android.jar.
        Uri collection = (Uri) Class.forName("android.provider.MediaStore$Downloads").getField("EXTERNAL_CONTENT_URI").get(null);
        ContentResolver cr = activity.getContentResolver();
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
        MediaScannerConnection.scanFile(activity, new String[] { f.getPath() }, new String[] { mime }, null);
        return f.getName();
    }

    /** Android print dialog for the page as it is shown (print to PDF or a printer). */
    void print(WebView web) {
        PrintManager pm = (PrintManager) activity.getSystemService(Activity.PRINT_SERVICE);
        if (pm == null) { toast("Printing is not available on this device."); return; }
        String job = "Bedside Field report";
        pm.print(job, web.createPrintDocumentAdapter(job), new PrintAttributes.Builder().build());
    }

    private void toast(String msg) {
        Toast.makeText(activity, msg, Toast.LENGTH_LONG).show();
    }
}

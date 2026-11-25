# Bedside Field — Android app

A single-activity WebView app around `../web`. It serves the web app from the APK at
`https://appassets.androidplatform.net/`, which is a secure origin, so the camera and ES modules work offline with no
service worker. The page detects the app (user-agent token `BedsideFieldApp`, or `window.BedsideNative`) through
`web/js/platform.js`.

```
src/app/bedsidefield/
  MainActivity.java       window (full-screen landscape, screen kept on, cutout padding), WebView setup, lifecycle
  AssetServer.java        serves assets/www; links to other sites open outside the app
  WebFiles.java           pure helpers: URL path → asset, MIME types, safe export names (JVM-tested)
  NativeBridge.java       window.BedsideNative: saveFile, print, cameraReport, frontCameraId
  Exports.java            CSV/JSON to Download/BedsideField (MediaStore on Android 10+), print dialog
  CameraPermissions.java  page camera requests ↔ Android camera permission (asked at start-up; one prompt at a time)
  CameraDoctor.java       native diagnosis when the camera will not start (permission, device policy, busy, open test)
test/WebFilesTest.java    plain-JVM checks, run by build.sh before packaging
```

What the app adds to the web version: camera permission asked at launch; exports saved to
**Download/BedsideField/**; Android's print dialog; the native camera check in the "Camera not available" message;
backups disabled, so sessions stay on the device. minSdk 24 (Android 7), targetSdk 35, package `app.bedsidefield`.

## Build

```bash
sudo apt-get install android-sdk-platform-23 aapt dalvik-exchange zipalign apksigner openjdk-17-jdk
./build.sh            # → BedsideField.apk
```

`build.sh` copies `../web` into the APK at build time, so `web/` stays the only copy of the app's code. To ship a new
version, bump `versionCode` and `versionName` in `AndroidManifest.xml` (and `VERSION` in the web app), then rebuild.

## Signing key

The keystore is not in git. Put it at `signing/bedside-field.jks` with its password in `signing/password.txt`
(both git-ignored), or set `KEYSTORE`, `KEYSTORE_PASS` and `KEY_ALIAS`. Every release must be signed with the same
key, or Android refuses the update and the app has to be uninstalled first, which deletes every saved session on
that device.

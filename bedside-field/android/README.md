# Bedside Field — Android wrapper

A single-activity WebView app that bundles the PWA from `assets/www` and serves it at
`https://appassets.androidplatform.net/` (a secure origin, so the camera and ES modules work
offline, with no service worker). It implements the page's `BedsideNative` bridge:

- `saveFile(name, type, text)` → writes to **Download/BedsideField/** (MediaStore on Android 10+)
- `print()` → Android print dialog (print to PDF or a printer)
- adds `BedsideFieldApp/<version>` to the user agent, grants the front camera after the Android
  permission prompt, keeps the screen on, runs full-screen landscape, and pads around camera cutouts.

minSdk 24 (Android 7), targetSdk 35. Package `app.bedsidefield`. Backups disabled so sessions stay on the device.

## Rebuild
    sudo apt-get install android-sdk-platform-23 aapt dalvik-exchange zipalign apksigner openjdk-17-jdk
    ./build.sh            # → BedsideField.apk

To ship a new web version: replace `assets/www` with the new files, bump `versionCode` and
`versionName` in `AndroidManifest.xml`, rebuild.

## Signing key — keep `signing/` private and backed up
`signing/bedside-field.jks` (password in `signing/password.txt`) signed this APK. Updates must be
signed with the same key, or Android refuses them and the app has to be uninstalled first, which
deletes every saved session on that tablet.

## App-only additions to the web code
These run only inside the app (they check for the `BedsideFieldApp` user agent or `BedsideNative`), so a browser is unaffected.
Keep them, or merge them into the web source, when you replace `assets/www`:

- `js/gaze.js`: 30 s deadline on the camera request and 60 s on the model; start-up steps shown in the
  preview box; switches to the front camera when Android opened another one (`BedsideNative.frontCameraId()`);
  draws the preview into `#cam-mirror` (some WebViews show a live `<video>` as a black box); camera label
  in diagnostics; native camera check (`BedsideNative.cameraReport()`) in the "Camera not available" message.
- `index.html`: `<canvas id="cam-mirror">` inside `#preview`.
- `styles.css`: `#cam-mirror` style, and a fixed preview size for WebViews without `aspect-ratio`.
- `js/app.js`: "completely black picture" hint and the camera label in the tracking-check status line.
- `js/gaze.js`: when a face is found in a shrunken "zoom-out" detection mode but fits the full frame, switch back
  to full size (about twice the eye-movement resolution); revert if full size loses the face (no retry for 30 s).
- `js/app.js`: follow step says to keep the head still and prop the tablet up, shows a live line (ring tracking /
  fps / detection mode / steadiness); the ring accepts samples up to 500 ms old (was 250) for slower tablets.
- `js/gaze.js` + `js/app.js`: samples carry each eye's vertical feature too; the tracking check fits both eyes, the
  right eye and the left eye, and tracks one eye when its leave-one-dot-out error is at least 15% lower (side-mounted
  phone cameras see the far eye poorly). Chosen on the fitting dots only, so the 5 validation dots stay unseen; the
  accuracy limits are unchanged. The result card says which eye is tracked; the session records `cal.trackEye`.
- `js/app.js`: phone-sized screens (narrower than 17 cm) get a 20 cm viewing distance once, if it was still the 30 cm
  default; a clear "You score this test" notice before examiner scoring replaces the brief toast.
- `js/gaze.js`: GPU-to-CPU fallback for the face model. MediaPipe runs inference on the GPU (WebGL) except on Apple
  devices; some Android GPUs process frames but never find a face. After the first two detection modes find no face
  on the GPU (~5 s), the model is switched to `useCpuInference: true`; once the CPU finds a face this is stored
  (`localStorage['bf.cpuInference'] = '1'`) and later sessions start on the CPU. The mode label shows "· CPU".

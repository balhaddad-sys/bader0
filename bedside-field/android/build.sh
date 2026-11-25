#!/usr/bin/env bash
# Builds BedsideField.apk from ../web without Gradle, using the Ubuntu/Debian Android packages:
#   sudo apt-get install android-sdk-platform-23 aapt dalvik-exchange zipalign apksigner openjdk-17-jdk
#
# The web app is copied in at build time, so web/ is the only copy of the app's code.
# Signing: every release must be signed with the SAME key, or Android refuses the update and the app has to be
# uninstalled (which deletes its saved sessions). The key is not in git: put it at android/signing/bedside-field.jks
# with its password in android/signing/password.txt, or set KEYSTORE / KEYSTORE_PASS / KEY_ALIAS.
set -euo pipefail
cd "$(dirname "$0")"

ANDROID_JAR=${ANDROID_JAR:-/usr/lib/android-sdk/platforms/android-23/android.jar}
KEYSTORE=${KEYSTORE:-signing/bedside-field.jks}
KEY_ALIAS=${KEY_ALIAS:-bedsidefield}
OUT=build
APK=${APK:-BedsideField.apk}

if [ ! -f "$KEYSTORE" ]; then
  echo "No signing key at $KEYSTORE (see the comment at the top of this script)." >&2
  exit 1
fi
[ -n "${KEYSTORE_PASS:-}" ] || KEYSTORE_PASS=$(cat signing/password.txt)

rm -rf "$OUT" && mkdir -p "$OUT/gen" "$OUT/classes" "$OUT/test" "$OUT/assets"

echo "› unit checks (plain JVM)"
javac -nowarn -Xlint:-options -source 8 -target 8 -encoding UTF-8 -d "$OUT/test" \
  src/app/bedsidefield/WebFiles.java src/app/bedsidefield/ScreenInsets.java test/WebFilesTest.java test/ScreenInsetsTest.java
java -cp "$OUT/test" app.bedsidefield.WebFilesTest
java -cp "$OUT/test" app.bedsidefield.ScreenInsetsTest

echo "› web app"
cp -r ../web "$OUT/assets/www"
rm -f "$OUT/assets/www/_headers"   # Netlify-only file

echo "› resources + assets"
aapt package -f -m -J "$OUT/gen" -M AndroidManifest.xml -S res -A "$OUT/assets" -I "$ANDROID_JAR" -F "$OUT/base.apk"

echo "› java"
javac -nowarn -Xlint:-options -source 8 -target 8 -encoding UTF-8 -bootclasspath "$ANDROID_JAR" \
  -d "$OUT/classes" $(find src "$OUT/gen" -name '*.java')

echo "› dex"
dalvik-exchange --dex --min-sdk-version=24 --output="$OUT/classes.dex" "$OUT/classes"
(cd "$OUT" && aapt add base.apk classes.dex >/dev/null)

echo "› align + sign"
zipalign -f -p 4 "$OUT/base.apk" "$OUT/aligned.apk"
apksigner sign --ks "$KEYSTORE" --ks-key-alias "$KEY_ALIAS" --ks-pass "pass:$KEYSTORE_PASS" \
  --min-sdk-version 24 --out "$APK" "$OUT/aligned.apk"
apksigner verify --min-sdk-version 24 "$APK"
rm -f "$APK.idsig"
echo "✓ $APK ($(du -h "$APK" | cut -f1))"

#!/usr/bin/env bash
# Builds BedsideField.apk without Gradle, using the Ubuntu/Debian Android packages:
#   sudo apt-get install android-sdk-platform-23 aapt dalvik-exchange zipalign apksigner openjdk-17-jdk
# To ship a new web build: replace assets/www with the new PWA files, bump versionCode/versionName
# in AndroidManifest.xml, and run ./build.sh. Sign every release with the SAME keystore, otherwise
# Android refuses the update and the app must be uninstalled (which deletes its saved sessions).
set -euo pipefail
cd "$(dirname "$0")"

ANDROID_JAR=${ANDROID_JAR:-/usr/lib/android-sdk/platforms/android-23/android.jar}
KEYSTORE=${KEYSTORE:-signing/bedside-field.jks}
KEY_ALIAS=${KEY_ALIAS:-bedsidefield}
[ -n "${KEYSTORE_PASS:-}" ] || KEYSTORE_PASS=$(cat signing/password.txt)
OUT=build
APK=${APK:-BedsideField.apk}

rm -rf "$OUT" && mkdir -p "$OUT/gen" "$OUT/classes"

echo "› resources + assets"
aapt package -f -m -J "$OUT/gen" -M AndroidManifest.xml -S res -A assets -I "$ANDROID_JAR" -F "$OUT/base.apk"

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

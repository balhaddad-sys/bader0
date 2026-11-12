#!/usr/bin/env bash
# Builds a signed, aligned APK of the offline web app — no Gradle, no Android Studio.
#
# Prerequisites (Debian/Ubuntu):
#   sudo apt-get install -y default-jdk-headless aapt apksigner zipalign \
#        dalvik-exchange libandroid-23-java android-sdk-platform-23
#
# Output: android/build/epilepsy-classifier.apk
#
# Signing: by default a throw-away key is generated in android/.signing/ (git-ignored).
# Updates are only installable over an existing install if signed with the SAME key,
# so for a long-lived app generate your own key once and pass it in:
#   KEYSTORE=/path/my.keystore KS_ALIAS=myalias KS_PASS=secret ./build.sh
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
WEB="$HERE/.."
B="$HERE/build"
ANDROID_JAR="${ANDROID_JAR:-/usr/lib/android-sdk/platforms/android-23/android.jar}"
BT="${BUILD_TOOLS:-/usr/lib/android-sdk/build-tools/debian}"
DX="${DX:-$(command -v dalvik-exchange || echo "$BT/dx")}"
VERSION_CODE="${VERSION_CODE:-8}"
VERSION_NAME="${VERSION_NAME:-0.8.0}"

for t in aapt zipalign apksigner javac keytool; do command -v "$t" >/dev/null || { echo "missing tool: $t" >&2; exit 1; }; done
[ -f "$ANDROID_JAR" ] || { echo "android.jar not found at $ANDROID_JAR" >&2; exit 1; }

rm -rf "$B"; mkdir -p "$B/assets/www/src" "$B/classes"

# 1. Bundle exactly the files the web app needs (no tests, README, deploy config).
cp "$WEB/index.html" "$WEB/styles.css" "$WEB/fonts.css" "$B/assets/www/"
cp "$WEB"/src/{vocab,kb,engine,morph,diagrams,figures,semio,physical,plain,bank,quiz,study,brain,views,app}.js "$B/assets/www/src/"

# 2. Compile the Java shell against the API 23 framework, then convert to dex.
javac -source 8 -target 8 -Xlint:-options -bootclasspath "$ANDROID_JAR" -d "$B/classes" \
      "$HERE"/src/app/epilepsyclassifier/*.java
"$DX" --dex --output="$B/classes.dex" "$B/classes"

# 3. Package manifest + resources + assets. resources.arsc must be stored uncompressed (targetSdk >= 30).
aapt package -f -0 arsc \
     -M "$HERE/AndroidManifest.xml" -S "$HERE/res" -A "$B/assets" -I "$ANDROID_JAR" \
     --min-sdk-version 21 --target-sdk-version 34 \
     --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" \
     -F "$B/app.unaligned.apk"
( cd "$B" && aapt add app.unaligned.apk classes.dex >/dev/null )

# 4. Align, then sign (v1 + v2 + v3 by apksigner).
zipalign -f -p 4 "$B/app.unaligned.apk" "$B/app.aligned.apk"

if [ -z "${KEYSTORE:-}" ]; then
  S="$HERE/.signing"; mkdir -p "$S"
  KEYSTORE="$S/debug.keystore"; KS_ALIAS="epilepsy"
  if [ ! -f "$KEYSTORE" ]; then
    KS_PASS="$(head -c 18 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 20)"
    echo "$KS_PASS" > "$S/pass.txt"
    keytool -genkeypair -keystore "$KEYSTORE" -alias "$KS_ALIAS" -keyalg RSA -keysize 2048 -validity 10000 \
            -storepass "$KS_PASS" -keypass "$KS_PASS" -dname "CN=Epilepsy Classifier (debug), O=Unofficial" >/dev/null 2>&1
    echo "generated throw-away signing key in $S (git-ignored)"
  fi
  KS_PASS="$(cat "$S/pass.txt")"
fi
: "${KS_ALIAS:?set KS_ALIAS when using your own KEYSTORE}"; : "${KS_PASS:?set KS_PASS when using your own KEYSTORE}"

OUT="$B/epilepsy-classifier.apk"
apksigner sign --ks "$KEYSTORE" --ks-key-alias "$KS_ALIAS" --ks-pass "pass:$KS_PASS" --key-pass "pass:$KS_PASS" \
          --min-sdk-version 21 --out "$OUT" "$B/app.aligned.apk"
apksigner verify --verbose "$OUT" 2>&1 | grep -E 'Verifies|Number of signers|v[0-9]' || true
zipalign -c -p 4 "$OUT" && echo "zipalign: OK"
echo "built $OUT ($(du -h "$OUT" | cut -f1))"

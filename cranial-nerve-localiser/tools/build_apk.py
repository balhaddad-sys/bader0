#!/usr/bin/env python3
"""Build and sign the Android APK from src/ and the prebuilt shell in android/shell.

Usage:
  CNL_STOREPASS=... python3 tools/build_apk.py --keystore release.p12 [--out dist/app.apk]

The keystore must be PKCS#12 holding one RSA key and certificate, e.g.
  keytool -genkeypair -storetype PKCS12 -keystore release.p12 -alias atlas \
          -keyalg RSA -keysize 4096 -validity 10000 -dname "CN=Cranial nerve localiser"

Android only accepts an update signed with the same key as the installed app.
"""
import argparse
import getpass
import json
import os
import pathlib
import sys

from cryptography.hazmat.primitives.serialization import pkcs12

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from apk import aligned_zip, patch_manifest, sign_v2  # noqa: E402
from build_html import ROOT, build_html  # noqa: E402

SHELL = ROOT / 'android' / 'shell'

# Order and storage follow the original release; resources.arsc must stay uncompressed.
LAYOUT = [
    ('AndroidManifest.xml', False),
    ('res/drawable/ic_launcher_foreground.xml', False),
    ('res/mipmap-anydpi-v26/ic_launcher.xml', False),
    ('resources.arsc', True),
    ('assets/atkinsonhyperlegible-OFL.txt', False),
    ('assets/atlas.html', False),
    ('assets/spectral-OFL.txt', False),
    ('classes.dex', False),
]


def main():
    version = json.loads((ROOT / 'android' / 'version.json').read_text())
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--keystore', required=True, type=pathlib.Path, help='PKCS#12 keystore')
    parser.add_argument('--out', type=pathlib.Path,
                        default=ROOT / 'dist' / f"cranial-nerve-localiser-{version['versionName']}.apk")
    args = parser.parse_args()

    password = os.environ.get('CNL_STOREPASS') or getpass.getpass('Keystore password: ')
    key, cert, _ = pkcs12.load_key_and_certificates(args.keystore.read_bytes(), password.encode())
    if key is None or cert is None:
        raise SystemExit('Keystore must contain a private key and certificate')

    html = build_html().encode('utf-8')
    manifest = patch_manifest((SHELL / 'AndroidManifest.xml').read_bytes(),
                              version['versionCode'], version['versionName'], version.get('applicationId'))
    files = {'AndroidManifest.xml': manifest, 'assets/atlas.html': html}
    entries = [(name, files.get(name) or (SHELL / name).read_bytes(), store) for name, store in LAYOUT]

    signed = sign_v2(aligned_zip(entries), key, cert)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_bytes(signed)
    (args.out.parent / 'atlas.html').write_bytes(html)
    print(f"{args.out} · {version.get('applicationId', 'original id')} · {version['versionName']} ({version['versionCode']}) · {len(signed):,} bytes")


if __name__ == '__main__':
    main()

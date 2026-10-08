#!/usr/bin/env python3
"""Package web/ + base/ into a signed NeuroLocalize APK.

Usage: python3 tools/build_apk.py --apksig path/to/apksig.jar [--keystore signing/neurolocalize.p12]
Env:   NL_KEY_PASSWORD (default 'neurolocalize'), NL_KEY_ALIAS (default 'neurolocalize')
"""
import argparse, os, struct, subprocess, sys, tempfile, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VERSION_NAME, VERSION_CODE = '1.2.0', 3
FIXED_TIME = (2026, 10, 8, 12, 0, 0)


def patch_manifest(data):
    """Set versionCode/versionName in the binary AndroidManifest (same-length string patch)."""
    old, new = '1.1.0', VERSION_NAME
    assert len(old) == len(new)
    for enc in ('utf-16-le', 'utf-8'):
        o, n = old.encode(enc), new.encode(enc)
        if data.count(o) == 1:
            data = data.replace(o, n)
            break
    else:
        if new.encode('utf-16-le') not in data:
            sys.exit('versionName string not found in manifest')
    # walk start-element chunks to find the versionCode attribute (typed int, 0x10)
    buf = bytearray(data)
    sp_size = struct.unpack_from('<I', buf, 12)[0]
    cnt, flags, sstart = struct.unpack_from('<I', buf, 16)[0], struct.unpack_from('<I', buf, 24)[0], struct.unpack_from('<I', buf, 28)[0]
    offs = struct.unpack_from('<%dI' % cnt, buf, 36)

    def string(k):
        o = 8 + sstart + offs[k]
        if flags & 0x100:
            o += 2 if buf[o] & 0x80 else 1
            m = buf[o]; o += 1
            if m & 0x80: m = ((m & 0x7f) << 8) | buf[o]; o += 1
            return bytes(buf[o:o + m]).decode()
        n = struct.unpack_from('<H', buf, o)[0]
        return bytes(buf[o + 2:o + 2 + 2 * n]).decode('utf-16-le')

    j = 8 + sp_size
    while j < len(buf):
        t, _, size = struct.unpack_from('<HHI', buf, j)
        if t == 0x102:
            for k in range(struct.unpack_from('<H', buf, j + 28)[0]):
                b = j + 36 + 20 * k
                if string(struct.unpack_from('<I', buf, b + 4)[0]) == 'versionCode':
                    struct.pack_into('<I', buf, b + 16, VERSION_CODE)
                    return bytes(buf)
        j += size
    sys.exit('versionCode not found')


def entries():
    base = os.path.join(ROOT, 'base')
    yield 'AndroidManifest.xml', patch_manifest(open(os.path.join(base, 'AndroidManifest.xml'), 'rb').read()), True
    for rel in ('res/drawable/ic_launcher_foreground.xml', 'res/mipmap-anydpi-v26/ic_launcher.xml'):
        yield rel, open(os.path.join(base, rel), 'rb').read(), True
    yield 'resources.arsc', open(os.path.join(base, 'resources.arsc'), 'rb').read(), False
    yield 'classes.dex', open(os.path.join(base, 'classes.dex'), 'rb').read(), True
    web = os.path.join(ROOT, 'web')
    for d, _, files in sorted(os.walk(web)):
        for f in sorted(files):
            p = os.path.join(d, f)
            rel = 'assets/' + os.path.relpath(p, web).replace(os.sep, '/')
            yield rel, open(p, 'rb').read(), not f.endswith('.woff2')


def write_unsigned(path):
    with zipfile.ZipFile(path, 'w') as z:
        for name, data, deflate in entries():
            info = zipfile.ZipInfo(name, FIXED_TIME)
            info.compress_type = zipfile.ZIP_DEFLATED if deflate else zipfile.ZIP_STORED
            if not deflate:  # 4-byte align stored data (zipalign equivalent)
                start = z.fp.tell() + 30 + len(name.encode())
                info.extra = b'\0' * ((4 - start % 4) % 4)
            z.writestr(info, data)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apksig', required=True)
    ap.add_argument('--keystore', default=os.path.join(ROOT, 'signing', 'neurolocalize.p12'))
    ap.add_argument('--out', default=os.path.join(ROOT, 'dist', f'NeuroLocalize-{VERSION_NAME}.apk'))
    a = ap.parse_args()
    pw, alias = os.environ.get('NL_KEY_PASSWORD', 'neurolocalize'), os.environ.get('NL_KEY_ALIAS', 'neurolocalize')
    if not os.path.exists(a.keystore):
        os.makedirs(os.path.dirname(a.keystore), exist_ok=True)
        subprocess.check_call(['keytool', '-genkeypair', '-keystore', a.keystore, '-storetype', 'PKCS12', '-alias', alias,
                               '-keyalg', 'RSA', '-keysize', '3072', '-validity', '10000', '-storepass', pw, '-keypass', pw,
                               '-dname', 'CN=NeuroLocalize, O=NeuroLocalize'])
    tmp = tempfile.mkdtemp()
    unsigned = os.path.join(tmp, 'unsigned.apk')
    write_unsigned(unsigned)
    src = os.path.join(ROOT, 'tools', 'signer', 'Sign.java')
    subprocess.check_call(['javac', '-cp', a.apksig, '-d', tmp, src])
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    opens = [f'--add-exports=java.base/sun.security.{m}=ALL-UNNAMED' for m in ('x509', 'pkcs', 'util')]
    subprocess.check_call(['java', *opens, '-cp', os.pathsep.join([a.apksig, tmp]), 'Sign', unsigned, a.out, a.keystore, alias, pw])
    print('Built', a.out, os.path.getsize(a.out), 'bytes')


if __name__ == '__main__':
    main()

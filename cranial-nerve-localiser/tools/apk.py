"""Minimal APK packaging without the Android SDK.

The Android shell (dex, resources, icons) never changes, so instead of a full
Gradle build we repackage it with a new atlas.html:

* patch_manifest_version: rewrites versionCode/versionName in binary AXML;
* aligned_zip: writes the APK, storing resources.arsc uncompressed and
  4-byte aligned (required when targetSdk >= 30);
* sign_v2: adds an APK Signature Scheme v2 block (sufficient for minSdk 24+).

References: https://source.android.com/docs/security/features/apksigning/v2
"""
import hashlib
import io
import struct
import zipfile

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa

# --------------------------------------------------------------------------
# Binary XML (AXML)

RES_STRING_POOL = 0x0001
RES_XML_START_ELEMENT = 0x0102
TYPE_STRING = 0x03
TYPE_INT_DEC = 0x10
UTF8_FLAG = 0x100


def _read_string_pool(data, off):
    _, header_size, chunk_size = struct.unpack_from('<HHI', data, off)
    count, style_count, flags, strings_start, _ = struct.unpack_from('<IIIII', data, off + 8)
    if flags & UTF8_FLAG or style_count:
        raise ValueError('Only UTF-16 string pools without styles are supported')
    offsets = struct.unpack_from(f'<{count}I', data, off + header_size)
    strings = []
    for o in offsets:
        p = off + strings_start + o
        n = struct.unpack_from('<H', data, p)[0]
        if n & 0x8000:
            raise ValueError('Long UTF-16 strings are not supported')
        strings.append(data[p + 2:p + 2 + 2 * n].decode('utf-16le'))
    return strings, chunk_size


def _encode_string_pool(strings):
    header_size = 28
    blobs, offsets, cursor = [], [], 0
    for s in strings:
        encoded = s.encode('utf-16le')
        if len(encoded) // 2 >= 0x8000:
            raise ValueError('String too long for this writer')
        blob = struct.pack('<H', len(encoded) // 2) + encoded + b'\0\0'
        offsets.append(cursor)
        blobs.append(blob)
        cursor += len(blob)
    body = b''.join(blobs)
    body += b'\0' * (-len(body) % 4)
    strings_start = header_size + 4 * len(strings)
    chunk_size = strings_start + len(body)
    header = struct.pack('<HHIIIIII', RES_STRING_POOL, header_size, chunk_size,
                         len(strings), 0, 0, strings_start, 0)
    return header + struct.pack(f'<{len(strings)}I', *offsets) + body


def patch_manifest_version(axml: bytes, version_code: int, version_name: str) -> bytes:
    """Return AndroidManifest.xml (binary) with a new versionCode and versionName."""
    _, xml_header_size, _ = struct.unpack_from('<HHI', axml, 0)
    pool_off = xml_header_size
    if struct.unpack_from('<H', axml, pool_off)[0] != RES_STRING_POOL:
        raise ValueError('String pool not found after XML header')
    strings, pool_size = _read_string_pool(axml, pool_off)
    rest = bytearray(axml[pool_off + pool_size:])

    code_idx, name_idx = strings.index('versionCode'), strings.index('versionName')
    patched = set()
    p = 0
    while p < len(rest):
        chunk_type, header_size, chunk_size = struct.unpack_from('<HHI', rest, p)
        if chunk_type == RES_XML_START_ELEMENT:
            ext = p + header_size
            attr_start, attr_size, attr_count = struct.unpack_from('<HHH', rest, ext + 8)
            for i in range(attr_count):
                a = ext + attr_start + i * attr_size
                name = struct.unpack_from('<I', rest, a + 4)[0]
                data_type = rest[a + 15]
                if name == code_idx:
                    if data_type != TYPE_INT_DEC:
                        raise ValueError('versionCode is not a plain integer')
                    struct.pack_into('<I', rest, a + 16, version_code)
                    patched.add('code')
                elif name == name_idx:
                    if data_type != TYPE_STRING:
                        raise ValueError('versionName is not a string')
                    value_idx = struct.unpack_from('<I', rest, a + 16)[0]
                    strings[value_idx] = version_name
                    patched.add('name')
        p += chunk_size
    if patched != {'code', 'name'}:
        raise ValueError(f'Could not find version attributes (patched: {patched})')

    pool = _encode_string_pool(strings)
    body = axml[8:pool_off] + pool + bytes(rest)
    return struct.pack('<HHI', 0x0003, xml_header_size, 8 + len(body)) + body


def read_manifest_strings(axml: bytes):
    _, xml_header_size, _ = struct.unpack_from('<HHI', axml, 0)
    return _read_string_pool(axml, xml_header_size)[0]


# --------------------------------------------------------------------------
# ZIP

ALIGNMENT_EXTRA_ID = 0xD935  # the extra field zipalign/apksigner use for padding
FIXED_DATE = (1981, 1, 1, 1, 1, 2)


def aligned_zip(entries) -> bytes:
    """entries: iterable of (name, bytes, store). Stored entries are 4-byte aligned."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w') as zf:
        for name, data, store in entries:
            info = zipfile.ZipInfo(name, FIXED_DATE)
            info.create_system = 0
            info.external_attr = 0
            if store:
                info.compress_type = zipfile.ZIP_STORED
                header_end = buffer.tell() + 30 + len(name.encode('utf-8')) + 6
                pad = -header_end % 4
                info.extra = struct.pack('<HHH', ALIGNMENT_EXTRA_ID, 2 + pad, 4) + b'\0' * pad
            else:
                info.compress_type = zipfile.ZIP_DEFLATED
            zf.writestr(info, data, compresslevel=9 if not store else None)
    return buffer.getvalue()


def _find_eocd(apk: bytes) -> int:
    pos = apk.rfind(b'PK\x05\x06')
    if pos < 0 or len(apk) - pos < 22:
        raise ValueError('End of central directory not found')
    return pos


# --------------------------------------------------------------------------
# APK Signature Scheme v2

APK_SIG_BLOCK_MAGIC = b'APK Sig Block 42'
APK_SIGNATURE_SCHEME_V2_ID = 0x7109871A
RSA_PKCS1_V1_5_WITH_SHA256 = 0x0103
CHUNK = 1024 * 1024


def _lp(data: bytes) -> bytes:
    return struct.pack('<I', len(data)) + data


def _chunked_digest(sections) -> bytes:
    digests = []
    for section in sections:
        for start in range(0, len(section), CHUNK):
            chunk = section[start:start + CHUNK]
            digests.append(hashlib.sha256(b'\xa5' + struct.pack('<I', len(chunk)) + chunk).digest())
    return hashlib.sha256(b'\x5a' + struct.pack('<I', len(digests)) + b''.join(digests)).digest()


def sign_v2(apk: bytes, private_key, certificate) -> bytes:
    if not isinstance(private_key, rsa.RSAPrivateKey):
        raise ValueError('Only RSA signing keys are supported')
    eocd = _find_eocd(apk)
    cd_offset = struct.unpack_from('<I', apk, eocd + 16)[0]
    if apk[cd_offset - 16:cd_offset] == APK_SIG_BLOCK_MAGIC:
        raise ValueError('APK is already signed with a v2+ scheme')

    entries, central_dir, end = apk[:cd_offset], apk[cd_offset:eocd], apk[eocd:]
    digest = _chunked_digest([entries, central_dir, end])

    cert_der = certificate.public_bytes(serialization.Encoding.DER)
    public_key = private_key.public_key().public_bytes(
        serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
    signed_data = (
        _lp(_lp(struct.pack('<I', RSA_PKCS1_V1_5_WITH_SHA256) + _lp(digest)))
        + _lp(_lp(cert_der))
        + _lp(b'')  # additional attributes
    )
    signature = private_key.sign(signed_data, padding.PKCS1v15(), hashes.SHA256())
    signer = (
        _lp(signed_data)
        + _lp(_lp(struct.pack('<I', RSA_PKCS1_V1_5_WITH_SHA256) + _lp(signature)))
        + _lp(public_key)
    )
    v2_value = _lp(_lp(signer))

    pair = struct.pack('<Q', 4 + len(v2_value)) + struct.pack('<I', APK_SIGNATURE_SCHEME_V2_ID) + v2_value
    block_size = len(pair) + 8 + len(APK_SIG_BLOCK_MAGIC)  # excludes the leading size field
    block = struct.pack('<Q', block_size) + pair + struct.pack('<Q', block_size) + APK_SIG_BLOCK_MAGIC

    new_end = bytearray(end)
    struct.pack_into('<I', new_end, 16, cd_offset + len(block))
    return entries + block + central_dir + bytes(new_end)

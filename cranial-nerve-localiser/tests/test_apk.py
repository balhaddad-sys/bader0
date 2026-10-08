"""Packaging checks. Run: python3 -m unittest discover -s tests"""
import pathlib
import struct
import sys
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
from apk import patch_manifest, read_manifest_strings  # noqa: E402

SHELL_MANIFEST = (ROOT / 'android' / 'shell' / 'AndroidManifest.xml').read_bytes()


def attributes(axml):
    """Yield (element, attribute, value) for string and integer attributes."""
    strings = read_manifest_strings(axml)
    header_size = struct.unpack_from('<H', axml, 2)[0]
    p = header_size + struct.unpack_from('<I', axml, header_size + 4)[0]
    while p < len(axml):
        chunk_type, node_header, chunk_size = struct.unpack_from('<HHI', axml, p)
        if chunk_type == 0x0102:
            ext = p + node_header
            element = strings[struct.unpack_from('<I', axml, ext + 4)[0]]
            start, size, count = struct.unpack_from('<HHH', axml, ext + 8)
            for i in range(count):
                a = ext + start + i * size
                name = strings[struct.unpack_from('<I', axml, a + 4)[0]]
                kind, data = axml[a + 15], struct.unpack_from('<I', axml, a + 16)[0]
                yield element, name, strings[data] if kind == 0x03 else data
        p += chunk_size


class ManifestPatchTest(unittest.TestCase):
    def test_version_only_keeps_identity(self):
        attrs = set(attributes(patch_manifest(SHELL_MANIFEST, 9, '9.9.9')))
        self.assertIn(('manifest', 'versionCode', 9), attrs)
        self.assertIn(('manifest', 'versionName', '9.9.9'), attrs)
        self.assertIn(('manifest', 'package', 'org.bedsideatlas.craniallocaliser'), attrs)
        self.assertIn(('activity', 'name', '.MainActivity'), attrs)

    def test_new_application_id_keeps_the_activity_class(self):
        attrs = set(attributes(patch_manifest(SHELL_MANIFEST, 6, '2.0.1', 'org.example.atlas')))
        self.assertIn(('manifest', 'package', 'org.example.atlas'), attrs)
        self.assertIn(('activity', 'name', 'org.bedsideatlas.craniallocaliser.MainActivity'), attrs)
        self.assertIn(('action', 'name', 'android.intent.action.MAIN'), attrs)

    def test_unchanged_attributes_survive(self):
        before = {(e, n, v) for e, n, v in attributes(SHELL_MANIFEST) if n not in {'versionCode', 'versionName', 'package', 'name'}}
        after = {(e, n, v) for e, n, v in attributes(patch_manifest(SHELL_MANIFEST, 6, '2.0.1', 'org.example.atlas'))
                 if n not in {'versionCode', 'versionName', 'package', 'name'}}
        self.assertEqual(before, after)


if __name__ == '__main__':
    unittest.main()

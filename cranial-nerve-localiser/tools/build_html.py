#!/usr/bin/env python3
"""Inline src/ into the single self-contained page the Android shell loads.

The Android WebView blocks every non-data: request, so the page must carry its
own fonts, styles and scripts. `{{name}}` placeholders in src/index.html are
replaced verbatim with the contents of src/<name>.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'src'
PLACEHOLDER = re.compile(r'\{\{([A-Za-z0-9_.-]+)\}\}')


def build_html() -> str:
    shell = (SRC / 'index.html').read_text(encoding='utf-8')

    def include(match):
        part = SRC / match.group(1)
        if not part.is_file():
            raise SystemExit(f'Missing include: {part}')
        text = part.read_text(encoding='utf-8')
        if '</script' in text.lower() and part.suffix == '.js':
            raise SystemExit(f'{part.name} contains "</script", which would end the inline script early')
        return text

    return PLACEHOLDER.sub(include, shell)


def main():
    out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'dist' / 'atlas.html'
    out.parent.mkdir(parents=True, exist_ok=True)
    html = build_html()
    out.write_text(html, encoding='utf-8', newline='')
    print(f'{out} ({len(html.encode("utf-8")):,} bytes)')


if __name__ == '__main__':
    main()

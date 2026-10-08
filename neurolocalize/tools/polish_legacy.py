#!/usr/bin/env python3
"""Apply the shared atlas finish to the eleven original 1.1 diagrams.

Sources stay untouched in tools/legacy_atlas/; polished copies are written to the output folder.
Run:  python3 tools/polish_legacy.py web/assets/atlas
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from diagrams import INK, TEAL, BLUE, GOLD, RED, MUTED, WHITE, SOLID, mix, atlas_order  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
BASE_DEFS = ('<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f9f9f4"/>'
             '<stop offset="1" stop-color="#eef1e8"/></linearGradient>'
             '<linearGradient id="card" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/>'
             '<stop offset="1" stop-color="#f9faf6"/></linearGradient>'
             '<pattern id="dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".9" fill="#d3dbcf"/></pattern>'
             '<filter id="shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="2" stdDeviation="3" '
             'flood-color="#173e39" flood-opacity=".09"/></filter>'
             '<filter id="lift" x="-40%" y="-40%" width="180%" height="190%"><feDropShadow dx="0" dy="1.2" stdDeviation="1.4" '
             'flood-color="#173e39" flood-opacity=".22"/></filter>'
             + ''.join(f'<linearGradient id="g{c.strip("#")}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{mix(c, WHITE, .22)}"/>'
                       f'<stop offset="1" stop-color="{mix(c, INK, .12)}"/></linearGradient>' for c in sorted(SOLID)))


def polish(svg, fig):
    w, h = map(int, re.search(r'viewBox="0 0 (\d+) (\d+)"', svg).groups())
    svg = re.sub(r'<marker id="arrow"[^>]*>.*?</marker>',
                 f'<marker id="arrow" markerUnits="userSpaceOnUse" markerWidth="16" markerHeight="16" refX="11" refY="8" '
                 f'orient="auto"><path d="M2 2.5L13 8L2 13.5L5 8Z" fill="{TEAL}"/></marker>', svg, flags=re.S)
    svg = svg.replace('<defs>', '<defs>' + BASE_DEFS, 1)
    svg = svg.replace(f'<rect width="{w}" height="{h}" rx="18" fill="#f4f5ee"/>',
                      f'<rect width="{w}" height="{h}" rx="18" fill="url(#bg)"/><rect width="{w}" height="{h}" rx="18" fill="url(#dots)" opacity=".55"/>'
                      f'<rect x=".5" y=".5" width="{w - 1}" height="{h - 1}" rx="17.5" fill="none" stroke="#dfe5da"/>', 1)
    svg = svg.replace('<defs>', '<defs><radialGradient id="tissue" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#f7f9f4"/>'
                      '<stop offset="1" stop-color="#d9e4d4"/></radialGradient>', 1)
    svg = re.sub(r'(<ellipse\b[^>]*)fill="#e5ece0"', r'\1fill="url(#tissue)"', svg)
    svg = svg.replace('font-family="Arial,sans-serif"', 'font-family="Arial,Helvetica,sans-serif"', 1)
    svg = re.sub(r'<text x="28" y="39" font-size="25" fill="#173e39" text-anchor="start">',
                 '<text x="28" y="40" font-size="26" fill="#173e39" font-family="Georgia,\'Times New Roman\',serif" letter-spacing="-.4">', svg, count=1)

    def card(m):
        tag = m.group(0)
        wd = float(re.search(r'width="([\d.]+)"', tag).group(1))
        if 'stroke=' in tag and wd > 40:
            tag = tag.replace('fill="#ffffff"', 'fill="url(#card)"').replace('/>', ' filter="url(#shadow)"/>')
        return tag
    svg = re.sub(r'<rect x="[^"]*" y="[^"]*" width="[^"]*" height="[^"]*" rx="[^"]*" fill="#ffffff"[^>]*/>', card, svg)

    def solid(m):
        tag, col = m.group(0), m.group(1)
        if col in SOLID:
            tag = tag.replace(f'fill="{col}"', f'fill="url(#g{col.strip("#")})"')
            if tag.startswith('<circle'):
                tag = tag.replace('/>', ' filter="url(#lift)"/>')
        return tag
    svg = re.sub(r'<(?:circle|rect)\b[^>]*fill="(#[0-9a-f]{6})"[^>]*/>', solid, svg)

    def glow(m):
        tag, col, sw = m.group(0), m.group(1), float(m.group(2))
        if col in SOLID and sw >= 3 and 'stroke-dasharray' not in tag and 'fill="none"' in tag:
            under = re.sub(r'stroke-width="[\d.]+"', f'stroke-width="{sw + 7:g}" stroke-opacity=".13"', tag)
            under = re.sub(r'\s*marker-end="[^"]*"', '', under)
            return under + tag
        return tag
    svg = re.sub(r'<path\b[^>]*stroke="(#[0-9a-f]{6})" stroke-width="([\d.]+)"[^>]*/>', glow, svg)
    svg = re.sub(r'<text x="28" y="(\d+)" font-size="12" fill="#64736c" text-anchor="start">NEUROLOCALIZE  /  ORIGINAL SCHEMATIC · NOT TO SCALE</text>',
                 lambda m: f'<text x="28" y="{m.group(1)}" font-size="11" fill="{MUTED}" letter-spacing="1.2">NEUROLOCALIZE  ·  ORIGINAL SCHEMATIC  ·  NOT TO SCALE</text>'
                           f'<text x="{w - 28}" y="{m.group(1)}" font-size="11" fill="{TEAL}" text-anchor="end" letter-spacing="1.2" font-weight="700">{fig}</text>', svg)
    return svg


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'web/assets/atlas'
    order = atlas_order()
    src = os.path.join(HERE, 'legacy_atlas')
    for f in sorted(os.listdir(src)):
        name = f[:-4]
        fig = f'FIG. {order.index(name) + 1:02d}' if name in order else ''
        with open(os.path.join(src, f), encoding='utf-8') as fh:
            svg = polish(fh.read(), fig)
        with open(os.path.join(out, f), 'w', encoding='utf-8') as fh:
            fh.write(svg)
        print(f, fig)

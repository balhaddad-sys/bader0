#!/usr/bin/env python3
"""Generate all 35 NeuroLocalize atlas figures as standalone SVG files.

House style: 720px canvas with a hairline frame, serif title, Arial labels on a fixed
type scale, flat teal/blue/gold accents, shading reserved for anatomy, leader-line
callouts and key panels. Run:  python3 tools/diagrams.py web/assets/atlas
"""
import os
import sys
from xml.sax.saxutils import escape

INK = '#173e39'
TEAL = '#278278'
BLUE = '#527da2'
GOLD = '#b17b30'
MUTED = '#64736c'
TEXT = '#3b4c46'
BG = '#f4f5ee'
LINE = '#d6dfd3'
PALE = '#e5ece0'
SAND = '#e3cfb1'
GREY = '#b3c5b5'
RED = '#a34040'
WHITE = '#ffffff'
TEAL_PALE = '#dcebe6'
BLUE_PALE = '#e3eaf0'
GOLD_PALE = '#f1e6d2'
RED_PALE = '#f3dcd8'

# Butterfly grey matter from the original hemicord diagram (centred on 327,264).
TINT = {TEAL: '#a9d1c9', GOLD: '#e6cfa6', BLUE: '#b4c8db'}

GREY_MATTER = ('M288 203C278 224 297 242 312 249C289 271 272 305 287 326L322 290L337 290L370 326'
               'C382 306 365 273 344 249C359 237 375 222 366 203L337 235L320 235Z')


SOLID = {INK, TEAL, BLUE, GOLD, RED}


def mix(color, other, t):
    """Blend two #rrggbb colours: t=0 gives color, t=1 gives other."""
    a = [int(color[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(other[i:i + 2], 16) for i in (1, 3, 5)]
    return '#' + ''.join(f'{round(x + (y - x) * t):02x}' for x, y in zip(a, b))


class Svg:
    """Builder for one diagram. Rendering adds the shared 1.4 polish: a soft gradient canvas with a
    faint dot grid, drop shadows under cards, gradient fills on solid accents, a soft glow under
    thick pathways, solid arrowheads and a serif title."""

    def __init__(self, title, subtitle, h=560, w=720):
        self.w, self.h, self.title, self.subtitle = w, h, title, subtitle
        self.defs = []
        self.body = []
        self.uid = 0
        self.fig = ''
        self.grads = set()

    def nid(self, prefix):
        self.uid += 1
        return f'{prefix}{self.uid}'

    def add(self, s):
        self.body.append(s)

    def paint(self, fill):
        """Accents stay flat in the house style; anatomy uses radial() shading explicitly."""
        if fill not in SOLID or True:
            return fill
        gid = 'g' + fill.strip('#')
        if gid not in self.grads:
            self.grads.add(gid)
            self.defs.append(f'<linearGradient id="{gid}" x1="0" y1="0" x2="0" y2="1">'
                             f'<stop offset="0" stop-color="{mix(fill, WHITE, .22)}"/>'
                             f'<stop offset="1" stop-color="{mix(fill, INK, .12)}"/></linearGradient>')
        return f'url(#{gid})'

    def radial(self, inner, outer):
        gid = 'r' + inner.strip('#') + outer.strip('#')
        if gid not in self.grads:
            self.grads.add(gid)
            self.defs.append(f'<radialGradient id="{gid}" cx=".4" cy=".35" r=".75">'
                             f'<stop offset="0" stop-color="{inner}"/><stop offset="1" stop-color="{outer}"/></radialGradient>')
        return f'url(#{gid})'

    def text(self, x, y, s, size=15, fill=MUTED, anchor='start', weight=None, italic=False):
        lines = s if isinstance(s, (list, tuple)) else [s]
        extra = (f' font-weight="{weight}"' if weight else '') + (' font-style="italic"' if italic else '')
        if weight == '700' and size <= 13 and fill not in (WHITE,):
            extra += ' letter-spacing=".9"'
        for i, line in enumerate(lines):
            self.add(f'<text x="{x}" y="{y + i * round(size * 1.35)}" font-size="{size}" fill="{fill}" '
                     f'text-anchor="{anchor}"{extra}>{escape(line)}</text>')

    def rect(self, x, y, w, h, fill=WHITE, stroke=None, sw=2, rx=12, extra=''):
        st = f' stroke="{stroke}" stroke-width="{min(sw, 1.2)}"' if stroke else ''
        lift = ''
        self.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{self.paint(fill)}"{st}{lift}{extra}/>')

    def circle(self, cx, cy, r, fill=WHITE, stroke=None, sw=2, extra=''):
        st = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ''
        lift = ''
        self.add(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{self.paint(fill)}"{st}{lift}{extra}/>')

    def ellipse(self, cx, cy, rx, ry, fill=WHITE, stroke=None, sw=2, extra=''):
        st = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ''
        self.add(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{self.paint(fill)}"{st}{extra}/>')

    def path(self, d, stroke=TEAL, sw=3, fill='none', arrow=None, dash=None, extra='', glow=True):
        mk = f' marker-end="url(#{self.marker(arrow)})"' if arrow else ''
        ds = f' stroke-dasharray="{dash}"' if dash else ''
        if glow and sw >= 3 and stroke in SOLID and fill == 'none' and not dash:
            self.add(f'<path d="{d}" fill="none" stroke="#ffffff" stroke-width="{sw + 3.5}" '
                     f'stroke-linecap="round" stroke-linejoin="round"/>')
        self.add(f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" '
                 f'stroke-linecap="round" stroke-linejoin="round"{ds}{mk}{extra}/>')

    def marker(self, color):
        mid = 'arrow-' + color.strip('#')
        if not any(f'id="{mid}"' in d for d in self.defs):
            self.defs.append(f'<marker id="{mid}" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" '
                             f'refX="10" refY="7" orient="auto"><path d="M1.5 2.5L12 7L1.5 11.5L4 7Z" fill="{color}"/></marker>')
        return mid

    def clip(self, inner):
        cid = self.nid('clip')
        self.defs.append(f'<clipPath id="{cid}">{inner}</clipPath>')
        return cid

    def badge(self, cx, cy, label, fill=RED, r=13, size=14):
        self.circle(cx, cy, r, fill=fill, stroke=WHITE, sw=2)
        self.text(cx, cy + size * 0.36, str(label), size=size, fill=WHITE, anchor='middle', weight='700')

    def card(self, x, y, w, h, heading, lines, color=TEAL, size=14, hsize=17, fill=WHITE):
        """Key panel: hairline frame, coloured top rule, small-caps heading, body text."""
        self.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="#ffffff" stroke="{mix(color, WHITE, .55)}" stroke-width="1"/>')
        self.add(f'<path d="M{x + 8} {y + .6}L{x + w - 8} {y + .6}" stroke="{color}" stroke-width="2.4" stroke-linecap="round"/>')
        self.add(f'<text x="{x + 14}" y="{y + 24}" font-size="12" fill="{color}" font-weight="700" letter-spacing="1.1">'
                 f'{escape(heading.upper())}</text>')
        if lines:
            self.text(x + 14, y + 24 + round(hsize * 1.45), lines, size=min(size, 14), fill=TEXT)

    def note(self, y, heading, lines, h=None, color=GOLD):
        lines = lines if isinstance(lines, list) else [lines]
        h = h or 44 + len(lines) * 21
        self.card(30, y, self.w - 60, h, heading, lines, color=color, size=15, hsize=18)

    def render(self):
        h, w = self.h, self.w
        base = ('<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f9f9f4"/>'
                '<stop offset="1" stop-color="#eef1e8"/></linearGradient>'
                '<linearGradient id="card" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/>'
                '<stop offset="1" stop-color="#f9faf6"/></linearGradient>'
                '<pattern id="dots" width="18" height="18" patternUnits="userSpaceOnUse">'
                '<circle cx="2" cy="2" r=".9" fill="#d3dbcf"/></pattern>'
                '<filter id="shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="2" '
                'stdDeviation="3" flood-color="#173e39" flood-opacity=".09"/></filter>'
                '<filter id="lift" x="-40%" y="-40%" width="180%" height="190%"><feDropShadow dx="0" dy="1.2" '
                'stdDeviation="1.4" flood-color="#173e39" flood-opacity=".22"/></filter>')
        head = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" '
                f'role="img"><title>{escape(self.title)}</title><desc>{escape(self.subtitle)} Original '
                f'simplified teaching diagram; not to scale.</desc><defs>{base}{"".join(self.defs)}</defs>'
                f'<rect width="{w}" height="{h}" rx="14" fill="#fcfcf9"/>'
                f'<rect x=".5" y=".5" width="{w - 1}" height="{h - 1}" rx="13.5" fill="none" stroke="#dde3d8"/>'
                f'<g font-family="Arial,Helvetica,sans-serif">'
                f'<text x="28" y="40" font-size="25" fill="{INK}" font-family="Georgia,\'Times New Roman\',serif" '
                f'letter-spacing="-.3">{escape(self.title)}</text>'
                f'<text x="28" y="66" font-size="14" fill="{MUTED}" text-anchor="start">{escape(self.subtitle)}</text>')
        foot = (f'<path d="M28 {h - 36}L{w - 28} {h - 36}" fill="none" stroke="{LINE}" stroke-width="1"/>'
                f'<text x="28" y="{h - 13}" font-size="11" fill="{MUTED}" letter-spacing="1.2">'
                f'NEUROLOCALIZE ATLAS  ·  SCHEMATIC, NOT TO SCALE</text>'
                f'<text x="{w - 28}" y="{h - 13}" font-size="11" fill="{TEAL}" text-anchor="end" letter-spacing="1.2" '
                f'font-weight="700">{escape(self.fig)}</text></g></svg>')
        return head + ''.join(self.body) + foot


# ---------------------------------------------------------------- anatomy helpers

SKIN_HI, SKIN_LO = '#fffbf5', '#efe5d6'


def eye_front(s, cx, cy, w, h, look=0, lid=True):
    """Front-view eye: almond aperture, fibred iris, pupil and catch-light."""
    al = f'M{cx - w} {cy}Q{cx} {cy - h * 1.3:.1f} {cx + w} {cy}Q{cx} {cy + h * 1.3:.1f} {cx - w} {cy}Z'
    cid = s.clip(f'<path d="{al}"/>')
    s.add(f'<path d="{al}" fill="{s.radial("#ffffff", "#e7ece4")}"/>')
    r = h * 0.92
    ix = cx + look
    g = [f'<circle cx="{ix}" cy="{cy}" r="{r:.1f}" fill="{s.radial(mix(BLUE, WHITE, .45), mix(TEAL, INK, .35))}"/>']
    for k in range(16):
        import math
        a = k * math.pi / 8
        g.append(f'<path d="M{ix + r * .48 * math.cos(a):.1f} {cy + r * .48 * math.sin(a):.1f}L{ix + r * .92 * math.cos(a):.1f} '
                 f'{cy + r * .92 * math.sin(a):.1f}" stroke="#ffffff" stroke-opacity=".22" stroke-width="1"/>')
    g.append(f'<circle cx="{ix}" cy="{cy}" r="{r * .42:.1f}" fill="#10231f"/>')
    g.append(f'<circle cx="{ix - r * .32:.1f}" cy="{cy - r * .32:.1f}" r="{max(1.5, r * .16):.1f}" fill="#ffffff" opacity=".9"/>')
    s.add(f'<g clip-path="url(#{cid})">{"".join(g)}</g>')
    s.add(f'<path d="{al}" fill="none" stroke="{INK}" stroke-width="2" stroke-linejoin="round"/>')
    if lid:
        s.add(f'<path d="M{cx - w * .8:.1f} {cy - h * .95:.1f}Q{cx} {cy - h * 1.75:.1f} {cx + w * .8:.1f} {cy - h * .95:.1f}" '
              f'fill="none" stroke="{MUTED}" stroke-width="1.4" stroke-opacity=".55" stroke-linecap="round"/>')


def eyeball_top(s, cx, cy, r):
    """Eyeball seen from above: cornea forward (up), lens, retina at the back."""
    s.circle(cx, cy, r, fill=s.radial('#ffffff', '#dde5db'), stroke=INK, sw=2.2)
    s.add(f'<path d="M{cx - r * .55:.1f} {cy - r * .83:.1f}Q{cx} {cy - r * 1.42:.1f} {cx + r * .55:.1f} {cy - r * .83:.1f}" '
          f'fill="{BLUE_PALE}" stroke="{INK}" stroke-width="1.6"/>')
    s.ellipse(cx, cy - r * .6, r * .4, r * .17, fill='#f4efe0', stroke=GREY, sw=1.2)
    s.add(f'<path d="M{cx - r * .82:.1f} {cy + r * .5:.1f}A{r * .95:.1f} {r * .95:.1f} 0 0 0 {cx + r * .82:.1f} {cy + r * .5:.1f}" '
          f'fill="none" stroke="{mix(RED, WHITE, .35)}" stroke-width="2.4" stroke-opacity=".7"/>')


def cord_section(s, cx, cy, rx, ry, roots=True, shade=None):
    """Axial cord, dorsal up: roots, white matter, grey matter, fissure, canal; optional clipped shading."""
    if roots:
        for side in (-1, 1):
            s.path(f'M{cx + side * rx * .5:.1f} {cy - ry * .8:.1f}C{cx + side * rx * .9:.1f} {cy - ry * 1.05:.1f} '
                   f'{cx + side * rx * 1.1:.1f} {cy - ry * .95:.1f} {cx + side * rx * 1.28:.1f} {cy - ry * .9:.1f}',
                   mix(GOLD, WHITE, .3), max(3, rx * .1), glow=False)
            s.path(f'M{cx + side * rx * .4:.1f} {cy + ry * .82:.1f}C{cx + side * rx * .8:.1f} {cy + ry * 1.05:.1f} '
                   f'{cx + side * rx * 1.05:.1f} {cy + ry * 1.0:.1f} {cx + side * rx * 1.25:.1f} {cy + ry * .92:.1f}',
                   mix(TEAL, WHITE, .3), max(3, rx * .1), glow=False)
            s.ellipse(cx + side * rx * 1.02, cy - ry * .99, rx * .13, ry * .1, fill=SAND, stroke=GOLD, sw=1)
    s.ellipse(cx, cy, rx, ry, fill=s.radial('#f7f9f4', '#d9e4d4'))
    k = rx / 150
    s.add(f'<path d="{GREY_MATTER}" fill="{s.radial(mix(GREY, WHITE, .25), mix(GREY, INK, .2))}" '
          f'transform="translate({cx} {cy}) scale({k:.4f} {ry / 135:.4f}) translate(-327 -264)"/>')
    if shade:
        cid = s.clip(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"/>')
        s.add(f'<g fill="{RED}" opacity=".4" clip-path="url(#{cid})">{shade}</g>')
    s.ellipse(cx, cy, rx, ry, fill='none', stroke=INK, sw=2.4)
    s.add(f'<path d="M{cx - rx * .07:.1f} {cy + ry + 1:.1f}L{cx} {cy + ry * .7:.1f}L{cx + rx * .07:.1f} {cy + ry + 1:.1f}" '
          f'fill="{BG}" stroke="{INK}" stroke-width="1.6" stroke-linejoin="round"/>')
    s.path(f'M{cx} {cy - ry}L{cx} {cy - ry * .62:.1f}', INK, 1.3, glow=False)
    s.circle(cx, cy + ry * .02, max(1.6, rx * .035), fill=INK)


def mirror_x(d, axis=440):
    import re
    toks = re.findall(r'[MLCQZ]|-?\d+(?:\.\d+)?', d)
    out, i, pair = [], 0, 0
    for t in toks:
        if t in 'MLCQZ':
            out.append(t); pair = 0
        else:
            out.append(f'{axis - float(t):g}' if pair % 2 == 0 else t); pair += 1
    return ' '.join(out).replace(' Z', 'Z')


ARM = ('M168 166C156 172 152 200 150 230C148 254 147 262 146 272C142 304 139 338 140 370L160 372'
       'C161 340 164 306 168 276C171 248 178 214 184 182C186 172 180 162 168 166Z')
HAND = 'M140 366C133 378 135 398 141 410C145 419 156 419 160 410C164 398 164 380 160 368Z'
THUMB = 'M141 376C132 380 127 392 130 401C132 407 139 406 142 399Z'
LEG = 'M178 300C175 340 179 384 185 428C183 470 185 516 189 556L210 556C212 516 215 470 213 430C217 390 219 344 221 306Z'
FOOT = 'M188 550C181 562 173 574 175 582C177 589 208 589 211 582C213 572 212 560 210 550Z'
BODY_PATHS = (['M209 136L231 136L233 160L207 160Z',
               'M176 170C182 157 200 152 220 152C240 152 258 157 264 170C268 204 260 234 256 262C260 280 263 296 263 308'
               'L177 308C177 296 180 280 184 262C180 234 172 204 176 170Z']
              + [ARM, HAND, THUMB, LEG, FOOT] + [mirror_x(d) for d in (ARM, HAND, THUMB, LEG, FOOT)])


def body_figure(s, transform='', k=1.0, shade=None, shade_color=GOLD):
    """Front-view human silhouette in local coordinates (centre x 220, head at y 116, feet ~588).
    `shade` is SVG markup in the same local coordinates, clipped to the body."""
    T = f' transform="{transform}"' if transform else ''
    shapes = [f'<ellipse cx="220" cy="116" rx="24" ry="29"{T}/>'] + [f'<path d="{d}"{T}/>' for d in BODY_PATHS]
    allp = ''.join(shapes)
    s.add(f'<g fill="{INK}" stroke="{INK}" stroke-width="{3.6:.2f}" stroke-linejoin="round">{allp}</g>')
    s.add(f'<g fill="{s.radial(SKIN_HI, SKIN_LO)}">{allp}</g>')
    if shade:
        cid = s.clip(allp)
        s.add(f'<g clip-path="url(#{cid})"><g{T} fill="{shade_color}" opacity=".72">{shade}</g></g>')
    detail = ('M192 168Q205 174 216 168M224 168Q235 174 248 168M220 178L220 214M196 425Q202 433 209 425M231 425Q238 433 244 425'
              'M206 120Q209 123 212 120M228 120Q231 123 234 120M214 132Q220 135 226 132')
    s.add(f'<path d="{detail}"{T} fill="none" stroke="{MUTED}" stroke-opacity=".45" stroke-width="{1.4 / k:.2f}" stroke-linecap="round"/>')
    s.add(f'<circle cx="220" cy="262" r="2"{T} fill="{MUTED}" opacity=".5"/>')


# ---------------------------------------------------------------- diagrams

def umn_lmn():
    s = Svg('Upper or lower motor neuron?', 'The pattern of signs points to one half of the motor pathway.', h=600)
    # pathway column
    s.rect(40, 100, 150, 54, stroke=TEAL)
    s.text(115, 133, 'Motor cortex', 16, TEAL, 'middle')
    s.path('M115 154L115 196', TEAL, 4)
    s.text(127, 180, 'tract', 13)
    s.rect(52, 196, 126, 38, fill=PALE, stroke=TEAL)
    s.text(115, 221, 'Brainstem / cord', 14, TEAL, 'middle')
    s.path('M115 234L115 266', TEAL, 4, arrow=TEAL)
    s.circle(115, 288, 18, fill=GOLD)
    s.text(141, 284, 'Anterior', 13, GOLD)
    s.text(141, 300, 'horn cell', 13, GOLD)
    s.path('M115 306L115 348', GOLD, 4)
    s.text(127, 334, 'root / nerve', 13, GOLD)
    s.path('M115 348L115 362', GOLD, 4, arrow=GOLD)
    s.rect(60, 368, 110, 34, fill=SAND, rx=17)
    s.text(115, 390, 'Muscle', 15, INK, 'middle')
    # brackets
    s.path('M34 104L26 104L26 262L34 262', TEAL, 3)
    s.add(f'<text x="18" y="183" font-size="14" fill="{TEAL}" text-anchor="middle" transform="rotate(-90 18 183)">UPPER</text>')
    s.path('M34 272L26 272L26 400L34 400', GOLD, 3)
    s.add(f'<text x="18" y="336" font-size="14" fill="{GOLD}" text-anchor="middle" transform="rotate(-90 18 336)">LOWER</text>')
    # table
    x0, xu, xl, y = 228, 362, 526, 104
    s.text(x0, y + 10, 'SIGN', 12, MUTED, weight='700')
    s.text(xu, y + 10, 'UPPER MOTOR NEURON', 11, TEAL, weight='700')
    s.text(xl, y + 10, 'LOWER MOTOR NEURON', 11, GOLD, weight='700')
    rows = [('Tone', 'Increased, spastic', 'Reduced, flaccid'),
            ('Reflexes', 'Brisk, may spread', 'Reduced or absent'),
            ('Plantar', 'Extensor', 'Flexor'),
            ('Wasting', 'Mild and late', 'Often prominent'),
            ('Fasciculation', 'Absent', 'May be present'),
            ('Weak groups', 'Pyramidal pattern', 'Root or nerve pattern')]
    for i, (a, b, c) in enumerate(rows):
        yy = y + 26 + i * 50
        s.rect(220, yy, 470, 44, fill=WHITE if i % 2 == 0 else PALE, rx=8)
        s.text(x0 + 4, yy + 28, a, 15, INK)
        s.text(xu, yy + 28, b, 15, TEAL)
        s.text(xl, yy + 28, c, 15, GOLD)
    s.note(440, 'Read the signs together.', ['An acute central lesion can be flaccid with low reflexes at first.',
                                             'UMN signs below a level plus LMN signs at it suggest the cord;',
                                             'widespread mixed signs raise motor neuron disease.'], h=110)
    return s


def facial():
    s = Svg('Which part of the face is weak?', 'Forehead involvement separates a central from a peripheral pattern.', h=600)
    faces = [(190, 'CENTRAL (ABOVE THE NUCLEUS)', TEAL, 'lower'), (530, 'PERIPHERAL (NUCLEUS OR NERVE)', GOLD, 'half')]
    for cx, label, color, kind in faces:
        cy = 226
        s.text(cx, 96, label, 13, color, 'middle', weight='700')
        face = (f'M{cx} {cy - 112}C{cx + 62} {cy - 112} {cx + 98} {cy - 70} {cx + 98} {cy - 10}C{cx + 98} {cy + 50} {cx + 70} {cy + 100} '
                f'{cx} {cy + 112}C{cx - 70} {cy + 100} {cx - 98} {cy + 50} {cx - 98} {cy - 10}C{cx - 98} {cy - 70} {cx - 62} {cy - 112} {cx} {cy - 112}Z')
        for side in (-1, 1):
            s.ellipse(cx + side * 98, cy - 4, 14, 26, fill=s.radial(SKIN_HI, SKIN_LO), stroke=INK, sw=2)
        s.add(f'<path d="{face}" fill="{s.radial(SKIN_HI, SKIN_LO)}"/>')
        cid = s.clip(f'<path d="{face}"/>')
        if kind == 'lower':
            s.add(f'<rect x="{cx - 110}" y="{cy + 4}" width="110" height="130" fill="{GOLD}" opacity=".26" clip-path="url(#{cid})"/>')
        else:
            s.add(f'<rect x="{cx - 110}" y="{cy - 130}" width="110" height="260" fill="{GOLD}" opacity=".26" clip-path="url(#{cid})"/>')
        s.add(f'<path d="M{cx - 80} {cy - 70}C{cx - 60} {cy - 112} {cx + 60} {cy - 112} {cx + 80} {cy - 70}C{cx + 50} {cy - 92} {cx - 50} {cy - 92} {cx - 80} {cy - 70}Z" '
              f'fill="#5d4a39" opacity=".88" clip-path="url(#{cid})"/>')
        s.add(f'<path d="{face}" fill="none" stroke="{INK}" stroke-width="2.6"/>')
        s.path(f'M{cx} {cy - 112}L{cx} {cy + 112}', mix(GOLD, WHITE, .4), 1.2, dash='4 5')
        # forehead creases: absent on the weak side in the peripheral pattern
        for k in range(3):
            yy = cy - 64 + k * 11
            s.path(f'M{cx + 16} {yy}Q{cx + 42} {yy - 6} {cx + 66} {yy}', MUTED, 1.6, glow=False)
            if kind == 'lower':
                s.path(f'M{cx - 66} {yy}Q{cx - 42} {yy - 6} {cx - 16} {yy}', MUTED, 1.6, glow=False)
        # eyebrows
        s.path(f'M{cx + 20} {cy - 36}Q{cx + 40} {cy - 46} {cx + 62} {cy - 38}', INK, 3.2, glow=False)
        drop = 6 if kind == 'half' else 0
        s.path(f'M{cx - 62} {cy - 38 + drop}Q{cx - 40} {cy - 46 + drop} {cx - 20} {cy - 36 + drop}', INK, 3.2, glow=False)
        eye_front(s, cx + 40, cy - 16, 19, 9)
        eye_front(s, cx - 40, cy - 16, 19, 13 if kind == 'half' else 9)
        # nose, nasolabial folds (flattened on a weak lower face), mouth droop
        s.path(f'M{cx + 2} {cy - 18}C{cx - 2} {cy + 6} {cx - 12} {cy + 22} {cx - 12} {cy + 30}C{cx - 6} {cy + 36} {cx + 8} {cy + 36} {cx + 14} {cy + 30}', MUTED, 2, glow=False)
        s.path(f'M{cx + 22} {cy + 30}Q{cx + 40} {cy + 50} {cx + 46} {cy + 66}', MUTED, 1.6, glow=False)
        s.path(f'M{cx - 22} {cy + 32}Q{cx - 30} {cy + 46} {cx - 34} {cy + 56}', MUTED, 1.2, glow=False, extra=' stroke-opacity=".35"')
        s.path(f'M{cx + 38} {cy + 64}Q{cx + 4} {cy + 74} {cx - 34} {cy + 80}', mix(RED, INK, .3), 3, glow=False)
        s.text(cx - 52, cy + 140, 'affected side', 13, GOLD, 'middle', weight='700')
        s.text(cx + 52, cy + 140, 'other side', 13, MUTED, 'middle')
    s.text(190, 390, ['Lower face weak; forehead', 'wrinkles and eye closure', 'largely preserved.'], 15, INK, 'middle')
    s.text(530, 390, ['Forehead, eye closure and', 'mouth weak on the side', 'of the lesion.'], 15, INK, 'middle')
    s.note(446, 'Why the forehead differs', ['Forehead motor neurons receive input from both hemispheres. Sparing',
                                              'favors a central lesion but is not absolute: check limbs, speech and',
                                              'other cranial nerves. Faces are drawn facing you.'], h=106)
    return s


def field_defects():
    s = Svg('Where the visual pathway is cut', 'Six classic lesion sites and the fields they remove.', h=640)
    # pathway, viewed from above, patient's left on the left
    s.text(40, 98, "Viewed from above · patient's left on the left", 12, MUTED)
    L, R, Y = 110, 250, 140
    for x, lab in ((L, 'Left eye'), (R, 'Right eye')):
        eyeball_top(s, x, Y, 32)
        s.text(x, Y + 10, lab, 11, MUTED, 'middle')
    cx, cy = 180, 228
    s.path(f'M{L} {Y + 32}L{cx} {cy}', BLUE, 5)
    s.path(f'M{R} {Y + 32}L{cx} {cy}', GOLD, 5)
    s.path(f'M{cx} {cy}L{L} 300', BLUE, 5)
    s.path(f'M{cx} {cy}L{R} 300', GOLD, 5)
    s.ellipse(L, 304, 15, 10, fill=s.radial(mix(GREY, WHITE, .3), mix(GREY, INK, .2)), stroke=INK, sw=1)
    s.ellipse(R, 304, 15, 10, fill=s.radial(mix(GREY, WHITE, .3), mix(GREY, INK, .2)), stroke=INK, sw=1)
    s.text(180, 309, 'LGN', 12, MUTED, 'middle')
    # left hemisphere radiations (simple)
    s.path(f'M{L} 313L{L + 10} 495', BLUE, 4)
    # right radiations: Meyer's loop (inferior fibers) and parietal (superior fibers)
    s.path(f'M{R} 313C{R + 52} 330 {R + 60} 400 {R - 15} 495', GOLD, 4)
    s.path(f'M{R} 313L{R - 20} 495', GOLD, 4, dash='2 0')
    s.text(R + 34, 300, ['Meyer', 'loop'], 12, GOLD)
    s.rect(70, 495, 220, 42, fill=s.radial('#f2f5ef', '#d8e2d3'), stroke=GREY, rx=10)
    s.path('M180 495L180 537', GREY, 1.5, dash='4 4')
    s.text(180, 521, 'Occipital cortex', 14, INK, 'middle')
    s.text(180, 566, ['Gold = right pathway, which carries', 'the LEFT visual hemifield'], 12, MUTED, 'middle')
    marks = [(1, 223, 186), (2, cx, cy), (3, 222, 266), (4, R + 46, 352), (5, R - 12, 400), (6, 262, 516)]
    for n, x, y in marks:
        s.badge(x, y, n, r=12, size=13)
    # table of fields
    rows = [('Optic nerve', 'Right eye only'),
            ('Chiasm (crossing fibers)', 'Bitemporal hemianopia'),
            ('Optic tract', 'Left homonymous hemianopia'),
            ('Temporal (Meyer loop)', 'Left upper quadrant'),
            ('Parietal radiation', 'Left lower quadrant'),
            ('Occipital cortex', 'Left hemianopia; macula may be spared')]
    s.text(612, 102, 'L eye', 12, MUTED, 'middle')
    s.text(664, 102, 'R eye', 12, MUTED, 'middle')
    for i, (site, result) in enumerate(rows):
        y = 112 + i * 80
        s.rect(338, y, 352, 70, fill=WHITE, rx=10)
        s.badge(360, y + 35, i + 1, r=12, size=13)
        s.text(382, y + 29, site, 15, INK)
        if i == 5:
            s.text(382, y + 47, ['Left hemianopia;', 'macula may be spared'], 12, GOLD)
        else:
            s.text(382, y + 50, result, 13, GOLD)
        for j, ex in enumerate((612, 664)):
            ey, r = y + 35, 21
            s.circle(ex, ey, r, fill=WHITE, stroke=INK, sw=1.5)
            eye = 'L' if j == 0 else 'R'
            n = i + 1
            if n == 1 and eye == 'R':
                s.circle(ex, ey, r, fill=INK)
            elif n == 2:
                if eye == 'L':
                    s.path(f'M{ex} {ey - r}A{r} {r} 0 0 0 {ex} {ey + r}Z', 'none', 0, fill=INK)
                else:
                    s.path(f'M{ex} {ey - r}A{r} {r} 0 0 1 {ex} {ey + r}Z', 'none', 0, fill=INK)
            elif n in (3, 6):
                s.path(f'M{ex} {ey - r}A{r} {r} 0 0 0 {ex} {ey + r}Z', 'none', 0, fill=INK)
                if n == 6:
                    s.circle(ex, ey, 6, fill=WHITE)
            elif n == 4:
                s.path(f'M{ex} {ey}L{ex} {ey - r}A{r} {r} 0 0 0 {ex - r} {ey}Z', 'none', 0, fill=INK)
            elif n == 5:
                s.path(f'M{ex} {ey}L{ex - r} {ey}A{r} {r} 0 0 0 {ex} {ey + r}Z', 'none', 0, fill=INK)
            s.circle(ex, ey, r, fill='none', stroke=INK, sw=1.5)
    return s


def brainstem_rule():
    s = Svg('Medial and lateral brainstem clues', "The 'rule of 4': a teaching shortcut for brainstem syndromes.", h=600)
    # brainstem silhouette
    bs = ('M60 96C80 106 98 110 120 110C142 110 160 106 180 96L178 188C196 198 206 224 206 258C206 294 196 318 180 332'
          'L176 360C188 372 188 398 176 410L166 440C164 456 162 468 160 480L80 480C78 468 76 456 74 440L64 410'
          'C52 398 52 372 64 360L60 332C44 318 34 294 34 258C34 224 44 198 62 188Z')
    s.add(f'<path d="{bs}" fill="{s.radial("#f1f5ee", "#d4e0cf")}"/>')
    bcid = s.clip(f'<path d="{bs}"/>')
    s.add(f'<g clip-path="url(#{bcid})"><rect x="96" y="90" width="48" height="400" fill="{TEAL}" opacity=".13"/>'
          + ''.join(f'<path d="M30 {y}Q120 {y + 14} 210 {y}" fill="none" stroke="{GREY}" stroke-width="1.2" opacity=".7"/>' for y in range(212, 320, 16))
          + f'<path d="M106 344L104 480M134 344L136 480" fill="none" stroke="{GREY}" stroke-width="1.4"/>'
          + f'<ellipse cx="62" cy="384" rx="9" ry="20" fill="none" stroke="{GREY}" stroke-width="1.4"/>'
          + f'<ellipse cx="178" cy="384" rx="9" ry="20" fill="none" stroke="{GREY}" stroke-width="1.4"/></g>')
    s.add(f'<path d="{bs}" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round"/>')
    s.path('M120 92L120 478', TEAL, 1.5, dash='5 5')
    for y in (190, 330):
        s.path(f'M44 {y}L196 {y}', GREY, 1.5)
    s.text(120, 128, 'MIDBRAIN', 12, INK, 'middle', weight='700')
    s.text(120, 160, 'III  IV', 18, TEAL, 'middle')
    s.text(120, 232, 'PONS', 12, INK, 'middle', weight='700')
    s.text(120, 264, 'V VI VII VIII', 16, TEAL, 'middle')
    s.text(120, 360, 'MEDULLA', 12, INK, 'middle', weight='700')
    s.text(120, 392, 'IX X XI XII', 16, TEAL, 'middle')
    s.text(120, 496, ['XI arises mainly from', 'the upper cervical cord'], 11, MUTED, 'middle')
    s.text(48, 548, 'Shaded strip = medial', 11, TEAL)
    # medial card
    s.card(232, 96, 458, 184, "MEDIAL: the four 'M's", None, color=TEAL)
    med = [('Motor pathway', 'opposite arm and leg weak'),
           ('Medial lemniscus', 'opposite vibration and position loss'),
           ('MLF', 'same-side INO (adduction lag)'),
           ('Motor nuclei III, IV, VI, XII', 'same-side cranial nerve signs')]
    for i, (a, b) in enumerate(med):
        y = 152 + i * 33
        s.text(248, y, a, 15, INK)
        s.text(476, y, b, 13, MUTED)
    s.card(232, 296, 458, 184, "LATERAL: the four 'S's", None, color=GOLD)
    lat = [('Spinocerebellar links', 'same-side limb ataxia'),
           ('Spinothalamic tract', 'opposite body pain, temperature'),
           ('Sensory nucleus of V', 'same-side facial pain, temperature'),
           ('Sympathetic pathway', 'same-side Horner syndrome')]
    for i, (a, b) in enumerate(lat):
        y = 352 + i * 33
        s.text(248, y, a, 15, INK)
        s.text(476, y, b, 13, MUTED)
    s.rect(232, 494, 458, 56, fill=WHITE, stroke=LINE)
    s.text(248, 516, ['Medial motor nuclei divide 12 evenly (3, 4, 6, 12); V, VII, IX, X', 'are lateral. Real lesions are rarely this tidy; IV fibers cross.'], 13, MUTED)
    return s


def cord_syndromes():
    s = Svg('Five cord syndromes in cross-section', 'Dorsal is at the top. Shading marks the damaged region.', h=640)
    cells = [
        (130, 190, 'Complete', ['All modalities lost below', 'the level; both sides weak'], 'all'),
        (360, 190, 'Central', ['Arms often weaker than legs;', 'cape-like pain loss possible'], 'central'),
        (590, 190, 'Anterior', ['Weakness and pain loss;', 'vibration/position spared'], 'anterior'),
        (245, 430, 'Posterior', ['Vibration/position loss and', 'sensory ataxia; strength kept'], 'posterior'),
        (475, 430, 'Hemicord', ['Same-side weakness + vibration', 'loss; opposite pain loss'], 'hemi'),
    ]
    rx, ry = 74, 62
    k = rx / 150
    for cx, cy, name, lines, kind in cells:
        shade = {
            'all': f'<rect x="{cx - rx}" y="{cy - ry}" width="{2 * rx}" height="{2 * ry}"/>',
            'central': f'<ellipse cx="{cx}" cy="{cy + 2}" rx="{rx * .5:.0f}" ry="{ry * .5:.0f}"/>',
            'anterior': f'<rect x="{cx - rx}" y="{cy - ry / 3:.0f}" width="{2 * rx}" height="{ry * 4 / 3 + 2:.0f}"/>',
            'posterior': f'<path d="M{cx - 26} {cy - ry}L{cx + 26} {cy - ry}L{cx + 6} {cy - 4}L{cx - 6} {cy - 4}Z"/>',
            'hemi': f'<rect x="{cx - rx}" y="{cy - ry}" width="{rx}" height="{2 * ry}"/>',
        }[kind]
        cord_section(s, cx, cy, rx, ry, roots=True, shade=shade)
        s.text(cx, cy - ry - 14, 'dorsal', 11, MUTED, 'middle')
        s.text(cx, cy + ry + 30, name, 18, INK, 'middle')
        s.text(cx, cy + ry + 54, lines, 13, MUTED, 'middle')
        if kind == 'hemi':
            s.text(cx - rx - 12, cy + 5, 'lesion', 11, RED, 'end', weight='700')
    s.text(40, 590, 'Patterns are idealized; real lesions are often partial.', 13, GOLD)
    return s


def sensory_pathways():
    s = Svg('Two sensory systems, two crossings', 'Both routes carry the right body to the left hemisphere.', h=620)
    bands = [(92, 132, 'Cortex (S1)'), (156, 206, 'Thalamus'), (236, 296, 'Medulla'),
             (322, 478, 'Spinal cord'), (490, 528, 'Right body')]
    for y0, y1, lab in bands:
        s.rect(30, y0, 380, y1 - y0, fill=WHITE if lab != 'Spinal cord' else PALE, rx=8)
        s.text(40, (y0 + y1) / 2 + 5, lab, 13, MUTED)
    s.path('M260 86L260 534', GREY, 1.5, dash='5 5')
    s.text(214, 548, 'LEFT', 11, MUTED, 'middle')
    s.text(306, 548, 'RIGHT', 11, MUTED, 'middle')
    # DCML (gold): enters right, ascends right, crosses in medulla
    s.path('M340 510L340 262L215 248L215 182L222 118', GOLD, 5, arrow=GOLD)
    # Spinothalamic (blue): enters right, crosses near entry, ascends left
    s.path('M385 510L385 462L180 446L180 182L198 118', BLUE, 5, arrow=BLUE)
    s.circle(340, 262, 7, fill=GOLD)
    s.circle(385, 462, 7, fill=BLUE)
    s.ellipse(205, 182, 28, 14, fill=GREY)
    s.text(205, 187, 'VPL', 11, INK, 'middle')
    s.card(430, 100, 260, 160, 'Dorsal columns', ['(medial lemniscus)', 'Vibration, joint position,', 'discriminative touch.', 'Crosses in the medulla.'], color=GOLD, size=14)
    s.card(430, 276, 260, 160, 'Spinothalamic', ['(anterolateral) tract', 'Pain and temperature.', 'Crosses within a few', 'segments of entry.'], color=BLUE, size=14)
    s.rect(430, 452, 260, 78, fill=WHITE, stroke=TEAL)
    s.text(444, 476, ['A one-sided cord lesion', 'splits the modalities; above', 'the medulla both are crossed.'], 14, TEAL)
    s.text(40, 568, 'Dots mark where each pathway crosses the midline.', 13, MUTED)
    return s


def root_signatures():
    s = Svg('Key root signatures', 'Movement, reflex and sensory clues for commonly tested roots.', h=660)
    cols = [(44, 'ROOT'), (110, 'MAIN MOVEMENT'), (366, 'REFLEX'), (516, 'SENSORY AREA')]
    for x, lab in cols:
        s.text(x, 104, lab, 12, MUTED, weight='700')
    rows = [('C5', ['Shoulder abduction,', 'elbow flexion'], ['Biceps'], ['Lateral shoulder', 'and upper arm']),
            ('C6', ['Wrist extension,', 'elbow flexion'], ['Brachioradialis,', 'biceps'], ['Thumb, lateral', 'forearm']),
            ('C7', ['Elbow, wrist and', 'finger extension'], ['Triceps'], ['Middle finger']),
            ('C8', ['Finger flexion; hand', 'muscles (with T1)'], ['None reliable'], ['Little finger,', 'medial hand']),
            ('L4', ['Knee extension;', 'ankle dorsiflexion'], ['Knee (L3–L4)'], ['Medial lower leg']),
            ('L5', ['Great-toe extension,', 'foot dorsiflexion, hip abd.'], ['None reliable'], ['Dorsum of foot,', 'great toe']),
            ('S1', ['Ankle plantar flexion,', 'foot eversion'], ['Ankle (Achilles)'], ['Lateral foot', 'and sole'])]
    for i, (root, mv, rf, sn) in enumerate(rows):
        y = 116 + i * 58
        s.rect(30, y, 660, 52, fill=WHITE if i % 2 == 0 else PALE, rx=8)
        color = TEAL if root.startswith('C') else BLUE
        s.rect(38, y + 9, 50, 34, fill=color, rx=17)
        s.text(63, y + 32, root, 16, WHITE, 'middle', weight='700')
        for x, lines in ((110, mv), (366, rf), (516, sn)):
            yy = y + 31 if len(lines) == 1 else y + 22
            s.text(x, yy, lines, 14, INK)
    s.note(522, 'Overlap is the rule.', ['Territories vary between people. Compare muscles that share a root but',
                                         'use different nerves to separate a root from a nerve lesion.'], h=88)
    return s


def brachial_plexus():
    s = Svg('The brachial plexus in five columns', 'Roots → trunks → divisions → cords → terminal nerves.', h=620)
    heads = [(66, 'ROOTS'), (196, 'TRUNKS'), (310, 'DIVISIONS'), (430, 'CORDS'), (590, 'NERVES')]
    for x, lab in heads:
        s.text(x, 100, lab, 12, MUTED, 'middle', weight='700')
    roots = {'C5': 128, 'C6': 182, 'C7': 236, 'C8': 290, 'T1': 344}
    trunks = {'Upper': 155, 'Middle': 236, 'Lower': 317}
    cords = {'Lateral': 150, 'Posterior': 236, 'Medial': 322}
    nerves = {'Musculocutaneous': 128, 'Axillary': 190, 'Radial': 250, 'Median': 312, 'Ulnar': 372}
    feed = {'C5': 'Upper', 'C6': 'Upper', 'C7': 'Middle', 'C8': 'Lower', 'T1': 'Lower'}
    for r, y in roots.items():
        s.path(f'M86 {y}C130 {y} 140 {trunks[feed[r]]} 180 {trunks[feed[r]]}', INK, 3)
    ant = {'Upper': 'Lateral', 'Middle': 'Lateral', 'Lower': 'Medial'}
    for t, y in trunks.items():
        s.path(f'M212 {y}C300 {y - 8} 330 {cords[ant[t]]} 414 {cords[ant[t]]}', TEAL, 3)
        s.path(f'M212 {y}C300 {y + 8} 330 {cords["Posterior"]} 414 {cords["Posterior"]}', GOLD, 3, dash='7 5')
    branches = [('Lateral', 'Musculocutaneous'), ('Lateral', 'Median'), ('Medial', 'Median'), ('Medial', 'Ulnar'),
                ('Posterior', 'Axillary'), ('Posterior', 'Radial')]
    for c, n in branches:
        color = GOLD if c == 'Posterior' else TEAL
        s.path(f'M446 {cords[c]}C500 {cords[c]} 510 {nerves[n]} 556 {nerves[n]}', color, 3)
    for r, y in roots.items():
        s.rect(46, y - 15, 40, 30, fill=INK, rx=15)
        s.text(66, y + 5, r, 13, WHITE, 'middle', weight='700')
    for t, y in trunks.items():
        s.circle(196, y, 16, fill=WHITE, stroke=INK, sw=2.5)
        s.text(196, y + 34, t, 12, INK, 'middle')
    for c, y in cords.items():
        s.circle(430, y, 16, fill=WHITE, stroke=GOLD if c == 'Posterior' else TEAL, sw=3)
        s.text(430, y + 34, c, 12, INK, 'middle')
    for n, y in nerves.items():
        s.circle(560, y, 6, fill=INK)
        s.text(572, y + 5, n, 14, INK)
    s.path('M260 400L290 400', TEAL, 3)
    s.text(298, 405, 'anterior divisions (flexor side)', 12, MUTED)
    s.path('M260 422L290 422', GOLD, 3, dash='7 5')
    s.text(298, 427, 'posterior divisions (extensor side)', 12, MUTED)
    s.card(30, 448, 322, 116, 'Upper trunk (C5–C6)', ['Shoulder abduction, external', 'rotation and elbow flexion weak;', 'lateral arm sensory change.'], color=TEAL, size=14)
    s.card(368, 448, 322, 116, 'Lower trunk (C8–T1)', ['Hand muscles weak across', 'median and ulnar territories;', 'medial forearm/hand sensory loss.'], color=BLUE, size=14)
    return s


def nmj_compare():
    s = Svg('Two junction disorders, two sides of the cleft', 'Postsynaptic myasthenia compared with presynaptic Lambert–Eaton.', h=640)
    for cx, title, color, site in ((190, 'MYASTHENIA GRAVIS', TEAL, 'post'), (530, 'LAMBERT–EATON', BLUE, 'pre')):
        s.text(cx, 102, title, 14, color, 'middle', weight='700')
        # nerve terminal
        s.path(f'M{cx - 30} 116L{cx - 30} 150Q{cx - 80} 158 {cx - 90} 196L{cx + 90} 196Q{cx + 80} 158 {cx + 30} 150L{cx + 30} 116',
               INK, 2.5, fill=s.radial('#ffffff', '#e8eee5'))
        s.path(f'M{cx - 30} 118L{cx - 30} 146M{cx + 30} 118L{cx + 30} 146', mix(GOLD, WHITE, .35), 5, glow=False)
        s.ellipse(cx - 2, 158, 17, 7, fill=mix(GOLD, WHITE, .55), stroke=GOLD, sw=1.2)
        s.path(f'M{cx - 14} 158C{cx - 10} 152 {cx - 6} 164 {cx - 2} 158C{cx + 2} 152 {cx + 6} 164 {cx + 10} 158', GOLD, 1.1, glow=False)
        for dx, dy in ((-50, 178), (-34, 168), (-18, 180), (14, 178), (30, 168), (46, 180), (-62, 172), (60, 172)):
            s.circle(cx + dx, dy, 6.5, fill=s.radial('#fff6e6', SAND), stroke=GOLD, sw=1.2)
            s.circle(cx + dx + 1.5, dy + 1, 1.3, fill=GOLD)
        for k, dx in enumerate((-80, -56, -36, -14, 6, 24, 44, 66, 84)):
            s.circle(cx + dx, 207 + (k % 3) * 3, 2, fill=GOLD, extra=' opacity=".75"')
        # calcium channels on terminal membrane
        for dx in (-62, 62):
            s.rect(cx + dx - 6, 188, 12, 14, fill=BLUE, rx=3)
        # muscle with folds
        s.path(f'M{cx - 120} 222' + ''.join(f'L{cx - 120 + i * 30 + 10} 222L{cx - 120 + i * 30 + 15} 240L{cx - 120 + i * 30 + 20} 222'
                                          for i in range(8)) + f'L{cx + 120} 222L{cx + 120} 272L{cx - 120} 272Z', INK, 2.5,
               fill=s.radial('#f1d9cc', '#d8ad98'))
        s.add(''.join(f'<path d="M{cx - 116} {y}L{cx + 116} {y}" stroke="#ffffff" stroke-opacity=".35" stroke-width="1"/>' for y in (250, 258, 266)))
        for i in range(8):
            s.rect(cx - 120 + i * 30 + 8, 216, 9, 9, fill=TEAL, rx=2)
        if site == 'post':
            for i in (1, 3, 5):
                x = cx - 120 + i * 30 + 12
                s.path(f'M{x - 7} 204L{x + 7} 218M{x + 7} 204L{x - 7} 218', RED, 3)
            s.text(cx, 296, 'Antibodies reduce ACh receptors', 13, MUTED, 'middle')
        else:
            for dx in (-62, 62):
                x = cx + dx
                s.path(f'M{x - 8} 186L{x + 8} 202M{x + 8} 186L{x - 8} 202', RED, 3)
            s.text(cx, 296, 'Antibodies impair Ca²⁺ channels', 13, MUTED, 'middle')
    s.path('M360 92L360 300', LINE, 1.5)
    rows = [('First weakness', 'Eyelids, eye movements,', 'Proximal legs; eye signs'),
            ('', 'bulbar muscles common', 'usually milder'),
            ('Reflexes', 'Usually normal', 'Reduced; may return after'),
            ('', '', 'brief maximal effort'),
            ('Repeated effort', 'Fatigable weakness', 'Strength may improve briefly'),
            ('Autonomic', 'Not typical', 'Dry mouth, other symptoms'),
            ('Nerve stimulation', 'Decrement at slow rates', 'Increment after exercise')]
    y = 316
    for a, b, c in rows:
        if a:
            y += 10
            s.rect(30, y - 2, 660, 1.5, fill=LINE, rx=0)
            s.text(40, y + 22, a, 13, INK, weight='700')
        s.text(196, y + 22, b, 14, TEAL)
        s.text(440, y + 22, c, 14, BLUE)
        y += 26
    s.text(40, 590, 'Sensation is spared in both. Patterns overlap; confirm with appropriate testing.', 13, GOLD)
    return s


def aphasia_tree():
    s = Svg('Sorting an aphasia at the bedside', 'Fluency, comprehension and repetition classify the classic syndromes.', h=600)
    def node(x, y, label, w=150, color=TEAL):
        s.rect(x - w / 2, y - 20, w, 40, fill=WHITE, stroke=color, rx=20)
        s.text(x, y + 6, label, 15, color, 'middle')
    def edge(x1, y1, x2, y2, label):
        s.path(f'M{x1} {y1 + 20}C{x1} {y1 + 50} {x2} {y2 - 50} {x2} {y2 - 20}', GREY, 2.5)
        s.text((x1 + x2) / 2 + (8 if x2 > x1 else -8), (y1 + y2) / 2 + 4, label, 12, MUTED, 'start' if x2 > x1 else 'end')
    node(360, 112, 'Fluent speech?', 180, INK)
    l2 = [(180, 'no'), (540, 'yes')]
    l3 = [(90, 'yes'), (270, 'no'), (450, 'yes'), (630, 'no')]
    leaves = ['Broca', 'TC motor', 'Global', 'Mixed TC', 'Conduction', 'Anomic', 'Wernicke', 'TC sensory']
    lx = [52, 132, 222, 302, 418, 498, 588, 668]
    for x, lab in l2:
        edge(360, 112, x, 206, lab)
        node(x, 206, 'Comprehends?', 160)
    for i, (x, lab) in enumerate(l3):
        edge(l2[i // 2][0], 206, x, 300, lab)
        node(x, 300, 'Repeats?', 116, BLUE)
    for i, (x, lab) in enumerate(zip(lx, leaves)):
        p = l3[i // 2][0]
        edge(p, 300, x, 400, 'no' if i % 2 == 0 else 'yes')
        hard = i in (0, 2, 4, 6)
        s.rect(x - 38, 382, 76, 40, fill=SAND if hard else WHITE, stroke=GOLD, rx=8)
        s.text(x, 407, lab, 12, INK, 'middle')
    s.text(360, 446, 'Shaded = repetition impaired (perisylvian loop involved) · TC = transcortical', 12, MUTED, 'middle')
    s.note(462, 'Approximate correlates', ['Broca: inferior frontal · Wernicke: posterior superior temporal ·',
                                         'Conduction: links between them. Syndromes overlap; describe first.'], h=88)
    return s


def gaze_circuit():
    s = Svg('The horizontal gaze circuit', 'Looking to the right starts in the right pons and reaches both eyes.', h=600)
    s.path('M360 84L360 462', GREY, 1.5, dash='5 5')
    s.text(348, 200, 'LEFT', 11, MUTED, 'end')
    s.text(372, 200, 'RIGHT', 11, MUTED, 'start')
    # eyes
    for x, lab in ((220, 'Left eye'), (490, 'Right eye')):
        eye_front(s, x, 146, 56, 26, look=22)
        s.text(x - 92, 151, lab, 12, MUTED, 'middle') if x < 360 else s.text(x + 92, 151, lab, 12, MUTED, 'middle')
    s.path('M196 102L246 102', TEAL, 3, arrow=TEAL)
    s.path('M466 102L516 102', TEAL, 3, arrow=TEAL)
    s.text(221, 92, 'gaze right', 11, MUTED, 'middle')
    s.text(491, 92, 'gaze right', 11, MUTED, 'middle')
    s.text(292, 132, 'MR', 13, TEAL, 'start', weight='700')
    s.text(552, 132, 'LR', 13, GOLD, 'start', weight='700')
    # levels
    s.rect(130, 216, 460, 64, fill=PALE, rx=10)
    s.text(140, 236, 'MIDBRAIN', 11, MUTED, weight='700')
    s.rect(130, 298, 460, 150, fill=PALE, rx=10)
    s.text(140, 318, 'PONS', 11, MUTED, weight='700')
    # nuclei
    s.circle(316, 250, 16, fill=TEAL)
    s.text(316, 255, 'III', 12, WHITE, 'middle', weight='700')
    s.circle(430, 350, 16, fill=GOLD)
    s.text(430, 355, 'VI', 12, WHITE, 'middle', weight='700')
    s.rect(440, 398, 90, 34, fill=WHITE, stroke=INK, rx=8)
    s.text(485, 420, 'PPRF', 13, INK, 'middle')
    # connections
    s.path('M470 398L442 366', INK, 3, arrow=INK)
    s.path('M446 350L540 350L540 186', GOLD, 4, arrow=GOLD)
    s.text(550, 270, ['VI', 'nerve'], 12, GOLD)
    s.path('M420 362L316 372L316 274', TEAL, 4, arrow=TEAL)
    s.text(326, 400, 'crosses → left MLF', 12, TEAL)
    s.path('M304 238L268 186', TEAL, 4, arrow=TEAL)
    s.text(232, 214, 'III nerve', 12, TEAL, 'end')
    s.badge(316, 318, '×', r=13, size=16)
    s.text(334, 323, 'MLF lesion', 12, RED)
    s.card(30, 470, 214, 94, 'MLF (INO)', ['Same side cannot', 'adduct; other eye jerks'], color=RED, size=13, hsize=15)
    s.card(253, 470, 214, 94, 'VI nucleus', ['Gaze palsy toward the', 'lesion, both eyes'], color=GOLD, size=13, hsize=15)
    s.card(476, 470, 214, 94, 'VI nerve', ['Abduction fails in the', 'same-side eye only'], color=BLUE, size=13, hsize=15)
    return s


def horner():
    s = Svg('The sympathetic path to the eye', 'Three neurons: hypothalamus → C8–T2 → superior cervical ganglion → eye.', h=600)
    # head and body outline
    prof = ('M150 300C128 250 116 170 142 118C164 76 230 70 256 110C262 120 263 128 262 136L284 166C286 170 282 174 276 174'
            'L270 176C272 182 268 188 268 192C270 198 266 204 262 206C264 214 258 222 246 224L228 230L230 292'
            'C270 300 320 316 340 340L340 520L110 520L110 340C120 320 134 308 150 300Z')
    s.add(f'<path d="{prof}" fill="{s.radial(SKIN_HI, SKIN_LO)}" stroke="{INK}" stroke-width="2.2" stroke-linejoin="round"/>')
    s.path('M176 150L176 400', mix(TEAL, WHITE, .55), 10, glow=False, extra=' stroke-opacity=".45"')
    s.text(170, 470, 'cord', 11, MUTED, 'middle')
    s.ellipse(258, 412, 52, 70, fill=BLUE_PALE, stroke=GREY, sw=1.5)
    s.text(258, 420, 'lung', 12, BLUE, 'middle')
    s.text(258, 436, 'apex', 12, BLUE, 'middle')
    # eye
    eye_front(s, 240, 134, 13, 6, look=5, lid=False)
    # neuron 1: hypothalamus down brainstem/cord to C8-T2
    s.circle(192, 118, 9, fill=TEAL)
    s.path('M192 128L184 210L176 300L172 372', TEAL, 5, arrow=TEAL)
    s.circle(172, 380, 8, fill=GOLD)
    # neuron 2: out over lung apex up to SCG
    s.path('M178 382C214 384 222 342 226 300L228 256', GOLD, 5, arrow=GOLD)
    s.circle(228, 248, 8, fill=BLUE)
    # neuron 3: along carotid to eye
    s.path('M230 240C238 210 246 180 240 144', BLUE, 5, arrow=BLUE)
    labels = [(TEAL, '1st order', ['Hypothalamus → brainstem', '→ cervical cord (C8–T2)'], 96, ['e.g. lateral medulla, cord']),
              (GOLD, '2nd order', ['Cord → over lung apex', '→ superior cervical ganglion'], 236, ['e.g. lung apex, neck']),
              (BLUE, '3rd order', ['Along the internal carotid', '→ pupil dilator, eyelid'], 376, ['e.g. carotid wall, skull base'])]
    for color, head, lines, y, eg in labels:
        s.card(372, y, 318, 124, head, lines + eg, color=color, size=14)
    s.text(40, 556, 'Same side: mild ptosis, smaller pupil; sweating loss depends on the site.', 14, INK)
    return s


def vascular():
    s = Svg('Cortical arterial territories', 'Approximate surface supply of the three cerebral arteries.', h=620)
    views = [(196, 'LATERAL SURFACE', 'lat'), (530, 'MEDIAL SURFACE', 'med')]
    outline = ('M{x0} {y}C{x0} {yt} {x1} {yt2} {xc} {yt2}C{x2} {yt2} {x3} {yt} {x3} {ym}'
               'C{x3} {yb} {x2b} {yb2} {xc2} {yb2}C{x4} {yb2} {x0} {yb3} {x0} {y}Z')
    for cx, title, kind in views:
        cy = 260
        s.text(cx, 104, title, 12, MUTED, 'middle', weight='700')
        d = (f'M{cx - 150} {cy + 4}C{cx - 154} {cy - 62} {cx - 104} {cy - 124} {cx - 14} {cy - 126}'
             f'C{cx + 78} {cy - 128} {cx + 150} {cy - 82} {cx + 154} {cy - 10}C{cx + 158} {cy + 38} {cx + 134} {cy + 70} {cx + 98} {cy + 78}'
             f'C{cx + 70} {cy + 84} {cx + 42} {cy + 78} {cx + 22} {cy + 88}C{cx - 14} {cy + 104} {cx - 66} {cy + 100} {cx - 92} {cy + 74}'
             f'C{cx - 104} {cy + 60} {cx - 112} {cy + 44} {cx - 130} {cy + 42}C{cx - 146} {cy + 38} {cx - 150} {cy + 24} {cx - 150} {cy + 4}Z')
        s.add(f'<path d="M{cx + 28} {cy + 70}C{cx + 34} {cy + 108} {cx + 42} {cy + 130} {cx + 46} {cy + 150}L{cx + 72} {cy + 150}'
              f'C{cx + 66} {cy + 126} {cx + 66} {cy + 100} {cx + 72} {cy + 70}Z" fill="{s.radial("#eef2ea", "#cfdaca")}" stroke="{INK}" stroke-width="2"/>')
        s.ellipse(cx + 104, cy + 92, 50, 27, fill=s.radial('#eef2ea', '#cdd8c7'), stroke=INK, sw=2)
        s.add(''.join(f'<path d="M{cx + 62} {cy + 84 + k * 7}Q{cx + 104} {cy + 76 + k * 9} {cx + 148} {cy + 86 + k * 6}" fill="none" '
                      f'stroke="{GREY}" stroke-width="1.2"/>' for k in range(4)))
        cid = s.clip(f'<path d="{d}"/>')
        s.add(f'<path d="{d}" fill="{WHITE}"/>')
        if kind == 'lat':
            regs = [(TEAL, f'<rect x="{cx - 160}" y="{cy - 140}" width="330" height="260"/>'),
                    (GOLD, f'<path d="M{cx - 160} {cy - 140}L{cx + 90} {cy - 140}L{cx + 90} {cy - 96}C{cx + 20} {cy - 92} {cx - 60} {cy - 94} {cx - 160} {cy - 70}Z"/>'),
                    (BLUE, f'<path d="M{cx + 96} {cy - 140}L{cx + 170} {cy - 140}L{cx + 170} {cy + 120}L{cx - 60} {cy + 120}C{cx - 20} {cy + 66} {cx + 60} {cy + 62} {cx + 100} {cy + 30}C{cx + 112} {cy - 20} {cx + 104} {cy - 90} {cx + 96} {cy - 140}Z"/>')]
        else:
            regs = [(GOLD, f'<rect x="{cx - 160}" y="{cy - 140}" width="330" height="260"/>'),
                    (BLUE, f'<path d="M{cx + 40} {cy - 140}L{cx + 170} {cy - 140}L{cx + 170} {cy + 120}L{cx - 100} {cy + 120}C{cx - 40} {cy + 40} {cx + 20} {cy + 20} {cx + 60} {cy - 30}C{cx + 64} {cy - 80} {cx + 50} {cy - 110} {cx + 40} {cy - 140}Z"/>')]
        for color, shape in regs:
            s.add(f'<g fill="{TINT[color]}" clip-path="url(#{cid})">{shape}</g>')
        if kind == 'med':
            s.path(f'M{cx - 70} {cy + 4}C{cx - 70} {cy - 40} {cx + 50} {cy - 46} {cx + 60} {cy}C{cx + 40} {cy - 22} {cx - 50} {cy - 20} {cx - 70} {cy + 4}Z',
                   INK, 2, fill=PALE)
            s.text(cx - 6, cy + 32, 'corpus callosum', 11, INK, 'middle')
        if kind == 'lat':
            sulci = [f'M{cx - 112} {cy + 40}C{cx - 80} {cy + 20} {cx - 30} {cy + 8} {cx + 30} {cy - 14}',
                     f'M{cx + 18} {cy - 126}C{cx + 6} {cy - 90} {cx + 2} {cy - 56} {cx - 16} {cy + 4}',
                     f'M{cx - 8} {cy - 124}C{cx - 20} {cy - 90} {cx - 24} {cy - 54} {cx - 40} {cy + 10}',
                     f'M{cx + 44} {cy - 120}C{cx + 32} {cy - 84} {cx + 30} {cy - 50} {cx + 12} {cy - 6}',
                     f'M{cx - 86} {cy + 66}C{cx - 40} {cy + 50} {cx + 20} {cy + 40} {cx + 72} {cy + 20}',
                     f'M{cx - 124} {cy - 40}C{cx - 96} {cy - 58} {cx - 70} {cy - 62} {cx - 44} {cy - 58}',
                     f'M{cx - 136} {cy - 2}C{cx - 106} {cy - 16} {cx - 80} {cy - 14} {cx - 52} {cy - 20}',
                     f'M{cx + 60} {cy - 62}C{cx + 84} {cy - 50} {cx + 110} {cy - 56} {cx + 134} {cy - 40}',
                     f'M{cx + 70} {cy - 8}C{cx + 96} {cy - 2} {cx + 120} {cy + 2} {cx + 146} {cy - 6}']
        else:
            sulci = [f'M{cx - 100} {cy + 10}C{cx - 104} {cy - 66} {cx + 40} {cy - 84} {cx + 74} {cy - 18}',
                     f'M{cx + 52} {cy - 122}C{cx + 58} {cy - 90} {cx + 62} {cy - 50} {cx + 70} {cy - 12}',
                     f'M{cx + 70} {cy - 12}C{cx + 100} {cy - 14} {cx + 126} {cy - 8} {cx + 152} {cy - 2}',
                     f'M{cx - 120} {cy - 46}C{cx - 100} {cy - 70} {cx - 80} {cy - 88} {cx - 50} {cy - 100}',
                     f'M{cx - 4} {cy - 120}C{cx - 6} {cy - 108} {cx - 2} {cy - 98} {cx + 8} {cy - 92}']
        s.add(f'<g clip-path="url(#{cid})" fill="none" stroke="{INK}" stroke-opacity=".32" stroke-width="1.8" stroke-linecap="round">'
              + ''.join(f'<path d="{x}"/>' for x in sulci) + '</g>')
        s.add(f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="2.6"/>')
        s.text(cx - 150, cy + 134, 'front', 12, MUTED)
        s.text(cx + 150, cy + 134, 'back', 12, MUTED, 'end')
    keys = [(TEAL, 'Middle cerebral (MCA)', ['Lateral convexity: opposite face and arm', '> leg; language (dominant) or neglect.']),
            (GOLD, 'Anterior cerebral (ACA)', ['Medial frontal/parietal strip: opposite', 'leg > arm weakness and sensory loss.']),
            (BLUE, 'Posterior cerebral (PCA)', ['Occipital and inferior temporal: opposite', 'homonymous hemianopia.'])]
    for i, (color, head, lines) in enumerate(keys):
        y = 420 + i * 54
        s.rect(40, y + 6, 22, 22, fill=TINT[color], stroke=color, sw=1.5, rx=5)
        s.text(74, y + 22, head, 15, INK)
        s.text(300, y + 14, lines, 13, MUTED)
    return s


def body_patterns():
    s = Svg('Distribution patterns that localize', 'Where the deficit falls often narrows the level before any test.', h=660)
    cells = [(125, 190, 'One side, face to leg', 'Cortex, deep brain, brainstem', 'hemi'),
             (360, 190, 'Face one side, body other', 'Brainstem', 'crossed'),
             (595, 190, 'Everything below a level', 'Spinal cord', 'level'),
             (125, 440, 'A strip in one limb', 'Root (or named nerve)', 'root'),
             (360, 440, 'Hands and feet', 'Length-dependent neuropathy', 'stocking'),
             (595, 440, 'Shoulders and hips', 'Muscle or junction (motor)', 'proximal')]
    shades = {
        'hemi': '<rect x="100" y="60" width="120" height="560"/>',
        'crossed': '<rect x="100" y="60" width="120" height="86"/><rect x="220" y="150" width="140" height="470"/>',
        'level': '<rect x="172" y="240" width="96" height="380"/>',
        'root': '<rect x="287" y="166" width="20" height="252"/>',
        'stocking': '<rect x="120" y="364" width="62" height="70"/><rect x="258" y="364" width="62" height="70"/><rect x="170" y="476" width="100" height="130"/>',
        'proximal': '<rect x="130" y="150" width="180" height="72"/><rect x="172" y="286" width="96" height="104"/>',
    }
    k = 0.37
    for cx, cy, title, where, kind in cells:
        top = cy - 90
        tr = f'translate({cx - 220 * k:.1f} {top - 86 * k:.1f}) scale({k})'
        s.ellipse(cx, cy + 106, 40, 6, fill=INK, extra=' opacity=".08"')
        body_figure(s, tr, k, shades[kind])
        if kind == 'level':
            y = top + (240 - 86) * k
            s.path(f'M{cx - 56} {y:.1f}L{cx + 56} {y:.1f}', RED, 2, dash='5 4')
        s.text(cx, cy + 128, title, 15, INK, 'middle')
        s.text(cx, cy + 148, where, 13, TEAL, 'middle', weight='700')
    s.text(40, 614, 'Figures face you. Shading shows where findings cluster, not exact borders.', 13, GOLD)
    return s


# ---------------------------------------------------------------- 1.3 diagrams

def flow_box(s, cx, y, w, h, heading, lines, color):
    s.rect(cx - w / 2, y, w, h, fill=WHITE, stroke=color)
    s.text(cx - w / 2 + 14, y + 24, heading, 16, color)
    s.text(cx - w / 2 + 14, y + 46, lines, 13)


def weakness_flow():
    s = Svg('A first pass through weakness', 'Two questions split the neuraxis before you name a region.', h=640)
    s.rect(280, 86, 160, 34, fill=INK, rx=17)
    s.text(360, 108, 'Weakness', 15, WHITE, 'middle', weight='700')
    s.path('M360 120L360 140', INK, 3, arrow=INK)
    s.rect(200, 144, 320, 40, fill=WHITE, stroke=INK, rx=20)
    s.text(360, 170, 'Upper motor neuron signs?', 16, INK, 'middle')
    s.path('M260 184C240 204 200 206 190 222', TEAL, 3, arrow=TEAL)
    s.path('M460 184C480 204 520 206 530 222', GOLD, 3, arrow=GOLD)
    s.text(206, 204, 'yes', 13, TEAL, 'end')
    s.text(514, 204, 'no', 13, GOLD)
    for cx, q, color in ((190, 'Face weak as well?', TEAL), (530, 'Sensory loss too?', GOLD)):
        s.rect(cx - 125, 226, 250, 38, fill=WHITE, stroke=color, rx=19)
        s.text(cx, 251, q, 15, color, 'middle')
    # left results
    s.path('M190 264L190 290', TEAL, 3, arrow=TEAL)
    s.text(198, 282, 'yes', 12, TEAL)
    flow_box(s, 190, 294, 288, 82, 'Brain or brainstem', ['Cortical signs → cortex', 'Crossed cranial signs → brainstem'], TEAL)
    s.path('M65 245L36 245L36 438L44 438', TEAL, 3, arrow=TEAL)
    s.text(42, 236, 'no', 12, TEAL)
    flow_box(s, 190, 398, 288, 82, 'Spinal cord most likely', ['Seek a sensory level; leg-only', 'weakness can be parasagittal'], TEAL)
    # right results
    s.path('M530 264L530 290', GOLD, 3, arrow=GOLD)
    s.text(538, 282, 'yes', 12, GOLD)
    flow_box(s, 530, 294, 288, 82, 'Root, plexus or nerve', ['Strip → root · one nerve → mono-', 'neuropathy · distal → polyneuropathy'], GOLD)
    s.path('M655 245L684 245L684 438L676 438', GOLD, 3, arrow=GOLD)
    s.text(678, 236, 'no', 12, GOLD, 'end')
    flow_box(s, 530, 398, 288, 82, 'Junction, muscle or motor neuron', ['Fatigable → junction · proximal →', 'muscle · fasciculation → motor neuron'], GOLD)
    s.note(500, 'Both kinds of sign together?', ['LMN signs at a level with UMN signs below suggest the cord;',
                                                 'widespread mixed signs raise motor neuron disease.'], h=90)
    return s


def time_course():
    s = Svg('The time course hints at mechanism', 'How a deficit evolves suggests a process; location still comes first.', h=600)
    panels = [(30, 92, 'Sudden', 'seconds to minutes', ['Vascular events, seizures,', 'trauma'], 'sudden', RED),
              (368, 92, 'Acute to subacute', 'hours to weeks', ['Inflammatory, infectious,', 'toxic-metabolic, demyelinating'], 'subacute', GOLD),
              (30, 316, 'Chronic progressive', 'months to years', ['Degenerative, neoplastic,', 'genetic'], 'chronic', BLUE),
              (368, 316, 'Episodic or relapsing', 'attacks with recovery', ['Migraine, seizures, transient', 'ischemia, relapsing inflammation'], 'episodic', TEAL)]
    for x, y, title, span, lines, kind, color in panels:
        s.rect(x, y, 322, 210, fill=WHITE, stroke=LINE)
        s.text(x + 16, y + 28, title, 17, color)
        s.text(x + 16, y + 48, span, 12, MUTED)
        gx, gy, gw, gh = x + 16, y + 62, 290, 78
        s.path(f'M{gx} {gy}L{gx} {gy + gh}L{gx + gw} {gy + gh}', GREY, 1.5)
        b = gy + gh
        d = {'sudden': f'M{gx} {b - 2}L{gx + 60} {b - 2}L{gx + 66} {gy + 8}L{gx + gw} {gy + 12}',
             'subacute': f'M{gx} {b - 2}L{gx + 40} {b - 2}C{gx + 110} {b - 4} {gx + 140} {gy + 10} {gx + 200} {gy + 10}L{gx + gw} {gy + 14}',
             'chronic': f'M{gx} {b - 2}C{gx + 120} {b - 8} {gx + 220} {gy + 40} {gx + gw} {gy + 8}',
             'episodic': f'M{gx} {b - 2}L{gx + 30} {b - 2}L{gx + 40} {gy + 14}L{gx + 70} {b - 4}L{gx + 120} {b - 2}L{gx + 130} {gy + 6}L{gx + 165} {b - 8}L{gx + 210} {b - 6}L{gx + 220} {gy + 10}L{gx + 260} {b - 14}L{gx + gw} {b - 12}'}[kind]
        s.path(d, color, 3.5)
        s.text(gx + gw, b + 14, 'time →', 11, MUTED, 'end')
        s.text(x + 16, y + 176, lines, 14, INK)
    s.text(40, 556, 'Typical tendencies only: many conditions break these rules.', 14, GOLD)
    return s


def reflex_arc():
    s = Svg('The stretch reflex arc', 'Where a lesion sits decides whether reflexes fall or rise.', h=620)
    k = 90 / 150
    cx, cy = 480, 210
    cord_section(s, cx, cy, 90, 76, roots=False)
    s.text(cx - 20, 124, 'spinal cord (dorsal up)', 11, MUTED, 'end')
    s.ellipse(372, 168, 16, 11, fill=SAND, stroke=GOLD, sw=2)
    s.text(372, 146, 'dorsal root ganglion', 11, GOLD, 'middle')
    mus = 'M48 297C78 258 202 258 232 297C202 336 78 336 48 297Z'
    s.path('M22 297L52 297M228 297L256 297', mix(GOLD, WHITE, .2), 7, glow=False)
    s.add(f'<path d="{mus}" fill="{s.radial("#efc9b6", "#c98f78")}" stroke="{mix(RED, INK, .3)}" stroke-width="2"/>')
    mcid = s.clip(f'<path d="{mus}"/>')
    s.add(f'<g clip-path="url(#{mcid})" fill="none" stroke="#ffffff" stroke-opacity=".4" stroke-width="1.2">'
          + ''.join(f'<path d="M{x} 250Q{x + 6} 297 {x} 344"/>' for x in range(60, 232, 9)) + '</g>')
    s.ellipse(140, 297, 36, 10, fill='#fff7ee', stroke=GOLD, sw=2)
    s.path('M110 297C116 289 122 305 128 297C134 289 140 305 146 297C152 289 158 305 164 297C168 292 170 297 172 297', GOLD, 1.6, glow=False)
    s.text(140, 350, 'muscle with spindle', 12, INK, 'middle')
    s.path('M166 292C230 220 300 172 356 168', GOLD, 4)
    s.path('M388 168C440 166 458 196 460 230', GOLD, 4, arrow=GOLD)
    s.circle(462, 238, 8, fill=TEAL)
    s.path('M454 244C400 290 310 300 236 300', TEAL, 4, arrow=TEAL)
    s.path('M500 92L500 140L470 228', BLUE, 3, dash='7 5', arrow=BLUE)
    s.text(580, 150, ['descending', '(upper motor', 'neuron) control'], 12, BLUE)
    s.text(250, 200, 'sensory fiber', 12, GOLD)
    s.text(300, 318, 'motor fiber', 12, TEAL)
    for n, x, y in ((1, 290, 178), (2, 462, 262), (3, 270, 298), (4, 494, 150)):
        s.badge(x, y, n, r=11, size=12)
    rows = [(1, 'Sensory fiber or ganglion', 'reflex reduced or lost'), (2, 'Anterior horn or motor root', 'reduced, with wasting'),
            (3, 'Peripheral nerve', 'reduced in its territory'), (4, 'Descending pathway', 'brisk, may spread')]
    for i, (n, a, b) in enumerate(rows):
        y = 378 + i * 34
        s.badge(46, y, n, r=11, size=12)
        s.text(66, y + 5, a, 15, INK)
        s.text(330, y + 5, b, 14, BLUE if n == 4 else GOLD)
    pills = ['Biceps C5–C6', 'Brachioradialis C6', 'Triceps C7', 'Knee L3–L4', 'Ankle S1']
    x = 30
    for p in pills:
        w = 14 + len(p) * 7.6
        s.rect(x, 528, w, 30, fill=WHITE, stroke=TEAL, rx=15)
        s.text(x + w / 2, 548, p, 13, TEAL, 'middle')
        x += w + 8
    return s


def eye_muscles():
    s = Svg('Six eye muscles, three nerves', "The right eye as you face the patient: abduction points to your left.", h=620)
    cx, cy = 210, 300
    eye_front(s, cx, cy, 74, 44)
    arrows = [('LR', 'VI', -1, 0, BLUE), ('MR', 'III', 1, 0, TEAL), ('SR', 'III', -1, -1, TEAL),
              ('IR', 'III', -1, 1, TEAL), ('IO', 'III', 1, -1, TEAL), ('SO', 'IV', 1, 1, GOLD)]
    for m, n, dx, dy, color in arrows:
        x1, y1 = cx + dx * 80, cy + dy * 80
        x2, y2 = cx + dx * 116, cy + dy * (130 if dy else 0)
        if dy:
            s.path(f'M{x1} {cy}L{x2} {cy}L{x2} {y2}', color, 4, arrow=color)
            tx, ty = x2 + (14 if dx > 0 else -14), y2 + (6 if dy > 0 else 4)
        else:
            s.path(f'M{x1} {cy}L{x2} {cy}', color, 4, arrow=color)
            tx, ty = x2 + (10 if dx > 0 else -10), cy + 22
        s.text(tx, ty, f'{m} ({n})', 15, color, 'start' if dx > 0 else 'end', weight='700')
    s.text(cx - 116, cy + 160, 'abduction', 12, MUTED, 'middle')
    s.text(cx + 116, cy + 160, 'adduction', 12, MUTED, 'middle')
    s.text(cx, 128, 'LR6 · SO4 · the rest III', 15, INK, 'middle')
    cards = [(TEAL, 'Third nerve (III)', ['Eye down and out, ptosis;', 'pupil may be large']),
             (GOLD, 'Fourth nerve (IV)', ['Vertical diplopia worse looking', 'down and away; head tilts away']),
             (BLUE, 'Sixth nerve (VI)', ['Horizontal diplopia worse', 'looking toward the weak side'])]
    for i, (color, head, lines) in enumerate(cards):
        s.card(426, 96 + i * 132, 264, 116, head, lines, color=color, size=14)
    s.note(500, 'Test each vertical muscle where it works best.', ['Elevation and depression in abduction test SR and IR;',
                                                               'in adduction they test IO and SO.'], h=86)
    return s


def pupil_reflex():
    s = Svg('The pupillary light reflex', 'Light in one eye constricts both pupils through a bilateral relay.', h=640)
    s.rect(130, 282, 460, 112, fill=s.radial('#eef3ea', '#dce6d7'), rx=40)
    s.text(574, 302, 'MIDBRAIN', 11, MUTED, 'end', weight='700')
    for x, lab in ((230, 'Left eye'), (490, 'Right eye')):
        eyeball_top(s, x, 130, 32)
        s.text(x + 44, 134, lab, 12, MUTED, 'start' if x > 360 else 'start')
    s.path('M230 162L360 216', GOLD, 4)
    s.path('M490 162L360 216', GOLD, 4)
    s.path('M360 216L300 262L330 312', GOLD, 4, arrow=GOLD)
    s.path('M360 216L420 262L390 312', GOLD, 4, arrow=GOLD)
    s.text(400, 222, 'chiasm', 11, MUTED)
    for x in (330, 390):
        s.circle(x, 320, 10, fill=s.radial(mix(GREY, WHITE, .3), mix(GREY, INK, .25)), stroke=INK, sw=1)
    s.text(316, 324, 'pretectal nuclei', 11, INK, 'end')
    for a, b in ((330, 336), (330, 384), (390, 336), (390, 384)):
        s.path(f'M{a} 330L{b} 368', GOLD, 2)
    for x in (336, 384):
        s.circle(x, 374, 9, fill=TEAL)
    s.text(360, 412, 'Edinger–Westphal nuclei', 11, TEAL, 'middle')
    s.path('M328 378C250 400 168 330 172 200', TEAL, 4)
    s.path('M392 378C470 400 552 330 548 200', TEAL, 4)
    for x in (172, 548):
        s.circle(x, 196, 7, fill=TEAL)
    s.path('M174 188L210 150', TEAL, 3, arrow=TEAL)
    s.path('M546 188L510 150', TEAL, 3, arrow=TEAL)
    s.text(150, 218, ['ciliary', 'ganglion'], 11, TEAL, 'end')
    s.text(570, 218, ['ciliary', 'ganglion'], 11, TEAL)
    s.text(108, 300, ['III nerve', '(parasym-', 'pathetic)'], 11, TEAL, 'middle')
    s.path('M40 440L70 440', GOLD, 4)
    s.text(78, 445, 'afferent: optic nerve and tract', 13, MUTED)
    s.path('M340 440L370 440', TEAL, 4)
    s.text(378, 445, 'efferent: III nerve to the pupil', 13, MUTED)
    s.card(30, 466, 322, 120, 'Afferent defect', ['e.g. optic nerve: pupils equal at', 'rest; swinging light makes the', 'affected side seem to dilate'], color=GOLD, size=14)
    s.card(368, 466, 322, 120, 'Efferent defect', ['e.g. third nerve: affected pupil', 'larger and sluggish whichever', 'eye is lit'], color=TEAL, size=14)
    return s


def cavernous_sinus():
    s = Svg('Inside the cavernous sinus', 'A coronal schematic: several cranial nerves share one small space.', h=600)
    s.rect(290, 300, 140, 74, fill=BLUE_PALE, stroke=GREY, rx=10)
    s.text(360, 342, 'sphenoid sinus', 12, BLUE, 'middle')
    s.ellipse(360, 248, 52, 36, fill=SAND, stroke=GOLD, sw=2)
    s.text(360, 253, 'pituitary', 12, INK, 'middle')
    for side in (-1, 1):
        cx = 360 + side * 130
        s.path(f'M{cx - 70} 180C{cx - 70} 150 {cx + 70} 150 {cx + 70} 180L{cx + 70} 296C{cx + 70} 330 {cx - 70} 330 {cx - 70} 296Z',
               GREY, 2, fill=PALE)
        ica = cx - side * 22
        s.circle(ica, 230, 24, fill=RED_PALE, stroke=RED, sw=2.5)
        s.circle(ica + side * 40, 262, 9, fill=BLUE)
        wall = cx + side * 58
        for i, (lab, color) in enumerate((('III', TEAL), ('IV', GOLD), ('V1', INK), ('V2', INK))):
            s.circle(wall, 186 + i * 32, 10, fill=color)
            if side < 0:
                s.path(f'M{wall - 12} {186 + i * 32}L{110} {186 + i * 32}', LINE, 1.5)
                s.text(100, 191 + i * 32, lab, 14, color, 'end', weight='700')
        if side < 0:
            s.text(ica, 235, 'ICA', 11, RED, 'middle', weight='700')
            s.path(f'M{ica - 40} 268L110 330', LINE, 1.5)
            s.text(100, 335, 'VI', 14, BLUE, 'end', weight='700')
    s.text(40, 404, 'lateral wall: III, IV, V1, V2 · free in the sinus: VI beside the carotid (ICA)', 13, MUTED)
    s.card(30, 420, 322, 130, 'A combination localizes', ['Several of III, IV, V1, V2 and', 'VI on one side, sometimes with', 'Horner, suggests the sinus or', 'nearby orbital apex.'], color=TEAL, size=14)
    s.card(368, 420, 322, 130, 'VI can be first', ['The abducens nerve lies beside', 'the carotid, so an isolated VI', 'palsy can be an early sign.'], color=BLUE, size=14)
    return s


def hand_shapes(x0, y0, thumb_left):
    """Return dicts of SVG shape strings for a schematic hand (fingers listed thumb-side first)."""
    order = [('index', 110), ('middle', 122), ('ring', 112), ('little', 92)]
    xs = [x0 + 4, x0 + 36, x0 + 68, x0 + 100] if thumb_left else [x0 + 100, x0 + 68, x0 + 36, x0 + 4]
    fingers = {name: (x, y0 - h, 28, h + 14) for (name, h), x in zip(order, xs)}
    if thumb_left:
        thumb = f'<rect x="{x0 - 30}" y="{y0 + 30}" width="30" height="88" rx="14" transform="rotate(-28 {x0 - 15} {y0 + 112})"/>'
    else:
        thumb = f'<rect x="{x0 + 132}" y="{y0 + 30}" width="30" height="88" rx="14" transform="rotate(28 {x0 + 147} {y0 + 112})"/>'
    return fingers, thumb, (x0, y0, 132, 150)


def hand_nerves():
    s = Svg('Sensory nerves of the hand', 'Right hand. Median (teal), ulnar (gold) and radial (blue) territories.', h=640)
    TM, GL, BL = TINT[TEAL], TINT[GOLD], TINT[BLUE]
    for view, x0, thumb_left in (('PALM', 110, True), ('BACK OF HAND', 470, False)):
        y0 = 250
        fingers, thumb, (px, py, pw, ph) = hand_shapes(x0, y0, thumb_left)
        s.text(x0 + 66, 106, view, 13, MUTED, 'middle', weight='700')
        def frect(r, fill, extra=''):
            x, y, w, h = r
            s.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="13" fill="{fill}"{extra}/>')
        ring = fingers['ring']
        mid_x = ring[0] + 14
        # palm halves
        cid = s.clip(f'<rect x="{px}" y="{py}" width="{pw}" height="{ph}" rx="22"/>')
        radial_side = (px, mid_x) if thumb_left else (mid_x, px + pw)
        ulnar_side = (mid_x, px + pw) if thumb_left else (px, mid_x)
        rad_fill = TM if view == 'PALM' else BL
        s.add(f'<g clip-path="url(#{cid})"><rect x="{radial_side[0]}" y="{py}" width="{radial_side[1] - radial_side[0]}" height="{ph}" fill="{rad_fill}"/>'
              f'<rect x="{ulnar_side[0]}" y="{py}" width="{ulnar_side[1] - ulnar_side[0]}" height="{ph}" fill="{GL}"/></g>')
        # thumb
        s.add(thumb.replace('<rect', f'<rect fill="{rad_fill}"'))
        for name, r in fingers.items():
            if name == 'little':
                frect(r, GL)
            elif name == 'ring':
                rc = s.clip(f'<rect x="{r[0]}" y="{r[1]}" width="{r[2]}" height="{r[3]}" rx="13"/>')
                rx0 = r[0] if thumb_left else r[0] + 14
                ux0 = r[0] + 14 if thumb_left else r[0]
                if view == 'PALM':
                    s.add(f'<g clip-path="url(#{rc})"><rect x="{rx0}" y="{r[1]}" width="14" height="{r[3]}" fill="{TM}"/><rect x="{ux0}" y="{r[1]}" width="14" height="{r[3]}" fill="{GL}"/></g>')
                else:
                    s.add(f'<g clip-path="url(#{rc})"><rect x="{rx0}" y="{r[1]}" width="14" height="{r[3]}" fill="{BL}"/><rect x="{rx0}" y="{r[1]}" width="14" height="38" fill="{TM}"/><rect x="{ux0}" y="{r[1]}" width="14" height="{r[3]}" fill="{GL}"/></g>')
            else:
                if view == 'PALM':
                    frect(r, TM)
                else:
                    frect(r, BL)
                    rc = s.clip(f'<rect x="{r[0]}" y="{r[1]}" width="{r[2]}" height="{r[3]}" rx="13"/>')
                    s.add(f'<rect x="{r[0]}" y="{r[1]}" width="{r[2]}" height="38" fill="{TM}" clip-path="url(#{rc})"/>')
        # outlines
        outline = ''.join(f'<rect x="{r[0]}" y="{r[1]}" width="{r[2]}" height="{r[3]}" rx="13"/>' for r in fingers.values())
        outline += f'<rect x="{px}" y="{py}" width="{pw}" height="{ph}" rx="22"/>' + thumb
        s.add(f'<g fill="none" stroke="{INK}" stroke-width="2">{outline}</g>')
        det = []
        for name, (x, y, w, h) in fingers.items():
            if view == 'PALM':
                for t in (.34, .64):
                    det.append(f'<path d="M{x + 6} {y + h * t:.1f}Q{x + w / 2} {y + h * t + 3:.1f} {x + w - 6} {y + h * t:.1f}"/>')
            else:
                det.append(f'<rect x="{x + 6}" y="{y + 6}" width="{w - 12}" height="17" rx="6" fill="#ffffff" fill-opacity=".55"/>')
                det.append(f'<path d="M{x + 8} {y + h * .6:.1f}Q{x + w / 2} {y + h * .6 - 4:.1f} {x + w - 8} {y + h * .6:.1f}"/>')
        if view == 'PALM':
            det.append(f'<path d="M{px + 14} {py + 46}Q{px + 70} {py + 30} {px + 122} {py + 42}"/>')
            det.append(f'<path d="M{px + 10} {py + 70}Q{px + 60} {py + 56} {px + 100} {py + 76}"/>')
            det.append(f'<path d="M{px + 30} {py + 40}Q{px + 22} {py + 100} {px + 46} {py + 142}"/>')
        s.add(f'<g fill="none" stroke="{INK}" stroke-opacity=".4" stroke-width="1.3" stroke-linecap="round">{"".join(det)}</g>')
        s.text(x0 + 66, 432, 'thumb ' + ('←' if thumb_left else '→'), 12, MUTED, 'middle')
    for i, (color, head, line) in enumerate(((TEAL, 'Median', 'palm side of thumb to radial ring finger; dorsal fingertips'),
                                             (GOLD, 'Ulnar', 'little finger and ulnar half of ring finger, both sides'),
                                             (BLUE, 'Radial', 'back of the radial hand, especially the first web space'))):
        y = 462 + i * 34
        s.rect(40, y, 22, 22, fill=TINT[color], stroke=color, sw=1.5, rx=5)
        s.text(74, y + 16, head, 15, INK)
        s.text(150, y + 16, line, 13, MUTED)
    s.text(40, 586, 'A split ring finger points to a nerve, not a C8 root. Borders vary.', 13, GOLD)
    return s


def dermatome_landmarks():
    s = Svg('Dermatome landmarks', 'Standard sensory key points, front view. Labels on the right side of the body.', h=680)
    body_figure(s)
    s.text(220, 640, "patient's right ← → left", 11, MUTED, 'middle')
    pts = [('C5', 151, 266, 'Lateral side of the elbow crease'), ('C6', 134, 394, 'Thumb'),
           ('C7', 150, 412, 'Middle finger'), ('C8', 159, 402, 'Little finger'),
           ('T1', 163, 268, 'Medial side of the elbow crease'), ('T4', 204, 192, 'Nipple line'),
           ('T10', 226, 262, 'Umbilicus'), ('L1', 206, 314, 'Groin (inguinal region)'),
           ('L2', 200, 362, 'Front of the mid-thigh'), ('L3', 210, 428, 'Medial knee'),
           ('L4', 207, 548, 'Medial ankle (malleolus)'), ('L5', 194, 572, 'Top of the foot'),
           ('S1', 180, 580, 'Outer heel')]
    labx = {'C5': 110, 'C6': 110, 'C7': 110, 'C8': 110, 'T1': 110, 'T4': 120, 'T10': 120, 'L1': 120, 'L2': 120,
            'L3': 120, 'L4': 120, 'L5': 120, 'S1': 120}
    laby = {'C5': 250, 'C6': 398, 'C7': 426, 'C8': 454, 'T1': 284, 'T4': 186, 'T10': 222, 'L1': 318, 'L2': 362,
            'L3': 476, 'L4': 520, 'L5': 594, 'S1': 620}
    for root, x, y, _ in pts:
        color = TEAL if root.startswith('C') else (BLUE if root.startswith('T') else GOLD)
        lx, ly = labx[root], laby[root]
        s.path(f'M{x} {y}L{lx + 6} {ly - 4}', LINE, 1.2)
        s.circle(x, y, 5.5, fill=color, stroke=WHITE, sw=1.5)
        s.text(lx, ly, root, 12, color, 'end', weight='700')
    for i, (root, _, _, where) in enumerate(pts):
        y = 98 + i * 38
        color = TEAL if root.startswith('C') else (BLUE if root.startswith('T') else GOLD)
        s.rect(372, y, 318, 32, fill=WHITE if i % 2 == 0 else PALE, rx=8)
        s.rect(380, y + 5, 46, 22, fill=color, rx=11)
        s.text(403, y + 21, root, 12, WHITE, 'middle', weight='700')
        s.text(440, y + 21, where, 14, INK)
    s.text(372, 612, 'Neighboring dermatomes overlap a lot.', 13, GOLD)
    return s


def lumbosacral():
    s = Svg('Nerves of the leg', 'Lumbosacral roots, their main nerves, and the foot-drop question.', h=660)
    for x, lab in ((70, 'ROOTS'), (230, 'MAIN NERVES'), (440, 'SCIATIC BRANCHES')):
        s.text(x, 98, lab, 12, MUTED, 'middle' if x == 70 else 'start', weight='700')
    roots = {'L2': 124, 'L3': 160, 'L4': 196, 'L5': 232, 'S1': 268, 'S2': 304, 'S3': 340}
    nerves = {'Femoral': (124, TEAL, ['L2', 'L3', 'L4'], 'knee extension, knee reflex'),
              'Obturator': (190, BLUE, ['L2', 'L3', 'L4'], 'hip adduction, medial thigh'),
              'Superior gluteal': (256, GOLD, ['L4', 'L5', 'S1'], 'hip abduction'),
              'Sciatic': (322, INK, ['L4', 'L5', 'S1', 'S2', 'S3'], '')}
    for name, (y, color, rs, _) in nerves.items():
        for r in rs:
            s.path(f'M90 {roots[r]}C150 {roots[r]} 160 {y} 214 {y}', color, 2.5, extra=' opacity=".8"')
    for r, y in roots.items():
        s.rect(50, y - 14, 40, 28, fill=INK, rx=14)
        s.text(70, y + 5, r, 13, WHITE, 'middle', weight='700')
    for name, (y, color, rs, fn) in nerves.items():
        s.circle(222, y, 9, fill=color)
        s.text(238, y + 5, name, 15, INK)
        if fn:
            s.text(238, y + 23, fn, 12, MUTED)
    branches = {'Tibial': (300, 'plantar flexion, inversion, sole'), 'Common fibular': (376, 'dorsiflexion, eversion, dorsum')}
    for name, (y, fn) in branches.items():
        s.path(f'M300 322C360 322 380 {y} 432 {y}', INK, 2.5)
        s.circle(440, y, 8, fill=INK)
        s.text(456, y + 5, name, 15, INK)
        s.text(456, y + 23, fn, 12, MUTED)
    s.text(238, 346, 'L4–S3', 12, MUTED)
    # foot drop table
    y0 = 420
    s.rect(30, y0, 660, 182, fill=WHITE, stroke=GOLD)
    s.text(46, y0 + 28, 'Foot drop: L5 root or common fibular nerve?', 17, GOLD)
    s.text(380, y0 + 56, 'L5 ROOT', 12, TEAL, weight='700')
    s.text(530, y0 + 56, 'FIBULAR NERVE', 12, BLUE, weight='700')
    rows = [('Ankle dorsiflexion', 'Weak', 'Weak'), ('Foot inversion (tibial nerve)', 'Often weak', 'Spared'),
            ('Hip abduction (superior gluteal)', 'Often weak', 'Spared'), ('Back or radiating leg pain', 'Common', 'Uncommon')]
    for i, (a, b, c) in enumerate(rows):
        y = y0 + 84 + i * 26
        s.text(46, y, a, 14, INK)
        s.text(380, y, b, 14, TEAL)
        s.text(530, y, c, 14, BLUE)
    return s


def conus_cauda():
    s = Svg('Conus medullaris or cauda equina?', 'The cord ends near L1–L2; below it only roots descend.', h=620)
    for i, lab in enumerate(['T11', 'T12', 'L1', 'L2', 'L3', 'L4', 'L5', 'S']):
        y = 96 + i * 52
        s.rect(40, y, 56, 42, fill=WHITE, stroke=GREY, rx=8)
        s.text(68, y + 26, lab, 12, MUTED, 'middle')
    s.path('M128 90L128 210C128 228 136 236 140 246C144 236 152 228 152 210L152 90Z', INK, 2, fill=TEAL_PALE)
    for dx in (-10, -4, 2, 8, 14):
        s.path(f'M{140 + dx * .3} 244C{140 + dx} 300 {140 + dx * 1.6} 380 {140 + dx * 2} 500', GOLD, 2)
    s.text(162, 240, 'conus', 12, TEAL)
    s.text(162, 360, ['cauda', 'equina'], 12, GOLD)
    x0, xa, xb = 236, 386, 546
    s.text(xa, 100, 'CONUS', 12, TEAL, weight='700')
    s.text(xb, 100, 'CAUDA EQUINA', 12, GOLD, weight='700')
    rows = [('Onset', ['Often sudden,', 'bilateral'], ['Often gradual,', 'asymmetric']),
            ('Pain', ['Less prominent'], ['Radicular pain', 'prominent']),
            ('Saddle numbness', ['Early, symmetric'], ['Asymmetric']),
            ('Bladder, bowel', ['Early'], ['Often later']),
            ('Reflexes', ['Ankle lost; knee', 'often kept'], ['Knee and ankle', 'may be reduced']),
            ('Motor signs', ['May mix UMN', 'and LMN'], ['LMN only'])]
    for i, (a, b, c) in enumerate(rows):
        y = 112 + i * 62
        s.rect(226, y, 464, 56, fill=WHITE if i % 2 == 0 else PALE, rx=8)
        s.text(x0, y + 32, a, 14, INK, weight='700')
        for x, lines, color in ((xa, b, TEAL), (xb, c, GOLD)):
            s.text(x, y + (33 if len(lines) == 1 else 23), lines, 14, color)
    s.text(40, 556, ['New saddle numbness or sphincter change needs urgent assessment;', 'real lesions often overlap both patterns.'], 13, GOLD)
    return s


# ---------------------------------------------------------------- 1.5 redraws of the original figures

PURPLE = '#7a64a3'


def callout(s, x, y, tx, ty, text, color=TEXT, anchor='start', size=13, weight=None):
    """Leader line from an anatomical point (dot) to a label."""
    s.circle(x, y, 2.6, fill=INK)
    s.add(f'<path d="M{x} {y}L{tx} {ty}" stroke="{INK}" stroke-width=".9" fill="none"/>')
    dx = 5 if anchor == 'start' else -5
    s.text(tx + dx, ty + 4, text, size, color, anchor, weight=weight)


def brain_lateral(cx, cy, k=1.0):
    """Lateral hemisphere outline (anterior to the left) and principal sulci, scaled by k."""
    def P(x, y):
        return f'{cx + x * k:.1f} {cy + y * k:.1f}'
    d = (f'M{P(-150, 4)}C{P(-154, -62)} {P(-104, -124)} {P(-14, -126)}C{P(78, -128)} {P(150, -82)} {P(154, -10)}'
         f'C{P(158, 38)} {P(134, 70)} {P(98, 78)}C{P(70, 84)} {P(42, 78)} {P(22, 88)}C{P(-14, 104)} {P(-66, 100)} {P(-92, 74)}'
         f'C{P(-104, 60)} {P(-112, 44)} {P(-130, 42)}C{P(-146, 38)} {P(-150, 24)} {P(-150, 4)}Z')
    sulci = {'sylvian': f'M{P(-112, 40)}C{P(-80, 20)} {P(-30, 8)} {P(30, -14)}',
             'central': f'M{P(18, -126)}C{P(6, -90)} {P(2, -56)} {P(-16, 4)}',
             'precentral': f'M{P(-8, -124)}C{P(-20, -90)} {P(-24, -54)} {P(-40, 10)}',
             'postcentral': f'M{P(44, -120)}C{P(32, -84)} {P(30, -50)} {P(12, -6)}',
             'sts': f'M{P(-86, 66)}C{P(-40, 50)} {P(20, 40)} {P(72, 20)}',
             'sfs': f'M{P(-124, -40)}C{P(-96, -58)} {P(-70, -62)} {P(-44, -58)}',
             'ifs': f'M{P(-136, -2)}C{P(-106, -16)} {P(-80, -14)} {P(-52, -20)}',
             'ips': f'M{P(60, -62)}C{P(84, -50)} {P(110, -56)} {P(134, -40)}',
             'occ': f'M{P(70, -8)}C{P(96, -2)} {P(120, 2)} {P(146, -6)}'}
    stem = (f'M{P(28, 70)}C{P(34, 108)} {P(42, 130)} {P(46, 150)}L{P(72, 150)}C{P(66, 126)} {P(66, 100)} {P(72, 70)}Z')
    return d, sulci, stem


def draw_brain_lateral(s, cx, cy, k=1.0, regions=None, stem=True):
    d, sulci, st = brain_lateral(cx, cy, k)
    if stem:
        s.add(f'<path d="{st}" fill="{s.radial("#eef2ea", "#cfdaca")}" stroke="{INK}" stroke-width="{1.6}"/>')
        s.ellipse(cx + 104 * k, cy + 92 * k, 50 * k, 27 * k, fill=s.radial('#eef2ea', '#cdd8c7'), stroke=INK, sw=1.6)
        s.add(''.join(f'<path d="M{cx + 62 * k:.1f} {cy + (84 + j * 7) * k:.1f}Q{cx + 104 * k:.1f} {cy + (76 + j * 9) * k:.1f} '
                      f'{cx + 148 * k:.1f} {cy + (86 + j * 6) * k:.1f}" fill="none" stroke="{GREY}" stroke-width="1"/>' for j in range(4)))
    s.add(f'<path d="{d}" fill="{s.radial("#fbfcf8", "#e3eadf")}"/>')
    cid = s.clip(f'<path d="{d}"/>')
    if regions:
        s.add(f'<g clip-path="url(#{cid})">{regions}</g>')
    s.add(f'<g clip-path="url(#{cid})" fill="none" stroke="{INK}" stroke-opacity=".3" stroke-width="1.6" stroke-linecap="round">'
          + ''.join(f'<path d="{x}"/>' for x in sulci.values()) + '</g>')
    s.add(f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="2.2"/>')
    return sulci


def neuraxis():
    s = Svg('A map from brain to muscle', 'Start with distribution; then look for the finding that separates levels.', h=650)
    draw_brain_lateral(s, 150, 170, .7)
    # brainstem continues as the spinal cord
    s.add(f'<path d="M171 268C172 300 174 330 174 360L174 470C174 482 178 492 180 500C182 492 186 482 186 470L186 360'
          f'C186 330 188 300 190 268Z" fill="{s.radial("#f4f7f1", "#d6e1d2")}" stroke="{INK}" stroke-width="1.6"/>')
    # root, ganglion, plexus, nerve, muscle
    s.path('M186 372C200 372 208 376 216 380', mix(GOLD, WHITE, .2), 4, glow=False)
    s.ellipse(222, 382, 8, 5.5, fill=SAND, stroke=GOLD, sw=1.2)
    for dy, col in ((-6, GOLD), (0, mix(GOLD, TEAL, .5)), (6, TEAL)):
        s.path(f'M230 {384 + dy}C246 {392 + dy} 248 {410 - dy} 262 {420 + dy / 2}', col, 2.2, glow=False)
    s.path('M262 420C268 444 268 470 262 500', mix(GOLD, INK, .2), 3, glow=False)
    mus = 'M212 528C230 500 296 500 314 528C296 556 230 556 212 528Z'
    s.add(f'<path d="{mus}" fill="{s.radial("#efc9b6", "#c98f78")}" stroke="{mix(RED, INK, .3)}" stroke-width="1.5"/>')
    s.add(''.join(f'<path d="M{x} 508Q{x + 3} 528 {x} 548" fill="none" stroke="#ffffff" stroke-opacity=".4"/>' for x in range(222, 308, 8)))
    s.circle(262, 506, 4, fill=GOLD)
    marks = [(1, 108, 128, TEAL), (2, 150, 178, TEAL), (3, 182, 244, TEAL), (4, 180, 330, TEAL),
             (5, 204, 360, GOLD), (6, 252, 400, GOLD), (7, 276, 462, GOLD), (8, 300, 512, GOLD)]
    for n, x, y, c in marks:
        s.badge(x, y, n, fill=c, r=10, size=11)
    rows = [('Cerebral cortex', 'Language, neglect, field cut, cortical sensory loss'),
            ('Deep hemisphere', 'Dense face–arm–leg weakness, no cortical signs'),
            ('Brainstem', 'Cranial nerve signs with crossed limb findings'),
            ('Spinal cord', 'Sensory level, both sides, sphincter change'),
            ('Nerve root', 'Pain and deficit in one root territory'),
            ('Plexus', 'Several nerves and roots in one limb'),
            ('Peripheral nerve', 'Deficit confined to one named nerve'),
            ('Junction or muscle', 'Weakness without any sensory loss')]
    s.text(352, 98, 'CENTRAL NERVOUS SYSTEM', 11, TEAL, weight='700')
    s.text(352, 344, 'PERIPHERAL NERVOUS SYSTEM', 11, GOLD, weight='700')
    for i, (lvl, clue) in enumerate(rows):
        y = 110 + i * 54 + (30 if i >= 4 else 0)
        c = TEAL if i < 4 else GOLD
        s.add(f'<path d="M340 {y + 46}L690 {y + 46}" stroke="{LINE}" stroke-width="1"/>')
        s.badge(352, y + 20, i + 1, fill=c, r=10, size=11)
        s.text(372, y + 18, lvl, 15, INK, weight='700')
        s.text(372, y + 37, clue, 13, TEXT)
    s.text(40, 604, 'One clue rarely fixes a level: combine motor, sensory, reflex, cranial and cortical findings.', 13, GOLD)
    return s


def brain_coronal(s, cx, cy):
    """Coronal section through both hemispheres (posterior view). Returns key points."""
    for side in (-1, 1):
        x0 = cx + side * 6
        d = (f'M{x0} {cy - 120}C{x0 + side * 70} {cy - 124} {x0 + side * 142} {cy - 96} {x0 + side * 150} {cy - 20}'
             f'C{x0 + side * 154} {cy + 30} {x0 + side * 128} {cy + 70} {x0 + side * 90} {cy + 80}C{x0 + side * 60} {cy + 86} '
             f'{x0 + side * 30} {cy + 60} {x0} {cy + 60}Z')
        s.add(f'<path d="{d}" fill="{s.radial("#f0f3ec", "#cfd9ca")}" stroke="{INK}" stroke-width="2"/>')
        # white matter core
        w = (f'M{x0 + side * 8} {cy - 96}C{x0 + side * 60} {cy - 100} {x0 + side * 118} {cy - 76} {x0 + side * 124} {cy - 20}'
             f'C{x0 + side * 128} {cy + 22} {x0 + side * 104} {cy + 52} {x0 + side * 76} {cy + 58}C{x0 + side * 50} {cy + 62} '
             f'{x0 + side * 26} {cy + 46} {x0 + side * 8} {cy + 46}Z')
        s.add(f'<path d="{w}" fill="#fbfcf8"/>')
        s.ellipse(x0 + side * 22, cy - 22, 9, 22, fill='#dde7ea', stroke=GREY, sw=1)        # lateral ventricle
        s.ellipse(x0 + side * 34, cy + 22, 22, 18, fill=s.radial('#e8e2d3', '#d3c6aa'), stroke=GREY, sw=1)  # thalamus
        s.add(f'<path d="M{x0 + side * 74} {cy - 18}L{x0 + side * 92} {cy + 30}L{x0 + side * 62} {cy + 32}Z" '
              f'fill="{s.radial("#e8e2d3", "#cdbf9f")}" stroke="{GREY}" stroke-width="1"/>')  # lentiform


def motor():
    s = Svg('Where the motor pathway crosses', 'Lateral corticospinal route to the RIGHT limbs, viewed from behind.', h=660)
    cx, cy = 300, 214
    brain_coronal(s, cx, cy)
    s.text(cx - 140, 100, 'LEFT', 11, MUTED, weight='700')
    s.text(cx + 140, 100, 'RIGHT', 11, MUTED, 'end', weight='700')
    # brainstem (posterior view silhouette)
    bs = (f'M{cx - 30} {cy + 64}C{cx - 34} {cy + 100} {cx - 46} {cy + 116} {cx - 46} {cy + 150}C{cx - 46} {cy + 180} {cx - 30} {cy + 196} '
          f'{cx - 24} {cy + 222}L{cx - 16} {cy + 380}L{cx + 16} {cy + 380}L{cx + 24} {cy + 222}C{cx + 30} {cy + 196} {cx + 46} {cy + 180} '
          f'{cx + 46} {cy + 150}C{cx + 46} {cy + 116} {cx + 34} {cy + 100} {cx + 30} {cy + 64}Z')
    s.add(f'<path d="{bs}" fill="{s.radial("#f2f5ef", "#d3ddcf")}" stroke="{INK}" stroke-width="2"/>')
    for y, lab in ((cy + 90, 'midbrain'), (cy + 150, 'pons'), (cy + 210, 'medulla'), (cy + 262, 'cervical cord')):
        s.text(cx + 62, y, lab, 12, MUTED)
        s.path(f'M{cx + 28} {y - 4}L{cx + 56} {y - 4}', LINE, 1, glow=False)
    # pathway
    path = (f'M{cx - 100} {cy - 104}C{cx - 76} {cy - 60} {cx - 58} {cy - 10} {cx - 54} {cy + 26}C{cx - 50} {cy + 60} {cx - 22} {cy + 80} '
            f'{cx - 16} {cy + 120}L{cx - 12} {cy + 214}C{cx - 10} {cy + 230} {cx + 10} {cy + 238} {cx + 10} {cy + 256}L{cx + 10} {cy + 330}')
    s.path(path, TEAL, 4, arrow=None)
    s.circle(cx - 100, cy - 104, 7, fill=TEAL, stroke=WHITE, sw=2)
    # cervical section with right lateral corticospinal tract, then nerve to arm
    sx, sy = 440, 528
    cord_section(s, sx, sy, 46, 38, roots=False)
    s.ellipse(sx + 28, sy - 8, 9, 11, fill=TEAL)
    s.circle(sx + 18, sy + 18, 4.5, fill=GOLD)
    s.path(f'M{cx + 10} {cy + 330}C{cx + 40} {cy + 340} {sx - 20} {sy - 50} {sx + 22} {sy - 20}', TEAL, 2, dash='4 4')
    s.path(f'M{sx + 22} {sy + 24}C{sx + 60} {sy + 46} {sx + 100} {sy + 40} {sx + 126} {sy + 12}', GOLD, 3.5, arrow=GOLD)
    mus = f'M{sx + 130} {sy + 8}C{sx + 144} {sy - 16} {sx + 198} {sy - 16} {sx + 212} {sy + 8}C{sx + 198} {sy + 32} {sx + 144} {sy + 32} {sx + 130} {sy + 8}Z'
    s.add(f'<path d="{mus}" fill="{s.radial("#efc9b6", "#c98f78")}" stroke="{mix(RED, INK, .3)}" stroke-width="1.5"/>')
    s.text(sx + 171, sy + 52, 'right arm muscle', 12, MUTED, 'middle')
    callout(s, cx - 100, cy - 104, 150, 96, 'Left motor cortex', TEAL, 'end', weight='700')
    callout(s, cx - 54, cy + 26, 160, cy + 64, 'Internal capsule', TEXT, 'end')
    callout(s, cx, cy + 238, 196, cy + 238, 'Pyramidal decussation', TEAL, 'end', weight='700')
    s.text(191, cy + 256, '(caudal medulla)', 12, MUTED, 'end')
    callout(s, sx + 28, sy - 8, sx + 70, sy - 62, 'Lateral corticospinal tract', TEXT)
    callout(s, sx + 18, sy + 18, sx - 30, sy + 76, 'Anterior horn', TEXT, 'end')
    s.text(cx - 40, cy + 182, 'above', 11, TEAL, 'end', weight='700')
    s.text(cx - 24, cy + 300, 'below', 11, GOLD, 'end', weight='700')
    s.card(476, 104, 214, 104, 'Above the crossing', ['A lesion here weakens the', 'limbs on the opposite side.'], color=TEAL, size=13)
    s.card(476, 222, 214, 104, 'Below the crossing', ['A cord lesion weakens the', 'limbs on the same side.'], color=GOLD, size=13)
    return s


def cortex_map():
    s = Svg('Clues on the cortical surface', 'Left hemisphere, lateral view; anterior is to the left.', h=600)
    cx, cy, k = 320, 275, 1.15
    d, sulci, _ = brain_lateral(cx, cy, k)
    regions = (f'<path d="{sulci["precentral"]}" stroke="{TINT[TEAL]}" stroke-width="24" fill="none" transform="translate(10 0)"/>'
               f'<path d="{sulci["postcentral"]}" stroke="{TINT[BLUE]}" stroke-width="24" fill="none" transform="translate(-6 0)"/>'
               f'<ellipse cx="{cx - 108 * k}" cy="{cy + 10 * k}" rx="{28 * k}" ry="{20 * k}" fill="{TINT[GOLD]}"/>'
               f'<ellipse cx="{cx + 40 * k}" cy="{cy + 34 * k}" rx="{34 * k}" ry="{18 * k}" fill="{TINT[GOLD]}"/>'
               f'<ellipse cx="{cx + 92 * k}" cy="{cy - 40 * k}" rx="{36 * k}" ry="{26 * k}" fill="#e3dcef"/>'
               f'<ellipse cx="{cx + 150 * k}" cy="{cy - 4 * k}" rx="{30 * k}" ry="{40 * k}" fill="{RED_PALE}"/>')
    draw_brain_lateral(s, cx, cy, k, regions)
    s.path(f'M{cx - 100 * k} {cy + 2 * k}C{cx - 60 * k} {cy - 40 * k} {cx} {cy - 30 * k} {cx + 30 * k} {cy + 24 * k}', GOLD, 2.2, dash='5 4')
    callout(s, cx + 2 * k, cy - 96 * k, 250, 104, 'Primary motor cortex', TEAL, 'end', weight='700')
    s.text(245, 122, 'precentral · opposite face, arm, leg', 12, MUTED, 'end')
    callout(s, cx + 34 * k, cy - 92 * k, 420, 104, 'Primary sensory cortex', BLUE, weight='700')
    s.text(425, 122, 'postcentral · opposite-side sensation', 12, MUTED)
    callout(s, cx - 108 * k, cy + 10 * k, 170, 420, 'Broca area', GOLD, 'end', weight='700')
    s.text(165, 438, ['expressive language', '(usually left)'], 12, MUTED, 'end')
    callout(s, cx + 40 * k, cy + 34 * k, 310, 480, 'Wernicke area', GOLD, 'end', weight='700')
    s.text(305, 498, 'comprehension (usually left)', 12, MUTED, 'end')
    callout(s, cx + 92 * k, cy - 40 * k, 560, 188, 'Parietal association', PURPLE, weight='700')
    s.text(565, 206, ['attention, praxis;', 'neglect when right'], 12, MUTED)
    callout(s, cx + 150 * k, cy - 4 * k, 560, 310, 'Visual cortex', RED, weight='700')
    s.text(565, 328, 'opposite hemifield', 12, MUTED)
    s.text(cx - 40, cy - 4, 'arcuate links', 11, GOLD, 'middle', italic=True)
    s.text(40, 560, 'Boundaries are approximate and functions are network-based, not single spots.', 13, GOLD)
    return s


def internal_capsule():
    s = Svg('Compact pathways in the internal capsule', 'Axial section of one hemisphere; anterior is at the top.', h=620)
    mx = 452  # midline
    hemi = 'M452 92C360 92 250 124 228 220C214 290 230 380 288 430C330 468 400 482 452 482Z'
    s.add(f'<path d="{hemi}" fill="{s.radial("#eef2ea", "#cfd9ca")}" stroke="{INK}" stroke-width="2"/>')
    inner = 'M452 112C370 112 270 140 252 224C240 290 254 372 304 414C342 446 404 460 452 460Z'
    s.add(f'<path d="{inner}" fill="#fbfcf8"/>')
    s.path(f'M{mx} 86L{mx} 488', GREY, 1, dash='4 4', glow=False)
    s.text(mx + 8, 104, 'midline', 11, MUTED)
    # deep nuclei
    s.add(f'<path d="M438 158C438 140 416 132 404 146C392 160 392 196 402 214C410 226 428 222 434 210Z" fill="#dde7ea" stroke="{GREY}"/>')  # frontal horn
    s.add(f'<path d="M402 150C380 152 370 176 372 200C374 222 388 232 400 226C396 206 394 172 402 150Z" fill="{s.radial("#ece4d2", "#d1c19f")}" stroke="{GREY}"/>')  # caudate
    s.add(f'<path d="M318 176C298 210 296 290 316 330L372 262C376 240 362 200 318 176Z" fill="{s.radial("#ece4d2", "#cbbb98")}" stroke="{GREY}"/>')  # lentiform
    s.add(f'<path d="M352 238L372 262L330 316" fill="none" stroke="{GREY}" stroke-dasharray="3 3"/>')
    s.add(f'<path d="M444 262C420 256 398 270 394 300C390 334 406 362 430 366C446 368 452 352 452 340L452 268Z" fill="{s.radial("#ece4d2", "#cfbf9c")}" stroke="{GREY}"/>')  # thalamus
    s.text(424, 340, 'thalamus', 11, INK, 'middle')
    s.text(388, 134, 'caudate', 11, INK, 'middle')
    s.text(326, 262, 'lentiform', 11, INK, 'middle')
    # capsule limbs
    s.path('M396 168L370 238', mix(GOLD, WHITE, .35), 14, glow=False)
    s.path('M370 240L376 254', GOLD, 14, glow=False)
    s.path('M378 258L392 300', TEAL, 14, glow=False)
    s.path('M392 302L402 332', BLUE, 14, glow=False)
    s.path('M340 338C360 352 372 372 380 392', mix(RED, WHITE, .3), 10, glow=False)
    callout(s, 384, 200, 520, 160, 'Anterior limb', INK, weight='700')
    s.text(525, 178, 'frontal–pontine and thalamic links', 12, MUTED)
    callout(s, 373, 247, 520, 226, 'Genu', GOLD, weight='700')
    s.text(525, 244, 'corticobulbar: face and tongue', 12, MUTED)
    callout(s, 385, 280, 520, 290, 'Posterior limb', TEAL, weight='700')
    s.text(525, 308, 'corticospinal: arm, then leg', 12, MUTED)
    callout(s, 397, 318, 520, 350, 'Thalamocortical sensory', BLUE, weight='700')
    s.text(525, 368, 'opposite face and body', 12, MUTED)
    callout(s, 366, 376, 520, 414, 'Retrolenticular', RED, weight='700')
    s.text(525, 432, 'optic radiation', 12, MUTED)
    s.note(500, 'Why small lesions matter here', ['Fibres for face, arm and leg converge, so a small deep lesion can weaken all three',
                                                  'equally without cortical signs. Positions are approximate.'], h=84)
    return s


def lateral_medulla():
    s = Svg('Crossed face and body findings', 'Open medulla in cross-section, dorsal up; a left lateral lesion is shaded.', h=650)
    cx, cy = 362, 268
    outline = (f'M{cx - 150} {cy - 60}C{cx - 150} {cy - 110} {cx - 110} {cy - 128} {cx - 70} {cy - 120}L{cx - 22} {cy - 70}'
               f'L{cx + 22} {cy - 70}L{cx + 70} {cy - 120}C{cx + 110} {cy - 128} {cx + 150} {cy - 110} {cx + 150} {cy - 60}'
               f'C{cx + 156} {cy + 10} {cx + 120} {cy + 84} {cx + 60} {cy + 112}C{cx + 30} {cy + 126} {cx - 30} {cy + 126} {cx - 60} {cy + 112}'
               f'C{cx - 120} {cy + 84} {cx - 156} {cy + 10} {cx - 150} {cy - 60}Z')
    s.add(f'<path d="{outline}" fill="{s.radial("#f6f8f3", "#d8e2d3")}"/>')
    cid = s.clip(f'<path d="{outline}"/>')
    g = []
    for side in (-1, 1):
        g.append(f'<ellipse cx="{cx + side * 24}" cy="{cy + 92}" rx="20" ry="18" fill="{TINT[TEAL]}"/>')          # pyramid
        g.append(f'<path d="M{cx + side * 50} {cy + 40}C{cx + side * 90} {cy + 30} {cx + side * 96} {cy + 80} {cx + side * 60} {cy + 86}'
                 f'C{cx + side * 82} {cy + 70} {cx + side * 78} {cy + 46} {cx + side * 50} {cy + 52}Z" fill="#e2d6bd" stroke="{GREY}"/>')  # olive
        g.append(f'<rect x="{cx + side * 12 - 6}" y="{cy - 30}" width="12" height="96" rx="6" fill="{TINT[GOLD]}"/>')           # medial lemniscus
        g.append(f'<circle cx="{cx + side * 14}" cy="{cy - 56}" r="9" fill="#cfc4dd"/>')                                     # XII nucleus
        g.append(f'<ellipse cx="{cx + side * 112}" cy="{cy - 46}" rx="22" ry="30" fill="{TINT[BLUE]}"/>')                       # spinal V
        g.append(f'<ellipse cx="{cx + side * 120}" cy="{cy + 30}" rx="16" ry="22" fill="{RED_PALE}"/>')                        # spinothalamic
        g.append(f'<ellipse cx="{cx + side * 130}" cy="{cy - 98}" rx="20" ry="16" fill="#d9e4cf"/>')                           # ICP
        g.append(f'<circle cx="{cx + side * 86}" cy="{cy}" r="8" fill="#d6c7a8"/>')                                           # ambiguus
    s.add(f'<g clip-path="url(#{cid})" stroke-width="1">{"".join(g)}</g>')
    lesion = f'M{cx - 160} {cy - 130}L{cx - 70} {cy - 130}C{cx - 76} {cy - 40} {cx - 72} {cy + 20} {cx - 100} {cy + 80}L{cx - 170} {cy + 80}Z'
    s.add(f'<path d="{lesion}" fill="{RED}" opacity=".18" clip-path="url(#{cid})"/>')
    s.add(f'<path d="{lesion}" fill="none" stroke="{RED}" stroke-width="1.6" stroke-dasharray="5 4" clip-path="url(#{cid})"/>')
    s.add(f'<path d="{outline}" fill="none" stroke="{INK}" stroke-width="2.2"/>')
    s.text(cx, cy - 92, 'fourth ventricle', 11, MUTED, 'middle')
    s.text(cx, cy - 140, 'DORSAL', 11, MUTED, 'middle', weight='700')
    s.text(cx - 165, cy - 140, 'LEFT', 11, RED, weight='700')
    callout(s, cx - 112, cy - 46, 196, 160, 'Spinal trigeminal nucleus', BLUE, 'end', weight='700')
    s.text(191, 178, ['same-side face pain,', 'temperature'], 12, MUTED, 'end')
    callout(s, cx - 120, cy + 30, 196, cy + 58, 'Spinothalamic tract', RED, 'end', weight='700')
    s.text(191, cy + 76, ['opposite body pain,', 'temperature'], 12, MUTED, 'end')
    callout(s, cx - 130, cy - 98, 196, 108, 'Cerebellar peduncle', TEXT, 'end')
    callout(s, cx - 86, cy, 196, cy - 4, 'Nucleus ambiguus', TEXT, 'end')
    s.text(191, cy + 14, 'hoarseness, dysphagia', 12, MUTED, 'end')
    callout(s, cx - 92, cy + 62, 196, cy + 124, 'Sympathetic fibres', TEXT, 'end')
    callout(s, cx + 24, cy + 92, 540, cy + 120, 'Pyramid (spared)', TEAL)
    callout(s, cx + 12, cy + 10, 540, cy - 30, 'Medial lemniscus', GOLD)
    callout(s, cx + 70, cy + 62, 540, cy + 60, 'Inferior olive', TEXT)
    s.text(545, cy - 12, '(spared)', 12, MUTED)
    s.card(30, 448, 250, 150, 'Same side as lesion', ['Face pain/temperature loss,', 'Horner syndrome, limb ataxia,', 'hoarseness, dysphagia'], color=RED, size=13)
    s.card(296, 448, 394, 150, 'Why the sides differ', ['Facial pain fibres descend in the spinal', 'trigeminal tract before crossing; body pain', 'fibres crossed in the cord. So: same-side face,', 'opposite-side body. Lesions are often partial.'], color=GOLD, size=13)
    return s


def cranial_exits():
    s = Svg('Where the cranial nerves leave the brainstem', 'Anterior (ventral) view; nerves labelled on the left only.', h=640)
    cx = 360
    stem = (f'M{cx - 60} 96C{cx - 66} 120 {cx - 50} 150 {cx - 44} 176C{cx - 80} 186 {cx - 96} 214 {cx - 96} 242C{cx - 96} 272 {cx - 76} 292 {cx - 46} 300'
            f'L{cx - 40} 330C{cx - 52} 344 {cx - 52} 374 {cx - 38} 392L{cx - 26} 470L{cx + 26} 470L{cx + 38} 392C{cx + 52} 374 {cx + 52} 344 {cx + 40} 330'
            f'L{cx + 46} 300C{cx + 76} 292 {cx + 96} 272 {cx + 96} 242C{cx + 96} 214 {cx + 80} 186 {cx + 44} 176C{cx + 50} 150 {cx + 66} 120 {cx + 60} 96Z')
    s.add(f'<path d="{stem}" fill="{s.radial("#f4f7f1", "#d3ddce")}"/>')
    cid = s.clip(f'<path d="{stem}"/>')
    det = (''.join(f'<path d="M{cx - 100} {y}Q{cx} {y + 10} {cx + 100} {y}" fill="none" stroke="{GREY}" stroke-width="1.1"/>' for y in range(196, 296, 12))
           + f'<path d="M{cx} 96L{cx} 176M{cx} 300L{cx} 470" stroke="{GREY}" stroke-width="1.2"/>'
           + f'<path d="M{cx - 10} 110L{cx - 6} 170M{cx + 10} 110L{cx + 6} 170" stroke="{GREY}"/>'
           + ''.join(f'<ellipse cx="{cx + side * 30}" cy="362" rx="10" ry="24" fill="#e2d6bd" stroke="{GREY}"/>' for side in (-1, 1))
           + ''.join(f'<path d="M{cx + side * 12} 312L{cx + side * 14} 420" stroke="{GREY}"/>' for side in (-1, 1)))
    s.add(f'<g clip-path="url(#{cid})">{det}</g>')
    s.add(f'<path d="{stem}" fill="none" stroke="{INK}" stroke-width="2.2" stroke-linejoin="round"/>')
    # nerves: (name, exit point, end point, colour)
    nerves = [('III oculomotor', (cx - 10, 168), (220, 150), TEAL), ('IV trochlear', (cx - 48, 160), (220, 186), TEAL),
              ('V trigeminal', (cx - 90, 230), (220, 228), BLUE), ('VI abducens', (cx - 14, 300), (220, 300), BLUE),
              ('VII facial', (cx - 70, 290), (220, 264), BLUE), ('VIII vestibulocochlear', (cx - 64, 298), (220, 282), BLUE),
              ('IX glossopharyngeal', (cx - 44, 342), (220, 334), GOLD), ('X vagus', (cx - 44, 356), (220, 356), GOLD),
              ('XI accessory', (cx - 40, 380), (220, 400), GOLD), ('XII hypoglossal', (cx - 22, 372), (220, 378), GOLD)]
    for name, (x0, y0), (x1, y1), c in nerves:
        w = 5 if name.startswith('V ') else 3
        s.path(f'M{x0} {y0}C{(x0 + x1) / 2 + 20} {y0} {(x0 + x1) / 2 - 10} {y1} {x1} {y1}', mix(c, WHITE, .1), w, glow=False)
        mx0 = 2 * cx - x0
        s.path(f'M{mx0} {y0}C{mx0 + 26} {y0} {mx0 + 34} {y0 + 4} {mx0 + 44} {y0 + 6}', mix(c, WHITE, .1), w, glow=False)
        s.text(x1 - 6, y1 + 4, name, 13, INK, 'end')
    s.path(f'M{cx - 34} 420C{cx - 60} 420 {cx - 70} 404 {cx - 82} 400', GOLD, 2, dash='3 3', glow=False)
    for y0, y1, lab, col in ((96, 176, 'MIDBRAIN', TEAL), (176, 300, 'PONS', BLUE), (300, 470, 'MEDULLA', GOLD)):
        s.path(f'M500 {y0 + 4}L508 {y0 + 4}L508 {y1 - 4}L500 {y1 - 4}', col, 2, glow=False)
        s.text(518, (y0 + y1) / 2 + 4, lab, 11, col, weight='700')
    s.text(518, 154, 'III, IV', 13, TEXT)
    s.text(518, 260, 'V, VI, VII, VIII', 13, TEXT)
    s.text(518, 404, 'IX, X, XI, XII', 13, TEXT)
    s.text(cx + 20, 210, 'pons', 11, MUTED)
    s.text(cx + 30, 404, 'olive', 11, MUTED, 'middle')
    s.text(cx + 4, 330, 'pyramid', 11, MUTED)
    s.note(500, 'Use the level, then the neighbours', ['A cranial nerve sign sets the level; limb, sensory and gaze findings decide whether the',
                                                       'lesion is inside the brainstem or along the nerve. IV exits dorsally and wraps forward.'], h=92)
    return s


def hemicord():
    s = Svg('Why a hemicord splits modalities', 'Axial cord at one level, dorsal up; the left half is damaged.', h=620)
    cx, cy, rx, ry = 300, 290, 170, 140
    shade = f'<rect x="{cx - rx - 5}" y="{cy - ry - 5}" width="{rx + 5}" height="{2 * ry + 10}"/>'
    cord_section(s, cx, cy, rx, ry, roots=True)
    cid = s.clip(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"/>')
    tr = []
    for side in (-1, 1):
        tr.append(f'<path d="M{cx + side * 4} {cy - ry}L{cx + side * 58} {cy - ry + 8}L{cx + side * 22} {cy - 40}L{cx + side * 4} {cy - 36}Z" fill="{TINT[GOLD]}"/>')
        tr.append(f'<ellipse cx="{cx + side * 118}" cy="{cy - 6}" rx="32" ry="40" fill="{TINT[TEAL]}"/>')
        tr.append(f'<path d="M{cx + side * 150} {cy + 34}C{cx + side * 150} {cy + 80} {cx + side * 100} {cy + 120} {cx + side * 60} {cy + 128}'
                  f'L{cx + side * 52} {cy + 96}C{cx + side * 88} {cy + 86} {cx + side * 116} {cy + 60} {cx + side * 118} {cy + 30}Z" fill="{TINT[BLUE]}"/>')
    s.add(f'<g clip-path="url(#{cid})">{"".join(tr)}</g>')
    k = rx / 150
    s.add(f'<path d="{GREY_MATTER}" fill="{s.radial(mix(GREY, WHITE, .25), mix(GREY, INK, .2))}" '
          f'transform="translate({cx} {cy}) scale({k:.4f} {ry / 135:.4f}) translate(-327 -264)"/>')
    s.add(f'<g clip-path="url(#{cid})"><g fill="{RED}" opacity=".16">{shade}</g>'
          f'<path d="M{cx} {cy - ry}L{cx} {cy + ry}" stroke="{RED}" stroke-width="2" stroke-dasharray="6 4"/></g>')
    s.ellipse(cx, cy, rx, ry, fill='none', stroke=INK, sw=2.4)
    s.text(cx, cy - ry - 30, 'DORSAL', 11, MUTED, 'middle', weight='700')
    s.text(cx - rx + 20, cy + ry + 26, 'damaged half', 12, RED, weight='700')
    callout(s, cx - 30, cy - ry + 30, 530, 116, 'Dorsal column', GOLD, weight='700')
    s.text(535, 134, ['vibration and position;', 'loss on the SAME side'], 12, TEXT)
    callout(s, cx - 118, cy - 6, 530, 230, 'Lateral corticospinal', TEAL, weight='700')
    s.text(535, 248, ['already crossed; weakness', 'on the SAME side'], 12, TEXT)
    callout(s, cx - 120, cy + 80, 530, 350, 'Anterolateral tract', BLUE, weight='700')
    s.text(535, 368, ['pain and temperature from the', 'OTHER side, from a level or', 'two below'], 12, TEXT)
    s.note(474, 'Different crossings, different sides', ['Dorsal column fibres cross in the medulla and motor fibres crossed above the cord,',
                                                          'while pain fibres cross near entry. Shading illustrates a pattern, not a scan.'], h=88)
    return s


def root_plexus():
    s = Svg('Root, plexus and nerve wiring', 'Five roots mix in a plexus and leave as three nerves (illustrative).', h=620)
    cols = [TEAL, BLUE, GOLD, RED, PURPLE]
    s.add(f'<path d="M60 96L60 416C60 426 68 432 78 432C88 432 96 426 96 416L96 96Z" fill="{s.radial("#f4f7f1", "#d6e1d2")}" stroke="{INK}" stroke-width="1.8"/>')
    s.text(78, 452, 'spinal cord', 11, MUTED, 'middle')
    roots_y = [130, 190, 250, 310, 370]
    nerves = {'A': (200, [0, 1, 2]), 'B': (300, [1, 2, 3]), 'C': (400, [2, 3, 4])}
    for i, y in enumerate(roots_y):
        s.path(f'M96 {y}L160 {y}', cols[i], 6, glow=False)
        s.ellipse(150, y, 11, 7, fill=mix(cols[i], WHITE, .55), stroke=cols[i], sw=1.2)
        s.text(118, y - 11, f'Root {i + 1}', 11, cols[i], 'middle', weight='700')
    for name, (ny, members) in nerves.items():
        for j, r in enumerate(members):
            off = (j - 1) * 5
            s.path(f'M161 {roots_y[r]}C240 {roots_y[r]} 270 {ny + off} 360 {ny + off}L470 {ny + off}', cols[r], 3.2, glow=False)
        s.add(f'<rect x="470" y="{ny - 11}" width="16" height="22" rx="4" fill="#ffffff" stroke="{INK}" stroke-width="1.2"/>')
        s.path(f'M486 {ny}L530 {ny}', INK, 4, glow=False)
        mus = f'M532 {ny}C546 {ny - 26} 640 {ny - 26} 654 {ny}C640 {ny + 26} 546 {ny + 26} 532 {ny}Z'
        s.add(f'<path d="{mus}" fill="{s.radial("#efc9b6", "#c98f78")}" stroke="{mix(RED, INK, .3)}" stroke-width="1.4"/>')
        s.text(593, ny + 5, f'Muscle {name}', 12, INK, 'middle', weight='700')
        s.text(476, ny - 18, f'Nerve {name}', 11, INK, 'middle', weight='700')
    s.rect(236, 110, 120, 330, fill='none', stroke=GREY, sw=1, rx=14, extra=' stroke-dasharray="4 4"')
    s.text(296, 104, 'PLEXUS', 11, MUTED, 'middle', weight='700')
    s.card(30, 474, 322, 96, 'Root 3 lesion', ['Partial weakness in all three', 'muscles: a myotome pattern'], color=GOLD, size=13)
    s.card(368, 474, 322, 96, 'Nerve B lesion', ['Muscle B alone, with that', "nerve's sensory territory"], color=INK, size=13)
    return s


def nmj_detail():
    s = Svg('The neuromuscular junction', 'Magnified view of one motor end-plate.', h=640)
    cx = 330
    s.path(f'M{cx} 84L{cx} 160', mix(GOLD, INK, .1), 14, glow=False)
    for y in (90, 122):
        s.rect(cx - 14, y, 28, 26, fill=s.radial('#fbf1dc', '#e2c891'), stroke=GOLD, sw=1, rx=12)
    bout = f'M{cx - 18} 160C{cx - 120} 168 {cx - 160} 220 {cx - 156} 262L{cx + 156} 262C{cx + 160} 220 {cx + 120} 168 {cx + 18} 160Z'
    s.add(f'<path d="M{cx - 30} 150C{cx - 150} 150 {cx - 186} 220 {cx - 178} 258L{cx - 156} 262C{cx - 160} 220 {cx - 120} 168 {cx - 18} 160Z" fill="#e8eee2" stroke="{GREY}"/>')
    s.add(f'<path d="{bout}" fill="{s.radial("#ffffff", "#e6ece2")}" stroke="{INK}" stroke-width="2"/>')
    for x, y in ((-30, 196), (40, 194)):
        s.ellipse(cx + x, y, 22, 9, fill=mix(GOLD, WHITE, .55), stroke=GOLD, sw=1)
        s.path(f'M{cx + x - 16} {y}C{cx + x - 10} {y - 6} {cx + x - 4} {y + 6} {cx + x + 2} {y}C{cx + x + 8} {y - 6} {cx + x + 12} {y + 6} {cx + x + 16} {y}', GOLD, 1, glow=False)
    import random
    rnd = random.Random(4)
    for zone in (-110, -50, 10, 70, 120):
        for _ in range(6):
            x, y = cx + zone + rnd.uniform(-16, 16), rnd.uniform(222, 250)
            s.circle(round(x, 1), round(y, 1), 5, fill='#fff6e6', stroke=GOLD, sw=1)
        s.rect(cx + zone - 6, 256, 12, 7, fill=BLUE, rx=2)
    for _ in range(26):
        s.circle(round(cx + rnd.uniform(-140, 140), 1), round(rnd.uniform(268, 284), 1), 1.8, fill=GOLD)
    folds = ''.join(f'L{cx - 160 + i * 32 + 10} 290L{cx - 160 + i * 32 + 14} 330L{cx - 160 + i * 32 + 22} 330L{cx - 160 + i * 32 + 26} 290' for i in range(10))
    mus = f'M{cx - 200} 290' + folds + f'L{cx + 200} 290L{cx + 200} 420L{cx - 200} 420Z'
    s.add(f'<path d="{mus}" fill="{s.radial("#f3dacd", "#d7a994")}" stroke="{mix(RED, INK, .3)}" stroke-width="1.8"/>')
    mcid = s.clip(f'<path d="{mus}"/>')
    s.add(f'<g clip-path="url(#{mcid})">' + ''.join(f'<rect x="{x}" y="344" width="6" height="80" fill="#ffffff" opacity=".35"/>' for x in range(cx - 200, cx + 200, 18))
          + ''.join(f'<rect x="{x}" y="344" width="2" height="80" fill="{mix(RED, INK, .3)}" opacity=".35"/>' for x in range(cx - 192, cx + 200, 18)) + '</g>')
    for i in range(11):
        x = cx - 160 + i * 32 - 2 if i else cx - 176
        if i < 10:
            for dx in (-8, 0, 8):
                s.add(f'<path d="M{cx - 160 + i * 32 + 18 + dx / 2} 290L{cx - 160 + i * 32 + 18 + dx / 2} 284" stroke="{TEAL}" stroke-width="3" stroke-linecap="round"/>') if False else None
    for i in range(11):
        x0 = cx - 196 + i * 32
        if x0 < cx - 186 or x0 > cx + 180:
            continue
        for dx in (4, 10, 16):
            s.add(f'<path d="M{x0 + dx} 290L{x0 + dx} 283" stroke="{TEAL}" stroke-width="3.2" stroke-linecap="round"/>')
    callout(s, cx, 104, 250, 100, 'Myelinated axon', TEXT, 'end')
    callout(s, cx - 172, 220, 120, 176, 'Schwann cell', TEXT, 'end')
    callout(s, cx - 104, 236, 120, 226, 'Vesicles (ACh)', GOLD, 'end', weight='700')
    callout(s, cx - 50, 259, 120, 276, 'Ca²⁺ channels', BLUE, 'end', weight='700')
    callout(s, cx + 40, 194, 548, 170, 'Mitochondria', TEXT)
    callout(s, cx + 100, 276, 548, 248, 'Synaptic cleft', TEXT)
    callout(s, cx + 108, 284, 548, 298, 'ACh receptors', TEAL, weight='700')
    s.text(553, 316, 'on the fold crests', 12, MUTED)
    callout(s, cx + 142, 320, 548, 346, 'Junctional folds', TEXT)
    callout(s, cx + 170, 390, 548, 392, 'Muscle fibre', TEXT)
    keys = [(BLUE, 'Presynaptic', ['release fails:', 'Lambert–Eaton']), (TEAL, 'Postsynaptic', ['receptors fail:', 'myasthenia']),
            (RED, 'Muscle itself', ['effector fails:', 'myopathy'])]
    for i, (c, h, l) in enumerate(keys):
        s.card(30 + i * 225, 452, 210, 104, h, l, color=c, size=13)
    return s


def cerebellum():
    s = Svg('Cerebellar regions and ataxia', 'Posterior view: midline vermis and the two hemispheres.', h=620)
    cx, cy = 300, 270
    s.add(f'<path d="M{cx - 26} 96L{cx - 22} 170L{cx + 22} 170L{cx + 26} 96Z" fill="{s.radial("#f2f5ef", "#d3ddcf")}" stroke="{INK}" stroke-width="1.8"/>')
    s.text(cx, 90, 'brainstem', 11, MUTED, 'middle')
    for side in (-1, 1):
        h = (f'M{cx + side * 14} 160C{cx + side * 80} 140 {cx + side * 190} 150 {cx + side * 200} {cy}C{cx + side * 206} {cy + 80} '
             f'{cx + side * 130} {cy + 130} {cx + side * 40} {cy + 110}C{cx + side * 20} {cy + 104} {cx + side * 14} {cy + 60} {cx + side * 14} 160Z')
        s.add(f'<path d="{h}" fill="{s.radial("#eef3ec", TINT[TEAL])}" stroke="{INK}" stroke-width="2"/>')
        hid = s.clip(f'<path d="{h}"/>')
        s.add(f'<g clip-path="url(#{hid})" fill="none" stroke="{mix(TEAL, INK, .4)}" stroke-opacity=".35" stroke-width="1.2">'
              + ''.join(f'<path d="M{cx + side * 10} {150 + k * 14}C{cx + side * 80} {136 + k * 16} {cx + side * 170} {150 + k * 16} {cx + side * 220} {170 + k * 18}"/>' for k in range(16)) + '</g>')
    v = f'M{cx - 22} 156C{cx - 30} 200 {cx - 30} {cy + 70} {cx - 14} {cy + 108}L{cx + 14} {cy + 108}C{cx + 30} {cy + 70} {cx + 30} 200 {cx + 22} 156Z'
    s.add(f'<path d="{v}" fill="{s.radial("#f8efdd", TINT[GOLD])}" stroke="{INK}" stroke-width="1.8"/>')
    s.add(''.join(f'<path d="M{cx - 24} {170 + k * 14}Q{cx} {176 + k * 14} {cx + 24} {170 + k * 14}" fill="none" stroke="{GOLD}" stroke-opacity=".5"/>' for k in range(16)))
    callout(s, cx, cy, 540, 150, 'Vermis (midline)', GOLD, weight='700')
    s.text(545, 168, ['stance and gait ataxia,', 'truncal sway'], 12, TEXT)
    callout(s, cx + 120, cy + 10, 540, 280, 'Hemisphere', TEAL, weight='700')
    s.text(545, 298, ['same-side limb ataxia:', 'dysmetria, intention tremor,', 'dysdiadochokinesia'], 12, TEXT)
    callout(s, cx - 120, cy + 10, 120, cy + 110, 'Left hemisphere', TEAL, 'end')
    s.text(115, cy + 128, 'left limbs', 12, MUTED, 'end')
    s.note(474, 'Before you call it cerebellar', ['Check position sense and whether ataxia worsens with eyes closed (sensory ataxia), and',
                                                  'examine eye movements and vestibular signs. Connected pathways can mimic these signs.'], h=88)
    return s


def visual_pathway():
    s = Svg('How a visual hemifield crosses', 'Viewed from above. Gold carries the LEFT visual hemifield.', h=600)
    s.add('<g transform="translate(360 96) scale(.78) translate(-360 -96)">')
    T = lambda x, y: (round(360 + (x - 360) * .78, 1), round(96 + (y - 96) * .78, 1))
    brain = 'M150 210C150 160 230 150 360 150C490 150 570 160 570 210L590 420C596 520 470 560 360 560C250 560 124 520 130 420Z'
    s.add(f'<path d="{brain}" fill="{s.radial("#f8faf5", "#e1e9dd")}" stroke="{GREY}" stroke-width="1.5"/>')
    s.text(360, 548, 'brain outline (axial)', 11, MUTED, 'middle')
    # field of view
    s.add(f'<path d="M210 104A150 60 0 0 1 360 92L360 132Z" fill="{TINT[GOLD]}"/>'
          f'<path d="M360 92A150 60 0 0 1 510 104L360 132Z" fill="{TINT[BLUE]}"/>')
    s.text(282, 112, 'left hemifield', 11, GOLD, 'middle', weight='700')
    s.text(438, 112, 'right hemifield', 11, BLUE, 'middle', weight='700')
    for x in (280, 440):
        eyeball_top(s, x, 168, 26)
    # retinal halves to chiasm
    cxh, cyh = 360, 250
    s.path(f'M{280 + 10} 192C{300} 220 {330} 240 {cxh} {cyh}L{430} 300', GOLD, 3.5)           # left eye nasal -> crosses -> right tract
    s.path(f'M{440 + 12} 192C{440} 230 {430} 260 {430} 300', GOLD, 3.5)                          # right eye temporal -> same side
    s.path(f'M{440 - 10} 192C{420} 220 {390} 240 {cxh} {cyh}L{290} 300', BLUE, 3.5)
    s.path(f'M{280 - 12} 192C{280} 230 {290} 260 {290} 300', BLUE, 3.5)
    for x, c in ((290, BLUE), (430, GOLD)):
        s.ellipse(x, 312, 18, 12, fill=s.radial(mix(GREY, WHITE, .3), mix(GREY, INK, .2)), stroke=INK, sw=1)
    # radiations with Meyer loop
    s.path('M430 324C480 360 490 420 420 480', GOLD, 3.5)
    s.path('M430 324C440 380 430 430 400 486', GOLD, 3.5, dash='0')
    s.path('M290 324C240 360 230 420 300 480', BLUE, 3.5)
    s.path('M290 324C280 380 290 430 320 486', BLUE, 3.5)
    for x, c in ((310, BLUE), (410, GOLD)):
        s.add(f'<path d="M{x - 40} 470Q{x} 520 {x + 40} 470L{x + 40} 506Q{x} 530 {x - 40} 506Z" fill="{TINT[c]}" stroke="{c}" stroke-width="1.4"/>')
    s.add('</g>')
    callout(s, *T(cxh, cyh), 180, 240, 'Optic chiasm', INK, 'end', weight='700')
    s.text(175, 258, ['nasal fibres cross;', 'temporal fibres do not'], 12, MUTED, 'end')
    callout(s, *T(268, 230), 180, 190, 'Optic nerve', INK, 'end')
    callout(s, *T(300, 290), 180, 310, 'Optic tract', INK, 'end')
    callout(s, *T(290, 312), 180, 350, 'LGN (thalamus)', INK, 'end')
    callout(s, *T(482, 400), 552, 360, 'Meyer loop', GOLD, weight='700')
    s.text(557, 378, ['upper quadrant', 'of the field'], 12, MUTED)
    callout(s, *T(434, 420), 552, 286, 'Parietal fibres', GOLD, weight='700')
    s.text(557, 304, 'lower quadrant', 12, MUTED)
    callout(s, *T(440, 500), 552, 440, 'Right visual cortex', GOLD, weight='700')
    s.text(557, 458, ['left hemifield', 'of both eyes'], 12, MUTED)
    s.text(40, 552, 'Pupillary fibres and the detailed radiations are simplified.', 13, GOLD)
    return s


def atlas_order():
    """Diagram ids in atlas order, so figure numbers match their position in the app."""
    import re
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'web', 'atlas.js')
    return re.findall(r"\{id:'([^']+)'", open(path, encoding='utf-8').read())


DIAGRAMS = {
    'umn-lmn': umn_lmn, 'facial': facial, 'field-defects': field_defects, 'brainstem-rule': brainstem_rule,
    'cord-syndromes': cord_syndromes, 'sensory-pathways': sensory_pathways, 'root-signatures': root_signatures,
    'brachial-plexus': brachial_plexus, 'nmj-compare': nmj_compare, 'aphasia-tree': aphasia_tree,
    'gaze-circuit': gaze_circuit, 'horner': horner, 'vascular': vascular, 'body-patterns': body_patterns,
    'weakness-flow': weakness_flow, 'time-course': time_course, 'reflex-arc': reflex_arc, 'eye-muscles': eye_muscles,
    'pupil-reflex': pupil_reflex, 'cavernous-sinus': cavernous_sinus, 'hand-nerves': hand_nerves,
    'dermatome-landmarks': dermatome_landmarks, 'lumbosacral': lumbosacral, 'conus-cauda': conus_cauda,
    'neuraxis': neuraxis, 'motor': motor, 'cortex': cortex_map, 'compact': internal_capsule,
    'crossed': lateral_medulla, 'cranial': cranial_exits, 'hemicord': hemicord, 'peripheral': root_plexus,
    'motor-unit': nmj_detail, 'coordination': cerebellum, 'vision': visual_pathway,
}

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'web/assets/atlas'
    os.makedirs(out, exist_ok=True)
    order = atlas_order()
    for name, fn in DIAGRAMS.items():
        svg = fn()
        svg.fig = f'FIG. {order.index(name) + 1:02d}' if name in order else ''
        with open(os.path.join(out, name + '.svg'), 'w', encoding='utf-8') as f:
            f.write(svg.render())
        print(f'{name}.svg  {svg.w}x{svg.h}')

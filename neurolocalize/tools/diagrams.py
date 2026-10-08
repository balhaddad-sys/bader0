#!/usr/bin/env python3
"""Generate the NeuroLocalize 1.2 atlas diagrams as standalone SVG files.

Every diagram uses the same visual language as the original 1.1 atlas:
a 720px-wide warm canvas, Arial labels, teal/blue/gold accents and a
"not to scale" footer. Run:  python3 tools/diagrams.py web/assets/atlas
"""
import os
import sys
from xml.sax.saxutils import escape

INK = '#173e39'
TEAL = '#278278'
BLUE = '#527da2'
GOLD = '#b17b30'
MUTED = '#64736c'
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


class Svg:
    def __init__(self, title, subtitle, h=560, w=720):
        self.w, self.h, self.title, self.subtitle = w, h, title, subtitle
        self.defs = []
        self.body = []
        self.uid = 0

    def nid(self, prefix):
        self.uid += 1
        return f'{prefix}{self.uid}'

    def add(self, s):
        self.body.append(s)

    def text(self, x, y, s, size=15, fill=MUTED, anchor='start', weight=None, italic=False):
        lines = s if isinstance(s, (list, tuple)) else [s]
        extra = (f' font-weight="{weight}"' if weight else '') + (' font-style="italic"' if italic else '')
        for i, line in enumerate(lines):
            self.add(f'<text x="{x}" y="{y + i * round(size * 1.35)}" font-size="{size}" fill="{fill}" '
                     f'text-anchor="{anchor}"{extra}>{escape(line)}</text>')

    def rect(self, x, y, w, h, fill=WHITE, stroke=None, sw=2, rx=12, extra=''):
        st = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ''
        self.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}"{st}{extra}/>')

    def circle(self, cx, cy, r, fill=WHITE, stroke=None, sw=2, extra=''):
        st = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ''
        self.add(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}"{st}{extra}/>')

    def ellipse(self, cx, cy, rx, ry, fill=WHITE, stroke=None, sw=2, extra=''):
        st = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ''
        self.add(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{fill}"{st}{extra}/>')

    def path(self, d, stroke=TEAL, sw=3, fill='none', arrow=None, dash=None, extra=''):
        mk = f' marker-end="url(#{self.marker(arrow)})"' if arrow else ''
        ds = f' stroke-dasharray="{dash}"' if dash else ''
        self.add(f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" '
                 f'stroke-linecap="round" stroke-linejoin="round"{ds}{mk}{extra}/>')

    def marker(self, color):
        mid = 'arrow-' + color.strip('#')
        if not any(f'id="{mid}"' in d for d in self.defs):
            self.defs.append(f'<marker id="{mid}" markerWidth="8" markerHeight="8" refX="6" refY="3" '
                             f'orient="auto"><path d="M0 0L6 3L0 6" fill="none" stroke="{color}" '
                             f'stroke-width="1.3"/></marker>')
        return mid

    def clip(self, inner):
        cid = self.nid('clip')
        self.defs.append(f'<clipPath id="{cid}">{inner}</clipPath>')
        return cid

    def badge(self, cx, cy, label, fill=RED, r=13, size=14):
        self.circle(cx, cy, r, fill=fill)
        self.text(cx, cy + size * 0.36, str(label), size=size, fill=WHITE, anchor='middle', weight='700')

    def card(self, x, y, w, h, heading, lines, color=TEAL, size=14, hsize=17, fill=WHITE):
        self.rect(x, y, w, h, fill=fill, stroke=color)
        self.text(x + 14, y + 26, heading, size=hsize, fill=color)
        if lines:
            self.text(x + 14, y + 26 + round(hsize * 1.45), lines, size=size)

    def note(self, y, heading, lines, h=None, color=GOLD):
        lines = lines if isinstance(lines, list) else [lines]
        h = h or 44 + len(lines) * 21
        self.card(30, y, self.w - 60, h, heading, lines, color=color, size=15, hsize=18)

    def render(self):
        h, w = self.h, self.w
        head = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" '
                f'role="img"><title>{escape(self.title)}</title><desc>{escape(self.subtitle)} Original '
                f'simplified teaching diagram; not to scale.</desc><defs>{"".join(self.defs)}</defs>'
                f'<rect width="{w}" height="{h}" rx="18" fill="{BG}"/><g font-family="Arial,sans-serif">'
                f'<text x="28" y="39" font-size="25" fill="{INK}" text-anchor="start">{escape(self.title)}</text>'
                f'<text x="28" y="68" font-size="15" fill="{MUTED}" text-anchor="start">{escape(self.subtitle)}</text>')
        foot = (f'<path d="M28 {h - 36}L{w - 28} {h - 36}" fill="none" stroke="{LINE}" stroke-width="1"/>'
                f'<text x="28" y="{h - 13}" font-size="12" fill="{MUTED}" text-anchor="start">'
                f'NEUROLOCALIZE  /  ORIGINAL SCHEMATIC · NOT TO SCALE</text></g></svg>')
        return head + ''.join(self.body) + foot


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
    x0, xu, xl, y = 228, 370, 532, 104
    s.text(x0, y + 10, 'SIGN', 12, MUTED, weight='700')
    s.text(xu, y + 10, 'UPPER MOTOR NEURON', 12, TEAL, weight='700')
    s.text(xl, y + 10, 'LOWER MOTOR NEURON', 12, GOLD, weight='700')
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
        cy = 222
        s.text(cx, 96, label, 13, color, 'middle', weight='700')
        cid = s.clip(f'<ellipse cx="{cx}" cy="{cy}" rx="104" ry="110"/>')
        s.ellipse(cx, cy, 104, 110, fill=WHITE)
        if kind == 'lower':
            s.add(f'<rect x="{cx - 110}" y="{cy + 8}" width="110" height="130" fill="{SAND}" opacity=".85" clip-path="url(#{cid})"/>')
        else:
            s.add(f'<rect x="{cx - 110}" y="{cy - 130}" width="110" height="260" fill="{SAND}" opacity=".85" clip-path="url(#{cid})"/>')
        s.ellipse(cx, cy, 104, 110, fill='none', stroke=INK, sw=3)
        s.path(f'M{cx} {cy - 110}L{cx} {cy + 110}', LINE, 1.5, dash='5 5')
        # forehead lines: weak side smooth if peripheral
        for k in range(3):
            yy = cy - 82 + k * 13
            s.path(f'M{cx + 18} {yy}Q{cx + 45} {yy - 6} {cx + 72} {yy}', MUTED, 2)
            if kind == 'lower':
                s.path(f'M{cx - 72} {yy}Q{cx - 45} {yy - 6} {cx - 18} {yy}', MUTED, 2)
        # eyes
        s.ellipse(cx + 40, cy - 22, 19, 10, fill=WHITE, stroke=INK, sw=2)
        s.circle(cx + 40, cy - 22, 5, fill=INK)
        if kind == 'lower':
            s.ellipse(cx - 40, cy - 22, 19, 10, fill=WHITE, stroke=INK, sw=2)
            s.circle(cx - 40, cy - 22, 5, fill=INK)
        else:
            s.ellipse(cx - 40, cy - 21, 19, 13, fill=WHITE, stroke=INK, sw=2)
            s.circle(cx - 40, cy - 21, 5, fill=INK)
        # nose and mouth (weak corner droops)
        s.path(f'M{cx} {cy - 6}L{cx - 8} {cy + 30}L{cx + 6} {cy + 32}', MUTED, 2)
        s.path(f'M{cx + 42} {cy + 62}Q{cx} {cy + 78} {cx - 40} {cy + 78}', INK, 3)
        # labels
        s.text(cx - 52, cy + 138, 'affected side', 13, GOLD, 'middle')
        s.text(cx + 52, cy + 138, 'other side', 13, MUTED, 'middle')
    s.text(190, 386, ['Lower face weak; forehead', 'wrinkles and eye closure', 'largely preserved.'], 15, INK, 'middle')
    s.text(530, 386, ['Forehead, eye closure and', 'mouth weak on the side', 'of the lesion.'], 15, INK, 'middle')
    s.note(442, 'Why the forehead differs', ['Forehead motor neurons receive input from both hemispheres. Sparing',
                                              'favors a central lesion but is not absolute: check limbs, speech and',
                                              'other cranial nerves. Faces are drawn facing you.'], h=110)
    return s


def field_defects():
    s = Svg('Where the visual pathway is cut', 'Six classic lesion sites and the fields they remove.', h=640)
    # pathway, viewed from above, patient's left on the left
    s.text(40, 98, "Viewed from above · patient's left on the left", 12, MUTED)
    L, R, Y = 110, 250, 140
    for x, lab in ((L, 'Left eye'), (R, 'Right eye')):
        s.circle(x, Y, 32, fill=WHITE, stroke=INK, sw=2.5)
        s.circle(x, Y - 18, 10, fill=INK)
        s.text(x, Y + 4, lab, 11, MUTED, 'middle')
    cx, cy = 180, 228
    s.path(f'M{L} {Y + 32}L{cx} {cy}', BLUE, 5)
    s.path(f'M{R} {Y + 32}L{cx} {cy}', GOLD, 5)
    s.path(f'M{cx} {cy}L{L} 300', BLUE, 5)
    s.path(f'M{cx} {cy}L{R} 300', GOLD, 5)
    s.ellipse(L, 304, 14, 9, fill=GREY)
    s.ellipse(R, 304, 14, 9, fill=GREY)
    s.text(180, 309, 'LGN', 12, MUTED, 'middle')
    # left hemisphere radiations (simple)
    s.path(f'M{L} 313L{L + 10} 495', BLUE, 4)
    # right radiations: Meyer's loop (inferior fibers) and parietal (superior fibers)
    s.path(f'M{R} 313C{R + 52} 330 {R + 60} 400 {R - 15} 495', GOLD, 4)
    s.path(f'M{R} 313L{R - 20} 495', GOLD, 4, dash='2 0')
    s.text(R + 34, 300, ['Meyer', 'loop'], 12, GOLD)
    s.rect(70, 495, 220, 42, fill=PALE, stroke=GREY, rx=10)
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
    s.path('M70 100L170 100L178 190L196 210L200 300L182 330L172 420L160 470L80 470L68 420L58 330L40 300L44 210L62 190Z',
           INK, 2.5, fill=PALE)
    s.add(f'<rect x="96" y="100" width="48" height="370" fill="{TEAL_PALE}"/>')
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
        cid = s.clip(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"/>')
        s.ellipse(cx, cy, rx, ry, fill=PALE)
        s.add(f'<path d="{GREY_MATTER}" fill="{GREY}" transform="translate({cx} {cy}) scale({k:.4f}) translate(-327 -264)"/>')
        shade = {
            'all': f'<rect x="{cx - rx}" y="{cy - ry}" width="{2 * rx}" height="{2 * ry}"/>',
            'central': f'<ellipse cx="{cx}" cy="{cy + 2}" rx="{rx * .5:.0f}" ry="{ry * .5:.0f}"/>',
            'anterior': f'<rect x="{cx - rx}" y="{cy - ry / 3:.0f}" width="{2 * rx}" height="{ry * 4 / 3 + 2:.0f}"/>',
            'posterior': f'<path d="M{cx - 26} {cy - ry}L{cx + 26} {cy - ry}L{cx + 6} {cy - 4}L{cx - 6} {cy - 4}Z"/>',
            'hemi': f'<rect x="{cx - rx}" y="{cy - ry}" width="{rx}" height="{2 * ry}"/>',
        }[kind]
        s.add(f'<g fill="{RED}" opacity=".42" clip-path="url(#{cid})">{shade}</g>')
        s.ellipse(cx, cy, rx, ry, fill='none', stroke=INK, sw=2.5)
        s.text(cx, cy - ry - 10, 'dorsal', 11, MUTED, 'middle')
        s.text(cx, cy + ry + 30, name, 18, INK, 'middle')
        s.text(cx, cy + ry + 54, lines, 13, MUTED, 'middle')
        if kind == 'hemi':
            s.text(cx - rx - 4, cy + 5, 'lesion', 11, RED, 'end')
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
               INK, 2.5, fill=WHITE)
        for dx in (-50, -18, 14, 46):
            s.circle(cx + dx, 176, 7, fill=SAND, stroke=GOLD, sw=1.5)
        # calcium channels on terminal membrane
        for dx in (-62, 62):
            s.rect(cx + dx - 6, 188, 12, 14, fill=BLUE, rx=3)
        # muscle with folds
        s.path(f'M{cx - 120} 222' + ''.join(f'L{cx - 120 + i * 30 + 10} 222L{cx - 120 + i * 30 + 15} 240L{cx - 120 + i * 30 + 20} 222'
                                          for i in range(8)) + f'L{cx + 120} 222L{cx + 120} 272L{cx - 120} 272Z', INK, 2.5, fill=PALE)
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
        s.ellipse(x, 146, 56, 32, fill=WHITE, stroke=INK, sw=2.5)
        s.circle(x + 26, 146, 14, fill=INK)
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
    s.path('M140 120C140 80 220 72 250 104C268 124 262 160 250 180L246 214L210 220L206 290L150 290L150 210C128 190 140 150 140 120Z',
           GREY, 2, fill=WHITE)
    s.path('M150 290L120 340L120 520L330 520L330 340L206 290', GREY, 2, fill=WHITE)
    s.ellipse(258, 412, 52, 70, fill=BLUE_PALE, stroke=GREY, sw=1.5)
    s.text(258, 420, 'lung', 12, BLUE, 'middle')
    s.text(258, 436, 'apex', 12, BLUE, 'middle')
    # eye
    s.ellipse(236, 132, 14, 8, fill=WHITE, stroke=INK, sw=2)
    s.circle(236, 132, 3, fill=INK)
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
        d = (f'M{cx - 150} {cy}C{cx - 150} {cy - 110} {cx - 60} {cy - 128} {cx + 10} {cy - 126}'
             f'C{cx + 100} {cy - 124} {cx + 156} {cy - 70} {cx + 152} {cy + 6}C{cx + 150} {cy + 64} {cx + 110} {cy + 86} {cx + 60} {cy + 84}'
             f'C{cx + 10} {cy + 92} {cx - 40} {cy + 110} {cx - 80} {cy + 84}C{cx - 120} {cy + 64} {cx - 150} {cy + 50} {cx - 150} {cy}Z')
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
        s.add(f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="3"/>')
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
    for cx, cy, title, where, kind in cells:
        sx, sy = cx, cy - 70  # head centre
        parts = (f'<circle cx="{sx}" cy="{sy}" r="17"/>'
                 f'<rect x="{sx - 25}" y="{sy + 22}" width="50" height="72" rx="10"/>'
                 f'<rect x="{sx - 41}" y="{sy + 24}" width="14" height="70" rx="7"/>'
                 f'<rect x="{sx + 27}" y="{sy + 24}" width="14" height="70" rx="7"/>'
                 f'<rect x="{sx - 24}" y="{sy + 96}" width="21" height="78" rx="9"/>'
                 f'<rect x="{sx + 3}" y="{sy + 96}" width="21" height="78" rx="9"/>')
        cid = s.clip(parts)
        s.add(f'<g fill="{WHITE}">{parts}</g>')
        shade = {
            'hemi': f'<rect x="{sx - 50}" y="{sy - 20}" width="50" height="200"/>',
            'crossed': f'<rect x="{sx - 50}" y="{sy - 20}" width="50" height="40"/><rect x="{sx}" y="{sy + 20}" width="50" height="160"/>',
            'level': f'<rect x="{sx - 50}" y="{sy + 58}" width="100" height="130"/>',
            'root': f'<rect x="{sx + 33}" y="{sy + 24}" width="9" height="70"/>',
            'stocking': f'<rect x="{sx - 42}" y="{sy + 74}" width="16" height="22"/><rect x="{sx + 26}" y="{sy + 74}" width="16" height="22"/><rect x="{sx - 50}" y="{sy + 140}" width="100" height="40"/>',
            'proximal': f'<rect x="{sx - 50}" y="{sy + 22}" width="100" height="30"/><rect x="{sx - 25}" y="{sy + 84}" width="50" height="40"/>',
        }[kind]
        s.add(f'<g fill="{GOLD}" opacity=".75" clip-path="url(#{cid})">{shade}</g>')
        s.add(f'<g fill="none" stroke="{INK}" stroke-width="2">{parts}</g>')
        if kind == 'level':
            s.path(f'M{sx - 60} {sy + 58}L{sx + 60} {sy + 58}', RED, 2, dash='5 4')
        s.text(cx, cy + 124, title, 15, INK, 'middle')
        s.text(cx, cy + 144, where, 13, TEAL, 'middle')
    s.text(40, 612, 'Figures face you. Shading shows where findings cluster, not exact borders.', 13, GOLD)
    return s


DIAGRAMS = {
    'umn-lmn': umn_lmn, 'facial': facial, 'field-defects': field_defects, 'brainstem-rule': brainstem_rule,
    'cord-syndromes': cord_syndromes, 'sensory-pathways': sensory_pathways, 'root-signatures': root_signatures,
    'brachial-plexus': brachial_plexus, 'nmj-compare': nmj_compare, 'aphasia-tree': aphasia_tree,
    'gaze-circuit': gaze_circuit, 'horner': horner, 'vascular': vascular, 'body-patterns': body_patterns,
}

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'web/assets/atlas'
    os.makedirs(out, exist_ok=True)
    for name, fn in DIAGRAMS.items():
        svg = fn()
        with open(os.path.join(out, name + '.svg'), 'w', encoding='utf-8') as f:
            f.write(svg.render())
        print(f'{name}.svg  {svg.w}x{svg.h}')

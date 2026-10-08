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
    s.ellipse(cx, cy, 90, 76, fill=PALE, stroke=INK, sw=2.5)
    s.add(f'<path d="{GREY_MATTER}" fill="{GREY}" transform="translate({cx} {cy}) scale({k:.4f}) translate(-327 -264)"/>')
    s.text(cx - 20, 124, 'spinal cord (dorsal up)', 11, MUTED, 'end')
    s.ellipse(372, 168, 16, 11, fill=SAND, stroke=GOLD, sw=2)
    s.text(372, 146, 'dorsal root ganglion', 11, GOLD, 'middle')
    s.rect(50, 266, 180, 62, fill=SAND, rx=28)
    s.ellipse(140, 297, 34, 10, fill=WHITE, stroke=GOLD, sw=2)
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
    s.circle(cx, cy, 66, fill=WHITE, stroke=INK, sw=2.5)
    s.circle(cx, cy, 24, fill=INK)
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
    s.rect(130, 282, 460, 112, fill=PALE, rx=12)
    s.text(146, 302, 'MIDBRAIN', 11, MUTED, weight='700')
    for x, lab in ((230, 'Left eye'), (490, 'Right eye')):
        s.circle(x, 130, 32, fill=WHITE, stroke=INK, sw=2.5)
        s.circle(x, 112, 9, fill=INK)
        s.text(x, 84, lab, 12, MUTED, 'middle')
    s.path('M230 162L360 216', GOLD, 4)
    s.path('M490 162L360 216', GOLD, 4)
    s.path('M360 216L300 262L330 312', GOLD, 4, arrow=GOLD)
    s.path('M360 216L420 262L390 312', GOLD, 4, arrow=GOLD)
    s.text(400, 222, 'chiasm', 11, MUTED)
    for x in (330, 390):
        s.circle(x, 320, 10, fill=GREY)
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
    parts = ('<circle cx="220" cy="118" r="26"/><rect x="182" y="150" width="76" height="152" rx="16"/>'
             '<rect x="152" y="156" width="26" height="114" rx="12"/><rect x="146" y="266" width="24" height="108" rx="11"/>'
             '<ellipse cx="156" cy="392" rx="16" ry="22"/>'
             '<rect x="262" y="156" width="26" height="114" rx="12"/><rect x="270" y="266" width="24" height="108" rx="11"/>'
             '<ellipse cx="284" cy="392" rx="16" ry="22"/>'
             '<rect x="186" y="298" width="32" height="140" rx="14"/><rect x="186" y="434" width="28" height="124" rx="12"/>'
             '<rect x="222" y="298" width="32" height="140" rx="14"/><rect x="226" y="434" width="28" height="124" rx="12"/>'
             '<ellipse cx="196" cy="572" rx="22" ry="12"/><ellipse cx="244" cy="572" rx="22" ry="12"/>')
    s.add(f'<g fill="{WHITE}" stroke="{INK}" stroke-width="2">{parts}</g>')
    s.text(220, 640, "patient's right ← → left", 11, MUTED, 'middle')
    pts = [('C5', 150, 262, 'Lateral side of the elbow crease'), ('C6', 141, 402, 'Thumb'),
           ('C7', 156, 414, 'Middle finger'), ('C8', 170, 404, 'Little finger'),
           ('T1', 176, 262, 'Medial side of the elbow crease'), ('T4', 204, 192, 'Nipple line'),
           ('T10', 220, 258, 'Umbilicus'), ('L1', 202, 306, 'Groin (inguinal region)'),
           ('L2', 202, 362, 'Front of the mid-thigh'), ('L3', 216, 428, 'Medial knee'),
           ('L4', 210, 548, 'Medial ankle (malleolus)'), ('L5', 196, 568, 'Top of the foot'),
           ('S1', 176, 574, 'Outer heel')]
    labx = {'C5': 110, 'C6': 110, 'C7': 110, 'C8': 110, 'T1': 110, 'T4': 120, 'T10': 120, 'L1': 120, 'L2': 120,
            'L3': 120, 'L4': 120, 'L5': 120, 'S1': 120}
    laby = {'C5': 250, 'C6': 398, 'C7': 426, 'C8': 454, 'T1': 284, 'T4': 186, 'T10': 222, 'L1': 318, 'L2': 362,
            'L3': 476, 'L4': 520, 'L5': 594, 'S1': 620}
    for root, x, y, _ in pts:
        color = TEAL if root.startswith('C') else (BLUE if root.startswith('T') else GOLD)
        lx, ly = labx[root], laby[root]
        s.path(f'M{x} {y}L{lx + 6} {ly - 4}', LINE, 1.2)
        s.circle(x, y, 5, fill=color, stroke=WHITE, sw=1.5)
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

DIAGRAMS = {
    'umn-lmn': umn_lmn, 'facial': facial, 'field-defects': field_defects, 'brainstem-rule': brainstem_rule,
    'cord-syndromes': cord_syndromes, 'sensory-pathways': sensory_pathways, 'root-signatures': root_signatures,
    'brachial-plexus': brachial_plexus, 'nmj-compare': nmj_compare, 'aphasia-tree': aphasia_tree,
    'gaze-circuit': gaze_circuit, 'horner': horner, 'vascular': vascular, 'body-patterns': body_patterns,
    'weakness-flow': weakness_flow, 'time-course': time_course, 'reflex-arc': reflex_arc, 'eye-muscles': eye_muscles,
    'pupil-reflex': pupil_reflex, 'cavernous-sinus': cavernous_sinus, 'hand-nerves': hand_nerves,
    'dermatome-landmarks': dermatome_landmarks, 'lumbosacral': lumbosacral, 'conus-cauda': conus_cauda,
}

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'web/assets/atlas'
    os.makedirs(out, exist_ok=True)
    for name, fn in DIAGRAMS.items():
        svg = fn()
        with open(os.path.join(out, name + '.svg'), 'w', encoding='utf-8') as f:
            f.write(svg.render())
        print(f'{name}.svg  {svg.w}x{svg.h}')

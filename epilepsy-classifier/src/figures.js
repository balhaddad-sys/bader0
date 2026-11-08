/*
 * Movement & pose figures: a stylised mannequin (front view, patient viewed from the front /
 * above when lying; the patient's RIGHT is on the viewer's LEFT) plus close-up faces.
 * Limbs use two-bone inverse kinematics, so a pose is specified by where the hand/foot goes.
 * These are schematic teaching illustrations, not clinical photographs.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EpiFigures = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const f1 = (n) => (Math.round(n * 10) / 10).toString();
  const FW = 210, FH = 286;
  const L1 = { ua: 40, fa: 36, th: 44, sh: 42 };
  const SH = { R: [74, 74], L: [126, 74] }, HP = { R: [88, 152], L: [112, 152] };
  const REST = { arm: { R: { hand: [64, 146], bend: 'out' }, L: { hand: [136, 146], bend: 'out' } }, leg: { R: { foot: [88, 238], bend: 'out' }, L: { foot: [112, 238], bend: 'out' } } };

  function ik(S, T, l1, l2, bend) {
    let dx = T[0] - S[0], dy = T[1] - S[1], d = Math.hypot(dx, dy);
    const max = (l1 + l2) * 0.999; if (d > max) { dx *= max / d; dy *= max / d; d = max; }
    d = Math.max(d, Math.abs(l1 - l2) + 2);
    const base = Math.atan2(dy, dx), al = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
    const c = [base + al, base - al].map((a) => [S[0] + l1 * Math.cos(a), S[1] + l1 * Math.sin(a)]);
    const out = (a, b) => (Math.abs(a[0] - 100) >= Math.abs(b[0] - 100) ? a : b);
    const pick = { out, in: (a, b) => out(b, a), up: (a, b) => (a[1] <= b[1] ? a : b), down: (a, b) => (a[1] >= b[1] ? a : b) }[bend || 'out'];
    return { E: pick(c[0], c[1]), T: [S[0] + dx, S[1] + dy] };
  }

  /* ---------- annotation marks (shared by body + face) ---------- */
  function marks(list) {
    return (list || []).map((m) => {
      if (m.t === 'arrow') { const [x1, y1, x2, y2] = m.p, b = m.bend || 0, cx = (x1 + x2) / 2 - (y2 - y1) * b, cy = (y1 + y2) / 2 + (x2 - x1) * b;
        return `<path class="pf-ar" d="M${f1(x1)} ${f1(y1)}Q${f1(cx)} ${f1(cy)} ${f1(x2)} ${f1(y2)}" marker-end="url(#pfah)"${m.both ? ' marker-start="url(#pfah)"' : ''}/>`; }
      if (m.t === 'burst') { let s = ''; [-28, 0, 28].forEach((o) => { const a = ((m.a + o) * Math.PI) / 180; s += `M${f1(m.x + Math.cos(a) * 7)} ${f1(m.y + Math.sin(a) * 7)}L${f1(m.x + Math.cos(a) * 15)} ${f1(m.y + Math.sin(a) * 15)}`; }); return `<path class="pf-bu" d="${s}"/>`; }
      if (m.t === 'zz') { const a = ((m.a || 0) * Math.PI) / 180, n = 7, len = m.len || 24; let d = ''; for (let i = 0; i <= n; i++) { const u = (i / n) * len, w = (i % 2 ? 1 : -1) * 3.2 * (i && i < n ? 1 : 0); d += (i ? 'L' : 'M') + f1(m.x + Math.cos(a) * u - Math.sin(a) * w) + ' ' + f1(m.y + Math.sin(a) * u + Math.cos(a) * w); } return `<path class="pf-bu" d="${d}"/>`; }
      if (m.t === 'arc') { const a0 = (m.a0 * Math.PI) / 180, a1 = (m.a1 * Math.PI) / 180; const x0 = m.x + m.r * Math.cos(a0), y0 = m.y + m.r * Math.sin(a0), x1 = m.x + m.r * Math.cos(a1), y1 = m.y + m.r * Math.sin(a1);
        return `<path class="pf-ar" d="M${f1(x0)} ${f1(y0)}A${m.r} ${m.r} 0 ${Math.abs(m.a1 - m.a0) > 180 ? 1 : 0} ${m.a1 > m.a0 ? 1 : 0} ${f1(x1)} ${f1(y1)}" marker-end="url(#pfah)"${m.both ? ' marker-start="url(#pfah)"' : ''}/>`; }
      if (m.t === 'label') return `<text class="pf-lb ${m.cls || ''}" x="${m.x}" y="${m.y}" text-anchor="${m.anchor || 'middle'}">${String(m.text).split('|').map((s, i) => `<tspan x="${m.x}" dy="${i ? 11.5 : 0}">${esc(s)}</tspan>`).join('')}</text>`;
      if (m.t === 'shape') return `<path class="${m.cls || 'pf-lesion'}" d="${m.d}"/>`;
      if (m.t === 'dots') return (m.pts || []).map((p) => `<circle class="${m.cls || 'pf-papule'}" cx="${p[0]}" cy="${p[1]}" r="${m.r || 2.6}"/>`).join('');
      if (m.t === 'x') return `<path class="pf-x" d="M${m.x - 6} ${m.y - 6}L${m.x + 6} ${m.y + 6}M${m.x + 6} ${m.y - 6}L${m.x - 6} ${m.y + 6}"/>`;
      return '';
    }).join('');
  }

  /* ---------- full-body mannequin ---------- */
  const AGES = { infant: { k: 0.7, head: 29, limb: 0.82 }, child: { k: 0.86, head: 21, limb: 0.93 }, adult: { k: 1, head: 17, limb: 1 } };
  function body(s, opts) {
    s = s || {};
    const age = s.age || (s.infant ? 'infant' : (opts && opts.age) || 'adult'), P = AGES[age] || AGES.adult, ls = s.limbScale || {};
    const hl = new Set(s.hl || []), sc = s.torso && s.torso.scale ? s.torso.scale : 1, sh = (s.torso && s.torso.shift) || 0;
    const topY = 152 - (152 - 74) * sc, dy = topY - 74;
    const sho = { R: [SH.R[0] + sh, SH.R[1] + dy], L: [SH.L[0] + sh, SH.L[1] + dy] };
    const arm = Object.assign({}, REST.arm, s.arm || {}), leg = Object.assign({}, REST.leg, s.leg || {});
    const k = P.limb;
    let g = '';
    ['R', 'L'].forEach((sd) => {   // legs first (behind torso)
      const r = ik(HP[sd], leg[sd].foot, L1.th * k * (ls['leg' + sd] || 1), L1.sh * k * (ls['leg' + sd] || 1), leg[sd].bend);
      g += `<path class="pf-limb ${hl.has('leg' + sd) ? 'hl' : ''}" d="M${f1(HP[sd][0])} ${f1(HP[sd][1])}L${f1(r.E[0])} ${f1(r.E[1])}L${f1(r.T[0])} ${f1(r.T[1])}"/><ellipse class="pf-end ${hl.has('leg' + sd) ? 'hl' : ''}" cx="${f1(r.T[0] + (sd === 'R' ? -3 : 3))}" cy="${f1(r.T[1] + 2)}" rx="8" ry="4.5"/>`;
    });
    g += `<path class="pf-torso ${hl.has('torso') ? 'hl' : ''}" d="M${f1(sho.R[0] - 7)} ${f1(sho.R[1] - 1)}Q100 ${f1(sho.R[1] - 14)} ${f1(sho.L[0] + 7)} ${f1(sho.L[1] - 1)}C${f1(sho.L[0] + 2)} ${f1(sho.L[1] + 30)} 119 ${f1(HP.L[1] - 20)} ${f1(HP.L[0] + 9)} 154Q100 161 ${f1(HP.R[0] - 9)} 154C81 ${f1(HP.R[1] - 20)} ${f1(sho.R[0] - 2)} ${f1(sho.R[1] + 30)} ${f1(sho.R[0] - 7)} ${f1(sho.R[1] - 1)}Z"/>`;
    ['R', 'L'].forEach((sd) => {
      const r = ik(sho[sd], arm[sd].hand, L1.ua * k * (ls['arm' + sd] || 1), L1.fa * k * (ls['arm' + sd] || 1), arm[sd].bend), on = hl.has('arm' + sd) ? 'hl' : '';
      g += `<path class="pf-limb ${on}" d="M${f1(sho[sd][0])} ${f1(sho[sd][1])}L${f1(r.E[0])} ${f1(r.E[1])}L${f1(r.T[0])} ${f1(r.T[1])}"/><circle class="pf-end ${on}" cx="${f1(r.T[0])}" cy="${f1(r.T[1])}" r="6.5"/>`;
    });
    const h = s.head || {}, hr = P.head, hx = 100 + sh + (h.dx || 0) + (h.turn || 0) * 3, hy = 42 + dy + (h.dy || 0);
    g += `<path class="pf-neck" d="M${100 + sh} ${f1(sho.R[1] - 6)}L${f1(hx)} ${f1(hy + hr - 2)}"/><circle class="pf-head ${hl.has('head') ? 'hl' : ''}" cx="${f1(hx)}" cy="${f1(hy)}" r="${hr}"/>`;
    g += faceDetail(hx, hy, hr, h);
    g += `<text class="pf-side" x="58" y="250" text-anchor="middle">R</text><text class="pf-side" x="142" y="250" text-anchor="middle">L</text>`;
    return `<g class="pf-age-${age}" transform="translate(100 238) scale(${P.k}) translate(-100 -238)">${g}${marks(s.marks)}</g>`;
  }
  function faceDetail(cx, cy, r, h) {
    const t = h.turn || 0, ex = 6.2 * (r / 17), ey = cy - 2.5, shift = t * 4.5; let g = '';
    const eye = (x) => (h.eyes === 'closed' ? `<path class="pf-feat" d="M${f1(x - 3)} ${f1(ey)}Q${f1(x)} ${f1(ey + 2.4)} ${f1(x + 3)} ${f1(ey)}"/>`
      : `<circle class="pf-eye" cx="${f1(x + (h.eyes === 'dev' ? t * 2.2 : 0))}" cy="${f1(ey + (h.eyes === 'up' ? -2.2 : 0))}" r="2.1"/>`);
    g += eye(cx - ex + shift) + eye(cx + ex + shift);
    if (t) g += `<path class="pf-feat" d="M${f1(cx + shift + t * 1)} ${f1(cy - 1)}l${t * 4.5} 4.5h${-t * 3}"/>`;
    const my = cy + r * 0.52;
    if (h.mouth === 'open') g += `<ellipse class="pf-mouth" cx="${f1(cx + shift)}" cy="${f1(my)}" rx="3.6" ry="3"/>`;
    else g += `<path class="pf-feat" d="M${f1(cx - 4 + shift)} ${f1(my)}${h.mouth === 'down' ? `Q${f1(cx + shift)} ${f1(my - 3)} ${f1(cx + 4 + shift)} ${f1(my)}` : `L${f1(cx + 4 + shift)} ${f1(my)}`}"/>`;
    return g;
  }

  /* ---------- close-up face ---------- */
  function face(s) {
    s = s || {}; const cx = 105, cy = 118, R = 80; let g = '';
    const gaze = s.gaze || [0, 0], pr = 5.6, lid = s.lid === undefined ? 0 : s.lid; // lid 0 open .. 1 closed
    g += `<circle class="pf-head" cx="${cx}" cy="${cy}" r="${R}"/>`;
    g += `<path class="pf-feat" d="M${cx - 50} ${cy - 46}Q${cx - 34} ${cy - 58} ${cx - 16} ${cy - 46}M${cx + 16} ${cy - 46}Q${cx + 34} ${cy - 58} ${cx + 50} ${cy - 46}"/>`;
    [-33, 33].forEach((ox) => {
      const ex = cx + ox, ey = cy - 20;
      g += `<ellipse class="pf-eyeball" cx="${ex}" cy="${ey}" rx="17" ry="${f1(10 * (1 - 0.85 * lid))}"/>`;
      if (lid < 0.7) g += `<circle class="pf-eye" cx="${f1(ex + gaze[0] * 8)}" cy="${f1(ey + gaze[1] * 5)}" r="${pr}"/>`;
      g += `<path class="pf-feat lidline" d="M${ex - 18} ${ey}Q${ex} ${f1(ey - 12 * (1 - lid))} ${ex + 18} ${ey}"/>`;
    });
    if (s.noseline !== false) g += `<path class="pf-feat" d="M${cx} ${cy - 6}l-4 22h8"/>`;
    const my = cy + 42, m = s.mouth || 'neutral';
    if (m === 'open') g += `<ellipse class="pf-mouth" cx="${cx}" cy="${my + 4}" rx="17" ry="${s.wide ? 15 : 11}"/>`;
    else if (m === 'smile') g += `<path class="pf-mouth" d="M${cx - 24} ${my - 4}Q${cx} ${my + 24} ${cx + 24} ${my - 4}Z"/>`;
    else if (m === 'pull') g += `<path class="pf-feat" d="M${cx - 22} ${my + 4}Q${cx - 4} ${my + 6} ${cx + 8} ${my}L${cx + 24} ${my - 14}"/>`;
    else if (m === 'droop') g += `<path class="pf-feat" d="M${cx - 22} ${my - 8}Q${cx} ${my + 4} ${cx + 22} ${my + 8}"/>`;
    else if (m === 'chew') g += `<path class="pf-mouth" d="M${cx - 15} ${my}Q${cx} ${my + 9} ${cx + 15} ${my}Q${cx} ${my + 1} ${cx - 15} ${my}Z"/>`;
    else g += `<path class="pf-feat" d="M${cx - 15} ${my}L${cx + 15} ${my}"/>`;
    if (s.sweat) g += `<path class="pf-bu" d="M${cx + 66} ${cy - 62}q-4 8 0 12M${cx - 66} ${cy - 62}q4 8 0 12"/>`;
    return g + marks(s.marks);
  }

  function custom(key) {
    if (key === 'headsizes') {
      const head = (cx, r, t, c) => `<circle class="pf-head" cx="${cx}" cy="112" r="${r}"/><circle class="pf-eye" cx="${cx - r * 0.33}" cy="108" r="1.9"/><circle class="pf-eye" cx="${cx + r * 0.33}" cy="108" r="1.9"/><path class="pf-feat" d="M${cx - r * 0.25} ${112 + r * 0.42}h${r * 0.5}"/><text class="pf-lb ${c}" x="${cx}" y="${112 + r + 18}" text-anchor="middle">${t}</text>`;
      return `<ellipse class="pf-tape" cx="102" cy="104" rx="27" ry="7"/>` + head(36, 18, 'small', 'sm') + head(102, 26, 'expected', '') + head(172, 32, 'large', 'sm') + `<text class="pf-lb sm" x="105" y="56" text-anchor="middle">tape at the largest</text><text class="pf-lb sm" x="105" y="68" text-anchor="middle">circumference</text>`;
    }
    if (key === 'visualfield') {
      const eye = (cx, lab) => `<circle class="pf-fieldc" cx="${cx}" cy="104" r="42"/><path class="pf-field" d="M${cx} 62A42 42 0 0 1 ${cx} 146Z"/><circle class="pf-eye" cx="${cx}" cy="104" r="3"/><text class="pf-lb sm" x="${cx}" y="164" text-anchor="middle">${lab}</text>`;
      return eye(54, 'left eye') + eye(156, 'right eye') + `<text class="pf-lb" x="105" y="40" text-anchor="middle">right homonymous</text><text class="pf-lb" x="105" y="52" text-anchor="middle">hemianopia</text>`;
    }
    return '';
  }

  /* ---------- sequence of frames -> one SVG ---------- */
  let SEQ = 0; // each drawing gets its own arrow-marker id, so a hidden copy elsewhere in the page can never break another
  function framesSvg(frames, label, opts) {
    const thumb = !!(opts && opts.thumb), n = frames.length, W = n * FW + (n - 1) * 26, TH = FH - 34;
    let g = '';
    frames.forEach((f, i) => {
      const ox = i * (FW + 26), isFace = f.kind === 'face', isCustom = f.kind === 'custom';
      g += `<g transform="translate(${ox + (isFace || isCustom ? 0 : 5)} ${isFace || isCustom ? 18 : 6})">${isFace ? face(f.spec) : isCustom ? custom(f.spec.key) : body(f.spec, opts)}</g>`;
      if (!thumb) g += `<text class="pf-ti" x="${ox + FW / 2}" y="${FH - 20}" text-anchor="middle">${String(f.title || '').split('|').map((s, k) => `<tspan x="${ox + FW / 2}" dy="${k ? 13 : 0}">${esc(s)}</tspan>`).join('')}</text>`;
      if (!thumb && i < n - 1) g += `<path class="pf-seq" d="M${ox + FW + 5} ${FH / 2 - 20}l10 8l-10 8"/>`;
    });
    const mid = 'pfah' + (++SEQ);
    g = g.replace(/#pfah\b/g, '#' + mid);
    const size = thumb ? '' : ` width="${Math.round(W * 1.1)}" height="${Math.round(FH * 1.1)}"`;
    return `<svg class="pose${thumb ? ' thumb' : ''}"${size} viewBox="0 0 ${W} ${thumb ? TH : FH}" role="img" aria-label="Schematic: ${esc(label || 'movement')}" xmlns="http://www.w3.org/2000/svg"><title>Schematic: ${esc(label || 'movement')}</title>
      <defs><marker id="${mid}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path class="pf-head2" d="M0 0L10 5L0 10z"/></marker></defs>${g}</svg>`;
  }

  return { framesSvg, body, face, ik, custom, AGES, FW, FH };
});

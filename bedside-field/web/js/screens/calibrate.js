// Screen & distance: pixels-per-mm from a bank card or the screen diagonal, and the viewing distance.

import { $, show, toast } from '../ui/dom.js';
import { S, persist } from '../app/state.js';
import { Geometry, pxPerMmFromDiagonal, CARD_W_MM, CARD_H_MM } from '../core/geometry.js';
import { clamp, escapeHtml as esc } from '../core/util.js';

function updateCalInfo() {
  const s = S.settings;
  $('#dist-val').textContent = s.distanceCm;
  const box = $('#cal-info');
  if (!s.pxPerMm) { box.textContent = 'Not calibrated yet.'; return; }
  const geo = new Geometry({ pxPerMm: s.pxPerMm, distanceCm: s.distanceCm, width: innerWidth, height: innerHeight });
  const e = geo.halfExtentDeg();
  box.innerHTML = `<b>${s.pxPerMm.toFixed(2)} px/mm</b> (${esc(s.calSource || '')}). In the current window (${innerWidth}×${innerHeight}px) at ${s.distanceCm} cm the testable field is about <b>±${e.h.toFixed(0)}° horizontally</b> and <b>±${e.v.toFixed(0)}° vertically</b>. A 3° stimulus is ${geo.sizePx(3).toFixed(0)} px wide.`;
}

function setCardBox() {
  const w = +$('#cal-slider').value;
  const box = $('#cardbox');
  box.style.width = w + 'px';
  box.style.height = (w * CARD_H_MM) / CARD_W_MM + 'px';
}

export function goCal() {
  const s = S.settings;
  if (s.pxPerMm) $('#cal-slider').value = clamp(Math.round(s.pxPerMm * CARD_W_MM), 120, 1200);
  setCardBox(); updateCalInfo();
  show('s-cal');
}

export function wireCal() {
  $('#cal-slider').addEventListener('input', setCardBox);
  $('#cal-save-card').addEventListener('click', () => {
    S.settings.pxPerMm = +$('#cal-slider').value / CARD_W_MM;
    S.settings.calSource = 'bank-card match';
    persist(); updateCalInfo(); toast('Screen calibrated');
  });
  $('#cal-save-diag').addEventListener('click', () => {
    const d = parseFloat($('#cal-diag').value);
    if (!(d >= 4 && d <= 20)) return toast('Enter the screen diagonal in inches (e.g. 12.9)');
    const w = Math.max(screen.width, screen.height), h = Math.min(screen.width, screen.height);
    S.settings.pxPerMm = pxPerMmFromDiagonal(d, w, h);
    S.settings.calSource = `${d}" diagonal`;
    persist(); updateCalInfo(); toast('Screen calibrated');
  });
  const step = (n) => { S.settings.distanceCm = clamp(S.settings.distanceCm + n, 15, 60); persist(); updateCalInfo(); };
  $('#dist-minus').addEventListener('click', () => step(-1));
  $('#dist-plus').addEventListener('click', () => step(+1));
}

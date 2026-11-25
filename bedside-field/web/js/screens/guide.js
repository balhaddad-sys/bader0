// Positioning guide shown before every test: distance, which eye to cover, camera tips.

import { $ } from '../ui/dom.js';
import { S } from '../app/state.js';
import { startTests } from '../app/flow.js';

function guideSVG(dist, eye) {
  const cover = eye === 'both' ? '' : `
    <g transform="translate(470,200)"><circle r="22" fill="#1a232d" stroke="#ffb703" stroke-width="3"/><path d="M-12 0 Q0 -10 12 0 Q0 10 -12 0Z" fill="none" stroke="#e8eef4" stroke-width="2"/><line x1="-18" y1="14" x2="18" y2="-14" stroke="#ffb703" stroke-width="4"/></g>
    <text x="500" y="196" fill="#ffb703" font-size="15" font-weight="700">Cover the patient’s ${eye === 'right' ? 'LEFT' : 'RIGHT'} eye</text>
    <text x="500" y="216" fill="#8fa1b3" font-size="13">(open eye = ${eye.toUpperCase()}; centre the tablet on it)</text>`;
  return `<svg viewBox="0 0 700 260" role="img" aria-label="Positioning diagram">
    <rect width="700" height="260" rx="14" fill="#0e141b"/>
    <circle cx="150" cy="120" r="72" fill="#1a232d" stroke="#3b4a5a" stroke-width="3"/>
    <path d="M214 122 l22 16 l-22 6z" fill="#1a232d" stroke="#3b4a5a" stroke-width="3"/>
    <circle cx="196" cy="108" r="10" fill="#e8eef4"/><circle cx="200" cy="108" r="5" fill="#0b0f14"/>
    <rect x="460" y="30" width="18" height="190" rx="7" fill="#1a232d" stroke="#5c7186" stroke-width="3"/>
    <circle cx="469" cy="42" r="3.5" fill="#3ddc97"/>
    <line x1="208" y1="108" x2="460" y2="108" stroke="#ffb703" stroke-width="2" stroke-dasharray="6 6"/>
    <circle cx="460" cy="108" r="6" fill="#ffb703"/>
    <line x1="214" y1="184" x2="458" y2="184" stroke="#8fa1b3" stroke-width="2"/>
    <path d="M214 184l10-6v12zM458 184l-10-6v12z" fill="#8fa1b3"/>
    <text x="336" y="176" text-anchor="middle" fill="#e8eef4" font-size="18" font-weight="700">≈ ${dist} cm</text>
    <text x="300" y="98" text-anchor="middle" fill="#ffb703" font-size="13">screen centre level with the eyes</text>
    <text x="469" y="244" text-anchor="middle" fill="#3ddc97" font-size="12">camera</text>
    ${cover}</svg>`;
}

export function renderGuide() {
  const s = S.settings;
  $('#guide-art').innerHTML = guideSVG(s.distanceCm, s.eye);
  $('#g-dist').textContent = s.distanceCm;
  $('#g-eye').textContent = s.eye === 'both' ? 'Centre the tablet on the patient’s nose.' : `Cover the patient’s ${s.eye === 'right' ? 'left' : 'right'} eye (patch or card) and centre the tablet on the open ${s.eye} eye.`;
  $('#g-cam').style.display = s.method === 'camera' ? '' : 'none';
}

export function wireGuide() {
  $('#btn-guide-go').addEventListener('click', () => startTests());
}

// Eye outlines and iris dots drawn over the (mirrored) camera preview, plus the face-position guide oval.

import { LM } from './features.js';

/** Draw eye outlines + iris on an overlay canvas that sits over the (mirrored) preview video. */
export function drawOverlay(ctx, feat, W, H, mirror = true, guide = false) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (guide) { // where the face should sit: both eyes inside this oval, face about this big
    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    ctx.save();
    ctx.lineWidth = 3; ctx.setLineDash([9, 7]);
    ctx.strokeStyle = feat?.lm ? 'rgba(61,220,151,.85)' : 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.ellipse(cw / 2, ch / 2, cw * 0.19, ch * 0.40, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  if (!feat?.lm) return;
  const sx = ctx.canvas.width / W, sy = ctx.canvas.height / H;
  const X = (x) => (mirror ? ctx.canvas.width - x * W * sx : x * W * sx);
  const Y = (y) => y * H * sy;
  ctx.lineWidth = 2;
  for (const e of [LM.R, LM.L]) {
    ctx.strokeStyle = 'rgba(61,220,151,.9)';
    ctx.beginPath();
    ctx.moveTo(X(feat.lm[e.a].x), Y(feat.lm[e.a].y));
    ctx.lineTo(X(feat.lm[e.up].x), Y(feat.lm[e.up].y));
    ctx.lineTo(X(feat.lm[e.b].x), Y(feat.lm[e.b].y));
    ctx.lineTo(X(feat.lm[e.lo].x), Y(feat.lm[e.lo].y));
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,207,51,.95)';
    ctx.beginPath();
    ctx.arc(X(feat.lm[e.iris].x), Y(feat.lm[e.iris].y), 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

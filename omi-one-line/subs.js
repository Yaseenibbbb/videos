// On-screen words: Aref Ruqaa (a ruqʿa hand), ink at ~84 %, no box; written on right → left like the line, behind a soft
// paper-coloured halo so passing lines never cross the letters; fade out 0.45 s. The call to action is set in the store's El Messiri.
import { clamp, ss, eo } from '/core/lib.js';
const INK = 'rgba(29,26,23,';
export const TEXT_Y = 1360, TEXT_SIZE = 66, TEXT_W = 900;

function halo(ctx, text, x, y, w) { ctx.strokeStyle = 'rgba(244,239,228,0.92)'; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.filter = 'blur(4px)'; ctx.strokeText(text, x, y); ctx.filter = 'none'; }

// split into lines that fit; Arabic words keep their order, lines are right-aligned within a centred block
export function wrap(ctx, text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  return lines;
}

// one card: written on over w seconds (right → left, line by line), held, then faded
export function card(ctx, c, t, W, opt = {}) {
  if (t < c.t0 - 0.01 || t > c.t1 + 0.45) return null;
  const size = opt.size || TEXT_SIZE, lh = size * 1.32;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = `700 ${size}px 'Aref Ruqaa'`; ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const lines = wrap(ctx, c.text, TEXT_W), y0 = (opt.y ?? TEXT_Y) - (lines.length - 1) * lh / 2;
  const total = lines.reduce((a, l) => a + l.length, 0);
  const write = clamp((t - c.t0) / c.w) * total;
  ctx.globalAlpha = 1 - clamp((t - c.t1) / 0.45);
  let done = 0;
  lines.forEach((l, i) => {
    const y = y0 + i * lh, w = ctx.measureText(l).width, u = ss(clamp((write - done) / l.length)); done += l.length;
    if (u <= 0) return;
    ctx.save(); ctx.beginPath(); ctx.rect(W / 2 + w / 2 + 30 - (w + 60) * u, y - size * 1.25, (w + 60) * u, size * 1.9); ctx.clip();
    halo(ctx, l, W / 2, y, 16); ctx.fillStyle = INK + '0.86)'; ctx.fillText(l, W / 2, y);
    ctx.restore();
  });
  ctx.restore();
  return lines.map((l, i) => ({ text: l, y: y0 + i * lh }));
}

// the call to action's words, under the book: the series line, then the address
export function ctaText(ctx, C, t, W, y) {
  if (t < C.t0 + 1.6) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.direction = 'rtl'; ctx.textAlign = 'center';
  const a1 = clamp((t - C.t0 - 1.6) / 1.0), a2 = clamp((t - C.t0 - 2.4) / 0.9);
  const fade = 1 - clamp((t - (C.t1 - 0.5)) / 0.5);
  ctx.font = "500 50px 'El Messiri'";
  const s = C.sub, w = ctx.measureText(s).width;
  ctx.save(); ctx.beginPath(); ctx.rect(W / 2 + w / 2 + 20 - (w + 40) * ss(a1), y - 60, (w + 40) * ss(a1), 90); ctx.clip();
  ctx.globalAlpha = fade; ctx.fillStyle = 'rgba(111,54,60,0.92)'; ctx.fillText(s, W / 2, y); ctx.restore();
  ctx.globalAlpha = fade * eo(a2); ctx.direction = 'ltr'; ctx.font = "700 64px 'El Messiri'"; ctx.fillStyle = 'rgb(111,54,60)';
  ctx.fillText(C.url, W / 2, y + 96 - 10 * (1 - eo(a2)));
  ctx.restore();
}

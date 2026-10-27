// The family, drawn the way a skilled adult imitates a child: round heads, dot eyes with a white-wax catchlight, pink cheeks,
// tube limbs, mitten hands, bold hair shapes, front view. One function, parametric: kind × pose × expression.
// Local coordinates: origin between the feet, y down (so the body is at negative y); o.x, o.y place the feet on the page.
import { line, fill, dab, ellipse, handCircle, xf, smooth } from './crayon.js';
import { part, tube, curve } from './rig.js';
import { PAL } from './pal.js';
const K = PAL.crayon;
const LW = 7;

// body proportions: child ≈ 2.5 heads, adult ≈ 3.5 heads (still a picture-book adult)
const KINDS = {
  girl:     { R: 50, head: -196, sh: -146, shW: 30, waist: -110, waistW: 30, hem: -66, hemW: 48, dress: K.sun, hair: 'pigtails', hairC: K.brown, legs: K.peach, shoes: K.rose },
  boy:      { R: 50, head: -196, sh: -146, shW: 32, waist: -100, waistW: 32, hem: -74, hemW: 34, dress: K.leaf, hair: 'short', hairC: K.brown, legs: K.sky, shoes: K.brown, trousers: true },
  mum:      { R: 46, head: -334, sh: -284, shW: 40, waist: -214, waistW: 30, hem: -64, hemW: 70, dress: K.rose, hair: 'bun', hairC: K.brown, legs: K.peach, shoes: K.brown },
  oldmum:   { R: 46, head: -334, sh: -284, shW: 42, waist: -214, waistW: 36, hem: -64, hemW: 72, dress: K.rose, hair: 'bun', hairC: K.brown, grey: true, legs: K.peach, shoes: K.brown, cardigan: K.lilac },
  daughter: { R: 45, head: -330, sh: -282, shW: 38, waist: -212, waistW: 28, hem: -70, hemW: 62, dress: K.sky, hair: 'long', hairC: K.brown, legs: K.peach, shoes: K.teal },
  son:      { R: 47, head: -336, sh: -286, shW: 44, waist: -190, waistW: 38, hem: -150, hemW: 42, dress: K.leaf, hair: 'short', hairC: K.brown, legs: K.brown, shoes: K.ink, trousers: true },
};

// arm poses: [shoulder → elbow → hand] in units of the shoulder width (x) and of the torso (y), resolved per kind
const ARMS = {
  down:   s => [[s.shW, s.sh + 6], [s.shW + 10, s.sh + 60], [s.shW + 14, s.sh + 112]],
  hip:    s => [[s.shW, s.sh + 6], [s.shW + 34, s.sh + 46], [s.shW + 6, s.sh + 78]],
  call:   s => [[s.shW, s.sh + 6], [s.shW + 30, s.sh + 30], [s.R * 0.62, s.head + s.R * 0.55]],      // hand cupped beside the mouth
  up:     s => [[s.shW, s.sh + 4], [s.shW + 26, s.sh - 46], [s.shW + 30, s.sh - 104]],               // throwing the ball high
  reach:  s => [[s.shW, s.sh + 6], [s.shW + 46, s.sh + 30], [s.shW + 92, s.sh + 40]],                // to the side (blocks)
  table:  s => [[s.shW, s.sh + 6], [s.shW + 12, s.sh + 54], [s.shW - 6, s.sh + 96]],                 // forearm forward onto the table
  cup:    s => [[s.shW, s.sh + 6], [s.shW + 18, s.sh + 62], [s.shW - 14, s.sh + 78]],                // holding a glass at the chest
  talk:   s => [[s.shW, s.sh + 6], [s.shW + 38, s.sh + 40], [s.shW + 52, s.sh - 8]],                 // an open hand as she tells
  wave:   s => [[s.shW, s.sh + 4], [s.shW + 40, s.sh - 20], [s.shW + 48, s.sh - 76]],
};

export function person(C, o) {
  const s = KINDS[o.kind], sd = o.seed || 100, sc = o.s || 1, flip = o.flip ? -1 : 1;
  const drop = o.sit ? (o.kind === 'girl' || o.kind === 'boy' ? 34 : 58) : 0;          // seated: the body sinks, the legs get short
  const T = pts => xf(pts.map(([x, y]) => [x * flip, y + (y < -20 ? drop : 0)]), { x: o.x, y: o.y, s: sc, r: o.r || 0 });
  const lo = (k, e = {}) => ({ w: LW, col: K.ink, seed: sd + k, p: o.p ?? 0.95, draw: o.draw ?? 1, ...e });
  const fo = (col, k, e = {}) => ({ col, p: 0.62, gap: 10, w: 12, ang: 0.5 + (k % 3) * 0.3, seed: sd + 50 + k, over: 4, draw: o.fillDraw ?? 1, ...e });
  const R = s.R, hy = s.head;
  // 1) long hair falls behind the shoulders
  if (s.hair === 'long') part(C, T(smooth([[-R - 8, hy - 10], [-R + 4, hy - R + 4], [0, hy - R - 8], [R - 4, hy - R + 4], [R + 8, hy - 10], [R + 14, s.sh + 40], [R - 10, s.sh + 52], [-R + 10, s.sh + 52], [-R - 14, s.sh + 40]], 5)), fo(s.hairC, 1, { p: 0.8 }), lo(1));
  // 2) legs and shoes
  const legTop = s.trousers ? s.hem + 4 : s.hem - 6;
  const legs = o.legs || (o.run ? [[[-14, legTop], [-30, -36], [-44, -8]], [[14, legTop], [24, -40], [34, -14]]] : [[[-16, legTop], [-17, -12]], [[16, legTop], [17, -12]]]);
  const legLen = o.sit ? 0.55 : 1;
  legs.forEach((L, i) => {
    const pts = L.map(([x, y], j) => j === 0 ? [x, y] : [x, legTop + (y - legTop) * legLen]);
    part(C, T(tube(curve(pts, 4), s.trousers ? 24 : 18)), fo(s.legs, 2 + i, { p: 0.55, gap: 8, w: 9 }), lo(2 + i, { w: 6 }));
    const f = pts.at(-1);
    part(C, T(ellipse(f[0] + (i ? 8 : -8), f[1] + 6, 17, 9, 20)), fo(s.shoes, 4 + i, { p: 0.8, gap: 5, w: 7 }), lo(4 + i, { w: 6 }));
  });
  // 3) the body: a dress (or shirt) as one trapezoid with a rounded hem
  const body = smooth([[-s.shW, s.sh], [-s.shW + 6, s.sh - 8], [0, s.sh - 12], [s.shW - 6, s.sh - 8], [s.shW, s.sh], [s.waistW + 2, s.waist], [s.hemW, s.hem], [s.hemW * 0.5, s.hem + 6], [0, s.hem + 4], [-s.hemW * 0.5, s.hem + 6], [-s.hemW, s.hem], [-s.waistW - 2, s.waist]], 5);
  part(C, T(body), fo(s.dress, 6, { p: 0.7 }), lo(6));
  if (s.cardigan) {   // grandmother's lilac cardigan: two front panels
    part(C, T(smooth([[-s.shW - 4, s.sh + 2], [-10, s.sh - 6], [-12, s.waist + 30], [-s.waistW - 8, s.waist + 40]], 4)), fo(s.cardigan, 7, { p: 0.7 }), lo(7));
    part(C, T(smooth([[s.shW + 4, s.sh + 2], [10, s.sh - 6], [12, s.waist + 30], [s.waistW + 8, s.waist + 40]], 4)), fo(s.cardigan, 8, { p: 0.7 }), lo(8));
  }
  // 4) the head (neck hidden), cheeks, face
  const face = handCircle(0, hy, R, sd + 10, 0, 40);
  part(C, T(face), fo(K.peach, 10, { p: 0.5, gap: 10, w: 12, over: 3 }), lo(10));
  // 5) hair over the head
  const cap = smooth([[-R - 4, hy + 4], [-R - 2, hy - R * 0.55], [-R * 0.5, hy - R - 6], [R * 0.5, hy - R - 6], [R + 2, hy - R * 0.55], [R + 4, hy + 4], [R * 0.7, hy - R * 0.35], [R * 0.2, hy - R * 0.5], [-R * 0.3, hy - R * 0.42], [-R * 0.75, hy - R * 0.3]], 5);
  if (s.hair === 'bun') part(C, T(handCircle(0, hy - R - 16, R * 0.42, sd + 11, 0, 24)), fo(s.hairC, 11, { p: 0.85, gap: 7, w: 9 }), lo(11));
  if (s.hair === 'pigtails') [-1, 1].forEach(k => part(C, T(smooth([[k * (R - 6), hy - 16], [k * (R + 26), hy - 34], [k * (R + 40), hy - 6], [k * (R + 28), hy + 22], [k * (R + 2), hy + 6]], 4)), fo(s.hairC, 12 + k, { p: 0.85, gap: 7, w: 9 }), lo(12 + k)));
  part(C, T(cap), fo(s.hairC, 14, { p: 0.85, gap: 7, w: 9, ang: 1.1 }), lo(14));
  if (s.hair === 'short') line(C.l, T([[-R * 0.1, hy - R - 4], [R * 0.05, hy - R - 18], [R * 0.25, hy - R - 6]]), lo(15, { w: 6 }));
  if (s.grey) [[-R * 0.5, -0.2], [R * 0.2, 0.1], [0, -0.05]].forEach(([x, a], k) => line(C.l, T(curve([[x - 6, hy - R + 2], [x + 4, hy - R * 0.62], [x + 14 + a * 20, hy - R * 0.4]])), lo(16 + k, { w: 5, col: K.white, p: 1 })));
  // 6) face: dot eyes with a white-wax catchlight (or happy arcs), cheeks, mouth
  const ex = o.expr || 'smile', ey = hy + 2, eyes = [-R * 0.36, R * 0.36];
  const look = o.look || 0;
  eyes.forEach((x, k) => {
    if (ex === 'laugh' || ex === 'happy') { line(C.l, T([[x - 9, ey + 3], [x - 3, ey - 5], [x + 3, ey - 5], [x + 9, ey + 3]]), lo(20 + k, { w: 5, taper: 0.3 })); return; }
    part(C, T(ellipse(x + look * 4, ey, 6.5, 8, 14)), { col: K.ink, p: 1, gap: 3.2, w: 5, over: 0.5, seed: sd + 22 + k, ang: 1.3, draw: o.fillDraw ?? 1 }, lo(22 + k, { w: 4 }), { occ: false });
    dab(C.l, ...T([[x + look * 4 + 2.5, ey - 3]])[0], 2.2 * sc, { col: K.white, p: 1, seed: sd + 24 + k, gap: 2, w: 3 });
  });
  [-1, 1].forEach(k => dab(C.f, ...T([[k * R * 0.6, hy + R * 0.38]])[0], (ex === 'laugh' ? 12 : 9) * sc, { col: ex === 'laugh' ? K.rose : K.blush, p: 0.75, seed: sd + 26 + k, sq: 0.7 }));
  const my = hy + R * 0.45;
  if (ex === 'call') part(C, T(ellipse(0, my + 2, 9, 11, 18)), { col: K.rose, p: 0.85, gap: 3, w: 4, over: 0.5, seed: sd + 30, draw: o.fillDraw ?? 1 }, lo(30, { w: 4.5 }), { occ: false });
  else if (ex === 'laugh') part(C, T([[-17, my - 4], [17, my - 4], [12, my + 10], [0, my + 16], [-12, my + 10]]), { col: K.rose, p: 0.85, gap: 3, w: 4, over: 0.5, seed: sd + 31, draw: o.fillDraw ?? 1 }, lo(31, { w: 4.5 }), { occ: false });
  else if (ex === 'talk') part(C, T(ellipse(0, my + 2, 8, 6, 16)), { col: K.rose, p: 0.8, gap: 3, w: 4, over: 0.5, seed: sd + 32, draw: o.fillDraw ?? 1 }, lo(32, { w: 4 }), { occ: false });
  else line(C.l, T([[-11, my - 2], [-4, my + 5], [4, my + 5], [11, my - 2]]), lo(33, { w: 4.5 }));
  // 7) arms (in front of the body), mitten hands
  const arm = (pose, side, k) => {
    const pts = ARMS[pose](s).map(([x, y]) => [x * side, y]);
    part(C, T(tube(curve(pts, 5), o.kind === 'girl' || o.kind === 'boy' ? 15 : 16)), fo(s.cardigan || s.dress, 40 + k, { p: 0.68, gap: 8, w: 10 }), lo(40 + k, { w: 6 }));
    const h = pts.at(-1);
    part(C, T(handCircle(h[0], h[1], 10, sd + 44 + k, 0, 18)), fo(K.peach, 44 + k, { p: 0.55, gap: 5, w: 7 }), lo(44 + k, { w: 5.5 }));
    return T([h])[0];
  };
  const hands = { L: arm(o.armL || 'down', -1, 0), R: arm(o.armR || 'down', 1, 1) };
  return { hands, head: T([[0, hy]])[0], R: R * sc };
}

// Three sketchbook pages of the same dining corner, decades apart. Each page is baked once into the engine's static layers:
// colour (washes) + ink A (stroke order, playback window = the page's time) + an arrival field (when colour reaches each spot).
//   page 1 · long ago: ink only, until the noon light comes in through the window as Mum calls; the late one stays ink a little longer
//   page 2 · years later: ink, except the rose tablecloth; colour blooms round the table with the laugh
//   page 3 · today: Mum and her grown daughter at tea; when she starts telling, colour spreads from her glass across the page
// Page units are 1080 × 1920 (= the screen at zoom 1); the baked layers are 1.5× for crisp zooms.
import { rng, hex, mix3, lerp, clamp, ellipse, spline, penStroke, rasterPen, wash, reserve, dab, foliage, figure, arrivalField, fbm, n2, TAU, R3 } from './engine.js';
const { V } = R3;
export const SC = 1.5, PW = 1080, PH = 1920, W = PW * SC, H = PH * SC, GW = 270, GH = 480;
export const C = {
  wall: hex('#efd9b8'), wallShade: hex('#d9c3a6'), wood: hex('#b98a5e'), woodD: hex('#8c6444'), rose: hex('#c9707a'), roseD: hex('#a8545f'),
  green: hex('#8aa65a'), light: hex('#f3d27a'), violet: hex('#8d7fa6'), sky: hex('#9fbcd6'), floor: hex('#c9a77e'), teal: hex('#6f9a96'),
  tea: hex('#c7752e'), glass: hex('#cfe0e4'), pot: hex('#7f97b3'), cream: hex('#e9dcc2'), mustard: hex('#d9a441'),
};
export const LOOK = {
  mum:      { skin: hex('#e2b394'), top: hex('#c9707a'), hair: hex('#4a3328'), dress: 1, sleeve: 'long', torso: [.086, .074, .1], flare: .2, shoe: hex('#6a4a3a') },
  oldmum:   { skin: hex('#e2b394'), top: hex('#8d7fa6'), hair: hex('#9a8f88'), dress: 1, sleeve: 'long', torso: [.09, .08, .1], flare: .2, shoe: hex('#6a4a3a') },
  girl:     { skin: hex('#eec3a4'), top: hex('#d9a441'), bottom: hex('#6f9a96'), hair: hex('#4a3328'), hairLong: 1, torso: [.08, .07, .09] },
  boy:      { skin: hex('#e2b394'), top: hex('#8aa65a'), bottom: hex('#7f97b3'), hair: hex('#2f2622'), curly: 1, torso: [.08, .08, .1] },
  daughter: { skin: hex('#eec3a4'), top: hex('#7fa6c9'), bottom: hex('#4f5d73'), pants: 1, hair: hex('#4a3328'), hairLong: 1, sleeve: 'long', torso: [.08, .07, .092] },
  son:      { skin: hex('#d9a383'), top: hex('#8aa65a'), bottom: hex('#4f5d73'), pants: 1, hair: hex('#2f2622'), sleeve: 'long', torso: [.08, .088, .108] },
};

// ———— poses (body coordinates, unit = body height; yaw π faces the camera) ————
const stand = o => ({ hipY: .52, lean: 0, armL: .05, armR: -.05, bendL: .2, bendR: .2, headYaw: 0, nod: 0, ...o });
const seated = o => ({ hipY: .27, hipZ: 0, lean: .04, footL: V(-.08, .025, .26), footR: V(.08, .025, .28), kneePole: V(0, .3, 1), headYaw: 0, nod: 0,
  handL: V(-.13, .42, .3), handR: V(.13, .42, .3), elbL: V(-1, -.4, 0), elbR: V(1, -.4, 0), ...o });
const floorSit = o => ({ hipY: .085, lean: .05, footL: V(-.16, .025, .3), footR: V(.14, .025, .32), handL: V(-.1, .25, .28), handR: V(.1, .25, .3), elbL: V(-1, -.3, 0), elbR: V(1, -.3, 0), headYaw: 0, nod: .1, ...o });
export const POSE = {
  calling: stand({ handR: V(.06, .86, .13), elbR: V(1, -.6, .2), handL: V(-.12, .5, .05), elbL: V(-1, 0, 0), headYaw: -.2 }),
  playBall: floorSit({ handR: V(.1, .62, .3), elbR: V(1, -.2, .3), handL: V(-.08, .6, .3), nod: -.25 }),
  stack: floorSit({ handR: V(.1, .22, .36), handL: V(-.06, .2, .34), nod: .3 }),
  atTable: seated({}),
  laugh: seated({ nod: -.35, lean: -.06, handL: V(-.12, .44, .28) }),
  telling: seated({ handR: V(.12, .6, .3), elbR: V(1, -.5, 0), nod: -.05 }),
  listening: seated({ handL: V(-.06, .5, .26), handR: V(.06, .5, .26), nod: .08 }),
};

// ———— the baking context ————
function cv(w, h, fill) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true }); if (fill) { x.fillStyle = fill; x.fillRect(0, 0, w, h); } return [c, x]; }
function newPage(win, seed) {
  const [colorC, cx] = cv(W, H, '#fff'), [inkC, ia] = cv(W, H), [timeC, ta] = cv(W, H, '#fff');
  ta.globalCompositeOperation = 'darken';
  for (const g of [cx, ia, ta]) g.setTransform(SC, 0, 0, SC, 0, 0);
  const R = rng(seed), events = [], src = [];
  // a group of strokes drawn in order between t0 and t1 (time shared by length)
  const group = (strokes, t0, t1, o = {}) => {
    const st = strokes.map((pts, i) => Array.isArray(pts[0]) ? penStroke(pts, { w: o.w ?? 2.2, wob: o.wob ?? 1.0, over: o.over ?? 5, gap: o.gap ?? .3, seed: (o.seed ?? 1) + i * 7, smooth: o.smooth ?? false }) : pts);
    const L = st.reduce((a, s) => a + s.L, 0) || 1; let acc = 0;
    st.forEach(s => { const a = t0 + (t1 - t0) * acc / L, d = (t1 - t0) * s.L / L; acc += s.L; if (s.P.length > 1) rasterPen(ia, ta, s, a, Math.max(.02, d), win); });
    events.push({ t: t0, type: 'pen', dur: t1 - t0, n: st.length, pan: o.pan ?? 0 });
  };
  // a figure: its washes go to the colour layer now; its ink draws itself between t0 and t1
  const person = (look, pose, place, t0, t1, sd) => {
    const prims = figure(look, pose, place, { seed: sd, lw: .0052 });
    for (const p of prims) {
      if (p.k === 'knock') { cx.save(); cx.fillStyle = '#fff'; cx.globalAlpha = p.a ?? .93; poly(cx, p.poly); cx.fill(); cx.restore(); }
      else if (p.k === 'wash') wash(cx, p.poly, p.col, { a: (p.a ?? .6), j: p.j ?? 2.5, layers: p.layers ?? 2, edge: p.edge ?? .35, seed: p.seed ?? 1, dx: p.dx ?? 0, dy: p.dy ?? 0, edgeW: p.edgeW ?? 1.2 });
    }
    group(prims.filter(p => p.k === 'ink').map(p => p.st), t0, t1, { pan: (place.x - PW / 2) / (PW / 2) });
    return prims;
  };
  const finish = () => {
    const pack = (c, isTime) => { const out = new Uint8Array(W * H * 4), A = c.getContext('2d').getImageData(0, 0, W, H).data; for (let i = 0, n = W * H; i < n; i++) { out[i * 4] = isTime ? A[i * 4] : A[i * 4 + 3]; out[i * 4 + 1] = isTime ? 255 : 0; out[i * 4 + 3] = 255; } return out; };
    return { W, H, color: colorC, ink: pack(inkC, false), time: pack(timeC, true), winA: win, winB: [999, 1], events };
  };
  return { cx, ia, ta, R, group, person, finish, events, src };
}
function poly(g, p) { g.beginPath(); g.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]); g.closePath(); }
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const box = (x0, y0, x1, y1) => [[[x0, y0], [x1, y0]], [[x1, y0], [x1, y1]], [[x1, y1], [x0, y1]], [[x0, y1], [x0, y0]]];
const wavy = (x0, y0, x1, y1, amp, k, n = 18) => [...Array(n + 1)].map((_, i) => { const u = i / n; return [lerp(x0, x1, u) + Math.sin(u * Math.PI * k) * amp, lerp(y0, y1, u)]; });
// arrival sources in page units → baked pixels
const S = s => ({ ...s, x: s.x * SC, y: s.y * SC, v: s.v * SC, R: (s.R ?? 1e5) * SC, mask: s.mask ? (x, y) => s.mask(x / SC, y / SC) : undefined });
export const inRect = (r, x, y) => x > r[0] && x < r[2] && y > r[1] && y < r[3];

// the window and its view (shared by all pages; curtains differ)
function windowAt(pg, t0, t1, curt, seed) {
  const { cx, group } = pg;
  wash(cx, rect(622, 272, 958, 618), C.sky, { a: .42, j: 5, seed, edge: .15 });
  foliage(cx, [{ x: 700, y: 360, r: 90 }, { x: 790, y: 330, r: 70 }, { x: 650, y: 450, r: 70 }], { seed: seed + 3, dens: .8, scale: .7 });
  wash(cx, rect(622, 540, 958, 618), C.green, { a: .3, j: 4, seed: seed + 5, edge: .1 });
  group([...box(600, 250, 980, 640), ...box(620, 270, 960, 620), [[790, 270], [790, 620]], [[620, 445], [960, 445]], [[590, 650], [990, 650]]], t0, t0 + (t1 - t0) * .6, { seed, w: 2.4 });
  // curtains: wavy folds either side
  const cs = [];
  for (const [a, b] of [[560, 640], [940, 1020]]) {
    const L = wavy(a, 220, a - 10, curt === 'tied' ? 520 : 720, 8, 3), Rr = wavy(b, 220, b + 6, curt === 'tied' ? 520 : 720, 10, 3);
    wash(cx, [...L, ...Rr.reverse()], curt === 'tied' ? C.green : C.rose, { a: .5, j: 4, seed: seed + a, edge: .3 });
    cs.push(L, Rr.slice().reverse(), [[a + 20, 240], [a + 26, 700]], [[a + 50, 240], [a + 46, 690]]);
    if (curt === 'tied') cs.push([[a - 4, 520], [(a + b) / 2, 540], [b + 4, 520]]);
  }
  group([[[540, 222], [1040, 222]], ...cs], t0 + (t1 - t0) * .55, t1, { seed: seed + 50, w: 1.8, gap: .4 });
}
function floorAndWall(pg, y, t0, t1, seed) {
  pg.group([[[30, y], [1050, y + 6]], [[40, y + 24], [1040, y + 30]]], t0, t1, { seed, w: 2.0 });
  wash(pg.cx, [[40, 160], [1040, 160], [1040, y], [40, y]], C.wall, { a: .32, j: 14, seed: seed + 1, edge: .1, layers: 2 });
  wash(pg.cx, [[30, y + 6], [1050, y + 12], [1060, y + 330], [20, y + 320]], C.floor, { a: .3, j: 14, seed: seed + 2, edge: .12, layers: 2 });
}
// a table seen slightly from above: top, front edge, cloth, legs
function table(pg, x0, x1, y, legY, cloth, t0, t1, seed) {
  const { cx, group } = pg;
  const top = [[x0 + 20, y - 26], [x1 - 20, y - 26], [x1, y], [x0, y]];
  wash(cx, top, cloth ? cloth : C.wood, { a: .55, j: 4, seed, edge: .3 });
  const hem = wavy(x0 - 6, y + 70, x1 + 6, y + 72, 4, 9).map(([x, yy], i) => [x, yy + (i % 2) * 6]);
  if (cloth) wash(cx, [[x0 - 6, y], [x1 + 6, y], ...hem.slice().reverse()], cloth, { a: .6, j: 4, seed: seed + 1, edge: .35 });
  [[x0 + 26, x0 + 40], [x1 - 40, x1 - 26]].forEach(([a, b], k) => wash(cx, rect(a, y + 70, b, legY), C.woodD, { a: .55, j: 2, seed: seed + 3 + k }));
  group([top.concat([top[0]]), cloth ? [[x0 - 6, y], ...hem, [x1 + 6, y]] : [[x0, y], [x0, y + 16], [x1, y + 16], [x1, y]],
    [[x0 + 26, y + 70], [x0 + 26, legY]], [[x0 + 40, y + 72], [x0 + 40, legY]], [[x1 - 40, y + 72], [x1 - 40, legY]], [[x1 - 26, y + 70], [x1 - 26, legY]]], t0, t1, { seed: seed + 10, w: 2.2 });
}
function plate(pg, x, y, seed, food = C.tea) {
  wash(pg.cx, ellipse(x, y, 46, 12, 18), hex('#f4efe6'), { a: .5, seed, edge: .2 });
  wash(pg.cx, ellipse(x, y - 2, 26, 6, 14), food, { a: .6, seed: seed + 1, edge: .3 });
  return [ellipse(x, y, 46, 12, 18).concat([[x + 46, y]]), ellipse(x, y - 2, 30, 7, 12, .3).slice(0, 9)];
}
function glassTea(pg, x, y, seed) {   // an estikan of tea on its saucer
  const g = [[x - 13, y - 44], [x + 13, y - 44], [x + 8, y - 22], [x + 11, y - 2], [x - 11, y - 2], [x - 8, y - 22]];
  wash(pg.cx, g.slice(1).map(([a, b]) => [a, b + 6]), C.tea, { a: .7, seed, edge: .4 });
  return [[...g, g[0]], ellipse(x, y, 26, 6, 14).concat([[x + 26, y]])];
}

// ———— page 1: long ago ————
export function page1() {
  const pg = newPage([0, 21.4], 101), { cx, group, src, events } = pg;
  windowAt(pg, 0.3, 3.8, 'long', 110);
  table(pg, 110, 590, 880, 1160, C.cream, 3.6, 6.0, 130);
  const tableThings = [...plate(pg, 210, 868, 140), ...plate(pg, 490, 868, 145)];
  wash(cx, [[310, 862], [390, 862], [398, 812], [302, 812]], C.pot, { a: .6, seed: 150, edge: .35 });
  group([...tableThings, [[302, 812], [398, 812], [390, 862], [310, 862], [302, 812]], [[296, 812], [350, 796], [404, 812]], [[340, 790], [360, 790]],
    [[330, 780], [322, 750], [338, 724]], [[364, 780], [372, 752], [360, 726]]], 5.6, 7.0, { seed: 160, w: 1.9 });
  [[220, 760], [480, 760]].forEach(([x, y], k) => { wash(cx, rect(x - 50, y, x + 50, y + 20), C.wood, { a: .5, seed: 170 + k }); group([[[x - 50, y + 100], [x - 50, y], [x + 50, y], [x + 50, y + 100]], [[x - 50, y + 20], [x + 50, y + 20]]], 6.5 + k * .4, 6.9 + k * .4, { seed: 175 + k * 9 }); });
  floorAndWall(pg, 1160, 7.3, 7.8, 180);
  // the doorway to the kitchen, its depth in a cool violet
  wash(cx, rect(780, 640, 990, 1160), C.violet, { a: .22, j: 6, seed: 190, edge: .1 });
  group([[[760, 1166], [760, 620], [1010, 620], [1010, 1166]], [[780, 1160], [780, 640], [990, 640], [990, 1160]]], 7.8, 8.6, { seed: 192, w: 2.3 });
  // the rug, the blocks
  const rug = ellipse(440, 1300, 330, 66, 40);
  wash(cx, rug, C.rose, { a: .35, j: 6, seed: 200, edge: .3 }); wash(cx, ellipse(440, 1300, 280, 48, 36), C.light, { a: .3, j: 5, seed: 201 });
  group([rug.concat([rug[0]]), ellipse(440, 1300, 290, 52, 36).slice(0, 30)], 8.6, 9.6, { seed: 205, w: 1.9, gap: .5 });
  // the children (10.0 → 12.6): the girl with a ball, the boy at his tower (he is the late one)
  pg.person(LOOK.girl, POSE.playBall, { x: 320, y: 1300, S: 300, yaw: Math.PI - .5 }, 10.0, 11.3, 210);
  wash(cx, ellipse(334, 1105, 22, 22, 16), C.rose, { a: .7, seed: 215 });
  group([ellipse(334, 1105, 22, 22, 16).concat([[356, 1105]]), [[316, 1098], [352, 1112]]], 11.2, 11.5, { seed: 216, w: 1.8 });
  [[478, 1290], [480, 1262], [482, 1234]].forEach(([x, y], k) => { wash(cx, rect(x, y - 26, x + 28, y), [C.light, C.teal, C.rose][k], { a: .7, seed: 220 + k }); group(box(x, y - 26, x + 28, y), 11.3 + k * .1, 11.4 + k * .1, { seed: 225 + k * 5, w: 1.6 }); });
  const boy = pg.person(LOOK.boy, POSE.stack, { x: 580, y: 1310, S: 300, yaw: Math.PI + .6 }, 11.5, 12.6, 230);
  // his silhouette (not a box): only the boy himself waits for his colour
  const [mc, mg] = cv(PW / 2, PH / 2); mg.scale(.5, .5); mg.fillStyle = '#000';
  for (const p of boy) if (p.k === 'knock') { poly(mg, p.poly); mg.fill(); }
  const md = mg.getImageData(0, 0, PW / 2, PH / 2).data, isBoy = (x, y) => { const i = (Math.floor(y / 2) * (PW / 2) + Math.floor(x / 2)) * 4 + 3; return x >= 0 && y >= 0 && x < PW && y < PH && md[i] > 0; };
  // Mum in the doorway, calling (12.4 → 13.6)
  pg.person(LOOK.mum, POSE.calling, { x: 880, y: 1160, S: 520, yaw: -Math.PI / 2 - .55 }, 12.4, 13.6, 240);
  // her call: ink arcs (sound drawn as lines), and louder the second time
  const arcs = (x, y, n, k) => [...Array(n)].map((_, i) => { const r = (10 + i * 9) * k; return [...Array(7)].map((_, j) => { const a = Math.PI * (0.78 + j / 6 * 0.44); return [x + 14 + Math.cos(a) * r, y + Math.sin(a) * r * 1.2]; }); });
  group(arcs(820, 690, 3, 1), 13.8, 14.3, { seed: 250, w: 2.0, smooth: true });
  group(arcs(818, 690, 4, 1.5), 19.0, 19.5, { seed: 260, w: 2.4, smooth: true });
  group([[[640, 1150], [610, 1146]], [[640, 1176], [600, 1176]], [[640, 1202], [612, 1206]]], 19.7, 20.1, { seed: 270, w: 1.8 });   // the late one hurries
  // colour: noon light in through the window as Mum calls; the boy stays ink until he's called again
  src.push(S({ x: 790, y: 445, t: 12.9, v: 300, R: 1500, mask: (x, y) => !isBoy(x, y) }), S({ x: 585, y: 1210, t: 19.25, v: 220, R: 170, mask: isBoy, hard: true }));
  events.push({ t: 12.9, type: 'bloom', dur: 3.5 }, { t: 19.25, type: 'bloom', dur: 1.0 });
  return pg;
}

// ———— page 2: years later ————
export const MARK_T = [22.6, 23.05, 23.5, 23.95, 24.4, 24.85];
export function page2() {
  const T0 = 21.4, pg = newPage([T0, 12.2], 202), { cx, group, src, events } = pg;
  windowAt(pg, T0, T0 + 1.0, 'tied', 210);
  // a pendant lamp over the table (it wasn't there before)
  wash(cx, [[260, 560], [400, 560], [370, 500], [290, 500]], C.mustard, { a: .55, seed: 220 });
  group([[[330, 160], [330, 500]], [[290, 500], [370, 500], [400, 560], [260, 560], [290, 500]]], T0 + .3, T0 + .9, { seed: 222 });
  // the door frame on the right, with the children's height marks climbing it (22.6 → 25.3)
  wash(cx, rect(800, 600, 1000, 1180), C.violet, { a: .18, j: 6, seed: 240, edge: .1 });
  group([[[780, 1186], [780, 580], [1020, 580], [1020, 1186]], [[800, 1180], [800, 600], [1000, 600], [1000, 1180]]], T0 + .4, T0 + 1.0, { seed: 242, w: 2.3 });
  [1100, 1035, 960, 885, 810, 740].forEach((y, i) => { group([[[802, y], [850, y - 2]], [[856, y - 6], [868, y - 12], [878, y - 4]]], MARK_T[i], MARK_T[i] + .3, { seed: 250 + i * 3, w: 2.2 }); });
  // the family round the table: Mum facing us, a grown daughter and son either side
  pg.person(LOOK.daughter, POSE.atTable, { x: 160, y: 1180, S: 560, yaw: Math.PI / 2 + .45 }, T0 + .2, T0 + 1.1, 260);
  pg.person(LOOK.oldmum, POSE.atTable, { x: 340, y: 1150, S: 540, yaw: Math.PI }, T0 + .3, T0 + 1.2, 270);
  pg.person(LOOK.son, POSE.atTable, { x: 530, y: 1180, S: 580, yaw: -Math.PI / 2 - .45 }, T0 + .4, T0 + 1.3, 280);
  // the table hides their laps: knock the colour and erase the ink under it, then draw the table (the rose tablecloth: the one coloured thing)
  const under = [[70, 930], [610, 930], [610, 1220], [70, 1220]];
  cx.save(); cx.fillStyle = '#fff'; poly(cx, under); cx.fill(); cx.restore();
  for (const g of [pg.ia]) { g.save(); g.globalCompositeOperation = 'destination-out'; poly(g, under); g.fill(); g.restore(); }
  floorAndWall(pg, 1180, T0 + .6, T0 + 1.0, 230);   // glazed over everything (so the knocked-out space under the table is wall and floor again)
  table(pg, 80, 600, 960, 1180, C.rose, T0 + .5, T0 + 1.3, 290);
  group([...plate(pg, 180, 948, 300, C.green), ...plate(pg, 340, 950, 305), ...plate(pg, 500, 948, 310, C.green)], T0 + 1.0, T0 + 1.4, { seed: 315, w: 1.8 });
  // the laugh, drawn as lines round their heads (27.2 → 29.4)
  const laughLines = [];
  [[160, 640], [340, 600], [530, 630]].forEach(([x, y], k) => { for (let j = 0; j < 3; j++) { const a = -2.4 + j * .55 + k * .2; laughLines.push([[x + Math.cos(a) * 64, y + Math.sin(a) * 64], [x + Math.cos(a) * 92, y + Math.sin(a) * 92]]); } });
  group(laughLines, 27.2, 29.4, { seed: 330, w: 2.0, over: 2 });
  // colour: the tablecloth from the start; the laugh blooms round the table
  src.push(S({ x: 340, y: 1000, t: T0, v: 900, R: 300, mask: (x, y) => y > 925 && y < 1060 && x > 60 && x < 620, hard: true }));
  src.push(S({ x: 340, y: 860, t: 26.3, v: 240, R: 520 }));
  events.push({ t: 26.3, type: 'bloom', dur: 2.6 });
  return pg;
}

// ———— page 3: today ————
export function page3() {
  const T0 = 33.6, pg = newPage([T0, 16.2], 303), { cx, group, src, events } = pg;
  windowAt(pg, T0, T0 + 1.2, 'long', 310);
  // a small round table by the window, two glasses of tea, a teapot
  pg.person(LOOK.oldmum, POSE.telling, { x: 330, y: 1180, S: 560, yaw: Math.PI / 2 + .35 }, T0 + 1.0, T0 + 2.2, 330);
  pg.person(LOOK.daughter, POSE.listening, { x: 760, y: 1180, S: 560, yaw: -Math.PI / 2 - .35 }, T0 + 1.6, T0 + 2.8, 340);
  floorAndWall(pg, 1180, T0 + .8, T0 + 1.2, 320);
  wash(cx, ellipse(545, 975, 150, 22, 24), C.wood, { a: .55, seed: 350, edge: .3 });
  wash(cx, rect(535, 990, 555, 1150), C.woodD, { a: .55, seed: 351 });
  group([ellipse(545, 975, 150, 22, 28).concat([[695, 975]]), [[395, 980], [400, 994], [690, 994], [695, 980]], [[536, 996], [536, 1150]], [[554, 996], [554, 1150]], [[480, 1180], [545, 1150], [610, 1180]]], T0 + 2.4, T0 + 3.0, { seed: 352 });
  const things = [...glassTea(pg, 480, 968, 360), ...glassTea(pg, 610, 968, 365)];
  wash(cx, [[520, 962], [570, 962], [578, 920], [512, 920]], C.pot, { a: .6, seed: 370 });
  group([...things, [[520, 962], [570, 962], [578, 920], [512, 920], [520, 962]], [[512, 920], [545, 904], [578, 920]], [[578, 936], [602, 924]]], T0 + 2.9, T0 + 3.4, { seed: 372, w: 1.7 });
  // her words, drawn as small curls rising from her as she tells (37.0 → 38.2)
  const curls = [...Array(3)].map((_, i) => [...Array(10)].map((_, k) => { const u = k / 9, a = u * Math.PI * 2.5; return [395 + i * 26 + u * 30 + Math.cos(a) * 9, 640 - i * 16 - u * 60 + Math.sin(a) * 9]; }));
  group(curls, 37.0, 38.2, { seed: 380, w: 1.8, over: 1 });
  // colour: when she starts telling, it spreads from her glass across the room
  src.push(S({ x: 480, y: 950, t: 36.2, v: 190, R: 2400 }));
  events.push({ t: 36.2, type: 'bloom', dur: 6.0 });
  return pg;
}

// arrival field + compositor inputs for a baked page
export function bake(pg) {
  const L = pg.finish();
  const arr = arrivalField(W, H, GW, GH, pg.src, { amp: 150 * SC });
  return { ...L, arr, gw: GW, gh: GH, events: pg.events };
}

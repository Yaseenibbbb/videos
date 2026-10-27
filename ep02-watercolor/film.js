// انتصار صغير — a handscroll that paints itself ahead of her wheel. Classic script: uses engine.js globals (mk, drawS, drawList, sprite, withSeed, ss, seg…).
// World: x along the square, y down; the wheels touch the ground at GY. Figures are brush strokes rebuilt on twos under fixed seeds.
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
let TL, EVT, PAPER_IMG;
const GY = 1250;
const COL = { sky: '#c9d3d4', skyW: '#ead9b0', sage: '#a9b78a', straw: '#e3cf9c', stone: '#c9bba0', blue: '#9fb0bd', deep: '#5f7a4e', trunk: '#6b5340',
  dress: '#7d4e63', dressD: '#5f3a4b', skin: '#e3b48f', skinD: '#c99573', hair: '#4a3328', shirt: '#6f8597', shirtD: '#56697a', trousers: '#4f5a66',
  frame: '#3d6f6a', tyre: '#3d3129', accent: '#c8442a', road: '#cbbb9a', roadD: '#b4a27f' };
const step12 = t => Math.floor(t * 12 + 1e-6) / 12;

// —— her ride (same beats as the risograph version) ——
function bikeX(t) {
  const E = TL.events;
  if (t < 2.6) return 300 + 18 * ss(t / 2.6);
  if (t < 6.4) return 318;
  if (t < 8.6) return 318 + 102 * Math.sin(Math.PI / 2 * seg(t, 6.4, 8.6));
  if (t < E.go) return 420;
  const v = 250, ramp = 3.0, pos = u => u < ramp ? 0.5 * v / ramp * u * u : 0.5 * v * ramp + v * (u - ramp);
  if (t < E.brake) return 420 + pos(t - E.go);
  return 420 + pos(E.brake - E.go) + v * 0.45 * Math.sin(Math.PI / 2 * seg(t, E.brake, E.brake + 0.9));
}
// how far the world has painted itself: around her at first, then running ahead of the front wheel
const frontier = t => Math.max(...[0, 0.5, 1, 1.5, 2].map(d => bikeX(Math.max(0, t - d)))) + 230 + 140 * seg(t, 4, 9);

// —— the rig (side view, facing right) ——
const ik = (a, t, l1, l2, bend = 1) => { const dx = t[0] - a[0], dy = t[1] - a[1]; let d = Math.min(Math.hypot(dx, dy), l1 + l2 - .01); const b = Math.atan2(dy, dx), A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)) * bend; return [[a[0] + Math.cos(b + A) * l1, a[1] + Math.sin(b + A) * l1], [a[0] + Math.cos(b) * d, a[1] + Math.sin(b) * d]]; };
const B = { Rw: 88, R: [-158, -88], F: [158, -88], BB: [-14, -82], crank: 34, seat: [-82, -205], grip: [58, -272] }, L = { th: 112, sh: 106, to: 132, up: 80, fo: 74 };
const tr = (p, x, y, s, rot) => { const c = Math.cos(rot), n = Math.sin(rot); return [x + (p[0] * c - p[1] * n) * s, y + (p[0] * n + p[1] * c) * s]; };
const st = (pts, w, col, o = {}) => mk(pts, w, col, { prof: 'even', rough: .18, a: .9, ...o });
const ring = (c, r, n = 26) => [...Array(n + 1)].map((_, i) => { const a = i / n * Math.PI * 2 + .3; return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]; });
const lineP = (a, b, n = 6) => [...Array(n + 1)].map((_, i) => [lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n)]);
function mumStrokes(x, y, s, o) {
  const S = [], T = p => tr(p, x, y, s, o.wobble || 0), crank = o.crank || 0, wa = o.wa || 0;
  // wheels, spokes, frame (ink-teal), the crank
  for (const c of [B.R, B.F]) { S.push(st(ring(c, B.Rw - 6).map(T), 9 * s, COL.tyre, { a: .85 })); for (let i = 0; i < 6; i++) { const a = wa + i * Math.PI / 3; S.push(st(lineP(c, [c[0] + Math.cos(a) * (B.Rw - 12), c[1] + Math.sin(a) * (B.Rw - 12)], 3).map(T), 1.6 * s, COL.tyre, { a: .5, nb: 0 })); } }
  const hb = [124, -206];
  [[B.BB, B.R], [[-74, -186], B.R], [B.BB, [-78, -198]], [hb, B.F], [[118, -244], hb], [[118, -244], [112, -264]], [[112, -264], B.grip]].forEach(([a, b]) => S.push(st(lineP(a, b).map(T), 10 * s, COL.frame, { a: .88 })));
  S.push(st(qctrl(B.BB[0], B.BB[1], 70, -110, hb[0], hb[1], 10).map(T), 12 * s, COL.frame, { a: .88 }));
  S.push(st([[-112, -213], [-86, -217], [-56, -213]].map(T), 12 * s, COL.tyre, { a: .9 }));
  // pose
  const hip = [B.seat[0] - 2, B.seat[1] - 14], sh = [hip[0] + Math.sin(.12) * L.to, hip[1] - Math.cos(.12) * L.to], head = [sh[0] + 12, sh[1] - 48];
  const leg = (a, down) => { const p = down ? [down[0], down[1] - 12] : [B.BB[0] + Math.cos(a) * B.crank - 4, B.BB[1] + Math.sin(a) * B.crank - 12]; return ik(hip, p, L.th, L.sh, -1); };
  const [kN, aN] = leg(crank, o.footDown), [kF, aF] = leg(crank + Math.PI, null);
  const pedal = a => [B.BB[0] + Math.cos(a) * B.crank, B.BB[1] + Math.sin(a) * B.crank];
  S.push(st([B.BB, pedal(crank)].map(T), 6 * s, COL.tyre, { a: .7 }));
  // far leg, skirt, near leg; torso; head; near arm (dress in plum, darker on the far side)
  S.push(st([kF, aF].map(T), 18 * s, COL.dressD, { a: .7 }), st([aF, [aF[0] + 24, aF[1] + 6]].map(T), 11 * s, COL.tyre));
  S.push(mk([hip, [lerp(hip[0], kN[0], .5) + 8, lerp(hip[1], kN[1], .5)], [kN[0] + 18, kN[1] + 10]].map(T), 62 * s, COL.dress, { prof: 'brush', a: .82, rough: .25 }));
  S.push(st([kN, aN].map(T), 18 * s, COL.dress, { a: .85 }), st([aN, [aN[0] + 26, aN[1] + 7]].map(T), 12 * s, COL.tyre));
  S.push(mk([hip, lerp2(hip, sh, .5), sh].map(T), 48 * s, COL.dress, { prof: 'trunk', a: .88 }));
  const [eN, wN] = ik(sh, B.grip, L.up, L.fo, 1);
  // the scarf: the one vermilion thing; it streams behind her with speed
  const sp = o.speed || 0, sc = [sh[0] - 2, sh[1] + 6];
  const tail = [...Array(6)].map((_, i) => [sc[0] - i * (10 + 18 * sp), sc[1] + i * (16 - 12 * sp) + Math.sin(i * 1.3 + (o.t || 0) * 9) * 6 * sp]);
  S.push(mk([[sc[0] + 18, sc[1] - 4], sc, ...tail.slice(1)].map(T), 15 * s, COL.accent, { prof: 'tip', a: .9 }));
  const hd = T(head);
  S.push(mk(ring([0, 0], 13, 14).map(p => [hd[0] + p[0] * s, hd[1] + p[1] * s * 1.08]), 26 * s, COL.skin, { prof: 'even', a: .75, nb: 0 }));
  const back = o.lookBack ? -1 : 1;
  S.push(mk([[-26 * back, -18], [-8 * back, -32], [14 * back, -28]].map(p => [hd[0] + p[0] * s, hd[1] + p[1] * s]), 20 * s, COL.hair, { prof: 'even', a: .9 }));
  S.push(mk(ring([-24 * back, -24], 7, 10).map(p => [hd[0] + p[0] * s, hd[1] + p[1] * s]), 12 * s, COL.hair, { prof: 'even', a: .9, nb: 0 }));
  if (o.expr === 'proud') S.push(st([[6 * back, 12], [12 * back, 16], [18 * back, 12]].map(p => [hd[0] + p[0] * s, hd[1] + p[1] * s]), 3.2 * s, COL.dressD, { nb: 0 }));
  S.push(st([sh, eN, wN].map(T), 17 * s, COL.dress, { a: .88 }), mk(ring(wN, 4, 8).map(T), 12 * s, COL.skin, { prof: 'even', nb: 0 }));
  return { S, saddle: T([B.seat[0] - 20, B.seat[1] + 4]) };
}
function sonStrokes(x, y, s, o) {
  const S = [], ph = o.ph || 0, k = o.walk ?? 1, T = p => [x + p[0] * s, y + p[1] * s];
  const hip = [0, -236 + 4 * Math.abs(Math.sin(ph)) * k], sh = [6, hip[1] - 140];
  const legAt = sw => { const kn = [hip[0] + Math.sin(sw) * L.th, hip[1] + Math.cos(sw) * L.th]; return [kn, [kn[0] + Math.sin(sw * .6) * L.sh, Math.min(kn[1] + Math.cos(sw) * L.sh, -12)]]; };
  const [kF, aF] = legAt(-Math.sin(ph) * .42 * k), [kN, aN] = legAt(Math.sin(ph) * .42 * k);
  S.push(st([hip, kF, aF].map(T), 26 * s, COL.trousers, { a: .65 }), st([aF, [aF[0] + 28, aF[1] + 8]].map(T), 12 * s, COL.tyre));
  S.push(mk([hip, lerp2(hip, sh, .5), sh].map(T), 54 * s, COL.shirt, { prof: 'trunk', a: .85 }));
  S.push(st([hip, kN, aN].map(T), 26 * s, COL.trousers, { a: .85 }), st([aN, [aN[0] + 28, aN[1] + 8]].map(T), 12 * s, COL.tyre));
  const hd = T([sh[0] + 10, sh[1] - 50]);
  S.push(mk(ring([0, 0], 13, 14).map(p => [hd[0] + p[0] * s, hd[1] + p[1] * s * 1.08]), 26 * s, COL.skin, { prof: 'even', a: .75, nb: 0 }));
  S.push(mk([[-26, -14], [-6, -32], [18, -28]].map(p => [hd[0] + p[0] * s, hd[1] + p[1] * s]), 22 * s, COL.hair, { prof: 'even', a: .9 }));
  let e, w;
  if (o.hand) [e, w] = ik(sh, [(o.hand[0] - x) / s, (o.hand[1] - y) / s], L.up + 6, L.fo + 6, 1);
  else { const sw = Math.sin(ph) * .5 * k; e = [sh[0] - Math.sin(sw) * 40, sh[1] + 76]; w = [e[0] - Math.sin(sw) * 30 + 8, e[1] + 70]; }
  S.push(st([sh, e, w].map(T), 18 * s, COL.shirtD, { a: .9 }), mk(ring(w, 4, 8).map(T), 12 * s, COL.skin, { prof: 'even', nb: 0 }));
  return S;
}
const lerp2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

// —— states (shared beats) ——
function mumState(t) {
  const E = TL.events, tc = step12(t), x = bikeX(t), sp = clamp((bikeX(t + .05) - bikeX(t - .05)) / .1 / 250);
  const o = { crank: x * .022, wa: x / B.Rw, speed: sp, t: tc };
  const unsure = t < E.go + 1.2 ? 1 : 1 - seg(t, E.go + 1.2, E.go + 3);
  o.wobble = (0.06 * Math.sin(tc * 7.3) + 0.03 * Math.sin(tc * 13.1)) * unsure * (t < 2.6 || (t > 6.4 && t < 8.6) ? 1 : 0.2);
  if ((t >= 2.6 && t < 6.4) || (t >= 8.6 && t < 15.6) || t >= E.brake + 0.2) { o.footDown = [-40, 0]; o.wobble = 0.012; }
  if ((t >= 13.8 && t < 15.0) || t >= E.turn) o.lookBack = true;
  if (t >= E.smile) o.expr = 'proud';
  return { x, o };
}
function sonState(t, saddle) {
  const E = TL.events, tc = step12(t);
  if (t < 10.0) return null;
  if (t < 12.2) return { x: lerp(-160, 210, ss(seg(t, 10, 12.2))), ph: tc * 7, walk: 1 - seg(t, 11.8, 12.2), draw: seg(t, 10, 11.2) };
  if (t < E.go) return { x: 210, walk: 0, hand: t >= E.hand_on ? saddle : null };
  const [r0, r1] = E.release, holding = t < r0 + 0.6;
  return { x: holding ? saddle[0] - 70 : lerp(bikeX(r0 + .6) - 150, 980, ss(seg(t, r0 + .6, r1 + 1.6))), ph: tc * 9, walk: t < r1 + 1.4 ? 1 : 1 - seg(t, r1 + 1.4, r1 + 1.9), hand: holding ? saddle : null };
}

// —— the painted world (built once; strokes reveal when the frontier passes their x) ——
let WORLD = [];
function buildWorld() {
  const W0 = [];
  const add = (x, S, p0 = null) => W0.push({ x, S, p0 });   // p0: a fixed paint-in time instead of the frontier
  withSeed(11, () => {
    // the road: long horizontal brush strokes, in sections along x
    for (let x = -300; x < 2700; x += 120) {
      const S = [mk(qcurve(x, GY + 10, x + 170, GY + 12, rnd(-3, 3), 10), 44, COL.road, { prof: 'even', a: .55, nb: 5 }), mk(qcurve(x + 20, GY + 44, x + 180, GY + 46, rnd(-3, 3), 10), 30, COL.roadD, { prof: 'even', a: .45, nb: 4 }),
        mk(qcurve(x, GY - 6, x + 160, GY - 5, 0, 8), 6, COL.sage, { prof: 'even', a: .6, nb: 0 })];
      add(x, S);
    }
    // the far wall and the sky behind it, a section at a time
    for (let x = -300; x < 2700; x += 160) {
      const S = [mk(qcurve(x, GY - 210, x + 200, GY - 214, rnd(-4, 4), 10), 80, COL.stone, { prof: 'even', a: .42, nb: 6 }),
        mk(qcurve(x, GY - 252, x + 190, GY - 254, 0, 8), 7, COL.roadD, { prof: 'even', a: .7, nb: 0 }),
        mk(qcurve(x - 20, GY - 520 - rnd(0, 40), x + 220, GY - 540 - rnd(0, 40), rnd(-10, 10), 10), 150, COL.sky, { prof: 'even', a: .22, nb: 8 }),
        mk(qcurve(x, GY - 120, x + 200, GY - 118, 0, 8), 60, COL.sage, { prof: 'even', a: .45, nb: 6 })];
      add(x + 60, S);
    }
    // the foreground: meadow washes and grass flicks below the road, a high sky above, so the tall frame is one painted sheet
    for (let x = -300; x < 2700; x += 150) {
      const S = [];
      for (let k = 0; k < 4; k++) S.push(mk(qcurve(x - 20, GY + 110 + k * 90 + rnd(-10, 10), x + 200, GY + 112 + k * 90 + rnd(-10, 10), rnd(-6, 6), 10), 90 - k * 8, [COL.sage, COL.straw, COL.sage, '#c2c79a'][k], { prof: 'even', a: .32 - k * .04, nb: 7 }));
      for (let k = 0; k < 9; k++) { const gx = x + rnd(0, 170), gy = GY + 90 + rnd(0, 300); S.push(mk(qcurve(gx, gy, gx + rnd(-8, 8), gy - rnd(18, 42), rnd(-5, 5), 5), rnd(4, 7), pick([COL.deep, COL.sage, '#8ea860']), { prof: 'tip', a: .7, nb: 0 })); }
      S.push(mk(qcurve(x - 20, GY - 820 - rnd(0, 60), x + 220, GY - 840 - rnd(0, 60), rnd(-10, 10), 10), 170, COL.skyW, { prof: 'even', a: .18, nb: 8 }));
      S.push(mk(qcurve(x - 20, GY - 1080 - rnd(0, 60), x + 220, GY - 1100 - rnd(0, 60), rnd(-10, 10), 10), 160, COL.blue, { prof: 'even', a: .14, nb: 8 }));
      add(x + 80, S);
    }
    // trees: a trunk and a clump of leaf dabs
    for (const [x, sc] of [[-120, 1.1], [620, 1.25], [1180, 1.0], [1760, 1.3], [2320, 1.1]]) {
      const S = [mk(qcurve(x, GY - 130, x + 6, GY - 330 * sc, rnd(-8, 8), 10), 22 * sc, COL.trunk, { prof: 'trunk', a: .85 })];
      clump(S, x, GY - 400 * sc, 110 * sc, 70, [COL.sage, COL.deep, '#8ea860'], { sx: 1.1, sy: .9, l0: 14, l1: 30, w0: 9, w1: 16 });
      add(x, S);
    }
    // a bench
    { const x = 1500; add(x, [mk(qcurve(x, GY - 70, x + 190, GY - 70, 0, 8), 12, COL.trunk, { prof: 'even', a: .85 }), mk(qcurve(x, GY - 118, x + 190, GY - 120, 0, 8), 10, COL.trunk, { prof: 'even', a: .85 }),
      mk(lineP([x + 14, GY - 70], [x + 14, GY]), 8, COL.trunk, { prof: 'even' }), mk(lineP([x + 176, GY - 70], [x + 176, GY]), 8, COL.trunk, { prof: 'even' })]); }
  });
  WORLD = W0.map(o => ({ ...o, spr: sprite(o.S) }));
}

// —— the question: Amiri, three lines, written right → left over a paper halo ——
function question(t) {
  const Q = TL.question; if (t < Q.t0) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.font = "700 70px 'Amiri'"; ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const lines = Q.lines.map((l, i) => i === 0 ? '«' + l : i === Q.lines.length - 1 ? l + '»' : l), total = lines.reduce((a, l) => a + l.length, 0);
  let budget = seg(t, Q.t0, Q.t0 + Q.w) * total;
  lines.forEach((l, i) => {
    const y = 470 + i * 118, w = ctx.measureText(l).width, u = clamp(budget / l.length); budget -= l.length; if (u <= 0) return;
    ctx.save(); ctx.beginPath(); ctx.rect(W / 2 + w / 2 + 24 - (w + 48) * u, y - 80, (w + 48) * u, 160); ctx.clip();
    ctx.strokeStyle = rgba(PAPER, .9); ctx.lineWidth = 18; ctx.lineJoin = 'round'; ctx.filter = 'blur(5px)'; ctx.strokeText(l, W / 2, y); ctx.filter = 'none';
    ctx.fillStyle = rgba(INK, .82); ctx.fillText(l, W / 2, y); ctx.restore();
  });
  ctx.restore();
}

// —— camera: one continuous move (no cuts) ——
let CAMX, CAMY, CAMZ;
function camAt(t) {
  const bx = bikeX(t), stop = bikeX(TL.dur);
  const keys = [[0, bx + 120, GY - 110, 2.1], [3.6, bikeX(3.6) + 110, GY - 120, 1.9], [6.0, 520, GY - 220, .9], [9.6, 520, GY - 220, .9], [11.2, 330, GY - 170, 1.35],
    [16.6, 360, GY - 180, 1.4], [18.5, bikeX(18.5) + 100, GY - 200, 1.05], [23.6, bikeX(23.6) + 120, GY - 200, 1.0], [25.2, stop + 10, GY - 190, 1.45], [28.2, stop, GY - 195, 1.5], [30.4, (stop + 900) / 2, GY - 330, .52], [31.2, (stop + 900) / 2 + 10, GY - 330, .52], [33.2, stop - 40, GY - 560, .62], [38, stop - 40, GY - 570, .62]];   // held on her face for the stop, the look back, the smile; then out along the painted road
  let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
  const a = keys[i], b = keys[i + 1], u = eio(seg(t, a[0], b[0]));
  let x = lerp(a[1], b[1], u), y = lerp(a[2], b[2], u), z = Math.exp(lerp(Math.log(a[3]), Math.log(b[3]), u));
  if (t > 17.2 && t < 24.2) x = bikeX(t) + 110 + 20 * Math.sin(t);                  // the lateral dolly stays with her
  return [x, y, z];
}

function render(t) {
  const E = TL.events;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.drawImage(PAPER_IMG, 0, 0);
  const [cx, cy, z] = camAt(t);
  ctx.setTransform(z, 0, 0, z, W / 2 - cx * z, H / 2 - cy * z);
  // the world paints itself where the frontier has reached; the mist takes it back at the end
  const fr = frontier(t), back = bikeX(0) - 260 - 300 * seg(t, 4, 9);
  for (const o of WORLD) {
    if (o.x > fr + 40 || o.x < back - 400 && t < 17) continue;
    const p = seg(fr - o.x, -40, 260) * seg(o.x - back, -400, -100 + 300);
    if (p >= 1) ctx.drawImage(o.spr.cv, o.spr.x0, o.spr.y0); else if (p > 0) withSeed(1, () => drawList(ctx, o.S, p));
  }
  // figures, rebuilt on twos under fixed seeds (so the brush texture holds still between drawings)
  const m = mumState(t), mum = withSeed(77, () => mumStrokes(m.x, GY, 1, m.o)), so = sonState(t, mum.saddle);
  const sonS = so ? withSeed(88, () => sonStrokes(so.x, GY + 4, 1, so)) : null;
  if (sonS && !so.hand) drawList(ctx, sonS, so.draw ?? 1);
  drawList(ctx, mum.S, seg(t, -0.2, 0.9));
  if (sonS && so.hand) drawList(ctx, sonS, 1);
  // mist: from 29.8 the square washes back to paper, rising from the bottom edge; she and the bike stay (painted again on top)
  const mi = ss(seg(t, 30.8, 32.8));
  if (mi > 0) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const edge = lerp(H + 100, -200, mi);
    ctx.save(); ctx.beginPath(); ctx.moveTo(0, H + 10);
    for (let x = 0; x <= W; x += 30) ctx.lineTo(x, edge + 40 * Math.sin(x * .013 + t * 1.3) + 25 * Math.sin(x * .041));
    ctx.lineTo(W, H + 10); ctx.closePath(); ctx.clip();
    ctx.drawImage(PAPER_IMG, 0, 0); ctx.fillStyle = rgba(PAPER, .25); ctx.fillRect(0, 0, W, H);    // paper-coloured mist: the square is gone below the edge
    ctx.restore();
    ctx.setTransform(z, 0, 0, z, W / 2 - cx * z, H / 2 - cy * z);
    withSeed(5, () => drawS(ctx, mk(qcurve(m.x - 300, GY + 10, m.x + 300, GY + 12, 0, 12), 30, COL.road, { prof: 'even', a: .5, nb: 5 }), 1, null, mi));
    drawList(ctx, mum.S, 1);
  }
  question(t);
  const o = seg(t, TL.dur - TL.fade_out, TL.dur); if (o > 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = rgba(PAPER, o); ctx.fillRect(0, 0, W, H); }
}
window.render = render;
(async () => {
  TL = await (await fetch('timeline.json')).json(); window.DUR = TL.dur;
  PAPER_IMG = new Image(); PAPER_IMG.src = 'paper.jpg'; await PAPER_IMG.decode();
  await document.fonts.load("700 70px 'Amiri'", 'حكاية');
  buildWorld();
  // events for the mix: the bike's speed, the actions
  const E = TL.events, ev = [], sp = [];
  for (let t = 0; t <= TL.dur; t += 0.02) sp.push([+t.toFixed(2), +Math.max(0, (bikeX(t + .01) - bikeX(t - .01)) / .02).toFixed(1)]);
  ev.push({ t: 0, type: 'speed', data: sp }, { t: E.foot1, type: 'foot' }, { t: E.push2 - .25, type: 'pedal' }, { t: E.push2, type: 'push' }, { t: E.stop2, type: 'foot' }, { t: E.stop2 - .15, type: 'brake', k: .4 },
    { t: 10.0, type: 'steps', t1: 12.2, rate: 1.9 }, { t: E.hand_on, type: 'saddle' }, { t: E.look, type: 'cloth' }, { t: E.pedal, type: 'pedal' }, { t: E.pedal + .4, type: 'pedal' },
    { t: E.go, type: 'steps', t1: E.release[1] + 1.6, rate: 2.6, fade: 1 }, { t: E.release[0] + .6, type: 'cloth' }, { t: E.brake, type: 'brake', k: 1 }, { t: E.brake + .3, type: 'foot' }, { t: E.turn, type: 'cloth' }, { t: 4.0, type: 'paint', dur: 5 }, { t: 30.8, type: 'mist', dur: 2 });
  window.EV = ev;
  window.TEXTS = t => (t >= TL.question.t0 && t <= TL.question.t1 ? [{ id: 'q', text: TL.question.text, x0: 60, y0: 380, x1: 1020, y1: 760 }] : []);
  window.READY = true;
})();

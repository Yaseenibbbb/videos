// The mother on her step-through bicycle and her grown son, side view, facing right (flip with a negative x-scale).
// Every colour is a plate density [Federal Blue, Sunflower, Red]: with only the blue plate on, both read as complete blue silhouettes;
// Sunflower brings skin and light, Red brings her cardigan and the bike frame.
import { g, circle, ellipse, poly, blob, line, curve, ring, limb, ik, lerp2, inkA, over } from './draw.js';

export const PAL = {
  skin: [0, .3, 0], skinSh: [.14, .42, 0], cheek: [0, .2, .35], hair: [1, 0, .22], hairSh: [1, .3, .35], eye: [1, 0, .3], mouth: [.9, 0, .5],
  cardigan: [.35, 0, 1], cardiganSh: [.6, 0, 1], skirt: [1, 0, 0], skirtSh: [1, .25, .25], shoe: [1, 0, .5], sock: [.25, .3, 0],
  shirt: [.32, 0, 0], shirtSh: [.55, 0, 0], trousers: [.9, .35, 0], trousersSh: [1, .5, .15],
  frame: [.55, 0, 1], tire: [1, 0, .3], rim: [.6, 0, .2], spoke: [.55, 0, 0], metal: [.4, 0, 0], saddle: [1, .35, .4], shadow: [.3, 0, 0],
};
const P = PAL;
export const L = { thigh: 112, shin: 106, ankleH: 12, torso: 132, upper: 80, fore: 74 };

// ———— heads (side view, facing right). expr: calm | focus | smile | proud ————
export function headMum(x, y, expr = 'calm', back = false) {
  g.save(); g.translate(x, y); if (back) g.scale(-1, 1);
  blob([[-2, -32], [17, -29], [26, -16], [27, -4], [34, 2], [28, 9], [29, 18], [22, 27], [6, 31], [-10, 27], [-22, 15], [-27, -2], [-21, -22]], P.skin);
  ellipse(-6, 4, 6, 8, 0, P.skinSh);
  if (expr === 'smile' || expr === 'proud') circle(13, 13, 6, P.cheek);
  // hair: swept back into a bun
  blob([[-27, 10], [-31, -10], [-24, -29], [-6, -38], [14, -36], [26, -27], [20, -22], [6, -24], [-4, -18], [-10, -6], [-14, 6], [-20, 14]], P.hair);
  circle(-30, -26, 15, P.hair); circle(-34, -30, 7, P.hairSh);
  // eye, brow, mouth
  if (expr === 'proud') line([[10, -6], [15, -9], [20, -6]], 3, P.eye); else circle(15, -5, 3.2, P.eye);
  line([[9, -14], [20, -15]], 2.6, P.hair);
  if (expr === 'smile' || expr === 'proud') curve([[13, 16], [19, 20], [25, 15]], 3, P.mouth);
  else if (expr === 'focus') line([[16, 17], [24, 17]], 2.6, P.mouth);
  else curve([[15, 17], [20, 18], [24, 16]], 2.6, P.mouth);
  g.restore();
}
export function headSon(x, y, expr = 'calm') {
  g.save(); g.translate(x, y);
  blob([[-2, -33], [18, -30], [27, -17], [28, -5], [35, 1], [29, 9], [29, 19], [21, 29], [4, 33], [-12, 28], [-24, 15], [-28, -3], [-22, -23]], P.skin);
  ellipse(-7, 4, 6, 9, 0, P.skinSh);
  blob([[-28, 6], [-30, -14], [-20, -33], [0, -40], [20, -36], [30, -24], [24, -20], [10, -22], [0, -18], [-10, -10], [-16, 2]], P.hair);
  circle(16, -5, 3.2, P.eye); line([[10, -14], [22, -15]], 3, P.hair);
  curve([[15, 17], [20, expr === 'smile' ? 21 : 18], [25, 16]], 2.6, P.mouth);
  g.restore();
}

// ———— the bicycle (step-through frame, no basket) ————
export const BIKE = { Rw: 88, R: [-158, -88], F: [158, -88], BB: [-14, -82], crank: 34, seat: [-82, -262], grip: [58, -300] };
function wheel(c, a) {
  const [x, y] = c, R = BIKE.Rw;
  ring(x, y, R - 7, 12, P.tire); ring(x, y, R - 15, 3, P.rim);
  for (let i = 0; i < 10; i++) { const t = a + i * Math.PI / 5; line([[x + Math.cos(t) * 7, y + Math.sin(t) * 7], [x + Math.cos(t + .3) * (R - 15), y + Math.sin(t + .3) * (R - 15)]], 1.8, P.spoke); }
  circle(x, y, 8, P.metal);
}
function bikeBack(crank, wa) {
  const B = BIKE, pf = [B.BB[0] + Math.cos(crank + Math.PI) * B.crank, B.BB[1] + Math.sin(crank + Math.PI) * B.crank];
  line([B.BB, pf], 8, P.metal); line([[pf[0] - 12, pf[1]], [pf[0] + 12, pf[1]]], 7, P.metal);
  wheel(B.R, wa); wheel(B.F, wa);
}
function bikeFrame() {
  const B = BIKE, fw = 13, ht = [118, -244], hb = [124, -206];
  g.beginPath(); g.arc(B.R[0], B.R[1], B.Rw + 8, Math.PI * 1.08, Math.PI * 1.8); g.lineWidth = 6; g.lineCap = 'round'; g.strokeStyle = inkA(P.frame); g.stroke();
  line([B.BB, B.R], fw - 3, P.frame); line([[-74, -236], B.R], fw - 4, P.frame);
  line([B.BB, [-78, -252]], fw, P.frame);
  curve([B.BB, [30, -110], [96, -170], hb], fw + 1, P.frame);            // the low, curved step-through tube
  line([ht, hb], fw + 3, P.frame);
  curve([hb, [140, -150], B.F], fw - 3, P.frame);
  line([[-78, -252], B.seat], 7, P.metal);
  blob([[-114, -276], [-58, -276], [-48, -268], [-66, -260], [-110, -260]], P.saddle);
  line([ht, [114, -292]], 8, P.metal); curve([[114, -292], [98, -300], [76, -302], B.grip], 8, P.metal);
}
function crankFront(crank) {
  const B = BIKE, pn = [B.BB[0] + Math.cos(crank) * B.crank, B.BB[1] + Math.sin(crank) * B.crank];
  circle(B.BB[0], B.BB[1], 22, P.metal); circle(B.BB[0], B.BB[1], 15, P.frame);
  line([B.BB, pn], 8, P.metal); line([[pn[0] - 12, pn[1]], [pn[0] + 12, pn[1]]], 7, P.metal);
}
function foot(a, toe, c) { blob([[a[0] - 10, a[1] - 6], [toe[0] - 4, toe[1] - 8], [toe[0] + 6, toe[1]], [a[0] - 12, a[1] + 8]], c); }

// riding (or stopped) pose: joints in bike space. o: crank, footDown [x, y] (near foot on the ground), lean, grip
export function poseRide(o = {}) {
  const B = BIKE, crank = o.crank || 0, lean = o.lean ?? .12;
  const hip = [B.seat[0] - 2, B.seat[1] - 14];
  const sh = [hip[0] + Math.sin(lean) * L.torso, hip[1] - Math.cos(lean) * L.torso];
  const J = { hip, sh, head: [sh[0] + 12, sh[1] - 48] };
  const leg = (a, key, bend = -1) => {
    const p = [B.BB[0] + Math.cos(a) * B.crank, B.BB[1] + Math.sin(a) * B.crank], ank = [p[0] - 4, p[1] - 12];
    const [k, e] = ik(hip, ank, L.thigh, L.shin, bend); J['knee' + key] = k; J['ankle' + key] = e; J['toe' + key] = [e[0] + 26, e[1] + 10];
  };
  leg(crank, 'N'); leg(crank + Math.PI, 'F');
  if (o.footDown) { const [k, e] = ik(hip, [o.footDown[0], o.footDown[1] - L.ankleH], L.thigh, L.shin, -1); J.kneeN = k; J.ankleN = e; J.toeN = [e[0] + 26, e[1] + 10]; }
  if (o.footDownF) { const [k, e] = ik(hip, [o.footDownF[0], o.footDownF[1] - L.ankleH], L.thigh, L.shin, -1); J.kneeF = k; J.ankleF = e; J.toeF = [e[0] + 26, e[1] + 10]; }
  const [eN, wN] = ik(sh, B.grip, L.upper, L.fore, 1); J.elbowN = eN; J.wristN = wN;
  const [eF, wF] = ik([sh[0] - 4, sh[1] + 2], [B.grip[0] - 6, B.grip[1] - 2], L.upper, L.fore, 1); J.elbowF = eF; J.wristF = wF;
  return J;
}
// the mother on the bike. x, y = ground point between the wheels; s = scale; o: crank, wa, footDown, wobble (lean of the whole bike), expr, lookBack
export function mumBike(x, y, s, o = {}) {
  const crank = o.crank || 0, wa = o.wa ?? crank * 1.7;
  g.save(); g.translate(x, y); g.scale(s, s);
  over(() => { g.beginPath(); g.ellipse(0, 4, 240, 11, 0, 0, Math.PI * 2); g.fillStyle = inkA(P.shadow); g.fill(); });
  g.rotate(o.wobble || 0);
  const J = poseRide(o);
  bikeBack(crank, wa);
  // far leg (under the skirt hem), far arm
  limb(J.sh, J.elbowF, 22, P.cardiganSh); limb(J.elbowF, J.wristF, 19, P.cardiganSh); circle(J.wristF[0], J.wristF[1], 9, P.skinSh);
  limb(J.kneeF, J.ankleF, 20, P.sock); foot(J.ankleF, J.toeF, P.shoe);
  bikeFrame();
  // the skirt: from the hip over both knees, a soft A-line
  const kn = J.kneeN, kf = J.kneeF;
  blob([[J.hip[0] - 30, J.hip[1] + 8], [J.hip[0] - 18, J.hip[1] - 22], [J.hip[0] + 24, J.hip[1] - 18], [Math.max(kn[0], kf[0]) + 26, Math.min(kn[1], kf[1]) - 6],
    [Math.max(kn[0], kf[0]) + 30, Math.max(kn[1], kf[1]) + 34], [J.hip[0] + 30, Math.max(kn[1], kf[1]) + 46], [J.hip[0] - 34, J.hip[1] + 70]], P.skirt);
  limb(J.kneeN, J.ankleN, 21, P.sock); foot(J.ankleN, J.toeN, P.shoe);
  crankFront(crank);
  // the cardigan (torso), head, near arm
  const a = Math.atan2(J.sh[1] - J.hip[1], J.sh[0] - J.hip[0]) + Math.PI / 2, Lt = Math.hypot(J.sh[0] - J.hip[0], J.sh[1] - J.hip[1]);
  g.save(); g.translate(J.hip[0], J.hip[1]); g.rotate(a);
  blob([[-26, 8], [-28, -Lt * .5], [-22, -Lt + 4], [-6, -Lt - 6], [16, -Lt - 2], [28, -Lt * .66], [30, -Lt * .3], [26, 10]], P.cardigan);
  line([[18, -Lt + 6], [20, 4]], 3, P.cardiganSh);
  g.restore();
  headMum(J.head[0], J.head[1], o.expr || 'calm', o.lookBack);
  limb(J.sh, J.elbowN, 23, P.cardigan); limb(J.elbowN, J.wristN, 20, P.cardigan); circle(J.wristN[0], J.wristN[1], 10, P.skin);
  g.restore();
  return { J, saddle: [x + (BIKE.seat[0] - 20) * s, y + (BIKE.seat[1] + 4) * s] };
}
// the son walking (phase ph), facing right; o.hand = world point his near hand holds (the saddle), or none
export function son(x, y, s, o = {}) {
  const ph = o.ph || 0, k = o.walk ?? 1;
  g.save(); g.translate(x, y); g.scale(s, s);
  over(() => { g.beginPath(); g.ellipse(0, 4, 70, 9, 0, 0, Math.PI * 2); g.fillStyle = inkA(P.shadow); g.fill(); });
  const hip = [0, -(L.thigh + L.shin + L.ankleH) - 6 + 4 * Math.abs(Math.sin(ph)) * k], sh = [6, hip[1] - L.torso - 8];
  const legAt = sw => { const kn = [hip[0] + Math.sin(sw) * L.thigh, hip[1] + Math.cos(sw) * L.thigh]; const an = [kn[0] + Math.sin(sw - .35 * Math.max(0, -Math.sin(ph))) * L.shin, kn[1] + Math.cos(sw) * L.shin]; return [kn, [an[0], Math.min(an[1], -L.ankleH)]]; };
  const [kF, aF] = legAt(-Math.sin(ph) * .42 * k), [kN, aN] = legAt(Math.sin(ph) * .42 * k);
  const armSw = Math.sin(ph) * .5 * k;
  const eF = [sh[0] + Math.sin(armSw) * 40 - 4, sh[1] + 76], wF = [eF[0] + Math.sin(armSw) * 30 + 6, eF[1] + 70];
  limb(sh, eF, 22, P.shirtSh); limb(eF, wF, 19, P.shirtSh); circle(wF[0], wF[1], 9, P.skinSh);
  limb(hip, kF, 30, P.trousersSh); limb(kF, aF, 26, P.trousersSh); foot(aF, [aF[0] + 30, aF[1] + 10], P.shoe);
  blob([[-24, hip[1] + 8], [-28, sh[1] + 30], [-14, sh[1] - 4], [18, sh[1] - 2], [30, sh[1] + 30], [26, hip[1] + 10]], P.shirt);
  limb(hip, kN, 30, P.trousers); limb(kN, aN, 26, P.trousers); foot(aN, [aN[0] + 30, aN[1] + 10], P.shoe);
  headSon(sh[0] + 10, sh[1] - 50, o.expr);
  let eN, wN;
  if (o.hand) { const lh = [(o.hand[0] - x) / s, (o.hand[1] - y) / s]; [eN, wN] = ik(sh, lh, L.upper + 6, L.fore + 6, 1); }
  else { eN = [sh[0] - Math.sin(armSw) * 40 + 4, sh[1] + 76]; wN = [eN[0] - Math.sin(armSw) * 30 + 8, eN[1] + 70]; }
  limb(sh, eN, 23, P.shirt); limb(eN, wN, 20, P.shirt); circle(wN[0], wN[1], 10, P.skin);
  g.restore();
}

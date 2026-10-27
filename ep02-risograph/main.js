import { makeRiso } from './riso.js';
import { W, H, plate } from './draw.js';
await document.fonts.load("600 66px 'Readex Pro'", 'حكاية');
const { renderFilm, DUR, EV, TEXTS } = await import('./film.js');
const print = makeRiso(document.getElementById('c'), W, H);
window.DUR = DUR; window.EV = EV; window.TEXTS = TEXTS;
window.render = t => print(plate, renderFilm(t));
window.READY = true;

import { makeRiso } from './riso.js';
import { W, H, plate } from './draw.js';
await document.fonts.load("600 66px 'Readex Pro'", 'حكاية');
const { renderFilm, DUR, EV, TEXTS } = await import('./film.js');
const print = makeRiso(document.getElementById('c'), W, H);
// ?from=a&to=b renders only that stretch (to re-render part of the film and splice it in)
const Q = new URLSearchParams(location.search), from = +(Q.get('from') ?? 0), to = +(Q.get('to') ?? DUR);
window.DUR = to - from; window.EV = EV; window.TEXTS = TEXTS;
window.render = t => print(plate, renderFilm(t + from));
window.READY = true;

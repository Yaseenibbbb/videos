"""Mix: the jazz-waltz score + pen on cold-press paper (one burst per stroke, band-passed 1.6–7.5 kHz with fibre grain) + wet-brush blooms
+ page turns + the place's ambience (a kitchen at noon, J-cut a bar before the colour; a wall clock years later; tea glasses today).
Foley high-passed at ~90 Hz. LIB=<library> python mix.py → out/mix.wav"""
import sys, os, json, numpy as np, soundfile as sf
from scipy.ndimage import uniform_filter1d
LIB = os.environ['LIB']; sys.path.insert(0, LIB)
from core.audio.sfx import SR, add, bp, lp, hp, limit
HERE = os.path.dirname(os.path.abspath(__file__))
MUSIC = float(os.environ.get('MUSIC', '0'))   # 0: effects and ambience only → out/mix.wav (the main cut); 1: with the score → out/mix-music.wav
OUTWAV = 'mix-music.wav' if MUSIC else 'mix.wav'
E = json.load(open(os.path.join(HERE, 'events.json'))); FILM = E['dur']; EV = E['ev']
DUR = FILM + 4.5; N = int(DUR * SR)   # a silent tail: ffmpeg 6.1's loudnorm holds back its last ~3 s, which mux.sh's length check would read as a cut-off file
rng = np.random.default_rng(21)
def nz(d): return rng.standard_normal(max(1, int(round(d * SR))))
def T(d): return np.arange(int(round(d * SR))) / SR
def fade(x, a=.005, b=.02):
    n = len(x); ia, ib = min(n, int(a * SR)), min(n, int(b * SR))
    if ia: x[:ia] *= np.linspace(0, 1, ia)
    if ib: x[-ib:] *= np.linspace(1, 0, ib)
    return x
def pen(d, v=1.0):   # one fineliner stroke: band-passed hiss + fibre grain clicks
    n = nz(d); g = (rng.random(len(n)) < 0.012) * rng.standard_normal(len(n)) * 3
    x = bp(n, 1600, 7500, 2) * (0.6 + 0.4 * uniform_filter1d(np.abs(nz(d)), 300)) + bp(g, 2500, 9000)
    e = np.sin(np.linspace(0, np.pi, len(n))) ** .6
    return fade(x * e * 0.05 * v)
def strokes(d, n, v=1.0):   # a group drawn in order: n bursts over d seconds
    out = np.zeros(int(d * SR) + 1); t = 0.0; L = d / max(1, n)
    for k in range(n):
        dd = max(.05, L * (0.55 + 0.4 * rng.random())); s = pen(dd, v * (0.75 + 0.4 * rng.random())); i = int(t * SR); out[i:i + len(s)] += s[:len(out) - i]; t += L
    return out
def brush(d, v=1.0):   # a wet brush bloom: soft low-passed "shhh" with bristle grain
    n = nz(d); x = lp(n, 1500) * 0.5 + bp(n, 1500, 4500) * 0.15
    e = np.interp(T(d), [0, .1 * d, .5 * d, d], [0, 1, .7, 0])[:len(n)]
    return fade(x * e * uniform_filter1d(np.abs(nz(d)), 600)[:len(n)] * 0.2 * v, .03, .1)
def page_turn(d=0.8, v=1.0):
    out = np.zeros(int((d + 0.4) * SR))
    lift = hp(nz(0.3), 700) * np.linspace(0, 1, int(0.3 * SR)) * 0.15
    wh = bp(nz(0.5), 300, 4000) * np.sin(np.linspace(0, np.pi, int(0.5 * SR))) ** 1.5 * 0.3
    ft = T(0.25); flap = lp(nz(0.25), 1500) * np.exp(-ft / 0.03) * 0.5 + np.sin(2 * np.pi * 90 * ft) * np.exp(-ft / 0.05) * 0.25
    for x, at in [(lift, 0.0), (wh, 0.15), (flap, d - 0.1)]: i = int(at * SR); out[i:i + len(x)] += x[:len(out) - i]
    return out * v
def clink(f=3200, v=1.0):
    t = T(0.7); return fade((np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.4 * t)) * np.exp(-t / 0.14) * 0.05 * v + bp(nz(0.7), 4000, 9000) * np.exp(-t / 0.004) * 0.08 * v)
def tick(v=1.0):
    t = T(0.04); return fade(bp(nz(0.04), 2500, 7000) * np.exp(-t / 0.006) * 0.08 * v, .0005, .01)
buf = np.zeros((N, 2)); amb = np.zeros((N, 2))
def put(x, at, g=1.0, pan=0.0, b=None): add(buf if b is None else b, np.asarray(x, np.float64), at, g, pan)
for e in EV:
    t, ty = e['t'], e['type']
    if ty == 'pen': put(strokes(e['dur'], max(2, min(30, e['n'])), 1.0), t, 1.0, e.get('pan', 0) * .6)
    elif ty == 'bloom': put(brush(min(3.0, e['dur'])), t, 1.0, 0.1)
    elif ty == 'page': put(page_turn(e['dur'], 1.0 if not e.get('last') else 1.2), t, 0.45, -0.1)
    elif ty == 'mark': put(strokes(0.3, 2, 1.2), t, 1.0, 0.5)
    elif ty == 'card': put(strokes(min(1.4, e.get('w', 0.8)), 8, 0.7), t, 1.0, 0.0)
    elif ty == 'note': put(strokes(0.9, 5, 0.6), t, 1.0, -0.5)
# the kitchen at noon (page one): a pot simmering, a far street through the window, J-cut a bar before the colour
t0, t1 = 12.9 - 1.36, 20.75
d = t1 - t0; tt = T(d)
sim = lp(nz(d), 600)[:len(tt)] * 0.012 * (1 + 0.5 * np.sin(2 * np.pi * 0.7 * tt))
street = lp(np.cumsum(nz(d)) * 0.0004, 300)[:len(tt)]; street -= uniform_filter1d(street, 4000)
x = (sim + street) * np.interp(tt, [0, 1.2, d - .6, d], [0, 1, 1, 0])
add(amb, x.astype(np.float64), t0, 1.0, 0.3)
# years later: a wall clock; today: tea glasses on saucers
tc = 21.8
while tc < 31.3: add(amb, tick(0.8), tc, 1.0, 0.6); tc += 1.0
for t, f in [(36.6, 3300), (37.0, 3700), (41.5, 3500), (46.2, 3300)]: add(buf, clink(f), t, 1.0, -0.1)
air = hp(nz(DUR), 3000) * 0.002; amb[:len(air), 0] += air[:N]; amb[:len(air), 1] += np.roll(air, 1800)[:N]
cues = json.load(open(os.path.join(HERE, 'music', 'cues.json')))
s0, s1 = cues['silence']; gate = np.ones(N); gate[int(s0 * SR):int(s1 * SR)] = 0.0
amb *= gate[:, None]; buf[:, 0] = hp(buf[:, 0], 90); buf[:, 1] = hp(buf[:, 1], 90)
mus, _ = sf.read(os.path.join(HERE, 'music', 'score.wav')); m = np.zeros((N, 2)); n = min(N, len(mus)); m[:n] = mus[:n]
mix = m * MUSIC * 0.55 + buf * 1.0 + amb * 1.0
e_ = int(FILM * SR); fo = int(0.6 * SR); mix[e_ - fo:e_] *= np.linspace(1, 0, fo)[:, None]; mix[e_:] = 0
mix = limit(mix.astype(np.float32), .95)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', OUTWAV), mix, SR)
def db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
for i in range(0, int(FILM), 4):
    sl = slice(i * SR, (i + 4) * SR); print(f'{i:2d}s  music {db(m[sl] * .55):6.1f}  foley {db(buf[sl]):6.1f}  amb {db(amb[sl]):6.1f}')
print('mix.wav', mix.shape, 'peak', np.abs(mix).max())

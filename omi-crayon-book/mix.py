"""Mix: the score + material foley (crayon on toothy paper, colouring swishes, wooden blocks, bowls, page turns, the wet brush)
+ room ambience (birds through the window on the first pages, a distant clock later). No voice: the words are printed on the page.
LIB=<library> python mix.py → out/mix.wav"""
import sys, os, json, numpy as np, soundfile as sf
from scipy.ndimage import uniform_filter1d
LIB = os.environ['LIB']; sys.path.insert(0, LIB)
from core.audio.sfx import SR, add, bp, lp, hp, limit
HERE = os.path.dirname(os.path.abspath(__file__))
MUSIC = float(os.environ.get('MUSIC', '0'))   # 0: effects and ambience only → out/mix.wav (the main cut); 1: with the score → out/mix-music.wav
OUTWAV = 'mix-music.wav' if MUSIC else 'mix.wav'
E = json.load(open(os.path.join(HERE, 'events.json'))); FILM = E['dur']; EV = E['ev']
DUR = FILM + 4.5; N = int(DUR * SR)   # a silent tail: ffmpeg 6.1's loudnorm holds back its last ~3 s, which mux.sh's length check would read as a cut-off file
tt = np.arange(N) / SR
rng = np.random.default_rng(12)
def nz(d): return rng.standard_normal(int(round(d * SR)))
def T(d): return np.arange(int(round(d * SR))) / SR
def fade(x, a=.01, b=.03):
    n = len(x); ia, ib = min(n, int(a * SR)), min(n, int(b * SR))
    if ia: x[:ia] *= np.linspace(0, 1, ia)
    if ib: x[-ib:] *= np.linspace(1, 0, ib)
    return x
def envelope(d, pts):
    k = np.array(pts, float); return np.interp(T(d), k[:, 0] * d, k[:, 1])
# crayon on paper: stick-slip friction = band-passed noise × irregular grain; faster = denser and brighter
def crayon(d, speed=1.0, v=1.0):
    n = nz(d); rate = int(SR / (70 + 90 * speed))
    grain = uniform_filter1d((rng.random(len(n) // rate + 2) ** 3).repeat(rate)[:len(n)], rate // 3 + 1)
    x = bp(n, 1400 + 600 * speed, 6500, 2) * (0.35 + grain * 1.6) + bp(n, 300, 900, 1) * 0.15
    return fade(x * envelope(d, [(0, 0), (.08, 1), (.85, .9), (1, 0)]) * v * 0.22, .01, .04)
def scribble(d, rate=6.5, v=1.0):   # colouring: one short scratch per pass of the zig-zag
    out = np.zeros(int(d * SR)); t = 0.0
    while t < d - 0.08:
        L = 1 / rate * (0.8 + 0.4 * rng.random()); s = crayon(min(L, d - t), 1.3, v * (0.7 + 0.3 * rng.random()))
        i = int(t * SR); out[i:i + len(s)] += s[:len(out) - i]; t += L
    return out
def write(d, v=1.0):   # printing words: little clusters
    out = np.zeros(int(d * SR)); t = 0.0
    while t < d - 0.1:
        L = 0.07 + 0.1 * rng.random(); s = crayon(L, 0.8, v); i = int(t * SR); out[i:i + len(s)] += s[:len(out) - i]; t += L + 0.03 * rng.random()
    return out
def blink(v=1.0):
    t = T(0.09); return fade(np.sin(2 * np.pi * (1500 - 5000 * t) * t) * np.exp(-t / 0.02) * 0.25 * v, .001, .02)
def pat(v=1.0):
    t = T(0.12); return fade(lp(nz(0.12), 500) * np.exp(-t / 0.025) * 0.5 * v + np.sin(2 * np.pi * 140 * t) * np.exp(-t / 0.03) * 0.2 * v)
def wood(v=1.0, f=780):   # a toy block set down: hollow wooden clack
    t = T(0.2); return fade((np.sin(2 * np.pi * f * t) * np.exp(-t / 0.03) + 0.5 * np.sin(2 * np.pi * f * 2.7 * t) * np.exp(-t / 0.012) + bp(nz(0.2), 800, 4000) * np.exp(-t / 0.006) * 0.6) * 0.3 * v)
def clink(v=1.0, f=2400):   # a bowl touching the table
    t = T(0.8); return fade((np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t / 0.18) * 0.08 * v + bp(nz(0.8), 3000, 8000) * np.exp(-t / 0.004) * 0.1 * v)
def swish(d=0.4, v=1.0):
    n = nz(d); e = np.sin(np.linspace(0, np.pi, len(n))) ** 2
    return lp(bp(n, 250, 2500), 2200) * e * 0.35 * v
def plip(v=1.0):   # the brush dipped in water
    t = T(0.25); x = np.sin(2 * np.pi * np.cumsum(900 + 1400 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.05)
    return fade(x * 0.25 * v + bp(nz(0.25), 2000, 7000) * np.exp(-t / 0.02) * 0.08 * v)
def brush(d, v=1.0):   # wet bristles across paper
    n = nz(d); wet = lp(n, 1800) * 0.5 + bp(n, 1800, 5000) * 0.18
    grain = uniform_filter1d(np.abs(rng.standard_normal(len(n))), 400) * 0.6 + 0.7
    return fade(wet * grain * envelope(d, [(0, 0), (.06, .9), (.3, 1), (.8, .85), (1, 0)]) * 0.22 * v, .03, .1)
def page_turn(d=0.8, v=1.0):
    out = np.zeros(int((d + 0.4) * SR))
    lift = hp(nz(0.3), 700) * envelope(0.3, [(0, 0), (.5, .6), (1, .2)]) * 0.18
    wh = bp(nz(0.5), 300, 4000) * np.sin(np.linspace(0, np.pi, int(0.5 * SR))) ** 1.5 * 0.35
    ft = T(0.25); flap = lp(nz(0.25), 1500) * np.exp(-ft / 0.03) * 0.6 + np.sin(2 * np.pi * 90 * ft) * np.exp(-ft / 0.05) * 0.3
    for x, at in [(lift, 0.0), (wh, 0.15), (flap, d - 0.1)]:
        i = int(at * SR); out[i:i + len(x)] += x[:len(out) - i]
    return out * v
def paper_rustle(d=0.6, v=1.0):
    n = nz(d); cr = (rng.random(len(n)) < 0.004) * rng.standard_normal(len(n)) * 3
    return fade((hp(n, 900) * 0.25 + bp(cr, 1500, 8000)) * envelope(d, [(0, 0), (.2, 1), (1, 0)]) * v * 0.25)
def chirp(v=1.0):   # a bird through the window
    t = T(0.12); f = 3200 + 1400 * np.sin(np.pi * t / 0.12); return fade(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.12) * 0.05 * v)
def tick(v=1.0, hi=True):
    t = T(0.04); return fade(bp(nz(0.04), 2500 if hi else 1800, 7000) * np.exp(-t / 0.006) * 0.1 * v, .0005, .01)

buf = np.zeros((N, 2)); amb = np.zeros((N, 2))
def put(x, at, g=1.0, pan=0.0, b=None): add(buf if b is None else b, x.astype(np.float64), at, g, pan)
for e in EV:
    t, ty, pan = e['t'], e['type'], e.get('pan', 0.0)
    if ty == 'draw': put(crayon(e['dur'], 1.1), t, 0.9, pan)
    elif ty == 'scribble': put(scribble(e['dur']), t, 0.7, pan)
    elif ty == 'catch': put(pat(0.6), t, 1.0, pan); put(swish(0.3, 0.25), t + 0.3, 1.0, pan)
    elif ty == 'block': put(wood(0.9, 760 + 50 * e['i']), t, 1.0, pan)
    elif ty == 'bowl': put(clink(1.0, 2200 + 260 * e['i']), t, 1.0, pan)
    elif ty == 'pop': put(blink(0.8), t, 1.0, pan); put(pat(0.5), t + 0.05, 1.0, pan)
    elif ty == 'page': put(page_turn(e['dur']), t, 0.45, -0.1)
    elif ty == 'mark': put(crayon(0.3, 1.6), t, 0.9, pan)
    elif ty == 'loop': put(crayon(0.45, 1.2, 0.8), t, 0.8, pan)
    elif ty == 'dip': put(plip(), t, 0.9, 0.5)
    elif ty == 'brush':
        d = e['dur'] + 0.25; x = brush(d); p0, p1 = (-0.85, 0.85) if e['dir'] > 0 else (0.85, -0.85)
        L = len(x); s = int(t * SR); pn = np.linspace(p0, p1, L)
        l, r = np.cos((pn + 1) * np.pi / 4) * 1.414, np.sin((pn + 1) * np.pi / 4) * 1.414
        e2 = min(N, s + L); buf[s:e2, 0] += (x * l)[:e2 - s]; buf[s:e2, 1] += (x * r)[:e2 - s]
    elif ty == 'card': put(write(min(1.2, 0.3 + 0.02 * 40)), t, 0.5, 0.0)
    elif ty == 'pullout': put(paper_rustle(0.9, 0.9), t, 1.0, 0)
    elif ty == 'bookdown': put(pat(0.9), t + 0.5, 1.0, 0.2); put(swish(0.4, 0.3), t + 0.15, 1.0, 0.2)
# ambience: birds through the window while it is daytime on pages one and two; a distant clock on page three and the desk
k = 0
for t0 in np.arange(1.2, 31.0, 0.9):
    if rng.random() < 0.45: add(amb, chirp(0.7 + 0.3 * rng.random()), t0 + 0.3 * rng.random(), 1.0, 0.6)
tc = 33.8
while tc < FILM - 0.3: add(amb, tick(0.7, k % 2 == 0), tc, 1.0, 0.5); tc += 1.0; k += 1
air = hp(nz(DUR), 3000) * 0.0025
amb[:, 0] += air; amb[:, 1] += np.roll(air, 2000)
cues = json.load(open(os.path.join(HERE, 'music', 'cues.json')))
s0, s1 = cues['silence']
gate = np.ones(N); gate[int(s0 * SR):int(s1 * SR)] = 0.15
amb *= gate[:, None]
mus, _ = sf.read(os.path.join(HERE, 'music', 'score.wav'))
m = np.zeros((N, 2)); n = min(N, len(mus)); m[:n] = mus[:n]
mix = m * MUSIC * 0.55 + buf * 1.0 + amb * 1.0
e_ = int(FILM * SR); fo = int(0.6 * SR); mix[e_ - fo:e_] *= np.linspace(1, 0, fo)[:, None]; mix[e_:] = 0
mix = limit(mix.astype(np.float32), .95)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', OUTWAV), mix, SR)
def db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
for i in range(0, int(FILM), 4):
    sl = slice(i * SR, (i + 4) * SR); print(f'{i:2d}s  music {db(m[sl] * .55):6.1f}  foley {db(buf[sl]):6.1f}  amb {db(amb[sl]):6.1f}')
print('mix.wav', mix.shape, 'peak', np.abs(mix).max())

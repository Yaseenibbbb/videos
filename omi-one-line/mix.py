"""Mix: the pen on paper (synthesised from the pen's speed: the film's main sound) + first touch + the ink pooling at the stop
+ small foley (blocks, bowls, tea glasses, the book) + room tone + the solo clarinet. No voice: the words are on screen.
LIB=<library> python mix.py → out/mix.wav (48 kHz stereo; loudness is left to mux.sh's two-pass loudnorm)"""
import sys, os, json, numpy as np, soundfile as sf
LIB = os.environ['LIB']; sys.path.insert(0, LIB)
from core.audio.sfx import SR, add, bp, lp, hp, limit
HERE = os.path.dirname(os.path.abspath(__file__))
MUSIC = float(os.environ.get('MUSIC', '0'))   # 0: effects and ambience only → out/mix.wav (the main cut); 1: with the score → out/mix-music.wav
OUTWAV = 'mix-music.wav' if MUSIC else 'mix.wav'
E = json.load(open(os.path.join(HERE, 'events.json'))); ev = E['ev']
DUR = E['dur'] + 4.5; N = int(DUR * SR)   # 4 s of silent tail: ffmpeg 6.1's loudnorm holds back its last ~3 s, which mux.sh's length check would read as a cut-off file (mux trims with -shortest)
rng = np.random.default_rng(11)
get = lambda typ: [e for e in ev if e['type'] == typ]
seg = {e['id']: (e['t'], e['t1']) for e in get('seg')}
track = get('track')[0]['data']          # [t, speed (screen-weighted), screen x 0..1, style]
def smooth(x, ms):
    n = max(1, int(SR * ms / 1000)); return np.convolve(x, np.ones(n) / n, 'same')

# ---------- the pen ----------
tt = np.array([r[0] for r in track]); v = np.array([r[1] for r in track], float); px = np.array([r[2] for r in track])
rule = np.array([r[3] == 'rule' for r in track], float)
T = np.arange(N) / SR
V = np.interp(T, tt, v); PX = np.interp(T, tt, px); RULE = np.interp(T, tt, rule)
V = np.minimum(V, 1400)                                       # the calendar is ruled fast: cap it so it reads as one quick hand
amp = smooth(np.clip(V / 520, 0, 1.5) ** 0.5, 30)
grain = np.zeros(N)
dens = np.clip(V / 520, 0, 2) * 90 + (V > 5) * 25
idx = np.nonzero(rng.random(N) < dens / SR)[0]; grain[idx] = rng.standard_normal(len(idx)) * (0.5 + rng.random(len(idx)))
grain = bp(grain, 2500, 9000, 2)
white = rng.standard_normal(N)
hiss_hi = bp(white, 2200, 7500, 2); hiss_lo = bp(white, 700, 2400, 2)
bright = np.clip(V / 700, 0, 1)
scr = amp * ((0.55 + 0.45 * bright) * hiss_hi + (1 - bright) * 0.8 * hiss_lo) + amp * 1.6 * grain
scr = lp(scr, 9000, 2) * 0.12 * (1 - 0.25 * RULE)
pan = (PX - .5) * 1.0
pen = np.stack([scr * np.sqrt(np.clip(.5 - pan / 2, 0, 1)), scr * np.sqrt(np.clip(.5 + pan / 2, 0, 1))], 1).astype(np.float32)
sfx = pen.copy()

def tone_hit(f, d, decay, noise=.3, band=(1500, 6000)):
    t = np.arange(int(d * SR)) / SR
    return np.sin(2 * np.pi * f * t) * np.exp(-t / decay) + bp(rng.standard_normal(len(t)), *band) * np.exp(-t / (decay * .4)) * noise
# first touch: a light wooden tap
for e in get('tap'):
    t = np.arange(int(.25 * SR)) / SR
    x = np.sin(2 * np.pi * 2300 * t) * np.exp(-t / .004) * .5 + bp(rng.standard_normal(len(t)), 1500, 6000) * np.exp(-t / .006) * .6 + np.sin(2 * np.pi * 140 * t) * np.exp(-t / .03) * .5
    add(sfx, (x * .22).astype(np.float32), e['t'] - .005, 1.0, .3)
# the ink pooling at the stop: a barely audible wet swell
for e in get('blot'):
    d = int(1.8 * SR); t = np.arange(d) / SR
    add(sfx, (lp(rng.standard_normal(d), 900, 2) * np.sin(np.pi * np.clip(t / 1.8, 0, 1)) ** 2 * .02).astype(np.float32), e['t'], 1.0, -.1)
# the toy blocks: hollow wooden clacks as each new block is set on the tower
for i, t in enumerate([17.55, 17.95, 18.35]):
    add(sfx, (tone_hit(820 + 60 * i, .18, .025, .5, (800, 4000)) * .05).astype(np.float32), t, 1.0, .25)
# the table: two soft bowl clinks while the bowls are drawn; today: tea glasses
t0, t1 = seg['table']
for i, t in enumerate([t0 + .35, t0 + .8]):
    add(sfx, (tone_hit(2100 + 300 * i, .6, .12, .15, (3000, 8000)) * .022).astype(np.float32), t, 1.0, -.25)
g0, g1 = seg['glasses']
for i, t in enumerate([g0 + .3, g0 + 1.45]):
    add(sfx, (tone_hit(3300 + 400 * i, .7, .16, .1, (4000, 9000)) * .02).astype(np.float32), t, 1.0, -.1 + .2 * i)
# the book: a page lift as the cover develops
b0, b1 = seg['book']
d = int(.6 * SR); t = np.arange(d) / SR
add(sfx, (bp(rng.standard_normal(d), 400, 3000) * np.sin(np.pi * t / .6) ** 2 * .03).astype(np.float32), b1 - .1, 1.0, 0)
# room tone (very faint), dropped during the stop
room = lp(np.cumsum(rng.standard_normal(N)) * .002, 400, 2); room = room - smooth(room, 500)
room = (room / (np.abs(room).max() + 1e-9) * .004).astype(np.float32)
cues = json.load(open(os.path.join(HERE, 'music', 'cues.json')))
s0, s1 = cues['silence']
gr = np.ones(N, np.float32); gr[int((s0 + .1) * SR):int((s1 - .2) * SR)] = .1
sfx += np.stack([room, room], 1) * gr[:, None]

# ---------- music ----------
mus, _ = sf.read(os.path.join(HERE, 'music', 'score.wav')); mus = mus.astype(np.float32)
m = np.zeros((N, 2), np.float32); n = min(N, len(mus)); m[:n] = mus[:n]
mix = m * MUSIC * .3 + sfx * 1.15
e = int(E['dur'] * SR); fo = int(0.6 * SR); mix[e - fo:e] *= np.linspace(1, 0, fo)[:, None]; mix[e:] = 0
mix = limit(mix, .95)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', OUTWAV), mix.astype(np.float32), SR)
def db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
for i in range(0, int(E['dur']), 4):
    sl = slice(i * SR, (i + 4) * SR); print(f'{i:2d}s  music {db(m[sl] * .3):6.1f}  pen {db(pen[sl]):6.1f}')
print('mix.wav', mix.shape, 'peak', np.abs(mix).max())

"""Sound for «انتصار صغير» (watercolor): effects and the place's ambience only (no voice, no music, no human vocal sounds); every effect has a cause on screen.
The bike's speed track (events.json) drives the tyre roll and the chain/freewheel ticking; footsteps, the saddle, cloth, brakes and shoes
sit on their actions; the square has a soft wind and far sparrows, leaves at the end; the held moment after the second try is silent.
LIB=<library> python mix.py → out/mix.wav"""
import sys, os, json, numpy as np, soundfile as sf
from scipy.ndimage import uniform_filter1d
LIB = os.environ['LIB']; sys.path.insert(0, LIB)
from core.audio.sfx import SR, add, bp, lp, hp, limit
HERE = os.path.dirname(os.path.abspath(__file__))
E = json.load(open(os.path.join(HERE, 'events.json'))); FILM = E['dur']; EV = E['ev']
TL = json.load(open(os.path.join(HERE, 'timeline.json')))
DUR = max(FILM + 4.5, 61.0); N = int(DUR * SR)   # a silent tail: ffmpeg 6.1's loudnorm holds back its last ~3 s, which mux.sh's length check (5 % tolerance) would read as a cut-off file; mux trims with -shortest
rng = np.random.default_rng(7)
T = np.arange(N) / SR
def nz(d): return rng.standard_normal(max(1, int(round(d * SR))))
def tt(d): return np.arange(int(round(d * SR))) / SR
def fade(x, a=.004, b=.02):
    n = len(x); ia, ib = min(n, int(a * SR)), min(n, int(b * SR))
    if ia: x[:ia] *= np.linspace(0, 1, ia)
    if ib: x[-ib:] *= np.linspace(1, 0, ib)
    return x
get = lambda ty: [e for e in EV if e['type'] == ty]
fx = np.zeros((N, 2)); amb = np.zeros((N, 2))
def put(x, at, g=1.0, pan=0.0, b=None): add(fx if b is None else b, np.asarray(x, np.float64), at, g, pan)

# —— the bike: tyre roll on asphalt + chain/freewheel ticks, both from the speed track ——
sp = np.array(get('speed')[0]['data']); V = np.interp(T, sp[:, 0], sp[:, 1])
amp = uniform_filter1d(np.clip(V / 260, 0, 1.4) ** .6, int(.05 * SR))
roll = bp(rng.standard_normal(N), 180, 1400, 2) * 0.6 + bp(rng.standard_normal(N), 1400, 5000, 2) * 0.25
grit = (rng.random(N) < (V / 260 * 60 + 5) / SR) * rng.standard_normal(N) * (V > 3); grit = bp(grit, 2000, 8000)
tyre = (roll + grit * 0.8) * amp * 0.055
# freewheel / chain: one tick per 1/24 of a wheel turn
ph = np.cumsum(V / (2 * np.pi * 88) * 24 / SR); ticks = np.diff(np.floor(ph), prepend=0) > 0
tk = np.zeros(N); idx = np.nonzero(ticks)[0]; tk[idx] = 1.0
tick = np.convolve(tk, np.exp(-np.arange(int(.006 * SR)) / (.0012 * SR)) * np.sin(2 * np.pi * 5200 * np.arange(int(.006 * SR)) / SR), 'same') * 0.035 * (V > 3)
bike = tyre + tick
fx[:, 0] += bike * 0.9; fx[:, 1] += bike * 1.0
# —— actions ——
def scrape(d=.35, v=1.0):   # a shoe put down on asphalt
    x = bp(nz(d), 500, 3500)
    e = np.exp(-tt(d) / .07)[:len(x)]; t0 = tt(.05); thud = np.sin(2 * np.pi * 110 * t0) * np.exp(-t0 / .015)
    out = x * e * .12 * v; out[:len(thud)] += thud * .18 * v; return fade(out)
def click(v=1.0):   # a pedal turned by a shoe
    t0 = tt(.03); return fade((np.sin(2 * np.pi * 2600 * t0) * np.exp(-t0 / .004) + bp(nz(.03), 2000, 8000) * np.exp(-t0 / .003)) * .12 * v)
def step(v=1.0):    # a footstep on asphalt
    d = .12; x = lp(nz(d), 1200) * np.exp(-tt(d) / .02) * .25 + bp(nz(d), 1500, 6000) * np.exp(-tt(d) / .01) * .08
    return fade(x * v)
def creak(v=1.0):   # the leather saddle taking a hand
    d = .28; t0 = tt(d); f = 520 + 160 * t0 / d; x = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.5 + 0.5 * (rng.random(len(t0)) < .3)) * np.sin(np.pi * t0 / d)
    return fade(bp(x, 300, 2500) * .05 * v)
def cloth(d=.4, v=1.0):
    x = bp(nz(d), 400, 3000) * np.sin(np.linspace(0, np.pi, int(round(d * SR)))) ** 2; return fade(x * .03 * v)
def brake(k=1.0):    # rim brake: a soft squeal over a rub
    d = .7 * k + .2; t0 = tt(d); sq = np.sin(2 * np.pi * (1900 + 60 * np.sin(2 * np.pi * 7 * t0)) * t0) * np.sin(np.pi * t0 / d) ** 2
    rub = bp(nz(d), 800, 4000) * np.sin(np.pi * t0 / d)
    return fade((sq * .012 * k + rub * .04) * 1.0)
for e in EV:
    t, ty = e['t'], e['type']
    if ty == 'foot': put(scrape(), t, 1.0, .1)
    elif ty == 'pedal': put(click(), t, 1.0, .1)
    elif ty == 'push': put(scrape(.25, .7), t - .05, 1.0, .1); put(click(1.2), t + .05, 1.0, .1)
    elif ty == 'brake': put(brake(e.get('k', 1)), t, 1.0, .15)
    elif ty == 'saddle': put(creak(), t, 1.0, -.1)
    elif ty == 'cloth': put(cloth(), t, 1.0, -.1)
    elif ty == 'steps':
        n = 0; tc = t
        while tc < e['t1']:
            fadek = 1 - (max(0, tc - (e['t1'] - 1.2)) / 1.2 if e.get('fade') else 0)
            put(step(.9 * fadek * (1 if n % 2 else .85)), tc, 1.0, -.25); tc += 1 / e['rate']; n += 1
    elif ty in ('paint', 'mist'):   # the medium's own sound, very low: brush rustles while the square paints in; one soft swish as the mist takes it
        d = e['dur']; n = int(d * SR); x = bp(rng.standard_normal(n), 900, 5000) * uniform_filter1d(np.abs(rng.standard_normal(n)), int(.25 * SR))
        x *= np.sin(np.linspace(0, np.pi, n)) ** 2 * (.012 if ty == 'paint' else .02); put(x, t, 1.0, .2)
# —— the square: a soft wind (stronger with her speed), far sparrows; leaves at the end ——
wind = lp(rng.standard_normal(N), 500, 2) * (0.6 + 0.4 * np.sin(2 * np.pi * T / 7.3 + 1) ** 2)
wind = wind * (0.010 + 0.012 * np.clip(V / 270, 0, 1))
amb[:, 0] += wind; amb[:, 1] += np.roll(wind, 1200)
def chirp(v=1.0):
    d = .09; t0 = tt(d); f = 4200 + 1600 * np.sin(np.pi * t0 / d); return fade(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t0 / d) * .018 * v)
t0 = 0.8
while t0 < FILM - 1:
    if rng.random() < .35:
        for k in range(1 + int(rng.random() * 3)): add(amb, chirp(.5 + .5 * rng.random()), t0 + k * .13, 1.0, .7 * (rng.random() - .3))
    t0 += .7 + rng.random()
leaves = bp(rng.standard_normal(N), 1500, 7000) * uniform_filter1d(np.abs(rng.standard_normal(N)), int(.3 * SR)) * 0.008
leaves *= np.interp(T, [0, 29.5, 31, FILM - 1, FILM], [0, 0, 1, 1, 0]); amb[:, 0] += leaves; amb[:, 1] += np.roll(leaves, 900)
# the held moment after the second try: almost nothing
s0, s1 = TL['events']['silence']; g = np.interp(T, [s0, s0 + .25, s1 - .2, s1 + .3], [1, .08, .08, 1]); amb *= g[:, None]
fx[:, 0] = hp(fx[:, 0], 60); fx[:, 1] = hp(fx[:, 1], 60)
mix = fx + amb
e_ = int(FILM * SR); fo = int(.8 * SR); mix[e_ - fo:e_] *= np.linspace(1, 0, fo)[:, None]; mix[e_:] = 0
mix = mix.astype(np.float32)
# tame the shoe/pedal transients: a look-ahead limit per channel at ~17 dB over the active RMS, so loudnorm can reach −14 LUFS under −1.2 dBTP
act = np.sqrt(np.mean(mix[:e_] ** 2)) + 1e-9
k = act * 4.0; mix = np.tanh(mix / k) * k   # soft saturation rounds the click transients first
for c in (0, 1): mix[:, c] = limit(mix[:, c], min(.95, act * 7.0))
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True); sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix, SR)
def db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
for i in range(0, int(FILM), 4): sl = slice(i * SR, (i + 4) * SR); print(f'{i:2d}s  fx {db(fx[sl]):6.1f}  amb {db(amb[sl]):6.1f}')
print('mix.wav', mix.shape, 'peak', np.abs(mix).max())

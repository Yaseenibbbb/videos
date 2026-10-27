# Shared on-screen script and timeline for the three style-test films (one source of truth).
# Run: python3 script.py  → timeline.json
import json, re
# (id, text, gap_before, extra_hold, beat)
CARDS = [
  ("c1a", "لو استطاعت أمّك العودة إلى يومٍ واحدٍ من حياتها،", 0.35, 0.0, "hook"),
  ("c1b", "فأيّ يومٍ ستختار؟", 0, 0.3, "hook"),   # second line joins the first
  ("c2",  "قد تختار يومًا عاديًّا جدًّا.", 0.5, 0.2, "ordinary"),
  ("c3",  "كنتم صغارًا تلعبون، وهي تناديكم إلى الطعام…", 0.5, 0.6, "play"),
  ("c4",  "فيتأخّر أحدكم كعادته.", 0.4, 0.5, "late"),
  ("c5",  "ثمّ كبرتم، وتغيّرت تفاصيل البيت.", 0.5, 0.4, "grew"),
  ("c6",  "ولعلّها ما زالت تتذكّر ضحكةً حول المائدة.", 0.5, 0.6, "laugh"),
  ("c7",  "فلنمنح أمهاتنا وقتًا للحكاية، ونسألهنّ:", 1.6, 0.0, "ask"),   # 1.6 s breath before
  ("c8",  "«ما اللحظة التي تتمنّين أن تعيشيها مرّةً أخرى؟»", 0.4, 1.2, "question"),
  ("c9",  "«احكي لي ذلك اليوم، منذ بدايته.»", 0.4, 0.6, "followup"),
]
CTA_LEN = 6.0
def n_chars(s): return len(re.sub(r"\s", "", s))
def need(s): return max(1.5, n_chars(s) / 15 + 1.5)      # readcheck.mjs default rule
def write_dur(s): return round(0.25 + 0.018 * n_chars(s), 2)
out = []; prev_end = 0.0
for cid, text, gap, extra, beat in CARDS:
    w = write_dur(text)
    t0 = out[-1]["t0"] + out[-1]["w"] + 1.1 if cid == "c1b" else prev_end + gap
    t1 = round(t0 + w + need(text) + extra, 2)
    if cid == "c1b":                                    # c1a stays until c1b leaves
        out[-1]["t1"] = t1
    out.append(dict(id=cid, text=text, t0=round(t0, 2), w=w, t1=t1, beat=beat))
    prev_end = t1
cta0 = round(prev_end + 0.3, 2)
tl = dict(fps=24, size=[1080, 1920], cards=out,
          cta=dict(t0=cta0, t1=round(cta0 + CTA_LEN, 2), title="حكاية أمي",
                   sub="أسئلة لحفظ الذكريات والحكايات", url="hikaytomi.com"),
          dur=round(cta0 + CTA_LEN, 2), fade_out=0.45)
json.dump(tl, open("timeline.json", "w"), ensure_ascii=False, indent=1)
for c in out: print(f'{c["t0"]:6.2f} {c["t1"]:6.2f}  {c["beat"]:9s} {c["text"]}')
print("CTA", cta0, "DUR", tl["dur"])

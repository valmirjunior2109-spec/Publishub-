import json, sys
FPS = 30
SEGS = [(9,331),(348,1113),(1125,1304),(1322,1473)]
d = json.load(open(sys.argv[1], encoding="utf-8"))
words = [w for s in d["segments"] for w in s["words"]]
# corrections (see notes): opening reading, brand spelling, onset of "Se" measured from RMS envelope
fix_text = {0: "Muitos", 1: "influencers"}
out = []
def remap(t):
    off = 0.0
    for a, b in SEGS:
        if t < a / FPS: return off  # in a removed gap → snap to next kept start
        if t < b / FPS: return off + t - a / FPS
        off += (b - a) / FPS
    return off
for i, w in enumerate(words):
    txt = fix_text.get(i, w["w"].strip())
    txt = txt.replace("PublishHub", "Publishub")
    s, e = w["s"], w["e"]
    if txt == "Se" and abs(s - 43.68) < 0.05: s = 44.22
    if i == 0: s = 0.38
    out.append({"i": i, "text": txt, "start": round(remap(s), 3), "end": round(remap(e), 3), "srcStart": s})
json.dump(out, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=0)
for w in out: print(w["i"], w["text"], w["start"], w["end"])

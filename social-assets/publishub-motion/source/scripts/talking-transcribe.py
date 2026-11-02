import json, sys
from faster_whisper import WhisperModel
model_name = sys.argv[1] if len(sys.argv) > 1 else "large-v3"
m = WhisperModel(model_name, device="cpu", compute_type="int8")
import wave, numpy as np
wf = wave.open(sys.argv[2]); audio = np.frombuffer(wf.readframes(wf.getnframes()), np.int16).astype(np.float32) / 32768.0
segs, info = m.transcribe(audio, word_timestamps=True, vad_filter=False, beam_size=5, language="pt", condition_on_previous_text=False, initial_prompt="Publishub. Vídeo para criadores de conteúdo, Reels, retenção.")
out = {"language": info.language, "prob": info.language_probability, "segments": []}
for s in segs:
    out["segments"].append({"start": s.start, "end": s.end, "text": s.text.strip(),
        "words": [{"w": w.word, "s": round(w.start,3), "e": round(w.end,3), "p": round(w.probability,3)} for w in s.words]})
    print(f"[{s.start:6.2f}-{s.end:6.2f}] {s.text}", flush=True)
json.dump(out, open(sys.argv[3], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("LANG", info.language, info.language_probability)

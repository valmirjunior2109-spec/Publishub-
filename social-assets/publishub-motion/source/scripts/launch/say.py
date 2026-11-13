"""Gera a locução do filme de lançamento com o Kokoro-82M (Apache-2.0), localmente.
   python say.py <dir-do-modelo> <saida-dir>
Lê vo.json (ao lado), grava <id>.wav (24 kHz mono, sem silêncio nas pontas) e durations.json.
"""
import json, sys
from pathlib import Path
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = Path(__file__).parent
model_dir, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
cfg = json.loads((HERE / "../../src/launch/vo.json").read_text())
kokoro = Kokoro(str(model_dir / "kokoro-v1.0.onnx"), str(model_dir / "voices-v1.0.bin"))
durs = {}
for line in cfg["lines"]:
    samples, rate = kokoro.create(line["say"], voice=line.get("voice", cfg["voice"]), speed=line.get("speed", cfg["speed"]), lang="en-us")
    a = np.abs(samples)
    idx = np.where(a > 0.01)[0]
    s, e = max(0, idx[0] - int(0.02 * rate)), min(len(samples), idx[-1] + int(0.06 * rate))
    samples = samples[s:e]
    sf.write(out / f"{line['id']}.wav", samples, rate)
    durs[line["id"]] = round(len(samples) / rate, 3)
    print(line["id"], durs[line["id"]])
(out / "durations.json").write_text(json.dumps(durs, indent=1))

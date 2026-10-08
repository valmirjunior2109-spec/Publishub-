"""Média dos sub-quadros de cada quadro (o motion blur do render.mjs).

    python3 blend.py manifest.json - | ffmpeg -f rawvideo -pix_fmt rgb24 -s 1080x1920 -i - …

manifest.json é uma lista: para cada quadro, os PNGs dos seus sub-quadros.
Escreve os quadros em RGB24 cru, um atrás do outro (no arquivo dado ou, com
"-", na saída padrão), para o ffmpeg ler.
"""
import json
import sys

import numpy as np
from PIL import Image

frames = json.load(open(sys.argv[1]))
out_path = sys.argv[2] if len(sys.argv) > 2 else "-"
with (open(out_path, "wb") if out_path != "-" else sys.stdout.buffer) as out:
    for files in frames:
        acc = None
        for f in files:
            a = np.asarray(Image.open(f).convert("RGB"), dtype=np.float32)
            acc = a if acc is None else acc + a
        out.write(np.clip(acc / len(files) + 0.5, 0, 255).astype(np.uint8).tobytes())

# Builds the preview images in ../previews from the rendered PNGs (requires Pillow).
# Usage (from this folder): python3 previews.py
import json, os
from PIL import Image, ImageDraw, ImageFont
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here)
manifest = {m["id"]: m["files"] for m in json.load(open(os.path.join(here, "manifest.json")))}
ORDER = ["09", "02", "04", "01", "07", "03", "08", "05", "06", "10"]  # recommended publishing order
BG = (2, 0, 2); MUTED = (169, 170, 194)
os.makedirs(os.path.join(root, "previews"), exist_ok=True)
def load(rel, w): im = Image.open(os.path.join(root, rel)).convert("RGB"); return im.resize((w, w * 1350 // 1080), Image.LANCZOS)

# 1) profile grid in publishing order (newest first, as Instagram shows it)
W, G = 540, 6
covers = [manifest[i][0] for i in reversed(ORDER)]
rows = (len(covers) + 2) // 3
grid = Image.new("RGB", (3 * W + 2 * G, rows * (W * 1350 // 1080) + (rows - 1) * G), (30, 29, 51))
for k, f in enumerate(covers):
    grid.paste(load(f, W), ((k % 3) * (W + G), (k // 3) * (W * 1350 // 1080 + G)))
grid.save(os.path.join(root, "previews", "00-profile-grid.png"))

# 2) one strip per creative: every slide side by side
for pid, files in manifest.items():
    w = 432; h = w * 1350 // 1080; pad = 24
    strip = Image.new("RGB", (len(files) * w + (len(files) + 1) * pad, h + 2 * pad), BG)
    for k, f in enumerate(files):
        strip.paste(load(f, w), (pad + k * (w + pad), pad))
    name = os.path.basename(os.path.dirname(files[0])) if "carousels" in files[0] else os.path.splitext(os.path.basename(files[0]))[0]
    strip.save(os.path.join(root, "previews", f"{name}.png"))
print("previews written")

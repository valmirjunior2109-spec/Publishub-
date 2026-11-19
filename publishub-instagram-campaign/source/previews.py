# Builds the two preview images in ../previews from the rendered PNGs (requires Pillow).
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

# 2) overview of all 10 posts in numeric order (2 rows × 5)
w = 432; h = w * 1350 // 1080; pad = 24
ids = sorted(manifest)
sheet = Image.new("RGB", (5 * w + 6 * pad, 2 * h + 3 * pad), BG)
for k, pid in enumerate(ids):
    sheet.paste(load(manifest[pid][0], w), (pad + (k % 5) * (w + pad), pad + (k // 5) * (h + pad)))
sheet.save(os.path.join(root, "previews", "01-all-creatives.png"))
print("previews written")

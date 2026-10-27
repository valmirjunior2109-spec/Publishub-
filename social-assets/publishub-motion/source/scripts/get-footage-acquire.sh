#!/usr/bin/env bash
# O Reel do exemplo do anúncio (Acquire.tsx): um vídeo real, sem ninguém em cena.
# Fonte: Intel IoT DevKit, "sample-videos" (fruit-and-vegetable-detection.mp4), licença CC BY 4.0
# (https://github.com/intel-iot-devkit/sample-videos). Baixa o original, corta 8 s a partir de
# 19,27 s (o abacaxi entrando e no meio do quadro em 1,33 s, a queda do gancho), recorta o 9:16 do meio, esquenta um pouco a cor e salva em
# public/footage/fruit-reel.mp4 (fora do git, como os outros clipes).
#
#   bash scripts/get-footage-acquire.sh
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
src="$here/footage-src/fruit-and-vegetable-detection.mp4"
mkdir -p "$here/footage-src" "$here/public/footage"
[ -f "$src" ] || curl -fsSL -o "$src" https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/fruit-and-vegetable-detection.mp4
ffmpeg -y -loglevel error -ss 19.27 -t 8 -i "$src" \
  -vf "crop=304:540:410:0,scale=608:1080:flags=lanczos,eq=saturation=1.15:contrast=1.04,colorbalance=rs=0.04:bs=-0.04,fps=30" \
  -an -c:v libx264 -crf 16 -pix_fmt yuv420p "$here/public/footage/fruit-reel.mp4"
echo "✓ public/footage/fruit-reel.mp4"

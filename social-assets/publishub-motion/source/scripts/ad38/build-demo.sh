#!/usr/bin/env bash
# Publishub · anúncio de 38 s: refaz o Reel de demonstração enviado ao teste grátis.
# Clipes do Mixkit (footage-src/, licença em public/footage/CREDITS.md) + narração
# sintética com abertura lenta e uma pausa de 2 s, de propósito.
#
#   PY=<python com kokoro-onnx> FF=<ffmpeg> bash scripts/ad38/build-demo.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
OUT=ad38-src
"$PY" scripts/ad38/say.py af_heart 0.95 $OUT/a.wav "Hi everyone! So, um, before we get started, I just wanted to tell you a little bit about why I've been cooking so much lately."
"$PY" scripts/ad38/say.py af_heart 1.0 $OUT/b.wav "Okay. Weeknight bolognese, in twenty minutes. The veggies go straight into a really hot pan."
"$PY" scripts/ad38/say.py af_heart 1.0 $OUT/c.wav "Then finish it with a lot of fresh parmesan."
"$PY" scripts/ad38/say.py af_heart 1.0 $OUT/d.wav "And dinner is served. See you next time!"

SRC=footage-src
"$FF" -y -loglevel error \
  -ss 0.5 -t 10.5 -i $SRC/src-40522.mp4 -ss 2 -t 5.7 -i $SRC/src-49231.mp4 -t 2.8 -i $SRC/src-12171.mp4 -ss 2.5 -t 3.0 -i $SRC/src-12166.mp4 \
  -i $OUT/a.wav -i $OUT/b.wav -i $OUT/c.wav -i $OUT/d.wav \
  -filter_complex "\
[0:v]crop=ih*9/16:ih,scale=1080:1920:flags=lanczos,fps=30,setsar=1[v0];\
[1:v]crop=ih*9/16:ih,scale=1080:1920:flags=lanczos,fps=30,setsar=1[v1];\
[2:v]scale=1080:1920,fps=30,setsar=1[v2];[3:v]scale=1080:1920,fps=30,setsar=1[v3];\
[v0][v1][v2][v3]concat=n=4:v=1:a=0,format=yuv420p[v];\
[4:a]adelay=400:all=1[a0];[5:a]adelay=10500:all=1[a1];[6:a]adelay=16300:all=1[a2];[7:a]adelay=19000:all=1[a3];\
[a0][a1][a2][a3]amix=inputs=4:normalize=0,apad,atrim=0:22,loudnorm=I=-16:TP=-1.5,aresample=48000[a]" \
  -map "[v]" -map "[a]" -ac 2 -c:v libx264 -crf 19 -c:a aac -b:a 192k -movflags +faststart -t 22 public/ad38/demo-reel.mp4
echo "✓ public/ad38/demo-reel.mp4"

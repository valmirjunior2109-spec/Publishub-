#!/usr/bin/env sh
# Publishub · talking head: prepara o vídeo cru para o Remotion.
#   1. upscale 478x850 → 1080x1920 (lanczos + nitidez leve), 30 fps
#   2. voz isolada: DeepFilterNet (o executável deep-filter, v0.5.6, de
#      github.com/Rikorose/DeepFilterNet/releases) com limite de 30 dB, para a voz
#      continuar natural; entrada 3 dB mais baixa porque o original estourava (0 dBTP);
#      depois passa-alta 80 Hz. O volume final (-14 LUFS, duas passadas lineares) é
#      aplicado depois dos cortes.
#   3. corta as três pausas longas (quadros abaixo) com fade de 8 ms em cada junta
# Precisa de um ffmpeg completo (o do Remotion não tem fps/unsharp/afade):
#   pip install imageio-ffmpeg faster-whisper  →  FF=$(python -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
# Transcrição: python scripts/talking-transcribe.py large-v3 audio16k.wav transcript.json
# Remapeamento para a linha do tempo editada: python scripts/talking-remap.py transcript.json src/talking/words.json
set -e
SRC="${1:-../../../publishub-videos/WhatsApp Video 2026-10-09 at 07.02.47.mp4}"
FF="${FF:-ffmpeg}"
mkdir -p public/talking
"$FF" -y -i "$SRC" -an -vf "fps=30,scale=1080:1920:flags=lanczos+accurate_rnd+full_chroma_int,unsharp=5:5:0.55:5:5:0.0,format=yuv420p" -c:v libx264 -preset slow -crf 12 -g 15 public/talking/face.mp4
DF="${DF:-deep-filter}"
"$FF" -y -i "$SRC" -vn -ac 1 -ar 48000 -af "volume=-3dB" -c:a pcm_s16le public/talking/raw.wav
"$DF" -D -a 30 -o public/talking/df public/talking/raw.wav
"$FF" -y -i public/talking/df/raw.wav -af "highpass=f=80" -ar 48000 -ac 2 -c:a pcm_s16le public/talking/voice.wav
rm -r public/talking/df public/talking/raw.wav
# trechos mantidos, em quadros @30 fps do original (os mesmos de scripts/talking-remap.py)
SEGS="9:331 348:1113 1125:1304 1322:1473"
fc=""; vl=""; al=""; i=0
for s in $SEGS; do a=${s%:*}; b=${s#*:}
  t0=$(awk "BEGIN{printf \"%.6f\",$a/30}"); t1=$(awk "BEGIN{printf \"%.6f\",$b/30}"); fo=$(awk "BEGIN{printf \"%.6f\",($b-$a)/30-0.008}")
  fc="$fc[0:v]trim=start_frame=$a:end_frame=$b,setpts=PTS-STARTPTS[v$i];[1:a]atrim=start=$t0:end=$t1,asetpts=PTS-STARTPTS,afade=t=in:d=0.008,afade=t=out:st=$fo:d=0.008[a$i];"
  vl="$vl[v$i]"; al="$al[a$i]"; i=$((i+1)); done
fc="${fc}${vl}concat=n=$i:v=1:a=0[v];${al}concat=n=$i:v=0:a=1[a]"
"$FF" -y -i public/talking/face.mp4 -i public/talking/voice.wav -filter_complex "$fc" -map "[v]" -c:v libx264 -preset slow -crf 12 -g 15 -pix_fmt yuv420p -movflags +faststart public/talking/face-cut.mp4 -map "[a]" -c:a pcm_s16le -ar 48000 public/talking/voice-cut.wav
rm public/talking/face.mp4 public/talking/voice.wav
# volume final da voz: -14 LUFS / -1,5 dBTP em duas passadas (loudnorm linear)
J=$("$FF" -hide_banner -i public/talking/voice-cut.wav -af "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
g() { echo "$J" | grep "\"$1\"" | sed 's/.*: "\(.*\)".*/\1/'; }
"$FF" -y -i public/talking/voice-cut.wav -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true" -ar 48000 -c:a pcm_s16le public/talking/voice-norm.wav
mv public/talking/voice-norm.wav public/talking/voice-cut.wav

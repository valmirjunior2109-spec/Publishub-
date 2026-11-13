# Publishub launch film: "AI builds faster. Publishub makes sure it works."

A 58-second launch film for the AI-code verification waitlist, rendered from one Remotion project in two formats:

| File (in `social-assets/publishub-motion/`, git-ignored) | Format |
| --- | --- |
| `publishub-launch-9x16-1080x1920.mp4` | 9:16, 1080×1920, 30 fps, H.264 + AAC 320k, −14 LUFS: Reels, TikTok, Shorts |
| `publishub-launch-16x9-1920x1080.mp4` | 16:9, 1920×1080, same audio: YouTube, X, LinkedIn, the site |
| `publishub-launch-captions-en.srt` | English captions for platform caption tracks |

Captions are burned in, and the SRT is there for platforms that take a caption track.

## Story and timing

| Time | Scene | What happens |
| --- | --- | --- |
| 0–4 s | Hook | The agent finishes: build ✓, lint ✓. Cut to the store's checkout: "Pay now" does nothing, total `$NaN`. |
| 4–11.5 s | The AI era | A 3D field of editors writing code; Claude Code · Cursor · Codex land on the spoken words. "AI can write a feature in minutes." |
| 11.5–20 s | The hidden problem | Files the agent touched that weren't in the task → the one-line change in `lib/cart.ts` → the checkout journey breaks → a customer hits it. Cut to black. |
| 20–24 s | Reveal | The pixel-art logo assembles on the impact. "AI builds faster. Publishub makes sure it works." |
| 24–41.5 s | Product (concept) | The site's four steps: connect a preview deployment and pick journeys → run them in a browser (Checkout fails at step 4) → compare with the last version that worked → failing step, screenshot, console error, and a copyable bug report for the agent. |
| 41.5–45 s | Payoff | "Build fast. Ship with confidence." |
| 45–58 s | End card | "Your AI writes the code. Who verifies it actually works?" Two CTAs: Join the waitlist (free) and Become a Founding Customer ($0 today), then getpublishub.com. |

## Accuracy to the site (source of truth: `frontend/src/app/page.tsx`, `lib/waitlist.ts`, `lib/founding.ts`)

- The headline, tagline and the four steps come from the site's copy.
- The product UI is a **concept**: a "Concept preview · Publishub is in development" badge stays on screen for the whole product scene.
- No customers, metrics, testimonials or integrations are shown. Claude Code, Cursor and Codex appear only as tools developers use, as on the site. The bug report goes back to the agent by copy and paste, not through an integration.
- The Founding offer uses the site's terms: $0 today, charged only after launch with 7 days' notice, cancel before then and pay nothing. The founding price comes from Stripe, so the film doesn't state it.
- "acme-store" is a fictional demo app.

## Rebuild

```sh
cd social-assets/publishub-motion/source
npm install
# 1. the voice: Kokoro-82M (Apache-2.0), run locally. Put the model files in scripts/launch/model/:
#    kokoro-v1.0.onnx and voices-v1.0.bin from github.com/thewh1teagle/kokoro-onnx/releases (model-files-v1.0).
pip install kokoro-onnx soundfile scipy numpy
npm run voice:launch        # → public/launch/vo/*.wav (voice af_heart)
# 2. the score, sound design and mix (all synthesized in code, no third-party audio) → public/launch/mix.wav
npm run sound:launch
# 3. captions and video
npm run srt:launch
npm run render:launch-vertical
npm run render:launch-landscape
npm run studio              # live preview: LaunchVertical / LaunchLandscape
```

To check frames without a full render: `node scripts/launch/stills.mjs <dir> V 2.5 30 50` (`H` for 16:9).
In a sandbox without Remotion's browser download, set `REMOTION_CHROME` (or pass `--browser-executable`) to a local Chrome headless shell.

## Where to change things

| What | Where |
| --- | --- |
| Scene boundaries, voice start times, sound/animation cues | `timeline.json` (read by both the animation and `score.py`) |
| Voiceover script | `vo.json` (`say` is what the TTS pronounces, `text` is what's written) |
| Captions | `captions.json` (`burn: false` = the scene already shows the line as large type) |
| Colors, fonts, easing | `theme.ts` (the brand palette from `frontend/src/app/globals.css`) |
| Scenes | `scenes/*.tsx`; each has a vertical (`v`) and landscape layout |
| Demo store (checkout, product page) | `store.tsx` |
| Logo | `logo-rects.json` (copied from `frontend/src/lib/brand/logo-art.ts`) |
| Music, SFX, ducking, loudness | `scripts/launch/score.py` (stems: `public/launch/music.wav`, `sfx.wav`, `vo.wav`) |

In 9:16, all key content and captions stay between y = 160 and y = 1460, clear of the Reels/TikTok bottom and side UI.

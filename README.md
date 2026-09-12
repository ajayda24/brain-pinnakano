# 🧠 നിന്റെ തലയിൽ പിണ്ണാക്കാണോ? — PINNAKK OS™

An unnecessarily advanced brain diagnostic operating system.

It reads your webcam, estimates your facial expressions, and reports — with total
scientific confidence — how much പിണ്ണാക്ക് is in your തല.

**It is a joke.** Every number it produces is invented for comedy. It does not
diagnose intelligence, personality, mental health, or any medical condition.
Face analysis runs entirely in your browser; no frames are recorded, uploaded or
stored anywhere, because there is no server.

---

## Run it

```bash
npm install
```

```bash
npm run dev
```

Then open **http://localhost:5173**.

> **The camera needs `localhost` or HTTPS.** Opening the dev server over a LAN IP
> (`http://192.168.x.x:5173`) means the browser silently refuses camera access
> and the app falls into simulation mode. This matters on demo day.

`npm install` downloads the face model (~3.8 MB) into `public/mp/models/` and
copies MediaPipe's wasm runtime out of `node_modules`. Both are vendored so the
app never needs a CDN at runtime.

### No camera? No internet? No problem.

```
http://localhost:5173/?sim=1
```

Simulation mode generates plausible expression signals so every screen still
works. It also kicks in automatically if the camera is refused or the model
fails to load, and the UI always says plainly when it is on — invented signals
are never passed off as a reading of a real face.

---

## ⚙️ Before your demo: add your own reels

Edit **one file**: [`src/config/reels.ts`](src/config/reels.ts).

Take the ID out of a YouTube Shorts URL:

```
https://www.youtube.com/shorts/dQw4w9WgXcQ
                               ^^^^^^^^^^^
```

and add an entry:

```ts
{ id: 'r1', type: 'youtube', videoId: 'dQw4w9WgXcQ', title: 'Reel 1', escalation: 2 },
```

`escalation` is 1 (mildly funny) to 3 (devastating) — POKER FACE plays them in
ascending order, so spread them out.

Two other sources are supported, and the config explains both:

| type | use when |
|---|---|
| `youtube` | normal case — needs internet, and the video must allow embedding |
| `local` | safest for a live demo: drop an `.mp4` in `public/reels/`, zero network |
| `synthetic` | built-in animated joke cards. **16 ship enabled**, so the app works out of the box |

Playlists are shuffled per session, so a second run through the demo is not a
replay of the first. A dead embed skips to the next reel in character rather
than hanging.

---

## What's in it

| | |
|---|---|
| **Boot sequence** | Common sense stalls at 23%. Motivation gives up at 4%. പിണ്ണാക്ക് is found immediately. |
| **Face scan** | Live landmark overlay, detection checklist, expression estimates. |
| **KPI tiles** | Pastel headline blocks — processes, utilisation, memory, overthinking, പിണ്ണാക്ക്. |
| **Performance** | A Task-Manager performance tab: resource rail, 60-second traces, threads/handles/uptime. |
| **Pinnakk Manager** | Load breakdown by category, analogue dial, current mass in kilograms. |
| **Thala Task Manager** | Live process table with heat-tinted CPU/Memory columns and pastel status pills. `END TASK` on almost anything returns `ERROR 403`. |
| **Reel Lab** | 16 built-in reels, shuffled. Reaction timeline at 4 Hz, then a report and a randomised verdict. |
| **Brain Lab** | Don't Laugh · Poker Face · Stare Contest · Human Captcha. |
| **Final report** | Dramatic score reveal and classification, from 🧠 തല ക്ലീൻ to 🐄🔥 പിണ്ണാക്ക് തന്നെ തല. |
| **Certificate** | Canvas-drawn, guilloché border and seal, downloadable PNG. |

The Final Report unlocks after one reel and one brain game.

**The numbers behave like a real monitor.** The CPU column sums to the headline
figure instead of each row inventing its own, memory is accounted against a
16 GB total, temperature lags load the way thermal mass does, and traces wander
rather than vibrate. All of it is still completely made up — it just stops
looking made up, which is funnier.

Exactly one process can actually be ended. It is `ActualWork.exe`, and ending it
raises your പിണ്ണാക്ക്.

---

## How it works

```
src/
  face/       camera + MediaPipe FaceLandmarker -> smoothed signals -> discrete events
  state/      10 Hz metrics tick, process table, session log, final scoring
  config/     all the Malayalam content, reels, processes, quips, classifications
  stages/     boot, scan, desktop, reel lab, brain lab, final report, certificate
  certificate/ canvas renderer for the PNG
```

- **Signals.** MediaPipe emits 52 ARKit blendshapes per frame at ~20 fps. These
  fold into a handful of smoothed 0–1 signals (smile, laugh, confusion, gaze,
  head pose, motion energy) in `src/face/signals.ts`.
- **Events, not frames.** Everything downstream reacts to discrete events with
  hysteresis and cooldowns (`src/face/events.ts`), which is what stops the app
  from screaming on every frame.
- **Rendering.** React owns structure; the hot readouts subscribe to the metrics
  tick and write to the DOM directly (`src/components/ui/live.tsx`). That split
  keeps a dozen gauges animating without the UI turning to soup.
- **Look.** Soft pastel design language: white cards with hairline borders and
  very low shadows on a pale lavender page, generous corner radii, pill status
  badges, and a labelled sidebar. Colour only ever appears as a pastel *tint*
  carrying a darker tone of the same hue — no gradient fills, no glow, no
  moving background. Tokens live in `src/styles/tokens.css`; change the palette
  there and the whole app follows.
- **Responsive.** Works down to a 390px phone: the sidebar becomes a scrolling
  strip, the performance rail turns horizontal, the process table drops its
  Memory column, and the KPI tiles go two-up. `src/styles/responsive.css` is
  imported last and is the final word on layout. Note the guard at the top of
  that file — grid and flex items default to a min-content floor, and one wide
  child (a canvas sized from its own container, in our case) will otherwise
  blow out the whole page width.
- **Malayalam.** The typewriter segments by *grapheme*, not code unit, so
  conjuncts never tear mid-animation. On the certificate canvas, letter-spacing
  is applied only to Latin runs — tracking a Malayalam run pushes combining
  marks off their base glyphs.

---

## Testing

```bash
npm run smoke
```

Drives the whole app through a real browser (system Edge or Chrome — nothing is
downloaded) and writes screenshots to `scripts/shots/`. It walks boot → scan →
dashboard → both `END TASK` outcomes → reel lab → three brain games → final
report → certificate, then checks the app degrades gracefully when the camera
works but no face is in frame. It also asserts that the process table's CPU
column still sums to the headline total, that toasts clear the header, and
that the captcha marks exactly one option before its reveal.

The last pass reloads the whole app at 390x844 and fails on any horizontal
overflow — including the sneaky case where the layout viewport silently widens
to fit overflowing content.

The dev server must be running. It defaults to `http://localhost:5173`; pass a
URL to test something else, such as a production preview:

```bash
npm run smoke -- http://localhost:4173
```

**What it cannot test:** MediaPipe's actual blendshape output, which needs a real
face in front of a real camera. Check that one yourself — smile, look away, sit
very still, and shake your head, and watch the alerts fire.

---

## Build & deploy

```bash
npm run build
```

Produces a fully static `dist/` with a relative base, so it can be dropped on
Netlify, Vercel, GitHub Pages, or any subpath. Serve it over HTTPS or the camera
will not start.

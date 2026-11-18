# Prana — Breathe · Move · Meditate

A daily practice companion: breathing exercises, breath challenges, follow-along workouts with animated demonstrations, yoga asana demonstrations and flows, guided meditations, and the streaks, programs and progress tracking that keep you consistent.

It's an installable web app (PWA) with no dependencies and no build step. It works offline and stores all data on the device.

## Run it

Serve the folder over HTTP. Voice, the service worker and installation need http(s), not `file://`.

```bash
python3 -m http.server 5173
```

Then open http://localhost:5173. On a phone on the same Wi-Fi, open `http://<your-computer-ip>:5173`. To install it, use **Add to Home Screen** (iOS Safari) or **Install app** (Chrome/Android). Installing as an app from another device needs HTTPS, so deploy the folder to any static host (Netlify, Vercel, GitHub Pages, Cloudflare Pages).

## What's inside

| Area | Content |
|---|---|
| **Breathe** | 13 techniques: Box, 4-7-8, Coherent, Physiological Sigh, Nadi Shodhana, Bhramari, Ujjayi, Extended Exhale, Triangle, Sleep Descent, Kapalabhati, Bhastrika, Power Breathing rounds. An animated orb, voice cues, breath sounds and haptics guide each one. |
| **Breath challenges** | BOLT score, Max hold, CO₂ table, O₂ table, Box ladder, Exhale extension, Retention challenge. Results become personal bests and are tracked over time. |
| **Move** | 27 exercises, each with an animated demonstration, steps and form tips. 7 follow-along workouts (7-Minute, HIIT, Core, Lower Body, Morning, Desk Break, Recovery) with work/rest timer, voice, countdown beeps and a preview of the next move. |
| **Yoga** | 27 asanas (Sanskrit and English names, benefits, how-to, cautions) and 6 flows. The Surya Namaskar flow animates smoothly through all 12 postures with breath cues, both sides. |
| **Mind** | 7 guided meditations (Breath Awareness, Body Scan, Loving-Kindness, Stress SOS, Sleep Wind-Down, Morning Intention, Yoga Nidra) with spoken guidance, generated ambient sound and singing-bowl bells, plus a silent timer with interval bells. |
| **Consistency** | Daily goal ring, streaks, a rotating "Today's practice", 6 multi-day programs (21-Day Calm Breath, 30-Day Plank, 30-Day Squat, 14-Day Meditation, 21-Day Sun Salutation, 28-Day Breath-Hold Builder), 17 achievements, a 7-day chart, a 17-week heatmap, and a calendar (.ics) daily reminder. |

## Code map

```
index.html          app shell
css/app.css         design tokens (light/dark), components, player UI
js/store.js         localStorage persistence: log, streaks, PBs, programs, backup
js/audio.js         Web Audio synth (breath whoosh, bells, ambient), speech, haptics, wake lock
js/figure.js        articulated SVG figure engine: angles → skeleton, auto-grounding, hand IK, keyframe animation, smooth pose transitions
js/poses.js         pose library (joint angles) used by every demonstration
js/content.js       breathing patterns, challenges, exercises, workouts, asanas, flows, programs
js/meditations.js   timed meditation scripts
js/players.js       session players (breath orb, timed workout/yoga, meditation) and the launcher
js/app.js           router and screens
sw.js               offline cache (bump VERSION when you change files)
```

### Adding content

- **A new pose**: add angles to `js/poses.js`. Angles are absolute degrees: 0 points down, 90 points forward (right), 180 points up. Use `b: 'base'` to inherit from another pose, and `ik: { l: {dx}, r: {dx} }` to plant the hands on the floor.
- **A new exercise**: add it to `EX` in `content.js` with `frames: [[poseName, hold, transition], …]`.
- **A new breathing pattern**: add `phases: [['in',4],['hold',4],['out',4]]` to `BREATHS`.
- **A new meditation**: add `[secondsFromStart, text]` lines to `meditations.js`.

## Safety

Prana gives general wellness guidance, not medical advice. The app shows cautions on the relevant techniques: breath holds and forceful breathing are never to be done in water, while driving or standing, and are not recommended in pregnancy or with heart, blood-pressure or seizure conditions.

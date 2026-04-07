# Workout Tracker

Personal fitness tracker to monitor workout progress over time. Built as a static site — no backend, no sign-up, just open and track.

**Live:** [artirain.github.io/workout-tracker](https://artirain.github.io/workout-tracker/)

## What it does

- **Log workouts** — pick an exercise, add sets (weight x reps), save
- **Track water** — daily water intake with 2L goal
- **See progress** — charts showing how your max weight and volume change over weeks/months
- **Personal records** — best lift for each exercise, always visible
- **Full history** — every workout stored and searchable by date or exercise

## Exercises

Bench press, squats, pull-ups (weighted, wide grip), butterfly, planche, and any custom exercise you add.

Format: `weight - reps` per set, 2-5 sets per exercise. Bodyweight exercises use `0` weight.

## How data works

```
data/workouts.json    <-- source of truth (synced via git)
     +
localStorage          <-- browser cache for offline use
     =
merged on page load
```

Future plan: send workouts via Telegram message, bot parses and commits to the JSON file automatically.

## Tech

| | |
|---|---|
| Frontend | HTML + CSS + Vanilla JS |
| Charts | Chart.js |
| Storage | JSON in repo + localStorage |
| Deploy | GitHub Actions -> GitHub Pages |
| Design | Dark theme, glassmorphism, mobile-first |

No frameworks. No build step. No dependencies to install.

## Run locally

Just open `index.html` in a browser. Or:

```bash
# any static server works
npx serve .
```

## Project structure

```
css/
  variables.css    design tokens (colors, spacing, typography)
  base.css         reset, body styles
  components.css   cards, buttons, inputs, progress bars
  app.css          page-specific layouts and animations
js/
  data.js          localStorage + JSON sync layer
  dashboard.js     stats, water tracker, recent workouts
  history.js       workout history with filters
  progress.js      Chart.js graphs, personal records
  app.js           tab navigation, workout form
data/
  workouts.json    workout and water data
```

## License

MIT

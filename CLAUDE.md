# Workout Tracker

Фитнес-трекер для отслеживания прогресса тренировок. Статический сайт на GitHub Pages.

## Stack
- HTML + CSS + Vanilla JS (no frameworks, no build tools)
- Data: JSON file in repo (`data/workouts.json`) + localStorage as cache
- Charts: Chart.js (CDN)
- Deploy: GitHub Actions → GitHub Pages
- Repo: github.com/Artirain/workout-tracker

## Structure
- `index.html` — single page app
- `css/` — variables.css (tokens), base.css (reset), components.css (UI), app.css (page styles)
- `js/` — data.js (storage layer), app.js (main + workout tab), dashboard.js, history.js, progress.js
- `data/workouts.json` — workout data (source of truth, updated by Telegram bot)
- `.github/workflows/deploy.yml` — GitHub Pages deploy

## Data Flow
- Web UI → localStorage (immediate) + optional sync to JSON
- Telegram bot (future) → parses message → commits to data/workouts.json → deploy
- On page load: fetch JSON + merge with localStorage

## Language
- UI text: Russian
- Code, comments, filenames: English
- Commits: English, imperative, lowercase

## Rules
- No frameworks or build tools — keep it simple static
- Mobile-first design (used in the gym)
- Dark theme with electric blue accents
- All data in data/workouts.json — no databases
- Don't add dependencies without asking
- Don't commit secrets or tokens

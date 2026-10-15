# FirstPR frontend

FirstPR finds beginner-friendly GitHub issues that match your skills, turns one into a step-by-step plan, and mentors you through it — without writing the code for you.

React 18 + TypeScript + Vite, styled after GitHub's dark theme. The backend is a separate FastAPI service on Hugging Face Spaces ([confusedguy/firstpr-backend](https://huggingface.co/spaces/confusedguy/firstpr-backend)).

## Run it

```bash
npm install
npm run dev          # http://localhost:5173, talks to the deployed backend
```

Point it at another backend with `VITE_BACKEND_URL` (see `.env.example`):

```bash
# local backend
VITE_BACKEND_URL=http://localhost:7860 npm run dev

# no backend at all: a mock with canned answers
npm run mock                                          # terminal 1
VITE_BACKEND_URL=http://localhost:7861 npm run dev    # terminal 2
```

On Windows PowerShell, set the variable first: `$env:VITE_BACKEND_URL="http://localhost:7861"; npm run dev`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the built `dist/` |
| `npm test` | Unit tests for URL, plan and error parsing |
| `npm run mock` | Fake backend on port 7861 |

## Deploying (Vercel)

`vercel.json` tells Vercel to install with `npm ci`, build with `npm run build` and serve `dist/`, so it works even if the project was set up as a static site. To use a different backend, set `VITE_BACKEND_URL` under Project → Settings → Environment Variables and redeploy.

## Layout

```
src/
  App.tsx              state, persistence, backend calls
  components/          Header, SetupView, ScanView, IssuesView, PlanView, HelpPanel, …
  lib/api.ts           fetch with timeouts, readable errors, Space wake-up polling
  lib/github.ts        repo/issue URL parsing, reading issues out of /recommend
  lib/plan.ts          turns the mentor's numbered plan into checklist steps
  lib/storage.ts       safe session/local storage
  data/skill_map.json  copy of the backend's skill_map.json (keep in sync)
mock/server.mjs        offline stand-in for the backend
```

## Backend contract

The app works with the backend as deployed today, and uses newer fields when they exist:

- Every request sends `skills`. Older backends ignore it, so the app also calls `/init` before `/recommend` and `/plan`.
- `/recommend` currently returns only a markdown `message`; the app reads issue links, titles and fit % from it.
  If the response includes an `issues` array (the backend's internal issue dicts), the app uses that instead,
  which adds labels and exact fit scores.

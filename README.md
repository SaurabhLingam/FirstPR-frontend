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
  lib/providers.ts     AI provider presets, key-prefix hints, default-model picking
  lib/aiSettings.ts    the user's provider/key/model, stored in the browser
  data/skill_map.json  copy of the backend's skill_map.json (keep in sync)
mock/server.mjs        offline stand-in for the backend
```

## Bring your own key

The mentor runs on the user's own API key. Under **Connect AI** they pick a provider (OpenAI, Anthropic, Google Gemini, OpenRouter, Groq, Mistral, DeepSeek, xAI, or a custom OpenAI-compatible endpoint), paste a key, and choose a model from the provider's live list. Settings live in the browser (`localStorage`, or `sessionStorage` if "Remember" is off) and go to the backend as `X-LLM-*` headers on each request. Finding issues needs no key.

## Backend contract

- Every request sends `skills`; mentor requests also send the `X-LLM-*` headers.
- `/recommend` returns structured `issues` (labels, fit scores, matched skills) and, when a key is set, the mentor's `message`.
  For older backends that return only a markdown `message`, the app reads issue links, titles and fit % out of it.
- A `401` from the backend opens the AI settings dialog.

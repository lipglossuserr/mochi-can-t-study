# Mochi

A study-companion web app. Mochi is a virtual pet who responds to your study sessions, focus time, and in-room interactions. Study, earn XP and coins, and keep Mochi company.

---

## Prerequisites

- **Node.js 18+** (LTS recommended)
- **A Firebase project** — Authentication only (Email/Password and Google providers enabled)
- **A running Mochi backend API** (see the backend repository)

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in every value. **All variables are required.** The app throws a clear error on startup if any are missing.

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL, e.g. `http://localhost:8080/api` |
| `VITE_FIREBASE_API_KEY` | Firebase project API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain, e.g. `<project>.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |

Find all Firebase values at **console.firebase.google.com → Project settings → General → Your apps**.

### 3. Start the dev server

```bash
npm run dev
```

The app will be at `http://localhost:5173`. The Vite dev server proxies `/api/*` requests to `http://localhost:8080` automatically — the backend must be running for authenticated pages to work.

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Type-check then build for production (`dist/`) |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the test suite once (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint with Oxlint |

---

## Architecture Overview

```
src/
├── features/
│   ├── character/   — Behavioural engine (state machine, memory, presence, routine)
│   ├── environment/ — Time-of-day lighting engine (fully independent of character)
│   ├── home/        — Room scene UI (composes character + environment)
│   └── pet/         — Backend pet data (XP, coins, stage, Feed/Play actions)
├── hooks/
│   ├── useStudySession.ts  — Session lifecycle; server timestamps are source of truth
│   └── useFocusTracker.ts  — Webcam focus tracking via MediaPipe (local, private)
├── auth/            — Firebase auth context
├── lib/             — env.ts: typed, validated environment variable access
├── components/      — Cross-cutting UI: navigation, study sub-components, ErrorBoundary
├── pages/           — Route-level components
└── styles/          — globals.css: Tailwind v4 @theme design tokens + keyframes
```

Key design decisions are documented in `changes.md` (internal sprint notes) and in inline JSDoc throughout the engine modules.

---

## Rive Animation Asset

The character renderer expects a Rive file at `public/mochi.riv` with:

- **State machine name:** `PetStateMachine`
- **Input name:** `state` (numeric)
- **Input values:** `0` = IDLE, `1` = STUDYING, `2` = CELEBRATING, `3` = HAPPY

While `mochi.riv` is absent, the app automatically uses `LivingMochiRenderer` — a hand-drawn SVG renderer that understands the full semantic state vocabulary. No code changes are needed when the real asset is dropped in.

---

## Environment-by-Environment Notes

**Local development:**
- Set `VITE_API_URL=http://localhost:8080/api`.
- Firebase credentials are your real project's dev credentials — no emulator setup is required, though the Firebase Auth emulator can be used.

**Staging / production builds:**
- Run `npm run build` — output goes to `dist/`.
- All `VITE_*` variables must be set in the CI/CD environment **at build time** (they are inlined by Vite, not read at runtime).
- The `VITE_API_URL` must point to the deployed backend.

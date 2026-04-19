# Heartopia Overlay v1 — Design

**Date:** 2026-04-20
**Status:** Approved (brainstorming output)
**Scope:** Full v1 delivery, PRD milestones M1–M3
**Sequencing:** Approach C — strict milestone discipline with a week-1 packaging smoke test

---

## 1. Architecture

Two processes, one bundled content payload.

- **Main** (`src/main/`): window lifecycle, `globalShortcut`, `electron-store`, `electron-updater` feed against GitHub Releases, display-geometry math for centering on the primary monitor.
- **Renderer** (`src/renderer/`): Vue 3 + Vite. Owns all UI — search bar, result list, detail panel, category tabs, settings, About. Pinia holds overlay open/close, current query, selected result, loaded content, active category filter.
- **Preload** (`src/preload/index.ts`): the only bridge. Exposes a single typed `window.htp` surface via `contextBridge`: `togglePanel()`, `hidePanel()`, `getPrefs()`, `setPrefs()`, `onHotkeyToggle(cb)`, `loadContent()`, `checkForUpdates()`, `installUpdate()`. `nodeIntegration: false`, `contextIsolation: true`, no `remote`. This is the security boundary.
- **Content**: static JSON in `src/content/`, bundled into the asar. Loaded once by the renderer at app-ready via a preload-exposed asar read (not `fetch`, not a dev server in production). fuse.js index built once in memory; searches run against that index in the renderer. Zero runtime network calls for content.
- **Window profile**: `BrowserWindow` with `transparent: true`, `frame: false`, `alwaysOnTop: true`, `focusable: false` on open. `focusable` flips to `true` only when the user explicitly clicks the panel, so game keyboard focus survives the hotkey press. Re-pressing the hotkey, `Escape`, or a click outside the panel hides it and restores `focusable: false`.
- **Packaging & updates**: electron-builder produces an NSIS `.exe`; `publish` target is GitHub Releases. `electron-updater` checks the feed on launch, surfaces a non-intrusive in-app banner, one-click install. Self-signed in v1; EV cert deferred.

## 2. Components

### Main process (`src/main/`)
- `index.ts` — app bootstrap, `whenReady` → create window, register IPC handlers, wire updater. Single `BrowserWindow` reused for the overlay's lifetime (show/hide, not create/destroy, so the fuse index survives).
- `window.ts` — `BrowserWindow` builder with the transparency/focusable profile, plus `showCentered()` that queries `screen.getPrimaryDisplay().workArea` each call so monitor changes between opens are handled.
- `hotkey.ts` — registers the current binding via `globalShortcut`, detects conflicts on registration failure, exposes `rebind(accelerator)` used by the settings screen. Validates against a deny-list of common Heartopia/Discord accelerators before registering.
- `updater.ts` — `electron-updater` wrapper. Emits `update-available` / `update-downloaded` events over IPC; never auto-installs.
- `store.ts` — typed `electron-store` wrapper. Schema: hotkey string, clearOnClose bool, launchAtLogin bool, lastVersion string.
- `ipc.ts` — registers every `ipcMain.handle` endpoint backing the preload surface. One file so the allowed channel list is auditable in one place.

### Preload (`src/preload/`)
- `index.ts` — exposes `window.htp` via `contextBridge`.
- `htp.d.ts` — typed surface shared with the renderer via `tsconfig` paths.

### Renderer (`src/renderer/`)
- `App.vue` — root; mounts the panel, binds `Escape` + click-outside dismiss, listens to `htp.onHotkeyToggle`.
- `components/SearchBar.vue` — autofocused input, debounced (~120ms) emit.
- `components/ResultList.vue` — virtualized if >100 rows; keyboard nav (↑/↓/Enter).
- `components/ResultDetail.vue` — renders sanitized `body` markdown, shows source + tags.
- `components/CategoryFilter.vue` — All / Items / Mechanics / Tips tabs.
- `components/SettingsPanel.vue` — hotkey capture field + preference toggles.
- `components/AboutScreen.vue` — version, changelog link, content attribution.
- `composables/useContent.ts` — loads JSON via `htp.loadContent()`, builds fuse index once.
- `composables/useSearch.ts` — wraps the fuse instance; handles category filter + query.
- `stores/overlay.ts` — Pinia store: `open`, `view='search'|'settings'|'about'`, `query`, `selectedId`, `activeCategory`.

### Scraper (`scripts/scraper/`) — Python 3.12, standalone, not shipped
- `scrape_heartopia.py` — fetches + parses source pages.
- `transform.py` — normalizes into the content schema.
- `requirements.txt`; invoked via `npm run content:scrape`.

### Build / tooling (top level)
- `electron.vite.config.ts`, `tsconfig.json` (+ per-process extensions), `.eslintrc`, `.prettierrc`, `vitest.config.ts`, `playwright.config.ts`, `build/` for electron-builder YAML, GitHub Actions workflow for release.

## 3. Data flow

### Startup (cold boot)
1. Main: `app.whenReady` → read prefs from `electron-store` → create `BrowserWindow` (hidden, `focusable: false`) → load renderer → register hotkey from prefs → kick off background `updater.checkForUpdates()`.
2. Renderer: mounts, calls `htp.loadContent()`. Preload reads bundled `src/content/*.json` from the asar and returns parsed arrays. `useContent` merges them and builds the fuse index once. Pinia flips `contentReady = true`.
3. Updater (async): if a new version exists, main emits `update-available` → renderer shows a dismissible banner.

### Open / close cycle
1. User presses `Ctrl+Shift+H`. Main's `globalShortcut` handler → `window.showCentered()` → emits `hotkey-toggle` IPC. Renderer focuses the search input.
2. Re-press, `Escape` (renderer-side), or blur from click-outside → renderer calls `htp.hidePanel()` → main hides the window and restores `focusable: false`. Per prefs, overlay store either clears `query` / `selectedId` or keeps them for the session.

### Search
- `SearchBar` debounces input ~120ms → updates `overlay.query`. `useSearch` runs `fuse.search(query)` scoped by `activeCategory`, returns sorted hits. `ResultList` renders; ↑/↓/Enter drive `selectedId`. `ResultDetail` renders the picked entry's markdown.
- Entirely in-renderer. No IPC per keystroke.

### Settings write
- `SettingsPanel` captures a new accelerator → `htp.setPrefs({ hotkey })` → main validates against deny-list, tries `globalShortcut.register`. On success, persists via `electron-store` and replies ok. On conflict/failure, returns a typed error → UI shows "that shortcut is already in use."

### Update install
- User clicks "Update now" on banner → `htp.installUpdate()` → main calls `autoUpdater.quitAndInstall()`.

### Scraper (offline, developer-only)
- `npm run content:scrape` → Python fetches source pages → `transform.py` emits JSON matching the schema into `src/content/`. Maintainer reviews the diff in git before committing. Never runs at user runtime.

## 4. Error handling

Boundaries only. Trust our own code; validate where the outside world touches us.

### Startup — fail fast, fail loud
- Missing / corrupt content JSON: main logs the specific file + parse error; renderer shows a full-panel error state with the file name and a "Copy diagnostic" button. No silent fallback to empty results — an empty overlay looks like a bug.
- Schema violation (missing `id`, unknown `category`): validate at load via a Zod schema shared between scraper and renderer. Bad entries are dropped with a console warning listing their IDs; valid entries still load. Count surfaced in About screen diagnostics.
- Preload bridge failure (`htp` undefined): renderer renders a hard-fail screen — something is badly wrong with the build, not a user-fixable state.

### Hotkey
- Registration fails (conflict with another app): main returns `{ ok: false, reason: 'conflict' }`. On startup, falls back to the default binding and flags a non-blocking toast. In settings, the rebind UI shows the specific error inline without overwriting prefs.
- Deny-list rejection (user tries `Tab`, `E`, `W`, etc.): return `{ ok: false, reason: 'reserved' }` with the offending key named.

### Updater
- Network failure or GitHub rate limit: swallow silently at startup (it is a background check), log to file. Surface only when the user explicitly clicks "Check for updates" in About.
- Download corruption / signature failure: `electron-updater` retries; after final failure, renderer banner changes to "Update failed — retry" with a log link.

### Scraper (dev-time)
- HTTP non-200, parse mismatch, or schema validation failure: exit non-zero with the failing URL and what it expected. No partial writes — transform into a temp file, rename on success. A failed scrape never leaves `src/content/` in a half-updated state.

### Deliberately not handled
- Runtime network errors in the renderer — there are none; content is bundled.
- IPC channel typos — TypeScript plus the single `ipc.ts` registration file catch these at compile time.
- Multi-monitor edge cases beyond "use primary display's workArea on each open" — out of scope for v1.

## 5. Testing

TDD per project principles: unit + E2E for every feature. Vitest for renderer + main modules (jsdom for components, node env for main); Playwright for end-to-end against the packaged app.

### Unit (Vitest — `tests/unit/`)
- `useSearch.spec.ts` — fuse index build, category scoping, empty-query behavior, debounce semantics, ranking of expected hits on a fixture dataset.
- `useContent.spec.ts` — happy path, malformed JSON, schema violations dropped not thrown, counts reported.
- `stores/overlay.spec.ts` — open/close transitions, clear-on-close pref respected, selection reset on category change.
- `main/hotkey.spec.ts` — accelerator validation against deny-list, conflict handling, rebind success/failure paths (mock `globalShortcut`).
- `main/store.spec.ts` — schema migrations, default values, type safety (mock `electron-store`).
- `main/window.spec.ts` — centering math across display geometries (mock `screen`).
- `scripts/scraper/test_transform.py` — schema compliance of transformed entries, stable IDs, handling of missing optional fields. `pytest`, lives with the scraper.

### E2E (Playwright — `tests/e2e/`)
Run against a real electron-builder output via `@playwright/test` + `electron` fixture.
- Core flow: launch app → verify hidden → simulate hotkey → panel appears centered → type query → select first result with keyboard → detail panel renders → press Escape → panel hidden → game-focus preserved (assert via window `focusable` state).
- Category filter: open → tab to "Items" → search narrows correctly.
- Settings: open settings → rebind hotkey to a safe accelerator → close → new hotkey works, old one does not.
- Rebind conflict: attempt to bind a reserved key → inline error shown, prefs unchanged.
- Updater banner (mocked feed): stub GitHub Releases response → launch → banner appears → dismiss persists for session.
- Content error surface: start with an intentionally malformed JSON fixture → error screen renders with filename.

### CI (GitHub Actions)
- On PR: lint → typecheck → Vitest → Playwright (headless, Windows runner).
- On tag push `v*`: the release workflow — build signed NSIS, upload to GitHub Release, auto-updater feed goes live. Release workflow runs the E2E suite against the built artifact before publishing.

### Not tested in v1
- Installer UI itself (NSIS pages) — manual smoke only.
- Multi-monitor auto-selection beyond "primary display."
- Real network against GitHub Releases — always stubbed in E2E; validated manually in the week-1 packaging smoke test.

## 6. Milestone sequencing (approach C)

### Week 1 — M1 + packaging smoke test
- Day 1–2: repo scaffolding. Create public GitHub repo (MIT, README, issue templates, `main` branch protection). Initialize Vite + Electron + Vue 3 + TypeScript strict. ESLint/Prettier, Vitest/Playwright configs, GitHub Actions skeleton (lint + typecheck + unit on PR).
- Day 2–3: main process — window builder with transparency/focusable profile, `showCentered`, preload bridge + typed `htp` surface, `store.ts`.
- Day 3–4: `hotkey.ts` with deny-list + conflict detection; renderer shell (`App.vue`) wires hotkey toggle, Escape, click-outside. Pinia store stub.
- Day 4: unit tests for `window`, `hotkey`, `store`, `overlay` store.
- Day 5: **packaging smoke test.** electron-builder config, unsigned NSIS output, manual install on a clean Windows VM, cut a `v0.0.1-smoke` pre-release on GitHub, verify `electron-updater` can see the feed. Fix anything the pipeline surfaces. No auto-updater UI yet.

### Week 2 — M2 search + content (+ scraper)
- Day 1–2: Zod content schema, `useContent`, bundled-asset load via preload. Fixture JSON (~5 entries) for early tests.
- Day 2–3: `useSearch` + fuse index, `SearchBar`, `ResultList`, `ResultDetail`, `CategoryFilter`. Keyboard nav. Markdown rendering (sanitized).
- Day 3–4: scraper in `scripts/scraper/` — minimal crawler against permitted sources, `transform.py` emitting schema-valid JSON, `pytest` on transform. Run it, hand-review the diff, commit the first real ~20 entries.
- Day 5: unit tests for search/content/stores against real content. Playwright E2E for core search flow.

### Week 3 — M3 polish + release
- Day 1–2: `SettingsPanel` (hotkey rebind with live conflict check, clear-on-close toggle, launch-at-login via `app.setLoginItemSettings`). `AboutScreen` with version, changelog link, attribution list.
- Day 2–3: `updater.ts` full wire-up — banner, install flow, mocked-feed E2E.
- Day 3–4: remaining Playwright coverage (rebind, updater banner, content-error surface). CI release workflow — tag push → signed (self-signed v1) NSIS → GitHub Release → E2E against the built artifact before publish.
- Day 5: release `v1.0.0`. Manual install on clean Win 10 + Win 11 VMs. Validate auto-update from `v1.0.0-rc` → `v1.0.0`. Ship.

### Checkpoints
End of each week: demoable artifact. End of week 1 the smoke release is the hardest proof point — if packaging / update feed do not work by Friday of week 1, re-plan before entering M2.

---

## Decisions captured from brainstorming

- **Scope:** full v1 (M1–M3).
- **Content source:** scraper-first, with permission confirmed for all listed reference sites (see memory `project_content_permission.md`). Resolves PRD Open Q #1.
- **GitHub repo:** does not exist yet; creating it is a week-1 day-1 task.
- **Sequencing:** approach C (milestone discipline + week-1 packaging smoke test).

## Next step

Hand off to `superpowers:writing-plans` skill to convert this design into a concrete implementation plan with tasks and verification criteria.

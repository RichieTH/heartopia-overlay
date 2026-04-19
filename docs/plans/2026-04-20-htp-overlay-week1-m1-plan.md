# Heartopia Overlay — Week 1 (M1 + Packaging Smoke Test) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Stand up an Electron + Vue 3 + TypeScript overlay that toggles on `Ctrl+Shift+H`, renders centered on the primary display, dismisses on hotkey/Escape/click-outside, and ships end-to-end through electron-builder → GitHub Releases as an unsigned NSIS pre-release (`v0.0.1-smoke`) so the auto-update feed is proven before M2.

**Architecture:** Two processes, one content bundle (content loads in M2). Main process owns OS-facing concerns (window lifecycle, globalShortcut, electron-store, updater feed). Renderer owns UI. The only bridge is a typed `window.htp` surface exposed via `contextBridge` from `src/preload/`.

**Tech Stack:** Electron (latest stable), Vue 3 + Vite via `electron-vite`, TypeScript strict, Pinia, Tailwind CSS v4, electron-store, electron-updater, electron-builder (NSIS), Vitest (unit), Playwright (E2E), ESLint + Prettier, GitHub Actions.

---

## Scope & Non-Goals for Week 1

**In scope**
- Public GitHub repo creation with MIT license, README, issue templates, branch protection
- Node/npm project scaffolding (package.json, tsconfig, electron-vite config)
- Main process: `store.ts`, `window.ts`, `hotkey.ts`, `ipc.ts`, `index.ts`, skeleton `updater.ts` (no UI banner yet)
- Preload: typed `htp` surface
- Renderer shell: `App.vue`, `main.ts`, Pinia `overlay` store, Tailwind wired (no search, no content, no settings UI yet)
- Unit tests (Vitest) for `store`, `window`, `hotkey`, `overlay` store
- electron-builder configured; unsigned NSIS build produced
- `v0.0.1-smoke` pre-release tagged and published via CI
- Manual install on a clean Windows 11 VM, verify updater feed reachable

**Deliberately out of scope until M2/M3**
- Content loading, fuse.js, search UI (M2)
- SettingsPanel, AboutScreen, updater banner (M3)
- Playwright E2E (M2 onward — we smoke-test manually in Week 1)
- Code signing (deferred to M3; v1 is self-signed)

**Precondition:** This plan starts from the current repo state — initial commit `8c81bd7` on `main` branch with PRD.md and design doc committed. Project path `/dev/htp_overlay` is richie-owned.

---

## Conventions Used Below

- **Files sections** name every file a task creates / modifies.
- **Step N** is one concrete action the implementer performs (2–5 min). Each TDD cycle runs: write failing test → verify fail → minimal impl → verify pass → commit.
- **Commands** are copy-pasteable; expected output is shown for anything non-obvious.
- **Commit messages** follow the repo convention established in the initial commit (subject + thorough body; Co-Authored-By line appended by the executor per their settings).
- Assume Node 22.x LTS; if `node -v` disagrees, install via nvm before starting.

---

# Section A — Repo, toolchain, CI skeleton (Day 1–2)

## Task A1: Establish project-local `.gitignore`

**Why:** Richie's global gitignore covers most noise, but the executor (or contributors) may not have it. A project `.gitignore` makes the repo self-contained.

**Files:**
- Create: `.gitignore`

**Step 1: Create `.gitignore`**

```gitignore
# Node / npm
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.npm/
.eslintcache
.stylelintcache

# TypeScript
*.tsbuildinfo

# Build outputs
dist/
dist-electron/
out/
release/
build/output/
*.asar

# electron-builder
build/*.exe
build/*.zip
build/*.blockmap
build/*.yml.lock

# Test & coverage
coverage/
.nyc_output/
test-results/
playwright-report/
playwright/.cache/

# IDEs
.vscode/
!.vscode/extensions.json
.idea/
*.iml

# OS
.DS_Store
Thumbs.db

# Local env
.env
.env.*
!.env.example

# Vite cache
.vite/
```

**Step 2: Verify ignore works**

```bash
cd /dev/htp_overlay
git check-ignore -v node_modules/foo dist/bar .vite/baz || echo "NOT IGNORED (bug)"
```

Expected: each path prints as ignored by a `.gitignore` rule.

**Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: add project-local .gitignore"
```

---

## Task A2: README and LICENSE

**Files:**
- Create: `README.md`
- Create: `LICENSE`

**Step 1: Write `LICENSE`** — standard MIT license text with `Copyright (c) 2026 Richard (Heartopia Overlay contributors)` on the copyright line. Use the canonical MIT text from <https://opensource.org/license/mit>.

**Step 2: Write `README.md`**

```markdown
# Heartopia Overlay

A free, open-source Windows desktop overlay for Heartopia players.
Press `Ctrl+Shift+H` in-game to pop up a searchable knowledge base
centered over the game; press again (or `Escape`) to dismiss.

## Status

**Pre-release.** Currently tracking v1 per [PRD](PRD.md) and
[v1 design](docs/plans/2026-04-20-htp-overlay-v1-design.md).

## Install

Grab the latest `Heartopia-Overlay-Setup-<version>.exe` from
[Releases](../../releases). No admin rights required.

## Build from source

```bash
# Node 22 LTS required
npm install
npm run dev         # Electron + Vite dev mode
npm run test        # Vitest unit tests
npm run build:win   # Produce NSIS installer in build/output/
```

## Hotkey

Default: `Ctrl+Shift+H`. Chosen to avoid known Heartopia binds
(TAB, E, WASD, F) and common Discord defaults. Rebind in
Settings (M3).

## License

MIT. See [LICENSE](LICENSE).

## Attribution

Content sourced from community fan sites (heartopia.life,
heartopiagame.org, heartopia.cc, heartopiawiki.com) with
permission. Per-entry `source` field and About screen credits
listed in-app.
```

**Step 3: Commit**

```bash
git add README.md LICENSE
git commit -m "docs: add README and MIT LICENSE"
```

---

## Task A3: Create GitHub repo and push

**Requires:** `gh` CLI authenticated (`gh auth status`).

**Step 1: Verify gh auth**

```bash
gh auth status
```

Expected: "Logged in to github.com as <handle>".

**Step 2: Create repo**

```bash
gh repo create heartopia-overlay \
  --public \
  --description "Windows desktop overlay for Heartopia — hotkey-triggered, searchable knowledge base" \
  --source=. \
  --remote=origin \
  --push
```

Expected: repo created, current `main` branch pushed.

**Step 3: Verify**

```bash
gh repo view --web   # opens browser
git remote -v        # confirms origin
```

No commit in this task — repo creation is a side-effect.

---

## Task A4: Add GitHub issue templates

**Files:**
- Create: `.github/ISSUE_TEMPLATE/bug_report.yml`
- Create: `.github/ISSUE_TEMPLATE/feature_request.yml`
- Create: `.github/ISSUE_TEMPLATE/config.yml`

**Step 1: Bug report template**

```yaml
# .github/ISSUE_TEMPLATE/bug_report.yml
name: Bug report
description: Something doesn't work as expected
labels: [bug]
body:
  - type: input
    id: version
    attributes:
      label: App version
      description: Shown in the About screen
    validations: { required: true }
  - type: input
    id: os
    attributes:
      label: Windows version
      placeholder: "Windows 11 23H2"
    validations: { required: true }
  - type: textarea
    id: steps
    attributes:
      label: Steps to reproduce
    validations: { required: true }
  - type: textarea
    id: expected
    attributes: { label: Expected behavior }
    validations: { required: true }
  - type: textarea
    id: actual
    attributes: { label: Actual behavior }
    validations: { required: true }
  - type: textarea
    id: logs
    attributes:
      label: Logs (optional)
      description: Paste from the About screen "Copy diagnostic" button
```

**Step 2: Feature request template**

```yaml
# .github/ISSUE_TEMPLATE/feature_request.yml
name: Feature request
description: Suggest a new feature or content category
labels: [enhancement]
body:
  - type: textarea
    id: problem
    attributes:
      label: What problem does this solve?
    validations: { required: true }
  - type: textarea
    id: proposal
    attributes: { label: Proposed solution }
  - type: textarea
    id: alternatives
    attributes: { label: Alternatives considered }
```

**Step 3: Template chooser config**

```yaml
# .github/ISSUE_TEMPLATE/config.yml
blank_issues_enabled: false
contact_links:
  - name: Heartopia gameplay help
    url: https://heartopia.life
    about: For gameplay questions, try the community sites first.
```

**Step 4: Commit and push**

```bash
git add .github/ISSUE_TEMPLATE/
git commit -m "chore(gh): add bug and feature issue templates"
git push
```

---

## Task A5: Branch protection on `main`

**Step 1: Apply protection via gh API**

```bash
gh api \
  -X PUT \
  "repos/:owner/heartopia-overlay/branches/main/protection" \
  -f required_status_checks='null' \
  -f enforce_admins=false \
  -f required_pull_request_reviews='{"required_approving_review_count":0,"dismiss_stale_reviews":true}' \
  -f restrictions='null' \
  -f allow_force_pushes=false \
  -f allow_deletions=false
```

(We set `required_status_checks=null` now and add the CI check later in Task A13 once it exists.)

Expected: JSON response describing the protection rules.

**Step 2: Verify**

```bash
gh api "repos/:owner/heartopia-overlay/branches/main/protection" | jq
```

Confirm `allow_force_pushes.enabled: false` and `allow_deletions.enabled: false`.

No commit.

---

## Task A6: Initialize npm project

**Files:**
- Create: `package.json`

**Step 1: `npm init -y`**

```bash
npm init -y
```

**Step 2: Edit `package.json`** to this shape (overwrite the generated stub):

```json
{
  "name": "heartopia-overlay",
  "version": "0.0.0",
  "description": "Windows desktop overlay for Heartopia",
  "author": "Richard",
  "license": "MIT",
  "private": true,
  "main": "dist-electron/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "build:win": "electron-vite build && electron-builder --win --publish never",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "lint": "eslint . --ext .ts,.vue && prettier --check .",
    "lint:fix": "eslint . --ext .ts,.vue --fix && prettier --write .",
    "typecheck": "vue-tsc --noEmit -p tsconfig.web.json && tsc --noEmit -p tsconfig.node.json"
  }
}
```

**Step 3: Commit**

```bash
git add package.json
git commit -m "chore: initialize npm project"
```

---

## Task A7: Install core dependencies

**Step 1: Runtime deps**

```bash
npm install --save \
  electron-store@latest \
  electron-updater@latest \
  pinia@latest \
  vue@latest
```

**Step 2: Dev deps — toolchain**

```bash
npm install --save-dev \
  electron@latest \
  electron-builder@latest \
  electron-vite@latest \
  @electron-toolkit/utils@latest \
  vite@latest \
  @vitejs/plugin-vue@latest \
  typescript@latest \
  vue-tsc@latest \
  @types/node@latest
```

**Step 3: Dev deps — test + lint**

```bash
npm install --save-dev \
  vitest@latest \
  @vue/test-utils@latest \
  jsdom@latest \
  @playwright/test@latest \
  eslint@latest \
  @typescript-eslint/parser@latest \
  @typescript-eslint/eslint-plugin@latest \
  eslint-plugin-vue@latest \
  prettier@latest
```

**Step 4: Dev deps — styling**

```bash
npm install --save-dev \
  tailwindcss@next \
  @tailwindcss/vite@next \
  postcss@latest \
  autoprefixer@latest
```

**Step 5: Verify lock file and commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install electron, vue, tooling, test and styling deps"
```

---

## Task A8: TypeScript configs

**Files:**
- Create: `tsconfig.json`
- Create: `tsconfig.web.json`
- Create: `tsconfig.node.json`

**Step 1: Root `tsconfig.json`** (project references only)

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.web.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

**Step 2: `tsconfig.web.json`** — renderer + preload types

```json
{
  "extends": "@electron-toolkit/tsconfig/tsconfig.web.json",
  "include": [
    "src/renderer/**/*.ts",
    "src/renderer/**/*.vue",
    "src/renderer/**/*.tsx",
    "src/preload/*.ts",
    "src/preload/*.d.ts"
  ],
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "baseUrl": ".",
    "paths": {
      "@renderer/*": ["src/renderer/*"],
      "@preload/*": ["src/preload/*"]
    }
  }
}
```

**Step 3: `tsconfig.node.json`** — main process types

```json
{
  "extends": "@electron-toolkit/tsconfig/tsconfig.node.json",
  "include": ["src/main/**/*.ts", "electron.vite.config.ts"],
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "baseUrl": ".",
    "paths": {
      "@main/*": ["src/main/*"]
    }
  }
}
```

**Step 4: Install the extends package**

```bash
npm install --save-dev @electron-toolkit/tsconfig
```

**Step 5: Verify typecheck runs** (even with no files yet)

```bash
npm run typecheck
```

Expected: no output, exit 0.

**Step 6: Commit**

```bash
git add tsconfig*.json package.json package-lock.json
git commit -m "chore(ts): add strict TypeScript configs for web and node"
```

---

## Task A9: electron-vite configuration

**Files:**
- Create: `electron.vite.config.ts`
- Create: `src/renderer/index.html`

**Step 1: `electron.vite.config.ts`**

```ts
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { "@main": resolve("src/main") } },
    build: { outDir: "dist-electron/main" },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { "@preload": resolve("src/preload") } },
    build: { outDir: "dist-electron/preload" },
  },
  renderer: {
    root: "src/renderer",
    plugins: [vue(), tailwindcss()],
    resolve: { alias: { "@renderer": resolve("src/renderer") } },
    build: { outDir: "dist-electron/renderer" },
  },
});
```

**Step 2: `src/renderer/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Heartopia Overlay</title>
    <meta http-equiv="Content-Security-Policy"
          content="default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self';" />
  </head>
  <body class="bg-transparent">
    <div id="app"></div>
    <script type="module" src="./main.ts"></script>
  </body>
</html>
```

**Step 3: Commit**

```bash
mkdir -p src/{main,preload,renderer}
git add electron.vite.config.ts src/renderer/index.html
git commit -m "chore(build): electron-vite config for main, preload, renderer"
```

---

## Task A10: ESLint + Prettier

**Files:**
- Create: `.eslintrc.cjs`
- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Create: `.eslintignore`

**Step 1: `.eslintrc.cjs`**

```js
module.exports = {
  root: true,
  env: { node: true, browser: true, es2022: true },
  parser: "vue-eslint-parser",
  parserOptions: {
    parser: "@typescript-eslint/parser",
    ecmaVersion: "latest",
    sourceType: "module",
    extraFileExtensions: [".vue"],
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:vue/vue3-recommended",
  ],
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "vue/multi-word-component-names": "off",
  },
};
```

**Step 2: `.prettierrc.json`**

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "arrowParens": "always"
}
```

**Step 3: `.prettierignore`**

```
node_modules
dist
dist-electron
build/output
coverage
playwright-report
*.min.*
package-lock.json
```

**Step 4: `.eslintignore`**

```
node_modules
dist
dist-electron
build/output
coverage
playwright-report
*.min.*
```

**Step 5: Verify lint passes (trivially — no source yet)**

```bash
npm run lint
```

Expected: exit 0.

**Step 6: Commit**

```bash
git add .eslintrc.cjs .prettierrc.json .prettierignore .eslintignore
git commit -m "chore(lint): add ESLint + Prettier configuration"
```

---

## Task A11: Vitest configuration

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/unit/.gitkeep`

**Step 1: `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/unit/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,vue}"],
      exclude: ["src/**/*.d.ts", "src/renderer/main.ts"],
    },
  },
  resolve: {
    alias: {
      "@main": resolve("src/main"),
      "@preload": resolve("src/preload"),
      "@renderer": resolve("src/renderer"),
    },
  },
});
```

**Step 2: Sanity test**

Create `tests/unit/sanity.spec.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("sanity", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

**Step 3: Run**

```bash
npm run test
```

Expected: 1 passed.

**Step 4: Commit**

```bash
git add vitest.config.ts tests/unit/sanity.spec.ts
git commit -m "chore(test): configure Vitest with jsdom and sanity test"
```

---

## Task A12: Playwright configuration (skeleton only)

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/.gitkeep`

**Step 1: `playwright.config.ts`**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { trace: "on-first-retry" },
});
```

We don't install Playwright browsers in Week 1; real E2E starts in Week 2.

**Step 2: Commit**

```bash
mkdir -p tests/e2e
touch tests/e2e/.gitkeep
git add playwright.config.ts tests/e2e/.gitkeep
git commit -m "chore(test): add Playwright config skeleton (tests start in M2)"
```

---

## Task A13: GitHub Actions — lint, typecheck, unit on PR

**Files:**
- Create: `.github/workflows/ci.yml`

**Step 1: `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  lint-type-test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
```

**Step 2: Commit and push**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: lint, typecheck, unit tests on PR and main"
git push
```

**Step 3: Verify workflow runs**

```bash
gh run list --limit 3
gh run watch
```

Expected: run completes green.

**Step 4: Add CI as required status check**

```bash
gh api -X PATCH \
  "repos/:owner/heartopia-overlay/branches/main/protection/required_status_checks" \
  -f strict=true \
  -F contexts='["lint-type-test"]'
```

Expected: JSON response reflects the required check.

No additional commit — branch protection is repo metadata.

---

# Section B — Main process (Day 2–3)

Every task in this section follows strict TDD: failing test → minimal impl → passing test → commit. The implementer should internalize this cycle before starting.

## Task B1: Store schema and defaults — failing test

**Why:** `electron-store` is mockable, so we test it as a thin wrapper with a typed schema.

**Files:**
- Create: `tests/unit/main/store.spec.ts`

**Step 1: Write the failing test**

```ts
// tests/unit/main/store.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("electron-store", () => {
  const backing = new Map<string, unknown>();
  return {
    default: class MockStore {
      constructor(opts: { defaults?: Record<string, unknown> }) {
        if (opts?.defaults) {
          for (const [k, v] of Object.entries(opts.defaults)) {
            if (!backing.has(k)) backing.set(k, v);
          }
        }
      }
      get(key: string) {
        return backing.get(key);
      }
      set(key: string, value: unknown) {
        backing.set(key, value);
      }
      // Test hook
      static __reset() {
        backing.clear();
      }
    },
  };
});

import { getPrefs, setPrefs, DEFAULT_PREFS } from "@main/store";
import StoreCtor from "electron-store";

describe("main/store", () => {
  beforeEach(() => {
    (StoreCtor as unknown as { __reset: () => void }).__reset();
  });

  it("returns defaults when nothing has been written", () => {
    const prefs = getPrefs();
    expect(prefs).toEqual(DEFAULT_PREFS);
  });

  it("round-trips a hotkey change", () => {
    setPrefs({ hotkey: "Ctrl+Alt+Y" });
    expect(getPrefs().hotkey).toBe("Ctrl+Alt+Y");
  });

  it("preserves unwritten keys when partially updating", () => {
    setPrefs({ clearOnClose: false });
    expect(getPrefs().hotkey).toBe(DEFAULT_PREFS.hotkey);
    expect(getPrefs().clearOnClose).toBe(false);
  });
});
```

**Step 2: Verify fails**

```bash
npm run test -- store.spec
```

Expected: failure — `@main/store` does not exist.

---

## Task B2: Store — minimal implementation

**Files:**
- Create: `src/main/store.ts`

**Step 1: Implement**

```ts
// src/main/store.ts
import Store from "electron-store";

export type Prefs = {
  hotkey: string;
  clearOnClose: boolean;
  launchAtLogin: boolean;
  lastVersion: string;
};

export const DEFAULT_PREFS: Prefs = {
  hotkey: "CommandOrControl+Shift+H",
  clearOnClose: true,
  launchAtLogin: false,
  lastVersion: "",
};

const store = new Store<Prefs>({ defaults: DEFAULT_PREFS });

export function getPrefs(): Prefs {
  return {
    hotkey: store.get("hotkey"),
    clearOnClose: store.get("clearOnClose"),
    launchAtLogin: store.get("launchAtLogin"),
    lastVersion: store.get("lastVersion"),
  };
}

export function setPrefs(patch: Partial<Prefs>): void {
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) store.set(k, v);
  }
}
```

**Step 2: Verify passes**

```bash
npm run test -- store.spec
```

Expected: 3 passed.

**Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: exit 0.

**Step 4: Commit**

```bash
git add src/main/store.ts tests/unit/main/store.spec.ts
git commit -m "feat(main): typed electron-store wrapper with schema and defaults"
```

---

## Task B3: Window centering math — failing test

**Why:** Centering logic is pure (inputs: workArea, window size; output: x/y) — test it in isolation without constructing a real BrowserWindow.

**Files:**
- Create: `tests/unit/main/window.spec.ts`

**Step 1: Write the failing test**

```ts
// tests/unit/main/window.spec.ts
import { describe, it, expect } from "vitest";
import { computeCenteredBounds } from "@main/window";

describe("computeCenteredBounds", () => {
  it("centers a 720x480 window on a 1920x1080 primary display", () => {
    const bounds = computeCenteredBounds(
      { x: 0, y: 0, width: 1920, height: 1080 },
      { width: 720, height: 480 },
    );
    expect(bounds).toEqual({ x: 600, y: 300, width: 720, height: 480 });
  });

  it("respects a non-zero workArea origin (taskbar offset)", () => {
    const bounds = computeCenteredBounds(
      { x: 0, y: 40, width: 1920, height: 1040 },
      { width: 720, height: 480 },
    );
    expect(bounds).toEqual({ x: 600, y: 320, width: 720, height: 480 });
  });

  it("clamps to workArea origin when the window is larger than the display", () => {
    const bounds = computeCenteredBounds(
      { x: 0, y: 0, width: 400, height: 300 },
      { width: 720, height: 480 },
    );
    expect(bounds.x).toBe(0);
    expect(bounds.y).toBe(0);
  });
});
```

**Step 2: Verify fails**

```bash
npm run test -- window.spec
```

Expected: module not found.

---

## Task B4: Window module — minimal implementation

**Files:**
- Create: `src/main/window.ts`

**Step 1: Implement the pure math first, then the factory**

```ts
// src/main/window.ts
import { BrowserWindow, screen } from "electron";
import { join } from "node:path";

export type Rect = { x: number; y: number; width: number; height: number };
export type Size = { width: number; height: number };

export function computeCenteredBounds(workArea: Rect, size: Size): Rect {
  const x = Math.max(workArea.x, workArea.x + Math.floor((workArea.width - size.width) / 2));
  const y = Math.max(workArea.y, workArea.y + Math.floor((workArea.height - size.height) / 2));
  return { x, y, ...size };
}

const DEFAULT_SIZE: Size = { width: 720, height: 480 };

export function createOverlayWindow(): BrowserWindow {
  const preloadPath = join(__dirname, "../preload/index.js");
  const win = new BrowserWindow({
    ...DEFAULT_SIZE,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    focusable: false,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setAlwaysOnTop(true, "screen-saver");
  return win;
}

export function showCentered(win: BrowserWindow): void {
  const primary = screen.getPrimaryDisplay();
  const bounds = computeCenteredBounds(primary.workArea, DEFAULT_SIZE);
  win.setBounds(bounds);
  win.setFocusable(false);
  win.showInactive();
}

export function hideOverlay(win: BrowserWindow): void {
  win.hide();
  win.setFocusable(false);
}

export function allowFocus(win: BrowserWindow): void {
  win.setFocusable(true);
  win.focus();
}
```

**Step 2: Verify test passes**

```bash
npm run test -- window.spec
```

Expected: 3 passed.

**Step 3: Commit**

```bash
git add src/main/window.ts tests/unit/main/window.spec.ts
git commit -m "feat(main): BrowserWindow factory and centering math"
```

---

## Task B5: Hotkey deny-list and validation — failing tests

**Files:**
- Create: `tests/unit/main/hotkey.spec.ts`

**Step 1: Write failing tests**

```ts
// tests/unit/main/hotkey.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const register = vi.fn();
const unregister = vi.fn();
const isRegistered = vi.fn();

vi.mock("electron", () => ({
  globalShortcut: {
    register: (...a: unknown[]) => register(...a),
    unregister: (...a: unknown[]) => unregister(...a),
    isRegistered: (...a: unknown[]) => isRegistered(...a),
  },
}));

import { validateAccelerator, registerHotkey, rebindHotkey } from "@main/hotkey";

describe("validateAccelerator", () => {
  beforeEach(() => {
    register.mockReset();
    unregister.mockReset();
    isRegistered.mockReset();
  });

  it("rejects bare letters and game keys", () => {
    for (const key of ["Tab", "E", "W", "A", "S", "D", "F", "Space"]) {
      expect(validateAccelerator(key).ok).toBe(false);
    }
  });

  it("rejects Discord defaults", () => {
    expect(validateAccelerator("Ctrl+Shift+I").ok).toBe(false);
  });

  it("accepts sensible chords with a modifier", () => {
    expect(validateAccelerator("CommandOrControl+Shift+H")).toEqual({ ok: true });
    expect(validateAccelerator("Ctrl+Alt+Y")).toEqual({ ok: true });
  });
});

describe("registerHotkey", () => {
  beforeEach(() => {
    register.mockReset();
    unregister.mockReset();
    isRegistered.mockReset();
  });

  it("returns ok when Electron accepts the binding", () => {
    register.mockReturnValue(true);
    const result = registerHotkey("CommandOrControl+Shift+H", () => {});
    expect(result.ok).toBe(true);
    expect(register).toHaveBeenCalledOnce();
  });

  it("returns conflict when Electron rejects the binding", () => {
    register.mockReturnValue(false);
    const result = registerHotkey("CommandOrControl+Shift+H", () => {});
    expect(result).toEqual({ ok: false, reason: "conflict" });
  });

  it("rejects reserved keys without calling Electron", () => {
    const result = registerHotkey("Tab", () => {});
    expect(result).toEqual({ ok: false, reason: "reserved", offending: "Tab" });
    expect(register).not.toHaveBeenCalled();
  });
});

describe("rebindHotkey", () => {
  beforeEach(() => {
    register.mockReset();
    unregister.mockReset();
    isRegistered.mockReset();
  });

  it("unregisters the old accelerator before registering the new one", () => {
    register.mockReturnValue(true);
    const res = rebindHotkey("Ctrl+Shift+H", "Ctrl+Alt+Y", () => {});
    expect(unregister).toHaveBeenCalledWith("Ctrl+Shift+H");
    expect(register).toHaveBeenCalledWith("Ctrl+Alt+Y", expect.any(Function));
    expect(res.ok).toBe(true);
  });

  it("does not unregister if the new accelerator is reserved", () => {
    const res = rebindHotkey("Ctrl+Shift+H", "Tab", () => {});
    expect(unregister).not.toHaveBeenCalled();
    expect(res.ok).toBe(false);
  });
});
```

**Step 2: Verify fails**

```bash
npm run test -- hotkey.spec
```

Expected: module not found.

---

## Task B6: Hotkey — minimal implementation

**Files:**
- Create: `src/main/hotkey.ts`

**Step 1: Implement**

```ts
// src/main/hotkey.ts
import { globalShortcut } from "electron";

const RESERVED_KEYS = new Set<string>([
  "Tab",
  "E",
  "W",
  "A",
  "S",
  "D",
  "F",
  "Space",
  "Enter",
  "Escape",
  "Ctrl+Shift+I",
  "CommandOrControl+Shift+I",
]);

export type HotkeyResult =
  | { ok: true }
  | { ok: false; reason: "conflict" }
  | { ok: false; reason: "reserved"; offending: string };

export function validateAccelerator(accelerator: string): HotkeyResult {
  if (RESERVED_KEYS.has(accelerator)) {
    return { ok: false, reason: "reserved", offending: accelerator };
  }
  if (!/^([A-Za-z]|[A-Za-z0-9]+(\+[A-Za-z0-9]+)+)$/.test(accelerator)) {
    return { ok: false, reason: "reserved", offending: accelerator };
  }
  const hasModifier = /(Ctrl|Cmd|Alt|Shift|Command|Control|CommandOrControl|Meta|Super)\+/.test(
    accelerator,
  );
  if (!hasModifier) {
    return { ok: false, reason: "reserved", offending: accelerator };
  }
  return { ok: true };
}

export function registerHotkey(accelerator: string, handler: () => void): HotkeyResult {
  const validation = validateAccelerator(accelerator);
  if (!validation.ok) return validation;
  const ok = globalShortcut.register(accelerator, handler);
  return ok ? { ok: true } : { ok: false, reason: "conflict" };
}

export function rebindHotkey(
  oldAccelerator: string,
  newAccelerator: string,
  handler: () => void,
): HotkeyResult {
  const validation = validateAccelerator(newAccelerator);
  if (!validation.ok) return validation;
  globalShortcut.unregister(oldAccelerator);
  const ok = globalShortcut.register(newAccelerator, handler);
  return ok ? { ok: true } : { ok: false, reason: "conflict" };
}

export function unregisterAll(): void {
  globalShortcut.unregisterAll();
}
```

**Step 2: Verify tests pass**

```bash
npm run test -- hotkey.spec
```

Expected: all specs green.

**Step 3: Commit**

```bash
git add src/main/hotkey.ts tests/unit/main/hotkey.spec.ts
git commit -m "feat(main): hotkey validation, registration, rebind with deny-list"
```

---

## Task B7: Preload typed surface

**Files:**
- Create: `src/preload/htp.d.ts`
- Create: `src/preload/index.ts`

**Step 1: `src/preload/htp.d.ts`**

```ts
// src/preload/htp.d.ts
export type HotkeyResult =
  | { ok: true }
  | { ok: false; reason: "conflict" }
  | { ok: false; reason: "reserved"; offending: string };

export type Prefs = {
  hotkey: string;
  clearOnClose: boolean;
  launchAtLogin: boolean;
  lastVersion: string;
};

export type UpdateEvent =
  | { type: "available"; version: string }
  | { type: "downloaded"; version: string }
  | { type: "error"; message: string };

export interface HtpBridge {
  hidePanel(): void;
  getPrefs(): Promise<Prefs>;
  setPrefs(patch: Partial<Prefs>): Promise<HotkeyResult>;
  onHotkeyToggle(cb: () => void): () => void;
  checkForUpdates(): Promise<void>;
  installUpdate(): void;
  onUpdateEvent(cb: (e: UpdateEvent) => void): () => void;
}

declare global {
  interface Window {
    htp: HtpBridge;
  }
}
```

**Step 2: `src/preload/index.ts`**

```ts
// src/preload/index.ts
import { contextBridge, ipcRenderer } from "electron";
import type { HtpBridge, UpdateEvent } from "./htp";

const bridge: HtpBridge = {
  hidePanel: () => ipcRenderer.send("panel:hide"),
  getPrefs: () => ipcRenderer.invoke("prefs:get"),
  setPrefs: (patch) => ipcRenderer.invoke("prefs:set", patch),
  onHotkeyToggle: (cb) => {
    const listener = () => cb();
    ipcRenderer.on("hotkey:toggle", listener);
    return () => ipcRenderer.off("hotkey:toggle", listener);
  },
  checkForUpdates: () => ipcRenderer.invoke("updater:check"),
  installUpdate: () => ipcRenderer.send("updater:install"),
  onUpdateEvent: (cb) => {
    const listener = (_: unknown, e: UpdateEvent) => cb(e);
    ipcRenderer.on("updater:event", listener);
    return () => ipcRenderer.off("updater:event", listener);
  },
};

contextBridge.exposeInMainWorld("htp", bridge);
```

**Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: exit 0.

**Step 4: Commit**

```bash
git add src/preload/
git commit -m "feat(preload): typed htp contextBridge surface"
```

---

## Task B8: IPC handlers

**Files:**
- Create: `src/main/ipc.ts`

**Step 1: Implement**

```ts
// src/main/ipc.ts
import { ipcMain, type BrowserWindow } from "electron";
import { getPrefs, setPrefs } from "./store";
import { hideOverlay } from "./window";
import { rebindHotkey } from "./hotkey";
import type { Prefs, HotkeyResult } from "../preload/htp";

export function registerIpc(options: {
  window: BrowserWindow;
  currentHotkey: () => string;
  setCurrentHotkey: (a: string) => void;
  onHotkeyFired: () => void;
}): void {
  const { window, currentHotkey, setCurrentHotkey, onHotkeyFired } = options;

  ipcMain.on("panel:hide", () => hideOverlay(window));

  ipcMain.handle("prefs:get", (): Prefs => getPrefs());

  ipcMain.handle("prefs:set", (_e, patch: Partial<Prefs>): HotkeyResult => {
    if (patch.hotkey && patch.hotkey !== currentHotkey()) {
      const result = rebindHotkey(currentHotkey(), patch.hotkey, onHotkeyFired);
      if (!result.ok) return result;
      setCurrentHotkey(patch.hotkey);
    }
    setPrefs(patch);
    return { ok: true };
  });

  ipcMain.handle("updater:check", async () => {
    // Wired fully in Week 3. Stub silent in Week 1.
  });

  ipcMain.on("updater:install", () => {
    // Week 3.
  });
}
```

No unit test for `ipc.ts` in Week 1 — its behavior is exercised through integration in the smoke test. (M3 adds an E2E test that drives `prefs:set`.)

**Step 2: Commit**

```bash
git add src/main/ipc.ts
git commit -m "feat(main): IPC handlers for panel hide and prefs get/set"
```

---

## Task B9: Updater skeleton

**Files:**
- Create: `src/main/updater.ts`

**Step 1: Implement stub**

```ts
// src/main/updater.ts
import { autoUpdater } from "electron-updater";
import type { BrowserWindow } from "electron";
import type { UpdateEvent } from "../preload/htp";

export function initUpdater(window: BrowserWindow): void {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;

  const send = (e: UpdateEvent) => window.webContents.send("updater:event", e);

  autoUpdater.on("update-available", (info) => send({ type: "available", version: info.version }));
  autoUpdater.on("update-downloaded", (info) => send({ type: "downloaded", version: info.version }));
  autoUpdater.on("error", (err) => send({ type: "error", message: err.message }));

  // Kick a check, but never throw on network errors at startup.
  autoUpdater.checkForUpdates().catch(() => {
    /* swallow; user can retry from About in M3 */
  });
}
```

**Step 2: Commit**

```bash
git add src/main/updater.ts
git commit -m "feat(main): updater skeleton that emits events over IPC"
```

---

## Task B10: Main process entry

**Files:**
- Create: `src/main/index.ts`

**Step 1: Implement**

```ts
// src/main/index.ts
import { app, BrowserWindow } from "electron";
import { createOverlayWindow, showCentered, hideOverlay } from "./window";
import { registerHotkey, unregisterAll } from "./hotkey";
import { getPrefs } from "./store";
import { registerIpc } from "./ipc";
import { initUpdater } from "./updater";

let mainWindow: BrowserWindow | null = null;
let currentHotkey = "";

function toggleOverlay(): void {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) hideOverlay(mainWindow);
  else showCentered(mainWindow);
}

app.whenReady().then(() => {
  const prefs = getPrefs();
  currentHotkey = prefs.hotkey;

  mainWindow = createOverlayWindow();

  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    void mainWindow.loadURL(devUrl);
  } else {
    void mainWindow.loadFile(
      new URL("../renderer/index.html", `file://${__dirname}/`).pathname.slice(1),
    );
  }

  registerIpc({
    window: mainWindow,
    currentHotkey: () => currentHotkey,
    setCurrentHotkey: (a) => {
      currentHotkey = a;
    },
    onHotkeyFired: toggleOverlay,
  });

  const result = registerHotkey(currentHotkey, toggleOverlay);
  if (!result.ok) {
    console.error("[main] hotkey registration failed:", result);
    // Fallback UX comes in M3 (toast + settings flag). For Week 1 we log and proceed.
  }

  initUpdater(mainWindow);
});

app.on("window-all-closed", () => {
  unregisterAll();
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  unregisterAll();
});
```

**Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: exit 0.

**Step 3: Commit**

```bash
git add src/main/index.ts
git commit -m "feat(main): app bootstrap — window, hotkey, ipc, updater wiring"
```

---

# Section C — Renderer shell (Day 3–4)

## Task C1: Pinia `overlay` store — failing test

**Files:**
- Create: `tests/unit/renderer/overlay.spec.ts`

**Step 1: Write the failing test**

```ts
// tests/unit/renderer/overlay.spec.ts
import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useOverlayStore } from "@renderer/stores/overlay";

describe("overlay store", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("starts closed with empty query and no selection", () => {
    const s = useOverlayStore();
    expect(s.open).toBe(false);
    expect(s.query).toBe("");
    expect(s.selectedId).toBeNull();
    expect(s.view).toBe("search");
  });

  it("toggleOpen opens then closes", () => {
    const s = useOverlayStore();
    s.toggleOpen();
    expect(s.open).toBe(true);
    s.toggleOpen();
    expect(s.open).toBe(false);
  });

  it("close clears query and selection when clearOnClose=true", () => {
    const s = useOverlayStore();
    s.query = "tuna";
    s.selectedId = "fish-tuna";
    s.open = true;
    s.close({ clearOnClose: true });
    expect(s.open).toBe(false);
    expect(s.query).toBe("");
    expect(s.selectedId).toBeNull();
  });

  it("close preserves query and selection when clearOnClose=false", () => {
    const s = useOverlayStore();
    s.query = "tuna";
    s.selectedId = "fish-tuna";
    s.open = true;
    s.close({ clearOnClose: false });
    expect(s.open).toBe(false);
    expect(s.query).toBe("tuna");
    expect(s.selectedId).toBe("fish-tuna");
  });
});
```

**Step 2: Verify fails**

```bash
npm run test -- overlay.spec
```

Expected: module not found.

---

## Task C2: `overlay` store — implementation

**Files:**
- Create: `src/renderer/stores/overlay.ts`

**Step 1: Implement**

```ts
// src/renderer/stores/overlay.ts
import { defineStore } from "pinia";

export type View = "search" | "settings" | "about";
export type Category = "all" | "item" | "mechanic" | "tip";

export const useOverlayStore = defineStore("overlay", {
  state: () => ({
    open: false,
    view: "search" as View,
    query: "",
    selectedId: null as string | null,
    activeCategory: "all" as Category,
  }),
  actions: {
    toggleOpen() {
      this.open = !this.open;
    },
    close({ clearOnClose }: { clearOnClose: boolean }) {
      this.open = false;
      if (clearOnClose) {
        this.query = "";
        this.selectedId = null;
      }
    },
  },
});
```

**Step 2: Verify tests pass**

```bash
npm run test -- overlay.spec
```

Expected: 4 passed.

**Step 3: Commit**

```bash
git add src/renderer/stores/overlay.ts tests/unit/renderer/overlay.spec.ts
git commit -m "feat(renderer): overlay Pinia store with open/close and clearOnClose"
```

---

## Task C3: Tailwind CSS entry

**Files:**
- Create: `src/renderer/styles.css`

**Step 1: Write CSS**

```css
/* src/renderer/styles.css */
@import "tailwindcss";

@layer base {
  html, body, #app {
    margin: 0;
    padding: 0;
    height: 100%;
    background: transparent;
    color: #e5e7eb;
    font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
  }
}
```

No commit yet — wired in the next task.

---

## Task C4: `App.vue` shell

**Files:**
- Create: `src/renderer/App.vue`

**Step 1: Implement**

```vue
<!-- src/renderer/App.vue -->
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";
import { useOverlayStore } from "./stores/overlay";

const overlay = useOverlayStore();
const rootEl = ref<HTMLElement | null>(null);
let disposeHotkey: (() => void) | null = null;

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape" && overlay.open) {
    overlay.close({ clearOnClose: true });
    window.htp.hidePanel();
  }
}

function onClickAway(e: MouseEvent) {
  if (!overlay.open) return;
  if (rootEl.value && !rootEl.value.contains(e.target as Node)) {
    overlay.close({ clearOnClose: true });
    window.htp.hidePanel();
  }
}

onMounted(() => {
  disposeHotkey = window.htp.onHotkeyToggle(() => overlay.toggleOpen());
  window.addEventListener("keydown", onKey);
  window.addEventListener("mousedown", onClickAway);
});

onBeforeUnmount(() => {
  disposeHotkey?.();
  window.removeEventListener("keydown", onKey);
  window.removeEventListener("mousedown", onClickAway);
});
</script>

<template>
  <div
    v-if="overlay.open"
    ref="rootEl"
    class="mx-auto mt-20 w-[640px] rounded-2xl bg-slate-900/90 p-6 shadow-2xl ring-1 ring-white/10 backdrop-blur"
  >
    <h1 class="text-lg font-semibold">Heartopia Overlay</h1>
    <p class="mt-2 text-sm text-slate-300">
      Search arrives in M2. Press <kbd class="rounded bg-slate-800 px-1.5 py-0.5">Esc</kbd> or the hotkey to dismiss.
    </p>
  </div>
</template>
```

**Step 2: Commit in the next task with `main.ts`**

---

## Task C5: Renderer entry

**Files:**
- Create: `src/renderer/main.ts`

**Step 1: Implement**

```ts
// src/renderer/main.ts
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./styles.css";

createApp(App).use(createPinia()).mount("#app");
```

**Step 2: Typecheck + lint**

```bash
npm run typecheck && npm run lint
```

Expected: both exit 0.

**Step 3: Commit**

```bash
git add src/renderer/App.vue src/renderer/main.ts src/renderer/styles.css
git commit -m "feat(renderer): App shell with hotkey toggle, Escape, click-outside dismiss"
```

---

## Task C6: End-to-end dev-mode smoke test (manual)

**Step 1: Run dev mode**

```bash
npm run dev
```

Expected: Electron window appears hidden (no taskbar icon). Process runs without error.

**Step 2: Smoke-test interactions**

Press `Ctrl+Shift+H` → panel appears centered on primary display.
Press `Ctrl+Shift+H` → panel hides.
Press hotkey, then `Esc` → panel hides.
Press hotkey, then click outside the panel → panel hides.
In-game focus test (if game installed): launch game windowed, press hotkey mid-gameplay — panel appears without stealing game keyboard focus.

Record any issues in a scratch file (`docs/plans/week1-smoke-notes.md`, gitignored if sensitive, otherwise committed as a plain notes file for the retro at end of week). Do not commit a broken state; if a defect is found, add a task to this plan and fix before proceeding.

No commit in this task if all smoke checks pass.

---

# Section D — Packaging smoke test (Day 5)

## Task D1: electron-builder configuration

**Files:**
- Create: `electron-builder.yml`

**Step 1: Write config**

```yaml
# electron-builder.yml
appId: com.bangkokbytes.heartopia-overlay
productName: Heartopia Overlay
directories:
  buildResources: build/resources
  output: build/output
files:
  - from: dist-electron/main
    to: dist-electron/main
  - from: dist-electron/preload
    to: dist-electron/preload
  - from: dist-electron/renderer
    to: dist-electron/renderer
  - package.json
asar: true
win:
  target:
    - target: nsis
      arch: [x64]
  artifactName: Heartopia-Overlay-Setup-${version}.${ext}
nsis:
  oneClick: false
  perMachine: false
  allowElevation: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
publish:
  provider: github
  owner: REPLACE_WITH_GH_OWNER
  repo: heartopia-overlay
```

Replace `REPLACE_WITH_GH_OWNER` with the actual GitHub account created in Task A3. Commit with that value filled in.

**Step 2: Verify build runs end-to-end**

```bash
npm run build:win
```

Expected: build succeeds; a `Heartopia-Overlay-Setup-0.0.0.exe` lands in `build/output/`.

If the build fails, do not proceed — this is the whole point of approach C's week-1 smoke test. Diagnose, fix, retry.

**Step 3: Commit**

```bash
git add electron-builder.yml
git commit -m "chore(build): electron-builder NSIS config with GitHub publish target"
```

---

## Task D2: Release workflow (manual tag-triggered)

**Files:**
- Create: `.github/workflows/release.yml`

**Step 1: Write workflow**

```yaml
name: Release

on:
  push:
    tags: ["v*"]

jobs:
  build-and-release:
    runs-on: windows-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run test
      - name: Build and publish
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npx electron-builder --win --publish always
```

**Step 2: Commit and push**

```bash
git add .github/workflows/release.yml
git commit -m "ci: release workflow — tag push builds and publishes NSIS to Releases"
git push
```

---

## Task D3: Cut `v0.0.1-smoke` pre-release

**Step 1: Bump version locally**

```bash
npm version prerelease --preid=smoke --no-git-tag-version
# sets package.json version to 0.0.1-smoke.0
```

**Step 2: Commit and tag**

```bash
git add package.json package-lock.json
git commit -m "chore(release): v0.0.1-smoke pre-release"
git tag v0.0.1-smoke
git push --follow-tags
```

**Step 3: Watch the release workflow**

```bash
gh run watch
```

Expected: workflow finishes green; a `v0.0.1-smoke` draft/pre-release appears on GitHub with `Heartopia-Overlay-Setup-0.0.1-smoke.0.exe` attached.

**Step 4: Convert the draft to a pre-release**

If the workflow left it as a draft:

```bash
gh release edit v0.0.1-smoke --prerelease --draft=false
```

---

## Task D4: Install on a clean Windows VM

**Out-of-process step** — performed by the implementer manually.

**Checklist:**
- [ ] Download `Heartopia-Overlay-Setup-0.0.1-smoke.0.exe` from the GitHub release.
- [ ] Install on a clean Windows 11 VM (no admin rights).
- [ ] Launch app; confirm no visible window, no taskbar icon.
- [ ] Press `Ctrl+Shift+H`; confirm overlay appears centered on primary display.
- [ ] Press hotkey / Escape / click-outside dismissal all work.
- [ ] Quit app via tray menu (or Task Manager for Week 1 — tray UI is M3).
- [ ] Check app log for an updater "no update available" line (confirms feed reachable).

Record results in `docs/plans/week1-smoke-notes.md`. Commit those notes at end of week.

---

## Task D5: Updater feed verification

**Step 1: Confirm feed is reachable from the installed app**

In the installed app's log file (`%APPDATA%/Heartopia Overlay/logs/main.log`), look for an entry like:

```
[info] Checking for updates
[info] Update not available. Latest version is 0.0.1-smoke.0
```

If the line reads `No published versions on GitHub` or an error, the publish step produced something wrong — fix before closing out Week 1.

No commit — log inspection only.

---

## Task D6: Week 1 retrospective notes

**Files:**
- Create: `docs/plans/week1-smoke-notes.md`

**Step 1: Write retrospective**

Capture:
- What worked end-to-end.
- What broke and how it was fixed (especially anything surprising about electron-builder / electron-updater).
- Open questions to carry into Week 2's plan.
- Anything in the v1 design that should be revised based on what you learned.

**Step 2: Commit**

```bash
git add docs/plans/week1-smoke-notes.md
git commit -m "docs: week 1 retrospective notes"
git push
```

---

## Definition of Done (Week 1)

- [ ] Public GitHub repo created with MIT license, README, issue templates, branch protection.
- [ ] CI runs lint, typecheck, unit tests on every PR and `main` push; required status check.
- [ ] `npm run dev` opens the overlay window; hotkey / Escape / click-outside all work locally.
- [ ] Unit tests green for `store`, `window`, `hotkey`, `overlay` store (≥12 test cases).
- [ ] `npm run build:win` produces a signed-with-self-signed NSIS installer locally.
- [ ] Release workflow cut `v0.0.1-smoke` pre-release to GitHub Releases.
- [ ] Installer runs on a clean Windows 11 VM without admin rights.
- [ ] Installed app's log shows `electron-updater` successfully querying the GitHub Releases feed.
- [ ] Retrospective notes committed; Week 2 plan can be written with full knowledge of what the pipeline can and cannot do.

---

## References

- v1 design: [docs/plans/2026-04-20-htp-overlay-v1-design.md](./2026-04-20-htp-overlay-v1-design.md)
- PRD: [PRD.md](../../PRD.md)
- Superpowers skills to re-invoke during execution:
  - `superpowers:test-driven-development` — every B/C task is TDD
  - `superpowers:systematic-debugging` — if the smoke test fights you
  - `superpowers:verification-before-completion` — before checking DoD boxes
  - `superpowers:finishing-a-development-branch` — when Week 1 completes

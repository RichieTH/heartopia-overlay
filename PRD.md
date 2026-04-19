# Product Requirements Document
## Heartopia Overlay — v1.0

**Status:** Draft  
**Author:** Richie  
**Last Updated:** April 2026

---

## 1. Problem Statement

Heartopia players frequently alt-tab or open a browser to look up recipes, fish locations, mechanics, and tips while playing. This breaks immersion and flow. There is no native in-game reference tool, and existing fan sites require leaving the game entirely.

---

## 2. Goal

Build a free, open-source Windows overlay that lets Heartopia players instantly access a curated knowledge base without leaving the game. Triggered by a hotkey, it appears centered over the game, is searchable, and dismisses cleanly so the player can get back to playing.

---

## 3. Target Users

- PC Heartopia players (Steam or standalone client)
- Casual and mid-core players who frequently reference guides, recipes, or item data
- Streamers who want quick on-stream lookups
- Community: distributed publicly via GitHub, free forever

---

## 4. Non-Goals (v1)

- Mac or Linux support
- Mobile companion app
- Community-editable content (no wiki/CMS)
- Backend infrastructure of any kind
- Monetization
- Twitch overlay panel
- Real-time game state integration (no game memory reading)

---

## 5. Features

### 5.1 Global Hotkey Toggle

- Default binding: `Ctrl+Shift+H`
- Works regardless of active window (game, browser, anything)
- User-configurable via Settings
- Chosen to avoid conflicts with:
  - Heartopia binds: TAB, E, WASD, F, mouse buttons
  - Discord defaults: Ctrl+Shift+I, push-to-talk (varies)
- Same hotkey dismisses the overlay

### 5.2 Overlay Window

- Renders centered on the primary display
- Always-on-top, transparent background, no OS window frame
- Does not steal keyboard focus from the game on open
- Additional dismiss methods: `Escape` key, click outside the panel
- Remembers last search state within the same session
- Clears search on close (configurable)

### 5.3 Knowledge Base Search

- Fuzzy full-text search across all content using fuse.js
- Search activates immediately on hotkey open (autofocus)
- Results appear as the user types (debounced, no submit required)
- Result list shows: title, category badge, one-line summary
- Selecting a result opens a detail panel with full content (markdown rendered)
- Category filter tabs: All / Items / Mechanics / Tips

### 5.4 Content Categories

**Items**
- Craftable items and blueprints
- Materials and where to find them
- Cooking recipes (ingredients, profit margins)
- Fishing: fish species, locations, weather conditions, spawn times

**Mechanics**
- Hobby unlock progression (DG Membership levels)
- Daily task system and reset times
- Gold farming strategies
- Multiplayer / town system
- Home plot unlocking
- Crafting at the Work Bench
- Currency types (Gold, Moonlight Crystals)

**Tips**
- Beginner getting started guide
- Efficient daily routine
- Early/mid/late game priorities
- Common mistakes to avoid

### 5.5 Auto-Updater

- App checks GitHub Releases on launch
- In-app notification when a new version is available
- One-click update install
- No server required - GitHub handles CDN

### 5.6 Settings

- Hotkey customization (with conflict detection)
- Toggle: clear search on close vs. persist within session
- Toggle: launch on Windows startup
- About screen with version, changelog link, content attribution

---

## 6. Content Strategy

### Source

Content is manually curated by the maintainer (Richie) into JSON files bundled with the app. Primary reference sources:

- `heartopia.life` - guides, databases, calculators
- `heartopiagame.org` - fish/bird/recipe database
- `heartopia.cc` - hobby guides, profit data
- `heartopiawiki.com` - community wiki

### Attribution

All source sites credited in the app's About screen. If a data partnership is established with heartopia.life or another site, their branding appears in the overlay and content carries a `source` field per entry.

### Update Cadence

Content updates ship as new app releases via GitHub. No live sync. Users update via the in-app updater.

### Scraper Tooling (Internal)

A Python scraper (`scripts/scraper/`) is maintained internally to assist with content updates. It is not distributed to end users. Output is reviewed and edited before being committed to the content JSON files.

---

## 7. Content Schema

```json
{
  "id": "fish-tuna",
  "title": "Tuna",
  "category": "item",
  "subcategory": "fish",
  "summary": "High-value fish. Found at sea fishing spots during clear weather.",
  "body": "## Tuna\n\nFound at **sea fishing spots**...",
  "tags": ["fish", "sea", "rare", "gold"],
  "source": "heartopia.life",
  "lastVerified": "2026-04"
}
```

---

## 8. Technical Architecture

### Stack

| Component | Technology |
|---|---|
| Desktop shell | Electron (latest stable) |
| UI framework | Vue 3 + Vite |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Search | fuse.js |
| State | Pinia |
| Preferences | electron-store |
| Packaging | electron-builder (NSIS) |
| Auto-update | electron-updater → GitHub Releases |
| Unit tests | Vitest |
| E2E tests | Playwright |

### IPC Boundary

Main process handles: hotkey registration, window lifecycle, updater, electron-store.  
Renderer handles: all UI, search, content display.  
Communication via typed context bridge only. No `remote` module.

### Content Loading

JSON files bundled with the app. Loaded once on app start. fuse.js index built at load time. No runtime network requests for content.

---

## 9. Distribution

- GitHub repository: public, open-source (MIT license)
- Releases: GitHub Releases with NSIS `.exe` installer
- Code signing: self-signed initially, EV cert if community grows
- No telemetry, no analytics, no accounts

---

## 10. Milestones

### M1 - Shell (Week 1)
- Electron app boots
- Hotkey toggles a centered overlay window
- Vue 3 renderer loads inside it
- Window dismiss (hotkey, Escape, click-outside) works
- Basic dev tooling: Vite HMR, ESLint, TypeScript

### M2 - Search + Content (Week 2)
- Content JSON schema finalized
- Starter dataset: ~20 items across all 3 categories
- fuse.js search wired up
- Result list and detail panel rendering
- Category filter tabs

### M3 - Polish + Packaging (Week 3)
- Settings panel (hotkey config, preferences)
- Auto-updater wired to GitHub Releases
- NSIS installer packaging
- Playwright E2E tests covering core flows
- About screen with attribution

### M4 - Content Expansion (Ongoing)
- Scraper tooling for content updates
- Data partnership with heartopia.life (if approved)
- Full recipe database, fish database, mechanics coverage
- Community feedback loop via GitHub Issues

---

## 11. Open Questions

| # | Question | Status |
|---|---|---|
| 1 | Will heartopia.life grant data use permission? | In discussion |
| 2 | Do any Heartopia fan sites have structured data exports (JSON/CSV)? | Unknown |
| 3 | Does XD Entertainment have a public API or data export? | Unknown |
| 4 | Exact hotkey default - any conflicts found in community testing? | TBD at M3 |
| 5 | Code signing approach for wide distribution | Deferred to M3 |

---

## 12. Success Metrics (v1)

- Overlay opens and dismisses cleanly with no game interference
- Search returns relevant results in < 100ms
- Installer works on Windows 10 and 11 without admin rights (preferred)
- Zero crashes in 1 hour of normal play sessions
- Community: GitHub stars and issues as leading indicators

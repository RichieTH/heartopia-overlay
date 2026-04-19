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

# BroGram 

![node](https://img.shields.io/badge/node-%3E%3D18-blue)
![puppeteer](https://img.shields.io/badge/puppeteer-24.x-green)
![type](https://img.shields.io/badge/type-modular_automation-lightblue)
![license](https://img.shields.io/badge/license-MIT-lightgrey)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  BroGram                          ┃
┃  playful Instagram automations       ┃
┃  by Tas33n                           ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

> **Why?** Your friends spam reels in your DMs? BroGram  lets you playfully automate your own counter‑moves.  
> **Please be kind:** get consent, respect rate limits, and follow Instagram’s Terms of Use.

---

## Table of contents

- [Overview](#overview)
- [Ethics & responsibility](#ethics--responsibility)
- [Requirements](#requirements)
- [Quick start (local)](#quick-start-local)
- [Configuration](#configuration)
- [Console controls](#console-controls)
- [Tasks & modules](#tasks--modules)
- [Extend: write your own module](#extend-write-your-own-module)
- [Run with Docker](#run-with-docker)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**BroGram** is a modular Puppeteer tool for Instagram that runs a **single-window**, **infinite auto-scroll** session and executes optional actions (like, comment, share, and more) via pluggable modules. It verifies login up front (cookies‑based), exposes status endpoints, and gives you live **console controls** while it runs.

- Modular core with auto-discovery of `src/tasks/*.js`
- Infinite auto-scroll (pauses during actions; resumes after)
- Live console controller (toggle actions, tweak scroll speed)
- Single visible browser window (less CPU/GPU)
- Status server: `/`, `/uptime`, `/health`
- Clean JSON logs (console + `./logs/YYYY-MM-DD.log`)

> Designed for fun, learning, and tinkering—not abuse.

---

## Requirements

- **Node.js ≥ 18**
- **npm** (comes with Node)
- **Cookies export** (JSON) from your browser’s cookie editor (place under `./cookies`)
- OS: Linux / macOS / Windows supported. Puppeteer downloads a compatible Chromium if needed.

---

## Quick start (local)

```bash
# 1) Clone
git clone https://github.com/tas33n/BroGram.git
cd BroGram

# 2) Install
npm i

# 3) Configure
cp .env.example .env
# Edit .env to set SURFACE, SCROLL_* and other options
# Export your Instagram cookies as JSON into ./cookies/

# 4) Run
npm run start
# For a 60s auth‑fail debug window:
NODE_ENV=development npm run dev
```

Open `http://localhost:3000/uptime` to confirm it’s alive.

---

## Configuration

All configuration is via `.env`. See `.env.example` (fully commented). Common options:

| Key | Purpose | Example |
| --- | --- | --- |
| `HEADLESS` | run without UI (`true`/`false`) | `false` |
| `PORT` | status server port | `3000` |
| `COOKIES_DIR` | folder of exported cookie JSONs | `./cookies` |
| `ACTIONS` | startup tasks (comma‑separated) | `scroll,like,comment` |
| `SURFACE` | start & stay on `home` or `reels` | `home` |
| `SCROLL_DELAY_SEC` / `SCROLL_DELAY_MS` | delay between scroll steps | `1.5` (sec) |
| `SCROLL_STEP` | pixels per step | `1200` |
| `SHARE_TO` | default target for `share` | `myfriend` |
| `COMMENT_TEXT` | default text for `comment` | `🔥` |
| `LOG_LEVEL` | `fatal|error|warn|info|debug|trace` | `info` |
| optional inputs | for extras (`follow`, `dm`, etc.) | see `.env.example` |

**Auth behavior**  
- Cookies are loaded into a fresh session and validated by visiting `/accounts/edit`.  
- If auth fails:  
  - `NODE_ENV=development` → waits **60s** for debugging, then exits.  
  - otherwise → exits immediately.

---

## Console controls

- `s` → toggle auto-scroll on/off  
- `j` or `Space` → scroll once  
- `+` / `=` → faster scroll (lower delay)  
- `-` → slower scroll (higher delay)  
- `l` → toggle **like** actions  
- `c` → toggle **comment** actions  
- `r` → jump to Reels  
- `h` → show help  
- `q` or **Ctrl+C** → graceful shutdown

---

## Tasks & modules

### Built‑ins
- `scroll` – enables infinite auto-scroll (background service)
- `reels` – navigates to Reels feed (skipped if `SURFACE=home`)
- `like` – attempts to like the current post/reel
- `comment` – posts `COMMENT_TEXT`
- `share` – opens share UI and targets `SHARE_TO`

### Optional extras (if present)
`follow`, `unfollow`, `save`, `openProfile`, `explore`, `dm`, `viewStories`

Enable any module by adding it to `ACTIONS` in `.env`, e.g.:
```env
ACTIONS=scroll,like,share
SHARE_TO=myfriend
```

---

## Extend: write your own module

Create `src/tasks/yourTask.js`:

```js
module.exports = {
  name: "yourTask",
  run: async (page, ctx) => {
    // ctx.logger -> logger
    // ctx.control.scroll -> control auto-scroll holds
    const sc = ctx.control.scroll; sc.holds++; sc.hold = true;
    try {
      await page.goto("https://www.instagram.com/explore/", { waitUntil: "networkidle2" });
      // ... do your automation ...
    } finally {
      sc.holds = Math.max(0, sc.holds - 1);
      sc.hold = sc.holds > 0;
    }
  }
};
```

Modules are auto‑discovered if they export `{ name, run }`.

---

## Run with Docker

The repo **includes** a `Dockerfile`. Build and run:

```bash
# Build
docker build -t BroGram .

# Run (mount cookies + provide env)
docker run --rm -it \
  -p 3000:3000 \
  -v "$PWD/cookies:/app/cookies" \
  --env-file .env \
  brogram
```

> Chromium and required OS packages are installed in the image. The code already passes `--no-sandbox` flags to Puppeteer.

---

## Troubleshooting

- **Auth failed:** export a fresh cookie JSON; ensure a valid `sessionid` (not expired).  
- **Two windows:** the app enforces a single tab; update Puppeteer/Chromium if you still see extras.  
- **Selectors changed:** Instagram UI evolves; update selectors in `src/tasks/*`.  
- **High CPU:** increase `SCROLL_DELAY_SEC` and run headless.  
- **Blocked actions:** when logged out or restricted, modules log and skip instead of crashing.

---

## Contributing

Issues and PRs welcome! Please:
- Keep code CommonJS (Node ≥ 18), minimal dependencies.
- Use clear naming, small modules, resilient selectors.
- Add a short note to the README if you introduce a new task or env var.

---

## License

MIT © Tas33n

# Dew

Dew is an always-on **Tauri 2** desktop companion. A small movable dewdrop sits on your desktop; hover or click (your choice) opens a frost-glass card of every **local coding-agent session that is actually running**. Each terminal or job is its own row. When a session disappears, that row grows a mint **!** — click it to focus Cursor, iTerm2, OpenCode, Codex, Windows Terminal, or whichever host was running the CLI.

Pale mint, white type, thin white rim, not neon.

## First run

After install, open Dew. The glass card asks you to **Scan and connect** — one tap. Dew looks for local CLIs and apps (Cursor, Claude Code, Codex, OpenCode, and other obvious agents), follows what it finds, and lists them. No terminal ritual and no Homebrew step to start seeing agents.

Then uncheck anything you do not want followed. Unchecked tools stay out of the session list and will not fire the done **!**. That choice is saved.

## Run locally

You need a recent **Node 22+**, **pnpm**, and **Rust 1.85+** (1.77 is too old for current Tauri 2 crates). Also install the [Tauri Linux / macOS / Windows prerequisites](https://v2.tauri.app/start/prerequisites/).

```bash
pnpm install
pnpm tauri icon src-tauri/app-icon.png   # once, regenerates tray/app icons
pnpm tauri dev
```

The Vite UI is pinned to **http://127.0.0.1:43133**. In a browser (no Tauri):

```bash
pnpm dev
```

Open `http://127.0.0.1:43133/?sample=1&shot=1` for a clearly labeled **sample layout** of the glass card (three Claude Code sessions as separate rows). Other preview flags:

- `/?first=1&shot=1` — first-run Scan and connect
- `/?sample=1&picker=1&shot=1` — followed-tools picker
- `/?orbshot=1&shot=1&done=0` — idle dewdrop
- `/?sample=1&orbshot=1&shot=1` — dewdrop after a session finishes

Live process scanning only happens inside the Tauri shell.

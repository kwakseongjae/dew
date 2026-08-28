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
- `/?shot=1&settings=1` — settings, including the Dewdrop row
- `/?orbshot=1&done=0` — live idle dewdrop (eyes + lean follow the pointer)
- `/?orbshot=1&shot=1&done=0` — frozen idle lean pose for screenshots
- `/?orbshot=1&play=1` — playground: pointer follow, roll, morph trigger
- `/?orbshot=1&morph=1&shot=1` — mid-morph clay stretch (circle becoming !)
- `/?orbshot=1&shot=1&done=1` or `/?sample=1&orbshot=1&shot=1` — settled bang

The dewdrop is a **2D glass blob** (canvas + rAF), not a CSS circle with a text `!`. Idle is a pale-mint frost drop with clay harmonics (not a perfect disc). Done interpolates a 32-point silhouette into a fused bang (capsule + dot, polynomial smooth-min) — the body morphs; nothing swaps in a glyph. `prefers-reduced-motion` skips spin/wobble and uses a short morph.

Settings → **Dewdrop** (saved like followed tools):

- Look at cursor
- Playfulness: off / calm / playful
- Face: dots / sleepy / wink
- Mint: pale / mid

Live process scanning only happens inside the Tauri shell.

### Build

```bash
pnpm tauri build
```

On this Linux VM that produces `deb` / `AppImage` (`Dew_0.1.0_amd64.deb` and `Dew_0.1.0_amd64.AppImage` under `src-tauri/target/release/bundle/`). macOS `.app` / `.dmg` and Windows **NSIS** / **MSI** targets are declared in `src-tauri/tauri.conf.json` and are produced when you build on those OSes:

```bash
# Windows (PowerShell, after rustup + WebView2)
pnpm tauri build --bundles nsis,msi
```

Default global shortcut: **Ctrl/⌘ + Shift + D** (configurable in the card’s settings).

## How detection works (real scanner)

Dew lists processes with [`sysinfo`](https://crates.io/crates/sysinfo), then classifies **jobs** vs **host apps**:

| Tool | Counted as a running job | Idle presence (0 jobs) |
| --- | --- | --- |
| Cursor | `cursor-agent`, cmdline containing `cursor-agent`, cwd under `.cursor/worktrees/` | Cursor IDE process (not GPU/Renderer helpers) |
| OpenCode | process/token `opencode` | OpenCode.app |
| Claude Code | `claude` CLI / `@anthropic-ai/claude-code` — **not** Claude.app chat | — |
| Codex | process/token `codex` | Codex.app when that’s all that’s running |
| Others | `aider`, `gemini` / `@google/gemini-cli`, `goose`, `amp`, `crush`, GitHub `copilot` CLI | — |

Repo / branch / worktree come from `.git` on the process cwd (including gitdir worktrees). **Each matching PID is its own session.** Three Claude Code terminals are three rows, and each one can finish independently. Dew does not roll them into “Claude Code ×3”.

When a tracked PID exits, Dew keeps a **done** state for 12 minutes. That session row keeps a mint **!**, and the dewdrop **morphs into a bang**. Clicking the drop:

1. Focuses the **terminal parent** when the agent was a CLI (iTerm2, Terminal, Windows Terminal, Ghostty, Warp, Alacritty, kitty, WezTerm, …).
2. Otherwise activates the host app (Cursor, OpenCode, Codex) via AppleScript / `AppActivate` / `wmctrl`+`xdotool`.

Heuristics live in `src-tauri/src/classify.rs` and are unit-tested. Prefer extending that table to fake rows. Installed-but-idle tools are detected from PATH and known app locations (`src-tauri/src/detect.rs`) so the picker can list them without inventing a running session.

## What is real vs stubbed

| Piece | Status |
| --- | --- |
| Process + cwd + git worktree scan | **Real** |
| Finished-job badge from PID disappearance | **Real** |
| Window focus (macOS / Windows / Linux) | **Real** on each OS; Linux needs `wmctrl` or `xdotool` |
| Global shortcut, autostart, tray, draggable dewdrop | **Real** (Tauri 2 plugins) |
| Hover vs click to open the card | **Real** |
| Subscription usage strip | **Real reader, honest empty**. Looks only at known local JSON paths (see below). If nothing parses as used/cap seconds, the strip says so. **Never invents hours. Never BYOK.** |
| Sample layout toggle | **Labeled preview only** (`?sample=1` or Settings). Banner reads “Sample layout”. |
| Official vendor icons | **Fetched from vendor brand/favicon origins** — see `THIRD_PARTY_NOTICES.md` |

Usage files Dew will read *if they exist* (none are required):

- Cursor: `~/.cursor/usage.json`, `…/stats.json`, Cursor `User/globalStorage/storage.json`
- Claude Code: `~/.claude.json`, `~/.claude/usage.json`
- Codex: `~/.codex/usage.json`
- OpenCode: `~/.opencode/usage.json`

The weekly **5h** tick marks are a **label** for Cursor’s known product cap. The dots stay hollow until a local file actually contains totals or a 7-day breakdown.

## Homebrew

Cask + formula **templates** live in [`homebrew/`](homebrew/README.md). They are **not** a published tap. After you create `homebrew-dew` and attach a macOS release:

```bash
brew tap <your-github-user>/dew
brew install --cask dew
```

There is no tap URL to copy yet. Do not invent one.

## Windows

`src-tauri/tauri.conf.json` bundle targets include **NSIS** and **MSI**. Build them on Windows; the Linux VM cannot emit those installers. WebView2 is required at runtime.

## Icons

Dew’s own mark is the mint dewdrop in `src-tauri/app-icon.png` (MIT, original). Product marks in `public/vendors/` are **unmodified official assets** — see `THIRD_PARTY_NOTICES.md` and `scripts/download-vendor-icons.sh`.

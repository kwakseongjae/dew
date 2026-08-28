# Vendor marks (not licensed as Dew)

Dew ships a few **unmodified** product icons so you can tell which local agent is running. Those marks belong to their owners. They are **not** covered by Dew's MIT license, and this repo does not grant you any trademark rights.

Dew is not affiliated with, endorsed by, or sponsored by Cursor, SST/OpenCode, Anthropic, OpenAI, or anyone else named in the agent list.

## What is bundled

| File | Product | Official source fetched | Date fetched (UTC) |
| --- | --- | --- | --- |
| `public/vendors/cursor.png` | Cursor | [Cursor Brand Guidelines](https://cursor.com/brand) zip `cursor-brand-assets.zip` → `App Icons/PNG/APP_ICON_2D_DARK.png` | 2026-08-28 |
| `public/vendors/cursor-avatar.png` | Cursor | Same zip → `Avatars/Circle/PNG/AVATAR_CIRCLE_2D_DARK.png` | 2026-08-28 |
| `public/vendors/opencode.png` | OpenCode | `https://opencode.ai/apple-touch-icon-v3.png` (also listed on [opencode.ai/brand](https://opencode.ai/brand)) | 2026-08-28 |
| `public/vendors/claude-code.png` | Claude | `https://claude.ai/apple-touch-icon.png` (product origin; Anthropic press kit is [anthropic.com/news](https://www.anthropic.com/news) → Media assets) | 2026-08-28 |
| `public/vendors/codex.png` | Codex / OpenAI | `https://github.com/openai.png` — OpenAI's official GitHub organization avatar. `openai.com` / `chatgpt.com` brand and favicon URLs returned Cloudflare 403 to this environment, so the GitHub org mark OpenAI uploaded is the official stand-in. Review [OpenAI brand](https://openai.com/brand) before redistributing. | 2026-08-28 |

Re-fetch with `./scripts/download-vendor-icons.sh` (the script documents URLs; it does not invent a third-party icon pack).

## Rules of use in Dew

- Identification only: "this row is Cursor / OpenCode / Claude Code / Codex".
- No modified marks, no unofficial icon packs pretending to be official.
- Tools without a successfully fetched official icon (Aider, Gemini CLI, Goose, Amp, Crush, Copilot CLI) render a **letter chip**, not a fake logo.

If a vendor asks you to remove a mark, delete the corresponding file under `public/vendors/` and the row still works with the letter chip.

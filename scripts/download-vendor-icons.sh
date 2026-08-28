#!/usr/bin/env bash
# Fetch official product icons from vendor brand / press / favicon origins.
# Run from the repo root. Does not use random icon packs.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
UA="Dew/0.1 (desktop companion; fetching official vendor icons)"

fetch() {
  local url="$1" dest="$2"
  echo "GET $url"
  curl -fsSL -A "$UA" --max-time 30 -o "$dest" "$url"
}

mkdir -p "$TMP" "$ROOT/public/vendors"

# Cursor official brand kit (from https://cursor.com/brand)
fetch "https://ptht05hbb1ssoooe.public.blob.vercel-storage.com/assets/brand/cursor-brand-assets.zip" "$TMP/cursor-brand-assets.zip"
unzip -q -o "$TMP/cursor-brand-assets.zip" -d "$TMP/cursor-zip"

# OpenCode official apple-touch icon (from https://opencode.ai/brand HTML)
fetch "https://opencode.ai/apple-touch-icon-v3.png" "$TMP/opencode.png"

# Claude official product apple-touch icon
fetch "https://claude.ai/apple-touch-icon.png" "$TMP/claude.png"

# OpenAI org avatar hosted on GitHub (openai.com brand URLs are often bot-gated)
fetch "https://github.com/openai.png" "$TMP/openai.png"

python3 - "$TMP" "$ROOT" <<'PY'
import sys
from PIL import Image
from pathlib import Path

tmp = Path(sys.argv[1])
root = Path(sys.argv[2]) / "public" / "vendors"

def save128(src: Path, dest: Path) -> None:
    im = Image.open(src).convert("RGBA").resize((128, 128), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "PNG")
    print("wrote", dest)

save128(tmp / "cursor-zip/App Icons/PNG/APP_ICON_2D_DARK.png", root / "cursor.png")
save128(tmp / "cursor-zip/Avatars/Circle/PNG/AVATAR_CIRCLE_2D_DARK.png", root / "cursor-avatar.png")
save128(tmp / "opencode.png", root / "opencode.png")
save128(tmp / "claude.png", root / "claude-code.png")
save128(tmp / "openai.png", root / "codex.png")
PY

echo "Done. See THIRD_PARTY_NOTICES.md"

# Homebrew for Dew

Dew is a **desktop app**, so the natural Homebrew install is a **cask**, not a formula. Nothing in this folder is a published tap. Do not `brew tap` a URL that does not exist yet.

## After you publish a GitHub repo and a macOS `.app` (or `.dmg`)

1. Create a tap repository named `homebrew-dew` under your GitHub user or org.
2. Copy `Casks/dew.rb` into that tap as `Casks/dew.rb`.
3. Set `homepage` to your real repo URL and `url` / `sha256` to a real GitHub Release asset.
4. Users can then run:

```bash
brew tap <your-github-user>/dew
brew install --cask dew
```

There is **no** `brew install dew` URL to copy-paste until you do that. Please do not publish docs that invent `homebrew-dew` under someone else's account.

## Formula vs cask

- `Casks/dew.rb` — installs the Dew `.app` (what you want).
- `Formula/dew.rb` — source-build stub if you later ship a CLI helper. It is not wired to a bottle.

Windows is not installed via Homebrew; use the NSIS or MSI bundle from `pnpm tauri build` on Windows (see the root README).

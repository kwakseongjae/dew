# Frozen_string_literal: true

# Unpublished formula stub. Dew itself is a desktop app — prefer the cask in Casks/dew.rb.
# Do not treat this as a live `brew install dew` package.
class Dew < Formula
  desc "Always-on desktop companion for local coding agents"
  # homepage: set to your public repo after it exists
  version "0.1.0"
  license "MIT"

  # url and sha256 belong here once you attach a source tarball to a GitHub Release.

  def install
    odie <<~EOS
      Dew is a Tauri desktop app. Use the cask (homebrew/Casks/dew.rb) after you
      publish a tap and a macOS app bundle. This formula is only a placeholder
      so a future CLI helper has a home.
    EOS
  end

  def caveats
    <<~EOS
      Not published. To offer brew install:
        1. Create a GitHub repo named homebrew-dew
        2. Copy homebrew/Casks/dew.rb into that tap
        3. brew tap <github-user>/dew
        4. brew install --cask dew
      There is no tap URL to share until you create one.
    EOS
  end
end

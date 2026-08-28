# Dew
# Unpublished Homebrew cask template. Fill url/sha256/homepage after you cut a macOS release.
# Then put this file in a tap named homebrew-dew and: brew tap <user>/dew && brew install --cask dew
cask "dew" do
  version "0.1.0"
  sha256 :no_check

  # url "https://github.com/<your-user>/dew/releases/download/v#{version}/Dew_#{version}_aarch64.dmg"
  # homepage "https://github.com/<your-user>/dew"

  name "Dew"
  desc "Always-on desktop companion for local coding agents"
  # Do not set homepage/url until those addresses exist.

  # app "Dew.app"

  caveats <<~EOS
    This cask is a template shipped with the Dew source tree.
    It is not a published Homebrew tap. Point url, sha256, and homepage
    at your GitHub Release before anyone can brew install --cask dew.
  EOS
end

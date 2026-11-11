cask "flightdeck" do
  version "0.1.0"
  sha256 :no_check

  url "https://github.com/azweb76/flightdeck/releases/download/v#{version}/Flightdeck-#{version}-mac.zip"
  name "Flightdeck"
  desc "Turn Jira and GitHub issues into pull requests"
  homepage "https://github.com/azweb76/flightdeck"

  livecheck do
    url :homepage
    strategy :github_latest
  end

  auto_updates true
  depends_on macos: ">= :sonoma"

  app "Flightdeck.app"
  binary "#{appdir}/Flightdeck.app/Contents/MacOS/Flightdeck", target: "flightdeck"

  zap trash: [
    "~/.flightdeck",
    "~/Library/Application Support/Flightdeck",
    "~/Library/Logs/Flightdeck",
  ]
end

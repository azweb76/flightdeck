cask "flightdeck" do
  version "0.1.0"
  sha256 :no_check

  url "https://github.com/danclayton/flightdeck/releases/download/v#{version}/Flightdeck-#{version}-mac.zip"
  name "Flightdeck"
  desc "Turn Jira and GitHub issues into pull requests"
  homepage "https://cursor.com/codebase/danclayton/flightdeck"

  app "Flightdeck.app"
  binary "#{appdir}/Flightdeck.app/Contents/MacOS/Flightdeck", target: "flightdeck"

  zap trash: [
    "~/.flightdeck",
    "~/Library/Application Support/Flightdeck",
    "~/Library/Logs/Flightdeck",
  ]
end

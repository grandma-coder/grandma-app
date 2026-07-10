# Maestro screenshot sweep — grandma.app v2

Captures every screen via the in-app **DEV PANEL** (deep-links + seed + mode switch) and saves PNGs that land in `~/.maestro/screenshots/` by default; we copy them into `docs/v2-screenshots/`.

## One-time install
```
curl -Ls "https://get.maestro.mobile.dev" | bash
export PATH="$PATH:$HOME/.maestro/bin"
maestro --version
```
Requires the booted iOS simulator with the grandma-app dev-client installed (already true) and Metro running (`npm start`).

## How the flows work
Each flow opens the dev panel (tap the **PANEL** button in the DEV MODE banner), taps a route label, then `takeScreenshot`. `simctl` does the actual PNG; Maestro does the tapping/navigation.

## Run
```
# from repo root, with sim booted + app open
maestro test .maestro/00-seed-and-modes.yaml      # seed data first
maestro test .maestro/01-auth.yaml
maestro test .maestro/02-onboarding.yaml
maestro test .maestro/03-deeplink-screens.yaml    # profiles, utility, connections
maestro test .maestro/04-behaviors.yaml           # home/calendar/analytics per mode
# or all:
maestro test .maestro/
```

Then collect:
```
bash .maestro/collect.sh    # copies ~/.maestro/screenshots → docs/v2-screenshots, by name
```

## Notes / limits
- **Modals & forms** (tap a card → popup) are partly automatable but fragile — those steps are marked `optional` and may need a manual pass with `xcrun simctl io booted screenshot`.
- If a label isn't found, Maestro errors on that step; the rest continue if wrapped per-flow. Adjust labels if the dev panel changes.
- App must be **signed in** for behavior screens; auth/onboarding flows screenshot the raw screens regardless.

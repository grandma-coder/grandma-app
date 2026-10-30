# App capture — real grandma.app clips for the site

Records the installed grandma dev-client app in the iOS Simulator with demo data,
in English and Portuguese, in light and dark mode, and encodes looping clips into `public/media/app/<lang>/`.
Nothing here modifies the grandma-app repo.

## One-time (per machine)
1. Open Simulator.app with an iPhone 16 Pro or 17 Pro.
2. `cd ../grandma-app && npm start` (Metro) — keep it running.
3. `bash scripts/capture/prepare.sh` (installs the latest EAS simulator build if missing).
4. **Demo names:** the signed-in account must show fictional names only: parent "Amara Okafor" (`/profile/personal`), kids Kenji / Lua / Thiago (`/profile/kids`). Rename via the app UI before recording; never record real names, e-mail, city or health notes.
5. **Igor:** open the app in the simulator and sign in with the demo account.
   Never a real user. Credentials stay out of this repo.
6. `maestro test scripts/capture/flows/00-seed.yaml` — seeds every mode with demo data.

## Record + encode
    bash scripts/capture/record.sh          # all shots × {pt,en} × {light,dark} → scripts/capture/raw/<lang>/<theme>/
    bash scripts/capture/encode.sh          # light → public/media/app/<lang>/<shot>.{mp4,webm,jpg}
                                            # dark  → public/media/app/<lang>/<shot>-dark.{mp4,webm,jpg}
    THEMES=dark LANGS=en bash scripts/capture/record.sh talk   # re-record a subset
    open scripts/capture/review.html        # Igor reviews all 32 clips (pt/en × light/dark) before commit

Re-run whenever the app's UI changes. Raw recordings are gitignored.

The app has its own Dark Mode switch (ignores simulator appearance): `_light.yaml` / `_dark.yaml` set it before each pass.

Each shot flow assumes the right app mode is already active: `record.sh` runs `flows/mode-<mode>.yaml` first (so the Dev Panel, which shows the account e-mail, is never on video). To run one shot by hand, run its `mode-*.yaml` before it.

## If a step can't find a label
`maestro hierarchy` prints the current screen's elements. Update the flow's text
selector and re-run only that shot: `bash scripts/capture/record.sh home-meno`.

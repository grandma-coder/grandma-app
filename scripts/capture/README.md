# App capture — real grandma.app clips for the site

Records the installed grandma dev-client app in the iOS Simulator with demo data,
in English and Portuguese, and encodes looping clips into `public/media/app/<lang>/`.
Nothing here modifies the grandma-app repo.

## One-time (per machine)
1. Open Simulator.app with an iPhone 16 Pro or 17 Pro.
2. `cd ../grandma-app && npm start` (Metro) — keep it running.
3. `bash scripts/capture/prepare.sh` (installs the latest EAS simulator build if missing).
4. **Igor:** open the app in the simulator and sign in with the demo account.
   Never a real user. Credentials stay out of this repo.
5. `maestro test scripts/capture/flows/00-seed.yaml` — seeds every mode with demo data.

## Record + encode
    bash scripts/capture/record.sh          # all shots, both languages → scripts/capture/raw/
    bash scripts/capture/encode.sh          # → public/media/app/{en,pt}/*.{mp4,webm,jpg}
    open scripts/capture/review.html        # Igor reviews every clip before commit

Re-run whenever the app's UI changes. Raw recordings are gitignored.

## If a step can't find a label
`maestro hierarchy` prints the current screen's elements. Update the flow's text
selector and re-run only that shot: `bash scripts/capture/record.sh home-meno`.

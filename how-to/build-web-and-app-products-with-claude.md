# From Zero to Shipped: Building a Web or App Product with Claude

*A complete, copy-paste, baby-steps guide for someone who has never set up a developer environment.*

---

## Read this first (2 minutes)

You're about to set up everything you need to build and ship a real **website** or a real **phone app**, using Claude to write the code for you. You don't need to know how to program. You need to be able to **copy text, paste it, and press Enter**.

**How to read this guide:**
- Commands live in grey boxes. Copy the whole box, paste it into your Terminal, press Enter.

  ```bash
  echo "like this"
  ```
- 🍎 = Mac only. 🪟 = Windows only. No icon = both.
- **Everyone does [Part 1](#part-1--get-your-computer-ready-everyone-does-this-once) once.** Then you go to **one** track: 📱 App or 🌐 Web.
- Steps marked **OPTIONAL** are *not* needed to get your product running. Skip them at the start; add them later when you actually need them.

**Two golden rules:**
1. **Never paste a command from a stranger that you don't understand.** Everything in *this* guide is safe.
2. **When stuck, ask Claude.** After [Part 1](#part-1--get-your-computer-ready-everyone-does-this-once), Claude lives in your Terminal. Paste any error to it and it fixes things — including the setup itself.

**Cost:** designed to start at ~$0. Your only guaranteed cost is a Claude subscription (from ~$20/month), because that's the brain doing the work. Full breakdown at the [end](#what-it-costs).

---

## Which are you making?

> **📱 Making a phone app (iPhone/Android)?**
> Do **Part 1**, then follow the **[App track](#-app-track--make-a-phone-app)**.
>
> **🌐 Making a website / web app?**
> Do **Part 1**, then follow the **[Web track](#-web-track--make-a-website)**.

You can build the other one later — Part 1 never changes, and the optional add-ons work for both.

---

## The mental model (30 seconds)

What each tool actually is:

| Tool | In plain English |
|---|---|
| **Terminal** | A text box where you type commands to your computer |
| **Node.js** | The engine that runs modern web/app code. Nothing works without it |
| **Git + GitHub** | A time machine for your code (Git) + a cloud backup of it (GitHub) |
| **Claude Code** | Claude, living in your Terminal, writing and fixing code for you |
| **VS Code** | The app where you open, see, and edit your project files — with a built-in Terminal |
| **Supabase** | Database + user logins + file storage, hosted for you |
| **Vercel** *(web)* | Puts your website online in seconds |
| **Expo + EAS** *(app)* | Builds your code into a real installable phone app |
| **Sentry** *(optional)* | A smoke alarm that emails you when your live app crashes |

You don't need to master any of these. You install them once, then talk to Claude.

---

# Part 1 — Get your computer ready (everyone does this once)

Follow **only** your operating system's lines.

### 1.1 — Open the Terminal

**🍎 Mac:**
1. Press `Cmd (⌘) + Space`, type `Terminal`, press Enter.
2. A window with text appears. Leave it open. That's your Terminal.

**🪟 Windows:** we'll install **WSL**, which makes Windows behave like a normal developer machine so every command here "just works."
1. Click Start, type `PowerShell`.
2. **Right-click** "Windows PowerShell" → **Run as administrator** → Yes.
3. Paste this, press Enter:

   ```powershell
   wsl --install
   ```
4. When it finishes, **restart your computer**.
5. After restart, a black window asks you to create a Linux **username** and **password**. Pick simple ones and **write them down** (the password stays invisible as you type — that's normal).
6. From now on, "open your Terminal" means: open the **Ubuntu** app (search `Ubuntu` in Start). **Do everything below in the Ubuntu window**, never PowerShell, unless a step says PowerShell.

### 1.2 — Install the "app store for tools"

**🍎 Mac — install Homebrew.** Paste, press Enter, type your Mac password if asked:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
If it prints two `echo` lines at the end, copy-paste and run those two lines. Then check:
```bash
brew --version
```

**🪟 Windows (in Ubuntu):**
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.3 — Install Node.js (the engine)

Same on both. Paste:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```
**Now close your Terminal completely and open a fresh one.** Then:
```bash
nvm install --lts
```
Check (you should see two version numbers):
```bash
node --version
npm --version
```

### 1.4 — Install Git and tell it who you are

**🍎 Mac:**
```bash
brew install git
```
**🪟 Windows/Ubuntu:**
```bash
sudo apt install git -y
```
Then (both — use your real name and the email you'll use for GitHub):
```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

### 1.5 — Install and set up VS Code (your workshop)

**What it is and why you want it.** VS Code is a free app made by Microsoft. Think of it as the *workshop* where your whole project lives: on the left you see all your project's files, in the middle you read and edit them, and at the bottom there's a **built-in Terminal** — the same Terminal from step 1.1, but right inside the app. That means you can see your files, run commands, and talk to Claude *all in one window* instead of juggling separate apps. You don't have to edit code by hand (Claude does that), but seeing the files change as Claude works makes everything less mysterious.

**Install it:**
1. Download from **https://code.visualstudio.com** and install it like any normal app.
2. 🪟 **Windows only:** open VS Code, press `Ctrl+Shift+X` (the Extensions panel), search **"WSL"** (by Microsoft), and click Install. This lets VS Code open the Ubuntu projects you'll create.

**Learn the three things you'll actually use** (you'll do this for real once you've created a project in your track — just know they exist):
- **Open your project:** in VS Code, go to **File → Open Folder** and pick your project folder (e.g. `projects/my-web-app`). The file list appears on the left. 🪟 Windows users: use the blue **"><"** button in the bottom-left corner → **Connect to WSL**, then open the folder.
- **Open the built-in Terminal:** press **`` Ctrl+` ``** (the key above Tab), or menu **Terminal → New Terminal**. A Terminal opens at the bottom, *already inside your project folder* — so you can skip the `cd` step and just run `npm run dev`, `npx expo start`, or `claude` right there.
- **Watch Claude work:** when you run `claude` in that built-in Terminal and ask for a change, you'll see the files on the left light up as they're edited. That's your project being built in front of you.

> In short: **VS Code = files on the left + Terminal at the bottom + Claude doing the typing.** Once you're comfortable, you can do *everything* in this one window.

### 1.6 — Install Claude Code (your AI co-pilot)

> You need a **paid Claude plan** for Claude Code — a **Pro** (~$20/mo) or **Max** subscription. The free chat plan does **not** include it. Pro is the cheapest sensible start.

Install (both):
```bash
curl -fsSL https://claude.ai/install.sh | bash
```
Close and reopen your Terminal, then check:
```bash
claude --version
```
Log in — type `claude`, press Enter, and approve the login in your browser:
```bash
claude
```
To leave Claude Code anytime: type `/exit`.

### 1.7 — Connect your computer to GitHub

Create a free account at **https://github.com** first (use the same email as step 1.4). Then install GitHub's login helper:

**🍎 Mac:**
```bash
brew install gh
```
**🪟 Windows/Ubuntu:**
```bash
sudo apt install gh -y
```
Log in (both) — press Enter on the defaults, choose **browser** login, paste the code it shows:
```bash
gh auth login
```

✅ **Your computer is ready.** Now go to your track below.

---

# 📱 App track — make a phone app

Follow these in order. This is everything you need to have a real app running on your phone, backed by a database and user logins. (Crash-alerts are an **[optional add-on](#optional--sentry-crash-alerts)** you can add later.)

### App step 1 — Install Expo Go on your phone
On your phone's app store, install **Expo Go**. This shows your app live as you build.

### App step 2 — Make a home for your projects
In your Terminal:
```bash
mkdir -p ~/projects && cd ~/projects
```

### App step 3 — Let Claude create the app
Start Claude:
```bash
claude
```
Then type (in plain English — change the description to your idea):

> Create a new Expo app called `my-mobile-app` in this folder using the latest SDK, TypeScript, and Expo Router. Then tell me exactly how to run it on my phone with Expo Go.

When it's done, leave Claude (`/exit`) and enter the new folder:
```bash
cd my-mobile-app
```

### App step 4 — See it on your phone
```bash
npx expo start
```
A **QR code** appears. Open **Expo Go** on your phone → scan it (phone and computer on the same Wi-Fi). Your app loads. Edit a file, save, and it updates instantly. Press `Ctrl+C` to stop.

👉 **This `npx expo start` is the command you'll run every time you work.** See ["Running your project every day"](#running-your-project-every-day) so you never have to memorize it.

### App step 5 — Add your database & logins (Supabase)
Almost every real app needs to *store data* and let people *sign up / log in*. Supabase gives you both, hosted for free.

**a) Create the account and project:**
1. Go to **https://supabase.com** → **Start your project** → sign in with GitHub.
2. Click **New project**. Set a **Name**, click **Generate** for the **Database Password** and **save it somewhere safe**, pick the **Region** closest to your users. Create it and wait ~2 minutes.

**b) Get your two keys** — under **Project Settings → API**, copy:
- **Project URL** (like `https://abcd.supabase.co`)
- **anon / publishable key** (a long string)

**c) Let Claude wire it in** — start `claude` in your project folder and say:

> Add Supabase to this Expo app. Install the client and the secure storage adapter, store my keys safely in an environment file that stays out of GitHub, and set up a helper for logins and data. Project URL: `PASTE_URL`, anon key: `PASTE_KEY`.

> 🔒 The **anon/publishable** key is safe to ship. Any key labelled **service_role** or **secret** must **never** go into your code or GitHub — treat it like a house key. Claude follows this rule; ask it if unsure.

> 💡 **Free-tier catch:** a Supabase free project **pauses after 7 idle days** — just click **Restore** on supabase.com to wake it. Upgrade to Pro ($25/mo) once you have steady users.

### App step 6 — Back up your code to GitHub
In the project folder:
```bash
git init
git add .
git commit -m "First version of my app"
gh repo create my-mobile-app --private --source=. --push
```
Refresh github.com — your code is safely there.

### App step 7 — (When you're ready) build a real installable app
Expo's **EAS** turns your code into an app you can install and, later, publish to the stores. Create a free Expo account at **https://expo.dev** (sign in with GitHub), then:
```bash
npm install -g eas-cli
eas login
eas build:configure
```
Press Enter on the defaults. To build an Android version you can install and share:
```bash
eas build --platform android --profile preview
```
It builds on Expo's servers (free tier: **15 Android + 15 iOS builds/month**) and gives you a download link.

> **Reality check:** to build for **iPhone** and to **publish to either store**, Apple charges **$99/year** and Google a **one-time $25**. You do **not** need these to build and test — Expo Go and Android preview builds are free. Only pay when you're ready to publish.

**✅ You have a working app with a database.** Your everyday loop: *ask Claude for a feature → see it in Expo Go → back up with `git push` → `eas build` when you want an installable version.*

Optional next step: [add crash alerts (Sentry)](#optional--sentry-crash-alerts).

---

# 🌐 Web track — make a website

Follow these in order. This is everything you need to have a real website live on the internet, backed by a database and user logins. (Crash-alerts are an **[optional add-on](#optional--sentry-crash-alerts)** you can add later.)

### Web step 1 — Make a home for your projects
In your Terminal:
```bash
mkdir -p ~/projects && cd ~/projects
```

### Web step 2 — Let Claude create the app
Start Claude:
```bash
claude
```
Then type (change the description to your idea):

> Create a new Next.js web app called `my-web-app` in this folder using the latest version, TypeScript, Tailwind CSS, and the App Router. Then tell me exactly how to run it on my computer.

When done, leave Claude (`/exit`) and enter the folder:
```bash
cd my-web-app
```

### Web step 3 — See it run on your computer
```bash
npm run dev
```
Open **http://localhost:3000** in your browser. That's your site, running privately on your machine. Press `Ctrl+C` to stop.

👉 **This `npm run dev` is the command you'll run every time you work.** See ["Running your project every day"](#running-your-project-every-day) so you never have to memorize it.

### Web step 4 — Add your database & logins (Supabase)
Almost every real website needs to *store data* and let people *sign up / log in*. Supabase gives you both, hosted for free.

**a) Create the account and project:**
1. Go to **https://supabase.com** → **Start your project** → sign in with GitHub.
2. Click **New project**. Set a **Name**, click **Generate** for the **Database Password** and **save it somewhere safe**, pick the **Region** closest to your users. Create it and wait ~2 minutes.

**b) Get your two keys** — under **Project Settings → API**, copy:
- **Project URL** (like `https://abcd.supabase.co`)
- **anon / publishable key** (a long string)

**c) Let Claude wire it in** — start `claude` in your project folder and say:

> Add Supabase to this Next.js app. Install the client, store my keys safely in a `.env.local` file that stays out of GitHub, and set up a helper for logins and data. Project URL: `PASTE_URL`, anon key: `PASTE_KEY`.

> 🔒 The **anon/publishable** key is safe to ship. Any key labelled **service_role** or **secret** must **never** go into your code or GitHub — treat it like a house key. Claude follows this rule; ask it if unsure.

> 💡 **Free-tier catch:** a Supabase free project **pauses after 7 idle days** — just click **Restore** on supabase.com to wake it. Upgrade to Pro ($25/mo) once you have steady users.

### Web step 5 — Back up your code to GitHub
In the project folder:
```bash
git init
git add .
git commit -m "First version of my website"
gh repo create my-web-app --private --source=. --push
```

### Web step 6 — Put it live with Vercel
1. Go to **https://vercel.com** → sign up **with GitHub**.
2. **Add New → Project** → find `my-web-app` → **Import**.
3. **Add your Supabase keys here too.** Under **Environment Variables**, add the same names and values from your `.env.local` file (your secret file never leaves your computer, so Vercel needs its own copy). Not sure which names? Ask Claude: *"What environment variables do I need to add in Vercel?"*
4. Click **Deploy** and wait ~1 minute.
5. Vercel gives you a live link like `https://my-web-app.vercel.app`. **That's your product, live on the internet.** 🎉

**The magic:** from now on, every `git push` makes Vercel rebuild and update your live site automatically — you never "upload" manually.

**✅ You have a live website with a database.** Your everyday loop: *ask Claude for a feature → check localhost:3000 → `git push` → Vercel updates in ~1 minute.*

Optional next step: [add crash alerts (Sentry)](#optional--sentry-crash-alerts).

---

# Running your project every day

This is the part that trips up beginners: *"How do I get my project running again tomorrow?"* Here's the whole ritual, and how to make it effortless.

### The 3-step ritual (every time you sit down to work)

**1. Open your Terminal and go into your project folder.** "Go into" is the `cd` command ("change directory"):
```bash
cd ~/projects/my-web-app
```
*(App track: use `cd ~/projects/my-mobile-app`.)* The `~` means "my home folder," so this works no matter where the Terminal starts.

**2. Start the preview** and leave it running in that window:
- 🌐 Web: `npm run dev` → then open `http://localhost:3000`
- 📱 App: `npx expo start` → then scan the QR code with Expo Go

**3. Open a second Terminal window** (Mac: `Cmd+N`; Ubuntu: open a new tab), go into the same folder again with the same `cd` command, and start `claude` there to ask for changes. Now you have the preview running in one window and Claude in the other.

To stop the preview: click its window and press `Ctrl+C`.

### The cheat sheet (keep this handy)

| I want to… | Type this |
|---|---|
| Go into my web project | `cd ~/projects/my-web-app` |
| Go into my app project | `cd ~/projects/my-mobile-app` |
| Run the website preview | `npm run dev` |
| Run the app preview | `npx expo start` |
| Stop a preview | Click the window, press `Ctrl+C` |
| Talk to Claude | `claude` |
| Leave Claude | `/exit` |
| Save & back up my work | `git add . && git commit -m "what I changed" && git push` |

### Make it effortless (recommended) — one-word shortcuts

So you never memorize the above, you can create a **shortcut word** ("alias"). The easiest way: start `claude` and ask it to do this for you —

> Create a terminal shortcut so that when I type `web`, it goes into `~/projects/my-web-app` and runs `npm run dev`. And a shortcut `app` that goes into `~/projects/my-mobile-app` and runs `npx expo start`. Set it up for my shell and tell me how to reload it.

After that, starting work is literally:
```bash
web
```
or
```bash
app
```
and your preview is running. That's the whole point — Claude handles the plumbing, you type one word.

> Tip: if you forget *anything* — the folder name, a command, what a message means — just open `claude` and ask in plain English. It knows your setup.

---

# Optional — Sentry (crash alerts)

This is **not required** to have your product running — add it when you're ready. It works for both the App track and the Web track.

**Add this when:** you have real users and want to be told *immediately* when something breaks — with the exact file, line, and what the user did.

### Set up the account
1. Go to **https://sentry.io** → sign up with GitHub.
2. Pick the platform matching your track: **Next.js** (web) or **React Native** (app).
3. Copy the **DSN** it shows you (a URL with `...sentry.io/...`) and save it.

### Let Claude wire it in
Open `claude` in your project folder:

> Add Sentry error monitoring to this project. My DSN is `PASTE_DSN`. Set it up so both server and browser/app errors are reported.

**Cost:** free **Developer** plan = 5,000 errors/month, 1 user. Plenty while building and finding first users.

---

# What it costs

Your only guaranteed cost is Claude. Everything else has a real free tier.

| Tool | Free tier | You'd pay when… | Paid entry |
|---|---|---|---|
| **Claude (Pro)** | — (required) | From day one — it's the brain | **~$20/mo** |
| **Node / Git / VS Code / Claude Code / GitHub** | Free | Basically never | $0 |
| **Supabase** | 500 MB DB, 50k users, 2 projects | Real always-on users | $25/mo |
| **Vercel** *(web)* | 100 GB/mo, non-commercial | You charge money / grow | ~$20/mo |
| **Expo / EAS** *(app)* | 30 builds/mo, 1,000 users | Heavy building / more users | from ~$19/mo |
| **Apple Developer** *(app)* | — | Only to publish to the iPhone App Store | **$99/yr** |
| **Google Play** *(app)* | — | Only to publish to Google Play | **$25 once** |
| **Sentry** *(optional)* | 5,000 errors/mo | More errors / teammates | ~$26/mo |

**Bottom line while building:** ~$20/month (Claude only), for either track. Publishing an app to both stores adds $99/year (Apple) + $25 once (Google).

---

# When things break

Errors are normal — even for pros. In order:

1. **Copy the exact error and paste it to Claude.** Run `claude` in the project folder: *"I got this error — what is it and how do I fix it?"* This fixes most problems.
2. **Read the last line first** — the real cause is usually at the bottom of a long message.
3. **`command not found`** → close and reopen your Terminal (installs only take effect in a fresh window).
4. **🪟 Nothing behaves like the guide** → make sure you're in the **Ubuntu** window, not PowerShell.
5. **Can't find your project** → you're in the wrong folder. Run `cd ~/projects/my-web-app` (or `my-mobile-app`) again.
6. **Supabase app can't connect** → the free project probably **paused** (7 idle days). Open supabase.com → **Restore**.
7. **You committed a secret key** → tell Claude right away: *"I think I committed a secret key, help me remove it and rotate it."*

You're never truly stuck: Claude set this up with you and can debug any part of it. Describe the problem like you'd tell a friend, paste what you see, let it drive.

---

# Glossary

- **Terminal / command line** — the text box where you type instructions to your computer.
- **Command** — one line you paste and run.
- **`cd`** — "change directory"; moves the Terminal into a folder.
- **CLI** — a tool you use by typing (Claude Code, `gh`, `eas`).
- **Node.js** — the engine that runs your code.
- **npm / npx** — Node's tools for installing (`npm`) and running (`npx`) things.
- **Repository ("repo")** — one project's folder of code, tracked by Git.
- **Commit** — a saved snapshot of your project.
- **Push / pull** — upload your snapshots to GitHub / download them.
- **Deploy** — publish your code so it's live on the internet.
- **Localhost** — your own computer; a private preview only you can see.
- **Alias** — a short word you invent that runs a longer command for you.
- **Environment variable / `.env`** — a file holding secret keys, kept out of GitHub.
- **DSN** — the address Sentry gives you so your app can report errors to it.
- **Framework** — a pre-built starting structure (Next.js for web, Expo for apps).

---

*You now have a full pipeline: a computer that can build software, an AI co-pilot that writes it, a cloud backup, and a way to ship — for the price of a Claude subscription. Pick your track, ship something tiny this week, and add the optional pieces only when you need them.*

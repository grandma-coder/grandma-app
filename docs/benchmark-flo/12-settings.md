# Flo: Settings, Profile & Account — 28 Screens

Comprehensive documentation of Flo's settings, profile, and account management flows. Analysis covers information architecture, goal/mode switching, privacy & security, notification taxonomy, and account management patterns.

---

## Screens 1–10: Home Settings & Profile Overview

### Screen #225 — Settings Home + Referral Banner
- **Purpose:** Main settings entry point with premium referral promotion and goal/mode display.
- **Text inventory:** "Settings" (title), "Save with Flo Friends" (banner), "Invite family and friends to join Flo Premium", "Try Flo Friends" (button), "jdoe.mobbin1@gmail.com", "Edit info" (link), "Flo Premium" (badge), "My goal:" (heading), "Track cycle" (active pill), "Get pregnant" (pill), "Track pregnancy" (pill, partially visible), "Report for a doctor" (row), "Graphs & reports" (row), "Cycle and ovulation" (row, partially hidden).
- **UI structure:** Modal/sheet overlay; profile card on dark background; goal pill cluster (first = active pink); stacked settings rows with disclosure arrows; bottom footer branded logo.
- **Flow & logic:** Goal selection is immediately visible—users see active mode + alternate modes as quick-tap pills. Settings rows cascade below. Premium badge signals subscription status. Edit profile entry point signals name/photo customization available.

### Screen #226 — Settings Menu Tree
- **Purpose:** Scrollable list of all settings categories and legal links.
- **Text inventory:** "Graphs & reports", "Cycle and ovulation", "Settings", "Access code", "Reminders", "Help", "About Flo", "Privacy Policy", "Terms of Use", "Accessibility Statement", Flo logo.
- **UI structure:** Icon + label rows with right-arrow disclosure; bottom legal links (pink/teal text); Flo health branding.
- **Flow & logic:** Breadth-first IA—each row opens a detail screen. Settings (general), Access code (biometric/PIN), Reminders (notifications), Help/About (support). Legal links are persistent footer, always reachable.

### Screen #227 — Profile Overview
- **Purpose:** Profile header + account verification + premium feature toggles.
- **Text inventory:** "Profile" (title), "Log out" (link), "Select profile picture" (prompt), avatar, "Email", "jdoe.mobbin1@gmail.com ✓" (verified), "Lifestyle settings" (row), "FLO PREMIUM SETTINGS" (section header), "Personalized program" (icon + label + description + toggle), "PDF health report" (description: "A health summary you can share with your doctor"), "In-depth Health Assistant chats" (description: "Discover what your body's telling you"), "Unlimited Health Insights" (description: "Receive customized health content"), "Customized avatars" (label partially visible).
- **UI structure:** Large avatar circle; email with checkmark (verification badge); premium settings cards with icon + toggle (right-aligned); section-header typography.
- **Flow & logic:** Profile picture is a hero element—tap to edit. Email shows verified status. Premium features are toggleable (all on by default in this view). Icons codify feature types (article grid, medical document, chat, location pin, people).

### Screen #228 — Premium Features & Data Management
- **Purpose:** Continuation of premium settings + data control section.
- **Text inventory:** "In-depth Health Assistant chats", "PDF health report" (repeated), "Unlimited Health Insights", "Customized avatars" (description: "A personal touch to your Flo app experience"), "Premium support" (description: "Access VIP support"), "Support Flo's mission and medical programs" (description: "Help us dedicate resources to important research"), "Manage my data" (button), "Request a change to your account details, ask to see what data we hold about you, or delete your Flo account and any cycle or health-related data associated with it."
- **UI structure:** Continuation of toggle list; "Manage my data" as a highlighted action panel (gray background) with descriptive subtext.
- **Flow & logic:** Data management is prominently positioned—signals privacy-first approach. Privacy section directly follows premium settings, emphasizing user control over personal health data.

### Screen #229 — Create Your Avatar (Color Picker)
- **Purpose:** Avatar customization—color selection for background circle.
- **Text inventory:** "Create your avatar" (title), "Save" (button), avatar display (customized), 7+ color swatches (pink, teal, slate, cyan, purple, orange, blue), face variants in rows below (cat faces with expressions: cool sunglasses, sad, plain, panda, tiger, fancy, etc.), avatar names not labeled.
- **UI structure:** Large preview circle; horizontal color palette; grid of face variants (4 per row); tap to select.
- **Flow & logic:** Avatar creation is modular—color + face are independent choices. Multiple presets reduce decision friction. Pink is default (selected on first load).

### Screen #230 — Avatar Selection (Continued Variants)
- **Purpose:** Extended avatar face options.
- **Text inventory:** Same as 229 (color swatches now showing alternate color selections), additional face variants (bunny ears, sheep, demon horns, owl, crown, princess, etc.).
- **UI structure:** Color palette scrollable horizontally; faces grid (4 per row); currently selected avatar highlighted in pink circle.
- **Flow & logic:** Selection is persistent—selected color/face remain highlighted. User can toggle back-and-forth with no commit until "Save" button tap.

### Screen #231 — Avatar Save Confirmation
- **Purpose:** Confirmation modal after avatar selection.
- **Text inventory:** "We have successfully saved your new avatar — enjoy!" (confirmation text), "Got it" (button).
- **UI structure:** Modal dialog; centered text; single action button.
- **Flow & logic:** Positive affirmation after save. Closes on "Got it" and returns to profile view.

### Screen #232 — Profile with Saved Avatar
- **Purpose:** Profile screen after avatar update (shows new avatar is persisted).
- **Text inventory:** "Profile", "Log out", avatar (now customized with glasses & specific color), "Select profile picture", "Email", "jdoe.mobbin1@gmail.com ✓", "Lifestyle settings", "FLO PREMIUM SETTINGS", premium toggles (same as 227–228).
- **UI structure:** Identical to screen 227, but avatar is now customized.
- **Flow & logic:** Avatar change is confirmed; profile returns to normal state with updated avatar showing.

### Screen #233 — Account Logout Confirmation
- **Purpose:** Logout warning modal.
- **Text inventory:** "Account logout" (title), "Do you want to log out of the account?" (prompt), "Yes" (button, cyan), "Cancel" (button, cyan).
- **UI structure:** Centered modal; two-button choice pattern.
- **Flow & logic:** Logout is a destructive action—requires confirmation. No data is wiped (login re-fetches user state).

### Screen #234 — Lifestyle Settings
- **Purpose:** Health baseline and personal parameters configuration.
- **Text inventory:** "Lifestyle settings" (title), "Normal sleep duration", "7 h" (value), "Most people need 7–9 hours of sleep to feel rested.", "Normal water intake", "72 fl. oz." (value), "An average person drinks about 64 fl. oz. of water a day." (description), "Step target", "5000" (value), "It's recommended to take at least 10,000 steps daily." (description), "Target weight", "56 lbs." (value), "Height", "5' 6"" (value), "Flo will use your height to calculate your body mass index. It will help make more precise cycle predictions." (description), "Normal calorie intake", "2200 cal" (value), "Consuming 2,200 calories per day is enough for the average person, but you may have your own daily normal calorie intake. Such intake depends on your overall health condition, diet, physical activity, and other factors. In future updates, Flo will calculate your individual daily calorie intake based on these parameters." (description, long).
- **UI structure:** Settings rows with value labels (right-aligned, cyan); descriptive subtext for each setting; no toggles—these are editable fields.
- **Flow & logic:** Baseline health parameters feed into insights and recommendations. Long descriptions educate users on why these matter (e.g., height → BMI → cycle accuracy). Values are editable (tap to modify).

---

**CHECKPOINT 1 — After Screen 10:** First 10 screens cover Settings entry, Profile overview, Avatar customization, Logout flow, and Lifestyle settings configuration. Key pattern: Premium features are prominent toggles; data management is a top-level action; lifestyle parameters are educational.

---

## Screens 11–18: Data Management, Design Settings & Health Integration

### Screen #235 — Manage My Data (GDPR/Privacy Actions)
- **Purpose:** Account data access and deletion controls—GDPR compliance screen.
- **Text inventory:** "Manage my data" (title), "Request information" (row: "Find out what cycle and health-related data we hold about you."), "Change account details" (row: "Ask us to update your personal details, such as your name or email address."), "App consents" (row: "Find out more about adjusting your consents."), "Delete my account" (row: "Permanently delete your account and any data associated with it, including cycle and health-related data."), "User ID" (label), "Tap to copy" (hint), "c63774d8-ab26-4b4a-ad12-d1ccfe7a7b10" (UUID, copyable).
- **UI structure:** Icon + title + description rows; icon at left (info circle, person, checkmark, trash); User ID shown as gray panel with copy hint; all rows have right-arrow disclosure.
- **Flow & logic:** Granular data control—request information, change details, adjust consents, or delete. User ID is exposed for support requests (Data Subject Access Requests). No destructive action happens on this screen; each row opens a confirmation flow.

### Screen #236 — Delete Account Warning Modal
- **Purpose:** Final account deletion confirmation with legal notice.
- **Text inventory:** "Delete account?" (title), "This will delete your account and all data associated with it. You will be logged out of Flo. Your deletion will be processed in accordance with our Privacy Policy. This action can't be undone." (warning text), "Privacy Policy" (link), "Delete my account" (button, red/pink), "Cancel" (button).
- **UI structure:** Centered modal; warning text in body; two action buttons (destructive red, neutral gray).
- **Flow & logic:** Deletion is irreversible—warning emphasizes this. Privacy Policy link is included (transparency). User must cancel or confirm; no accidental deletes.

### Screen #237 — Account Deletion Processing
- **Purpose:** In-progress state during account deletion.
- **Text inventory:** "Processing..." (modal label).
- **UI structure:** Centered modal with spinner or loading indicator.
- **Flow & logic:** Blocking state—prevents user interaction until deletion completes. No timeout shown, but implies server-side processing.

### Screen #238 — Settings: Design & Localization
- **Purpose:** Appearance, language, and regional settings.
- **Text inventory:** "Settings" (title), "App design settings" (row with icon), "The Health app" (row with icon), "Change language" (row with icon), "Metric system" (toggle, off).
- **UI structure:** Icon + label rows; one toggle (metric system); all rows except toggle have right-arrow disclosure.
- **Flow & logic:** Design settings controls light/dark mode. Health app integration toggle. Language picker. Metric vs. imperial (localization). Settings are at the sub-menu level, not in main tree.

### Screen #272 — App Design Settings (Light/Dark)
- **Purpose:** Theme selection (light or dark appearance).
- **Text inventory:** "App design settings" (title), "APPEARANCE" (section), "Light" (option with preview card + checkmark), "Dark" (option with preview card, unselected).
- **UI structure:** Two side-by-side preview cards (showing pink app with light/dark canvas); radio buttons below each; active option has pink checkmark.
- **Flow & logic:** Theme selection is instant—tap to switch. Light is default. Preview cards show the app's actual appearance in each theme, reducing confusion.

### Screen #273 — Dark Mode Selected
- **Purpose:** Dark theme is now active.
- **Text inventory:** "App design settings" (title, now white on dark), "APPEARANCE" (section, now dim white), "Light" (option, now unselected), "Dark" (option, now selected with pink checkmark).
- **UI structure:** Same layout as 272, but entire screen is dark (OLED-friendly blacks); theme toggle applies globally.
- **Flow & logic:** Theme change is persisted immediately. No restart needed. All screens adapt.

### Screen #274 — Health App Integration
- **Purpose:** Apple Health / Google Fit connection configuration.
- **Text inventory:** "The Health app" (title), "Connect to the Health app" (toggle, off), "Why connect the Health app?" (section), "Keep track of how your sleep, weight, and other parameters affect your cycle." (benefit 1, icon: magnifying glass + heart), "Period predictions will be more accurate." (benefit 2, icon: calendar target), "Ovulation predictions will be more accurate if you have an Apple Watch or a heart rate-tracking device." (benefit 3, icon: heart rate graph), heart illustration (pink on white), Apple Health logo / Flo icon.
- **UI structure:** Toggle at top; benefits listed as icon + text rows; central illustration; branding at bottom.
- **Flow & logic:** Health app integration is opt-in. Benefits are clearly explained (why it matters). Icon visual language is consistent (search, target, health metrics).

### Screen #275 — Health App Toggle Enabled
- **Purpose:** Health app is now connected.
- **Text inventory:** "The Health app" (title), "Connect to the Health app" (toggle, now on/cyan), "If data from Health does not appear in Flo or data from Flo does not appear in Health, do the following:" (instruction header), "Open Health app." (step 1, heart icon), "Go to the Sources tab." (step 2, down-arrow icon), "Select Flo in the list of apps." (step 3, Flo app icon), "Turn on all of the settings." (step 4, toggle icon).
- **UI structure:** Toggle at top; numbered steps with icons + bold instructions; icon codifies action type.
- **Flow & logic:** After enabling, app provides troubleshooting guidance (data sync expectations, manual sync instructions). User empowerment—if sync fails, they know exactly what to do.

---

**CHECKPOINT 2 — After Screen 18:** Screens 11–18 cover data privacy (GDPR-compliant request/delete flow), account deletion, appearance/theme selection, localization, and Health app integration. Key patterns: Destructive actions use warning modals; toggles apply instantly; integration benefits are explained; troubleshooting guidance is in-screen.

---

## Screens 19–28: Language & Localization, Access Code, Reminders & Notifications

### Screen #276 — Change Language Picker
- **Purpose:** Language selection with 24+ language options and flag icons.
- **Text inventory:** "Change language" (title), "Dansk" (Danish + flag), "Deutsch" (German + flag), "繁體中文" (Traditional Chinese + flag), "简体中文" (Simplified Chinese + flag), "English" (English + flag), "English (US)" (English US + flag, checkmark), "Español" (Spanish + flag), "Français" (French + flag), "日本語" (Japanese + flag), "Indonesia" (Indonesian + flag), "Italiano" (Italian + flag), "한국어" (Korean + flag), "Norsk bokmål" (Norwegian + flag), "Polski" (Polish + flag), "Português" (Portuguese + flag), and more (Russian, Swedish, Finnish, Thai, Turkish, Ukrainian, Vietnamese visible in second scroll).
- **UI structure:** Scrollable list; flag icon + language name rows; active language (English US) has cyan checkmark; all rows tappable.
- **Flow & logic:** Language change is global—applies to all app screens. Large language roster (18+) signals international reach. Checkmark shows active language.

### Screen #277 — Access Code: Biometric/PIN Security
- **Purpose:** App-level security settings—fingerprint, Face ID, or custom 4-digit PIN.
- **Text inventory:** "Access code" (title), "Secure access" (toggle, off), "You can choose to protect your app with your fingerprint or Face ID and a custom access code." (description).
- **UI structure:** Single toggle; descriptive subtext explaining what fingerprint/Face ID + PIN does.
- **Flow & logic:** Security is opt-in (toggle off by default). Once enabled, user sets a PIN via modal. Fingerprint/Face ID are prerequisites on supported devices. This protects sensitive cycle/health data from casual access.

### Screen #278 — Enter Access Code Modal
- **Purpose:** PIN entry screen (4 digits, phone-style keypad).
- **Text inventory:** "Enter new access code" (title), "○ ○ ○ ○" (4-digit input display, hollow circles), phone keypad (1–9, 0, backspace/X icon), keys labeled with letters (2=ABC, 3=DEF, etc.).
- **UI structure:** Modal with input display at top; alphanumeric phone keypad below; large touch targets.
- **Flow & logic:** User taps keys to enter 4-digit code. Backspace clears. Once 4 digits entered, confirm screen appears.

### Screen #279 — Confirm Access Code Modal
- **Purpose:** PIN confirmation (re-enter to verify).
- **Text inventory:** "Confirm new access code" (title), "● ● ● ○" (4-digit input display, 3 filled + 1 empty, indicating 3 of 4 entered), same phone keypad.
- **UI structure:** Identical to entry modal but title is "Confirm", input shows partial fill (visual feedback on progress).
- **Flow & logic:** After second 4 digits entered, PIN is validated and saved. If mismatch, error appears; user must start over.

### Screen #280 — Access Code Enabled (with Change Option)
- **Purpose:** Secure access is now active; user can change PIN.
- **Text inventory:** "Access code" (title), "Secure access" (toggle, now on/pink), "Change code" (link, pink), "You can choose to protect your app with your fingerprint or Face ID and a custom access code." (original description).
- **UI structure:** Toggle on; "Change code" link appears below toggle (pink text, tappable).
- **Flow & logic:** PIN is set. User can change it anytime via "Change code" link (repeats entry + confirmation flow). Biometric is now active on device lock/unlock.

### Screen #281 — Reminders: Granular Notification Settings
- **Purpose:** Comprehensive notification preferences (organized by type: chats, cycle, medication, lifestyle, general).
- **Text inventory:** "Reminders" (title), "SECRET CHATS" (section), "Secret Chats push notifications" (toggle, on/cyan), "CYCLE" (section), "Period in a couple of days" (toggle + time picker: "10:00 AM", on/cyan), "Period end" (toggle, off), "Period start" (toggle + time: "10:00 AM", on/cyan), "Ovulation" (toggle, off), "MEDICATION AND CONTRACEPTION" (section), "Contraception" (toggle, off), "Add a pill reminder" (link, cyan), "LIFESTYLE" (section), "Log weight" (toggle, off), "Log sleep" (toggle, off), "Log temperature" (toggle, off), "Drink water" (toggle, off), "Step goal achieved" (toggle, on/cyan), "NOTIFICATIONS" (section), "Special offers" (toggle, off).
- **UI structure:** Stacked sections with section headers (gray, uppercased); toggle + label rows; some toggles have time-picker inline (e.g., "10:00 AM"); "Add a pill reminder" is a linked action (cyan text).
- **Flow & logic:** Reminders are granular (cycle events, medication, lifestyle logging, achievements, marketing). Users can enable/disable each independently. Time pickers let users choose notification windows (e.g., period reminder at 10 AM). Nested structure: chats > cycle > medication > lifestyle > general offers. "Add a pill reminder" opens a dialog to set up recurring pill notifications.

### Screen #282 — Reminders (Continued Lifestyle + Notifications)
- **Purpose:** Lower section of reminders page (scrolled down).
- **Text inventory:** "Ovulation" (toggle, off), "MEDICATION AND CONTRACEPTION" (section), "Contraception" (toggle, off), "Add a pill reminder" (link), "LIFESTYLE" (section), "Log weight" (toggle, off), "Log sleep" (toggle, off), "Log temperature" (toggle, off), "Drink water" (toggle, off), "Step goal achieved" (toggle, on/cyan), "NOTIFICATIONS" (section), "Special offers" (toggle, off).
- **UI structure:** Continuation of section list; same layout pattern as 281.
- **Flow & logic:** Scrollable list allows users to see all reminders without overwhelming the screen. Step goal achieved is ON by default (gamification motivation). Special offers are OFF by default (respects user privacy/preference).

---

**CHECKPOINT 3 — Final Section (Screens 19–28, 8 screens):** Language localization (18+ languages), app-level security (PIN + biometric), and notification taxonomy (5 categories: chats, cycle, medication, lifestyle, marketing). Key patterns: Toggles are fine-grained; time pickers are inline; sections organize reminders logically; destructive actions (PIN) require confirmation; localization is global.

---

## Synthesis

### Settings Information Architecture (IA Tree)

```
SETTINGS (Root)
├── Profile
│   ├── Avatar (avatar builder: color + face)
│   └── Email (verified status)
├── Lifestyle Settings
│   ├── Normal sleep duration (7 h)
│   ├── Normal water intake (72 fl. oz)
│   ├── Step target (5000)
│   ├── Target weight (56 lbs)
│   ├── Height (5'6")
│   └── Normal calorie intake (2200 cal)
├── FLO PREMIUM SETTINGS
│   ├── Personalized program (toggle)
│   ├── PDF health report (toggle)
│   ├── In-depth Health Assistant chats (toggle)
│   ├── Unlimited Health Insights (toggle)
│   ├── Customized avatars (toggle)
│   ├── Premium support (toggle)
│   └── Support Flo's mission (toggle)
├── Manage My Data (GDPR)
│   ├── Request information (open DSAR)
│   ├── Change account details (edit email/name)
│   ├── App consents (toggle granular permissions)
│   └── Delete my account (irreversible)
├── Sub-Settings
│   ├── App design settings (light/dark theme)
│   ├── The Health app (Apple Health integration toggle + troubleshooting)
│   ├── Change language (18+ languages with flags)
│   └── Metric system (toggle: imperial ↔ metric)
├── Access Code
│   ├── Secure access (toggle)
│   └── Change code (PIN entry + confirmation)
├── Reminders (Notifications)
│   ├── SECRET CHATS
│   │   └── Secret Chats push notifications (toggle)
│   ├── CYCLE
│   │   ├── Period in a couple of days (toggle + time picker)
│   │   ├── Period end (toggle)
│   │   ├── Period start (toggle + time picker)
│   │   └── Ovulation (toggle)
│   ├── MEDICATION AND CONTRACEPTION
│   │   ├── Contraception (toggle)
│   │   └── Add a pill reminder (link to recurring setup)
│   ├── LIFESTYLE
│   │   ├── Log weight (toggle)
│   │   ├── Log sleep (toggle)
│   │   ├── Log temperature (toggle)
│   │   ├── Drink water (toggle)
│   │   └── Step goal achieved (toggle)
│   └── NOTIFICATIONS
│       └── Special offers (toggle)
├── Help (support)
├── About Flo (version, credits)
└── Legal (Privacy Policy, Terms of Use, Accessibility Statement)
```

### Goal/Mode Switching Model

1. **Goal Selection is Persistent & Visible:**
   - Home settings screen (225) shows 3 active goal pills: "Track cycle", "Get pregnant", "Track pregnancy"
   - Currently active goal is highlighted in pink; tapping another goal switches app-wide view
   - Goal switch is atomic (no multi-select) — only one mode active at a time
   - Mode change triggers app-wide pillar, tab, and home screen refresh

2. **No Explicit Mode-Switching UI:**
   - Mode is changed via goal pills on the Settings home screen, not a dedicated mode switcher
   - Goal pills are compact, horizontally scrollable
   - Flo's approach: embed mode switching into profile/home, not a global nav element

### Privacy & Data Control Features

| Feature | Location | Mechanism | Notes |
|---------|----------|-----------|-------|
| **App-Level Security** | Access Code section | PIN + biometric (fingerprint/Face ID) | Optional; 4-digit code required; can be changed anytime |
| **Account Deletion** | Manage My Data | "Delete my account" button → warning modal → processing | Irreversible; processes in accordance with Privacy Policy |
| **Data Subject Access Request** | Manage My Data | "Request information" → link to request form | GDPR compliance; user can ask what data Flo holds |
| **Account Details Editing** | Manage My Data | "Change account details" → form to update name/email | Allows users to correct or remove personal info |
| **Consent Management** | Manage My Data | "App consents" → granular toggles (marketing, analytics, etc.) | Fine-grained control over data use |
| **Health App Integration Toggle** | The Health app | "Connect to the Health app" (toggle) | Opt-in; includes troubleshooting guide if sync fails |

### Notification Settings Granularity

**Organization by Category (5 sections):**
1. **Secret Chats** — Chat notification toggle only
2. **Cycle** — Period start/end, period-in-a-couple-of-days, ovulation (each has toggle ± time picker)
3. **Medication & Contraception** — Contraception + "Add a pill reminder" link
4. **Lifestyle** — Log weight, log sleep, log temperature, drink water, step goal achieved
5. **Notifications** — Special offers (marketing)

**Key Defaults:**
- Period reminders: ON (time-picker: 10:00 AM)
- Step goal achieved: ON (gamification motivation)
- Special offers: OFF (privacy-first, avoid notification fatigue)
- All other lifecycle logs: OFF (user must opt-in to habit reminders)

**Time Pickers:**
- Inline time selection (e.g., "10:00 AM") for cycle reminders
- No global "quiet hours" visible in this UX
- Users can fine-tune when they receive each notification type

### Account Management Features

| Feature | Flow | Notes |
|---------|------|-------|
| **Profile Picture** | Tap avatar → avatar builder (color picker + face variants) → Save | Customizable; instantly persisted; 7+ colors, 20+ face options |
| **Email Verification** | Email row shows checkmark if verified | Tap "Edit info" to manage email |
| **Premium Status** | "Flo Premium" badge on profile; Premium settings toggles | Subscription status visible; features tied to premium tier |
| **Subscription Features** | 7 premium toggles (program, PDF report, chats, insights, avatars, support, mission) | All on by default in this account; can be toggled off (optionality) |
| **Account Deletion** | Manage My Data → Delete my account → confirmation warning → processing modal | Irreversible; data is deleted per Privacy Policy |
| **User ID** | Bottom of "Manage my data" screen | UUID for support/DSAR requests; copyable via "Tap to copy" |

### Top Patterns Worth Stealing for grandma.app

1. **Visible Goal Pills on Settings Home**
   - Surface active mode prominently; show alternate modes as quick-switch pills
   - Grandma approach: Could show mode on settings home with tap-to-switch pills (Pre-Preg | Pregnancy | Kids)
   - Flo's pattern is more discoverable than a hidden mode-switcher

2. **Granular Notification Toggles + Time Pickers**
   - Organize reminders by category (cycle, medication, lifestyle, etc.)
   - Allow per-reminder time selection (e.g., "Period start reminder at 8 AM")
   - Each toggle is independent — granularity reduces notification fatigue

3. **Prominent Data Management (GDPR-Compliant)**
   - "Manage my data" as a top-level action in profile or settings
   - Include: request info, change account details, adjust consents, delete account
   - Transparency signals privacy-first product value

4. **Avatar Customization as Engagement**
   - Avatar builder (color picker + face variants) is lightweight but memorable
   - Instant save + confirmation modal (positive affirmation)
   - Low friction, high identity investment

5. **Health App Integration with Inline Troubleshooting**
   - Toggle + explanation of why it matters (accuracy, predictions)
   - After enabling, provide step-by-step troubleshooting (Flo 281)
   - Reduces support load; empowers users to self-diagnose sync issues

6. **Theme Selection with Live Preview**
   - Show light/dark side-by-side cards with app mockups
   - Instant switch; no restart needed
   - Preview cards reduce decision anxiety

7. **PIN Security as Opt-In, Not Default**
   - Allows users to protect sensitive health data
   - 4-digit PIN + biometric (fingerprint/Face ID)
   - Confirmation modal ensures PIN is correct before saving
   - "Change code" link allows updates anytime

8. **Language Localization with Flags + Active Checkmark**
   - 18+ languages; flag icons + language names
   - Active language shows checkmark
   - Global change applies to all screens instantly

9. **Premium Features as Toggles (Not Paywalls)**
   - Premium settings are toggles, not access gates
   - Users can turn features on/off (optionality)
   - Distinguishes premium features clearly (section header: "FLO PREMIUM SETTINGS")

10. **Lifestyle Baselines with Educational Descriptions**
    - Sleep duration, water intake, step target, weight, height, calorie intake
    - Each has a justified default + explanation (e.g., why height matters for BMI → cycle accuracy)
    - Educates users on why baseline parameters improve predictions

---

## File Location
`/Users/igorcarvalhorodrigues/Projects/grandma-app/docs/benchmark-flo/12-settings.md`



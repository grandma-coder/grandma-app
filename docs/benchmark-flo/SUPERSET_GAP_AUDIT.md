# grandma.app vs Flo — Full Superset Gap Audit

**Date:** 2026-07-16
**Mindset:** grandma.app is the **full-journey platform** (pre-pregnancy → pregnancy → kids). Flo is a **specialist** (cycle + pregnancy only). The goal is **not** parity — it's a **superset**: everything Flo does well on cycle/pregnancy, done at least as well, PLUS the kids journey Flo doesn't have. This audit is exhaustive (every section), verified against our **actual code** (not aspirations), and separates three tiers:

- 🔴 **BROKEN** — we shipped a UI that silently fails or misleads the user. This is worse than absent; it erodes trust. Fix first.
- 🟠 **ABSENT** — a real capability Flo has that we simply don't. Build to match/exceed.
- 🟢 **AHEAD** — we already beat Flo. Protect and market it.

Every claim below is backed by a code read (file paths inline). This supersedes the earlier `CROSS_CHECK_GAP_ANALYSIS.md` (which was polish-focused). This is the complete-coverage version.

---

## 🔴 TIER 0 — BROKEN / MISLEADING (fix before anything else)

These are features we appear to have but that don't actually work. Flo's whole trust posture is "your body, your data, and it works." Every one of these is the opposite: a promise the code breaks.

| # | What the user sees | What actually happens | Evidence | Impact |
|---|---|---|---|---|
| B1 | **"Delete my account"** (in Settings + Account) | Shows an `Alert` telling them to email `support@grandma.app`. No deletion happens. | `app/profile/settings.tsx:75`, `app/profile/account.tsx:84` | Legal/GDPR risk. Flo has a real one-tap delete with warning + processing modal. |
| B2 | **Privacy consent toggles** (share with caregivers, share health data, share photos, AI usage, analytics) | `updateSetting` calls `supabase.from('profiles').update({})` — **empty object**. Column `profiles.privacy_settings` **doesn't exist**. Silently no-ops. | `app/profile/privacy.tsx:95` | User believes they revoked consent; nothing changed. Serious trust breach. |
| B3 | **7 notification toggles** | Persist to AsyncStorage key `grandma:notification_prefs:v1` that is **read nowhere**. Also `expo-notifications` is **not installed** — there is **no push/local delivery at all**. | `app/profile/notifications.tsx`, `lib/notificationEngine.ts` (writes DB rows only) | Toggles are decorative. No OS notification ever fires. |
| B4 | **Unit toggles** (°C/°F, kg/lbs) in Settings | Local `useState` only — not persisted, not read by any log form. Weight is hardcoded kg, BBT hardcoded °C everywhere. | `app/profile/settings.tsx:46-47`, `PregnancyCalendar.tsx:1320`, `CycleLogForms.tsx:675` | Non-US users can't use the app in their units. |
| B5 | **Name capture in onboarding** | `useJourneyStore.setParentName` is **never called anywhere**. Every `saveAndFinish` writes `profiles.name` = `parentName ?? null` → always null. | onboarding stores + all 3 `saveAndFinish` | We greet users by name we never saved. |
| B6 | **Dead community code** | `app/channels/*` (forum-thread UI) queries tables `channel_threads` / `thread_replies` that **exist in no migration**. Reachable only from dev panel. | `app/channels/index.tsx`, `lib/channels.ts` | Crashes / empty. Confusing parallel implementation. |
| B7 | **Data export** ("export my data") | Builds a plain-text summary string → OS Share sheet. Not machine-readable, not a real DSAR export. | `app/profile/privacy.tsx:112` | Presented as data portability; isn't. |
| B8 | **Duplicate language lists** | Settings uses `useLanguageStore` (13 langs, persisted, drives i18n). `personal.tsx` writes a *separate* 29-entry list to `profiles.language` that nothing reads. | `app/profile/settings.tsx` vs `app/profile/personal.tsx` | Two sources of truth; the profile one is dead. |

**Recommendation:** Treat Tier 0 as a bug-fix sprint, not a feature sprint. Either make each work or remove the UI. A broken privacy toggle is legally worse than no toggle. Sequence: B1 (delete account) + B2 (consent) + B7 (export) together — they're the GDPR triad and share one `privacy_settings` migration + one edge function. Then B3 (notifications — biggest scope), then B4/B5/B8 (cheap correctness fixes).

---

## SECTION 1 — DATA & PRIVACY (Flo's #1 trust moat; our biggest hole)

Flo dedicates ~15 screens to data control. This is deliberate: female-health data is politically and legally sensitive (Flo cites its FTC case and "am I at risk if I have an abortion" FAQ directly). We store **children's medical data + cycle + pregnancy data** and have almost none of this.

### 1.1 GDPR / data-rights suite
| Capability | Flo | grandma.app | Verdict |
|---|---|---|---|
| Delete account (real) | ✅ warning modal → processing | 🔴 alert-only stub (B1) | **BROKEN** |
| Data Subject Access Request ("what data do you hold") | ✅ dedicated screen | ❌ none | 🟠 ABSENT |
| Machine-readable data export | ✅ | 🔴 text-summary share (B7) | **BROKEN** |
| Consent management (persisted, granular) | ✅ App consents screen | 🔴 no-op toggles (B2) | **BROKEN** |
| Change account details | ✅ | ✅ email + password work | 🟢 OK |
| User ID display + "tap to copy" for support | ✅ | ❌ none | 🟠 ABSENT |
| "What data we collect / how we use it" transparency screen | ✅ FAQ accordion (10+ Q) | ❌ one-line footer only | 🟠 ABSENT |

### 1.2 App-level security
| Capability | Flo | grandma.app | Verdict |
|---|---|---|---|
| App PIN / passcode | ✅ 4-digit + confirm | ❌ | 🟠 ABSENT |
| Biometric lock (Face ID / fingerprint) | ✅ | ❌ (`expo-secure-store` used only for auth token) | 🟠 ABSENT |

This matters more for us than Flo: a shared family device (partner, nanny, grandparent all use the app) is our core use case. App-lock is arguably a **superset requirement**, not a nice-to-have.

### 1.3 In-app legal & help
| Capability | Flo | grandma.app | Verdict |
|---|---|---|---|
| Privacy Policy readable in-app | ✅ TOC + version history | 🔴 alert "available at grandma.app/privacy" | **BROKEN/ABSENT** |
| Terms of Use readable in-app | ✅ 15-section TOC | 🔴 alert-only | **BROKEN/ABSENT** |
| Help / FAQ center | ✅ 8-category hub + search | ❌ none | 🟠 ABSENT |
| About / mission / credibility | ✅ mission + medical-expertise + privacy cards | ❌ version string only | 🟠 ABSENT |
| Sensitive-topic guidance (crisis resources) | ✅ Crisis Support links | ❌ | 🟠 ABSENT |

**Plan — Section 1 (build a real "Data & Privacy" + "Help & Legal" spine):**
1. **Migration:** `profiles.privacy_settings JSONB` + a `data_deletion_requests` table (or edge function). Wire B2 toggles to actually persist. (0.5 day)
2. **Edge function `delete-account`:** cascade-delete user rows across all tables, revoke auth. Real warning modal + processing state. (1–2 days)
3. **Edge function `export-user-data`:** produce a JSON (or PDF) bundle of all the user's data → signed download URL. (1–2 days)
4. **Consents screen:** granular, persisted toggles — caregiver sharing, health-data-for-AI, analytics, marketing. (1 day)
5. **App-lock:** `expo-local-authentication` + PIN fallback, gate on app foreground. (2 days)
6. **In-app legal + help:** bundle Privacy/Terms as in-app scrollable docs (or WebView), build a FAQ hub (categories mirror ours: Getting Started / Account & Data / Modes / Subscriptions / Care Circle / Privacy). (2–3 days)
7. **Transparency + About screen:** "what we collect and why" + mission + medical credibility. Also serves onboarding trust (see Section 3). (1–2 days)

---

## SECTION 2 — COMMUNITY / CHANNELS (Igor's priority: "where people share experience")

This is the biggest **structural** divergence. We built a **real-identity group-chat**; Flo built an **anonymous topic-forum**. They serve different psychological needs. For sharing sensitive parenting/fertility experiences, **anonymity is often the unlock** — people won't post "I'm scared I'm a bad mother" or "we've been trying for 2 years" under their real name to their care circle.

### 2.1 Model comparison
| Dimension | Flo Secret Chats | grandma.app Channels | Verdict |
|---|---|---|---|
| Core model | Anonymous topic forum | Real-name group chat (`author_name` from `profiles.name`) | 🟠 different — see decision below |
| Organization | 30+ topics in 5 categories, browsable | Flat channel list, soft mode-keyword suggestions | 🟠 ABSENT (no topic taxonomy) |
| Anonymity | Full (avatar-only) | ❌ real name + deterministic sticker avatar | 🟠 ABSENT |
| Age-gating (18+) | ✅ sensitive topics | ❌ | 🟠 ABSENT |
| Post reactions | ✅ hearts | ✅ heart (schema supports 4, UI = 1) | 🟢 partial |
| Polls / voting | ✅ live % | ❌ | 🟠 ABSENT |
| Comment sorting (Top/Newest/Expert) | ✅ | ❌ fixed chrono | 🟠 ABSENT |
| Threaded replies | ✅ | 🟢 one level (`reply_to_id`) | 🟢 partial |
| Bookmarks (save post) | ✅ | ❌ (channel-favorite only) | 🟠 ABSENT |
| Follow / mute / hide topic | ✅ per-topic, reversible w/ Undo | ❌ (channel join/favorite only) | 🟠 ABSENT |
| Unread indicators | ✅ | ✅ per-channel unread + bell | 🟢 OK |
| **Report post / user** | ✅ | ❌ **no reports table** | 🟠 ABSENT (safety) |
| **Block user** | ✅ reversible | ❌ **no blocks table** | 🟠 ABSENT (safety) |
| Community guidelines / rules | ✅ + appeals process | ❌ | 🟠 ABSENT (safety) |
| Moderator / verified-expert badges | ✅ checkmark + title | ❌ (only channel-owner Crown) | 🟠 ABSENT |
| "Ask an Expert" archived sessions | ✅ read-only, premium | ❌ | 🟠 ABSENT |
| Search | ✅ typeahead + popular | 🟢 client-side substring | 🟢 partial |
| Seed content | (real UGC at scale) | ❌ **0 channels, 0 posts** (seed removed `20260607131000`) | 🟠 ABSENT (cold-start) |

### 2.2 The strategic decision (needs Igor's call)
Our group-chat and Flo's anonymous-forum are **not the same product**. Three options:

- **A — Keep group-chat, bolt on safety + engagement** (polls, bookmarks, sorting, reports/blocks, guidelines). Lower effort. Keeps real identity. Risk: real-name kills vulnerable sharing.
- **B — Add a parallel anonymous "Circles/Topics" surface** alongside real-name channels. Two modes: intimate group chats (real, for care circle) + anonymous topic forum (for the scared-first-time-parent posts). This is the **superset** move — we'd have *both* things Flo can only do one of. Higher effort.
- **C — Pivot channels to anonymous topic model** (like Flo). Loses our care-circle-native chat advantage. Not recommended.

**Recommendation: B**, phased. Our care-circle group chat is a genuine advantage Flo lacks (Flo partners can't chat). Adding an anonymous, topic-organized, moderated forum on top makes us a strict superset. But it's a big build — treat as its own epic.

### 2.3 Non-negotiable safety layer (do regardless of A/B/C)
Any UGC surface **must** have, before scale: report post/user, block user, community guidelines screen, and a moderation queue. We have **none**. This is a legal + App Store review risk. Tables needed: `post_reports`, `user_blocks`, plus a moderation status on `channel_posts`. (3–4 days)

### 2.4 Cold-start
Community ships **empty** (seed deliberately removed). An empty forum is a dead forum. Need either curated seed topics per mode/pillar or a soft-launch strategy. Decide before promoting the tab.

**Plan — Section 2:**
1. **Safety layer first** (reports, blocks, guidelines, moderation status) — gate the whole surface on this. (3–4 days)
2. **Delete dead `app/channels/*`** forum code (B6). (0.5 day)
3. **Engagement parity on existing channels:** polls, per-post bookmarks, comment sorting, reaction picker (schema already supports 4 reactions). (3–5 days)
4. **Topic taxonomy + follow/mute/hide** tied to pillars per mode. (3–4 days)
5. **Verified-expert badges** (pediatrician/lactation/OB) — ties to Section 5 credibility. (2 days)
6. **[Epic, Option B] Anonymous Circles** — parallel anonymous topic forum. Scope separately.
7. **Cold-start seed** strategy. (decision + 1–2 days)

---

## SECTION 3 — ONBOARDING & DATA CAPTURE

Flo's onboarding is a **segmentation + trust + reward** engine. Ours is a **minimal setup wizard**. We capture far less, which starves personalization downstream.

### 3.1 Data-capture gaps
| Data point | Flo | grandma.app | Verdict |
|---|---|---|---|
| User's birth year / age | ✅ (calibrates predictions) | ❌ **captured nowhere** (only child DOB) | 🟠 ABSENT |
| Motivation / goals multi-select | ✅ "why are you tracking" | ❌ (only binary TTC toggle) | 🟠 ABSENT |
| Health-concerns multi-select | ✅ PCOS/endo/etc + inline reassurance | 🟢 cycle: PCOS/endo/other chips; kids: allergy chips; **pregnancy: free-text only** | 🟢 partial |
| Cycle data entry (LMP, length) | ✅ | ✅ cycle flow steps 1–3 | 🟢 OK |
| Symptom logging in onboarding | ✅ | ❌ | 🟠 ABSENT |
| Sentiment question | ✅ | 🟢 pregnancy mood only (not cycle/kids) | 🟢 partial |
| **Immediate prediction reward** | ✅ "period in 3 days" | 🟢 pregnancy shows week/countdown; **cycle collects LMP+length but shows NO prediction**; kids none | 🟠 mostly ABSENT |
| Privacy consent gate | ✅ blocking checkboxes | 🔴 **none** (passive footer only) | **BROKEN/ABSENT** |
| Medical credibility signal | ✅ "OB-GYN #1 recommended" | ❌ | 🟠 ABSENT |
| Social proof (testimonials/ratings) | ✅ 3.5M ratings, quotes | ❌ | 🟠 ABSENT |
| Partner/caregiver code redemption | ✅ pair-by-code | 🟢 name-only slots (invite is separate route) | 🟢 partial |

### 3.2 Highest-value fixes
- **Consent gate** (also B2/Section 1) — legally we should not collect child medical + cycle data without explicit processing consent. Add a blocking consent step at the top of `journey.tsx`. (1 day)
- **Immediate cycle prediction reward** — we already collect LMP + cycle length; compute and show "Your next period is ~in N days / fertile window starts X" on the cycle completion screen. Cheap, high-impact anchor. (0.5–1 day, `lib/cycleLogic.ts` already has the math.)
- **Goals/motivation multi-select** per mode — feeds home personalization + reminder targeting. Store as `profiles.goals JSONB`. (1–2 days)
- **User age** — one picker; calibrates cycle/fertility predictions and content. (0.5 day)
- **Credibility + social proof** — even 1–2 screens ("built with OB-GYNs and pediatricians", parent testimonials) measurably lift completion + trust. (1 day, pairs with About screen.)

---

## SECTION 4 — LOGGING & TRACKING

We are actually **broad** here (esp. pregnancy 15 forms, kids 8 rich forms with photo/AI/routines). The gaps are specific.

### 4.1 Cycle-mode taxonomy gaps (vs Flo)
| Category | Flo | grandma.app | Verdict |
|---|---|---|---|
| Menstrual flow | light/med/heavy/**clots** | light/med/heavy | 🟠 missing clots |
| Discharge / cervical mucus | 7-type discharge | 5-type CM | 🟢 partial (rename/expand) |
| Sex & sex drive | 10 types incl. drive | protected/unprotected only | 🟠 mostly ABSENT |
| Pregnancy test | ✅ | ❌ | 🟠 ABSENT (key for TTC!) |
| Ovulation/LH test | ✅ | ✅ | 🟢 OK |
| BBT | °C/°F | °C only | 🟠 unit gap (B4) |
| Physical activity | ✅ | ❌ in cycle | 🟠 ABSENT |
| Water | ✅ | ❌ in cycle | 🟠 ABSENT |
| Weight | ✅ | ❌ in cycle (enum exists, no form) | 🟠 ABSENT |
| Digestion / stool | ✅ | ❌ | 🟠 ABSENT |
| Pill / OC adherence | ✅ + reminder | ❌ | 🟠 ABSENT |

Pregnancy & Kids logging are **ahead of Flo** (Flo has no kids mode; our pregnancy set is deeper). Note: `CycleLogRow` has dead enum members (`energy`, `weight`, `note`) that no form writes — clean up or implement.

### 4.2 Logging UX gaps
| Pattern | Flo | grandma.app | Verdict |
|---|---|---|---|
| Chip-grid multi-select | ✅ | ✅ (symptoms, nutrition) | 🟢 OK |
| **Batch "Apply" whole day** | ✅ one save for all categories | ❌ per-form saves | 🟠 ABSENT |
| Dual-unit pickers | ✅ | 🔴 cosmetic-only (B4) | **BROKEN** |
| Category add/remove/reorder | ✅ full catalog | 🟢 quick-log chips customizable (not full catalog) | 🟢 partial |
| Quick-pick fast path | ✅ | ✅ home quick-logs | 🟢 OK |
| Per-log-type reminders (time-windowed) | ✅ "water 9am–7pm every 3h", pill reminders | ❌ (only freeform to-dos + server nudge engine) | 🟠 ABSENT |

**Plan — Section 4:**
1. Real unit system: `useUnitsStore` (metric/imperial) persisted, consumed by all weight/temp/volume forms. Fixes B4. (1–2 days)
2. Cycle-mode additions for TTC completeness: pregnancy test, sex-drive, blood clots, weight, activity, water. (2–3 days)
3. Per-log-type reminders (needs `expo-notifications` from B3): pill, water, BBT-in-morning, with time windows. (bundled with B3)
4. (Optional) Batch "Apply" day sheet. (1–2 days)

---

## SECTION 5 — ANALYTICS, HEALTH REPORT & AI

### 5.1 The doctor-export gap (highest-value single feature)
| Capability | Flo | grandma.app | Verdict |
|---|---|---|---|
| **PDF health report for doctor** | ✅ parameterized 2-page PDF, native share/print | ❌ **no PDF generation anywhere** (`expo-print` not installed) | 🟠 ABSENT |
| Multi-cycle comparison (stacked) | ✅ 5 cycles side-by-side + histogram | ❌ (trend only) | 🟠 ABSENT |
| Symptom pattern detection | ✅ "headache on day 1–5" | 🟢 PMS top-5 + mood histogram + BBT shift | 🟢 partial |
| Chart overlays (symptom on timeline) | ✅ | ❌ each metric independent | 🟠 ABSENT |
| Growth percentile / WHO curves (kids) | (no kids mode) | ❌ logged but not plotted as percentile | 🟠 ABSENT (superset opportunity) |

**The PDF export is Flo's premium anchor and our clearest superset win:** we can generate a doctor-ready report for **all three modes** — cycle report (like Flo), pregnancy summary (weight/BP/symptoms/appointments), and **a pediatric report Flo can't do** (growth percentiles, vaccine record, feeding/sleep patterns) that parents take to the pediatrician. This is a marquee premium feature. `expo-print` + HTML template. (3–5 days per mode; start with one.)

### 5.2 AI health assistant (Guru Grandma vs Flo Health Assistant)
| Capability | Flo (templated triage) | Guru Grandma (generative) | Verdict |
|---|---|---|---|
| Generative intelligence | ❌ canned trees | ✅ Claude | 🟢 AHEAD |
| **Symptom-triggered entry** ("you logged cramps → assess?") | ✅ | ❌ manual open only | 🟠 ABSENT |
| Medical liability framing (pre + post disclaimer, red-flags) | ✅ strong | ❌ implicit only | 🟠 ABSENT (risk) |
| Expert credential attribution | ✅ named MD | ❌ | 🟠 ABSENT |
| Session persistence / resume | ✅ | ✅ (`useChatStore`/history) | 🟢 OK |
| Visual body-diagram symptom picker | ✅ | ❌ | 🟠 ABSENT |
| Satisfaction survey → logging loop | ✅ | ❌ | 🟠 ABSENT |
| Curated topic prompts w/ time estimate | ✅ "3–6 min" | ❌ | 🟠 ABSENT |

Our AI is smarter but less **safe** and less **integrated**. The two must-dos: (1) medical liability framing (pre-chat disclaimer + red-flag escalation + post-chat "not diagnosis") — this is legal hygiene we currently lack; (2) symptom-triggered contextual assist (log "nausea" → Grandma offers help inline). (3–4 days combined.)

### 5.3 Cycle prediction settings
Flo lets users edit cycle length, period length, luteal phase post-onboarding with explanations. We set cycle length **once at onboarding only**; period length (5) and luteal phase (14) are **hardcoded constants**, no settings screen. 🟠 ABSENT. (1–2 days: a Cycle Settings screen + wire the constants to stored values.)

---

## SECTION 6 — SETTINGS IA, NOTIFICATIONS, HEALTH-APP, APPEARANCE

### 6.1 Notifications (see B3 — currently non-functional)
Beyond fixing delivery: Flo organizes reminders in 5 categories with **per-reminder time pickers** and smart defaults. We have 7 flat toggles, no time pickers, no delivery. Rebuild on `expo-notifications` with categories (cycle / medication / lifestyle-logging / community / marketing), per-item time windows, smart defaults (cycle ON, marketing OFF). (part of B3, ~4–5 days total.)

### 6.2 Health-app integration
🟠 **ABSENT.** No HealthKit / Google Fit. Flo uses it for weight/sleep/HR → better predictions. For us: import weight/sleep/steps to reduce manual logging, and (superset) write pregnancy/cycle events back to Health. This is a meaningful accuracy + retention lever. (large: 4–6 days; iOS HealthKit first.)

### 6.3 Lifestyle baselines
🟠 **ABSENT for adults.** Flo captures normal sleep/water/steps/target-weight/height/calories with educational copy. We have child goals (`useGoalsStore`) but no adult baselines. Needed for meaningful hydration/sleep insights + BMI-calibrated cycle predictions. (2 days.)

### 6.4 Appearance / localization
- Light/dark: ✅ (no "system/auto" option — minor gap).
- Language: ✅ 13 langs (but dead duplicate list, B8).
- Units: 🔴 cosmetic (B4).
- Avatar: ✅ photo + 24 sticker presets (Flo has a face-builder; ours is arguably fine).

### 6.5 Settings IA cleanup
We have **two overlapping settings surfaces** (the Profile tab named `settings.tsx`, and `profile/settings.tsx`). Flo has a single clear tree. Consolidate + add: mode-switch pills on settings home (Flo pattern — more discoverable than our `ModeSwitcher`), and the new Data & Privacy / Help / About entries from Section 1.

---

## SECTION 7 — HOME, CALENDAR, PAYWALL, AUTH (from prior cross-check, deduped)

These were covered in `CROSS_CHECK_GAP_ANALYSIS.md`; summarizing the real gaps only:

- **Home prediction hero** 🟠 — cycle collects data but doesn't surface a prominent countdown; pregnancy week card is buried. (See §3.2 reward + a home layout pass.)
- **Calendar day-tap → detail/edit** 🟠 — our calendars are view-only; Flo taps a day to see/edit that day's logs.
- **Phase color coding** 🟢 partial — tokens exist, underused in calendar/charts.
- **Paywall:** 🟠 no in-app trial toggle, no annual-discount framing ("58% off"), no family tier, no winback, no social proof. (Family tier is a natural superset given multi-caregiver.)
- **Auth:** 🟢 Apple/Google/email exist. 🟠 no data-restoration/sync reassurance messaging; consent gate missing (B2/§3).

---

## CONSOLIDATED PRIORITY ROADMAP

Ordered by **trust/risk → superset differentiation → polish**.

### Phase 0 — Fix what's broken (1 sprint, ~1.5 wk) 🔴
Everything in Tier 0. Non-negotiable — we're currently shipping broken privacy/notification/account features.
- B1 delete account · B2 consent persistence · B7 real export (GDPR triad, one migration + edge fns)
- B4 unit system · B5 name capture · B6 delete dead forum code · B8 dedupe language
- B3 notifications = real delivery (`expo-notifications`) + honor prefs

### Phase 1 — Trust & safety spine (~2 wk) 🟠
- Data & Privacy suite complete: DSAR, user-ID copy, transparency screen, app-lock (PIN + biometric)
- In-app legal + Help/FAQ + About/credibility
- Community safety layer: reports, blocks, guidelines, moderation queue (gate the tab on this)
- Onboarding consent gate + AI medical liability framing

### Phase 2 — Superset differentiators (~3–4 wk) 🟢→lead
- **Doctor PDF export** — all 3 modes (start with one). Marquee premium feature; pediatric report is unique to us.
- **Growth percentile / WHO curves** (kids) — unique to us.
- Symptom-triggered Guru Grandma + curated topic prompts
- Onboarding: prediction reward (cycle), goals multi-select, age, social proof
- Cycle completeness: pregnancy test, sex-drive, clots, weight/activity/water in cycle; cycle prediction settings screen

### Phase 3 — Engagement & depth (~3–4 wk)
- Community engagement: polls, bookmarks, comment sorting, topic follow/mute, verified-expert badges
- [Epic] Anonymous Circles (Option B) — decision required
- Health-app (HealthKit) integration
- Per-log-type time-windowed reminders; batch Apply
- Home prediction hero + calendar day-tap edit; paywall (trial toggle, annual framing, family tier, winback)
- Adult lifestyle baselines; multi-cycle comparison + chart overlays

---

## DECISIONS — RESOLVED (Igor, 2026-07-16)

1. **Phase 0 sequencing → YES, fix broken stubs first.** Hard-stop new feature work for one ~1.5wk sprint on Tier 0 (real delete-account, persisted consent, working notifications, unit system, name capture). These are live legal/trust risks. Feature work resumes after.
2. **Community model → OPTION B (add parallel anonymous forum alongside real-name chat).** Keep care-circle group chat AND add an anonymous, topic-organized, moderated forum → strict superset of Flo. Placement: **a third segmented tab ('Circles') inside the existing Connections screen** next to Garage + Channels — no new bottom-tab, no nav restructure. Verified against `app/connections.tsx` (add `'circles'` to the `tab` union + tab-bar array; same pattern as garage/channels). This is its own epic (Phase 3).
3. **Doctor PDF → PEDIATRIC report first.** Growth percentiles + vaccine record + feeding/sleep patterns for the pediatrician. Unique to us (Flo has no kids mode) = max differentiation; 0–5y parents see pediatricians constantly. Placement: **Vault tab** (kids Vault already holds exams/vaccines) — one prominent "Report for doctor" button. Cycle + pregnancy reports follow.
4. **Health-app (HealthKit) → DEFER to Phase 3.** Only pays off once manual-logging fatigue is a voiced complaint. Ship trust/safety + differentiators first.
5. **Community cold-start → CURATED SEED topics per mode/pillar.** Pre-create real, useful starter threads (per pillar: Sleep, Feeding, Fertility, etc.) so the forum looks alive on day one. Anonymous model makes seeded starter-posts feel natural. Content work happens as part of the Circles epic.

### Confirmed UI placements (from walkthrough)
| Feature | Home in the UI |
|---|---|
| Delete account / consent / export | `app/profile/privacy.tsx` + `app/profile/account.tsx` (replace stubs) |
| DSAR / data-collection transparency | new sub-screens off `profile/privacy.tsx` |
| App PIN / biometric | `profile/settings.tsx` toggle + new `app/lock.tsx` (foreground gate) |
| Unit system | `profile/settings.tsx` toggle → new `useUnitsStore` → all log forms |
| In-app legal / Help-FAQ / About | new `app/help/`, `app/about.tsx`, `app/legal/[doc].tsx` linked from settings |
| Community report/block/guidelines | `app/channel/[id].tsx` post "…" menu + new `app/community/guidelines.tsx` |
| Onboarding consent gate | new first step in `app/onboarding/journey.tsx` |
| Cycle prediction reward | cycle onboarding completion screen + `components/home/CycleHome.tsx` hero |
| Anonymous forum (Circles) | new 3rd tab in `app/connections.tsx` |
| Doctor PDF (pediatric first) | Vault tab — "Report for doctor" button |
| Cycle settings (length/luteal) | new `app/profile/cycle-settings.tsx` |

---

**Companion docs:** `ADAPTATION_PLAN.md` (Flo pattern catalog), section docs `01`–`14` (screen-level detail), `CROSS_CHECK_GAP_ANALYSIS.md` (earlier polish-focused pass — superseded by this).

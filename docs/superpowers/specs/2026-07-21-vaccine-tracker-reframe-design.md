# Vaccine Tracker Reframe (Global) — Design Spec

**Date:** 2026-07-21
**Status:** Approved design → ready for implementation plan
**Author:** Igor + Claude (brainstorm session)
**Scope decision:** Full reframe · Global from day one

---

## 0. Context & the problem

The Kids health surface ships a **personalized vaccine schedule**. It takes a child's
birth date + the family's country and, from a hand-maintained catalog, computes a
per-dose status (`done / upcoming / overdue / future`) and surfaces
**"due soon" / "overdue"** nudges — on the schedule sheet *and* on the Kids home screen.

- Engine + catalog: [`lib/vaccineSchedule.ts`](../../../lib/vaccineSchedule.ts) —
  `VACCINE_SCHEDULES` (11 countries), `buildVaccineScheduleTree`, `getNextDueVaccines`,
  `getScheduleForCountry`.
- Render: [`components/home/kids/VaccineScheduleTree.tsx`](../../../components/home/kids/VaccineScheduleTree.tsx)
  (Diffuse + cream variants) inside
  [`VaccineTrackerSheet.tsx`](../../../components/home/kids/VaccineTrackerSheet.tsx).
- Home nudges: [`KidsHome.tsx`](../../../components/home/KidsHome.tsx) via `getNextDueVaccines`.
- `child.countryCode` is set in Kids onboarding, editable in the profile, stored as
  `country_code`, defaults to `'US'`.

**Why this is a problem.** A consumer (non-clinical) app that computes an individualized
verdict for a specific child and pushes an action — "overdue," "due soon" — unmediated by
a clinician, is the exact fact pattern every relevant authority treats as *medical advice /
a recommendation*, not *reference information*:

- **Apple** App Store Review Guideline 1.4.1 (physical harm): heightened scrutiny for apps
  giving health measurements/recommendations without clearance; requires health apps to
  **link to sources** and remind users to consult a doctor.
  <https://developer.apple.com/app-store/review/guidelines/>
- **Google Play** Health Content & Services policy: non-device health apps must carry a
  "not a medical device… does not diagnose, treat, cure, or prevent" disclaimer and defer to
  a professional. <https://support.google.com/googleplay/android-developer/answer/16679511>
- **US FDA:** the 21st Century Cures Act clinical-decision-support exemption **only** covers
  tools aimed at *clinicians*; a per-child due-date engine is caregiver-facing, so it survives
  only under the **general-wellness** enforcement-discretion lane — which is explicitly about
  *not* producing a clinical recommendation.
  <https://www.dlapiper.com/en-us/insights/publications/2026/01/fda-updates-its-clinical-decision-support-and-general-wellness-guidances-key-points>
- **UK MHRA / EU MDCG:** software becomes a medical device once it "analyzes and interprets
  data to… recommend treatment"; a static, sourced schedule shown as reference is **not** a device.
  <https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/1105233/Medical_device_stand-alone_software_including_apps.pdf>
- **Comparable apps** (TinyDose, The Bump, Pfizer's *Baby Checkups Count*, and the **CDC's own
  app**, which is clinician-scoped) all ship the safe pattern: **sourced reference + manual
  tracker + point-of-use "consult your pediatrician."**

### The three sharpest risks in the current code

1. 🔴 **Silent US fallback.** [`getScheduleForCountry`](../../../lib/vaccineSchedule.ts#L187)
   returns `VACCINE_SCHEDULES['US']` for any of the ~180 uncatalogued countries — presenting a
   *foreign* schedule as if personalized for the user's country. Highest-risk line in the app.
2. 🔴 **"OVERDUE" / "DUE SOON" on a specific child** — the mechanic (and the copy) that turns
   reference info into an individualized clinical verdict + nudge.
3. 🟠 **No on-view source citation or disclaimer.** `MEDICAL_DISCLAIMER` /
   `VACCINE_SCHEDULE_NOTE` exist in [`lib/medicalSources.ts`](../../../lib/medicalSources.ts)
   but render **only** in the per-vaccine info modal — not on the schedule surface where the
   status labels live.

---

## 1. Guiding principle

> **The app *records* what happened and *shows a sourced reference*. It never renders a
> clinical verdict about a specific child.** Every computed date is framed as "typical timing"
> or "not yet in your log," never "your child is overdue."

This keeps essentially all of the current UX (ring, schedule tree, blob icons, per-child view,
logging, per-vaccine explanations). The change is in **labeling, framing, sourcing, and the
uncatalogued-country path** — not in ripping features out.

---

## 2. Goals

1. **No silent wrong-country schedules.** Uncatalogued countries get an explicit WHO-reference
   state, never a disguised US schedule.
2. **Records language, not clinical verdicts.** No "overdue"/"due soon" claims about a child.
3. **Sourced + dated on the view itself.** Every schedule view cites its official source and a
   "reviewed" date.
4. **Point-of-use disclaimer** on the schedule surface, both design variants.
5. **Lean into per-vaccine explanations** — the lowest-risk, highest-value content.
6. **Global-safe by construction** — design to the strictest common denominator (EU MDR/MHRA +
   GDPR + Apple/Google global), WHO baseline as the default reference.

---

## 3. Design

### 3.1 Provenance-aware schedule lookup (kills the silent fallback)

`getScheduleForCountry` stops returning a bare array. New shape:

```ts
type ScheduleProvenance = 'national' | 'who-reference'

interface ResolvedSchedule {
  entries: VaccineEntry[]
  provenance: ScheduleProvenance
  countryCode: string          // requested country (for the banner/citation)
  source: VaccineScheduleSource // authority, title, url, reviewed
}
```

- Country in `VACCINE_SCHEDULES` → `provenance: 'national'`.
- Country **not** in the catalog → the new **`WHO` EPI baseline** entry, `provenance: 'who-reference'`.
- Callers (`buildVaccineScheduleTree`, `getNextDueVaccines`, both render sites) thread
  `provenance`/`source` through. Signature change touches ~4 call sites — all internal.

**WHO baseline (decision: yes).** Encode the WHO Expanded Programme on Immunization essential
schedule as a `WHO` catalog entry, used as the honest global default. Sourced from the WHO
Immunization Data portal. It is one more schedule to source + date, accepted as the cost of a
defensible global launch.

### 3.2 Reframe status — keep the math, change the claim

The 4-state engine (`done/upcoming/overdue/future`) **stays** for ordering/logic — the date math
is useful. But **nothing prints the raw state**, and the alarming framing is removed. All
user-facing strings route through neutral i18n keys:

| Internal state | Old copy | New framing |
|---|---|---|
| `done` | "given [date]" | unchanged |
| `upcoming` | "DUE SOON" | "Typically around now — you can ask at your next visit" |
| `overdue` | "OVERDUE" (red) | "Not yet logged — typically given by [age]" (neutral/amber, **not** red) |
| `future` | "[age]" | "Typically around [age]" |

To prevent regressions, add a code comment at the enum that the state names are **internal
ordering only** and must never be printed; all copy comes from the label mapper.

### 3.3 Soften the visual language (adjusts the just-shipped blob work)

The blob-icon restyle just landed in the Diffuse variant mapped **overdue → `warning` blob in
red**. Under the reframe, "not yet logged / past typical window" must **not** read as a red
clinical alarm:

- `overdue` state → calm neutral treatment (e.g. the `vaccine`/`clock` blob in a muted
  ink/amber tone), **not** the red `warning` blob.
- Reserve alarm styling for nothing in this surface — there is no "you are behind" signal.
- Apply the same softening to the cream variant's status colors
  (`OVERDUE_BG`/peach + `#8A3A00` meta color today).

### 3.4 Suppress per-child nudges in reference mode (decision: yes)

`getNextDueVaccines` (home nudges via [`KidsHome.tsx`](../../../components/home/KidsHome.tsx#L3434)):

- `provenance: 'national'` → nudges still fire, but with the softened §3.2 copy.
- `provenance: 'who-reference'` → **no personalized nudge**. The home shows no "due soon"
  pill; the reference timeline lives only in the sheet. (Chosen over a gentle non-personalized
  hint, per approval, to stay clearly on the reference side for uncatalogued countries.)

### 3.5 Source attribution + freshness, on the view

New map alongside the catalog:

```ts
interface VaccineScheduleSource { authority: string; title: string; url: string; reviewed: string }
const VACCINE_SCHEDULE_SOURCES: Record<string /* countryCode | 'WHO' */, VaccineScheduleSource>
```

The schedule view renders a citation line, e.g.:
*"Reference: CDC 2025 childhood immunization schedule · reviewed Jul 2026."*
This satisfies Apple's on-view sourcing rule and makes staleness visible (a `reviewed` date is
a governance forcing-function against silent drift).

### 3.6 Persistent point-of-use disclaimer

A vaccine-specific banner rendered **on the schedule surface** (both Diffuse + cream), not only
in the per-vaccine modal. New constant in [`lib/medicalSources.ts`](../../../lib/medicalSources.ts),
e.g. `VACCINE_DISCLAIMER = "This is general information, not medical advice. Always confirm
timing with your child's pediatrician."` Reference-mode adds the "we don't have [Country]'s
official schedule yet — showing the WHO reference" line.

### 3.7 Expand per-vaccine explanations

Audit [`lib/vaccineInfo.ts`](../../../lib/vaccineInfo.ts) so every vaccine name across **all**
catalogs — including the WHO baseline and non-English catalog names (e.g. `Pentavalente`,
`VASPR`, `ROR`, `Tríplice Viral`) — resolves to a "what it protects against / why / side
effects" entry. This is the lowest-risk, highest-value content and the part every regulator
treats as squarely non-device.

---

## 4. Data model & files touched

| File | Change |
|---|---|
| `lib/vaccineSchedule.ts` | `WHO` catalog entry; `VaccineScheduleSource` + `VACCINE_SCHEDULE_SOURCES`; `getScheduleForCountry` → `ResolvedSchedule`; thread `provenance` through `buildVaccineScheduleTree` + `getNextDueVaccines`. Status→copy stays in the render layer via i18n keys (the lib exposes only the internal state), so labels never leak into logic |
| `lib/medicalSources.ts` | `VACCINE_DISCLAIMER` (+ reference-mode note) |
| `lib/vaccineInfo.ts` | coverage for all catalog + WHO vaccine names |
| `components/home/kids/VaccineScheduleTree.tsx` | neutral status copy; softened blob/color for `overdue`; citation line; disclaimer banner; reference-mode banner — both variants |
| `components/home/kids/VaccineTrackerSheet.tsx` | pass through provenance/source; header banner in reference mode |
| `components/home/KidsHome.tsx` | gate nudges on `provenance === 'national'`; softened nudge copy |
| `lib/i18n/en.ts` (+ 12 languages, waved) | new/changed keys for all copy above |
| `components/vault/VaccineRecord.tsx` | audit for the same "overdue/verdict" language if present |

No DB schema change — vaccine records stay in `child_logs` (`type='vaccine'`).

---

## 5. Out of scope / separate tracks

- **Privacy & consent (GDPR Art. 9 special-category + Art. 8 children's data; FTC Health
  Breach Notification Rule; explicit, unbundled consent separate from ToS).** Real and
  important, but app-wide onboarding/ToS/legal work — **its own spec.** Noted here as a
  dependency for launch, not built in this spec.
- **Becoming a registered medical device** — explicitly *not* the goal; the whole point is to
  stay in the informational/general-wellness lane.
- **Expanding the hand-maintained catalog to all ~180 countries** — the WHO baseline covers the
  gap honestly; per-country national catalogs are added incrementally over time.

---

## 6. Acceptance criteria

1. An uncatalogued country (e.g. `JP`, `NG`, `IT`) shows the **WHO reference** with an explicit
   banner — never a US schedule presented as the user's own.
2. The strings "overdue" and "due soon" appear **nowhere** in the user-facing vaccine UI
   (any language); "past typical window" reads as neutral, not a red alarm.
3. Every schedule view shows a source citation with a `reviewed` date and a point-of-use
   disclaimer.
4. Home vaccine nudges do not fire for `who-reference` provenance.
5. Every vaccine across all catalogs + WHO resolves to a per-vaccine explanation.
6. `npm run typecheck` clean.

---

## 7. Compliance basis (sources)

- Apple App Store Review Guidelines — <https://developer.apple.com/app-store/review/guidelines/>
- Google Play Health Content & Services — <https://support.google.com/googleplay/android-developer/answer/16679511>
- FDA 2026 CDS & General Wellness update (DLA Piper) — <https://www.dlapiper.com/en-us/insights/publications/2026/01/fda-updates-its-clinical-decision-support-and-general-wellness-guidances-key-points>
- UK MHRA stand-alone software/apps guidance — <https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/1105233/Medical_device_stand-alone_software_including_apps.pdf>
- EU MDCG software qualification (summary) — <https://www.pureglobal.com/news/mdcg-guidance-documents-clarify-rules-on-medical-device-software-in-the-eu>
- ECDC vaccination-schedule variation (EU/EEA) — <https://vaccination-info.europa.eu/en/about-vaccines/when-vaccinate/vaccination-schedules-eueea>
- WHO Immunization Data portal — <https://immunizationdata.who.int/global/wiise-detail-page/vaccination-schedule-for-country_name>
- FTC Health Breach Notification Rule (2024) — <https://www.ftc.gov/business-guidance/blog/2024/04/updated-ftc-health-breach-notification-rule-puts-new-provisions-place-protect-users-health-apps>
- GDPR Art. 9 special categories — <https://secureprivacy.ai/blog/gdpr-article-9-special-categories-lawful-processing-and-compliance-guide-2026>
- Comparable apps: TinyDose, The Bump, Baby Checkups Count (Pfizer), CDC clinician app —
  <https://www.babycheckupscount.com/tracker> · <https://www.cdc.gov/vaccines/hcp/imz-schedules/app.html>

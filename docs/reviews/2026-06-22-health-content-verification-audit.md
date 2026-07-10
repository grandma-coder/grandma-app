# grandma.app — Health Content Verification Audit

**Date:** 2026-06-22
**Audit type:** Read-only clinical-content verification across the app's static content libraries
**Scope:** This audit cross-checks the user-facing clinical claims in grandma.app's static content libraries (vaccines, fertility/cycle math, fetal growth, prenatal schedule, pregnancy nutrition/dosages, week-by-week development, child growth percentiles, growth leaps, birth guide, and kids nutrition) against published public-health guidance from WHO, CDC/ACIP, ACOG, AAP, NICE, ASRM, and the peer-reviewed literature (Wilcox/Dunson, Cochrane, INTERGROWTH-21st/Hadlock). Ten clinical-domain verifiers read the real source files and recorded per-claim findings. This document synthesizes those findings; it does not introduce any claims, sources, or verdicts beyond what the verifiers returned.

---

## ⚠️ Honesty disclaimer (read first)

This audit verifies in-app claims **against published public-health guidance and the peer-reviewed literature, and flags discrepancies**. It is a content-governance and traceability review — **not** a clinical sign-off.

- It does **not** make grandma.app "1000% correct." A claim of that confidence level requires review and sign-off by a **licensed clinician** (OB-GYN, pediatrician, registered dietitian, where relevant).
- Verifiers note where they relied on well-established consensus rather than a fresh primary-source fetch (flagged as `unsourced-but-plausible`). Those are not independently re-derived facts.
- Public-health guidance changes (e.g., the December 2025 ACIP HepB shift). Any verification is a snapshot as of **2026-06-22** and country schedules vary.
- Nothing here should be read as medical advice to an end user. The recommended fix throughout is to add citations **and** a "this is general information; follow your clinician and your country's official schedule" disclaimer.

---

## Executive summary

### Finding counts

Across all **10 clinical domains**, **~110 individual claims** were examined. Combined severity tally (8 main-run domains + 2 gap-fill domains): **high: 7, medium: ~12, low: ~30, info: ~60**. The two gap-fill domains (birth guide, kids nutrition) were both LOW risk and added no `wrong` findings.

| Verdict | Count (approx.) | Meaning |
|---|---|---|
| **correct** | ~48 | Matches authoritative guidance |
| **discrepancy** | ~12 | Real divergence from guidance/another file; not necessarily dangerous |
| **wrong** | **2** | Factually incorrect / contradicts authoritative guidance |
| **unsourced-but-plausible** | ~14 | Consistent with consensus but no in-app citation / no single authoritative number |
| **disputed-framework** | ~6 | Built on a non-peer-validated framework (Wonder Weeks) |

> Counts are approximate because some findings carry mixed sub-verdicts across multiple file locations; the verdict-level body tables below are authoritative. The only two `wrong` findings are both in the **Pregnancy** behavior (glucose-fast instruction; conception-probability magnitude).

### Top issues to fix first (critical + high severity, most user-facing first)

1. **WRONG — Glucose test "fast 8 hours beforehand"** (`lib/pregnancyInsights.ts:58`). The routine 1-hour 50g glucose challenge at 24–28 weeks requires **no fasting**; only the follow-up 3-hour test does. This also **contradicts the app's own correct statement** at `lib/weekDetailData.ts:94`. A user could follow wrong prep instructions. *Severity: high.*
2. **WRONG — Per-day conception probability peaks at 70%** (`lib/cycleLogic.ts:400–415`). The published day-specific peak is ~27–33% (Wilcox/Dunson); 70% roughly doubles it. Curve *shape* is right; magnitudes overstate odds for a TTC audience. *Severity: high.*
3. **DISCREPANCY — Fetal length is crown-rump-magnitude through wk20 then jumps ~10cm** (`lib/weekStats.ts:25–32`; mirrored in `lib/pregnancyData.ts:25–31`). Weeks 14–20 read ~40–55% too short vs a real anatomy-scan total length, and the two files disagree by ~10cm at week 20. *Severity: high.*
4. **DISCREPANCY — Hepatitis B "first dose at birth" stated unconditionally** (`lib/vaccineInfo.ts:22, 172, 177, 187`). No longer matches the Dec 2025 ACIP individual-based-decision shift for infants of HepB-negative mothers (AAP opposes the change; actively contested). *Severity: high; CRITICAL surface.*
5. **DISPUTED FRAMEWORK — Growth leaps = Wonder Weeks, presented as fact** (`lib/growthLeaps.ts`, whole file). Non-peer-validated, failed replication; stated with zero disclaimer or citation, including some milestone timings ahead of CDC norms. *Severity: high.*

---

## The two trust layers

Every clinical claim must pass **two** independent tests. A claim can pass one and fail the other.

- **Layer A — Is the number correct?** Does the value/threshold/timing match authoritative guidance?
- **Layer B — Can a user trace it to a source?** Is there an in-app citation (URL/reference) and an appropriate disclaimer so a user or reviewer can verify it?

| File(s) | Layer A (correct?) | Layer B (traceable?) |
|---|---|---|
| `lib/vaccineInfo.ts` | Mostly PASS (HepB framing fails) | **FAIL** — zero citations, no disclaimer |
| `lib/cycleLogic.ts`, `lib/cycleAnalytics.ts` | Mostly PASS (70% probability fails) | **FAIL** — zero citations |
| `lib/weekStats.ts`, `lib/pregnancyData.ts` | **FAIL on length** (CRL/crown-heel splice) | **FAIL** — points to an internal HTML file only |
| `lib/pregnancyAppointments.ts` | PASS (all milestone weeks correct) | **FAIL** — "ACOG" only in a code comment |
| `lib/prepGuide.ts`, `lib/pregnancyInsights.ts`, `lib/weekDetailData.ts` | Mostly PASS (glucose-fast fails; perineal overstated) | **FAIL** — zero citations |
| `lib/growthStandards.ts` | PASS (minor CDC mid-childhood low) | **PASS** — header source comment + UI disclaimer |
| `lib/growthLeaps.ts` | N/A — disputed framework | **FAIL** — no citation, no "opinion" framing |
| `lib/birthGuide/*` modules | PASS (1 medium epidural-stat overstatement) | **PASS** — disclaimer + `sources[]` per file |
| `lib/birthData.ts` (legacy simple data) | mostly PASS (water-temp upper bound) | **FAIL** — uncited |
| `lib/foodCalories.ts` | PASS (USDA-accurate; protein/veg defaults slightly high) | **FAIL** — accurate but uncited |

**Layer B is passed by `growthStandards.ts` and the `lib/birthGuide/` module files; every other clinical file fails it.**

---

## Pre-Pregnancy

### Domain: Fertility & cycle math
**Files:** `lib/cycleLogic.ts`, `lib/cycleAnalytics.ts`
**Citation status:** none
**Overall verdict:** Core clinical windows (sperm 5d, egg 12–24h, ~14d luteal, ~6-day fertile window, implantation 6–12d post-ovulation, no-safe-alcohol) match ACOG/CDC/Wilcox. The genuinely concerning item is the per-day conception-probability curve (peak 70%), which has no traceable source and ~doubles the highest published day-specific probability (~33%); the curve's *shape* is right but its magnitudes overstate odds. The fixed-14-day luteal assumption and the in-code phrase "relatively constant" overstate certainty. Nothing in either file is user-traceable.

| Claim | file:line | Our value | Source value | Source + URL | Verdict | Severity |
|---|---|---|---|---|---|---|
| Sperm survives 5d, egg 12–24h | cycleLogic.ts:11 | sperm 5d; egg 12–24h | sperm up to 5d; egg 12–24h | ACOG Fertility Awareness FAQ — https://www.acog.org/womens-health/faqs/fertility-awareness-based-methods-of-family-planning | correct | info |
| Fertile window = ovulation-5 … ovulation+1 (7-day) | cycleLogic.ts:10, 123–125 | 7-day window (incl. ovulation+1) | ACOG/Wilcox: 6-day window (5d before + ovulation day) | NEJM 1995 (Wilcox) — https://www.nejm.org/doi/full/10.1056/NEJM199512073332301 | discrepancy | low |
| Luteal phase "relatively constant" ~14d; ovulation = length-14 | cycleLogic.ts:14–15, 80, 121 | fixed 14d luteal | Luteal phase ranges ~11–17d, varies within-woman; fertile window highly unpredictable | Wilcox BMJ 2000 / Hum Reprod 2024 — https://pmc.ncbi.nlm.nih.gov/articles/PMC27529/ | disputed-framework | medium |
| Cycle 21–35 normal, 28 avg | cycleLogic.ts:13 | 21–35; 28 avg | ACOG (2015): 24–38d typical; 21–35 still widely cited | ACOG Menstruation as a Vital Sign — https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2015/12/menstruation-in-girls-and-adolescents-using-the-menstrual-cycle-as-a-vital-sign | unsourced-but-plausible | low |
| Per-day conception probability: peak 70%, then 48/22/12/8/3–6 | cycleLogic.ts:390–415 | peak 70% | Published day-specific peak ~27–33% (no source reports 70%) | Wilcox NEJM 1995 / Dunson Hum Reprod 2002 — https://www.nejm.org/doi/full/10.1056/NEJM199512073332301 | **wrong** | **high** |
| Categorical peak/high mapping (day before + day of ovulation) | cycleLogic.ts:146–155 | peak = ovulation/-1; high = -3..+1 | Highest 1–2d before through ovulation day; sharp drop after | Wilcox/Dunson — https://pmc.ncbi.nlm.nih.gov/articles/PMC27529/ | correct | info |
| Implantation spotting ~day 6–12 post-ovulation | cycleLogic.ts:280 | 6–12d post-ovulation | Implantation ~6–12d post-ovulation; ~1 in 4 may spot | Cleveland Clinic — https://my.clevelandclinic.org/health/symptoms/24536-implantation-bleeding | correct | info |
| Avoid alcohol when TTC (two-week wait) | cycleLogic.ts:272 | avoid alcohol | No known safe amount when pregnant/TTC | CDC — https://www.cdc.gov/alcohol-pregnancy/about/index.html | correct | info |
| Ovulation "Days 14–16 avg"; 3-day display band | cycleLogic.ts:7, 127–137 | band ovulation±1 | ~day 14 for 28-day cycle; egg viable 12–24h | ACOG; NICE CG156 — https://www.nice.org.uk/guidance/cg156 | unsourced-but-plausible | low |
| Fertile-window history reuses fixed 14d luteal | cycleAnalytics.ts:228–246 | ovulation = length-14 | Luteal varies 11–17d; can misplace historical window | Wilcox BMJ 2000 — https://pmc.ncbi.nlm.nih.gov/articles/PMC27529/ | disputed-framework | low |
| Regularity = within ±2d of personal avg | cycleAnalytics.ts:137–138 | ±2d = regular | No single numeric cutoff; ACOG tolerates ~7–9d variation | ACOG Vital Sign — https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2015/12/menstruation-in-girls-and-adolescents-using-the-menstrual-cycle-as-a-vital-sign | unsourced-but-plausible | low |
| Hydration "crucial for conception" / 8 glasses (2L) | cycleLogic.ts:364–378 | 2L; conception link | 2.7L total/day (food incl.) exists; no fertility source supports conception link | US Natl Academies (volume only) — https://www.nationalacademies.org/news/2004/02/report-sets-dietary-intake-levels-for-water-salt-and-potassium-to-maintain-health-and-reduce-chronic-disease-risk | unsourced-but-plausible | low |

---

## Pregnancy

### Domain: Fetal growth (length & weight per week)
**Files:** `lib/weekStats.ts`, `lib/pregnancyData.ts`
**Citation status:** none
**Overall verdict:** Weights are within published ranges and broadly defensible, but the **length data has a real crown-rump vs crown-heel error**: `weekStats.ts` shows CRL-magnitude lengths (~half true total length) through week 20, then abruptly jumps to crown-heel at week 21, and the two files disagree with each other by ~10cm in the second trimester. A user comparing weeks 14–20 to a real anatomy-scan total length would see values ~40–55% too low. No source is cited.

| Claim | file:line | Our value | Source value | Source + URL | Verdict | Severity |
|---|---|---|---|---|---|---|
| Length wk14–20 (wk16 11.6 / wk18 14.2 / wk20 16.4 cm) | weekStats.ts:25–31 | wk20 = 16.4cm | Crown-heel wk16 ≈18.6, wk18 ≈22.2, wk20 ≈25.7cm | Perinatology.com (Hadlock-derived) — https://perinatology.com/Reference/Fetal%20development.htm | discrepancy | high |
| wk20 16.4cm → wk21 26.7cm (10.3cm/week jump) | weekStats.ts:31–32 | 16.4 → 26.7cm | Smooth ~1.7cm/wk (wk20 ≈25.7, wk21 ≈27.4); no 10cm jump exists | Perinatology.com — https://perinatology.com/Reference/Fetal%20development.htm | discrepancy | high |
| Files disagree at wk20 (weekStats 16.4 vs pregnancyData 25cm) | weekStats.ts:30–31 vs pregnancyData.ts:30–31 | 16.4cm vs 25cm | Crown-heel wk19 ≈24.0, wk20 ≈25.7cm | Perinatology.com — https://perinatology.com/Reference/Fetal%20development.htm | discrepancy | high |
| pregnancyData wk14–19 CRL-magnitude then wk20 → 25cm | pregnancyData.ts:25–31 | wk19 15.3 → wk20 25cm | Crown-heel wk16 ≈18.6, wk19 ≈24.0, wk20 ≈25.7cm | Perinatology.com — https://perinatology.com/Reference/Fetal%20development.htm | discrepancy | medium |
| Viability at wk24 "could survive with intensive care"; 600g | pregnancyData.ts:35 | viability wk24 | Periviability ~22–25wk; 24wk widely used; ~600–670g | ACOG Periviable Birth — https://www.acog.org/clinical/clinical-guidance/obstetric-care-consensus/articles/2017/10/periviable-birth | unsourced-but-plausible | low |
| wk23 weight 500/501g | pregnancyData.ts:34 / weekStats.ts:34 | 500–501g | Crown-heel chart wk23 ≈568g (range ~450–600g) | Perinatology.com / WHO — https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.1002220 | unsourced-but-plausible | low |
| Term weights wk37–40 (wk39 ≈3.3kg, wk40 ≈3.5kg) | weekStats.ts:48–51 / pregnancyData.ts:48–51 | 3.3 / 3.5kg | WHO 50th wk39 ≈3403g; avg term ≈3.3–3.5kg | WHO Fetal Growth (PLOS Med 2017) — https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.1002220 | correct | info |
| Early CRL wk5–8 (wk6 0.6 / wk7 1.0 / wk8 1.6cm) | weekStats.ts:16–19 / pregnancyData.ts:16–19 | 0.6 / 1.0 / 1.6cm | CRL wk6 ≈0.4–0.5, wk7 ≈0.8–1.2, wk8 ≈1.6cm | Perinatology.com — https://perinatology.com/Reference/Fetal%20development.htm | correct | info |
| No source cited (header points to internal HTML) | weekStats.ts:1–4 | no published source | Clinical numbers should cite WHO/Hadlock/INTERGROWTH | (process gap) — https://perinatology.com/Reference/Fetal%20development.htm | unsourced-but-plausible | medium |

### Domain: Prenatal appointment / screening schedule
**File:** `lib/pregnancyAppointments.ts`
**Citation status:** none
**Overall verdict:** Every milestone week aligns with ACOG guidance — NIPT ≥10wk, NT 11–14, quad 15–22, anatomy 18–22, glucose 24–28, Tdap 27–36, RhoGAM 28, GBS 36 0/7–37 6/7 are all respected. Clinically sound. The only weakness is traceability: the "Aligned with ACOG" claim lives solely in a code comment (line 3) and no milestone cites a source to the user.

| Claim | file:line | Our value | Source value | Source + URL | Verdict | Severity |
|---|---|---|---|---|---|---|
| "Aligned with ACOG" — 10 milestones | pregnancyAppointments.ts:2–6 | code-comment only | Windows match ACOG; no user-facing citation | ACOG Prenatal Genetic Screening — https://www.acog.org/womens-health/faqs/prenatal-genetic-screening-tests | unsourced-but-plausible | medium |
| NIPT (cfDNA) at wk10 | pregnancyAppointments.ts:39–48 | wk10 | cfDNA from 10 weeks | ACOG — https://www.acog.org/womens-health/faqs/prenatal-genetic-screening-tests | correct | info |
| NT scan at wk12 | pregnancyAppointments.ts:57–64 | wk12 | NT 11 0/7–13 6/7 | ACOG — https://www.acog.org/womens-health/faqs/prenatal-genetic-screening-tests | correct | info |
| Quad screen at wk16 | pregnancyAppointments.ts:73–81 | wk16 | Quad 15–22 weeks | ACOG — https://www.acog.org/womens-health/faqs/prenatal-genetic-screening-tests | correct | info |
| Anatomy scan at wk20 | pregnancyAppointments.ts:90–97 | wk20 | 18–22 weeks | ACOG/AIUM — https://www.acog.org/womens-health/faqs/prenatal-genetic-screening-tests | correct | info |
| Glucose test at wk24 (1-hr; 3-hr if positive) | pregnancyAppointments.ts:106–113 | wk24 | GDM screen 24–28 weeks | ACOG — https://www.acog.org/womens-health/faqs/prenatal-genetic-screening-tests | correct | info |
| Tdap at wk28 every pregnancy | pregnancyAppointments.ts:122–131 | wk28 | 27–36 weeks every pregnancy | ACOG/CDC ACIP — https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2017/09/update-on-immunization-and-pregnancy-tetanus-diphtheria-and-pertussis-vaccination | correct | info |
| RhoGAM (anti-D) at wk28 if Rh-negative | pregnancyAppointments.ts:122–131 | wk28 | Anti-D at 28 weeks for unsensitized Rh D-neg | ACOG Practice Bulletin 181 — https://journals.lww.com/greenjournal/fulltext/2017/08000/practice_bulletin_no__181__prevention_of_rh_d.54.aspx | correct | info |
| GBS test at wk36 (IV antibiotics if positive) | pregnancyAppointments.ts:156–163 | wk36 | 36 0/7–37 6/7; intrapartum prophylaxis | ACOG Committee Opinion 797 — https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2020/02/prevention-of-group-b-streptococcal-early-onset-disease-in-newborns | correct | info |
| First visit at wk8 (dating, labs, pap) | pregnancyAppointments.ts:20–30 | wk8 | No fixed week (commonly 8–10); lab panel standard | ACOG Routine Tests — https://www.acog.org/womens-health/faqs/routine-tests-during-pregnancy | unsourced-but-plausible | info |
| Pre-birth check at wk38 | pregnancyAppointments.ts:172–179 | wk38 | Weekly visits after ~36wk; not a discrete ACOG test | ACOG Routine Prenatal Care — https://www.acog.org/womens-health/faqs/routine-tests-during-pregnancy | unsourced-but-plausible | info |

### Domain: Pregnancy nutrition & dosages
**Files:** `lib/prepGuide.ts`, `lib/pregnancyInsights.ts`, `lib/weekDetailData.ts`
**Citation status:** none
**Overall verdict:** Dosages and safety thresholds are accurate — folic acid (400–800 mcg general / 600 mcg in pregnancy), iron (27 mg), DHA (200 mg), iodine (150 mcg), caffeine (<200 mg/day), no-safe-alcohol, Tdap (27–36 wk), kick counts (10 in 2 hr from wk 28), and 5-1-1 all match WHO/CDC/ACOG/NICE. No wrong or dangerous dosage discrepancies. The gaps are sourcing (zero user-facing citations) and one content omission: the high-risk folic acid dose (4,000 mcg/day for a prior NTD-affected pregnancy) is absent across all three files.

| Claim | file:line | Our value | Source value | Source + URL | Verdict | Severity |
|---|---|---|---|---|---|---|
| ≥400–600 mcg folate, 27mg iron, 150mcg iodine, 200mg DHA | prepGuide.ts:39 | matches | ≥600mcg folate total, 27mg iron, 150mcg iodine, ≥200mg DHA | ACOG Nutrition — https://www.acog.org/womens-health/faqs/nutrition-during-pregnancy | correct | info |
| Folic acid 400–800 mcg/day | pregnancyInsights.ts:25 | 400–800 mcg | 400–800 mcg general; 4000mcg high-risk (absent) | CDC Folic Acid — https://www.cdc.gov/folic-acid/about/index.html | correct | low |
| ≥400 mcg (600 in pregnancy), 27mg iron, 200mg DHA, calcium | weekDetailData.ts:31 | matches | ≥600mcg folate, 27mg iron, ≥200mg DHA, 1000mg calcium | ACOG Nutrition — https://www.acog.org/womens-health/faqs/nutrition-during-pregnancy | correct | info |
| Iron ~27mg daily | weekDetailData.ts:66 | 27mg | 27mg/day RDA in pregnancy | NIH ODS Iron — https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/ | correct | info |
| Caffeine <200mg/day (~95mg per coffee) | prepGuide.ts:64–66 | <200mg | <200mg/day (~one 12-oz cup) | ACOG Caffeine — https://www.acog.org/womens-health/experts-and-stories/ask-acog/how-much-coffee-can-i-drink-while-pregnant | correct | info |
| No safe amount of alcohol | prepGuide.ts:445 | abstinence | No known safe amount | CDC FASD — https://www.cdc.gov/fasd/about/index.html | correct | info |
| Kick counts: 10 movements in 2hr from wk28 | prepGuide.ts:531–538 | 10 in 2hr, wk28 | 10 movements within 2hr, 3rd trimester | ACOG Fetal Well-Being — https://www.acog.org/womens-health/faqs/special-tests-for-monitoring-fetal-well-being | correct | info |
| Kick counts (insights duplicate) | pregnancyInsights.ts:57 | 10 in 2hr, wk28 | same | ACOG — https://www.acog.org/womens-health/faqs/special-tests-for-monitoring-fetal-well-being | correct | info |
| Kick counts left-side, <2hr | weekDetailData.ts:73 | wk28, <2hr | same | ACOG — https://www.acog.org/womens-health/faqs/special-tests-for-monitoring-fetal-well-being | correct | info |
| 5-1-1 rule | pregnancyInsights.ts:72 | 5min/1min/1hr | Widely-used heuristic; not a single ACOG number | Healthline — https://www.healthline.com/health/pregnancy/when-to-go-to-the-hospital-for-labor | unsourced-but-plausible | low |
| Tdap weeks 27–36 | prepGuide.ts:103 | 27–36 | 27–36 weeks each pregnancy | CDC Vaccinating Pregnant Patients — https://www.cdc.gov/pertussis/hcp/vaccine-recommendations/vaccinating-pregnant-patients.html | correct | info |
| Avoid live vaccines (MMR, varicella) | prepGuide.ts:105 | avoid | Live vaccines contraindicated in pregnancy | CDC — https://www.cdc.gov/vaccines-pregnancy/hcp/vaccination-guidelines/index.html | correct | info |
| Bath water <100°F/38°C, ≤15min, no hot tubs | prepGuide.ts:284–285 | <100°F, 15min | <100°F correct; hot-tub limit often ~10min | Cleveland Clinic — https://health.clevelandclinic.org/hot-tub-while-pregnant | unsourced-but-plausible | low |
| ~25% GBS colonization; screen wk36–37 | weekDetailData.ts:101 / prepGuide.ts:520 | 25%, wk36–37 | ~25%; universal 36 0/7–37 6/7 | CDC Group B Strep — https://www.cdc.gov/group-b-strep/about/index.html | correct | info |
| 15–23% fail 1-hr; 3–8% GDM | weekDetailData.ts:94 | 15–23% / 3–8% | ~15–20% fail; GDM ~6–9%+ by criteria | ADA/ACOG — https://www.acog.org/womens-health/faqs/gestational-diabetes | unsourced-but-plausible | low |
| Fetal HR 150–170 bpm at wk8 | weekDetailData.ts:171 | 150–170 | ~140–175bpm at 8wk | NCBI — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3678114/ | correct | info |
| Call provider immediately when waters break | pregnancyInsights.ts:56 | call immediately | Contact provider on membrane rupture | ACOG Labor — https://www.acog.org/womens-health/faqs/how-to-tell-when-labor-begins | correct | info |
| Perineal massage from wk34 reduces severe tears + episiotomy | weekDetailData.ts:136 | 3rd/4th-degree + episiotomy | Cochrane: reduces episiotomy + trauma needing suturing; NOT 3rd/4th-degree | Cochrane CD005123 — https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD005123.pub3/full | correct/discrepancy* | low–medium |
| BBT rise 0.4–0.8°F confirms ovulation | prepGuide.ts:585 | 0.4–0.8°F | ~0.4–1.0°F sustained rise | ACOG FAM — https://www.acog.org/womens-health/faqs/fertility-awareness-based-methods-of-family-planning | unsourced-but-plausible | info |
| Kegels 3–5s hold, 10 reps, 3×/day | prepGuide.ts:293, 570–572 | 3–5s/10/3× | No single authoritative dose; reasonable beginner protocol | NICE NG210 — https://www.nice.org.uk/guidance/ng210 | unsourced-but-plausible | info |

\*Perineal massage is scored `correct` (severity info) by the nutrition-dosages verifier and `discrepancy` (severity medium) by the week-development verifier — see the next domain for the discrepancy detail.

### Domain: Pregnancy week-by-week development
**Files:** `lib/pregnancyInsights.ts`, `lib/weekDetailData.ts`, `lib/pregnancyData.ts`
**Citation status:** none
**Overall verdict:** Mostly accurate and aligned with ACOG/CDC/Cochrane, but contains one factually **WRONG** instruction (fast 8h before the routine 1-hour glucose screen) that also contradicts the app's own correct statement, plus a **medium** overstatement of perineal-massage evidence and two minor internal inconsistencies (eyes-open week, heartbeat framing). No claim cites a traceable source.

| Claim | file:line | Our value | Source value | Source + URL | Verdict | Severity |
|---|---|---|---|---|---|---|
| Glucose test wk24–28 — "fast 8 hours beforehand" | pregnancyInsights.ts:58 | fast 8h | 1-hr 50g GCT requires NO fasting; only 3-hr test fasts | Labcorp/ACOG GDM screen — https://www.labcorp.com/tests/102277/gestational-diabetes-screen-acog-recommendations | **wrong** | **high** |
| Eyes open "first time" at wk28 | weekDetailData.ts:206 | wk28 | Eyes open ~wk26–27 (and pregnancyData.ts:26 says wk26) | Mayo Clinic — https://www.mayoclinic.org/healthy-lifestyle/pregnancy-week-by-week/in-depth/fetal-development/art-20045997 | discrepancy | low |
| Heart beats 150–170 bpm at wk8 | weekDetailData.ts:171 | 150–170 | ~145–170bpm at 8wk | OB references — https://kmobgyn.com/everything-you-need-to-know-about-your-babys-heart-rate-during-pregnancy/ | correct | info |
| "Heart begins to beat" at wk5 | pregnancyData.ts:16 | wk5 | Cardiac activity ~5–6wk; "embryonic cardiac activity" per ACOG | MedicalNewsToday/ACOG — https://www.medicalnewstoday.com/articles/when-does-a-fetus-have-a-heartbeat | unsourced-but-plausible | low |
| Viability with intensive care at wk24 | pregnancyData.ts:35 | wk24 | ~24wk threshold; ~50% survival; periviable 20–25w6d | ACOG Periviable — https://www.acog.org/clinical/clinical-guidance/obstetric-care-consensus/articles/2017/10/periviable-birth | correct | info |
| Kick counting from wk28, 10 in 2hr | pregnancyInsights.ts:57; weekDetailData.ts:73 | wk28, 10/2hr | ~28wk (26 high-risk); 10 in 2hr | ACOG via APA — https://americanpregnancy.org/healthy-pregnancy/while-pregnant/counting-baby-kicks/ | correct | info |
| GBS ~25% carrier; swab wk36 | weekDetailData.ts:99–101 | 25%, wk36 | ~10–30% colonized; universal 36w0d–37w6d | ACOG 2020 — https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2020/02/prevention-of-group-b-streptococcal-early-onset-disease-in-newborns | correct | info |
| 15–23% fail 1-hr; 3–8% GDM | weekDetailData.ts:94 | 15–23% / 3–8% | ~15–20% fail; US GDM ~2–14% by criteria | StatPearls — https://www.ncbi.nlm.nih.gov/books/NBK545196/ | unsourced-but-plausible | low |
| Perineal massage from wk34 reduces 3rd/4th-degree tears + episiotomy | weekDetailData.ts:136 | reduces severe tears + episiotomy | Cochrane: reduces episiotomy + trauma needing suturing; NO sig. effect on 3rd/4th-degree | Cochrane CD005123 — https://www.cochrane.org/evidence/CD005123_antenatal-perineal-massage-reducing-perineal-trauma | discrepancy | medium |
| Folic acid 400–800mcg (600 ideal) | pregnancyInsights.ts:25; weekDetailData.ts:31 | 400–800 / 600 | 400 baseline, 600 in pregnancy; 4000 high-risk (absent) | CDC Folic Acid — https://www.cdc.gov/folic-acid/hcp/clinical-overview/index.html | correct | info |
| Quickening usually wk18–22 | pregnancyInsights.ts:41 | 18–22 | Commonly ~16–22wk | Mayo Clinic — https://www.mayoclinic.org/healthy-lifestyle/pregnancy-week-by-week/in-depth/fetal-development/art-20046151 | unsourced-but-plausible | info |
| 5-1-1 rule (+ "sooner if waters break") | pregnancyInsights.ts:72, 86 | 5-1-1 | Standard childbirth-ed heuristic; not single ACOG number | APA — https://americanpregnancy.org/healthy-pregnancy/labor-and-birth/ | unsourced-but-plausible | info |

### Domain: Birth guide
**Files:** `lib/birthData.ts`, `lib/birthGuideData.ts`, `lib/birthGuide/{labor-stages,warning-signs,pain-relief,csection,natural,recovery}.ts` (`home.ts`, `water.ts`, `positions.ts`, `partner-guide.ts`, `hospital-bag.ts` exist in the registry but were out of scope for this pass)
**Citation status:** **good**
**Overall verdict:** **LOW residual risk — the prior MEDIUM rating is not borne out.** The birth-guide module files are exceptionally well-sourced: each carries an explicit "educational only" disclaimer and a `sources[]` array referencing the correct ACOG bulletins, NICE guidelines, WHO/RCOG documents, CDC Hear Her, and named Cochrane reviews, with figures that hold up on cross-check. Critically, **no warning-sign threshold is dangerously lax** — the PPH pad threshold is actually *stricter* than ACOG's, reduced-fetal-movement guidance is current and correctly warns against home Dopplers, and cord-prolapse / preeclampsia / postpartum-psychosis escalation advice is accurate and appropriately urgent. Two findings warrant edits, neither dangerous (epidural instrumental-delivery magnitude; water-birth temperature upper bound). No `wrong` findings.

| Claim | file:line | Our value | Source value | Source + URL | Verdict | Severity |
|---|---|---|---|---|---|---|
| Epidural "instrumental delivery 14% vs 7%" | pain-relief.ts:65 | 14% vs 7% (≈2x) | Cochrane 2018: assisted-birth RR 1.44 (~44% rel. increase), effect negated in post-2005 low-dose subgroup | Cochrane CD000331.pub4 (Anim-Somuah 2018) — https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD000331.pub4/full | discrepancy | medium |
| Water-birth pool kept "97–100°F" | birthData.ts:91 | upper bound 100°F (37.8°C) | NICE NG235 / RCOG-RCM: must not exceed 37.5°C (99.5°F); app's own natural.ts:116 gives correct 36.5–37.5°C | NICE NG235 — https://www.nice.org.uk/guidance/ng235 | discrepancy | low |
| VBAC rupture 0.5–1% (1 prior); 1.4% (2 prior); up to 2.5% w/ prostaglandins | csection.ts:161 | 0.5–1% / 1.4% / 2.5% | ACOG: 0.5–0.9% one prior (range 0.2–1.5%); rises w/ prostaglandin induction | ACOG PB 205 (VBAC); RCOG GTG 45 — https://www.acog.org/clinical/clinical-guidance/practice-bulletin/articles/2019/02/vaginal-birth-after-cesarean-delivery | correct | info |
| Placenta accreta 0.3% (1 CS) → 2.1% (3) → 6.7% (5) | csection.ts:192 | 0.3 / 2.1 / 6.7% | Silver 2006 (MFMU): 0.2–0.3 / 0.6 / 2.1 / 2.3 / 6.7% | Silver et al., Obstet Gynecol 2006 (ACOG PB 234) — https://pubmed.ncbi.nlm.nih.gov/16738145/ | correct | info |
| PPH: soak >1 pad/hr for 2hr; clots > plum; faint/racing heart | warning-signs.ts:149–155 | 1 pad/hr ×2hr | ACOG ~2 pads/hr for 1–2hr; clots > egg/golf ball | ACOG "3 Conditions After Childbirth" / PB 183 — https://www.acog.org/womens-health/experts-and-stories/the-latest/3-conditions-to-watch-for-after-childbirth | correct (stricter, safe direction) | info |
| Reduced fetal movement: change-from-baseline; no "10 kicks" rule; no home Doppler; call triage | warning-signs.ts:82–87 | change-from-baseline; call now | RCOG GTG 57 / Count the Kicks: no single threshold; pattern change is key; Dopplers falsely reassure | RCOG Green-top 57 — https://www.rcog.org.uk/media/2gxndsd3/gtg_57.pdf | correct | info |
| Active labor at ~6cm (Zhang, not 4cm); 2nd stage >3h nullip / >2h multip, +1h epidural | labor-stages.ts:104,177; natural.ts:47,87 | 6cm; 3h/2h (+1h epidural) | ACOG OCC 1 (2014) Zhang ~6cm; ACOG 2024 First/Second Stage | ACOG First & Second Stage Labor Mgmt 2024 — https://www.acog.org/clinical/clinical-guidance/clinical-practice-guideline/articles/2024/01/first-and-second-stage-labor-management | correct | info |
| Maternal death ~1:12,000 (CS) vs ~1:25,000 (VB); CS ~2x severe morbidity | csection.ts:192 | 1:12,000 vs 1:25,000 | Direction + ~2–3x magnitude well supported; exact ratio varies by source | NICE NG192; ACOG PB 234; CMAJ 2007 (Liu) — https://www.nice.org.uk/guidance/ng192 | unsourced-but-plausible | low |
| Postpartum psychosis ~1–2/1,000; onset days 3–14; emergency, don't leave alone w/ baby | warning-signs.ts:38,228,236; recovery.ts:146–148 | 0.1–0.2%; first 2 weeks | 1–2/1,000; rapid onset first 2 weeks; psychiatric emergency | Postpartum Support Intl; RCPsych/NICE — https://www.postpartum.net/ | correct | info |

---

## Kids

### Domain: Vaccines
**File:** `lib/vaccineInfo.ts`
**Citation status:** none
**Overall verdict:** Disease-severity, mechanism, protection-level, and dose/route claims are clinically accurate and consistent with CDC/WHO across the board — no outright wrong claims. The one material issue is the repeated **unconditional "Hepatitis B first dose at birth"** framing, which no longer matches the December 2025 CDC/ACIP shift to individual-based decision-making for infants of HepB-negative mothers (an actively contested change AAP opposes). Secondary concern: the entire file carries zero citations and no "follow your country's schedule" disclaimer for CRITICAL-rated content.

| Claim | file:line | Our value | Source value | Source + URL | Verdict | Severity |
|---|---|---|---|---|---|---|
| HepB "first dose at birth" (unconditional) | vaccineInfo.ts:22, 172, 177, 187 | birth dose universal | Dec 2025 ACIP: individual decision-making for HepB-negative mothers; birth dose still universal for positive/unknown | CDC Newsroom/ACIP — https://www.cdc.gov/media/releases/2025/2025-hepatitis-b-immunization.html | discrepancy | high |
| HepB near-lifelong protection; perinatal transmission/liver cancer | vaccineInfo.ts:21–22 | 3-dose, near-lifelong | 3-dose series; prevents perinatal transmission, cirrhosis/cancer | CDC HepB — https://www.cdc.gov/hepatitis-b/hcp/vaccine-administration/index.html | correct | info |
| MMR two doses, near-complete lifelong protection | vaccineInfo.ts:57 | 2 doses | 2-dose 97% vs measles; durable | CDC MMR — https://www.cdc.gov/vaccines/hcp/by-disease/mmr.html | correct | info |
| Measles: pneumonia, brain swelling, spreads easily | vaccineInfo.ts:57, 157–158 | pneumonia/encephalitis | Among most contagious; complications incl. pneumonia/encephalitis | CDC Measles — https://www.cdc.gov/measles/hcp/vaccine-considerations/index.html | correct | info |
| Rotavirus: top cause of severe infant diarrhea; oral; effective | vaccineInfo.ts:111–112, 191–192 | most common; oral | Leading pre-vaccine cause; ~85–98% effective | CDC Rotavirus — https://www.cdc.gov/vaccines/hcp/by-disease/rotavirus.html | correct | info |
| BCG protects vs TB meningitis/disseminated; birth in high-TB | vaccineInfo.ts:127 | birth, high-TB | ~86–90% vs TB meningitis/miliary TB | WHO BCG position paper 2018 — https://www.who.int/publications/i/item/who-wer9308 | correct | info |
| Hib was leading cause of infant bacterial meningitis | vaccineInfo.ts:51–52 | leading cause | Leading pre-vaccine cause <5; >99% drop | CDC Hib — https://www.cdc.gov/hi-disease/about/index.html | unsourced-but-plausible | info |
| Yellow fever: single dose long-lasting | vaccineInfo.ts:222, 227 | single dose | SAGE 2013: single dose sustained/lifelong; boosters for some groups | WHO SAGE/CDC ACIP — https://www.cdc.gov/mmwr/preview/mmwrhtml/mm6423a5.htm | correct | low |
| MenB: prophylactic infant paracetamol often advised | vaccineInfo.ts:138 | paracetamol around dose | Prophylactic paracetamol reduces fever w/o reducing immunogenicity | EMA Bexsero — https://www.ema.europa.eu/en/documents/product-information/bexsero-epar-product-information_en.pdf | correct | info |
| PCV15 = PCV13 + 2 extra strains | vaccineInfo.ts:100–102 | 15 serotypes | PCV15 (Vaxneuvance) = 13 + 22F, 33F | CDC Pneumococcal — https://www.cdc.gov/pneumococcal/hcp/vaccine-recommendations/index.html | correct | low |
| Pertussis apnea; tetanus/diphtheria rare but lethal; DTaP durable | vaccineInfo.ts:32, 37 | apnea; durable | Pertussis causes apnea; D/T rare but life-threatening (immunity wanes → boosters) | CDC Pertussis — https://www.cdc.gov/pertussis/about/index.html | unsourced-but-plausible | info |
| Entire file carries zero citations / no schedule disclaimer | vaccineInfo.ts:1–239 | no citations | CRITICAL content should be traceable + carry country-schedule caveat | CDC schedule notes — https://www.cdc.gov/vaccines/hcp/imz-schedules/child-adolescent-notes.html | unsourced-but-plausible | medium |

### Domain: Kids nutrition & calories
**File:** `lib/foodCalories.ts`
**Citation status:** none
**Overall verdict:** **LOW RISK.** This is a calorie-*estimation* reference DB (~70 foods, each with kcal/100g + a default toddler serving in grams) used to live-estimate total calories as a caregiver tags what a child ate — **not** a feeding-guidance file. It contains none of the higher-risk infant-feeding claims the brief flagged to watch for (no honey-before-1yr, no cow-milk-timing, no allergen rules). Every calorie-density value spot-checked matches USDA FoodData Central exactly. Dairy serving defaults align with AAP toddler guidance; protein (40g) and some vegetable (40–60g) defaults run modestly above the AAP single-toddler reference but are plausible averaged across the 0–5y range and only affect an estimate, not safety. No `wrong` findings. Main improvement is traceability — accurate but uncited numbers.

| Claim | file:line | Our value | Source value | Source + URL | Verdict | Severity |
|---|---|---|---|---|---|---|
| Calorie densities (banana 89, avocado 160, butter 717, peanut butter 588 kcal/100g) | foodCalories.ts:18,23,73,86 | matches | Identical (USDA) | USDA FoodData Central — https://fdc.nal.usda.gov/ | correct | info |
| Whole milk 61 kcal/100g | foodCalories.ts:67 | 61 | 60–61 kcal/100g (3.25% milkfat) | USDA FDC — https://www.usdairy.com/news-articles/whole-milk-nutrition-facts | correct | info |
| Dairy serving defaults: milk 120g, yogurt 80g, cheese 15g | foodCalories.ts:67,70,71 | 120/80/15g | AAP toddler: milk ½cup (~120g), yogurt ⅓cup (~80g), cheese ½oz (~14g) | AAP HealthyChildren — https://www.healthychildren.org/English/ages-stages/toddler/nutrition/Pages/serving-sizes-for-toddlers.aspx | correct | info |
| Protein serving default 40g (chicken/beef/fish/turkey) | foodCalories.ts:58,59,60,62 | 40g | AAP toddler protein serving = 1oz (~28g) | AAP HealthyChildren — https://www.healthychildren.org/English/ages-stages/toddler/nutrition/Pages/serving-sizes-for-toddlers.aspx | unsourced-but-plausible | low |
| Vegetable serving defaults 40–60g | foodCalories.ts:34,35,37 | 40–60g | AAP ~1 tbsp/yr of age (~15g at 1y, ~45g at 3y) | AAP HealthyChildren — https://www.healthychildren.org/English/ages-stages/toddler/nutrition/Pages/serving-sizes-for-toddlers.aspx | unsourced-but-plausible | low |
| Entire DB presented with no source attribution ("Approximate calories per typical serving") | foodCalories.ts:1–14 | no source cited | Values are USDA-derived but file doesn't say so | (traceability gap) | correct | low |

### Domain: Growth percentiles (the GOOD template)
**File:** `lib/growthStandards.ts`
**Citation status:** **good** (header source comment + UI disclaimer)
**Overall verdict:** A strong reference template — it cites WHO + CDC sources in the header, structurally implements the correct WHO→CDC handoff at exactly 24 months, and the WHO 0–24mo P50 anchors match the published charts to the decimal. Soft issues: (a) the CDC 2–20y P50 weight values run modestly low in the 8–14y range (~1–2.5 kg under published medians), and (b) the cited WHO URL is a legacy path. Nothing here is dangerous; the data is explicitly labeled non-clinical and bands are abbreviated/interpolated.

| Claim | file:line | Our value | Source value | Source + URL | Verdict | Severity |
|---|---|---|---|---|---|---|
| Header cites WHO + CDC URLs | growthStandards.ts:8–10 | who.int/childgrowth/standards + cdc.gov/growthcharts | WHO now at /tools/child-growth-standards (legacy path); CDC current | WHO portal — https://www.who.int/tools/child-growth-standards | unsourced-but-plausible | low |
| WHO weight boys P50 (3.3/6.4/7.9/9.6/12.2kg) | growthStandards.ts:30–41 | matches | WHO boys P50 identical | WHO WFA boys — https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/weight-for-age/wfa-boys-0-5-percentiles.pdf | correct | info |
| WHO weight girls P50 (3.2/8.9/11.5kg) | growthStandards.ts:46–57 | matches | WHO girls P50 identical | WHO WFA girls — https://www.who.int/tools/child-growth-standards/standards/weight-for-age | correct | info |
| WHO length P50 boys/girls | growthStandards.ts:62–89 | boys 49.9/75.7/87.1; girls 49.1/74.0/86.4 | Matches WHO length-for-age | WHO charts — https://growthchartcalculator.org/average-height-weight-by-age | correct | info |
| WHO→CDC handoff at 24 months | growthStandards.ts:161–170 | WHO 0–24, CDC >24mo | CDC: WHO 0–24mo, CDC 2–20y; switch at 24mo | CDC MMWR RR-59 — https://www.cdc.gov/growth-chart-training/hcp/using-growth-charts/who-using.html | correct | info |
| CDC weight boys P50 8–14y (24.9/30.7/38.0/49.0kg) | growthStandards.ts:100–104 | runs ~0.7–2.5kg low | CDC ≈ 25.6/31.9/40.5/51.0kg | CDC charts — https://growthchartcalculator.org/boys-growth-chart | discrepancy | low |
| CDC weight girls P50 10–12y (31.5/39.0kg) | growthStandards.ts:119–120 | ~1.4–2.6kg low | CDC ≈ 32.9/41.6kg | CDC charts — https://growthchartcalculator.org/girls-growth-chart | discrepancy | low |
| CDC height boys P50 (109.5/138.5/150.0/178.0cm) | growthStandards.ts:131–141 | within ~1cm | CDC ≈ 108.9/138.6/149.1/176.8cm | CDC charts — https://growthchartcalculator.org/boys-growth-chart | correct | info |
| estimatePercentile linear between bands, clamps 1/99 | growthStandards.ts:204–233 | linear interp | True percentile is nonlinear LMS z-score; linear is a labeled approximation | CDC LMS data — https://www.cdc.gov/growthcharts/cdc-data-files.htm | unsourced-but-plausible | low |

---

## Wonder Weeks / growth-leaps callout

**File:** `lib/growthLeaps.ts` · **Citation status:** none · **Classification:** disputed-framework

`lib/growthLeaps.ts` encodes the **Wonder Weeks** framework (van de Rijt & Plooij) — 10 "mental leaps" from week 5 to week 75, each asserting a specific brain-development mechanism, as **established developmental fact with no citations, no disclaimer, and no framing as a popular/disputed theory.**

This is a popular but **scientifically disputed** model. Its original basis is a 1992 longitudinal study of only **15 Dutch mother-infant pairs**; a 1998 replication (de Weerth & van Geert) **failed to find** the 10-period fussiness pattern or corresponding cortisol/stress elevations, and mainstream developmental experts do not treat the precise, predetermined milestone-behavior links as established science.

**Recommendation:** Do **not** verify the leap weeks or brain mechanisms as fact. Label the entire framework in the UI as a **popular parenting theory / opinion, not validated developmental science**, add a source attribution, and add a disclaimer that timing varies widely and is not medically validated. The deterministic "your child IS currently in a leap" logic (`growthLeaps.ts:186–191`) should be paired with that disclaimer and never presented as diagnostic.

| Claim | file:line | Our value | Source value | Source + URL | Verdict | Severity |
|---|---|---|---|---|---|---|
| 10-leap schedule (wk5–75) as factual data | growthLeaps.ts:1–7, 31 | factual, no disclaimer | Based on n=15 (1992); failed replication; not peer-validated | Wikipedia / de Weerth & van Geert — https://en.wikipedia.org/wiki/The_Wonder_Weeks | disputed-framework | high |
| Week-5 "first major nervous-system reorganization" | growthLeaps.ts:35 | mechanism as fact | No authoritative source ties this to wk5 | Wonder Weeks (disputed) — https://en.wikipedia.org/wiki/The_Wonder_Weeks | disputed-framework | medium |
| Week-12 "motor neurons rapidly myelinating" | growthLeaps.ts:65 | precise cause | Myelination is gradual; no discrete wk12 event | Wonder Weeks (disputed) — https://en.wikipedia.org/wiki/The_Wonder_Weeks | disputed-framework | medium |
| Week-26 object permanence + separation anxiety triggered together | growthLeaps.ts:95, 99–100 | precise leap | Stranger/separation anxiety ~6–9mo plausible; precise-week mechanism disputed | CDC Milestones — https://www.cdc.gov/ncbddd/actearly/milestones/index.html | unsourced-but-plausible | low |
| First words at ~wk37 (~8.5mo) | growthLeaps.ts:110, 118 | ~8.5mo | CDC places first words ~12mo | CDC 1yr — https://www.cdc.gov/ncbddd/actearly/milestones/milestones-1yr.html | discrepancy | medium |
| Pulls-to-stand/cruises at ~wk46 (~10.5mo) | growthLeaps.ts:133 | ~10.5mo | Pull-to-stand ~9mo; cruising ~12mo | CDC 9mo — https://www.cdc.gov/ncbddd/actearly/milestones/milestones-9mo.html | unsourced-but-plausible | low |
| 2–3 word sentences at ~wk64 (~15mo) | growthLeaps.ts:163 | ~15mo | CDC: 2-word combos ~24–30mo | CDC 15mo — https://www.cdc.gov/ncbddd/actearly/milestones/milestones-15mo.html | discrepancy | medium |
| Week-75 "foundation of adult thinking" | growthLeaps.ts:170 | as fact | No authoritative source endorses discrete wk75 systems leap | Wonder Weeks (disputed) — https://en.wikipedia.org/wiki/The_Wonder_Weeks | disputed-framework | low |
| Deterministic "current leap" by age in weeks | growthLeaps.ts:186–191 | states child IS in a leap | Replication found no fixed fussy periods; don't present as diagnostic | de Weerth & van Geert — https://en.wikipedia.org/wiki/The_Wonder_Weeks | disputed-framework | medium |

---

## Citations gap

**Cite a source today (Layer B pass or partial):**
- `lib/growthStandards.ts` — **full pass.** Header source comment (WHO + CDC URLs) plus repeated "decision-support, not clinical-grade" docstrings and a UI disclaimer. (Minor: update the legacy WHO URL.)
- **All `lib/birthGuide/` module files** (`labor-stages`, `warning-signs`, `pain-relief`, `csection`, `natural`, `recovery`) — **confirmed full pass.** Each carries an explicit "educational only" disclaimer and a `sources[]` array citing the correct ACOG/NICE/WHO/RCOG/CDC/Cochrane documents. This is the second strong template alongside `growthStandards.ts`. (Exception: the legacy `birthData.ts` simple-data file is uncited and has the water-temp inconsistency above.)
- `lib/pregnancyAppointments.ts` — *partial only:* an "Aligned with ACOG" claim exists but solely as a buried code comment (line 3), never surfaced to the user.

**Zero user-facing citations (Layer B fail):**
- `lib/vaccineInfo.ts` (CRITICAL surface)
- `lib/cycleLogic.ts`, `lib/cycleAnalytics.ts`
- `lib/weekStats.ts`, `lib/pregnancyData.ts` (header points to an internal HTML file, not a published source)
- `lib/prepGuide.ts`, `lib/pregnancyInsights.ts`, `lib/weekDetailData.ts`
- `lib/growthLeaps.ts` (and no "this is opinion" framing)

**Recommended template — roll out the `growthStandards.ts` pattern everywhere:**
1. **Header source comment** in each clinical data file naming the authoritative source(s) and the canonical URL.
2. **A UI-level disclaimer** surfaced to users: "This is general information, not medical advice — follow your clinician and your country's official schedule," with per-entry or per-modal source links on CRITICAL surfaces (vaccines especially).
3. **A "not clinical-grade / estimate" label** wherever values are interpolated, abbreviated, or population-median estimates (growth percentiles, fetal size, conception probability).

---

## Recommended fixes (ordered by severity)

> The following is a prioritized backlog for a **later, user-approved** pass. This audit applied none of them.

**High**
1. `lib/pregnancyInsights.ts:58` — remove the "fast 8 hours" clause; the 1-hour glucose screen needs no fasting (align with weekDetailData.ts:94).
2. `lib/cycleLogic.ts:400–415` — rescale the conception-probability curve to published day-specific values (peak ~30–33%) or relabel it an illustrative relative index, and add a citation.
3. `lib/weekStats.ts:25–32` — fix the crown-rump→crown-heel splice; switch to crown-heel at week 14, eliminate the ~10cm wk20→wk21 jump, and label the measurement convention.
4. `lib/pregnancyData.ts:25–31` — reconcile second-trimester lengths with weekStats and with crown-heel charts (resolve the wk20 16.4cm vs 25cm disagreement).
5. `lib/vaccineInfo.ts:22, 172, 177, 187` — soften HepB to "often given at or shortly after birth," add a "follow your country's schedule" caveat, and cite the Dec 2025 ACIP guidance.
6. `lib/growthLeaps.ts:1–7, 31` — label the entire Wonder Weeks dataset as a popular/disputed framework (opinion), add attribution, and add a UI disclaimer.

**Medium**
7. `lib/weekDetailData.ts:136` — reword perineal-massage benefit to "reduces episiotomy and trauma needing stitches (especially first vaginal births)"; drop the 3rd/4th-degree-tear claim (Cochrane found no effect).
8. `lib/cycleLogic.ts:14–15` — soften "relatively constant" luteal-phase comment and surface a disclaimer that calendar prediction is an estimate (BBT/LH/mucus more accurate).
9. `lib/growthLeaps.ts:110/118, 163` — align first-word (~12mo) and 2-word-combo (~24–30mo) expectations with CDC milestones or clearly mark as "may begin."
10. `lib/growthLeaps.ts:186–191` — pair the deterministic "current leap" logic with a non-diagnostic disclaimer.
11. `lib/growthLeaps.ts:35, 65` — attribute or soften the deterministic neuroscience "brainNote" mechanisms.
12. `lib/vaccineInfo.ts:1–239` — add per-entry or modal-level source links and a general schedule disclaimer to this CRITICAL surface.
13. `lib/pregnancyAppointments.ts:2–6` — surface the "ACOG" attribution to users (per-milestone or screen-level) rather than only in a code comment.
14. `lib/weekStats.ts:1–4` / `lib/pregnancyData.ts` — add a published source attribution (WHO/Hadlock/INTERGROWTH) and a "50th-centile estimate, not your baby's actual measurement" note.
15. `lib/prepGuide.ts:39` / `lib/pregnancyInsights.ts:25` / `lib/weekDetailData.ts:31` — add the high-risk folic acid dose (4,000 mcg/day for prior NTD-affected pregnancy) with an "ask your provider" caveat.
16. `lib/birthGuide/pain-relief.ts:65` — rephrase the epidural instrumental-delivery stat from "14% vs 7%" (≈2x) to the Cochrane pooled RR ~1.44, and note the effect attenuates with modern low-dose epidurals.

**Low**
17. `lib/cycleLogic.ts:10, 123–125` — note or trim the fertile window to ACOG's canonical 6-day window (currently ovulation+1 = 7 days).
18. `lib/cycleLogic.ts:13` — consider aligning the normal cycle range to ACOG's 24–38 days.
19. `lib/cycleLogic.ts:364–378` — soften hydration copy from a conception claim to general wellbeing.
20. `lib/cycleAnalytics.ts:137–138` — document the ±2-day regularity band as an app metric, not a medical definition.
21. `lib/growthStandards.ts:8–10` — update the WHO URL to the current `/tools/child-growth-standards` path.
22. `lib/growthStandards.ts:100–104, 119–120` — tighten the CDC 8–14y P50 weight rows (~1–2.5kg low).
23. `lib/weekDetailData.ts:206` vs `lib/pregnancyData.ts:26` — pick one "eyes open" week (~26–27) for consistency.
24. `lib/pregnancyData.ts:16` — consider softening "heart begins to beat" at wk5 to "early cardiac activity may begin."
25. `lib/birthData.ts:91` — tighten the water-birth temperature upper bound from 100°F to 99.5°F (37.5°C) for consistency with NICE NG235 and the app's own `natural.ts:116`.
26. `lib/foodCalories.ts:1–14` — add a "Source: USDA FoodData Central; servings approx. per AAP toddler guidance" header note so calorie estimates are auditable.

---

## Coverage note

All **10 clinical domains were verified.** 8 completed in the main run; the remaining 2 (**birth guide**, **kids nutrition & calories**) hit a session-token limit mid-run and were completed in a follow-up gap-fill pass on the same day — both came back **LOW risk** with no `wrong` findings. Out-of-scope within the birth-guide module set (not yet verified): `lib/birthGuide/{home,water,positions,partner-guide,hospital-bag}.ts`.

## Closing note

This was a **READ-ONLY audit.** No clinical data files were edited; all findings above are recommendations for a later, separately approved pass. As stated in the disclaimer, this document flags discrepancies against published guidance and improves traceability — it is **not** a clinical sign-off. Final correctness requires review by a licensed medical professional.

---

_Generated by an orchestrated multi-agent verification workflow (10 domain verifiers cross-checking against WHO/CDC/ACOG/AAP/NICE/ASRM + peer-reviewed literature) on 2026-06-22._

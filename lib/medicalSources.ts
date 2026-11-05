// lib/medicalSources.ts
// Single source of truth for the user-facing medical disclaimer and the
// canonical public-health source URLs referenced across the clinical content
// libraries. Roll-out target from the 2026-06-22 health-content audit:
// every clinical data file cites a SOURCES key in its header and surfaces
// MEDICAL_DISCLAIMER wherever clinical values are shown.

export const MEDICAL_DISCLAIMER =
  'This is general information, not medical advice. Values shown are population estimates, not your own measurements.'

export const VACCINE_SCHEDULE_NOTE = "Follow your country's official immunization schedule and your pediatrician."

export const SOURCES = {
  acogPrenatalScreening:
    'https://www.acog.org/womens-health/faqs/prenatal-genetic-screening-tests',
  acogNutrition:
    'https://www.acog.org/womens-health/faqs/nutrition-during-pregnancy',
  acogGdm: 'https://www.acog.org/womens-health/faqs/gestational-diabetes',
  cdcFolicAcid: 'https://www.cdc.gov/folic-acid/about/index.html',
  cdcHepB: 'https://www.cdc.gov/media/releases/2025/2025-hepatitis-b-immunization.html',
  whoGrowth: 'https://www.who.int/tools/child-growth-standards',
  cdcGrowth: 'https://www.cdc.gov/growthcharts/',
  wilcoxNejm1995: 'https://www.nejm.org/doi/full/10.1056/NEJM199512073332301',
  hadlockPerinatology: 'https://perinatology.com/Reference/Fetal%20development.htm',
  cochranePerineal:
    'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD005123.pub3/full',
  cochraneEpidural:
    'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD000331.pub4/full',
  niceWaterBirth: 'https://www.nice.org.uk/guidance/ng235',
  usdaFdc: 'https://fdc.nal.usda.gov/',
  wonderWeeks: 'https://en.wikipedia.org/wiki/The_Wonder_Weeks',
} as const

// ─── Cited sources for the cycle (pre-pregnancy) pillar screens ─────────────

/**
 * Pillar sources — where every health claim on the cycle (pre-pregnancy) pillar screens comes from.
 *
 * International bodies only (WHO, CDC, NHS, NIH, FDA, ASRM, Cleveland Clinic…) or peer-reviewed
 * papers — never a country-specific society, since the app ships worldwide. Every entry was opened
 * and checked against the claim it backs (the number, the timing) when it was added.
 *
 * Tips and intros point here by id (`sources` / `introSources` in lib/prePregPillars.ts).
 * `org` is the short name shown on the tip ("Fonte: CDC · NHS"); `title` stays in the page's
 * original language; `year` is the publication / last-reviewed year shown on the page, if any.
 */

export interface MedicalSource {
  id: string
  org: string
  title: string
  year?: number
  url: string
}

const LIST: MedicalSource[] = [
  // ── Fertility & conception ────────────────────────────────────────────────
  { id: 'asrm-optimizing-natural-fertility', org: 'ASRM', title: 'Optimizing natural fertility: a committee opinion', year: 2022, url: 'https://www.asrm.org/practice-guidance/practice-committee-documents/optimizing-natural-fertility-a-committee-opinion-2021/' },
  { id: 'asrm-age-and-fertility', org: 'ASRM', title: 'Age and Fertility', year: 2012, url: 'https://www.reproductivefacts.org/news-and-publications/fact-sheets-and-infographics/age-and-fertility-booklet/' },
  { id: 'cdc-infertility-faq', org: 'CDC', title: 'Infertility: Frequently Asked Questions', year: 2024, url: 'https://www.cdc.gov/reproductive-health/infertility-faq/index.html' },
  { id: 'nhs-infertility', org: 'NHS', title: 'Infertility', year: 2023, url: 'https://www.nhs.uk/conditions/infertility/' },
  { id: 'nhs-natural-family-planning', org: 'NHS', title: 'Natural family planning', year: 2024, url: 'https://www.nhs.uk/contraception/methods-of-contraception/natural-family-planning/' },
  { id: 'cleveland-ovulation', org: 'Cleveland Clinic', title: 'Ovulation: Calculating, Process, Pain & Other Symptoms', year: 2026, url: 'https://my.clevelandclinic.org/health/articles/23439-ovulation' },
  { id: 'cleveland-bbt', org: 'Cleveland Clinic', title: 'Basal Body Temperature', year: 2022, url: 'https://my.clevelandclinic.org/health/articles/21065-basal-body-temperature' },
  { id: 'cleveland-follicular-phase', org: 'Cleveland Clinic', title: 'Follicular Phase of Menstrual Cycle', year: 2026, url: 'https://my.clevelandclinic.org/health/body/23953-follicular-phase' },
  { id: 'medlineplus-ovulation-home-test', org: 'MedlinePlus', title: 'Ovulation home test', year: 2025, url: 'https://medlineplus.gov/ency/article/007062.htm' },
  { id: 'owh-douching', org: 'OWH (HHS)', title: 'Douching', year: 2025, url: 'https://www.womenshealth.gov/a-z-topics/douching' },

  // ── Emotional readiness ───────────────────────────────────────────────────
  { id: 'nhlbi-how-much-sleep', org: 'NIH/NHLBI', title: 'How Sleep Works - How Much Sleep Is Enough?', year: 2022, url: 'https://www.nhlbi.nih.gov/health/sleep/how-much-sleep' },
  { id: 'li-2024-sleep-female-infertility', org: "BMC Women's Health", title: 'Sleep disturbances and female infertility: a systematic review', year: 2024, url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11660991/' },

  // ── Nutrition ─────────────────────────────────────────────────────────────
  { id: 'cdc-folic-acid', org: 'CDC', title: 'About Folic Acid', year: 2026, url: 'https://www.cdc.gov/folic-acid/about/index.html' },
  { id: 'who-folic-acid', org: 'WHO', title: 'Periconceptional folic acid supplementation to prevent neural tube defects', year: 2023, url: 'https://www.who.int/tools/elena/interventions/folate-periconceptional' },
  { id: 'nhs-vitamins-pregnancy', org: 'NHS', title: 'Vitamins and supplements in pregnancy', url: 'https://www.nhs.uk/best-start-in-life/pregnancy/vitamins-and-supplements-in-pregnancy/' },
  { id: 'medlineplus-ntd', org: 'MedlinePlus', title: 'Neural Tube Defects', year: 2025, url: 'https://medlineplus.gov/neuraltubedefects.html' },
  { id: 'cleveland-prenatal-vitamins', org: 'Cleveland Clinic', title: 'Prenatal Vitamins: Importance, Deficiency & Essentials', year: 2024, url: 'https://my.clevelandclinic.org/health/drugs/9754-pregnancy-prenatal-vitamins' },
  { id: 'nhs-foods-to-avoid', org: 'NHS', title: 'Foods to avoid in pregnancy', year: 2026, url: 'https://www.nhs.uk/pregnancy/keeping-well/foods-to-avoid/' },
  { id: 'fda-advice-fish', org: 'FDA', title: 'Advice about Eating Fish', year: 2024, url: 'https://www.fda.gov/food/consumers/advice-about-eating-fish' },
  { id: 'fda-fish-qa', org: 'FDA', title: 'Questions & Answers from the FDA/EPA Advice about Eating Fish for Those Who Might Become or Are Pregnant or Breastfeeding and Children Ages 1 to 11 Years', year: 2022, url: 'https://www.fda.gov/food/consumers/questions-answers-fdaepa-advice-about-eating-fish-those-who-might-become-or-are-pregnant-or' },
  { id: 'hru-preconception-diet-2023', org: 'Human Reproduction Update', title: 'Assessing the influence of preconception diet on female fertility: a systematic scoping review of observational studies', year: 2023, url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10663051/' },
  { id: 'nutrrev-med-diet-2023', org: 'Nutrition Reviews', title: 'Mediterranean diet and infertility: a systematic review with meta-analysis of cohort studies', year: 2023, url: 'https://pubmed.ncbi.nlm.nih.gov/36346903/' },
  { id: 'asrm-weight-fertility', org: 'ASRM', title: 'Weight and Fertility', year: 2023, url: 'https://www.reproductivefacts.org/news-and-publications/fact-sheets-and-infographics/weight-and-fertility/' },
  { id: 'chavarro-iron-2006', org: 'Obstetrics & Gynecology', title: 'Iron intake and risk of ovulatory infertility', year: 2006, url: 'https://pubmed.ncbi.nlm.nih.gov/17077236/' },
  { id: 'medlineplus-iron-diet', org: 'MedlinePlus', title: 'Iron in diet', year: 2025, url: 'https://medlineplus.gov/ency/article/002422.htm' },
  { id: 'curlin-cervical-mucus-2013', org: 'Frontiers in Bioscience', title: 'Cervical mucus: from biochemical structure to clinical implications', year: 2013, url: 'https://www.imrpress.com/journal/FBS/5/2/10.2741/s386' },
  { id: 'nhs-water', org: 'NHS', title: 'Water, drinks and hydration', year: 2023, url: 'https://www.nhs.uk/live-well/eat-well/food-guidelines-and-food-labels/water-drinks-nutrition/' },
  { id: 'cdc-alcohol-pregnancy', org: 'CDC', title: 'About Alcohol Use During Pregnancy', year: 2026, url: 'https://www.cdc.gov/alcohol-pregnancy/about/index.html' },

  // ── Partner (male fertility) ──────────────────────────────────────────────
  { id: 'asrm-male-fertility-journey', org: 'ASRM', title: 'Male Fertility Journey', url: 'https://www.reproductivefacts.org/patient-journeys/male-fertility-journey/' },
  { id: 'asrm-optimizing-male-fertility', org: 'ASRM', title: 'Optimizing Male Fertility', year: 2023, url: 'https://www.reproductivefacts.org/news-and-publications/fact-sheets-and-infographics/optimizing-male-fertility-factsheet/' },
  { id: 'ijph-heat-sperm-2022', org: 'Iranian Journal of Public Health', title: 'The Impact of High Ambient Temperature on Human Sperm Parameters: A Meta-Analysis', year: 2022, url: 'https://pubmed.ncbi.nlm.nih.gov/35936544/' },
  { id: 'nhs-low-sperm-count', org: 'NHS', title: 'Low sperm count', year: 2024, url: 'https://www.nhs.uk/conditions/low-sperm-count/' },

  // ── Health checkups ───────────────────────────────────────────────────────
  { id: 'cdc-planning-pregnancy', org: 'CDC', title: 'Planning for Pregnancy', year: 2026, url: 'https://www.cdc.gov/pregnancy/about/index.html' },
  { id: 'cdc-mmwr-preconception-2006', org: 'CDC', title: 'Recommendations to Improve Preconception Health and Health Care — United States', year: 2006, url: 'https://www.cdc.gov/mmwr/preview/mmwrhtml/rr5506a1.htm' },
  { id: 'cleveland-preconception-counseling', org: 'Cleveland Clinic', title: 'Preconception Counseling', year: 2023, url: 'https://my.clevelandclinic.org/health/articles/4503-preconception-counseling' },
  { id: 'nhs-trying-to-get-pregnant', org: 'NHS', title: 'Trying to get pregnant', year: 2026, url: 'https://www.nhs.uk/pregnancy/trying-for-a-baby/trying-to-get-pregnant/' },
  { id: 'cdc-vaccines-pregnancy', org: 'CDC', title: 'Vaccine Recommendations Before, During, and After Pregnancy', year: 2026, url: 'https://www.cdc.gov/vaccines-pregnancy/recommended-vaccines/index.html' },
  { id: 'cdc-pinkbook-ch2', org: 'CDC', title: 'Chapter 2: General Best Practice Guidance for Immunization', year: 2024, url: 'https://www.cdc.gov/pinkbook/hcp/table-of-contents/chapter-2-general-best-practice-guidance.html' },
  { id: 'cleveland-carrier-screening', org: 'Cleveland Clinic', title: 'Carrier Screening', year: 2024, url: 'https://my.clevelandclinic.org/health/diagnostics/carrier-screening' },
  { id: 'cdc-pregnancy-oral-health', org: 'CDC', title: 'Pregnancy and Oral Health Facts', year: 2024, url: 'https://www.cdc.gov/oral-health/data-research/facts-stats/fast-facts-pregnancy-and-oral-health.html' },
  { id: 'niddk-thyroid-pregnancy', org: 'NIH/NIDDK', title: 'Thyroid Disease & Pregnancy', year: 2017, url: 'https://www.niddk.nih.gov/health-information/endocrine-diseases/pregnancy-thyroid-disease' },
  { id: 'niddk-thyroid-tests', org: 'NIH/NIDDK', title: 'Thyroid Tests', year: 2017, url: 'https://www.niddk.nih.gov/health-information/diagnostic-tests/thyroid' },
  { id: 'nhs-ramipril-pregnancy', org: 'NHS', title: 'Pregnancy, breastfeeding and fertility while taking ramipril', year: 2026, url: 'https://www.nhs.uk/medicines/ramipril/pregnancy-breastfeeding-and-fertility-while-taking-ramipril/' },
  { id: 'nhs-valproate-pregnancy', org: 'NHS', title: 'Pregnancy, breastfeeding and fertility while taking sodium valproate', year: 2025, url: 'https://www.nhs.uk/medicines/sodium-valproate/pregnancy-breastfeeding-and-fertility-while-taking-sodium-valproate/' },
  { id: 'cdc-chlamydia', org: 'CDC', title: 'About Chlamydia', year: 2025, url: 'https://www.cdc.gov/chlamydia/about/index.html' },
  { id: 'who-stis', org: 'WHO', title: 'Sexually transmitted infections (STIs)', year: 2025, url: 'https://www.who.int/news-room/fact-sheets/detail/sexually-transmitted-infections-(stis)' },
  { id: 'who-syphilis', org: 'WHO', title: 'Syphilis', year: 2025, url: 'https://www.who.int/news-room/fact-sheets/detail/syphilis' },
  { id: 'niams-lupus', org: 'NIH/NIAMS', title: 'Systemic Lupus Erythematosus (Lupus): Diagnosis, Treatment, and Steps to Take', year: 2022, url: 'https://www.niams.nih.gov/health-topics/lupus/diagnosis-treatment-and-steps-to-take' },
  { id: 'nhs-vitamin-d', org: 'NHS', title: 'Vitamin D', year: 2020, url: 'https://www.nhs.uk/conditions/vitamins-and-minerals/vitamin-d/' },
  { id: 'nhs-vegan-diet', org: 'NHS', title: 'The vegan diet', year: 2026, url: 'https://www.nhs.uk/live-well/eat-well/how-to-eat-a-balanced-diet/the-vegan-diet/' },
]

export const MEDICAL_SOURCES: Readonly<Record<string, MedicalSource>> = Object.fromEntries(LIST.map((s) => [s.id, s]))

/** Resolve ids → sources, in order, skipping unknown ids and duplicates. */
export function resolveSources(ids: readonly string[] | undefined): MedicalSource[] {
  if (!ids?.length) return []
  const seen = new Set<string>()
  const out: MedicalSource[] = []
  for (const id of ids) {
    const s = MEDICAL_SOURCES[id]
    if (s && !seen.has(id)) { seen.add(id); out.push(s) }
  }
  return out
}

/** Every source a pillar cites (intro first, then tips in order), de-duplicated. */
export function pillarSources(pillar: { introSources?: readonly string[]; tips: readonly { sources?: readonly string[] }[] }): MedicalSource[] {
  return resolveSources([...(pillar.introSources ?? []), ...pillar.tips.flatMap((t) => t.sources ?? [])])
}

/** Registry list (tests). */
export const MEDICAL_SOURCE_LIST: readonly MedicalSource[] = LIST

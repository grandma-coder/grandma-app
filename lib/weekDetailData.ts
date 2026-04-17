// lib/weekDetailData.ts
// Rich per-week data for the WeekDetailModal
// Supplements the base pregnancyWeeks data with multiple dev facts,
// trimester-common symptoms, tappable prep items with full detail content.

export interface PrepItem {
  id: string
  icon: string
  title: string
  summary: string
  detail: string  // shown in nested PrepDetailModal
}

export interface WeekDetail {
  week: number
  developmentPoints: string[]       // 3-4 bullet facts for this specific week
  symptoms: string[]                // common symptoms this week/period
  prepItems: PrepItem[]             // what to prepare — tappable with detail
  grandmaTip: string                // Grandma's warm note (week-specific)
}

// ─── Prep item detail content library ────────────────────────────────────────
// Reused across multiple weeks where relevant

const PREP_DETAIL: Record<string, PrepItem> = {
  prenatal_vitamins: {
    id: 'prenatal_vitamins',
    icon: '💊',
    title: 'Take your prenatal vitamins',
    summary: 'Folic acid, iron, and DHA every day',
    detail: 'Prenatal vitamins fill nutritional gaps that diet alone may miss. Look for at least 400mcg of folic acid (ideally 600mcg during pregnancy), 27mg of iron, 200mg of DHA, and calcium. Take with food if they make you nauseous. If your current prenatal causes constipation, ask your doctor about a gentle alternative. Consistency matters more than brand.',
  },
  birth_plan: {
    id: 'birth_plan',
    icon: '📋',
    title: 'Draft your birth plan',
    summary: 'Outline preferences for labor and delivery',
    detail: 'A birth plan is a 1–2 page document covering your preferences for labor. Think about: who you want in the room, your pain management preferences (epidural, natural, nitrous oxide), your position preferences during labor, delayed cord clamping, immediate skin-to-skin, and what to do if a C-section is needed. Keep it flexible — birth rarely goes exactly to plan, and your medical team will appreciate knowing your wishes.',
  },
  hospital_bag: {
    id: 'hospital_bag',
    icon: '🎒',
    title: 'Pack your hospital bag',
    summary: 'Ready by week 36 — you might go early',
    detail: 'For you: ID, insurance card, birth plan, comfortable robe or nightgown, non-slip socks, toiletries, snacks, phone charger, going-home outfit, nursing bra if planning to breastfeed. For baby: going-home outfit (newborn + 0-3 month sizes), car seat installed beforehand. For partner: change of clothes, toiletries, snacks. The bag itself should be ready by 36 weeks — some babies arrive early.',
  },
  car_seat: {
    id: 'car_seat',
    icon: '🚗',
    title: 'Install and inspect the car seat',
    summary: 'Required before leaving the hospital',
    detail: 'A properly installed rear-facing infant car seat is legally required before you leave the hospital. Choose a seat rated for newborns (5–22 lbs typically). Read the manual thoroughly — most car seats are installed incorrectly. Many fire stations offer free car seat checks. Install and test it at least a month before your due date. The harness should be snug: you should not be able to pinch any slack at the shoulder.',
  },
  birth_center_tour: {
    id: 'birth_center_tour',
    icon: '🏥',
    title: 'Tour the birth center',
    summary: 'Know your way around before labor begins',
    detail: 'Walking through your birth location before labor makes everything less scary on the day. Ask about parking, where to check in during labor, what a typical room looks like, what is available (tub, birth ball, nitrous oxide, epidural anesthesiologist availability), and visitation policies. Knowing the layout reduces anxiety and helps your support person navigate too.',
  },
  iron_diet: {
    id: 'iron_diet',
    icon: '🥩',
    title: 'Boost iron-rich foods',
    summary: 'Supports you and prevents anemia',
    detail: 'Iron needs increase significantly in pregnancy — you need about 27mg daily. Great sources: red meat (lean), lentils, spinach, fortified cereals, tofu, pumpkin seeds, and beans. Pair iron-rich foods with vitamin C (like a glass of orange juice) to boost absorption. Avoid taking iron with calcium-rich foods or coffee/tea. If your blood test shows low hemoglobin, your doctor may recommend an iron supplement in addition to your prenatal.',
  },
  kick_counting: {
    id: 'kick_counting',
    icon: '👶',
    title: 'Start kick counting',
    summary: 'Track daily movements from week 28',
    detail: "Kick counting is recommended from week 28 onward. The standard method: choose a consistent time daily (often after a meal, when baby is most active), lie on your left side, and count every movement until you reach 10. It should take under 2 hours. If you don't feel 10 movements in 2 hours, contact your provider. Some days baby is quieter — that's normal — but a significant change in pattern warrants a call.",
  },
  pediatrician: {
    id: 'pediatrician',
    icon: '👩‍⚕️',
    title: 'Choose a pediatrician',
    summary: 'Interview candidates before baby arrives',
    detail: 'Many pediatric practices accept prenatal interviews — a brief meeting to ask questions and get a feel for the practice. Ask: what hospital are you affiliated with, what is your on-call policy after hours, how do you handle vaccine-hesitant parents, what are your thoughts on sleep training and feeding? Choose someone whose philosophy aligns with yours. Confirm your insurance is accepted. The pediatrician will examine your baby in the hospital, so choose before your due date.',
  },
  anatomy_scan_prep: {
    id: 'anatomy_scan_prep',
    icon: '🔬',
    title: 'Prepare for your anatomy scan',
    summary: 'The big detailed ultrasound around week 20',
    detail: 'The anatomy scan (typically at 18–22 weeks) is the most comprehensive ultrasound of your pregnancy. It checks brain, heart, spine, kidneys, limbs, and more. It takes 30–45 minutes. You may be asked to have a full bladder. This is when many parents find out the sex if they want to. Bring your partner. If something is flagged for follow-up, try not to panic — about 10% of scans lead to a follow-up visit, and most resolve without issue.',
  },
  glucose_test_prep: {
    id: 'glucose_test_prep',
    icon: '🍊',
    title: 'Prepare for glucose screening',
    summary: 'Tests for gestational diabetes around week 24–28',
    detail: 'The 1-hour glucose challenge test (GCT) screens for gestational diabetes. You drink a sweet glucose solution and have blood drawn one hour later. No fasting required beforehand. If your result is high, you will be scheduled for the 3-hour glucose tolerance test (GTT), which requires fasting. About 15–23% of people fail the 1-hour test, and about 3–8% are diagnosed with GDM. Gestational diabetes is manageable — diet, monitoring, and sometimes insulin.',
  },
  group_b_strep: {
    id: 'group_b_strep',
    icon: '🧫',
    title: 'GBS swab at week 36',
    summary: 'Quick test, important for labor planning',
    detail: 'Group B Strep (GBS) is a bacteria carried naturally by about 25% of pregnant people. It is harmless to you but can rarely infect babies during birth. The swab is painless — a quick self-administered or provider-administered swab of the vaginal and rectal area. If positive, you will receive IV antibiotics during labor, which dramatically reduces risk to your baby. Being GBS positive does not limit your birth options.',
  },
  belly_oil: {
    id: 'belly_oil',
    icon: '🧴',
    title: 'Moisturize your belly daily',
    summary: 'Supports skin elasticity as it stretches',
    detail: 'As your belly grows rapidly, keeping skin moisturized can reduce itchiness and discomfort. Whether it prevents stretch marks is debated, but it helps with comfort. Good options: coconut oil, shea butter, Bio-Oil, or any fragrance-free lotion. Apply after a shower when skin is slightly damp. Massage gently — it is also a lovely moment to connect with your baby.',
  },
  birth_class: {
    id: 'birth_class',
    icon: '📚',
    title: 'Enroll in a birth class',
    summary: 'Prepare yourself and your partner for labor',
    detail: 'Birth classes (Lamaze, Bradley, HypnoBirthing, or hospital-based classes) teach breathing techniques, labor positions, coping strategies, and what to expect during each stage of labor. Take a class that starts around weeks 28–32. Hospital-based classes are often affordable. If you are planning an unmedicated birth, a more in-depth course like Bradley or HypnoBirthing is worth the investment. Your partner will benefit enormously too.',
  },
  maternity_leave: {
    id: 'maternity_leave',
    icon: '📄',
    title: 'File maternity leave paperwork',
    summary: 'Start the process early — HR takes time',
    detail: "Review your employer's maternity leave policy and start the process early — some paperwork requires your doctor's signature in advance. In the US, understand your FMLA rights (12 weeks unpaid job protection), any paid leave your employer offers, and whether you are eligible for state disability insurance. If self-employed, look into short-term disability insurance. Line up your leave plan at least 6–8 weeks before your due date.",
  },
  nursery_prep: {
    id: 'nursery_prep',
    icon: '🛏️',
    title: 'Prepare the nursery',
    summary: 'Crib set up, safe sleep setup, essentials ready',
    detail: "Safe sleep guidelines: baby sleeps alone, on their back, in a firm flat crib or bassinet, with no pillows, bumpers, loose blankets, or stuffed animals. A fitted sheet and sleep sack is all they need. Make sure the crib meets current safety standards (no drop-side rails). Set up a changing station at a comfortable height. A white noise machine and blackout curtains help enormously for sleep. You don't need much — but what you need should be ready before birth.",
  },
  perineal_massage: {
    id: 'perineal_massage',
    icon: '💆',
    title: 'Start perineal massage at week 34',
    summary: 'Reduces risk of tearing during delivery',
    detail: 'Perineal massage from week 34 onward has evidence to support reduced risk of third- and fourth-degree tears and episiotomy. It takes about 5 minutes, done 3–4 times per week. Use a clean finger and olive oil or coconut oil. Gently stretch the perineum downward and to the sides in a U-shape motion. Ask your midwife or OB to demonstrate proper technique. It may feel uncomfortable at first but becomes easier with practice.',
  },
  lactation_support: {
    id: 'lactation_support',
    icon: '🍼',
    title: 'Find a lactation consultant',
    summary: 'Prepare for breastfeeding before birth',
    detail: "Meeting with a lactation consultant before birth is one of the most impactful things you can do if you plan to breastfeed. They can answer questions, address any concerns about latch or milk supply, and give you a realistic picture of what to expect. Many hospitals have IBCLCs (International Board Certified Lactation Consultants) on staff. If breastfeeding is challenging in the first days — which is common — having a consultant's number ready is invaluable.",
  },
  cord_blood: {
    id: 'cord_blood',
    icon: '🧬',
    title: 'Decide on cord blood banking',
    summary: 'Private banking or donation — decide by week 34',
    detail: "Cord blood contains stem cells that may be used in future medical treatments. You have three options: private banking (costs $1,500–$2,500 upfront + annual fees, stored for your family's use), public donation (free, donated to a registry), or delayed cord clamping + donation (delay clamping for 1–3 minutes, then donate what remains). Most major medical organizations support public donation or delayed clamping over private banking for low-risk families, but it is a personal decision.",
  },
}

// ─── Per-week detail data ─────────────────────────────────────────────────────

const WEEK_DETAILS: WeekDetail[] = [
  {
    week: 1, grandmaTip: 'Start prenatal vitamins now even if you just found out, dear.',
    developmentPoints: ['Fertilization occurs as sperm meets egg', 'The zygote rapidly divides into a ball of cells called a blastocyst', 'DNA from both parents combines to determine everything about your baby', 'Implantation into the uterine wall begins this week'],
    symptoms: ['Mild cramping', 'Light spotting (implantation bleeding)', 'Fatigue', 'Tender breasts'],
    prepItems: [PREP_DETAIL.prenatal_vitamins],
  },
  {
    week: 4, grandmaTip: 'Schedule that first prenatal appointment this week, dear.',
    developmentPoints: ['The embryo is the size of a poppy seed', 'The neural tube — future brain and spinal cord — is forming', 'The placenta begins to develop to nourish your baby', 'HCG levels rise rapidly — this is what pregnancy tests detect'],
    symptoms: ['Nausea beginning', 'Breast tenderness', 'Fatigue', 'Frequent urination', 'Mood swings'],
    prepItems: [PREP_DETAIL.prenatal_vitamins],
  },
  {
    week: 8, grandmaTip: 'Try ginger tea and small frequent meals for nausea. It does pass, dear.',
    developmentPoints: ['Baby has distinct facial features forming — nose, mouth, and ears', 'Tiny webbed fingers and toes are growing', 'The heart beats at 150–170 times per minute', 'Baby is moving, though you won\'t feel it for weeks yet'],
    symptoms: ['Morning sickness (often all day)', 'Extreme fatigue', 'Food aversions', 'Heightened sense of smell', 'Bloating'],
    prepItems: [PREP_DETAIL.prenatal_vitamins],
  },
  {
    week: 12, grandmaTip: 'You\'ve made it to the end of the first trimester. The hardest part is behind you.',
    developmentPoints: ['All essential organs have formed and are beginning to function', 'Baby can open and close fists and curl their toes', 'Reflexes are developing rapidly', 'Kidneys begin producing urine'],
    symptoms: ['Nausea starting to ease', 'Headaches', 'Dizziness', 'Visible belly beginning', 'Constipation'],
    prepItems: [PREP_DETAIL.prenatal_vitamins, PREP_DETAIL.anatomy_scan_prep],
  },
  {
    week: 16, grandmaTip: 'Talk to your belly, dear. Your baby can hear you now and your voice is their favorite sound.',
    developmentPoints: ['Baby can make sucking movements and may hiccup', 'Eyes move slowly side to side even though lids remain shut', 'Legs are longer than arms now', 'Bones are hardening from cartilage to bone'],
    symptoms: ['Back aches beginning', 'Round ligament pain', 'Skin changes (linea nigra, melasma)', 'Increased appetite', 'Possible first flutters of movement'],
    prepItems: [PREP_DETAIL.anatomy_scan_prep, PREP_DETAIL.iron_diet],
  },
  {
    week: 20, grandmaTip: 'Halfway there, dear. You are glowing and so is that baby. Celebrate this milestone.',
    developmentPoints: ['Baby can taste the amniotic fluid — what you eat affects their palate', 'Vernix caseosa (waxy coating) begins forming to protect skin', 'Baby has established sleep and wake cycles', 'Eyebrows and eyelashes are forming'],
    symptoms: ['Braxton Hicks contractions beginning', 'Heartburn', 'Backaches', 'Swollen ankles', 'Feeling movements regularly'],
    prepItems: [PREP_DETAIL.anatomy_scan_prep, PREP_DETAIL.birth_plan, PREP_DETAIL.iron_diet],
  },
  {
    week: 24, grandmaTip: 'Talk to your baby, dear. They know your voice and find comfort in it already.',
    developmentPoints: ['Inner ear fully developed — baby hears your heartbeat and voice clearly', 'Eyes can detect light through closed lids', 'Taste buds continue developing on the tongue', 'Lungs are developing the ability to breathe air — a major milestone'],
    symptoms: ['Backaches', 'Swollen feet and ankles', 'Braxton Hicks contractions', 'Heartburn', 'Vivid dreams', 'Shortness of breath'],
    prepItems: [
      PREP_DETAIL.glucose_test_prep,
      PREP_DETAIL.birth_plan,
      PREP_DETAIL.birth_center_tour,
      PREP_DETAIL.iron_diet,
    ],
  },
  {
    week: 28, grandmaTip: 'Start counting kicks every day now. Ten movements in two hours is a healthy sign.',
    developmentPoints: ['Baby can blink, cough, and practice breathing movements', 'Brain is developing billions of neurons', 'Eyes open for the first time this week', 'Baby responds to sound, light, and your touch'],
    symptoms: ['Leg cramps at night', 'Trouble sleeping', 'Pelvic pressure', 'Heartburn worsening', 'Shortness of breath'],
    prepItems: [PREP_DETAIL.kick_counting, PREP_DETAIL.birth_class, PREP_DETAIL.pediatrician],
  },
  {
    week: 32, grandmaTip: 'Pack that hospital bag this week, dear. Babies have a habit of arriving early.',
    developmentPoints: ['Toenails and fingernails are fully formed', 'All five senses are working', 'Baby can process information and respond to stimuli', 'Fat is accumulating under the skin — baby looks more like a newborn'],
    symptoms: ['Frequent urination as baby drops', 'Waddling gait', 'Hemorrhoids', 'Pelvic girdle pain', 'Difficulty sleeping'],
    prepItems: [PREP_DETAIL.hospital_bag, PREP_DETAIL.car_seat, PREP_DETAIL.nursery_prep, PREP_DETAIL.perineal_massage],
  },
  {
    week: 36, grandmaTip: 'You are almost there, dear. Pack that bag and trust your body — it knows what to do.',
    developmentPoints: ['Baby is shedding the protective vernix coating', 'Most babies turn head-down this week', 'Lungs are nearly fully mature', 'Baby gains about 28g of fat per day in preparation for birth'],
    symptoms: ['Pelvic pressure intensifies', 'Lightning crotch', 'Nesting urge', 'Difficulty sleeping', 'Frequent bathroom trips'],
    prepItems: [PREP_DETAIL.hospital_bag, PREP_DETAIL.group_b_strep, PREP_DETAIL.lactation_support, PREP_DETAIL.cord_blood],
  },
  {
    week: 40, grandmaTip: 'Your baby is ready. Your body is ready. Trust it completely, dear.',
    developmentPoints: ['Baby is fully developed and ready to meet you', 'The skull remains flexible for a safe passage through the birth canal', 'Baby has enough fat stores to regulate body temperature', 'Antibodies transferred from you will protect baby for the first months of life'],
    symptoms: ['Irregular contractions', 'Mucus plug loss', 'Increased pelvic pressure', 'Nesting at its peak', 'Back labor possible'],
    prepItems: [PREP_DETAIL.hospital_bag, PREP_DETAIL.birth_plan, PREP_DETAIL.car_seat],
  },
]

// ─── Fallback per trimester ───────────────────────────────────────────────────

const TRIMESTER_SYMPTOMS: Record<1 | 2 | 3, string[]> = {
  1: ['Nausea', 'Fatigue', 'Breast tenderness', 'Frequent urination', 'Food aversions', 'Mood swings'],
  2: ['Backaches', 'Round ligament pain', 'Heartburn', 'Braxton Hicks', 'Increased appetite', 'Skin changes'],
  3: ['Pelvic pressure', 'Trouble sleeping', 'Swelling', 'Shortness of breath', 'Leg cramps', 'Frequent urination'],
}

const TRIMESTER_PREP: Record<1 | 2 | 3, PrepItem[]> = {
  1: [PREP_DETAIL.prenatal_vitamins],
  2: [PREP_DETAIL.birth_plan, PREP_DETAIL.iron_diet, PREP_DETAIL.birth_center_tour],
  3: [PREP_DETAIL.hospital_bag, PREP_DETAIL.car_seat, PREP_DETAIL.nursery_prep],
}

function getTrimester(week: number): 1 | 2 | 3 {
  if (week <= 13) return 1
  if (week <= 26) return 2
  return 3
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getWeekDetail(week: number): WeekDetail {
  // Find nearest exact match, then fall back to trimester defaults
  const exact = WEEK_DETAILS.find(d => d.week === week)
  if (exact) return exact

  // Find nearest defined week (within 4 weeks)
  const nearby = WEEK_DETAILS
    .filter(d => Math.abs(d.week - week) <= 4)
    .sort((a, b) => Math.abs(a.week - week) - Math.abs(b.week - week))[0]

  if (nearby) {
    return { ...nearby, week }
  }

  // Trimester fallback
  const tri = getTrimester(week)
  return {
    week,
    grandmaTip: 'Take it one day at a time, dear. You are doing beautifully.',
    developmentPoints: ['Your baby is growing and developing every single day', 'All major systems are forming and strengthening', 'Your body is adapting to support your growing baby', 'Every week brings new milestones for you both'],
    symptoms: TRIMESTER_SYMPTOMS[tri],
    prepItems: TRIMESTER_PREP[tri],
  }
}

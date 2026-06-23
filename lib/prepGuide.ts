/**
 * prepGuide — builds richer detail copy for a PrepItemDef.
 *
 * Each entry is keyed by sticker icon and returns:
 *   - why: 1–2 sentences on why this matters now
 *   - how: 3–5 actionable bullet points
 *   - watch: 1–2 sentences on warning signs or when to call your provider
 *
 * Title-keyed overrides take precedence over the icon defaults so unique items
 * (e.g. "Take a pregnancy test" vs generic "test") get tailored guidance.
 */

import type { PrepItemDef } from './weekContent'
import type { StickerIconName } from '../components/home/pregnancy/stickerIcons'

export interface PrepGuide {
  why: string
  how: string[]
  watch?: string
}

// ─── Icon → default guide ────────────────────────────────────────────────────
const ICON_GUIDES: Partial<Record<StickerIconName, PrepGuide>> = {
  leaf: {
    why: 'Whole foods and prenatal-friendly nutrients lay the foundation for cell growth, hormone balance, and steady energy in this stage.',
    how: [
      'Build plates around colorful vegetables, lean protein, and whole grains.',
      'Add a serving of leafy greens (folate) and beans or lentils (iron) most days.',
      'Snack on nuts, seeds, and yogurt to keep blood sugar stable.',
      'If meat aversion hits, lean on eggs, tofu, beans, and fortified cereals.',
    ],
    watch: 'Talk to your provider if appetite stays low for several days or if you can\'t keep food down — anti-nausea support is available.',
  },
  pill: {
    why: 'Folate, iron, iodine, and DHA are difficult to get in adequate amounts from diet alone — a daily prenatal closes the gap.',
    how: [
      'Take your prenatal at the same time each day to build a habit.',
      'Pair with food and a glass of water if it upsets your stomach.',
      'Look for at least 400–600 mcg folate, 27 mg iron, 150 mcg iodine, 200 mg DHA.',
      'If a prior pregnancy had a neural tube defect, ask your provider — they may prescribe ~4,000 mcg folate/day.',
      'Methylfolate is gentler than folic acid for some people.',
    ],
    watch: 'Constipation, dark stools, and mild nausea are common. If iron makes you very nauseous, ask about a split-dose or every-other-day plan.',
  },
  drop: {
    why: 'Blood volume rises ~50% during pregnancy. Hydration eases nausea, prevents headaches, supports amniotic fluid, and reduces swelling.',
    how: [
      'Aim for 8–10 cups of fluids a day; more if you exercise or it\'s hot.',
      'Sip steadily — large gulps can worsen nausea.',
      'Add lemon, cucumber, or mint if plain water feels boring.',
      'Broth, decaf tea, milk, and watery fruit (watermelon, oranges) all count.',
    ],
    watch: 'Very dark urine, dizziness, or rapid heartbeat — drink and rest. Persistent vomiting that prevents fluids needs a same-day call to your provider.',
  },
  apple: {
    why: 'Steady fuel from balanced snacks keeps blood sugar even, which helps with nausea, energy, and your baby\'s consistent nutrient supply.',
    how: [
      'Pair carbs with protein or fat (apple + peanut butter, crackers + cheese).',
      'Keep bland options bedside — crackers help morning nausea.',
      'Eat every 2–3 hours; don\'t wait until you\'re ravenous.',
      'Limit added-sugar snacks to avoid energy crashes.',
    ],
  },
  mug: {
    why: 'Caffeine crosses the placenta and your baby can\'t metabolize it efficiently. Most providers suggest staying under 200 mg/day.',
    how: [
      '1 small cup of brewed coffee (~95 mg) is generally fine.',
      'Watch hidden sources: tea, soda, chocolate, energy drinks.',
      'Try half-caf, decaf, or rooibos as a swap.',
      'Drink water alongside to stay hydrated.',
    ],
  },
  stethoscope: {
    why: 'A first prenatal visit confirms dating, screens for anything that needs early attention, and sets your care plan.',
    how: [
      'Bring a list of medications, supplements, and any allergies.',
      'Know the date of your last menstrual period.',
      'Note family medical history (both sides) for genetic screening.',
      'Write down questions in advance — visits go quickly.',
    ],
  },
  scan: {
    why: 'Ultrasounds give a milestone snapshot — confirming heartbeat, dating, and screening for structural development.',
    how: [
      'Drink water beforehand if your provider asks (early scans need a full bladder).',
      'Wear loose two-piece clothing for easier abdomen access.',
      'Bring a partner or support person if you\'d like to share the moment.',
      'Ask for a printout or send-home photos to keep.',
    ],
  },
  test: {
    why: 'Targeted blood and urine tests at this point catch conditions that benefit from early management — anemia, infections, gestational diabetes, immunity.',
    how: [
      'Confirm fasting requirements with your provider beforehand.',
      'Hydrate well so blood draws go smoothly.',
      'Ask for a copy of results so you can track them across visits.',
      'Note dates so follow-up tests aren\'t missed.',
    ],
  },
  syringe: {
    why: 'Pregnancy-safe vaccines protect both you and your baby from illnesses that hit harder in pregnancy or in the newborn period.',
    how: [
      'Flu shot is recommended any trimester during flu season.',
      'Tdap is given between weeks 27–36 to pass whooping cough antibodies.',
      'COVID-19 boosters per current guidance.',
      'Avoid live vaccines (MMR, varicella) until postpartum.',
    ],
  },
  calendar: {
    why: 'Tracking dates and patterns turns vague impressions into useful data — for you and for your provider.',
    how: [
      'Log appointments, milestones, and symptoms in one place.',
      'Note kick patterns from week 28 onward.',
      'Mark medication and supplement timings.',
      'Review with your partner so they know what\'s next.',
    ],
  },
  moon: {
    why: 'Sleep is when growth, repair, and emotional regulation happen — for both of you. Pregnancy reshapes sleep, so habits matter more.',
    how: [
      'Aim for 8–10 hours; nap when possible.',
      'Side-sleep (left preferred) once your belly grows — improves blood flow.',
      'Wedge a pillow between knees and another under the bump.',
      'Wind down 60 min before bed: dim lights, no screens, gentle stretches.',
    ],
    watch: 'Loud snoring, gasping, or daytime exhaustion that doesn\'t lift can signal sleep apnea — bring it up at your next visit.',
  },
  yoga: {
    why: 'Gentle movement eases tension, supports circulation, and prepares your body for labor — without raising injury risk.',
    how: [
      'Look for prenatal-specific classes or videos.',
      'Skip deep twists, lying flat on back after week 20, and inversions.',
      'Listen to your body — modify or rest at any moment.',
      '20–30 min, 3–5 times a week is plenty.',
    ],
  },
  walk: {
    why: 'Walking is the safest, most accessible cardio in pregnancy — easy on joints, helpful for digestion, sleep, and mood.',
    how: [
      'Aim for 20–30 min most days at a conversational pace.',
      'Wear supportive shoes and stay hydrated.',
      'Avoid uneven trails as your center of gravity shifts.',
      'Layer up — your core temperature runs higher now.',
    ],
  },
  heart: {
    why: 'Connection, communication, and intimacy with your partner are part of the prep — emotional bandwidth matters as much as nutrition.',
    how: [
      'Share what feels supportive and what doesn\'t.',
      'Make time for non-baby conversations.',
      'Discuss labor support, parenting values, and division of duties early.',
      'Physical closeness in any form helps you feel like a team.',
    ],
  },
  crib: {
    why: 'Setting up baby\'s sleep space well in advance lowers stress and gives you time to learn safe-sleep guidelines.',
    how: [
      'Firm flat mattress, fitted sheet, no bumpers, blankets, or toys.',
      'Place crib away from blinds, cords, and direct vents.',
      'Practice safe-sleep ABCs: Alone, on Back, in a Crib.',
      'Test the height settings while you can still bend easily.',
    ],
  },
  bottle: {
    why: 'Whether you plan to breastfeed, bottle-feed, or both, having a few essentials lined up means you\'re not scrambling at 3 AM.',
    how: [
      'Talk to a lactation counselor before birth — even if uncertain.',
      'Stock 2–3 bottles to start; buy more once you know what baby prefers.',
      'Have a sterilizer or large pot ready for cleaning.',
      'Read up on paced bottle feeding to avoid nipple confusion.',
    ],
  },
  teddy: {
    why: 'A small comfort object, song, or story routine becomes part of how baby learns the world — and it doesn\'t need to be expensive.',
    how: [
      'Pick one stuffed friend or blanket to introduce later (after 12 months for sleep).',
      'Start humming or singing the same song now — baby will recognize it.',
      'Keep nursery soft, low-stim, and clutter-free.',
    ],
  },
  car: {
    why: 'Hospitals require an installed, rear-facing car seat before discharge. Installing it correctly takes practice.',
    how: [
      'Choose an infant car seat rated for your baby\'s expected weight.',
      'Install with either LATCH or seatbelt — never both.',
      'Get a free check at a local fire station or CPST inspector.',
      'Practice buckling a doll in so it\'s muscle memory.',
    ],
  },
  bag: {
    why: 'Having a hospital bag packed by week 36 means you can leave at any hour without scrambling.',
    how: [
      'Mom: ID, insurance card, robe, slippers, going-home outfit, snacks, phone charger, toiletries.',
      'Baby: 2 outfits, swaddle, hat, going-home outfit.',
      'Partner: snacks, phone charger, change of clothes.',
      'Documents: birth plan, ID, hospital paperwork.',
    ],
  },
  book: {
    why: 'A little prep reading or class time lowers anxiety because you know what to expect at each stage.',
    how: [
      'Pick one trusted resource and stick with it — too many sources confuse.',
      'Childbirth education classes are usually 4–6 weeks.',
      'Online options exist if scheduling is hard.',
      'Skim about the postpartum period too — it\'s often under-covered.',
    ],
  },
  pencil: {
    why: 'Writing it down — births plans, questions, feelings — makes invisible work visible and helps your team support you.',
    how: [
      'Keep a small notebook or notes app dedicated to pregnancy.',
      'Jot questions as they come up so you don\'t forget at appointments.',
      'Track symptoms with date + intensity — patterns reveal themselves.',
    ],
  },
  clipboard: {
    why: 'Following up on results closes the loop — what looked normal might need a recheck, and you want to catch that early.',
    how: [
      'Ask your provider to walk through each result, not just "all normal".',
      'Save reports in one folder — physical or digital.',
      'Note any flagged values and the recheck timing.',
    ],
  },
  phone: {
    why: 'Setting up your care team and emergency contacts before you need them removes friction at the moments it matters most.',
    how: [
      'Save your provider\'s after-hours line in your phone.',
      'Write the labor & delivery line on the fridge.',
      'Set partner / doula / family contacts as ICE numbers.',
    ],
  },
  bulb: {
    why: 'Big decisions get easier when you understand the trade-offs — birth setting, pain management, feeding plans.',
    how: [
      'Tour 2–3 birth options if available (hospital, birth center, home).',
      'Ask: cesarean rate, doula policy, immediate skin-to-skin, partner staying overnight.',
      'Read patient reviews; talk to people who delivered there recently.',
      'Trust your gut after gathering info.',
    ],
  },
  home: {
    why: 'Small changes around the house — and small visits in the calendar — make pregnancy and the early postpartum way smoother.',
    how: [
      'Move daily-use items to waist height now to avoid bending later.',
      'Stock easy meals you can heat one-handed.',
      'Clear walkways for nighttime trips to the bathroom.',
    ],
  },
  briefcase: {
    why: 'Knowing your leave, benefits, and short-term disability options early gives you time to plan finances and communicate at work.',
    how: [
      'Read your company handbook on parental leave + STD policy.',
      'Confirm dates with HR in writing.',
      'Plan a transition document for your team.',
      'Know your legal protections (FMLA / equivalent in your country).',
    ],
  },
  star: {
    why: 'Milestone moments — first kicks, anatomy scan, third trimester — are worth pausing for.',
    how: [
      'Take a photo or write a sentence about how you feel today.',
      'Share with people who lift you up.',
      'Celebrate however feels right, big or small.',
    ],
  },
  flower: {
    why: 'You\'re entering a new phase. Some quiet self-acknowledgment helps the transition land.',
    how: [
      'Notice what feels different — body, sleep, mood, focus.',
      'Make space to share with your partner or a friend.',
      'A small ritual (a walk, a meal, a journal entry) marks the moment.',
    ],
  },
  hourglass: {
    why: 'Time pressure is real this trimester — items checked off now are weight off your plate later.',
    how: [
      'Pick the top 3 items that have hard deadlines and tackle those first.',
      'Delegate one item to your partner this week.',
      'Don\'t aim for a perfect setup — aim for a workable one.',
    ],
  },
  bath: {
    why: 'Warm baths ease aches, calm the nervous system, and help with sleep — with a couple of pregnancy-safe rules.',
    how: [
      'Keep water under 100 °F / 38 °C — no hot tubs.',
      'Limit baths to 15 min so your core temp doesn\'t rise.',
      'Use unscented Epsom salts for muscle relief.',
      'Have a non-slip mat in the tub.',
    ],
  },
  dumbbell: {
    why: 'Pelvic-floor and core strength now means easier labor, lower incontinence risk later, and faster recovery.',
    how: [
      'Kegels: squeeze pelvic floor 3 sec, release 3 sec — 10 reps, 3 times a day.',
      'Squats and bridges (with form) keep glutes and hips strong.',
      'Skip crunches and any move that pushes the belly forward.',
      'A pelvic-floor PT consult is gold if you have access.',
    ],
  },
  checklist: {
    why: 'Birth and baby prep have a long list — breaking it into bite-sized weeks beats trying to do it all at once.',
    how: [
      'Pick 1–2 items per week to research or buy.',
      'Cross off as you go — visible progress feels good.',
      'Ask experienced friends what they actually used vs. what was clutter.',
    ],
  },
  gift: {
    why: 'Showers and registries are practical (gear) and emotional (community lifting you up). Both matter.',
    how: [
      'Build a registry across price points so guests have options.',
      'Include consumables (diapers, wipes) — they vanish fast.',
      'A virtual or hybrid shower works if travel is hard.',
    ],
  },
  handshake: {
    why: 'Aligning with your partner now on parenting values, division of labor, and support during birth prevents friction later.',
    how: [
      'Have one "no-phones, no-distractions" conversation per week.',
      'Talk through the first month: who does what, when.',
      'Discuss boundaries with extended family / visitors.',
    ],
  },
  candle: {
    why: 'Stress hormones cross the placenta. Calming practices benefit both of you.',
    how: [
      'Try 5 min of slow breathing before bed.',
      'Body scan, gentle yoga, or guided meditation apps.',
      'Limit doomscrolling — it spikes cortisol without giving info you can act on.',
    ],
  },
  map: {
    why: 'Knowing the route, parking, and entrance to your birth location reduces panic when contractions are 5 minutes apart.',
    how: [
      'Drive there in normal traffic and during rush hour.',
      'Note the after-hours entrance and labor & delivery floor.',
      'Save parking instructions in your phone.',
    ],
  },
  nosmoke: {
    why: 'Cigarette and second-hand smoke exposure raise risks for low birth weight, prematurity, and stillbirth. Quitting at any time helps.',
    how: [
      'Ask your provider about pregnancy-safe cessation supports.',
      'Avoid spaces where others smoke.',
      'Replace the habit with a small ritual — tea, a walk, a chew.',
    ],
    watch: 'Any cravings, withdrawal, or relapse — talk to your provider, not Dr. Google. Help is judgment-free.',
  },
  tooth: {
    why: 'Pregnancy hormones inflame gums (pregnancy gingivitis), and untreated dental disease is linked to preterm birth.',
    how: [
      'Schedule a cleaning in the second trimester.',
      'Brush twice a day with soft bristles, floss daily.',
      'Rinse with water after morning sickness — enamel softens after vomiting.',
    ],
  },
  shoe: {
    why: 'Feet swell and arches change. Supportive footwear protects your back, hips, and pelvis.',
    how: [
      'Switch heels for cushioned flats or sneakers.',
      'Look for arch support and a wider toe box.',
      'Compression socks on long days reduce ankle swelling.',
    ],
  },
  music: {
    why: 'From around week 16 baby can hear — voices, music, your heartbeat. Sound is the first connection.',
    how: [
      'Talk to your bump — narration is enough.',
      'Pick a song or two to play often; baby may calm to them after birth.',
      'Have your partner read or sing to recognize their voice.',
    ],
  },
  steak: {
    why: 'Iron supports the rapid expansion of your blood volume. Low iron causes fatigue and increases preterm-birth risk.',
    how: [
      'Pair iron foods (red meat, beans, spinach) with vitamin C (citrus, peppers) for absorption.',
      'Avoid pairing with coffee or tea — they block absorption.',
      'Cook in cast iron when you can — it boosts iron content.',
    ],
  },
  basket: {
    why: 'Registries are how friends and family pitch in. Knowing what you actually need vs. what marketing says is the trick.',
    how: [
      'Essentials: car seat, safe sleep space, diapers, wipes, a few basic clothes.',
      'Skip elaborate single-purpose gadgets early on.',
      'Ask people who recently had a baby — they\'ll tell you the truth.',
    ],
  },
  family: {
    why: 'Telling people is personal. Some wait until 12 weeks; others share earlier. Both are right.',
    how: [
      'Decide together with your partner whom + when.',
      'Practice what to say if someone asks awkward questions.',
      'Plan how to share with anyone you\'d want support from in case of loss.',
    ],
  },
  microbe: {
    why: 'Some infections in pregnancy can affect baby — a few simple habits dramatically reduce risk.',
    how: [
      'Wash hands often, especially around young children and raw food.',
      'Avoid undercooked meat, deli meat (unless heated), unpasteurized dairy, raw fish.',
      'Use gloves for cat litter and gardening.',
    ],
  },
  baby: {
    why: 'You\'re moving from "preparing" to "meeting" — small choices now (feeding plan, pediatrician, support) shape the first weeks.',
    how: [
      'Interview pediatricians; pick by week 36.',
      'Decide your feeding plan, but stay flexible.',
      'Line up postpartum help — meals, errands, a friend who listens.',
    ],
  },
  plate: {
    why: 'Quality over calories. A few extra hundred calories of protein-, iron-, and folate-rich food beats a big sugary meal.',
    how: [
      'Half the plate vegetables, a quarter protein, a quarter whole grains.',
      'Add healthy fats (olive oil, avocado, nuts).',
      'Eggs, beans, fish (low-mercury), tofu are excellent staples.',
    ],
  },
  siren: {
    why: 'Knowing what counts as urgent vs. wait-and-see saves a lot of late-night anxiety.',
    how: [
      'Call right away for: bleeding, severe headache, vision changes, sudden swelling, no fetal movement (after week 28).',
      'Same-day call for: persistent vomiting, fever > 38 °C / 100.4 °F, painful urination.',
      'Save your provider\'s after-hours line where you can find it fast.',
    ],
  },
  couch: {
    why: 'Rest isn\'t laziness — it\'s your body doing huge metabolic work. Push less; recover more.',
    how: [
      'Take a 20-min lie-down when you can.',
      'Elevate feet at the end of the day.',
      'Lower the bar on chores and accept help.',
    ],
  },
  sparkle: {
    why: 'A milestone or announcement is worth a beat of celebration before you barrel into the next checklist.',
    how: [
      'Capture the moment — photo, voice memo, journal line.',
      'Share with someone who will react well.',
      'Put it on the calendar so future-you remembers.',
    ],
  },
  wine: {
    why: 'No amount of alcohol is considered safe in pregnancy. Cutting it out completely removes risk to baby\'s brain development.',
    how: [
      'Switch to alcohol-free options at social events.',
      'Tell trusted people so they don\'t pour you a glass.',
      'Have a stock of fun zero-proof drinks at home.',
    ],
  },
}

// ─── Title-keyed overrides (regex against item.t) ────────────────────────────
const TITLE_OVERRIDES: Array<{ match: RegExp; guide: PrepGuide }> = [
  {
    match: /pregnancy test/i,
    guide: {
      why: 'A home pregnancy test detects hCG in urine — by the time of a missed period, accuracy is over 99% with most modern tests.',
      how: [
        'Test with first-morning urine for the highest hCG concentration.',
        'Read results within the time window on the box (usually 3–5 min).',
        'A faint line still counts as positive — repeat the next morning to confirm.',
        'A negative test with continued missed period: retest in 3–4 days.',
      ],
      watch: 'A positive home test still benefits from a confirming visit so dating, blood work, and care plan get started.',
    },
  },
  {
    match: /book.*OB|first.*appointment|first.*visit/i,
    guide: {
      why: 'The first prenatal visit (typically week 8–12) confirms the pregnancy, dates it, and screens for anything that benefits from early support.',
      how: [
        'Bring a list of medications, supplements, and any allergies.',
        'Know the date of your last menstrual period.',
        'Bring family medical history from both sides.',
        'Write down questions in advance — visits are quick.',
      ],
    },
  },
  {
    match: /NIPT|cell-free|noninvasive/i,
    guide: {
      why: 'NIPT screens fetal DNA in your blood for trisomy 13/18/21 and (optionally) sex from week 10. It\'s highly sensitive but a screen, not a diagnosis.',
      how: [
        'Confirm coverage and out-of-pocket cost with your insurer beforehand.',
        'Ask whether you want sex disclosed at the result reveal.',
        'Results take 1–2 weeks.',
        'Positive screens go to follow-up diagnostic testing — don\'t panic on a screen result alone.',
      ],
    },
  },
  {
    match: /anatomy scan|20.?week scan/i,
    guide: {
      why: 'The anatomy scan (typically weeks 18–22) is a head-to-toe ultrasound check of baby\'s organs, bones, and growth.',
      how: [
        'Hydrate the day before so amniotic fluid levels look good.',
        'It can run 30–60 min — eat a small snack first.',
        'Bring your partner if you\'d like — many parents share the moment.',
        'Decide in advance whether you want sex revealed or kept private.',
      ],
    },
  },
  {
    match: /glucose|GTT|gestational diabetes/i,
    guide: {
      why: 'Universal screening between weeks 24–28 catches gestational diabetes — common, treatable, and important to manage for both of you.',
      how: [
        'Drink the glucose solution within the time window your clinic specifies.',
        'A 1-hr screen is the typical first step; an elevated result triggers a 3-hr confirmatory test.',
        'Eat normally in the days before — no special diet.',
        'Avoid heavy sugar the morning of the test.',
      ],
    },
  },
  {
    match: /strep|GBS/i,
    guide: {
      why: 'Group B Strep screening (weeks 36–37) tells your team whether to give antibiotics during labor to protect baby from infection.',
      how: [
        'It\'s a quick swab — vaginal and rectal — done in clinic.',
        'No prep needed; results in a few days.',
        'Positive means IV antibiotics during labor (this is routine, not scary).',
      ],
    },
  },
  {
    match: /count.*kicks|kick count|fetal movement/i,
    guide: {
      why: 'From week 28, daily kick counts give you a sense of baby\'s baseline pattern — and a way to spot changes early.',
      how: [
        'Pick the same time each day, ideally after a meal when baby is active.',
        'Lie on your side and count distinct movements.',
        'Most providers want 10 movements within 2 hours.',
        'Apps make tracking easy — or a simple paper tally works.',
      ],
      watch: 'A clear drop in normal movement, especially after week 28, is a same-day call to your provider — even if it\'s 2 AM.',
    },
  },
  {
    match: /birth plan/i,
    guide: {
      why: 'A birth plan is less about scripting the day and more about aligning with your team on values: pain management, support people, immediate skin-to-skin, feeding intentions.',
      how: [
        'Keep it to one page — your team will skim it.',
        'Cover: support people, pain plan, fetal monitoring preference, position freedom, immediate skin-to-skin, cord clamping, feeding plan.',
        'Mark items as preferences vs. firm boundaries.',
        'Share it with your provider before labor and bring copies to the hospital.',
      ],
    },
  },
  {
    match: /pediatrician|baby.*doctor/i,
    guide: {
      why: 'You\'ll see your pediatrician many times in the first year. Picking someone you click with — and who is in network — pays off.',
      how: [
        'Interview 2–3 in your final trimester (most do free meet-and-greets).',
        'Ask about: same-day sick visits, after-hours line, lactation support, feeding philosophy, vaccine schedule.',
        'Confirm the baby\'s first appointment is scheduled before discharge.',
      ],
    },
  },
  {
    match: /pelvic.?floor|kegel/i,
    guide: {
      why: 'Pelvic floor strength supports baby\'s weight, makes pushing more effective, and protects you from incontinence and prolapse postpartum.',
      how: [
        'Squeeze the muscles you\'d use to stop urinating — without engaging glutes or abs.',
        'Hold 3–5 sec, release 3–5 sec.',
        '10 reps, 3 times a day.',
        'A pelvic-floor physical therapist consult is the gold standard if accessible.',
      ],
    },
  },
  {
    match: /track.*cycle|basal.*temp/i,
    guide: {
      why: 'Tracking your cycle helps you predict ovulation, time intercourse during the fertile window, and date a future pregnancy accurately.',
      how: [
        'Log period start dates — most cycles run 21–35 days.',
        'Track cervical mucus changes — clear and stretchy means peak fertility.',
        'Take basal body temperature first thing each morning before getting up.',
        'A 0.4–0.8°F sustained rise confirms ovulation has happened.',
      ],
    },
  },
]

const FALLBACK: PrepGuide = {
  why: 'This step is part of pregnancy and birth prep — small, regular actions add up to a lot of progress over the weeks.',
  how: [
    'Read a trusted source for the latest guidance.',
    'Add it to your calendar so it actually happens.',
    'Loop in your partner or support person.',
  ],
}

export function getPrepGuide(item: PrepItemDef, week?: number): PrepGuide {
  // Title overrides win
  for (const ov of TITLE_OVERRIDES) {
    if (ov.match.test(item.t)) return ov.guide
  }
  const guide = ICON_GUIDES[item.i] ?? FALLBACK
  // Inject week phrasing into the why for a touch of context (optional)
  if (week && week > 0) {
    return { ...guide }
  }
  return guide
}

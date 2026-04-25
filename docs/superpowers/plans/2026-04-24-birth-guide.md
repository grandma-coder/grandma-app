# Birth Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a comprehensive Birth Guide to the pregnancy home screen — compact banner entry point → topic grid landing modal → accordion detail screens covering 4 birth types and 7 supporting topics.

**Architecture:** Three new files (data, landing modal, detail modal) plus a targeted edit to PregnancyHome. All content is local (no Supabase). Both modals follow the existing React Native `Modal` pattern already used in PregnancyHome. `BirthDetailModal` is mounted inside `BirthGuideModal` so state is self-contained.

**Tech Stack:** React Native Modal, StyleSheet, PaperCard, Typography (Display/MonoCaps/Body), useTheme, expo-router, existing birthData.ts for hospital bag content.

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `lib/birthGuideData.ts` | All topic types + full content for 11 topics |
| Create | `components/pregnancy/BirthDetailModal.tsx` | Accordion detail sheet for any topic |
| Create | `components/pregnancy/BirthGuideModal.tsx` | Landing grid — 4 birth type cards + 7 topic rows |
| Modify | `components/home/PregnancyHome.tsx` | Replace BirthGuidePreview section with compact banner + wire modal |
| Delete | `components/home/pregnancy/BirthGuidePreview.tsx` | Replaced by new entry point |

---

## Task 1: Content data — `lib/birthGuideData.ts`

**Files:**
- Create: `lib/birthGuideData.ts`

- [ ] **Step 1: Create the file with all types, topic metadata, and full section content**

```ts
// lib/birthGuideData.ts
import { hospitalBagChecklist } from './birthData'

export type BirthTopicKey =
  | 'natural'
  | 'csection'
  | 'home'
  | 'water'
  | 'labor-stages'
  | 'warning-signs'
  | 'hospital-bag'
  | 'pain-relief'
  | 'positions'
  | 'partner-guide'
  | 'recovery'

export interface BirthSection {
  title: string
  content: string
  bullets?: string[]
}

export interface BirthTopic {
  key: BirthTopicKey
  emoji: string
  title: string
  subtitle: string
  heroColor: string
  heroBorder: string
  sections: BirthSection[]
}

export const BIRTH_TOPICS: BirthTopic[] = [
  {
    key: 'natural',
    emoji: '🌿',
    title: 'Natural Birth',
    subtitle: 'Breathing, positions, stages',
    heroColor: '#E8F8E8',
    heroBorder: '#B7E5B7',
    sections: [
      {
        title: 'What is natural birth?',
        content:
          'Natural birth means a vaginal delivery without medical pain interventions like an epidural or induction. The focus is on your body\'s own ability to birth your baby, supported by breathing techniques, movement, and the people around you. It\'s not about suffering — it\'s about informed choice.',
      },
      {
        title: 'Labor stages',
        content: 'Labor unfolds in four phases. Early labor (cervix 0–6cm) can last 6–12 hours in a first birth — stay home, rest, and eat lightly. Active labor (6–10cm) brings contractions every 3–5 minutes lasting 60–90 seconds — this is when you go to hospital. Transition (8–10cm) is the most intense but shortest phase. Pushing follows, lasting anywhere from a few minutes to 2 hours.',
        bullets: [
          'Early labor: irregular contractions, cervix 0–6cm, stay home',
          'Active labor: 5-1-1 rule → contractions every 5 min, 1 min long, for 1 hour',
          'Transition: 8–10cm, very intense, usually 15–60 min',
          'Pushing: urge to bear down, breathe baby down or coached pushing',
          'Golden hour: immediate skin-to-skin, delayed cord clamping 1–3 min',
        ],
      },
      {
        title: 'Pain relief without medication',
        content: 'Many people manage labor pain effectively without an epidural using a combination of techniques.',
        bullets: [
          'Breathing techniques: slow breathing in early labor, patterned breathing in active labor',
          'Movement: walking, rocking, swaying — gravity helps the baby descend',
          'Water: warm shower or bath relaxes muscles and reduces pain sensation',
          'TENS machine: small electrical pulses that interrupt pain signals — start early',
          'Hypnobirthing: self-hypnosis and deep relaxation practiced before labor',
          'Doula support: continuous professional support reduces pain perception by ~10%',
        ],
      },
      {
        title: 'Birth positions',
        content: 'Upright and forward-leaning positions use gravity and open the pelvis. Avoid lying flat on your back — it compresses the vena cava and can slow labor.',
        bullets: [
          'Upright standing: best for gravity, lean on partner between contractions',
          'Squatting: widens pelvic outlet by up to 30% — use birthing bar or partner support',
          'Hands & knees: relieves back labor, good for babies in posterior position',
          'Side-lying: rest position for a long labor, partner supports upper leg',
          'Birthing ball: rocking and hip circles relieve pressure and encourage descent',
        ],
      },
      {
        title: 'Pros & considerations',
        content: 'Natural birth has real benefits but also real demands. Going in informed means no surprises.',
        bullets: [
          'Pros: faster physical recovery, immediate uninterrupted skin-to-skin, no medication side effects, easier breastfeeding initiation, baby receives beneficial bacteria from birth canal',
          'Consider: contractions are very intense — this is normal, not a sign of danger',
          'Consider: labor can be long and unpredictable, especially a first birth',
          'Consider: if complications arise you may need an emergency C-section — this is not a failure',
        ],
      },
      {
        title: 'Recovery',
        content: 'Recovery after a vaginal birth is typically faster than after a C-section. Most people feel ready to walk within hours.',
        bullets: [
          'First hour: deliver placenta (5–30 min after baby), skin-to-skin, first breastfeed',
          'Perineum: if you had a tear or episiotomy, stitches dissolve in 2–4 weeks',
          'Lochia: postpartum bleeding lasts 4–6 weeks — red then pink then creamy',
          'Rest and nourishment are the only priorities for the first 2 weeks',
        ],
      },
    ],
  },
  {
    key: 'csection',
    emoji: '🏥',
    title: 'C-Section',
    subtitle: 'Surgery, recovery, VBAC',
    heroColor: '#F0EBFF',
    heroBorder: '#C4B5FD',
    sections: [
      {
        title: 'What is a C-section?',
        content: 'A caesarean section is a surgical birth through an incision in the abdomen and uterus. It may be planned in advance (elective) or performed as an emergency during labor. About 1 in 3 births in many countries is a C-section — it\'s a major surgery, but also a completely valid birth.',
        bullets: [
          'Planned: scheduled before labor for breech, placenta praevia, twins, maternal request',
          'Emergency: unplanned, performed when labor complications arise',
          'Most C-sections are performed under spinal or epidural anaesthesia — you are awake',
        ],
      },
      {
        title: 'What happens in the OR',
        content: 'The procedure takes about 45–60 minutes from first incision to closing. You\'ll be awake behind a screen.',
        bullets: [
          'Prep: IV line, catheter, spinal or epidural top-up, antiseptic wash',
          'Who\'s in the room: surgeon, assistant, anaesthetist, scrub nurse, midwife, your support person',
          'Incision: horizontal "bikini line" cut through 7 layers — you feel pressure but not pain',
          'Baby out in ~5 minutes; the rest of the time is closing the layers',
          'Skin-to-skin is possible in theatre — ask for it in your birth plan',
        ],
      },
      {
        title: 'Recovery timeline',
        content: 'C-section recovery is longer than vaginal birth recovery because it\'s major abdominal surgery. Take it seriously.',
        bullets: [
          'Day 1–3 (hospital): catheter out at ~12h, gentle walking by day 1, pain managed with regular paracetamol and ibuprofen',
          'Week 1–2 (home): no lifting anything heavier than your baby, no driving, wound care daily',
          'Week 2–6: wound heals over, scar forms, gradually increase activity',
          'Week 6+: cleared by doctor for exercise, sex, swimming',
          'Scar massage from week 8 onwards softens the scar and reduces sensitivity',
        ],
      },
      {
        title: 'VBAC — Vaginal Birth After C-Section',
        content: 'If you\'ve had a previous C-section, a vaginal birth may still be possible in a subsequent pregnancy. VBAC success rates are 60–80% for suitable candidates.',
        bullets: [
          'You\'re a candidate if: one previous low transverse C-section, no other uterine surgery, no repeat reason for C-section',
          'Main risk: uterine rupture (0.5–1%) — monitored closely in hospital',
          'Benefits: faster recovery, avoids repeat surgery risks, better for subsequent pregnancies',
          'Ask your provider: "Am I a VBAC candidate? What\'s my hospital\'s VBAC rate?"',
        ],
      },
      {
        title: 'Pros & considerations',
        content: 'C-sections are life-saving in the right circumstances. When planned, they offer predictability.',
        bullets: [
          'Pros: predictable timing, no perineal tearing, necessary and safe when indicated',
          'Consider: longer recovery (4–6 weeks vs 1–2 weeks vaginal)',
          'Consider: increased risk of infection, blood clots, adhesions in future pregnancies',
          'Consider: baby misses beneficial bacteria from vaginal birth — seeding can partly address this',
        ],
      },
      {
        title: 'Emotional support',
        content: 'An unplanned C-section can feel like a loss, especially if you had a different birth in mind. Your feelings are valid.',
        bullets: [
          'Grief for the birth you planned is real — allow it, don\'t dismiss it',
          'Bonding after C-section is not delayed — skin-to-skin in recovery, kangaroo care',
          'Your partner\'s role: advocate in theatre, be present in recovery, do skin-to-skin if you can\'t',
          'Postnatal debrief: ask your hospital for a birth review if you have unanswered questions',
        ],
      },
    ],
  },
  {
    key: 'home',
    emoji: '🏡',
    title: 'Home Birth',
    subtitle: 'Midwife, safety, planning',
    heroColor: '#E8F0FF',
    heroBorder: '#B7C8F5',
    sections: [
      {
        title: 'What is home birth?',
        content: 'Home birth means giving birth in your own home with a qualified midwife present throughout labor and birth. In many countries it\'s a well-established option for low-risk pregnancies, with outcomes comparable to hospital birth for this group.',
      },
      {
        title: 'Is it right for you?',
        content: 'Home birth is suitable for people with low-risk pregnancies. Your midwife will assess your eligibility.',
        bullets: [
          'Good candidates: singleton pregnancy, cephalic (head-down) presentation, no significant medical conditions, previous uncomplicated birth (reduces transfer risk)',
          'Contraindications: multiple pregnancy, placenta praevia, pre-eclampsia, GBS positive (varies by country), previous C-section (varies)',
          'Questions to ask: "What is the transfer rate at your service?" "How far is my nearest hospital?" "What equipment do you bring?"',
        ],
      },
      {
        title: 'Choosing a midwife',
        content: 'Your midwife is the most important factor in a safe home birth. Credentials and experience matter.',
        bullets: [
          'CNM (Certified Nurse-Midwife): RN with midwifery master\'s degree — legal in all US states',
          'CPM (Certified Professional Midwife): direct-entry midwife — legal in ~35 US states',
          'Ask: How many births per year? What\'s your transfer rate? What\'s your hospital backup?',
          'Two midwives at birth is standard — one for you, one for the baby',
          'Interview at least two practices and trust your instincts',
        ],
      },
      {
        title: 'Safety & emergency plan',
        content: 'A transfer plan is not a backup plan — it\'s part of the home birth plan. Most transfers are non-emergency.',
        bullets: [
          'Know your nearest hospital with obstetric and NICU facilities',
          'Your midwife brings: oxygen, IV access, hemorrhage medication, neonatal resuscitation equipment',
          'Transfer signs: labor not progressing, fetal heart rate abnormalities, maternal exhaustion, hemorrhage',
          '~10–15% of planned home births transfer to hospital — most are non-emergency (slow progress, pain relief request)',
          'Emergency transfer by ambulance: <1% of planned home births',
        ],
      },
      {
        title: 'What to prepare at home',
        content: 'Your midwife will give you a supply list. The basics are simple.',
        bullets: [
          'Birth pool: rental ($40–80/week) or purchase — fill to 37°C, test the pump',
          'Waterproof mattress cover, old sheets, plenty of towels',
          'Good lighting for the midwife, space heater if it\'s cold',
          'Snacks and drinks for you, your partner, and your midwife',
          'Hospital bag packed and car ready — just in case',
          'Clear your home address with your ambulance service if required locally',
        ],
      },
      {
        title: 'Pros & considerations',
        content: 'Home birth offers a uniquely personal experience. Go in with clear eyes.',
        bullets: [
          'Pros: familiar, comfortable environment, full freedom of movement and choice, no unnecessary interventions, one-on-one midwife care throughout',
          'Consider: no epidural — if you want one you\'ll need to transfer',
          'Consider: transfer adds time if emergency intervention is needed',
          'Consider: not suitable in all areas — some rural locations may be too far from hospital',
        ],
      },
    ],
  },
  {
    key: 'water',
    emoji: '🌊',
    title: 'Water Birth',
    subtitle: 'Pool, pain relief, logistics',
    heroColor: '#FFF0F5',
    heroBorder: '#F5B7CC',
    sections: [
      {
        title: 'What is water birth?',
        content: 'Water birth means laboring and/or delivering in a warm water pool. Many people use water for pain relief during labor and then exit the pool for delivery; others deliver in the water. Both approaches are safe when properly managed.',
      },
      {
        title: 'How it works',
        content: 'You enter the birth pool when labor is well established — usually around 5–6cm dilated. Entering too early can slow contractions.',
        bullets: [
          'Laboring in water: use the pool for pain relief but exit for delivery — widely available in hospital and at home',
          'Delivering in water: baby is born underwater and brought to the surface immediately — practiced at specialist units and home births',
          'Pool temperature: 37°C (98.6°F) — warm enough to be soothing, not so hot it raises baby\'s temperature',
          'Time in pool: typically 1–3 hours; exit if fetal monitoring requires it',
        ],
      },
      {
        title: 'Pain relief benefits',
        content: 'Warm water is one of the most effective non-medical pain relief options available.',
        bullets: [
          'Buoyancy: weightlessness reduces pressure on joints and back',
          'Warmth: relaxes muscles, increases pain threshold, reduces adrenaline',
          'Freedom: easier to change positions frequently in water',
          'Perineum: warm water softens tissue, may reduce tearing',
          'Research shows water birth is associated with lower epidural rates and higher maternal satisfaction',
        ],
      },
      {
        title: 'Who can & can\'t',
        content: 'Water birth is suitable for low-risk pregnancies. Your midwife will advise.',
        bullets: [
          'Suitable: singleton, cephalic, 37+ weeks, no significant complications',
          'Not suitable: GBS positive (in most guidelines — varies by location), meconium in waters, multiple pregnancy, preterm, certain fetal heart rate patterns',
          'If you go over 42 weeks some units will ask you to exit the pool for closer monitoring',
        ],
      },
      {
        title: 'Setting up the pool',
        content: 'For hospital births the pool is provided. For home births you\'ll need to plan ahead.',
        bullets: [
          'Rental: $40–80/week from birth pool suppliers — book at 32–34 weeks',
          'Purchase: $200–400, inflatable or rigid — consider resale value',
          'Liner: single-use, included with rental — keeps water clean',
          'Water temperature: test with pool thermometer, aim 37°C (98.6°F)',
          'Fill time: ~45–60 minutes — have hose adaptor for your taps, fill in early active labor',
          'Hygiene: change liner if waters break in pool, midwife will net debris',
        ],
      },
      {
        title: 'Pros & considerations',
        content: 'Water birth is well-supported by evidence for low-risk pregnancies.',
        bullets: [
          'Pros: significant natural pain relief, improved maternal satisfaction, gentle transition for baby, easier perineal outcomes',
          'Consider: not available at all hospitals — call your unit early to check',
          'Consider: continuous electronic fetal monitoring is difficult in water — wireless monitors exist but aren\'t always available',
          'Consider: if complications arise you\'ll need to exit the pool quickly — practice this',
        ],
      },
    ],
  },
  {
    key: 'labor-stages',
    emoji: '⏱️',
    title: 'Labor Stages',
    subtitle: 'Early → Active → Transition → Pushing',
    heroColor: '#FEF9E8',
    heroBorder: '#F5E0A0',
    sections: [
      {
        title: 'Overview',
        content: 'Labor is divided into three stages. The first stage (cervix dilating from 0 to 10cm) is the longest. The second stage is pushing and birth. The third stage is delivering the placenta. Knowing what each stage feels like removes the fear of the unknown.',
      },
      {
        title: 'Early labor (0–6cm)',
        content: 'The latent phase of labor. Contractions are real but irregular and manageable. This is the longest part — often 6–12 hours in a first birth.',
        bullets: [
          'What it feels like: mild to moderate contractions, like strong period cramps, 5–30 min apart',
          'What to do: stay home, rest between contractions, eat lightly, stay hydrated',
          'Time contractions: use an app — note start time, duration, and gap between',
          'Call your provider if: waters break, bleeding, no baby movement, contractions before 37 weeks',
          'Partner role: calm reassurance, back massage, prepare bags, keep track of contractions',
        ],
      },
      {
        title: 'Active labor (6–10cm)',
        content: 'Contractions intensify and become predictable. This is when you go to the hospital or your midwife comes to you.',
        bullets: [
          '5-1-1 rule: contractions every 5 min, lasting 1 min, for 1 hour → time to go',
          'What it feels like: intense, unavoidable waves — you cannot talk through them',
          'Pain relief decisions happen here: epidural, gas and air, water, TENS',
          'Movement helps: change positions every 20–30 min, use the birthing ball',
          'Partner role: breathing cues, cool cloth, advocate with staff, never leave',
        ],
      },
      {
        title: 'Transition (8–10cm)',
        content: 'The most intense phase — and the shortest. If you feel like you can\'t do it, you\'re probably almost done.',
        bullets: [
          'Duration: 15–60 minutes for most people',
          'What it feels like: contractions 2–3 min apart, intense pressure, shaking, nausea, feeling out of control — all normal',
          'What helps: breathing through each contraction, cold cloth on face and neck, partner\'s voice',
          '"I can\'t do this" often means the baby is nearly here — share this with your partner',
        ],
      },
      {
        title: 'Pushing (second stage)',
        content: 'Once fully dilated (10cm) your midwife or doctor will guide you through pushing. This stage lasts from a few minutes to 2–3 hours.',
        bullets: [
          'Urge to push: a powerful bearing-down sensation — work with it, not against it',
          'Directed pushing: hold breath and push for 10 seconds × 3 per contraction (coached)',
          'Breathing down: exhale slowly and let the urge guide the push (passive)',
          'Positions: hands and knees, squatting, supported squat, side-lying — change if one isn\'t working',
          'Crowning: intense ring of fire sensation — pant through it to slow the baby\'s head',
        ],
      },
      {
        title: 'Golden hour (third stage)',
        content: 'The hour immediately after birth is one of the most important for bonding and breastfeeding initiation. Protect it.',
        bullets: [
          'Skin-to-skin immediately: regulates baby\'s temperature, heart rate, breathing, blood sugar',
          'Delayed cord clamping: wait 1–3 minutes before clamping — transfers 80–100mL of blood-rich in iron',
          'Placenta delivery: 5–30 min after birth, assisted by an injection of oxytocin or physiological (natural)',
          'First breastfeed: initiate within the first hour — colostrum is liquid gold for the immune system',
          'Minimal interruptions: examinations and measurements can wait 1 hour',
        ],
      },
    ],
  },
  {
    key: 'warning-signs',
    emoji: '🚨',
    title: 'Warning Signs',
    subtitle: 'When to call your provider',
    heroColor: '#FFF0F0',
    heroBorder: '#F5B7B7',
    sections: [
      {
        title: 'Trust your instincts',
        content: 'You know your body. If something feels wrong, act on that feeling — even if you can\'t name exactly what it is. No provider will ever be annoyed that you called. A missed warning sign is always more serious than a false alarm.',
      },
      {
        title: 'Warning signs before labor',
        content: 'Call your provider or go to hospital immediately if you experience any of these before labor begins.',
        bullets: [
          'Water breaks before 37 weeks (preterm rupture of membranes)',
          'Heavy bright red bleeding at any point in pregnancy',
          'Baby not moving for 2+ hours after week 28 — try the cold drink + lie down test first',
          'Severe persistent headache + vision changes (spots, blurring) — may indicate pre-eclampsia',
          'Sudden severe swelling of face, hands, or feet',
          'Fever above 38°C (100.4°F)',
          'Severe abdominal pain that doesn\'t ease between contractions',
        ],
      },
      {
        title: 'Warning signs during labor',
        content: 'These require immediate attention if they occur while you are in labor.',
        bullets: [
          'Your waters break and the fluid is green or brown (meconium) — go immediately',
          'Cord prolapse: you feel or see the cord at the vaginal opening — call emergency services',
          'Fever above 38°C during labor',
          'Fetal heart rate concerns raised by your midwife or monitor',
          'Severe constant abdominal pain between contractions (possible abruption)',
          'You feel like something is very wrong — trust this',
        ],
      },
      {
        title: 'Warning signs after birth',
        content: 'Postpartum warning signs can appear days or even weeks after birth. Don\'t dismiss them.',
        bullets: [
          'Postpartum hemorrhage: soaking more than 1 pad per hour, or passing large clots',
          'Infection signs: fever, wound redness or discharge, foul-smelling lochia',
          'Postpartum preeclampsia: severe headache, vision changes, or swelling in the days after birth',
          'Blood clot (DVT/PE): calf pain or swelling, chest pain, shortness of breath',
          'Postpartum psychosis: confusion, hallucinations, extreme mood swings — rare but serious, call emergency services',
          'Persistent low mood, inability to cope, or thoughts of harming yourself or your baby — seek help today',
        ],
      },
      {
        title: 'Who to call & when',
        content: 'Knowing who to contact saves precious minutes.',
        bullets: [
          'Call your midwife or birth centre: for any concern during late pregnancy or early labor',
          'Go directly to hospital: heavy bleeding, waters breaking before 37 weeks, baby not moving, severe headache + vision changes',
          'Call emergency services (911/999/112): cord prolapse, suspected postpartum psychosis, suspected blood clot in lung, suspected stroke',
          'After hours: most maternity units have a 24h triage line — programme it into your phone now',
        ],
      },
    ],
  },
  {
    key: 'hospital-bag',
    emoji: '🧳',
    title: 'Hospital Bag Checklist',
    subtitle: 'For mom, baby & partner',
    heroColor: '#E8F8F8',
    heroBorder: '#B7E5E5',
    sections: [
      {
        title: 'For Mom',
        content: 'Pack these in the main compartment you\'ll access first.',
        bullets: hospitalBagChecklist.find((c) => c.category === 'For Mom')?.items ?? [],
      },
      {
        title: 'For Baby',
        content: 'Everything your newborn needs for the first day and the journey home.',
        bullets: hospitalBagChecklist.find((c) => c.category === 'For Baby')?.items ?? [],
      },
      {
        title: 'For Partner',
        content: 'Labor can be long. Your support person needs to be prepared.',
        bullets: hospitalBagChecklist.find((c) => c.category === 'For Partner')?.items ?? [],
      },
      {
        title: 'Documents to bring',
        content: 'Keep these in a clear zip pouch at the top of the bag.',
        bullets: [
          'Photo ID (driver\'s licence or passport)',
          'Insurance card or maternity exemption card',
          'Copies of your birth plan (3 copies — for midwife, doctor, and your record)',
          'Hospital pre-registration paperwork if your hospital requires it',
          'Paediatrician contact details',
          'Any relevant medical letters or test results from your pregnancy',
        ],
      },
      {
        title: 'What NOT to pack',
        content: 'Less is more — the hospital provides more than you think.',
        bullets: [
          'Jewellery or valuables — leave at home',
          'More than 2–3 outfits for you — you\'ll likely be in a hospital gown most of the time',
          'Newborn nappies — hospital provides them (take a pack home though)',
          'Full-size toiletries — travel size only, you won\'t use much',
          'Your entire makeup bag — you won\'t want it, and you\'ll be beautiful',
          'Anything you\'d be devastated to lose',
        ],
      },
    ],
  },
  {
    key: 'pain-relief',
    emoji: '💊',
    title: 'Pain Relief Options',
    subtitle: 'Epidural, TENS, breathing & more',
    heroColor: '#F0F8FF',
    heroBorder: '#B7D8F5',
    sections: [
      {
        title: 'The pain relief spectrum',
        content: 'Pain relief options exist on a spectrum from fully non-medical to fully medical. You don\'t have to choose one method — most people use a combination, moving along the spectrum as labor progresses. Having a birth plan doesn\'t mean you can\'t change your mind.',
      },
      {
        title: 'Epidural',
        content: 'An epidural is the most effective form of pain relief in labor, blocking pain from the waist down while keeping you awake.',
        bullets: [
          'How it works: a fine catheter is placed in the epidural space of your lower spine by an anaesthetist; medication runs through it continuously',
          'Works in 10–20 minutes; can be topped up throughout labor',
          'Combined spinal-epidural (CSE): faster onset, you can still feel enough to push',
          'Side effects: blood pressure drop (monitored), temporary itching, fever, difficulty pushing',
          'When it\'s not possible: blood clotting disorders, certain spinal conditions, some tattoos',
          'You can request it at any point in labor — you don\'t need to "earn" it',
        ],
      },
      {
        title: 'Nitrous oxide (gas and air)',
        content: 'Nitrous oxide (Entonox) is inhaled through a mouthpiece and takes effect within 30–60 seconds.',
        bullets: [
          'Takes the edge off contractions without eliminating sensation',
          'Self-administered: you hold the mouthpiece and breathe in as the contraction starts',
          'Side effects: dizziness, nausea, light-headedness — stop breathing it if it\'s unpleasant',
          'Wears off quickly — no lasting effect on you or baby',
          'Not available everywhere: check with your birth unit',
        ],
      },
      {
        title: 'TENS machine',
        content: 'A TENS (Transcutaneous Electrical Nerve Stimulation) machine sends low-voltage electrical pulses through pads on your lower back.',
        bullets: [
          'Works by interrupting pain signals and stimulating endorphin release',
          'Most effective when started early in labor — not a rescue remedy',
          'Hire one from a pharmacy or online from 36 weeks: ~$30–50 for 4 weeks',
          'You control the intensity with a handheld dial — increase with contractions',
          'Cannot be used in water; remove before getting in a pool or bath',
        ],
      },
      {
        title: 'Water & heat',
        content: 'Warm water is one of the most underrated pain relief options — and it\'s free.',
        bullets: [
          'Shower: direct warm water on lower back and abdomen during contractions',
          'Bath: soak in the deepest bath you can manage in early labor',
          'Birth pool: for active labor — see Water Birth section for full details',
          'Warm compress: heated wheat bag or warm towel on lower back between contractions',
          'Cold cloth: cold flannel on forehead, neck, or wrists for overheating during transition',
        ],
      },
      {
        title: 'Breathing & hypnobirthing',
        content: 'Controlled breathing doesn\'t eliminate pain, but it changes your relationship with it. Evidence supports hypnobirthing for reducing anxiety and epidural use.',
        bullets: [
          'Up-breathing (early labor): slow nasal inhale for 4 counts, slow exhale for 8 counts',
          'Down-breathing (pushing): deep inhale, then exhale slowly as you bear down',
          'Hypnobirthing: a course teaching self-hypnosis, visualisation, and positive birth language',
          'Practice from 30 weeks: daily practice makes the techniques automatic under pressure',
          'Apps: Freya (hypnobirthing), Calm, Headspace — use during pregnancy to build the habit',
        ],
      },
    ],
  },
  {
    key: 'positions',
    emoji: '🤸',
    title: 'Birth Positions',
    subtitle: 'Upright, squatting, hands & knees',
    heroColor: '#F5F0FF',
    heroBorder: '#CDB7F5',
    sections: [
      {
        title: 'Why position matters',
        content: 'The position you give birth in affects pain, the speed of labor, the chance of intervention, and perineal outcomes. Avoid lying flat on your back (lithotomy position) unless medically necessary — it compresses your vena cava, reducing blood flow, and works against gravity.',
      },
      {
        title: 'Upright & walking',
        content: 'Upright positions use gravity to help the baby descend and apply pressure to the cervix to stimulate contractions.',
        bullets: [
          'Standing and leaning: lean on a partner, wall, or bed between contractions',
          'Walking: particularly effective in early and active labor',
          'Slow dancing: sway with your partner — releases tension and keeps you moving',
          'Leaning over a surface: drapes arms over bed head or back of chair',
        ],
      },
      {
        title: 'Squatting',
        content: 'Squatting opens the pelvic outlet by up to 30% compared to lying down.',
        bullets: [
          'Deep squat: most effective position for pushing if you have the strength',
          'Supported squat: partner holds you from behind under your arms',
          'Birthing bar: attached to the bed, you hold it and squat during pushes',
          'Practice squatting from 30 weeks to build strength and flexibility',
        ],
      },
      {
        title: 'Hands & knees',
        content: 'The all-fours position is particularly effective for back labor (when baby is in a posterior position with their back against your spine).',
        bullets: [
          'Relieves pressure on the spine and sacrum during back labor',
          'Encourages baby to rotate from posterior (back-to-back) to anterior (optimal)',
          'Partner can apply firm counterpressure to lower back',
          'Can push effectively in this position — tell your midwife you\'d like to try it',
        ],
      },
      {
        title: 'Side-lying',
        content: 'Side-lying (Sims position) is a rest position that still works with gravity better than lying on your back.',
        bullets: [
          'Good when you\'re exhausted and need to rest but labor is progressing',
          'Partner supports your upper leg (or use a peanut ball)',
          'Effective for pushing if you have an epidural and can\'t stand or squat',
          'Left side is preferred to optimise blood flow to placenta',
        ],
      },
      {
        title: 'Birthing ball',
        content: 'A birthing ball (large exercise ball) is one of the most versatile tools in labor.',
        bullets: [
          'Sitting and rocking: opens the pelvis, encourages baby to descend',
          'Hip circles: sitting on ball, rotate hips in wide circles — relieves pressure and encourages rotation',
          'Kneeling lean: kneel on floor and drape upper body over ball — good for back labor',
          'Between contractions: bounce gently, keep moving, release tension in the pelvic floor',
          'Borrow from the hospital or buy one — 65cm size for most heights',
        ],
      },
    ],
  },
  {
    key: 'partner-guide',
    emoji: '👐',
    title: 'Birth Partner Guide',
    subtitle: 'What your support person needs to know',
    heroColor: '#FFF5E8',
    heroBorder: '#F5D0B7',
    sections: [
      {
        title: 'Your role',
        content: 'A birth partner\'s job is to advocate, support, and witness. You are not there to fix anything — labor is not a problem to be solved. Your presence, calm, and unwavering support are the most powerful tools you have.',
        bullets: [
          'Advocate: speak up for the birth plan when she can\'t, ask questions, create a calm environment',
          'Support: physical comfort (massage, position help), emotional reassurance, practical tasks',
          'Witness: be present, stay off your phone, this day matters',
          'Know the birth plan: read it, understand it, and be ready to communicate it to staff',
        ],
      },
      {
        title: 'During early labor at home',
        content: 'Early labor can last many hours. Your job is to keep things calm and help her conserve energy.',
        bullets: [
          'Time contractions: start, duration, gap between — use an app',
          'Prepare food and drinks: light easy snacks, energy drinks, water with a straw',
          'Create a calm environment: low lighting, familiar music, warm bath if she wants it',
          'Massage: firm pressure on lower back during contractions, ask exactly where and how hard',
          'Pack the car: bags, car seat, snacks for you, phone charger, birth plan',
          'Rest if you can: a long hospital labor is ahead of you too',
        ],
      },
      {
        title: 'At the hospital',
        content: 'When you arrive at hospital your role shifts to advocate and anchor.',
        bullets: [
          'Communicate the birth plan: hand it to the midwife, explain her preferences calmly',
          'Ask before agreeing to anything: "Can we have a few minutes to discuss that?"',
          'Stay in the room: do not leave without telling her and not for long',
          'Manage the environment: dim lights, keep the room calm, limit visitors',
          'Keep her moving: remind her to change positions, offer the birthing ball, walk the corridor',
          'Track what\'s happening: note what medication is given and when',
        ],
      },
      {
        title: 'During pushing',
        content: 'This is the most physically demanding part. She needs you completely present.',
        bullets: [
          'Encouragement: specific and real — "You\'re doing it, I can see the baby\'s head"',
          'Leg support: hold her leg if she\'s squatting or side-lying and can\'t hold it herself',
          'Breathing cues: breathe with her if she\'s losing the rhythm',
          'Cold cloth: keep a cold damp flannel on her forehead and neck',
          'Quiet during contractions: she cannot process conversation — save it for the gaps',
        ],
      },
      {
        title: 'What to say & what to avoid',
        content: 'Words matter enormously in labor. The right phrase can reset everything.',
        bullets: [
          'Say: "You\'re doing so well", "I\'m right here", "Each one brings the baby closer", "You\'re so strong"',
          'Say when she says she can\'t do it: "You\'re almost there — this feeling means the baby is coming"',
          'Avoid: "Relax", "Calm down", "Are you sure you don\'t want the epidural?", "It can\'t be that bad"',
          'Avoid: checking your phone, talking to other people in the room, leaving without telling her',
          'When you don\'t know what to say: hold her hand, make eye contact, breathe with her',
        ],
      },
      {
        title: 'After birth',
        content: 'The golden hour is just as important for partners.',
        bullets: [
          'Skin-to-skin: if the birthing person can\'t do skin-to-skin immediately, you do it — shirt off, baby on chest',
          'Cord cutting: you may be offered this — say yes if you want to',
          'Let her rest: handle the phone calls and messages, protect the first hour',
          'Your own feelings: seeing birth can be overwhelming — your shock, tears, or joy are all normal',
          'Self-care: you need food, water, and eventually sleep too',
        ],
      },
    ],
  },
  {
    key: 'recovery',
    emoji: '🌙',
    title: 'Recovery & Postpartum',
    subtitle: 'First 24h, healing, emotional changes',
    heroColor: '#F0F0FF',
    heroBorder: '#C4C4F5',
    sections: [
      {
        title: 'First 24 hours',
        content: 'The first day after birth is about rest, monitoring, and beginning to know your baby. The hospital does the clinical work — your job is to rest and feed.',
        bullets: [
          'Monitoring: your blood pressure, bleeding, and urine output are checked regularly',
          'Baby checks: Apgar scores, weight, vitamin K injection, hearing test',
          'First feed: whether breastfeeding or formula, get support from the midwife in the first hours',
          'Skin-to-skin: continue as much as possible — regulates baby\'s temperature and blood sugar',
          'Rest: sleep when the baby sleeps, decline non-essential visitors',
        ],
      },
      {
        title: 'Bleeding & lochia',
        content: 'Lochia is the postpartum discharge as your uterus sheds its lining. It\'s normal and follows a predictable pattern.',
        bullets: [
          'Days 1–4: bright red (rubra), heavy — like a heavy period, with possible small clots',
          'Days 4–10: pink or brownish (serosa), lighter',
          'Days 10–6 weeks: creamy or yellow-white (alba), very light',
          'Call your provider if: soaking more than 1 pad per hour, passing clots larger than a plum, offensive smell, or lochia restarts after it had stopped',
          'Breastfeeding releases oxytocin which contracts the uterus and may increase bleeding temporarily — normal',
        ],
      },
      {
        title: 'Perineum & stitches',
        content: 'If you had a vaginal birth, your perineum needs care whether you tore or had an episiotomy.',
        bullets: [
          'Stitches dissolve in 2–4 weeks — no removal needed',
          'Clean: rinse with warm water after every toilet visit',
          'Sitz baths: sit in a few inches of warm water 2–3 times a day — speeds healing',
          'Cold packs: frozen pad or ice pack in the first 24 hours reduces swelling',
          'Pain relief: paracetamol and ibuprofen regularly for the first few days — don\'t wait until the pain is bad',
          'Call your midwife if: wound opens, oozes, smells, or you develop a fever',
        ],
      },
      {
        title: 'C-section recovery',
        content: 'C-section recovery takes longer because it\'s major abdominal surgery. Be kind to yourself.',
        bullets: [
          'Week 1: minimal movement, no lifting more than your baby, accept all help offered',
          'Wound care: keep clean and dry, no submerging in water until healed (~6 weeks)',
          'Driving: not until you can do an emergency stop without pain — typically 6 weeks',
          'Scar massage: from 8 weeks, use circular and cross-friction movements to prevent adhesions',
          'Watch for: redness, warmth, swelling, discharge, or gaping at the wound site',
        ],
      },
      {
        title: 'Emotional changes',
        content: 'Postpartum emotions are profound and often surprising. Understanding the difference between baby blues and postpartum depression (PPD) can help you get support when you need it.',
        bullets: [
          'Baby blues: tearfulness, mood swings, anxiety in days 3–5 as hormones crash — affects ~80% of new parents, resolves by day 10',
          'PPD: persistent low mood, inability to cope, or detachment from baby lasting more than 2 weeks — affects ~15% — treatable',
          'PPND (partners): dads and partners also experience postnatal depression at rates of ~10%',
          'Postpartum anxiety: intrusive thoughts, constant worry, inability to sleep even when baby sleeps — very common, very treatable',
          'Birth trauma: if your birth was frightening or didn\'t go to plan, you may need to talk it through — ask for a postnatal debrief',
        ],
      },
      {
        title: 'When to call your doctor',
        content: 'Don\'t downplay symptoms in the postpartum period. These warrant same-day contact.',
        bullets: [
          'Fever above 38°C',
          'Wound redness, swelling, discharge, or opening',
          'Heavy bleeding (more than 1 pad per hour) or large clots',
          'Calf pain or swelling (possible DVT)',
          'Chest pain or shortness of breath (possible PE)',
          'Severe headache, vision changes, or swelling of face/hands (postpartum preeclampsia)',
          'Feeling unable to cope, persistent low mood, or thoughts of harming yourself or your baby — call today, not tomorrow',
        ],
      },
    ],
  },
]

export function getBirthTopic(key: BirthTopicKey): BirthTopic {
  const topic = BIRTH_TOPICS.find((t) => t.key === key)
  if (!topic) throw new Error(`Birth topic "${key}" not found`)
  return topic
}
```

- [ ] **Step 2: Verify TypeScript compiles — run type check**

```bash
cd /Users/igorcarvalhorodrigues/Projects/grandma-app && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to `birthGuideData.ts`. If you see import errors from `birthData`, check the export name (`hospitalBagChecklist`) matches exactly.

- [ ] **Step 3: Commit**

```bash
git add lib/birthGuideData.ts
git commit -m "feat(birth-guide): add content data — 11 topics, 60+ sections"
```

---

## Task 2: Accordion detail modal — `components/pregnancy/BirthDetailModal.tsx`

**Files:**
- Create: `components/pregnancy/BirthDetailModal.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/pregnancy/BirthDetailModal.tsx
import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native'
import { X, ChevronDown, ChevronUp } from 'lucide-react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../constants/theme'
import { Display, MonoCaps, Body } from '../ui/Typography'
import { getBirthTopic } from '../../lib/birthGuideData'
import type { BirthTopicKey, BirthSection } from '../../lib/birthGuideData'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

interface BirthDetailModalProps {
  visible: boolean
  onClose: () => void
  topicKey: BirthTopicKey | null
  onAskGrandma: (topicTitle: string) => void
}

export function BirthDetailModal({
  visible,
  onClose,
  topicKey,
  onAskGrandma,
}: BirthDetailModalProps) {
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  if (!topicKey) return null
  const topic = getBirthTopic(topicKey)

  const toggle = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setOpenIndex((prev) => (prev === index ? null : index))
  }

  const handleClose = () => {
    setOpenIndex(0)
    onClose()
  }

  const handleAskGrandma = () => {
    handleClose()
    onAskGrandma(topic.title)
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: isDark ? colors.surface : '#FFFEF8', paddingBottom: insets.bottom + 16 },
          ]}
        >
          {/* Handle */}
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(20,19,19,0.15)' }]} />
            <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={8}>
              <X size={20} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>

          {/* Hero */}
          <View style={styles.heroPad}>
            <View
              style={[
                styles.hero,
                { backgroundColor: topic.heroColor, borderColor: topic.heroBorder },
              ]}
            >
              <Text style={styles.heroEmoji}>{topic.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Display size={20} color={isDark ? colors.text : '#141313'}>
                  {topic.title}
                </Display>
                <Body size={12} color={isDark ? colors.textSecondary : '#777'} style={{ marginTop: 2 }}>
                  {topic.subtitle}
                </Body>
              </View>
            </View>
          </View>

          {/* Accordion */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {topic.sections.map((section, index) => (
              <AccordionItem
                key={index}
                section={section}
                index={index}
                isOpen={openIndex === index}
                onToggle={() => toggle(index)}
                accentColor={topic.heroBorder}
                isDark={isDark}
                colors={colors}
              />
            ))}
          </ScrollView>

          {/* Ask Grandma CTA */}
          <View style={styles.ctaPad}>
            <Pressable
              onPress={handleAskGrandma}
              style={({ pressed }) => [
                styles.cta,
                { backgroundColor: isDark ? 'rgba(112,72,184,0.15)' : '#F0EBFF', borderColor: '#C4B5FD', opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <Text style={styles.ctaText}>💬 Ask Grandma anything →</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

interface AccordionItemProps {
  section: BirthSection
  index: number
  isOpen: boolean
  onToggle: () => void
  accentColor: string
  isDark: boolean
  colors: ReturnType<typeof useTheme>['colors']
}

function AccordionItem({ section, index, isOpen, onToggle, accentColor, isDark, colors }: AccordionItemProps) {
  return (
    <View style={styles.accordionItem}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.accordionHeader,
          {
            backgroundColor: isOpen
              ? (isDark ? 'rgba(196,181,253,0.12)' : '#F4F0FF')
              : (isDark ? colors.surface : '#FFFEF8'),
            borderColor: isOpen ? '#C4B5FD' : (isDark ? colors.border : '#E8E0CC'),
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <View style={[styles.numCircle, { backgroundColor: accentColor + '40', borderColor: accentColor }]}>
          <Text style={[styles.numText, { color: isDark ? colors.text : '#141313' }]}>{index + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Body size={14} color={isDark ? colors.text : '#141313'} style={{ fontFamily: 'DMSans_600SemiBold' }}>
            {section.title}
          </Body>
        </View>
        {isOpen
          ? <ChevronUp size={16} color={accentColor} strokeWidth={2.5} />
          : <ChevronDown size={16} color={isDark ? colors.textMuted : '#AAAAAA'} strokeWidth={2.5} />}
      </Pressable>

      {isOpen && (
        <View
          style={[
            styles.accordionBody,
            {
              backgroundColor: isDark ? 'rgba(196,181,253,0.06)' : '#FDFBFF',
              borderColor: isDark ? colors.border : '#E8E0CC',
            },
          ]}
        >
          <Body size={13} color={isDark ? colors.textSecondary : '#555'} style={{ lineHeight: 20 }}>
            {section.content}
          </Body>
          {section.bullets && section.bullets.length > 0 && (
            <View style={styles.bulletList}>
              {section.bullets.map((bullet, i) => (
                <View key={i} style={styles.bulletRow}>
                  <View style={[styles.bulletDot, { backgroundColor: accentColor }]} />
                  <Body size={12} color={isDark ? colors.textSecondary : '#555'} style={{ flex: 1, lineHeight: 18 }}>
                    {bullet}
                  </Body>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20,19,19,0.55)',
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '92%',
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 4,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    top: 12,
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    top: 8,
    padding: 8,
  },
  heroPad: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  hero: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroEmoji: { fontSize: 32 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8 },
  accordionItem: { gap: 0 },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  numCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  numText: { fontSize: 11, fontFamily: 'DMSans_700Bold' },
  accordionBody: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: 14,
    gap: 8,
    marginTop: -2,
  },
  bulletList: { gap: 6, marginTop: 8 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bulletDot: { width: 5, height: 5, borderRadius: 3, marginTop: 7, flexShrink: 0 },
  ctaPad: { paddingHorizontal: 16, paddingTop: 8 },
  cta: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
    color: '#7048B8',
  },
})
```

- [ ] **Step 2: Run type check**

```bash
cd /Users/igorcarvalhorodrigues/Projects/grandma-app && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors. Common issue: if `DMSans_700Bold` isn't loaded, change to `DMSans_600SemiBold`.

- [ ] **Step 3: Commit**

```bash
git add components/pregnancy/BirthDetailModal.tsx
git commit -m "feat(birth-guide): add BirthDetailModal with accordion sections"
```

---

## Task 3: Landing grid modal — `components/pregnancy/BirthGuideModal.tsx`

**Files:**
- Create: `components/pregnancy/BirthGuideModal.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/pregnancy/BirthGuideModal.tsx
import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { X } from 'lucide-react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../constants/theme'
import { Display, MonoCaps, Body } from '../ui/Typography'
import { BirthDetailModal } from './BirthDetailModal'
import type { BirthTopicKey } from '../../lib/birthGuideData'

interface BirthGuideModalProps {
  visible: boolean
  onClose: () => void
}

const BIRTH_TYPES: {
  key: BirthTopicKey
  emoji: string
  title: string
  subtitle: string
  bg: string
  border: string
}[] = [
  { key: 'natural', emoji: '🌿', title: 'Natural Birth', subtitle: 'Breathing, positions, stages', bg: '#E8F8E8', border: '#B7E5B7' },
  { key: 'csection', emoji: '🏥', title: 'C-Section', subtitle: 'Surgery, recovery, VBAC', bg: '#F0EBFF', border: '#C4B5FD' },
  { key: 'home', emoji: '🏡', title: 'Home Birth', subtitle: 'Midwife, safety, planning', bg: '#E8F0FF', border: '#B7C8F5' },
  { key: 'water', emoji: '🌊', title: 'Water Birth', subtitle: 'Pool, pain relief, logistics', bg: '#FFF0F5', border: '#F5B7CC' },
]

const EXTRA_TOPICS: {
  key: BirthTopicKey
  emoji: string
  title: string
  subtitle: string
  tileBg: string
}[] = [
  { key: 'labor-stages', emoji: '⏱️', title: 'Labor Stages', subtitle: 'Early → Active → Transition → Pushing', tileBg: '#FEF9E8' },
  { key: 'warning-signs', emoji: '🚨', title: 'Warning Signs', subtitle: 'When to call your provider', tileBg: '#FFF0F0' },
  { key: 'hospital-bag', emoji: '🧳', title: 'Hospital Bag Checklist', subtitle: 'For mom, baby & partner', tileBg: '#E8F8F8' },
  { key: 'pain-relief', emoji: '💊', title: 'Pain Relief Options', subtitle: 'Epidural, TENS, breathing & more', tileBg: '#F0F8FF' },
  { key: 'positions', emoji: '🤸', title: 'Birth Positions', subtitle: 'Upright, squatting, hands & knees', tileBg: '#F5F0FF' },
  { key: 'partner-guide', emoji: '👐', title: 'Birth Partner Guide', subtitle: 'What your support person needs to know', tileBg: '#FFF5E8' },
  { key: 'recovery', emoji: '🌙', title: 'Recovery & Postpartum', subtitle: 'First 24h, healing, emotional changes', tileBg: '#F0F0FF' },
]

export function BirthGuideModal({ visible, onClose }: BirthGuideModalProps) {
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const [detailTopic, setDetailTopic] = useState<BirthTopicKey | null>(null)

  const handleClose = () => {
    setDetailTopic(null)
    onClose()
  }

  const handleAskGrandma = (topicTitle: string) => {
    handleClose()
    router.push({
      pathname: '/grandma-talk',
      params: { prefill: `Tell me more about ${topicTitle.toLowerCase()}` },
    })
  }

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
      >
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
          <View
            style={[
              styles.sheet,
              { backgroundColor: isDark ? colors.surface : '#FFFEF8', paddingBottom: insets.bottom + 16 },
            ]}
          >
            {/* Handle */}
            <View style={styles.handleWrap}>
              <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(20,19,19,0.15)' }]} />
              <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={8}>
                <X size={20} color={colors.textMuted} strokeWidth={2} />
              </Pressable>
            </View>

            {/* Header */}
            <View style={styles.headerPad}>
              <Display size={22} color={isDark ? colors.text : '#141313'}>Birth Guide 🌿</Display>
              <Body size={13} color={isDark ? colors.textSecondary : '#888'} style={{ marginTop: 4 }}>
                What do you want to explore?
              </Body>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Birth type grid */}
              <View style={styles.grid}>
                {BIRTH_TYPES.map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => setDetailTopic(item.key)}
                    style={({ pressed }) => [
                      styles.typeCard,
                      { backgroundColor: item.bg, borderColor: item.border, opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Text style={styles.typeEmoji}>{item.emoji}</Text>
                    <Body size={13} color={isDark ? colors.text : '#141313'} style={{ fontFamily: 'DMSans_600SemiBold', marginTop: 4 }}>
                      {item.title}
                    </Body>
                    <Body size={11} color={isDark ? colors.textSecondary : '#777'} style={{ marginTop: 2 }}>
                      {item.subtitle}
                    </Body>
                  </Pressable>
                ))}
              </View>

              {/* Also in this guide */}
              <MonoCaps size={10} color="#B7A6E8" style={{ marginTop: 20, marginBottom: 10, letterSpacing: 0.8 }}>
                ALSO IN THIS GUIDE
              </MonoCaps>

              <View style={styles.extraList}>
                {EXTRA_TOPICS.map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => setDetailTopic(item.key)}
                    style={({ pressed }) => [
                      styles.extraRow,
                      {
                        backgroundColor: isDark ? colors.surface : '#FFFEF8',
                        borderColor: isDark ? colors.border : '#E8E0CC',
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <View style={[styles.extraTile, { backgroundColor: isDark ? colors.surface : item.tileBg }]}>
                      <Text style={styles.extraEmoji}>{item.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Body size={14} color={isDark ? colors.text : '#141313'} style={{ fontFamily: 'DMSans_600SemiBold' }}>
                        {item.title}
                      </Body>
                      <Body size={12} color={isDark ? colors.textSecondary : '#888'} style={{ marginTop: 2 }}>
                        {item.subtitle}
                      </Body>
                    </View>
                    <Text style={{ color: '#B7A6E8', fontSize: 18 }}>›</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <BirthDetailModal
        visible={detailTopic !== null}
        topicKey={detailTopic}
        onClose={() => setDetailTopic(null)}
        onAskGrandma={handleAskGrandma}
      />
    </>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20,19,19,0.55)',
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '92%',
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 4,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    top: 12,
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    top: 8,
    padding: 8,
  },
  headerPad: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeCard: {
    width: '47.5%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  typeEmoji: { fontSize: 24 },

  extraList: { gap: 8 },
  extraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  extraTile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  extraEmoji: { fontSize: 18 },
})
```

- [ ] **Step 2: Run type check**

```bash
cd /Users/igorcarvalhorodrigues/Projects/grandma-app && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors. If `router.push` complains about params shape, try casting: `router.push('/grandma-talk')` (drop the params for now — the grandma-talk screen may not support prefill yet).

- [ ] **Step 3: Commit**

```bash
git add components/pregnancy/BirthGuideModal.tsx
git commit -m "feat(birth-guide): add BirthGuideModal — topic grid + extra rows"
```

---

## Task 4: Wire into PregnancyHome — replace BirthGuidePreview with banner

**Files:**
- Modify: `components/home/PregnancyHome.tsx`
- Delete: `components/home/pregnancy/BirthGuidePreview.tsx`

- [ ] **Step 1: Add the import for BirthGuideModal and remove BirthGuidePreview import**

In `components/home/PregnancyHome.tsx`, find and replace:

```tsx
// REMOVE this line:
import { BirthGuidePreview } from './pregnancy/BirthGuidePreview'
```

```tsx
// ADD this line (with the other component imports, around line 60):
import { BirthGuideModal } from '../pregnancy/BirthGuideModal'
```

- [ ] **Step 2: Add `birthGuideVisible` state**

Find the existing state declarations (around line 90–120 in PregnancyHome). Add:

```tsx
const [birthGuideVisible, setBirthGuideVisible] = useState(false)
```

- [ ] **Step 3: Replace the BirthGuidePreview section with the compact banner**

Find this block (around line 433–437):

```tsx
{/* 7. Birth guide — collapsible cards inline */}
<View style={styles.section}>
  <MonoCaps style={{ marginBottom: 12 }}>BIRTH GUIDE</MonoCaps>
  <BirthGuidePreview />
</View>
```

Replace it with:

```tsx
{/* 7. Birth guide — compact banner */}
<View style={styles.section}>
  <Pressable
    onPress={() => setBirthGuideVisible(true)}
    style={({ pressed }) => [
      styles.birthBanner,
      {
        backgroundColor: isDark ? colors.surface : '#FFFEF8',
        borderColor: '#C4B5FD',
        opacity: pressed ? 0.8 : 1,
      },
    ]}
  >
    <View style={styles.birthBannerTile}>
      <Text style={styles.birthBannerEmoji}>🌿</Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.birthBannerTitle, { color: isDark ? colors.text : '#141313' }]}>
        Birth Guide
      </Text>
      <Text style={[styles.birthBannerSub, { color: isDark ? colors.textSecondary : '#888' }]}>
        Natural · C-Section · Home · Water
      </Text>
    </View>
    <Text style={styles.birthBannerChevron}>›</Text>
  </Pressable>
</View>
```

- [ ] **Step 4: Add the BirthGuideModal mount and the new StyleSheet entries**

After the closing `</AppointmentDetailModal>` (around line 455), add:

```tsx
{/* Birth guide modal */}
<BirthGuideModal
  visible={birthGuideVisible}
  onClose={() => setBirthGuideVisible(false)}
/>
```

Then in the `StyleSheet.create({...})` block, add these styles:

```tsx
birthBanner: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  borderRadius: 16,
  borderWidth: 1,
  padding: 14,
  // sticker offset shadow
  shadowColor: '#C4B5FD',
  shadowOffset: { width: 3, height: 3 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 3,
},
birthBannerTile: {
  width: 40,
  height: 40,
  borderRadius: 12,
  backgroundColor: '#F0EBFF',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
},
birthBannerEmoji: { fontSize: 20 },
birthBannerTitle: {
  fontSize: 15,
  fontFamily: 'DMSans_600SemiBold',
},
birthBannerSub: {
  fontSize: 12,
  fontFamily: 'DMSans_400Regular',
  marginTop: 2,
},
birthBannerChevron: {
  fontSize: 20,
  color: '#C4B5FD',
},
```

- [ ] **Step 5: Check `isDark` is available in PregnancyHome**

The component already uses `useTheme()`. Confirm the destructure at the top of `PregnancyHome` includes `isDark`:

```tsx
const { colors, isDark } = useTheme()
```

If it only has `colors`, add `isDark` to the destructure. Check around line 88 in the component body.

- [ ] **Step 6: Run type check**

```bash
cd /Users/igorcarvalhorodrigues/Projects/grandma-app && npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors. If there are type errors on `router.push` in `BirthGuideModal`, simplify to:

```tsx
router.push('/grandma-talk')
```

- [ ] **Step 7: Delete BirthGuidePreview**

```bash
rm /Users/igorcarvalhorodrigues/Projects/grandma-app/components/home/pregnancy/BirthGuidePreview.tsx
```

Confirm nothing else imports it:

```bash
grep -r "BirthGuidePreview" /Users/igorcarvalhorodrigues/Projects/grandma-app/components /Users/igorcarvalhorodrigues/Projects/grandma-app/app 2>/dev/null
```

Expected: no results.

- [ ] **Step 8: Final type check**

```bash
cd /Users/igorcarvalhorodrigues/Projects/grandma-app && npx tsc --noEmit 2>&1 | head -40
```

Expected: clean.

- [ ] **Step 9: Commit**

```bash
git add components/home/PregnancyHome.tsx
git rm components/home/pregnancy/BirthGuidePreview.tsx
git commit -m "feat(birth-guide): wire compact banner into pregnancy home, remove old inline preview"
```

---

## Done — Verification Checklist

After all tasks complete, manually verify in the running app (Expo Go or simulator):

- [ ] Pregnancy home screen shows the compact Birth Guide banner between the weight card and Grandma CTA
- [ ] Tapping the banner opens the landing modal with 4 birth type cards + 7 extra topic rows
- [ ] Tapping any birth type card opens the detail modal with a color-coded hero
- [ ] Each section in the accordion expands/collapses on tap; only one is open at a time
- [ ] First section starts open by default
- [ ] "Ask Grandma anything" CTA closes both modals and navigates to grandma-talk
- [ ] Tapping the backdrop or × closes the modal
- [ ] Dark mode looks correct (no hardcoded light-mode colors showing through)
- [ ] Hospital bag section shows the correct checklist items from birthData.ts

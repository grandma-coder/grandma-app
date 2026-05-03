import type { BirthTopic } from '../birthGuideData'

export const WATER_TOPIC: BirthTopic = {
  key: 'water',
  emoji: '🌊',
  title: 'Water Birth',
  subtitle: 'Pool, pain relief, logistics',
  heroColor: '#FFF0F5',
  heroBorder: '#F5B7CC',
  disclaimer:
    'Educational only — not medical advice. Water birth eligibility varies by hospital, region, and your specific clinical picture. Discuss with your midwife or obstetrician.',
  sections: [
    {
      title: 'What water birth actually means',
      content:
        'Water birth is an umbrella term that hides an important distinction: laboring in water and delivering in water are two different choices, with two different evidence bases and two different sets of guidance. Many people use a warm pool for pain relief in active labor and step out for the actual birth — this is widely supported across maternity systems. A smaller number deliver in the water, with the baby born underwater and lifted gently to the surface within seconds. The 2018 Cochrane review on immersion in labor (Cluett et al., 15 trials, 3,663 women) found warm-water immersion in the first stage reduces pain and the use of regional anesthesia, with no increase in adverse outcomes for low-risk births. The evidence on actually delivering in water is reassuring but more contested — see the next section.',
      subsections: [
        {
          title: 'Laboring in water (first stage)',
          content:
            'You enter a warm pool once labor is well established — most providers prefer 5–6 cm dilation, since immersion before active labor can slow contractions by reducing oxytocin drive. You stay in the pool for as long as you and your baby are doing well. This is the most evidence-supported and most widely available form of hydrotherapy in birth. The NHS, NICE NG235, and ACOG Committee Opinion 679 all explicitly support immersion during the first stage of labor for low-risk pregnancies.',
          bullets: [
            'Available in most NHS units, many US hospitals with midwifery services, and at planned home births',
            'Pain perception drops within 15–30 minutes of entering warm water',
            'You can exit and re-enter as labor progresses; some people get out for transition and back in to push',
            'Continuous monitoring requires waterproof telemetry — many units only offer intermittent auscultation in water',
          ],
        },
        {
          title: 'Delivering in water (second stage)',
          content:
            'The baby is born fully submerged and brought to the surface immediately — usually within 5–10 seconds. The "diving reflex" prevents a healthy term baby from inhaling water, because the cord is still oxygenating them and the airway only opens once the face hits cooler air. Delivering in water is offered as standard at midwife-led units in the UK, the Netherlands, Australia, and some US birth centers and home practices. It is offered less consistently in obstetric-led US hospital settings, partly because of the contested guidance discussed below.',
          bullets: [
            'Cord typically clamped after baby is brought to the surface',
            'Active management of third stage usually means stepping out for the placenta',
            'Most units have a written "exit criteria" protocol — read it before you commit',
          ],
        },
      ],
      callout: {
        variant: 'tip',
        text: 'Ask your provider: "Can I labor in the pool? Can I also deliver in it? What is the unit\'s policy on continuous monitoring in water?" The answers tell you a lot about how supportive that birth team will actually be.',
      },
    },
    {
      title: 'The evidence — and where the experts disagree',
      content:
        'Water birth is one of the few areas in modern obstetrics with a real, public disagreement between major bodies. ACOG and AAP have historically been cautious about delivery in water, while the UK Royal College of Obstetricians and Royal College of Midwives are more permissive. Recent large observational studies have generally been reassuring. As a parent, you do not need to resolve the disagreement — but you should know it exists, because your hospital\'s policy probably reflects one side of it.',
      subsections: [
        {
          title: 'ACOG and AAP — the cautious position',
          content:
            'ACOG Committee Opinion 679 (2016, reaffirmed 2024) supports immersion during the first stage of labor but recommends that delivery occur on land. Their stated concerns are theoretical: water aspiration, cord avulsion if the baby is lifted too fast, infection from contaminated pool water, neonatal hyponatremia, and water embolism. AAP has historically aligned with ACOG. Critics note these risks are largely case-report level rather than population-level, and that the recommendation has not changed despite a decade of newer reassuring data.',
          bullets: [
            'ACOG opinion: laboring in water — yes; delivering in water — case-by-case, with informed consent and rigorous protocols',
            'Many US hospitals follow ACOG closely and will require you to exit the pool for delivery',
            'Some US hospitals and most freestanding birth centers offer full water birth with clear protocols',
          ],
        },
        {
          title: 'RCOG/RCM and NICE — the permissive position',
          content:
            'The RCOG/RCM Joint Statement No. 1 supports laboring and giving birth in water for healthy women with uncomplicated pregnancies. NICE intrapartum guidance NG235 recommends offering the option of laboring in water for pain relief and supports water birth where the woman chooses it and clinical conditions are appropriate. AWHONN (the US nursing body) issued a position statement supporting trained nurses caring for women who choose water birth, splitting somewhat from the strict ACOG line.',
        },
        {
          title: 'What the recent data actually shows',
          content:
            'Bovbjerg et al. (2021), looking at 17,530 community water births in the US MANA Stats registry, found no increase in neonatal mortality, NICU admission, or low Apgar scores compared with land birth in the same low-risk cohort, and lower rates of postpartum hemorrhage and severe perineal trauma. Burns et al. (2022, BMJ Open), a UK prospective cohort of 73,229 low-risk births, found water immersion in labor was associated with lower epidural use and similar neonatal outcomes; water birth specifically was associated with fewer third- and fourth-degree tears. Adverse events linked to water birth (cord avulsion, water aspiration) do occur but are rare — on the order of single digits per 10,000 births in pooled cohorts.',
          bullets: [
            'Reassuring for low-risk: neonatal outcomes comparable to land birth',
            'Likely reduces: epidural use, severe perineal trauma, postpartum hemorrhage',
            'Real but rare risks: cord avulsion (~3 per 1,000 in some cohorts, mitigated by careful lifting), neonatal infection if pool hygiene is poor',
          ],
        },
      ],
      callout: {
        variant: 'provider',
        text: 'If you are in the US and want to deliver in water, ask your hospital directly: "Do you support water birth, or only water labor?" Many will only offer immersion for the first stage. If full water birth matters to you, a midwife-led unit, freestanding birth center, or planned home birth with a qualified midwife may be a better fit.',
      },
    },
    {
      title: 'Who can — and who cannot',
      content:
        'Water birth is for low-risk pregnancies. Eligibility criteria are remarkably consistent across NICE, RCOG, and the major US birth-center networks, and your midwife will run through them with you in the third trimester. The list below is a typical baseline; individual units may add their own restrictions.',
      subsections: [
        {
          title: 'Generally suitable',
          content:
            'You are usually a candidate for water birth if your pregnancy is uncomplicated and your baby is well-positioned. A previous straightforward vaginal birth makes you an even stronger candidate because your labor is likely to be shorter and more predictable.',
          bullets: [
            'Singleton pregnancy',
            'Cephalic (head-down) presentation',
            '37 + 0 to 42 + 0 weeks of pregnancy',
            'Clear amniotic fluid (no meconium)',
            'No active maternal infection',
            'BMI within unit-specific limits (often <35–40 — check locally)',
            'Reassuring fetal heart rate on admission',
          ],
        },
        {
          title: 'Usually not suitable',
          content:
            'Some conditions make water birth unsafe or impractical. The list below is conservative — your provider may make an individual decision in some cases (for example, GBS-positive women are admitted to water birth in some UK units with appropriate antibiotics, but excluded in others).',
          bullets: [
            'Multiple pregnancy (twins or more)',
            'Preterm labor (before 37 weeks)',
            'Breech, transverse, or unstable lie',
            'Meconium-stained liquor (anything other than light staining in some protocols)',
            'Significant vaginal bleeding',
            'Pre-eclampsia or uncontrolled hypertension',
            'Maternal pyrexia (≥37.5–38 °C depending on unit)',
            'Need for continuous EFM that the unit cannot provide via waterproof telemetry',
            'Recent strong opioid analgesia (pethidine/diamorphine within 2 hours) — sedation risk',
            'Some units exclude GBS-positive, HIV, or hepatitis-positive women — local policy varies',
          ],
        },
        {
          title: 'Grey-zone situations',
          content:
            'Some clinical pictures sit between yes and no, and depend heavily on the team\'s confidence and the unit\'s protocol. Discuss these honestly in advance — finding out at 7 cm that the pool is off the table is the worst time to negotiate.',
          bullets: [
            'VBAC (vaginal birth after C-section): some midwife-led units allow it with continuous monitoring, many obstetric units do not',
            'GBS positive: increasingly allowed in the UK with IV antibiotics; varies in the US',
            'Going past 41 weeks: some units restrict access to the pool from 41 + 0 onwards',
            'Slow progress: many protocols require exit if labor is not progressing for assessment',
          ],
        },
      ],
    },
    {
      title: 'How it works clinically',
      content:
        'A well-run water birth has a tight set of clinical practices that protect mother and baby. None of them are arbitrary. Knowing the rules in advance helps you understand why your midwife asks you to step out, and removes the feeling of having something taken away in the moment.',
      subsections: [
        {
          title: 'Temperature — the single most important variable',
          content:
            'Pool temperature should be 36.5–37.5 °C (97.7–99.5 °F) — close to the temperature of your own body. Water that is too warm raises maternal core temperature, which raises the baby\'s heart rate, which on the trace can look like fetal distress. NICE and RCOG explicitly cap second-stage water at 37.5 °C and require the temperature to be checked hourly with a thermometer, not by hand. If the room is cold, top up with warm water carefully — never above the cap.',
          bullets: [
            'Aim 36.5–37.5 °C (97.7–99.5 °F)',
            'Many midwives keep first-stage water slightly cooler (36.5–37 °C) and allow it to drift up for second stage',
            'Hourly thermometer checks — written in the notes',
            'Maternal temperature also monitored hourly in case immersion masks early infection',
          ],
        },
        {
          title: 'Monitoring',
          content:
            'Fetal monitoring continues in the water but uses a waterproof Doppler for intermittent auscultation. Continuous electronic fetal monitoring (CTG) is harder in water — it requires waterproof telemetry, which not every unit owns. If continuous monitoring becomes clinically necessary (slow heart rate decelerations, induction with synthetic oxytocin, suspected distress), most protocols require you to exit the pool. Midwives also watch contraction pattern, blood loss, and your color and behavior the whole time.',
          bullets: [
            'Intermittent auscultation: every 15 min in first stage, every 5 min or after every contraction in second stage (NICE)',
            'Maternal pulse, BP, and temperature checked at agreed intervals',
            'Vaginal examinations are done out of the pool',
            'Anything abnormal triggers reassessment, usually out of the water',
          ],
        },
        {
          title: 'When you must exit',
          content:
            'Every unit publishes exit criteria. They are not punitive — most are about giving the team room to act if something changes. Your birth plan should explicitly note that you accept these criteria, which keeps everything calm if they apply.',
          bullets: [
            'Fetal heart rate concerns or need for continuous CTG that cannot be done in water',
            'Meconium-stained liquor that appears mid-labor',
            'Maternal temperature ≥37.5–38 °C',
            'Bleeding more than show',
            'Need for opioid analgesia',
            'Slow progress requiring oxytocin augmentation',
            'You request to exit — always honored without question',
          ],
        },
        {
          title: 'Bringing the baby up',
          content:
            'When the baby is born underwater the midwife brings them gently to the surface, usually onto your chest. The lift is unhurried but deliberate — too fast a lift can stretch a short cord (cord avulsion is rare but documented). Once the face is in the air the baby takes their first breath; the cord remains intact for delayed clamping (1–3 minutes minimum, often until pulsing stops). The placenta is most often delivered out of the pool, partly because blood loss is hard to assess in water.',
        },
      ],
      callout: {
        variant: 'urgent',
        title: 'The "quick exit" rehearsal',
        text: 'Practice exiting the pool at least once, with help, before labor — at home or on the day you tour the unit. Wet, slippery, mid-contraction is the worst possible moment to figure out the choreography. Agree in advance who supports under each arm and where you go (bed, mat, floor). A planned, practiced exit takes 30–60 seconds. An unplanned one feels like an emergency even when it is not.',
      },
    },
    {
      title: 'Logistics — at home and at hospital',
      content:
        'The practical setup is very different depending on where you give birth. At hospital the unit owns the pool and the protocol; your job is to ask in advance and pack accordingly. At home you become the project manager — pool rental, water supply, drainage, hygiene, and a clear plan B if you transfer.',
      subsections: [
        {
          title: 'Asking at hospital',
          content:
            'Pool availability is the single most overlooked logistic. Many units have one pool serving the whole labor ward; if it is occupied or out of service, you cannot use it. Find this out at your antenatal tour, not on admission.',
          bullets: [
            'Ask: "How many pools does the unit have? What percentage of low-risk women who request the pool actually get one?"',
            'Ask: "Do you offer water birth (delivery in water), or only water labor?"',
            'Ask: "Do you have waterproof CTG telemetry? When was it last serviced?"',
            'Pack: a dark-colored swimsuit top or bikini if you want one, a clip to keep hair off your face, flip-flops for transfers',
            'Hospital provides: the pool, liner, thermometer, towels, sieve for debris, waterproof Doppler',
          ],
        },
        {
          title: 'Renting or buying for home',
          content:
            'Birth pool rental is a small industry in its own right. A 4-week rental package usually includes the pool, single-use liner, hose, tap adaptor, sieve, thermometer, and a pump if needed. Book the pool around 32–34 weeks; popular suppliers run out for spring and autumn delivery dates.',
          bullets: [
            'Rental: typically $40–$80 per week or £80–£150 for a 4-week package',
            'Purchase: $200–$400 for an inflatable pool you can resell',
            'Liner: always single-use, included with rental — never reuse a liner',
            'Hose adaptor: check it fits your kitchen or bathroom tap before labor; some old taps need a special connector',
            'Test fill at 36 weeks: time how long it takes to fill, check the temperature, find the leaks now not later',
          ],
        },
        {
          title: 'Fill time, water supply and the floor',
          content:
            'Filling a typical 600-liter birth pool takes 45–90 minutes depending on tap flow rate and water heater capacity. A standard domestic hot water cylinder is around 150–200 liters — you may run out of hot water mid-fill and need to wait for it to reheat. Combi boilers handle continuous flow but at lower volume per minute. Plan the location: ground floor preferred, near a tap and a drain, on a level surface that can take the weight (a full pool with a person in it weighs around 700 kg). Lay a waterproof sheet under it.',
          bullets: [
            'Fill in early active labor — usually 5–6 cm — not before',
            'Consider a "warm fill" half-fill once labor establishes, then top up with hot water as you get in',
            'Drainage: a submersible pump empties the pool in 20–30 minutes; have it ready',
            'Floor protection: shower curtain or polythene sheet under and around the pool',
          ],
        },
        {
          title: 'Hygiene',
          content:
            'A well-managed pool is hygienically very safe. Studies of birth-pool water culture have found contamination rates broadly comparable to bathwater, with no consistent association with neonatal infection in low-risk births. Sensible hygiene matters: a clean pool, single-use liner, fresh tap water, and a midwife sieving stool or debris with a fine net during pushing.',
          bullets: [
            'Empty bowels in early labor if you can — many people do, naturally',
            'Midwife sieves promptly if stool enters the pool (very common, totally fine)',
            'If waters break in the pool with meconium, you exit',
            'Drain and re-fill if water becomes soiled (rare but possible)',
            'Do not add bath salts, oils, or aromatherapy products — they affect liner and may irritate',
          ],
        },
      ],
      callout: {
        variant: 'tip',
        text: 'Have your hospital bag packed and the car keys on the kitchen table even if you are planning a home water birth. Around 10–15% of planned home births transfer to hospital, almost always non-urgently, and the most common reason is a request for stronger pain relief — which is information, not failure.',
      },
    },
    {
      title: 'Pros, considerations & emotional realities',
      content:
        'Water birth at its best is one of the gentler entries into the world a baby can have, and one of the more autonomous experiences a laboring person can have inside the medical system. It is also not magic. Pain is still pain. Labor is still labor. The pool is a tool — a very good one for many people — not a cure for the intensity of birth.',
      subsections: [
        {
          title: 'Documented benefits',
          content:
            'The benefits are clearer for first-stage immersion than for second-stage delivery, but both bodies of evidence point in the same direction.',
          bullets: [
            'Reduced pain perception in the first stage (Cochrane 2018)',
            'Lower epidural and opioid use (Cluett 2018, Burns 2022)',
            'Higher reported satisfaction and sense of control',
            'Possibly fewer severe perineal tears (3rd/4th degree) in water birth cohorts',
            'Lower rates of postpartum hemorrhage in some cohort data (Bovbjerg 2021)',
            'A calmer environment for the baby — dim light, warm water, immediate skin-to-skin',
          ],
        },
        {
          title: 'Honest considerations',
          content:
            'Going in clear-eyed protects you from disappointment if things shift. The pool is a setting; the underlying labor still has all of its usual demands.',
          bullets: [
            'Pain relief is real but partial — many people still want gas and air or other support, and some still choose epidural (which means leaving the pool)',
            'Limited monitoring options — if you need continuous CTG, you exit',
            'Pool may not be available — single-pool units, busy nights, equipment service',
            'Exit choreography needs to be planned — never rehearsing it is a common regret',
            'Rare but real: cord avulsion if lifted too fast, neonatal water aspiration in compromised babies, theoretical risk of water embolism',
            'Postpartum bleeding is harder to measure in water — most teams deliver the placenta on land',
          ],
        },
        {
          title: 'The emotional picture',
          content:
            'People who have water births often describe the moment of getting in as the single biggest psychological shift of their labor — a sudden quietening of the nervous system. They also describe transition in the pool as still extremely hard, because transition is extremely hard regardless of the setting. Plans change: some people who imagined floating serenely end up pacing the corridor, and some people who never planned a water birth end up in the pool because that was where their body wanted to be. Either way is fine. The pool is a tool that serves your birth, not the other way around.',
        },
      ],
      callout: {
        variant: 'tip',
        text: 'Write a short flexible water-birth plan: "I would like to labor and, if possible, deliver in the pool. I accept the unit\'s exit criteria. If I have to leave the water for any reason, I would still like dim lighting, freedom of position, and skin-to-skin at birth." One paragraph is plenty — clear, kind, and easy for any midwife to honor.',
      },
    },
  ],
  sources: [
    {
      label: 'Committee Opinion 679 — Immersion in Water During Labor and Delivery',
      org: 'ACOG, 2016 (reaffirmed 2024)',
      url: 'https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2016/11/immersion-in-water-during-labor-and-delivery',
    },
    {
      label: 'Immersion in water during labour and birth (Cluett et al.)',
      org: 'Cochrane Database of Systematic Reviews, 2018',
      url: 'https://www.cochrane.org/CD000111',
    },
    {
      label: 'Joint Statement No. 1 — Immersion in water during labour and birth',
      org: 'RCOG / Royal College of Midwives',
      url: 'https://www.rcog.org.uk/media/0a4il5t1/rcog-rcm-joint-statement_immersion-in-water.pdf',
    },
    {
      label: 'NG235 — Intrapartum care (water immersion section)',
      org: 'NICE (UK), 2023',
      url: 'https://www.nice.org.uk/guidance/ng235',
    },
    {
      label: 'Maternal and Neonatal Outcomes Following Waterbirth (Bovbjerg et al.)',
      org: 'Birth, 2021',
      url: 'https://onlinelibrary.wiley.com/doi/10.1111/birt.12572',
    },
    {
      label: 'Outcomes for women and babies of using water for labour and birth (Burns et al.)',
      org: 'BMJ Open, 2022',
      url: 'https://bmjopen.bmj.com/content/12/7/e056517',
    },
    {
      label: 'Position Statement — Hydrotherapy During Labor and Birth',
      org: 'AWHONN',
      url: 'https://www.awhonn.org',
    },
    {
      label: 'Giving birth in water',
      org: 'NHS (UK)',
      url: 'https://www.nhs.uk/pregnancy/labour-and-birth/what-happens/the-stages-of-labour-and-birth/',
    },
  ],
}

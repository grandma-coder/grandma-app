import type { BirthTopic } from '../birthGuideData'

export const WARNING_SIGNS_TOPIC: BirthTopic = {
  key: 'warning-signs',
  emoji: '🚨',
  title: 'Warning Signs',
  subtitle: 'When to call your provider — late pregnancy, labor, postpartum',
  heroColor: '#FFF0F0',
  heroBorder: '#F5B7B7',
  disclaimer:
    'Educational only — not medical advice. If you are worried about a symptom right now, call your midwife, maternity unit, or emergency services without delay. No provider will ever be annoyed that you called.',
  sections: [
    {
      title: 'Trust your instincts — why this matters',
      content:
        'You know your body better than anyone, and warning signs are not always loud. Many of the symptoms that signal a true emergency in late pregnancy and the postpartum period start as a vague feeling that something is "off." The CDC built the entire Hear Her campaign around one finding: too many pregnant and postpartum people raise concerns and are dismissed — by clinicians, by family, sometimes by themselves. The cost of that dismissal is measurable. The US maternal mortality rate has worsened over the last two decades, with Black, Indigenous, and rural birthing people at sharply higher risk. More than 80% of pregnancy-related deaths in the US are considered preventable, and over 60% happen in the postpartum period — many in the days and weeks after hospital discharge, when the medical system has effectively stopped watching.',
      subsections: [
        {
          title: 'Why warning signs get missed',
          content:
            'Postpartum bodies do dramatic things. Bleeding, swelling, mood swings, sleeplessness, breast pain, and exhaustion are normal — and that is exactly the problem. Real emergencies hide inside symptoms that look like the version everyone tells you to expect. "It is just hormones." "Everyone bleeds after birth." "All new mothers are anxious." Sometimes those reassurances are right. Sometimes they are how a woman dies of a treatable condition.',
          bullets: [
            'You may be the first person to notice something is wrong — your gut counts as data',
            'Bring a partner or advocate to appointments if you can; "she does not seem like herself" is a clinically meaningful sentence',
            'Ask directly: "Could this be a blood clot? Could this be preeclampsia? Could this be an infection?" — naming it makes dismissal harder',
            'If you are sent home and the symptom worsens, go back. Returning is not overreacting',
          ],
        },
        {
          title: 'The numbers worth knowing',
          content:
            'These statistics are not meant to scare you — they are meant to give you permission to take yourself seriously. Most pregnancies and postpartum recoveries go well. But the conditions that cause harm tend to escalate quickly and respond well to early treatment, which makes recognizing them early the single most powerful thing you can do.',
          bullets: [
            'Over 60% of US pregnancy-related deaths happen postpartum, and roughly a third of those occur 1 week to 1 year after birth (CDC PMSS)',
            'Postpartum hemorrhage affects 1–5% of births and is the leading cause of maternal death worldwide (WHO)',
            'Postpartum preeclampsia can develop up to 6 weeks after delivery, often in people who had normal blood pressure during pregnancy (ACOG 222)',
            'Venous thromboembolism (DVT/PE) risk stays elevated for at least 6 weeks postpartum and is highest in the first 2 weeks',
            'Postpartum psychosis affects roughly 1–2 in 1,000 births and is a true psychiatric emergency',
          ],
        },
      ],
      callout: {
        variant: 'urgent',
        title: 'The CDC Hear Her urgent maternal warning signs',
        text: 'Severe headache that will not go away. Dizziness or fainting. Changes in vision. Fever of 100.4 °F (38 °C) or higher. Extreme swelling of hands or face. Trouble breathing. Chest pain or fast-beating heart. Severe belly pain that does not go away. Severe nausea or vomiting (not "morning sickness"). Baby movements stopping or slowing during pregnancy. Vaginal bleeding or fluid leaking during pregnancy. Heavy vaginal bleeding or discharge after pregnancy. Swelling, redness, or pain in your leg or arm. Overwhelming tiredness. Thoughts of harming yourself or your baby. Any one of these is a call-now sign — not a wait-and-see sign.',
      },
    },
    {
      title: 'Late pregnancy — third trimester warning signs',
      content:
        'From around 28 weeks onward, several conditions can develop or escalate quickly. Some are very common and benign (Braxton Hicks, round ligament pain, swollen ankles at the end of a long day). Others mimic those benign symptoms and are not benign at all. The third trimester is also when preeclampsia, preterm labor, placental problems, and reduced fetal movement most commonly present. If anything feels different from your baseline — even if you cannot explain why — that is enough reason to call. Maternity triage lines exist precisely for this. They would rather hear from you ten times for nothing than miss the one call that mattered.',
      subsections: [
        {
          title: 'Preeclampsia and severe blood pressure changes',
          content:
            'Preeclampsia is a multi-system disorder usually after 20 weeks. Untreated it can progress to eclampsia (seizures), HELLP syndrome (liver and clotting failure), stroke, or placental abruption. It can develop fast — over hours, not days.',
          bullets: [
            'Severe or persistent headache that does not lift with paracetamol or rest',
            'Vision changes — blurred vision, flashing lights, spots, light sensitivity, temporary loss of vision',
            'Sudden swelling of face, hands, or fingers (not the gradual ankle swelling of late pregnancy)',
            'Pain in the upper right belly or under the ribs (liver pain) — sometimes mistaken for heartburn',
            'Sudden weight gain (more than ~2 kg / 4–5 lb in a week)',
            'Reduced urine output — going much less than usual',
            'A blood pressure reading of 140/90 or higher, or any reading of 160/110 (severe range — call now)',
          ],
        },
        {
          title: 'Preterm labor (before 37 weeks)',
          content:
            'Tightenings before 37 weeks deserve attention, especially if they are regular, painful, or accompanied by other signs. Preterm labor caught early can sometimes be slowed or stopped, and steroids given to help your baby\'s lungs.',
          bullets: [
            'Regular tightenings or cramping coming every 10 minutes or more often',
            'Low dull backache that is new or different',
            'Pelvic pressure as if the baby is pushing down',
            'A change in vaginal discharge — increase, mucus-like, watery, pink-tinged, or bloody',
            'A gush or steady leak of fluid (waters breaking)',
          ],
        },
        {
          title: 'Reduced fetal movement',
          content:
            'You will be told from around 24–28 weeks to learn your baby\'s pattern of movement. There is no magic number ("10 kicks in 2 hours" is no longer the official rule in most countries) — what matters is a change from your baby\'s normal pattern. Babies do not "run out of room" and slow down at the end. Reduced movement can be the only sign of placental insufficiency, cord compression, or impending stillbirth, and it is one of the most under-acted-on warnings.',
          bullets: [
            'If movements feel reduced, lie on your left side, drink something cold, focus for 1–2 hours',
            'If you are still not satisfied — call maternity triage. Do not wait until tomorrow. Do not wait for an appointment',
            'Repeat episodes of reduced movement (even if each resolves) also need review',
            'Never use a home Doppler to "reassure yourself" — it can falsely reassure you while a baby is in distress',
          ],
        },
        {
          title: 'Bleeding, leaking fluid, severe pain',
          content:
            'Any vaginal bleeding in the third trimester is a call-your-provider event. Some causes are minor (cervical irritation after sex, "show" before labor); others are placenta praevia or placental abruption — both medical emergencies.',
          bullets: [
            'Fresh red bleeding, soaking a pad, or bleeding with pain — go in, do not drive yourself',
            'Constant, board-like, severe abdominal pain (rather than wave-like contractions) suggests placental abruption',
            'A gush or trickle of fluid that does not stop — your waters may have broken; you need to be assessed within hours',
            'Greenish, brownish, or foul-smelling fluid suggests meconium or infection',
          ],
        },
      ],
      callout: {
        variant: 'urgent',
        title: 'Severe headache + vision changes = go now',
        text: 'A severe headache that will not lift, especially with vision changes, upper-belly pain, or sudden swelling, is preeclampsia until proven otherwise. Do not wait for your next appointment. Do not "see how it goes overnight." Go to maternity triage or the emergency department, and tell them you are worried about preeclampsia by name.',
      },
    },
    {
      title: 'During labor — warning signs in the unit or at home',
      content:
        'In labor, your team is watching closely — but you are still the person who knows when something feels wrong. Most labors progress without complication, but a handful of intrapartum emergencies require fast action. If you are at home or in early labor, the same principle applies: when in doubt, ring the unit. They will guide you on whether to come in.',
      subsections: [
        {
          title: 'Cord prolapse — a true emergency',
          content:
            'If your waters break and you feel something in the vagina, or you can see the umbilical cord, this is a cord prolapse. The cord can be compressed by the baby\'s head and cut off oxygen within minutes. Get on hands and knees with your bottom in the air, do not push, and call 911 / 999 / 112 immediately. Tell them: "I think the cord has come down."',
        },
        {
          title: 'Meconium and abnormal fluid',
          content:
            'Greenish, brown, or thick black fluid when waters break means the baby has passed meconium in utero — sometimes a normal post-dates event, sometimes a sign of fetal stress. It needs assessment promptly because of the risk of meconium aspiration. Foul-smelling fluid suggests infection (chorioamnionitis) and also needs urgent review.',
        },
        {
          title: 'Maternal fever in labor',
          content:
            'A temperature of 38 °C / 100.4 °F or higher in labor can indicate chorioamnionitis (infection of the membranes) and is associated with neonatal sepsis if untreated. You may feel chills, a fast heart rate, or a tender uterus between contractions. Antibiotics in labor protect both you and the baby.',
        },
        {
          title: 'Abnormal heart rate, severe pain, heavy bleeding',
          content:
            'Your baby\'s heart rate will be monitored intermittently or continuously. Persistent decelerations, a sustained tachycardia, or a flat trace can prompt a call for expedited delivery. Sudden severe abdominal pain that breaks through epidural pain relief, or heavy bright bleeding, can signal uterine rupture (rare, mostly in VBAC) or abruption — both are surgical emergencies.',
          bullets: [
            'Trust your team if they say "we need to move now" — fast decisions in labor save lives',
            'You can ask, briefly, "what are you seeing?" and "what is the plan?" — a good team will tell you in plain words',
            'If you are laboring at home and contractions stop being productive, baby movements feel different, or you are bleeding, transfer is the right call',
          ],
        },
      ],
    },
    {
      title: 'Immediate postpartum — the first 24 hours',
      content:
        'The first day after birth is the highest-risk window for postpartum hemorrhage and immediate complications. You will be monitored closely on the unit, but symptoms can change quickly. Do not assume the staff have noticed everything. If you feel faint, your bleeding feels heavy, your heart is racing, or something is just wrong — press the call button and say so out loud.',
      subsections: [
        {
          title: 'Postpartum hemorrhage (PPH)',
          content:
            'PPH is defined as blood loss of more than 500 mL after vaginal birth or 1000 mL after C-section, or any blood loss causing instability. It is the leading direct cause of maternal death worldwide. Most PPH happens within the first 24 hours (primary PPH), but it can occur up to 12 weeks postpartum (secondary PPH). The symptoms you can feel — before anyone is counting milliliters — are what matter.',
          bullets: [
            'Soaking more than one full maternity pad per hour, for 2 hours in a row',
            'Passing clots larger than a plum (some sources use a golf ball or lemon — pick whichever you remember)',
            'Feeling faint, dizzy, sweaty, cold, or "weird" when you stand up',
            'A racing heart, gasping breaths, blurred vision, or grey/pale skin',
            'A boggy soft uterus when you press above your pubic bone (rather than a firm grapefruit)',
          ],
        },
        {
          title: 'Retained placenta and uterine atony',
          content:
            'If pieces of the placenta stay behind, the uterus cannot clamp down properly and bleeding continues. This may need a manual removal or a trip to theatre. Uterine atony — a uterus that simply will not contract — is treated with massage, oxytocin, additional medications (misoprostol, carboprost, tranexamic acid), and sometimes surgical intervention. Recognizing heavy ongoing bleeding early is what makes treatment work.',
        },
        {
          title: 'Eclampsia and postpartum preeclampsia onset',
          content:
            'Preeclampsia does not always end at delivery. Up to a third of severe cases declare themselves postpartum, often in the first 48 hours. Seizures (eclampsia) can occur with no prior diagnosis. Watch for: severe headache, visual changes, upper-right belly pain, breathlessness, and any blood pressure reading at or above 160/110. Magnesium sulfate is the treatment and works fast — but only if someone gets you assessed.',
        },
      ],
      callout: {
        variant: 'urgent',
        title: 'In hospital, press the call button',
        text: 'If you are soaking a pad in under an hour, passing big clots, feeling faint or breathless, or your heart is pounding — press the button and say "I think I am bleeding too much" or "something is wrong." Do not wait for the next round. Do not minimize. Postpartum hemorrhage is the textbook example of a preventable death when caught in time.',
      },
    },
    {
      title: 'Days to weeks postpartum — the most underrecognized window',
      content:
        'This is the period the medical system tends to forget about, and the period that kills the most people. After you go home, the appointments thin out, the visitors leave, and you are exhausted. This is exactly when postpartum preeclampsia, infection, blood clots, secondary hemorrhage, and severe mood crises declare themselves. The CDC reports that more than half of US pregnancy-related deaths happen after birth, with a significant share occurring 7 days to 1 year postpartum. Knowing what to look for in this window is genuinely life-saving information.',
      subsections: [
        {
          title: 'Postpartum preeclampsia (up to 6 weeks after birth)',
          content:
            'Postpartum preeclampsia can hit people who had completely normal blood pressure throughout pregnancy. It is the diagnosis most often missed because everyone — including the patient — assumes the danger ended at delivery. Untreated it can cause stroke, seizure, and pulmonary edema.',
          bullets: [
            'Severe, unrelenting headache that paracetamol does not touch',
            'Vision changes: blurring, spots, flashing lights, light sensitivity',
            'Pain in the upper right belly or under the ribs',
            'Sudden swelling of face, hands, fingers; rapid weight gain',
            'Shortness of breath at rest (a sign of fluid in the lungs)',
            'Any home BP reading of 140/90 or higher — and 160/110 is a 911/999 sign',
          ],
        },
        {
          title: 'Blood clots — DVT and pulmonary embolism',
          content:
            'Pregnancy raises clotting risk roughly 4–5 fold, and the risk peaks in the first 2 weeks postpartum. C-section, obesity, smoking, immobility, and personal or family history all add to it. A DVT in the leg can break off and travel to the lung — a pulmonary embolism — which can kill within minutes. PE is one of the leading direct causes of maternal death in high-income countries.',
          bullets: [
            'DVT signs: pain, swelling, redness, warmth, or tenderness in one calf or thigh — usually one-sided',
            'PE signs: sudden shortness of breath, sharp chest pain (worse with breathing), coughing (sometimes blood-tinged), fast heartbeat, lightheadedness, sense of impending doom',
            'Any of the PE signs are a 911 / 999 / 112 call — not a clinic visit',
            'Move your legs in bed, hydrate, walk short distances early, and wear compression stockings if your team prescribed them',
          ],
        },
        {
          title: 'Infection and sepsis',
          content:
            'Postpartum infections include endometritis (uterine), wound infection (perineum or C-section scar), mastitis, and urinary tract infection. Untreated they can progress to sepsis — a body-wide inflammatory response that is rapidly fatal without antibiotics. Sepsis kills around 1 in 10 women who die of pregnancy-related causes worldwide.',
          bullets: [
            'Fever of 38 °C / 100.4 °F or higher — measure with a thermometer, not a hand on the forehead',
            'Foul-smelling vaginal discharge or lochia',
            'Increasing pain, redness, swelling, or pus at a perineal tear or C-section scar',
            'A scar that opens, leaks, or smells',
            'Severe pelvic or abdominal pain, persistent shaking chills, confusion, very fast heart rate, or fast breathing',
            'Mastitis: a hot, red, tender wedge on one breast plus fever and flu-like aches — needs antibiotics within 24 hours if not improving with feeding/expressing',
          ],
        },
        {
          title: 'Secondary postpartum hemorrhage',
          content:
            'Heavy bleeding more than 24 hours after birth (and up to 12 weeks) is uncommon but real. Causes include retained placenta fragments and infection. Lochia should taper from red to pink to yellow-white over 4–6 weeks. Bright red bleeding that gets heavier instead of lighter — or bleeding that returns after stopping — is a call-your-provider event. Soaking more than one pad per hour, or passing clots larger than a plum, is an emergency at any point in the postpartum period.',
        },
        {
          title: 'Mood crisis — postpartum depression, anxiety, OCD, psychosis',
          content:
            'Perinatal mood and anxiety disorders affect roughly 1 in 5 birthing parents. Most are treatable with therapy, peer support, and sometimes medication. Two presentations need urgent action.',
          bullets: [
            'Postpartum depression / anxiety: persistent sadness, hopelessness, loss of interest, intense worry, panic attacks, inability to sleep even when the baby sleeps, difficulty bonding — beyond the 2-week "baby blues" window',
            'Suicidal thoughts, or thoughts of harming the baby — call your provider, a crisis line (988 in the US, 116 123 Samaritans in the UK), or go to the ER. These thoughts are a symptom, not a character flaw',
            'Postpartum psychosis (~0.1–0.2% of births): rapid onset (often days 3–14), confusion, paranoia, hallucinations, mania, severe insomnia, racing thoughts, religious or grandiose delusions, sudden personality change. This is a psychiatric emergency — do not leave the person alone, and go directly to the ER',
            'Risk is much higher with personal or family history of bipolar disorder or previous postpartum psychosis — flag this in pregnancy so a plan exists',
          ],
        },
      ],
      callout: {
        variant: 'urgent',
        title: 'Postpartum psychosis is a 911/999 emergency',
        text: 'If a new parent suddenly seems confused, paranoid, hyperactive, not sleeping at all, hearing or seeing things, talking about being chosen or being watched, or saying things that do not make sense — this is postpartum psychosis until proven otherwise. Do not let her be alone with the baby. Take her to the emergency department or call emergency services. Treatment is fast and effective — and the alternative can be catastrophic.',
      },
    },
    {
      title: 'Who to call and when — your escalation map',
      content:
        'Knowing who to call before you need to call them is the difference between a fast response and a fatal delay. Write the numbers down on the fridge and in your phone today. Tell your partner and one family member where to find them. The goal is simple: match the urgency of the symptom to the right door — and when in doubt, escalate up, not down. No provider on any of these lines will ever be annoyed that you called.',
      subsections: [
        {
          title: 'Your provider / midwife office (business hours, non-urgent)',
          content:
            'For symptoms that worry you but are not acute: mild new pain, persistent low-grade discomfort, breastfeeding questions, mood concerns that have lasted more than 2 weeks, a slightly heavier bleed than expected, mild swelling. Most offices have a triage nurse who calls back within hours. If you are told to wait for an appointment and the symptom worsens, escalate.',
        },
        {
          title: 'Maternity triage / labor and delivery line (24/7)',
          content:
            'Every maternity unit has a 24-hour triage line. Use it for: reduced fetal movements, possible labor, possible waters breaking, any third-trimester bleeding, suspected preeclampsia symptoms, postpartum bleeding that worries you, fever, scar problems, and any of the CDC Hear Her warning signs. They will tell you whether to come in, drive, or call an ambulance. Save this number on speed dial from 28 weeks.',
        },
        {
          title: 'Emergency department (urgent, can drive or be driven)',
          content:
            'For severe symptoms where you can still safely travel: severe headache with vision changes, severe abdominal pain, scar that has opened, suspected infection with high fever, mental health crisis, or any postpartum symptom your maternity unit asks you to bring to the ER. Tell the triage nurse you are pregnant or recently gave birth and how many weeks/days postpartum — this changes the triage category immediately.',
        },
        {
          title: 'Emergency services — 911 / 999 / 112 (call now, do not drive)',
          content:
            'Call an ambulance for: heavy bleeding (soaking pads, feeling faint), chest pain or severe shortness of breath, suspected pulmonary embolism, suspected stroke (face droop, arm weakness, slurred speech), seizure, suspected cord prolapse, loss of consciousness, severe one-sided calf pain with breathlessness, suicidal crisis, or postpartum psychosis. Do not drive yourself. Do not wait for a friend. Lie down on your left side while you wait.',
        },
        {
          title: 'Mental health crisis lines',
          content:
            'These exist because perinatal mood crises are common, treatable, and time-sensitive. Calling is not a last resort — it is a normal first step.',
          bullets: [
            'US: 988 Suicide and Crisis Lifeline (call or text)',
            'US: Postpartum Support International HelpLine — 1-800-944-4773 (call or text "HELP" to 800-944-4773)',
            'UK: Samaritans — 116 123 (free, 24/7)',
            'UK: PANDAS Foundation — 0808 1961 776',
            'Canada: Talk Suicide Canada — 1-833-456-4566',
            'Australia: PANDA — 1300 726 306',
          ],
        },
      ],
      callout: {
        variant: 'provider',
        title: 'A script for the call',
        text: '"Hi, my name is [name], I am [X weeks pregnant / X days postpartum], and I am calling because [symptom in plain words]. I am worried it could be [preeclampsia / a blood clot / an infection / postpartum hemorrhage / postpartum psychosis]." Naming the condition out loud changes how you are triaged. You are allowed to do this. You are allowed to push back if you are dismissed. You are allowed to go in even if they say you do not need to.',
      },
    },
  ],
  sources: [
    {
      label: 'Hear Her — Urgent maternal warning signs',
      org: 'CDC',
      url: 'https://www.cdc.gov/hearher/maternal-warning-signs/index.html',
    },
    {
      label: 'Pregnancy Mortality Surveillance System',
      org: 'CDC',
      url: 'https://www.cdc.gov/maternal-mortality/php/pregnancy-mortality-surveillance/index.html',
    },
    {
      label: 'Committee Opinion 736 — Optimizing Postpartum Care',
      org: 'ACOG, 2018',
      url: 'https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2018/05/optimizing-postpartum-care',
    },
    {
      label: 'Practice Bulletin 222 — Gestational Hypertension and Preeclampsia',
      org: 'ACOG, 2020',
      url: 'https://www.acog.org/clinical/clinical-guidance/practice-bulletin/articles/2020/06/gestational-hypertension-and-preeclampsia',
    },
    {
      label: 'Practice Bulletin 183 — Postpartum Hemorrhage',
      org: 'ACOG, 2017',
      url: 'https://www.acog.org/clinical/clinical-guidance/practice-bulletin/articles/2017/10/postpartum-hemorrhage',
    },
    {
      label: 'Postpartum Hemorrhage Project',
      org: 'AWHONN',
      url: 'https://www.awhonn.org/education/hospital-products/postpartum-hemorrhage-project/',
    },
    {
      label: 'NG194 — Postnatal care',
      org: 'NICE (UK), 2021',
      url: 'https://www.nice.org.uk/guidance/ng194',
    },
    {
      label: 'Signs that something might be wrong (pregnancy and postnatal)',
      org: 'NHS (UK)',
      url: 'https://www.nhs.uk/pregnancy/keeping-well/signs-of-illness/',
    },
    {
      label: 'WHO recommendations on maternal and newborn care for a positive postnatal experience',
      org: 'World Health Organization, 2022',
      url: 'https://www.who.int/publications/i/item/9789240045989',
    },
    {
      label: 'Postpartum Support International',
      org: 'PSI',
      url: 'https://www.postpartum.net/',
    },
  ],
}

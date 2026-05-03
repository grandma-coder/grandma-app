import type { BirthTopic } from '../birthGuideData'

export const HOME_TOPIC: BirthTopic = {
  key: 'home',
  emoji: '🏡',
  title: 'Home Birth',
  subtitle: 'Midwife-led, low-intervention, with a clear safety net',
  heroColor: '#E8F0FF',
  heroBorder: '#B7C8F5',
  disclaimer:
    'Educational only — not medical advice. Home birth eligibility and safety depend on your specific clinical picture and local services. Discuss with your midwife, obstetrician, or family doctor.',
  sections: [
    {
      title: 'What is home birth — and what does the evidence say?',
      content:
        'Home birth means giving birth in your own home, with a qualified midwife (and usually a second midwife or assistant) present from active labor through the first hours after the baby arrives. It is not a return to "no medicine" — your midwife brings clinical equipment, monitors you and the baby with the same standards used in a midwife-led unit, and has a written transfer plan in case you need a hospital. For genuinely low-risk pregnancies in places with integrated midwifery (the UK, the Netherlands, parts of Canada, Australia, New Zealand), large studies show outcomes broadly comparable to hospital birth — but the picture is more nuanced for first-time parents and in countries where home birth is not part of the mainstream system.',
      subsections: [
        {
          title: 'The Birthplace in England Study (BMJ 2011) — read this honestly',
          content:
            'The Birthplace cohort followed 64,538 low-risk births across home, freestanding midwife-led units, alongside midwife-led units, and obstetric units. For multiparous women (those who had given birth before), planned home birth was as safe as hospital birth on the composite measure of adverse perinatal outcomes, with significantly fewer interventions. For nulliparous women (first baby), there was a small but real increase in adverse perinatal outcomes at home — about 9.3 per 1,000 versus 5.3 per 1,000 in obstetric units. That is roughly a 4-in-1,000 absolute difference. Both numbers are low. We do not hide this — you should weigh it for yourself, in your situation.',
        },
        {
          title: 'How the picture differs in the United States',
          content:
            'US home birth outcomes look different from UK and Dutch data because the system is different. Midwifery is less integrated with hospital care, transfer logistics can be slower, and not all home-birth midwives have the same training. The Cheyney et al. (2014) MANA Stats analysis of 16,924 planned US home births showed low intervention and high satisfaction for low-risk parents, but ACOG (Committee Opinion 697, 2017) still considers hospitals and accredited birth centers the safest settings, while affirming the patient\'s right to choose home birth. The Hutton et al. (2019) meta-analysis found no significant difference in perinatal mortality between home and hospital for low-risk women in well-integrated systems — the qualifier matters.',
        },
        {
          title: 'What the studies agree on',
          content:
            'Across UK, Dutch, Canadian, and US data, planned home birth with a qualified midwife consistently shows: significantly lower rates of cesarean, instrumental delivery, episiotomy, and severe perineal trauma; higher rates of intact perineum and successful breastfeeding initiation; and higher maternal satisfaction. The trade-off is the time-to-emergency-help if something rare and serious happens. Choosing home birth is choosing a different risk profile, not a "no risk" path.',
          bullets: [
            'C-section rate at planned home birth: ~5%, vs ~25–30% at standard US obstetric units',
            'Instrumental delivery (forceps/vacuum): ~3% at home vs ~10–15% in hospital',
            'Episiotomy: <2% at home vs 5–15% in hospital depending on country',
            'Maternal satisfaction scores are consistently 15–25% higher for planned home birth',
          ],
        },
      ],
    },
    {
      title: 'Are you a candidate? Clinical eligibility',
      content:
        'Home birth is for low-risk pregnancies. NICE NG235 (UK) and ACOG Committee Opinion 697 (US) define eligibility similarly: a singleton, head-down baby at 37–42 weeks, no maternal medical conditions that complicate birth, and no obstetric complications in this pregnancy. Eligibility is not static — it is reviewed at every prenatal visit and again when labor starts. A midwife who clears you at 36 weeks and finds the baby breech at 39 weeks will recommend a different plan, not because anything is "wrong" with you, but because the safety math has changed.',
      subsections: [
        {
          title: 'Generally suitable',
          content:
            'These are the conditions most home-birth midwives and national guidelines agree make home birth a reasonable option. Even within this list, your midwife will make an individual assessment.',
          bullets: [
            'Singleton pregnancy (one baby)',
            'Cephalic presentation (head-down) confirmed at 36+ weeks',
            'Spontaneous labor between 37 and 42 weeks',
            'No significant maternal medical conditions (well-controlled asthma, treated thyroid, etc. usually fine)',
            'BMI generally under 35 — varies by service',
            'No previous severe obstetric complication (postpartum hemorrhage requiring transfusion, shoulder dystocia with injury, etc.)',
            'Living within a reasonable transfer distance of an obstetric unit (most services use 30–45 minutes as a guide)',
          ],
        },
        {
          title: 'Generally not suitable (absolute or relative contraindications)',
          content:
            'These conditions either rule out home birth or require a careful, individualized conversation. Some are absolute (placenta praevia); others depend on the country, the midwife, and your specific picture (previous C-section is increasingly considered case-by-case in the UK; in the US it is generally discouraged at home).',
          bullets: [
            'Multiple pregnancy (twins, triplets)',
            'Breech, transverse, or unstable lie at term',
            'Placenta praevia or low-lying placenta',
            'Pre-eclampsia, gestational hypertension, or significant proteinuria',
            'Pre-existing diabetes or insulin-dependent gestational diabetes',
            'Previous C-section (HBAC) — varies widely; explicitly not recommended by ACOG at home, considered case-by-case under NHS rules',
            'Active genital herpes lesion at the onset of labor',
            'GBS positive without ability to administer IV antibiotics during labor (varies — many CNMs carry IV antibiotics)',
            'Preterm labor (<37 weeks) or post-term beyond 42 weeks',
            'Reduced fetal movements, suspected fetal growth restriction, or abnormal antenatal monitoring',
          ],
        },
      ],
      callout: {
        variant: 'provider',
        title: 'Conversations to have early',
        text: 'Bring up home birth with your provider by 20 weeks if you are seriously considering it. Ask: "Based on my history, am I a candidate?" "What would change that?" "How do you feel about home birth as a backup plan if everything stays low-risk?" Some obstetricians will not provide shared care — knowing this early lets you find a midwife.',
      },
    },
    {
      title: 'Choosing a midwife — credentials, experience, fit',
      content:
        'Your midwife is the single most important factor in a safe home birth. Credentials, training, experience, and the integration of her practice with the local hospital matter more than personality (though personality matters too — you need to feel safe being naked, scared, and loud in front of this person). In the US there are two main credentials, and the difference is significant. In the UK, NHS midwives are all registered with the Nursing and Midwifery Council (NMC); private "independent midwives" exist but face indemnity insurance challenges.',
      subsections: [
        {
          title: 'CNM vs CPM (United States)',
          content:
            'A Certified Nurse-Midwife (CNM) is a registered nurse with a master\'s degree in midwifery, certified by the American Midwifery Certification Board. CNMs are licensed in all 50 states, can prescribe medication, and most have hospital privileges or formal physician backup. A Certified Professional Midwife (CPM) is a direct-entry midwife credentialed by the North American Registry of Midwives — they specialize in out-of-hospital birth and complete an apprenticeship-based training. CPMs are legally recognized in roughly 37 states, with scope of practice and prescriptive authority varying widely. Both can attend safe home births; the key questions are training depth, transfer protocols, and what they carry.',
          bullets: [
            'CNM: nursing background, hospital integration, prescriptive authority, legal in all 50 states',
            'CPM: home and birth-center specialist, apprenticeship-trained, legal in ~37 states',
            'CM (Certified Midwife): direct-entry but with the same exam as CNMs — recognized in only a handful of states',
            'A "lay" or unlicensed midwife is a different category — neither ACOG nor MANA recommend birthing with an uncredentialed attendant',
          ],
        },
        {
          title: 'Questions to ask before you hire',
          content:
            'You are interviewing the person who will carry the bag of emergency medications into your bedroom. This is not the moment to be polite. Most midwives expect and welcome these questions; an evasive answer is itself information.',
          bullets: [
            '"How many home births have you attended in the last year? In your career?"',
            '"What is your transfer rate? Of those, how many were emergency transfers?"',
            '"Which hospital do you transfer to, and do you have a relationship with the OB team there?"',
            '"What medications and equipment do you bring?"',
            '"Who is your second attendant, and have you worked together before?"',
            '"What happens if I go into labor when you are unavailable?"',
            '"What are the situations in which you would recommend transfer, and how do you handle disagreement?"',
            '"Do you have malpractice insurance? Indemnity coverage?"',
            '"Can I speak with two or three recent clients — including someone who transferred?"',
          ],
        },
        {
          title: 'The two-midwife rule',
          content:
            'Standard of care in the UK, the Netherlands, and most US home-birth practices is two qualified attendants at the actual birth — typically the primary midwife plus a second midwife, a student midwife, or a trained birth assistant. The reason is simple: in the rare event of a complication that affects both mother and baby simultaneously (postpartum hemorrhage with a baby who needs resuscitation, for example), one person cannot do both jobs. If a midwife tells you she works alone, that is a serious red flag — push back hard.',
        },
      ],
    },
    {
      title: 'Safety, equipment & the transfer plan',
      content:
        'The transfer plan is not a "what if it goes wrong" afterthought — it is a structural part of every home birth. About 10–15% of planned home births transfer to hospital, and the overwhelming majority of those transfers are non-emergency: slow progress, request for an epidural, prolonged ruptured membranes, or maternal exhaustion. Genuine emergency transfer by ambulance happens in less than 1% of planned home births. Understanding this changes how you feel about transfer: it is a normal part of the spectrum of home birth, not a failure.',
      subsections: [
        {
          title: 'What your midwife brings',
          content:
            'A qualified home-birth midwife arrives with the kit needed to manage the same first-line complications a midwife-led hospital unit handles. She is not a one-woman ICU, but she can stabilize the situation while you transfer.',
          bullets: [
            'Doppler or hand-held CTG for intermittent fetal heart-rate monitoring',
            'Blood pressure cuff, pulse oximeter, thermometer, sterile gloves, sterile cord clamps',
            'Oxygen tank with neonatal and adult masks',
            'Neonatal resuscitation equipment (Ambu bag, suction, warm towels)',
            'IV access supplies and fluids',
            'Uterotonic medications for postpartum hemorrhage (oxytocin/Pitocin, methergine, sometimes misoprostol/Cytotec)',
            'Local anesthetic and suture materials for perineal repair',
            'Vitamin K, erythromycin eye ointment (if you choose them for baby)',
          ],
        },
        {
          title: 'When transfer is recommended',
          content:
            'Most transfers are decided calmly — your midwife says "I think we should head in," you put on shoes, and you drive to the hospital you pre-registered with at 36 weeks. Knowing the categories in advance removes the panic from the moment.',
          bullets: [
            'Slow progress in active labor (most common reason — accounts for ~40% of transfers)',
            'Request for epidural or stronger pain relief',
            'Meconium-stained waters (green or brown amniotic fluid)',
            'Persistent abnormal fetal heart-rate pattern',
            'Maternal blood pressure rise or temperature above 38°C',
            'Prolonged ruptured membranes without labor (>18–24 hours, varies by service)',
            'Retained placenta (>30–60 minutes after birth)',
            'Postpartum hemorrhage that does not respond to first-line management',
            'Newborn who needs more than brief resuscitation',
          ],
        },
        {
          title: 'How transfer actually works',
          content:
            'For non-emergency transfer, you usually drive yourself or your partner drives — your midwife follows or meets you at the hospital. Pre-register at your transfer hospital between 34 and 36 weeks so the chart is open and you do not lose 20 minutes at admissions. For emergency transfer, your midwife calls 911/999/112; in many places, dispatchers prioritize obstetric emergencies. Have your address visible on the front of the house, the door unlocked once you call, and your hospital bag at the door — packed since 36 weeks for exactly this scenario.',
        },
      ],
      callout: {
        variant: 'urgent',
        title: 'Call 911/999/112 immediately if',
        text: 'Cord prolapse (you or your midwife sees or feels the cord at the vaginal opening), heavy fresh red bleeding before the baby is born, sudden severe abdominal pain that does not ease between contractions, fetal heart rate that does not recover, maternal collapse, or a newborn who is not breathing after 60 seconds of resuscitation. These are minutes-matter events — your midwife will lead, your job is to get the door open and clear the path.',
      },
    },
    {
      title: 'Setting up your home',
      content:
        'A home birth does not require renovating your bedroom. Most labors happen in spaces that look almost normal — a slightly-rearranged living room, a bathroom with a pool, lots of towels. Practical preparation matters more than aesthetic. Your midwife will give you a supply list at around 32–34 weeks; the items below are the universals. Aim to have everything ready by 36 weeks because some babies arrive early and you do not want to be inflating a pool while contracting.',
      subsections: [
        {
          title: 'The birth pool (if you want one)',
          content:
            'Most people who plan home births want the option of water for pain relief, even if they do not deliver in the pool. Rental pools cost $40–80 per week and come with a single-use liner, hose adaptor, pump, and thermometer. Reserve from a local supplier at 32–34 weeks; have it delivered by 37 weeks and set up at the first sign of early labor. Fill time is 45–90 minutes — you do not want to start filling at 8 cm. Test the temperature: aim for 36.5–37.5°C (97.7–99.5°F). Warmer water raises the baby\'s heart rate and your core temperature.',
          bullets: [
            'Set up location: structurally sound floor (a full pool can weigh 700+ kg), close to a hot water source, near a power outlet',
            'Floor protection: tarp + old blankets under and around the pool',
            'Top-up plan: a kettle on rolling boil for the inevitable cooling',
            'Drain plan: a submersible pump and a hose to the nearest drain — your midwife can advise',
          ],
        },
        {
          title: 'Supplies your midwife will ask for',
          content:
            'Most are things you already have or can pick up at a pharmacy. Buy the consumables in bulk — you cannot have too many towels or pads. Wash and set aside a few days before your due date so they are clean and within reach.',
          bullets: [
            'Waterproof mattress protector + an old fitted sheet you do not mind staining',
            'Plastic sheeting or shower curtains to put under the bed and pool',
            '20+ old towels and washcloths (more is better)',
            'Maternity pads (heavy flow) — at least 2 packs',
            'Disposable underwear or old underwear you can throw out',
            'A bowl, ice chips, and a flexible straw for sips during labor',
            'Snacks and drinks for you, your partner, and the midwife team — labor is long',
            'A heating pad, hot water bottle, and several pillows in different shapes',
            'A garbage bag or bucket lined for placenta and used materials',
          ],
        },
        {
          title: 'Lighting, warmth, ambulance access',
          content:
            'Oxytocin — the hormone that drives labor — is shy. It flows in dim, warm, private spaces and stalls under bright lights and the sense of being observed. At the same time, your midwife needs to see what she is doing, especially in second stage and for any perineal repair. The simple solution: warm low light during labor (lamps, fairy lights, candles if you want), with a strong reading lamp or headlamp ready for the actual birth. Keep the room warm — 22–24°C / 72–75°F — for the baby\'s arrival; a space heater helps in winter. For ambulance access: house number visible from the road at night, hallway and stairwell clear, door unlockable from outside, and the address saved in your partner\'s and midwife\'s phones. If you live in an apartment, prop the lobby door at the first sign you might transfer.',
        },
      ],
      callout: {
        variant: 'tip',
        title: 'The 36-week walkthrough',
        text: 'At 36 weeks, do a full walkthrough with your partner and (ideally) your midwife. Inflate the pool. Find the breaker box, the water shutoff, the towels, the postpartum supplies. Practice the route to the hospital — at the time of day you are most likely to labor. The day-of you should be able to find everything in the dark and at 8 cm.',
      },
    },
    {
      title: 'Pros, considerations & emotional preparation',
      content:
        'Home birth gives you something hospital birth structurally cannot: continuity, familiarity, and a setting where you set the rules. It also asks something hospital birth does not: that you accept a slightly different risk profile, plan actively for transfer, and make peace with uncertainty. The people who do well with home birth tend to be those who have prepared honestly — read the data, talked to people who transferred, and made the choice with both eyes open.',
      subsections: [
        {
          title: 'What home birth gives you',
          content:
            'These benefits are well-documented and consistent across high-quality cohort studies. They are not marketing — they are statistics.',
          bullets: [
            'One-to-one continuous care from a midwife you know — the single most evidence-backed birth intervention (Cochrane 2017)',
            'Significantly lower rates of cesarean, instrumental delivery, episiotomy, and severe tearing',
            'Freedom to move, eat, drink, vocalize, and choose positions without negotiation',
            'No bright lights, no shift change at the worst moment, no being moved between rooms',
            'Immediate undisturbed skin-to-skin in your own bed',
            'Higher rates of breastfeeding initiation and continuation at 6 weeks',
            'Higher maternal satisfaction and lower rates of birth-related PTSD',
          ],
        },
        {
          title: 'The honest trade-offs',
          content:
            'Home birth removes some interventions and adds some constraints. Knowing both lets you make the choice once and not re-litigate it during a contraction.',
          bullets: [
            'No epidural — if you decide you want one, you transfer (this is fine; it happens to ~10% of planned home births)',
            'Time to emergency obstetric or neonatal care is longer than at a hospital',
            'A small but real increase in adverse outcomes for first-time parents at home (Birthplace 2011)',
            'Cost: in the US, home birth midwives often cost $4,000–8,000 out of pocket and may not be insurance-covered',
            'Cleanup is your problem — your midwife will help with the medical disposal but the laundry is yours',
            'Emotional pressure to "succeed" at home — be ready to release this if you transfer',
          ],
        },
        {
          title: 'Emotional preparation — release the script',
          content:
            'Birth is not a performance. The home-birth parent who transfers at 7 cm and has a beautiful epidural birth has not "failed" at home birth — she has made a series of good decisions in real time. Talk with your partner before labor about what transfer would feel like, agree on language ("we are choosing the next safest thing"), and ask your midwife for a postnatal debrief whether or not you transfer. Read birth stories that ended differently than planned. Notice if you are attaching your identity to the location of the birth — that attachment is the thing that makes transfer painful, not the transfer itself. The goal of any birth plan is a healthy parent and a healthy baby, in that order, with as much of the experience you wanted as the day allows.',
        },
      ],
      callout: {
        variant: 'tip',
        title: 'Doula + midwife is the gold combo',
        text: 'Even with continuous midwifery care, a doula adds something different: a non-clinical support person whose only job is you. Cochrane evidence (2017) shows doula support independently reduces cesarean and increases satisfaction. At a home birth, your midwife is also doing clinical work — a doula keeps the emotional thread unbroken when the midwife steps away to chart, prepare medications, or assess.',
      },
    },
  ],
  sources: [
    {
      label: 'Committee Opinion 697 — Planned Home Birth',
      org: 'ACOG, 2017 (reaffirmed)',
      url: 'https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2017/04/planned-home-birth',
    },
    {
      label: 'NG235 — Intrapartum care (place of birth)',
      org: 'NICE (UK), 2023',
      url: 'https://www.nice.org.uk/guidance/ng235',
    },
    {
      label: 'Perinatal and maternal outcomes by planned place of birth (Birthplace in England)',
      org: 'Birthplace in England Collaborative Group, BMJ 2011',
      url: 'https://www.bmj.com/content/343/bmj.d7400',
    },
    {
      label: 'Outcomes of Care for 16,924 Planned Home Births in the United States (Cheyney et al.)',
      org: 'Journal of Midwifery & Women\'s Health, 2014',
      url: 'https://onlinelibrary.wiley.com/doi/10.1111/jmwh.12172',
    },
    {
      label: 'Perinatal or neonatal mortality among women who intend at the onset of labour to give birth at home (Hutton et al.)',
      org: 'EClinicalMedicine (Lancet), 2019',
      url: 'https://www.thelancet.com/journals/eclinm/article/PIIS2589-5370(19)30100-9/fulltext',
    },
    {
      label: 'Planned hospital versus planned home birth (Olsen & Clausen)',
      org: 'Cochrane Database of Systematic Reviews',
      url: 'https://www.cochrane.org/CD000352',
    },
    {
      label: 'MANA Stats Project — home birth outcomes registry',
      org: 'Midwives Alliance of North America',
      url: 'https://mana.org/research/mana-stats',
    },
    {
      label: 'Home birth — position statement',
      org: 'Royal College of Midwives (UK)',
      url: 'https://www.rcm.org.uk',
    },
    {
      label: 'Where to give birth: the options',
      org: 'NHS (UK)',
      url: 'https://www.nhs.uk/pregnancy/labour-and-birth/preparing-for-the-birth/where-to-give-birth-the-options/',
    },
    {
      label: 'Birth center care and standards',
      org: 'American Association of Birth Centers (AABC)',
      url: 'https://www.birthcenters.org',
    },
  ],
}

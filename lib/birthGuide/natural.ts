import type { BirthTopic } from '../birthGuideData'

export const NATURAL_TOPIC: BirthTopic = {
  key: 'natural',
  emoji: '🌿',
  title: 'Natural Birth',
  subtitle: 'Physiological labor, supported by your team',
  heroColor: '#E8F8E8',
  heroBorder: '#B7E5B7',
  disclaimer:
    'Educational only — not medical advice. Every pregnancy and labor is different. Discuss your specific situation with your midwife, obstetrician, or family doctor, and trust your instincts if something feels wrong.',
  sections: [
    {
      title: 'What is natural birth?',
      content:
        'Natural birth — also called physiological or unmedicated birth — means giving birth vaginally without medical interventions to manage pain or speed labor. No epidural, no synthetic oxytocin to induce or augment, no episiotomy unless truly needed. Your body leads, your team supports. ACOG calls this approach "low-intervention" and confirms it is safe and beneficial for low-risk pregnancies. It is not about toughing it out — it is about trusting an ancient process while keeping skilled eyes nearby in case anything goes off course.',
      subsections: [
        {
          title: 'How it differs from "managed" labor',
          content:
            'In a fully natural birth you move freely, eat and drink as you want, push when your body tells you to, and meet your baby on your chest with the cord still pulsing. In a typical hospital "managed" labor you may have an IV, continuous fetal monitoring, restricted positions, fluids only by mouth, directed pushing on a clock. Both can be safe — they just feel very different. The 2017 ACOG opinion explicitly recommends offering low-risk patients intermittent monitoring, oral hydration, freedom of movement, and delayed pushing.',
          bullets: [
            'Hybrid is normal — most "natural" births still include a saline lock, intermittent monitoring, and the vitamin K shot for baby',
            'Choosing natural is not all-or-nothing — you can plan low-intervention and still accept tools you genuinely need',
            'A flexible birth plan beats a rigid one every time',
          ],
        },
        {
          title: 'Who chooses it and why',
          content:
            'Some choose natural birth because they want to feel the experience fully; others to avoid the cascade of interventions (epidural → slower labor → instrumental delivery). The WHO 2018 intrapartum guidance explicitly names "positive childbirth experience" as a clinical outcome alongside live mother and live baby. Beyond the experience itself, the documented benefits include faster recovery, better breastfeeding initiation, and the hormonal cocktail (oxytocin, endorphins, prolactin) that primes maternal bonding circuits.',
          bullets: [
            'Common motivations: faster recovery, no medication side effects, alert baby on chest, hormonal benefits',
            'When natural may not be the wiser path: history of severe trauma, untreated severe anxiety about pain, certain high-risk pregnancies',
            'Choosing pain relief is not a failure — it is information your body gave you',
          ],
        },
      ],
      callout: {
        variant: 'tip',
        text: 'If you have never been in labor before, you cannot know in advance how your body will respond. The best plan is a flexible plan — your provider should support you in either direction without judgment.',
      },
    },
    {
      title: 'The four phases of labor',
      content:
        'Labor is not one experience — it is four distinct phases, each with its own job, intensity, and coping needs. Understanding the geography of labor takes the fear out of "what comes next." NICE and ACOG define these phases similarly, with minor differences in dilation thresholds. The 2014 redefinition of active labor (Friedman → Zhang curves) moved the threshold from 4 cm to 6 cm — meaning many people are now sent home who would have been admitted a decade ago. This is good news: hospital admission in early labor increases intervention rates without improving outcomes for low-risk births.',
      subsections: [
        {
          title: 'Early labor (latent phase, 0–6 cm)',
          content:
            'The longest phase, often 6–12 hours in a first birth and 4–8 hours in subsequent births. Contractions are real but irregular — 5–30 minutes apart, lasting 30–60 seconds — and feel like strong period cramps that come in waves. The job here is to conserve energy and let your body do the early work without you fighting it.',
          bullets: [
            'Stay home, alternate gentle activity and rest, eat light easy food (toast, soup, banana)',
            'Drink to thirst — small sips between contractions',
            'Warm shower, comforting movie, dim light, your own playlist',
            'Avoid timing every contraction obsessively — use an app, but put it down',
            'Call your provider if waters break, you see fresh red bleeding, or baby movements feel reduced',
          ],
        },
        {
          title: 'Active labor (6–10 cm)',
          content:
            'Contractions become rhythmic and unmistakable: every 3–5 minutes, lasting 60–90 seconds, and you cannot talk through them. The 5-1-1 rule (every 5 min, 1 min long, for 1 hour) is when most providers want you to come in; many hospitals now use 4-1-1. Average duration is 4–8 hours for a first birth and 2–5 hours subsequently.',
          bullets: [
            'Go to hospital, call midwife to home, or get into the birth pool',
            'Rhythmic movement — rocking, swaying, slow-dancing with your partner',
            'Low moaning vocalizations open the pelvic floor; high screaming tightens it ("Sphincter Law", Ina May Gaskin)',
            'Warm water, dim light, minimal interruption protect oxytocin flow',
            'Change position every 20–30 minutes if labor stalls',
          ],
        },
        {
          title: 'Transition (8–10 cm)',
          content:
            'The shortest, most intense phase: usually 15–60 minutes. Contractions come 2–3 minutes apart, lasting 60–90 seconds, with little rest between. Common signs include shaking, nausea or vomiting, and a feeling of being out of control. The sentence "I can\'t do this anymore" is so reliable in transition that experienced midwives recognize it as a sign the baby is almost here.',
          bullets: [
            'The body floods with adrenaline — evolutionarily this kept laboring mammals alert in the final moments',
            'Surrender, do not control — one contraction at a time',
            'Cold cloth on neck and forehead helps with overheating',
            "Partner's voice low and steady — short specific phrases (\"I'm here\", \"breathe down\")",
          ],
        },
        {
          title: 'Pushing & birth (second stage)',
          content:
            'Once fully dilated, the urge to push arrives — sometimes immediately, sometimes after a brief "rest and be thankful" lull (up to an hour). Length varies widely: 5 minutes to 3 hours. ACOG defines prolonged second stage as more than 3 hours with epidural (4 hours for first baby) or 2 hours without. Cochrane evidence suggests spontaneous "breathing the baby down" reduces perineal trauma and fatigue compared with directed breath-holding pushing.',
          bullets: [
            "Spontaneous pushing: push when your body says so, no breath-holding — the baby's head emerges in small increments",
            'Directed pushing: 10-second breath-holds × 3 per contraction (used more often with epidural)',
            'Crowning is the "ring of fire" — burning, stretching as the head\'s widest point passes through',
            'Pant through crowning — do not push hard — to protect your perineum',
            'Optimal positions for second stage: hands and knees, supported squat, side-lying, on the toilet',
          ],
        },
      ],
      callout: {
        variant: 'tip',
        title: 'When to leave for hospital',
        text: 'Use the 4-1-1 rule: contractions 4 minutes apart, 1 minute long, for 1 hour — and you cannot talk through them. Many hospitals have updated to this from 5-1-1. Always go sooner if waters break, you see fresh red bleeding, or your gut says go.',
      },
    },
    {
      title: 'Pain relief without medication',
      content:
        'Unmedicated does not mean unsupported. The non-pharmacological pain relief toolbox is rich and well-studied — Cochrane reviews and WHO guidance repeatedly highlight the effectiveness of continuous one-to-one support, water immersion, and freedom of movement. The most important variable is psychological: feeling safe, unobserved, and unhurried lets oxytocin flow. Choose two or three techniques to practice from 30 weeks; trying something new for the first time mid-contraction rarely works.',
      subsections: [
        {
          title: 'Continuous one-to-one support (the most evidence-backed)',
          content:
            'The 2017 Cochrane review (Bohren et al., 26 trials, 15,000+ women) showed that continuous one-to-one support during labor reduces C-section by 25%, instrumental delivery by 10%, epidural use by 10%, and increases birth satisfaction. Doulas — trained non-clinical labor support — produced the largest effect. A doula is the single most evidence-backed "intervention" you can choose. If a doula is not an option, a partner, friend, mother, or sister with calm energy and stamina works too. The mechanism is hormonal: feeling held reduces stress hormones (cortisol, adrenaline) that interfere with oxytocin and labor progress.',
        },
        {
          title: 'Water immersion',
          content:
            'Warm water immersion in active labor reduces pain perception and the rate of epidural use (Cochrane 2018, Cluett et al.). Effects appear within 15–30 minutes of getting in. Pool temperature should be 36.5–37.5 °C (97.7–99.5 °F); warmer water raises baby\'s heart rate. You can labor in water and exit for delivery (most common in hospital settings) or deliver in water (specialist units, home births). Even a deep bath at home in early labor takes the edge off significantly.',
        },
        {
          title: 'Movement & position',
          content:
            'Upright and forward-leaning positions shorten first stage by ~80 minutes on average and reduce epidural rates (Cochrane 2013, Lawrence et al.). The pelvis is not a fixed structure — sacrum and coccyx move. Different positions create different shapes for the baby to navigate. Birthing balls, peanut balls (especially with epidural), rebozos (a long woven scarf used for hip squeezes and "sifting"), and hydrotherapy showers all support active movement.',
        },
        {
          title: 'Breath, voice & hypnobirthing',
          content:
            'Slow breathing (4-count inhale, 8-count exhale) activates the parasympathetic nervous system and reduces pain perception. Practiced from 28 weeks, it becomes automatic under stress. Low vocalization — "ohhhh", "ahhhh", "mmmm" — keeps the jaw and pelvic floor relaxed. Hypnobirthing courses (Mongan, KGHypnobirthing) teach self-hypnosis, visualization, and affirmation. Evidence is mixed but consistently shows reduced anxiety and lower epidural use among committed practitioners.',
        },
        {
          title: 'TENS, heat, cold & counterpressure',
          content:
            'TENS (transcutaneous electrical nerve stimulation) machines on lower back: most effective when started in early labor; modest effect, no risk to baby. Heat: warm wheat bag on lower back between contractions. Cold: cold flannel on face and neck during transition (when the body overheats). Counterpressure: firm fist or tennis ball pressed into the lower back during contractions — particularly powerful for "back labor" (occiput-posterior baby).',
        },
      ],
    },
    {
      title: 'Birth positions',
      content:
        'Position matters more than most people realize. Lying flat on your back (supine/lithotomy) compresses the inferior vena cava, reduces blood flow to the placenta, narrows the pelvic outlet by ~30%, and works against gravity. Despite this, it remains the default in many hospitals because it is convenient for the provider — not the baby. Unless there is a clinical reason, you have the right to refuse it. ACOG\'s 2017 opinion explicitly supports maternal choice of position throughout labor and delivery.',
      subsections: [
        {
          title: 'For early & active labor',
          content:
            'Movement uses gravity and stimulates contractions. Sitting on a birthing ball with hip circles encourages baby to rotate into optimal position (occiput-anterior). Rebozo techniques (hip jiggling, sifting) help relax the pelvic floor and resolve mild positional issues.',
          bullets: [
            'Walking and slow-dancing — sway with hips loose',
            'Leaning over a bed, birthing ball, or your partner',
            'Hip circles on a birthing ball',
            'Stair-walking (one step at a time, sideways) opens the pelvic inlet',
            'Hot shower with water on lower back',
          ],
        },
        {
          title: 'For pushing',
          content:
            'Hands and knees: relieves back pain, opens the sacrum, especially good for posterior babies. Squatting (with support) widens the pelvic outlet by up to 30% but is tiring — use a birthing bar attached to the bed, or your partner under your arms. Side-lying uses gravity less but maintains an open pelvis and is gentle on the perineum; often used for epidural pushing with a peanut ball between knees. Sitting on the toilet — the "dilation throne" — works because the body recognizes the position and the pelvic floor relaxes.',
        },
        {
          title: 'What to avoid (unless clinically needed)',
          content:
            'Flat on back with feet in stirrups (lithotomy) narrows the pelvis, compresses the vena cava, and increases tearing risk. It is sometimes needed for instrumental birth, but should not be the default. Long unmoving stretches in any position also work against you — labor benefits from change every 20–30 minutes.',
        },
      ],
      callout: {
        variant: 'provider',
        text: 'Tell your provider in writing that you want to be free to choose positions in second stage, including hands and knees. One sentence in your birth plan is enough. Most providers will support you when asked clearly.',
      },
    },
    {
      title: 'Pros, considerations & realistic numbers',
      content:
        'A balanced view helps you choose with clear eyes. Natural birth has real benefits for low-risk pregnancies — and real demands. Both are well-documented in randomized trials and large observational studies.',
      subsections: [
        {
          title: 'Documented benefits',
          content:
            'Faster physical recovery: most parents walk within 1–2 hours, hospital discharge within 6–24 hours. Lower rates of instrumental delivery and emergency C-section, particularly with continuous one-to-one care. Better breastfeeding initiation rates (no opioid passage to baby; alert baby on chest). Hormonal benefits: peak oxytocin at delivery primes maternal bonding circuits and uterine contraction (reducing postpartum hemorrhage risk). Vaginal birth seeds the baby\'s gut microbiome with maternal flora, associated with reduced asthma and allergy risk in long-term cohorts (data still evolving).',
        },
        {
          title: 'Honest considerations',
          content:
            'Pain is significant and not optional. Most first-time parents who plan natural describe transition as the hardest 30 minutes of their lives. Labor is unpredictable: 25–35% of people who plan natural birth choose pain relief at some point — this is information, not failure. Some scenarios make natural birth riskier or impossible: placenta praevia, fetal distress, prolonged labor with maternal exhaustion, breech presentation outside skilled hands. Be ready to flex. The "cascade" risk — induction → epidural → slowed labor → instrumental delivery — is real but not deterministic. Many people are induced and deliver vaginally without issue.',
        },
        {
          title: 'What the numbers say (low-risk patients)',
          content:
            'These ranges combine NHS, ACOG, and large midwife-led unit cohort data. Your local statistics may differ.',
          bullets: [
            'Spontaneous vaginal delivery without epidural at midwife-led units: 75–85%',
            'Transfer rate from planned home/birth-center to hospital: 10–15% (most for slow progress or pain relief, not emergencies)',
            'Epidural use among those who planned natural: 25–35% (lower with doula support, water access, one-to-one midwifery)',
            'C-section rate among low-risk planned natural births: 4–8%, vs 12–20% in standard hospital obstetric care for the same population',
            '3rd/4th degree perineal tear rate: 3–6% overall, lower with hands-and-knees or water birth',
          ],
        },
      ],
      callout: {
        variant: 'tip',
        text: 'Numbers vary widely by setting. Ask your hospital or birth center for their actual statistics for first-time low-risk births: spontaneous vaginal delivery rate, epidural rate, episiotomy rate, C-section rate. A confident unit will share these openly.',
      },
    },
    {
      title: 'Recovery — the first six weeks',
      content:
        'Vaginal birth recovery is typically faster than C-section recovery, but it is not "instant." Your uterus needs ~6 weeks to return to pre-pregnancy size. Your perineum needs 2–4 weeks if you tore. Your hormones, sleep, and identity will be in flux for months. Set the bar low and let yourself surprise it.',
      subsections: [
        {
          title: 'The first 24 hours',
          content:
            'The "golden hour" begins immediately: skin-to-skin on your chest before any non-urgent baby checks. This regulates baby\'s temperature, blood sugar, heart rate, and seeds gut bacteria. Delayed cord clamping (1–3 minutes minimum, ideally until the cord stops pulsing) transfers up to 30% more iron-rich blood to baby. First feed within 60 minutes if breastfeeding — colostrum is liquid gold, high in antibodies and a natural laxative to help clear meconium. Placenta delivers 5–30 minutes after baby; active management with an oxytocin injection reduces hemorrhage risk and is the default in most settings.',
        },
        {
          title: 'Days 1–7 at home',
          content:
            'Lochia (postpartum bleeding) is bright red and heavy for 3–4 days, then pinkish-brown, then yellow-white over 4–6 weeks. Use maternity pads, not tampons. Afterpains — the uterus contracting back down — are often felt during breastfeeding (oxytocin release) and are stronger with second and subsequent babies. Perineum care: rinse with warm water after every toilet visit; sitz bath 2–3 times daily; cold packs (frozen pad, never direct ice) for the first 24 hours; ibuprofen and paracetamol on a schedule, not waiting until pain peaks. Day 3–5 brings the hormonal "milk coming in" alongside baby blues — tearfulness, mood swings, sweaty nights — affecting ~80% of new parents and resolving by day 10.',
        },
        {
          title: 'Weeks 2–6',
          content:
            'Rest is medicine. Aim for the "5-5-5 rule": 5 days in bed, 5 days on bed, 5 days near bed. This is the traditional postpartum confinement of many cultures and it works. Pelvic floor: gentle Kegel awareness from week 1, not strenuous contractions. By week 6 most countries (UK, France, Australia, increasingly the US) recommend a pelvic-floor physiotherapist referral. The 6-week postnatal check covers blood pressure, mood (Edinburgh Postnatal Depression Scale), perineum/scar, contraception, and breastfeeding support. Sex, exercise, and tampons wait until you are cleared at this check — healing is internal as well as external.',
        },
      ],
      callout: {
        variant: 'urgent',
        title: 'Call your provider TODAY if',
        text: 'You soak more than 1 pad per hour, pass clots larger than a plum, have foul-smelling discharge, fever above 38 °C / 100.4 °F, severe headache or vision changes, calf pain or swelling, or shortness of breath. Postpartum hemorrhage, infection, postpartum preeclampsia, and blood clots are rare but real risks in the first 6 weeks.',
      },
    },
  ],
  sources: [
    {
      label: 'Approaches to Limit Intervention During Labor and Birth (Committee Opinion 766)',
      org: 'ACOG, 2019 (reaffirmed 2021)',
      url: 'https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2019/02/approaches-to-limit-intervention-during-labor-and-birth',
    },
    {
      label: 'Recommendations: Intrapartum care for a positive childbirth experience',
      org: 'World Health Organization, 2018',
      url: 'https://www.who.int/publications/i/item/9789241550215',
    },
    {
      label: 'NG235 — Intrapartum care',
      org: 'NICE (UK), 2023',
      url: 'https://www.nice.org.uk/guidance/ng235',
    },
    {
      label: 'Continuous support for women during childbirth (Bohren et al.)',
      org: 'Cochrane Database of Systematic Reviews, 2017',
      url: 'https://www.cochrane.org/CD003766/PREG_continuous-support-women-during-childbirth',
    },
    {
      label: 'Immersion in water during labour and birth (Cluett et al.)',
      org: 'Cochrane Database of Systematic Reviews, 2018',
      url: 'https://www.cochrane.org/CD000111/PREG_immersion-water-during-labour-and-birth',
    },
    {
      label: 'Maternal positions and mobility during first stage labour (Lawrence et al.)',
      org: 'Cochrane Database of Systematic Reviews, 2013',
      url: 'https://www.cochrane.org/CD003934/PREG_maternal-positions-and-mobility-during-first-stage-labour',
    },
    {
      label: 'Pain relief in labour',
      org: 'NHS (UK)',
      url: 'https://www.nhs.uk/pregnancy/labour-and-birth/what-happens/pain-relief-in-labour/',
    },
    {
      label: 'Six Healthy Birth Practices',
      org: 'Lamaze International',
      url: 'https://www.lamaze.org/healthy-birth-practices',
    },
  ],
}

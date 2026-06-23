import type { BirthTopic } from '../birthGuideData'

export const PAIN_RELIEF_TOPIC: BirthTopic = {
  key: 'pain-relief',
  emoji: '💊',
  title: 'Pain Relief Options',
  subtitle: 'Epidural, gas, TENS, water, breathing & more',
  heroColor: '#F0F8FF',
  heroBorder: '#B7D8F5',
  disclaimer:
    'Educational only — not medical advice. Pain relief options and availability vary by hospital. Discuss with your midwife or anaesthetist.',
  sections: [
    {
      title: 'The pain relief spectrum',
      content:
        'Labor pain relief is not a binary choice between "natural" and "epidural." It is a spectrum — and you can move along it as your labor unfolds. On one end sit the non-pharmacological tools: movement, water, breathing, hands-on support, TENS. In the middle, inhaled nitrous oxide and IV opioids take the edge off without removing pain. At the medical end, epidurals and combined spinal-epidurals deliver near-complete pain relief from the waist down. Most people use a combination, often layered in that order. ACOG Practice Bulletin 209 (2019) is unambiguous: "maternal request is sufficient medical indication" for pain relief in labor — you do not need to justify wanting an epidural, and you do not need to apologize for not wanting one.',
      subsections: [
        {
          title: 'Why the menu matters',
          content:
            'Knowing the full menu before labor lets you choose with intention rather than panic. People who attend a comprehensive antenatal class report higher satisfaction with their birth experience regardless of which method they ultimately use, because the decisions felt informed rather than reactive. The NICE NG235 intrapartum guideline (2023) explicitly recommends that all pregnant people be told about every option available at their planned place of birth, including what is not available, so plans can be made accordingly.',
          bullets: [
            'Availability varies hugely by country, hospital, and time of day — anaesthetists are not always immediately free',
            'Some methods take 20–40 minutes to set up (epidural); others work in two breaths (gas)',
            'Combining methods is normal — water + gas, TENS + breathing, opioid early then epidural later',
            'A method that helped a friend may do nothing for you — pain pathways and labor patterns differ',
          ],
        },
        {
          title: 'How labor pain actually works',
          content:
            'First-stage labor pain is visceral — caused by uterine contractions and cervical stretch — and travels via T10–L1 spinal nerves, often felt as deep waves in the low belly, hips, and lower back. Second-stage pain becomes somatic, sharp, and localized to the pelvic floor and perineum (S2–S4). This matters because different methods target different parts of the pathway: opioids dull the brain\'s response, TENS gates pain at the spinal cord, water relaxes the body and lowers stress hormones, and an epidural blocks the nerves themselves. Understanding the mechanism helps you match a tool to the moment.',
          bullets: [
            'Early labor pain often responds well to movement, warmth, and breathing',
            'Active labor pain (6+ cm) is when most people consider stronger options',
            'Back labor (baby in posterior position) creates a specific pain pattern that some tools target better than others',
            'Transition (8–10 cm) is the most intense but also the shortest phase — this is not the time to start an epidural for the first time',
          ],
        },
      ],
      callout: {
        variant: 'tip',
        text: 'You do not have to "earn" your pain relief. There is no medal for waiting longer, and asking for an epidural at 3 cm versus 7 cm is your call — modern evidence (Cochrane 2018) shows starting earlier does not lengthen labor or increase C-section risk.',
      },
    },
    {
      title: 'Epidural & combined spinal-epidural (CSE)',
      content:
        'The epidural is the gold standard for labor pain relief — used in roughly 60–75% of US hospital births and around 30% in the UK. A thin catheter is placed in the epidural space of the lower spine, and a continuous low-dose mix of local anaesthetic (usually bupivacaine or ropivacaine) plus an opioid (fentanyl) is infused. Modern "low-dose" or "mobile" epidurals use roughly a tenth of the anaesthetic concentration used twenty years ago. The result is excellent pain relief while preserving more sensation, more movement, and — crucially — more ability to push effectively. The Royal College of Anaesthetists notes that 85–95% of laboring people report good to complete pain relief once an epidural is working.',
      subsections: [
        {
          title: 'Epidural vs CSE vs walking epidural',
          content:
            'A standard epidural delivers medication to the epidural space only — onset takes 15–25 minutes, top-ups every 1–2 hours or via a patient-controlled pump. A combined spinal-epidural (CSE) adds a one-time spinal injection through the same needle for near-instant relief (5 minutes), then leaves the catheter in for ongoing top-ups — useful if you are in severe pain and need fast relief. A "walking" or "mobile" epidural is just a low-dose version that preserves enough leg strength to stand or shift positions with help; true walking is rare because monitoring tethers you and the floor is a fall risk.',
          bullets: [
            'Standard epidural: slower onset, steady relief, most common',
            'CSE: rapid onset, useful late in labor or for very severe pain',
            'Low-dose / mobile: less motor block, may help second-stage pushing',
            'You will have a urinary catheter or intermittent in-out catheterization — bladder sensation goes',
          ],
        },
        {
          title: 'Side effects, risks, and what is real',
          content:
            // CLINICAL-REVIEW: pending sign-off — Cochrane CD000331.pub4 (Anim-Somuah 2018).
            'The Cochrane review by Anim-Somuah and colleagues (2018), which pooled 40 trials and over 11,000 participants, gives the clearest picture. Epidurals provide superior pain relief and reduce maternal acidosis. Epidurals modestly raise the chance of an assisted (forceps/vacuum) birth — Cochrane pooled data put it at about 1.4x, and this effect largely disappears with modern low-dose epidurals. They also slightly lengthen the second stage by around 15 minutes. They do NOT increase the rate of caesarean section, do NOT cause long-term backache, and do NOT prevent breastfeeding. They do increase the rate of maternal fever (intrapartum hyperthermia, around 15–20% of epidural users) which can lead to extra newborn investigations even when nothing is wrong. Hypotension is common (around 14%) and managed with fluids and ephedrine. Serious complications — permanent nerve damage, epidural haematoma, abscess — are rare, in the order of 1 in 24,000 to 1 in 250,000 per the Royal College of Anaesthetists.',
          bullets: [
            'Common: low blood pressure, itching from the opioid, shivering, urinary retention',
            'Real but limited: 1–3% inadequate block requiring re-siting; 1% post-dural-puncture headache (treatable)',
            'Myth busted: no link to long-term backache (Cochrane 2018)',
            'Myth busted: does not increase C-section risk in modern low-dose practice (ACOG 209)',
            'Honest: epidural fever is real and worth knowing about',
          ],
        },
        {
          title: 'When an epidural may not be possible',
          content:
            'Most contraindications are uncommon but absolute. If any of these apply to you, raise it early in pregnancy — your team can plan an alternative pathway. Even when an epidural is technically possible, severe scoliosis, prior spinal surgery, or extreme obesity can make placement harder and may need a senior anaesthetist.',
          bullets: [
            'Active bleeding disorder or therapeutic anticoagulation (low platelets, recent enoxaparin)',
            'Local infection over the lower back',
            'Raised intracranial pressure',
            'Patient refusal — no one places an epidural without consent',
          ],
        },
      ],
      callout: {
        variant: 'urgent',
        title: 'When to flag early',
        text: 'If you take blood thinners, have a known bleeding disorder, severe scoliosis, prior spinal surgery, or a platelet count under 100, ask for an antenatal anaesthetic consultation before 36 weeks. Walking in already in labor with a complex spine is the worst time to discover an epidural will be difficult.',
      },
    },
    {
      title: 'Nitrous oxide (gas and air)',
      content:
        'Inhaled nitrous oxide — usually a 50:50 mix with oxygen, sold as Entonox in the UK — is one of the most underrated tools on the menu. You hold the mouthpiece yourself, breathe in deeply at the start of a contraction, and the analgesic effect peaks 30–45 seconds later, fading within a minute of stopping. The Cochrane review by Klomp and colleagues (2012) found nitrous oxide gives modest but real pain relief with high maternal satisfaction. The key is timing your breaths: start as the contraction begins so the peak hits when the contraction does. It will not remove the pain, but it takes the sharpness off the top and gives you something active to do.',
      subsections: [
        {
          title: 'How to use it well',
          content:
            'Most first-time users get the timing wrong on the first few contractions and conclude it does not work. It does — but you have to start breathing it as the contraction is building, not when the peak hits. Long, slow, deep breaths through the mouthpiece for the duration of the contraction, then breathe normal air during the rest. After 5–10 contractions of practice, most people find their rhythm.',
          bullets: [
            'Start inhaling at the very first hint of a contraction, not when it peaks',
            'Slow deep breaths — not panicked sips',
            'Stop between contractions — it leaves your system in 60 seconds',
            'Light-headedness and nausea are common but harmless and clear quickly',
            'You stay fully in control — no effect on baby, no effect on pushing',
          ],
        },
        {
          title: 'Availability varies dramatically',
          content:
            'In the UK, Australia, Canada, New Zealand, and much of Europe, gas and air is offered as a default — most birth units stock it at every bedside. In the United States it nearly disappeared from labor wards by the 1970s and has been making a slow comeback since 2011, but availability is still patchy: roughly 1,000 US hospitals offer it (around a third). If gas is important to you and you are in the US, ask your hospital tour guide directly — do not assume it is there. Some birth centers offer it when the local hospital does not.',
          bullets: [
            'UK / Australia / Canada / NZ: assume yes',
            'US: ask specifically — availability is patchy',
            'Home births in many countries: midwife may bring portable Entonox',
            'Water births: yes — gas works fine in the tub',
          ],
        },
      ],
      callout: {
        variant: 'tip',
        text: 'Gas pairs beautifully with water immersion, TENS, and movement. Many people use it as their main tool through active labor and never need anything stronger. It is also excellent for the brief, intense burning of crowning if you reach pushing without an epidural.',
      },
    },
    {
      title: 'IV opioids',
      content:
        'Injected or IV opioids — fentanyl, remifentanil, pethidine (meperidine), diamorphine in the UK — sit between gas and an epidural in strength. They do not remove labor pain; they dull your perception of it and make it easier to rest between contractions. They are most useful in early-to-mid labor when you are exhausted but not yet ready for or able to have an epidural, or in places and moments when an epidural is not available (anaesthetist busy, contraindication present, very fast labor). The trade-off is real: opioids cross the placenta and can sedate the baby, especially if delivered close to birth.',
      subsections: [
        {
          title: 'Common options compared',
          content:
            'Pethidine (meperidine) was the workhorse opioid for decades and is still widely used in the UK and elsewhere — long-acting (2–4 hours) but with a long-acting metabolite that can sedate baby for up to 72 hours if given within 2–3 hours of birth. Fentanyl is shorter-acting (30–60 minutes) and increasingly preferred. Remifentanil patient-controlled analgesia (PCA) is the most sophisticated option in this group: ultra-short-acting (3–5 minutes), self-administered via a button, almost no transfer to baby. Remifentanil PCA can approach epidural-level satisfaction in trials but requires close monitoring (oxygen saturation, one-to-one midwifery) because of maternal respiratory depression risk.',
          bullets: [
            'Pethidine / diamorphine: long-acting, sedating, plan timing carefully near birth',
            'Fentanyl: shorter-acting, less neonatal effect, often a good middle option',
            'Remifentanil PCA: closest opioid alternative to epidural, requires intensive monitoring',
            'All can cause maternal nausea (often given with an antiemetic) and drowsiness',
          ],
        },
        {
          title: 'Effects on baby',
          content:
            'The neonatal concern is respiratory depression and reduced alertness at birth — mild and transient with a single well-timed dose, more significant with repeated doses or doses given within 2 hours of delivery. Naloxone is on hand at every birth and reverses opioid effects within minutes if needed. Breastfeeding can be slower to establish in the first 24 hours after maternal opioids, but this resolves. None of this is a reason to refuse opioids if you need them — it is a reason to plan timing with your midwife.',
          bullets: [
            'Single dose, well-timed: usually fine',
            'Within 2 hours of birth: higher risk of sleepy baby — team will be ready',
            'Naloxone available at every birth as a safety net',
            'First feed may be slower; skin-to-skin still helps',
          ],
        },
      ],
    },
    {
      title: 'Non-medical pain relief',
      content:
        'Non-medical does not mean weak. The strongest evidence base in modern obstetrics — full stop — is for continuous one-to-one labor support. The Cochrane review by Bohren and colleagues (2017), pooling 26 trials and over 15,000 participants, found that continuous support reduces caesarean delivery, instrumental birth, use of any analgesia, length of labor, and dissatisfaction, while improving spontaneous vaginal birth and Apgar scores. No drug on this list has that breadth of benefit. The other tools below stack onto that foundation: water, TENS, sterile water injections, hypnobirthing, breathing, position, heat. Use them as a layered toolkit, not as a single bet.',
      subsections: [
        {
          title: 'Water immersion',
          content:
            'Soaking in a deep warm tub during the first stage of labor is one of the best-studied non-medical options. The Cochrane review by Cluett and colleagues (2018) found water immersion in the first stage reduces use of regional analgesia and is not associated with adverse outcomes for mother or baby in low-risk pregnancies. The buoyancy reduces gravitational load, the warmth relaxes muscles, and the privacy of the tub lowers stress hormones (which themselves slow labor). You can stay in for second stage and birth ("waterbirth") if your provider supports it and your labor is uncomplicated.',
          bullets: [
            'Water around 36–37°C (matching body temperature)',
            'Most useful in active labor (6+ cm) — earlier can slow things',
            'Combines well with gas, breathing, and partner massage',
            'Get out promptly if asked — for fetal heart rate concerns or rising maternal temperature',
          ],
        },
        {
          title: 'TENS, sterile water injections, heat & cold',
          content:
            'Transcutaneous electrical nerve stimulation (TENS) sends a low-level current through pads on your lower back, working on the spinal-cord pain gate. Best started in early labor (it works by ramping up over time, not on demand), most useful for back pain. Sterile water injections — four tiny intradermal blebs of sterile water in the lower back — are a brilliant, evidence-based, underused option specifically for back labor. The Cochrane review by Derry and colleagues (2012) found significant pain relief lasting 1–2 hours per round, with no effect on mother or baby other than a short sting on injection. Heat packs on the lower back or perineum, cool flannels on the face and neck, and counter-pressure on the sacrum from a partner all help and cost nothing.',
          bullets: [
            'TENS: start early (latent labor), self-controlled with a boost button, best for back pain',
            'Sterile water injections: ask specifically if you have back labor — many providers forget to offer',
            'Heat: lower back, perineum, lower abdomen — relax muscles',
            'Cold: face, neck, wrists — manages nausea and overheating',
            'Counter-pressure: partner pushes hard on your sacrum during contractions',
          ],
        },
        {
          title: 'Hypnobirthing, breathing, movement, doulas',
          content:
            'Mind-body methods — hypnobirthing, mindfulness-based childbirth, Lamaze breathing — work on the fear-tension-pain cycle. The science is mixed on hypnobirthing as a single intervention but consistent on its building blocks: relaxation, controlled breathing, positive expectation. Movement and upright positions shorten first-stage labor by an average of 80 minutes and reduce epidural use (Cochrane Lawrence 2013). A trained doula — distinct from your partner — provides the continuous support that the Bohren 2017 review identifies as the single most effective non-medical intervention. Lamaze International\'s Six Healthy Birth Practices summarize the evidence-based non-medical bundle: let labor begin on its own, walk and change position, bring a loved one or doula, avoid unnecessary interventions, push spontaneously in upright positions, keep mother and baby together.',
          bullets: [
            'Hypnobirthing class: best done in the third trimester with practice',
            'Slow breathing through contractions, normal breaths between',
            'Upright and forward-leaning positions — never flat on your back',
            'A doula is not a luxury — the evidence is among the strongest in obstetrics',
          ],
        },
      ],
      callout: {
        variant: 'tip',
        text: 'If you have back labor (baby is posterior or asynclitic), ask your midwife specifically about sterile water injections. Many units offer them but only if asked — and they can buy you 1–2 hours of significant relief without affecting the baby or your mobility.',
      },
    },
    {
      title: 'Choosing & changing your mind',
      content:
        'A good birth plan is a flexible compass, not a contract. Decide in pregnancy what you would like to start with, what you are willing to consider, and what you would prefer to avoid — then give your team permission to offer options as labor unfolds. The most common pattern in modern hospital births is to start with non-medical methods (movement, water, breathing), add gas in active labor, and consider an epidural if the pain becomes unmanageable or if labor is going to be long. The least helpful pattern is rigidity in either direction: refusing all medication while in genuine distress, or accepting an epidural at the door without trying anything else. Both can leave you feeling like a passenger in your own birth.',
      subsections: [
        {
          title: 'A pre-labor decision framework',
          content:
            'Three questions to discuss with your partner and provider before labor starts. Write the answers in your birth plan, but treat them as a starting position, not a finish line.',
          bullets: [
            'What do I want to try first? (e.g., movement, water, gas)',
            'What is my "if labor is long, I am open to" line? (e.g., opioids overnight to rest, epidural after 12 hours)',
            'What would I prefer to avoid unless medically needed? (e.g., pethidine close to birth)',
            'Who decides — me, my partner, my provider — and how do I want to be asked?',
          ],
        },
        {
          title: 'Permission to change your mind',
          content:
            'You are allowed to change your mind in either direction at any moment. People who plan unmedicated births often feel they have failed if they ask for an epidural; people who plan epidurals sometimes deliver before the anaesthetist arrives. Neither is failure. The NHS guidance on pain relief in labor is explicit: your choice, made with information, in the moment, is the right choice. Tell your partner now what kind of advocacy you want — do you want them to remind you of your original plan, or to support whatever you ask for in the moment? Both are valid; mismatched expectations cause friction.',
          bullets: [
            'Asking for relief is not weakness — labor is not a test',
            'Declining relief offered at the door is also fine — keep your options',
            'Tell your partner: "advocate for my plan" vs "support whatever I ask"',
            'Debrief after birth — it helps process the choices you made',
          ],
        },
      ],
      callout: {
        variant: 'provider',
        title: 'Questions for your anaesthetist',
        text: 'On admission, or earlier if you have a complex history: How long does an epidural take from request to relief here? Is a CSE available if I need fast relief late? Is patient-controlled (PCA) top-up available? Is remifentanil PCA an option if epidural is not? Is nitrous oxide available at this hospital? What is the typical wait at night or weekends?',
      },
    },
  ],
  sources: [
    {
      label: 'Practice Bulletin 209: Obstetric Analgesia and Anesthesia',
      org: 'ACOG',
      url: 'https://www.acog.org/clinical/clinical-guidance/practice-bulletin/articles/2019/03/obstetric-analgesia-and-anesthesia',
    },
    {
      label: 'NG235: Intrapartum care',
      org: 'NICE',
      url: 'https://www.nice.org.uk/guidance/ng235',
    },
    {
      label: 'Epidural versus non-epidural or no analgesia for pain management in labour (Anim-Somuah et al. 2018)',
      org: 'Cochrane',
      url: 'https://www.cochrane.org/CD000331',
    },
    {
      label: 'Inhaled analgesia for pain management in labour (Klomp et al. 2012)',
      org: 'Cochrane',
      url: 'https://www.cochrane.org/CD009351',
    },
    {
      label: 'Sterile water injection for relief of low-back pain in labour (Derry et al. 2012)',
      org: 'Cochrane',
      url: 'https://www.cochrane.org/CD009107',
    },
    {
      label: 'Continuous support for women during childbirth (Bohren et al. 2017)',
      org: 'Cochrane',
      url: 'https://www.cochrane.org/CD003766',
    },
    {
      label: 'Immersion in water during labour and birth (Cluett et al. 2018)',
      org: 'Cochrane',
      url: 'https://www.cochrane.org/CD000111',
    },
    {
      label: 'Pain relief in labour',
      org: 'NHS',
      url: 'https://www.nhs.uk/pregnancy/labour-and-birth/what-happens/pain-relief-in-labour/',
    },
    {
      label: 'Epidurals for pain relief in labour',
      org: 'Royal College of Anaesthetists',
      url: 'https://rcoa.ac.uk/patient-information/translations/english/epidural-pain-relief-during-labour',
    },
    {
      label: 'Healthy Birth Practices',
      org: 'Lamaze International',
      url: 'https://www.lamaze.org/healthy-birth-practices',
    },
  ],
}

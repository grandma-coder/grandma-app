import type { BirthTopic } from '../birthGuideData'

export const LABOR_STAGES_TOPIC: BirthTopic = {
  key: 'labor-stages',
  emoji: '⏱️',
  title: 'Labor Stages',
  subtitle: 'Early → Active → Transition → Pushing',
  heroColor: '#FEF9E8',
  heroBorder: '#F5E0A0',
  disclaimer:
    'Educational only — not medical advice. Labor patterns vary widely. Always call your midwife or maternity unit when in doubt.',
  sections: [
    {
      title: 'Pre-labor: the days (or weeks) before',
      content:
        'Labor rarely begins like the movies. For most people, the body spends days — sometimes a couple of weeks — quietly rehearsing. Hormones shift, the cervix softens and ripens, the baby drops lower in the pelvis, and the uterus practices contracting. None of this is "real" labor yet, and none of it is a reliable predictor of when labor will start. Knowing the difference between pre-labor and the true thing saves you a lot of midnight panic and a lot of unnecessary trips to triage. The NHS, ACOG, and NICE all describe this prelabor period as normal and expected, especially in first pregnancies.',
      subsections: [
        {
          title: 'Lightening, mucus plug, and the bloody show',
          content:
            'Around 36–38 weeks in a first pregnancy (often later in subsequent ones), baby may "drop" into the pelvis — you breathe easier but pee more. The mucus plug that has sealed your cervix can come away in pieces or as a single jelly-like glob, sometimes tinged with blood (the "show"). This means the cervix is changing, but not necessarily that labor starts today. Some people lose the plug a full week or two before labor. Others never notice it at all.',
          bullets: [
            'Lightening / engagement — baby settles head-down into the pelvis, sometimes weeks before labor',
            'Mucus plug — clear, pink, or brown jelly; not an emergency, just an update',
            'Bloody show — pinkish-red mucus, normal in late pregnancy and early labor',
            'Bright red bleeding (more than a teaspoon) — call your provider, this is different',
          ],
        },
        {
          title: 'Nesting, loose stools, and the energy shifts',
          content:
            'In the final week or so, prostaglandin levels rise. Many people get a sudden burst of energy and an urge to clean, organize, or finish projects — the famous nesting instinct. Others feel the opposite: heavy, weepy, "off." Loose stools or mild diarrhea in the last day or two is the body emptying itself in preparation. None of these are labor, but they often cluster in the 24–72 hours before things start.',
          bullets: [
            'Nesting energy — clean the kitchen, then rest; do not exhaust yourself',
            'Loose stools — common in the day before labor; stay hydrated',
            'Backache, period-cramp feelings, restless sleep — all normal pre-labor signals',
            'Emotional swings, weepiness, "I cannot do this" — extremely common; not a verdict',
          ],
        },
        {
          title: 'Prelabor (prodromal) contractions vs the real thing',
          content:
            'Braxton Hicks tighten the bump but do not change the cervix. Prodromal labor goes further — real, sometimes painful contractions that come for hours and then stop. They are doing useful work (softening, ripening, positioning baby) but they are not progressive. True labor contractions get longer, stronger, and closer together over time, and they keep going whether you walk, rest, eat, or shower. If a warm bath, a glass of water, and an hour of rest stops the contractions, it was not yet labor.',
          bullets: [
            'False/prodromal: irregular, ease with rest, fade with hydration',
            'True labor: progressive, builds intensity, does not stop with rest',
            '"5-1-1" or "4-1-1" rules apply only when the pattern is consistent and clearly building',
            'First babies often have several days of stop-start prelabor — frustrating but normal',
          ],
        },
      ],
      callout: {
        variant: 'tip',
        text: 'A useful rule: if you can talk through it, smile, and walk normally — it is probably early. If you have to stop, breathe, and lean on something — that is your body telling you the pattern is real.',
      },
    },
    {
      title: 'Stage one, early labor (latent phase)',
      content:
        'Early labor is the long opening act. The cervix moves from closed and thick to about 5–6 cm dilated and fully thinned (effaced). Contractions become regular but are usually still manageable — they feel like strong period cramps, lower back pressure, or tightening that wraps around the bump. This phase can last 6–12 hours in a first birth and roughly half that in subsequent births, but the Zhang et al. (2010) Consortium on Safe Labor data shows enormous individual variation; some people sit at 4 cm for many hours before things accelerate. The job in early labor is to ignore it as long as you reasonably can. Hospital admission before active labor (especially before 6 cm) is associated with higher intervention rates without better outcomes.',
      subsections: [
        {
          title: 'What it actually feels like',
          content:
            'Contractions usually start 10–20 minutes apart, lasting 30–45 seconds, and slowly become more regular. Many people describe the sensation as "period pain that comes in waves" or "a tightening band that builds and releases." You can usually still talk, walk, and even nap between contractions. The mucus plug may come away. Some people feel nauseous or have loose stools. Emotionally, early labor is often exciting and a bit nervous — you know something is happening but it is not yet all-consuming.',
          bullets: [
            'Contractions: 5–20 min apart, 30–45 sec long, mild to moderate',
            'You can talk, walk, eat lightly, and rest between waves',
            'Cervix dilates from 0 to about 5–6 cm and effaces (thins) to 100%',
            'Often easier to manage at night if you can sleep through the gaps',
          ],
        },
        {
          title: 'What to do at home',
          content:
            'The WHO and NICE both emphasize that early labor is best spent in your own environment, where oxytocin flows more freely and adrenaline (which slows labor) stays low. Eat small, easy meals — toast, soup, banana, rice. Stay hydrated with sips between contractions. Alternate gentle activity with rest; a slow walk, a warm shower, a lean over the birth ball, a comforting film. Resist the urge to time every contraction; check the pattern every hour or so instead of every minute.',
          bullets: [
            'Eat light, hydrate, rest when you can — labor is a marathon',
            'Warm (not hot) shower or bath helps cope with cramping',
            'Birth ball, hands-and-knees, side-lying — anything but flat on your back',
            'Pack/double-check the bag, set the car seat, charge the phone',
          ],
        },
        {
          title: 'When to call and when to go in',
          content:
            'Call your midwife or maternity unit any time you are unsure — they would rather hear from you twice than not at all. Most providers use the 4-1-1 or 5-1-1 rule for low-risk first births: contractions every 4 (or 5) minutes, lasting 1 minute, for at least 1 hour. For subsequent births, go in earlier — second babies often arrive faster than first ones. Always call (do not wait for the rule) if your waters break, especially if the fluid is green, brown, or blood-streaked; if you have heavy bright red bleeding; if baby movements decrease; if you have severe headache, vision changes, or upper abdominal pain.',
          bullets: [
            'First baby: 5-1-1 or 4-1-1 is the usual threshold',
            'Second or later baby: call earlier, especially if previous labor was fast',
            'Waters broken: call regardless of contractions; note time, color, smell',
            'Group B Strep positive: go in earlier so antibiotics can start in time',
          ],
        },
      ],
      callout: {
        variant: 'provider',
        text: 'If your waters break and the fluid is green, brown, or thick — that is meconium and you should go in promptly. Also call immediately for fresh red bleeding more than spotting, severe headache, or reduced fetal movement.',
      },
    },
    {
      title: 'Stage one, active labor',
      content:
        'Active labor is when things get serious. Under the modern Zhang labor curves (which replaced the older 1950s Friedman curves in ACOG/SMFM guidance after 2014), active labor is now defined as starting at about 6 cm — not 4 cm as previously thought. This matters: it means dilation between 4 and 6 cm can still be slow and irregular without being "stalled," and many cesareans previously done for "failure to progress" were really just done too early. Once active labor begins, the cervix typically opens at around 1 cm per hour for first births and faster for subsequent ones, though again the range is wide.',
      subsections: [
        {
          title: 'What active labor feels like',
          content:
            'Contractions are now 3–5 minutes apart, lasting 60–90 seconds, and demand your full attention. You cannot talk through them; you have to breathe, vocalize, sway, or lean on something. Between contractions you may be quiet or even doze briefly. The work is internal — many people close their eyes, withdraw, and stop wanting small talk. This is normal and a good sign; it is sometimes called "labor land."',
          bullets: [
            'Contractions: every 3–5 min, 60–90 sec, strong',
            'Cervix moves from 6 cm to about 8 cm',
            'You stop being able to chat — focus turns inward',
            'Position changes every 30 minutes help baby rotate and descend',
          ],
        },
        {
          title: 'When to go to your birth place',
          content:
            'For most low-risk first-time parents, this is the moment to head in. The classic threshold is contractions 5 minutes apart for an hour (5-1-1) or 4 minutes apart (4-1-1) — your provider will tell you which they use. If you are giving birth at a hospital or birth center, time the drive realistically and add a buffer for traffic and parking. If contractions are 2–3 minutes apart already and you are a second-time parent, do not wait — call and leave.',
          bullets: [
            'First baby, low-risk: 4-1-1 or 5-1-1 is the typical go-in threshold',
            'Subsequent baby: leave at the first sign of regular strong contractions',
            'Long drive (>30 min) or rural setting: leave earlier',
            'Planned home birth: this is when the midwife arrives at your house',
          ],
        },
        {
          title: 'Coping in active labor',
          content:
            'This is when your tools start to matter. Slow rhythmic breathing, low moaning (high-pitched sounds tighten the pelvic floor; low sounds open it), warm water immersion, counter-pressure on the lower back, hip squeezes, slow dancing with your partner, the birth ball. Cochrane reviews on continuous labor support (Bohren et al., 2017) consistently show better outcomes — shorter labor, less pain medication, fewer cesareans — when someone trained stays with you. Now is also the decision point if you want an epidural; most units will place one any time before transition if you ask.',
          bullets: [
            'One contraction at a time — do not project forward',
            'Counter-pressure, hip squeezes, warm pack on the lower back',
            'Hydrate between contractions; ice chips if no fluids allowed',
            'Empty your bladder every hour — a full bladder slows progress',
          ],
        },
      ],
    },
    {
      title: 'Transition: the shortest, hardest phase',
      content:
        'Transition is the bridge between active labor and pushing — usually 8 to 10 cm. It is short (often 15 minutes to an hour, sometimes two) but it is the most intense part of labor for most people. Hormones surge: a final adrenaline spike right before pushing is biological design, the "fetal ejection reflex" that gives you the energy to push the baby out. Almost everyone in transition believes for a moment that they cannot do this. That sentence — "I can\'t do this" — is so reliable that midwives use it as a sign that birth is close.',
      subsections: [
        {
          title: 'What is normal in transition',
          content:
            'Contractions stack on top of each other — sometimes 1–2 minutes apart, lasting 90 seconds or more, with double peaks. Shaking, nausea, vomiting, hot/cold flashes, intense rectal pressure, and a strong urge to give up are all classic. You may feel completely out of control, swear at people you love, or feel an animal need to be alone. None of this is wrong. The pressure pushes baby down through the pelvis and finishes opening the cervix.',
          bullets: [
            'Contractions 1–2 min apart, 90+ sec, often with double peaks',
            'Shaking legs, nausea, hot/cold, the "I can\'t do this" moment',
            'Rectal pressure builds — feels like needing to poo urgently',
            'Self-doubt is a sign of progress, not failure',
          ],
        },
        {
          title: 'How to ride it out',
          content:
            'The single most useful thing in transition is knowing it is the shortest phase. Your support team\'s job is to remind you, contraction by contraction, that this is the hardest part because it is almost over. Stay in whatever position feels right — many people instinctively go onto hands and knees or lean over the bed. Keep vocalizing low and open. If you have an epidural, transition can be much milder; you may notice mostly the rectal pressure.',
          bullets: [
            'One contraction at a time — you only ever have to do this one',
            'Low moans, jaw loose, shoulders soft — relaxation opens the pelvis',
            'Sips of water and cool cloth on the forehead between waves',
            'Tell your team if you feel the urge to push so they can check you',
          ],
        },
      ],
      callout: {
        variant: 'tip',
        text: 'If the person in labor says "I can\'t do this anymore" — celebrate quietly. That sentence almost always means transition, and transition almost always means baby within an hour or two.',
      },
    },
    {
      title: 'Stage two: pushing and birth',
      content:
        'The second stage runs from full dilation (10 cm) to the birth of the baby. Average length without an epidural is up to 2 hours for first births and up to 1 hour for subsequent ones; with an epidural, ACOG/SMFM accept up to 3 and 2 hours respectively before considering it prolonged. The big modern shift, supported by Cochrane (Lemos et al., 2017, on pushing methods), is that spontaneous, mother-led pushing — pushing only when and how the body urges, with an open glottis (low grunt, not held breath) — is gentler on the pelvic floor and as effective as directed Valsalva pushing for unmedicated births. Directed pushing is still useful when the urge is blunted, often the case with a dense epidural.',
      subsections: [
        {
          title: 'The urge to push and "rest and be thankful"',
          content:
            'Once the cervix is fully open, many people feel a powerful, involuntary urge to bear down — like an unstoppable bowel movement. Sometimes there is a quiet pause first: contractions space out, you can breathe, even doze. This is the "rest and be thankful" phase, recognized by midwives and described in NICE guidance. It is the body letting baby rotate and descend before the real pushing begins. Honor it. Pushing too early, against an unripe urge, exhausts you and tires baby.',
          bullets: [
            'Wait for the urge if you can — even fully dilated, do not force it',
            'Spontaneous pushing: 3–5 short bears-down per contraction, breathe between',
            'Directed pushing (Valsalva): take a breath, hold, push to 10 — used with epidural or fatigue',
            'Position matters: upright, side-lying, hands-and-knees all work; flat on back is the worst',
          ],
        },
        {
          title: 'Crowning and the "ring of fire"',
          content:
            'As the head comes down, you will feel intense stretching at the perineum — sometimes called the ring of fire. It burns and stings; it also signals that you are minutes from meeting your baby. Your provider may apply warm compresses, gentle perineal support, or guide you to "breathe the baby out" with small pushes rather than big ones, to reduce tearing. The head usually emerges over one or two contractions, then the body slips out on the next.',
          bullets: [
            'Burning, stretching sensation — peaks for 30–60 seconds, then relief',
            'Small puffing breaths instead of big pushes can reduce tearing',
            'Warm compresses on the perineum help (Cochrane evidence)',
            'Once the head is out, the rest follows quickly with the next contraction',
          ],
        },
        {
          title: 'Baby is here',
          content:
            'Most healthy babies cry within seconds of being born and "pink up" within a minute. ACOG, WHO, and NICE all recommend immediate skin-to-skin if baby is well — a stable warm chest is the best newborn warmer ever invented and it stabilizes heart rate, blood sugar, and breathing. Routine cord clamping is delayed for at least 1 minute (many providers wait 3–5, or until the cord stops pulsing) — McDonald et al. (Cochrane, 2013) showed delayed cord clamping improves iron stores for months without increasing maternal bleeding. The Apgar score is taken at 1 and 5 minutes, often without removing baby from your chest.',
          bullets: [
            'Immediate skin-to-skin unless baby needs resuscitation',
            'Delayed cord clamping (≥60 sec, often longer) is now standard',
            'First Apgar at 1 minute, second at 5 minutes — most are 7+/10',
            'Vitamin K and eye prophylaxis can wait an hour for the first feed',
          ],
        },
      ],
      callout: {
        variant: 'urgent',
        text: 'Push only on the urge unless your provider asks otherwise. If you feel the urge before being told you are 10 cm — say so out loud immediately so they can check you and prepare.',
      },
    },
    {
      title: 'Stage three: placenta and the golden hour',
      content:
        'The third stage is from baby\'s birth to the delivery of the placenta — usually 5 to 30 minutes. It is brief but clinically important: this is when most postpartum hemorrhage happens. There are two valid approaches, both supported by Cochrane (Begley et al.). Active management — a routine oxytocin injection, controlled cord traction, uterine massage — reduces the risk of hemorrhage by about half and is recommended by WHO as the default for hospital births. Physiological (expectant) management — waiting for the placenta to deliver on its own with skin-to-skin and breastfeeding driving natural oxytocin — is reasonable for low-risk people who actively choose it. Many units now offer a "modified" middle path: oxytocin injection but no traction, allowing the cord to finish pulsing first.',
      subsections: [
        {
          title: 'Active vs physiological management',
          content:
            'Active management is the global default because it cuts hemorrhage risk meaningfully, especially in settings where blood and theatre are not instantly available. It does have trade-offs — slightly more nausea, slightly higher blood pressure from the oxytocin, occasionally a retained placenta requiring manual removal. Physiological management can work beautifully for low-risk births where the parent is upright, baby is at the breast, and oxytocin is flowing naturally — but it carries about double the hemorrhage rate of active management in the Cochrane data. Neither is "right" universally; it is a values-and-context decision.',
          bullets: [
            'Active: oxytocin shot at delivery of anterior shoulder, controlled cord traction, fundal check',
            'Physiological: no shot, no traction, baby on chest, gravity and breastfeeding',
            'Mixed approach: oxytocin shot but delayed cord clamping and no traction',
            'WHO recommends active as default; NICE supports physiological for low-risk who request it',
          ],
        },
        {
          title: 'Delayed cord clamping and the first feed',
          content:
            'Delayed cord clamping for at least 60 seconds — and typically until the cord stops pulsing, around 3–5 minutes — is now standard care for term babies in ACOG, WHO, NICE, and RCOG guidance, based on McDonald et al. (Cochrane, 2013). The transfusion of blood from placenta to baby raises iron stores measurably for 6+ months. The first feed usually happens spontaneously in the first hour: babies left undisturbed on the chest will often crawl, root, and self-attach. This "golden hour" is uninterrupted skin-to-skin, dim lights, quiet, with weighing and vitamin K deferred until after the first feed if all is well.',
          bullets: [
            'Cord clamping ≥60 sec; many providers wait until pulsing stops',
            'First feed usually within 30–60 minutes — baby leads',
            'Weighing, measuring, vitamin K can wait 1 hour for healthy babies',
            'Skin-to-skin stabilizes baby\'s temperature, heart rate, and blood sugar',
          ],
        },
      ],
      callout: {
        variant: 'provider',
        text: 'After the placenta is out, expect ongoing fundal checks for a couple of hours and a steady flow of bright red blood (lochia rubra). Tell staff immediately if you feel suddenly faint, soak a pad in under an hour, or pass clots larger than a small plum.',
      },
    },
  ],
  sources: [
    {
      label: 'Committee Opinion 766: Approaches to Limit Intervention During Labor and Birth',
      org: 'ACOG, 2019',
      url: 'https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2019/02/approaches-to-limit-intervention-during-labor-and-birth',
    },
    {
      label: 'Obstetric Care Consensus 1: Safe Prevention of the Primary Cesarean Delivery',
      org: 'ACOG / SMFM, 2014 (reaffirmed 2019)',
      url: 'https://www.acog.org/clinical/clinical-guidance/obstetric-care-consensus/articles/2014/03/safe-prevention-of-the-primary-cesarean-delivery',
    },
    {
      label: 'Contemporary patterns of spontaneous labor with normal neonatal outcomes (Zhang et al.)',
      org: 'Obstetrics & Gynecology, 2010',
      url: 'https://journals.lww.com/greenjournal/Fulltext/2010/12000/Contemporary_Patterns_of_Spontaneous_Labor_With.7.aspx',
    },
    {
      label: 'NG235 — Intrapartum care',
      org: 'NICE (UK), 2023',
      url: 'https://www.nice.org.uk/guidance/ng235',
    },
    {
      label: 'Recommendations on intrapartum care for a positive childbirth experience',
      org: 'WHO, 2018',
      url: 'https://www.who.int/publications/i/item/9789241550215',
    },
    {
      label: 'Active versus expectant management for women in the third stage of labour (Begley et al.)',
      org: 'Cochrane Database of Systematic Reviews, 2019',
      url: 'https://www.cochrane.org/CD007412',
    },
    {
      label: 'Pushing/bearing down methods used during the second stage of labour (Lemos et al.)',
      org: 'Cochrane Database of Systematic Reviews, 2017',
      url: 'https://www.cochrane.org/CD009124',
    },
    {
      label: 'Signs that labour has begun',
      org: 'NHS (UK)',
      url: 'https://www.nhs.uk/pregnancy/labour-and-birth/what-happens/signs-that-labour-has-begun/',
    },
    {
      label: 'Effect of timing of umbilical cord clamping on maternal and neonatal outcomes (McDonald et al.)',
      org: 'Cochrane Database of Systematic Reviews, 2013',
      url: 'https://www.cochrane.org/CD004074',
    },
  ],
}

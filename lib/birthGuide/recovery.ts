import type { BirthTopic } from '../birthGuideData'

export const RECOVERY_TOPIC: BirthTopic = {
  key: 'recovery',
  emoji: '🌙',
  title: 'Recovery & Postpartum',
  subtitle: 'The fourth trimester — body, mind, life',
  heroColor: '#F0F0FF',
  heroBorder: '#C4C4F5',
  disclaimer:
    'Educational only — not medical advice. Postpartum recovery varies widely. If something feels wrong, especially in your mood or your body, call your provider or emergency services without delay.',
  sections: [
    {
      title: 'The fourth trimester — what postpartum actually is',
      content:
        'Postpartum is not a finish line crossed at six weeks. It is a months-long physiological and psychological reorganization that pediatrician Harvey Karp popularized as the "fourth trimester" — roughly the first 12 weeks after birth, when the baby is still wiring to the outside world and your body is rebuilding from one of the largest hormonal shifts a human can experience. ACOG Committee Opinion 736 (2018) explicitly reframed postpartum care as an ongoing process, not a single six-week visit, and called for first contact within three weeks of birth. WHO 2022 postnatal guidance echoes this: care extends to at least six weeks, ideally beyond, and covers the parent as much as the baby.',
      subsections: [
        {
          title: 'Lochia, uterus involution, and the leaking body',
          content:
            'Lochia — the postpartum bleeding — typically lasts 4 to 6 weeks regardless of birth route. It moves through three colors: rubra (bright red, days 1–4), serosa (pinkish-brown, days 4–10), and alba (yellow-white, weeks 2–6). Your uterus shrinks from watermelon to pear ("involution") and you may feel cramping ("afterpains") especially while breastfeeding, when oxytocin spikes. Night sweats, leaking breasts, and unpredictable bladder control are normal early on. The NHS notes most parents are surprised by how much fluid the body sheds in the first two weeks.',
          bullets: [
            'Soaking a maxi pad in under an hour, or passing clots larger than a golf ball — call your provider, this can signal hemorrhage',
            'Foul-smelling lochia or fever above 38°C / 100.4°F — possible infection',
            'Bleeding that stops then suddenly returns bright red — usually means you are doing too much; rest more',
          ],
        },
        {
          title: 'Hormones and identity',
          content:
            'Estrogen and progesterone fall off a cliff within hours of placental delivery — the steepest hormone drop in human physiology. Prolactin and oxytocin rise with feeding and contact. The result: weepiness, euphoria, brain fog, hair shedding around month 3–4, and a slow re-acquaintance with the person in the mirror. Matrescence — the developmental transition into motherhood, named by anthropologist Dana Raphael — is real and under-discussed. Identity shifts are not a bug.',
          bullets: [
            'Hair shedding peaks around 3–4 months postpartum and resolves by 6–12 months',
            'Brain fog ("mom brain") is partially structural — gray matter remodels in the first months',
            'Crying for no reason in the first 10 days is usually baby blues, not depression',
          ],
        },
        {
          title: 'Why the old "6-week check" is not enough',
          content:
            'ACOG 736 was a deliberate course correction: in the US more than half of pregnancy-related deaths happen postpartum, and a meaningful share occur weeks after hospital discharge — from cardiomyopathy, hemorrhage, embolism, infection, and suicide. A single check at 6 weeks misses this window entirely. The new model: a contact within 3 weeks (in person, phone, or telehealth), tailored ongoing care, and a comprehensive visit by 12 weeks that covers mood, sleep, sex, contraception, chronic disease, and the transition home.',
        },
      ],
      callout: {
        variant: 'urgent',
        title: 'Call now, do not wait',
        text: 'Heavy bleeding soaking a pad an hour, fever, severe headache with vision changes, chest pain or shortness of breath, calf pain or swelling on one side, thoughts of harming yourself or the baby — these are emergencies. Call your provider, 911/999/112, or go to the ER. The CDC "Hear Her" campaign exists because parents are routinely told to wait when they should not.',
      },
    },
    {
      title: 'Healing after vaginal birth',
      content:
        'Whether you tore, were cut (episiotomy), or emerged intact, the perineum and pelvic floor have done extraordinary work. Most first-time parents experience some tearing — first-degree (skin only) heals fastest; third- and fourth-degree (involving the anal sphincter) need careful follow-up. NHS and ACOG both recommend that initial discomfort should be improving — not worsening — by week two. If pain is escalating, something is off.',
      subsections: [
        {
          title: 'Perineum care, sitz baths, and stitches',
          content:
            'In the first 1–2 weeks: use a peri bottle (warm water) every time you pee, witch-hazel pads on a maxi pad, ice in the first 24 hours, and a sitz bath (sit in a few inches of warm water) once or twice a day. Stitches dissolve over 2–6 weeks; you do not need them removed. Sit on a soft surface — a "donut" pillow can paradoxically pull the wound open, a soft folded towel is often better. Do not push to poop in the first week — use a stool softener (most providers send you home with one) and a footstool to relax the pelvic floor.',
          bullets: [
            'Peri bottle every bathroom trip for at least the first week',
            'Stool softener daily until first comfortable bowel movement, then taper',
            'Sitz bath 10–15 minutes, 1–2x a day, plain warm water is enough',
            'Pain getting worse, redness spreading, or pus — call your provider',
          ],
        },
        {
          title: 'Hemorrhoids, the unsexy truth',
          content:
            'Pushing pressure plus pregnancy-stretched veins means hemorrhoids are extremely common — affecting roughly a third of postpartum parents. Most resolve in weeks. Witch hazel, sitz baths, hydration, fiber, and avoiding straining are the foundation. Topical creams (hydrocortisone, lidocaine) help short-term; ask your provider before using anything more than a week, especially while breastfeeding. Persistent painful or bleeding hemorrhoids past 6 weeks deserve a real exam — they are treatable.',
        },
        {
          title: 'Pelvic floor — early signals',
          content:
            'The pelvic floor is a hammock of muscles that held the baby up for nine months and stretched dramatically at birth. Early signs of dysfunction: leaking when you cough or sneeze, a feeling of heaviness or "falling out" (possible prolapse), pain with sitting, inability to fully empty the bladder. None of these are "just part of being a mom" — they are treatable, and the earlier you flag them, the better. The Cochrane review by Woodley et al. (2020) found pelvic floor muscle training reduces postpartum urinary incontinence.',
          bullets: [
            'Gentle pelvic floor breathing (not crunches) can start in week one if cleared',
            'Leaking, heaviness, or pain past 6 weeks → ask for a pelvic floor PT referral',
            'Diastasis recti (abdominal separation) is also a pelvic-floor-PT issue',
          ],
        },
      ],
      callout: {
        variant: 'tip',
        title: 'The padsicle',
        text: 'Make these before birth: soak maxi pads with witch hazel and a few drops of aloe vera, freeze them. They numb and soothe the perineum in the brutal first 48 hours. Keep them in the freezer next to the breastmilk.',
      },
    },
    {
      title: 'Healing after C-section',
      content:
        'A cesarean is a major abdominal surgery — seven layers of tissue cut and stitched. Recovery is on a different timeline than vaginal birth: the perineum is fine, but the abdominal core, the incision, and the anesthesia after-effects all need time. The first 24 hours are about getting up and walking (it prevents blood clots), the first two weeks are about not lifting anything heavier than the baby, and the first 8 weeks are about letting the deep tissue heal even after the skin looks fine.',
      subsections: [
        {
          title: 'Wound care, week by week',
          content:
            'Hospitals usually use dissolving stitches and surgical glue or steri-strips. Keep the incision clean and dry; let warm water rinse over it in the shower (no scrubbing, no submerging in baths or pools for 3–4 weeks). Watch for redness spreading beyond the incision, increasing pain, pus, opening edges, or fever — these are signs of infection. The shelf of swelling above the scar ("c-section shelf") is normal early on and partly resolves over months; some persists, and that is normal too.',
          bullets: [
            'No baths, pools, or hot tubs until cleared (usually 3–4 weeks)',
            'Support the incision with a pillow when coughing, laughing, or getting up',
            'Numbness around the scar can last months to years — normal nerve regeneration',
          ],
        },
        {
          title: 'Lifting, driving, and the "no" list',
          content:
            'Most US providers say no driving for 1–2 weeks (or until you can slam the brakes hard without flinching), no lifting anything heavier than the baby for 6 weeks, no stairs more than necessary in the first week, no abdominal exercise until cleared at 6–8 weeks. UK NHS guidance is similar. These are not arbitrary — the deep fascial layer takes 6+ weeks to regain meaningful strength. Pushing through too early raises hernia risk.',
          bullets: [
            'No lifting >5–7 kg / baby weight for the first 6 weeks',
            'No driving until off opioid pain meds AND able to brake hard',
            'No sex, tampons, or vaginal insertion until cleared (same rule as vaginal birth)',
          ],
        },
        {
          title: 'Scar massage from week 8',
          content:
            'Once the wound is fully closed and your provider clears you (usually around 6–8 weeks), scar massage helps prevent adhesions — internal scar tissue that can tug on the bladder, bowel, and pelvic floor for years. Use a clean finger and unscented oil; press firmly along the scar in small circles, then up-down and side-to-side, for 5 minutes a day. A pelvic floor PT can teach the technique. Adhesion-related pain can show up months later as back pain, painful sex, or bladder urgency — and is very treatable.',
        },
      ],
      callout: {
        variant: 'urgent',
        title: 'C-section red flags',
        text: 'Fever above 38°C / 100.4°F, incision opening or oozing pus, increasing redness or pain, calf swelling or pain on one side (possible blood clot), shortness of breath or chest pain (possible pulmonary embolism). Blood clots are the leading cause of post-cesarean death — this is not paranoia, it is vigilance.',
      },
    },
    {
      title: 'Mental health — baby blues, PPD, anxiety, and beyond',
      content:
        'Mood symptoms are not weakness and they are not rare. The hormonal cliff plus sleep deprivation plus identity shift plus the most physically demanding period of most adult lives — of course it lands hard. Distinguishing normal adjustment from a perinatal mood and anxiety disorder (PMAD) is the single most important screening you can do for yourself. The standard tool is the Edinburgh Postnatal Depression Scale (EPDS) — 10 questions, 5 minutes, validated globally since Cox et al. published it in the British Journal of Psychiatry in 1987.',
      subsections: [
        {
          title: 'Baby blues vs. postpartum depression',
          content:
            'Baby blues affect roughly 80% of new parents: tearfulness, mood swings, sensitivity, peaking around days 3–5 and resolving by day 10–14. No treatment needed beyond rest, food, and people. Postpartum depression (PPD) affects 10–15% of birthing parents, can start any time in the first year, and does not resolve on its own. Symptoms: persistent sadness, hopelessness, intrusive thoughts, inability to feel joy or bond, sleep problems beyond what the baby is causing, appetite changes. PPD is highly treatable with therapy, medication (many SSRIs are breastfeeding-compatible), and support.',
          bullets: [
            'Blues by day 14 should be resolving — if not, screen for PPD',
            'EPDS score ≥10 warrants follow-up; ≥13 strongly suggests depression; question 10 (self-harm) any positive answer = urgent',
            'Postpartum Support International (postpartum.net) — free helpline, provider directory, support groups',
          ],
        },
        {
          title: 'Postpartum anxiety, OCD, and rage',
          content:
            'Often missed because providers screen for sadness, not fear. Postpartum anxiety affects an estimated 15–20% of birthing parents — racing thoughts, can\'t-sleep-when-baby-sleeps, catastrophic worry, physical symptoms (racing heart, chest tightness). Postpartum OCD shows up as intrusive, unwanted thoughts of harm coming to the baby — distressing precisely because you do not want them. Postpartum rage — sudden disproportionate anger — is increasingly recognized as a PPD presentation. Partners can develop postnatal depression too (PPND) — roughly 10% of fathers/non-birthing partners.',
        },
        {
          title: 'Postpartum psychosis — a medical emergency',
          content:
            'Rare (1–2 per 1000 births, so 0.1–0.2%) but a true psychiatric emergency. Symptoms usually appear in the first 2 weeks: confusion, paranoia, hallucinations, bizarre beliefs, mania, rapid mood swings, thoughts of harming self or baby that feel compelling rather than intrusive. This is not severe PPD — it is a different disorder, often linked to bipolar spectrum, and requires hospitalization. If you or someone around you sees this: call 911/999/112 or go to the ER. Do not leave the person alone with the baby.',
        },
      ],
      callout: {
        variant: 'provider',
        title: 'Ask for a mood screen',
        text: 'At every postpartum visit — and at your baby\'s well-child visits, where the AAP now recommends parental depression screening — ask explicitly: "Can we do an EPDS today?" If your provider waves it off, push back or find another. Untreated PMADs are the leading cause of postpartum maternal mortality in many high-income countries.',
      },
    },
    {
      title: 'Pelvic floor, sex, exercise, and contraception',
      content:
        'The "6-week clearance" is one of the most misleading phrases in postpartum care. It usually means "you can technically have penetrative sex and start exercising again" — not "your body is fully healed." Tissue takes months. Pelvic floor recovery, in particular, is largely DIY in the US system unless you advocate for a referral. Other countries do this far better.',
      subsections: [
        {
          title: 'Pelvic floor PT — get a referral',
          content:
            'In France every birthing parent is offered 10–20 sessions of "rééducation périnéale" — pelvic floor rehab — covered by the state. The UK and Australia routinely refer. In the US, pelvic floor PT is growing but you usually have to ask. The Cochrane review (Woodley et al. 2020) is clear: pelvic floor muscle training reduces and treats urinary and fecal incontinence in postpartum women. If you have leakage, prolapse symptoms (heaviness, pressure), painful sex, diastasis, or any pelvic pain — ask for a referral. Most insurances cover it; many PTs offer telehealth.',
          bullets: [
            'Symptoms past 6 weeks that warrant a PT referral: leakage, heaviness, painful sex, back pain, diastasis',
            'You do not need a "diagnosis" to go — prevention is valid',
            'Look for a PT credentialed in pelvic health (PRPC, WCS, or similar)',
          ],
        },
        {
          title: 'Sex, exercise, and the slow ramp',
          content:
            'ACOG suggests waiting at least 4–6 weeks before resuming penetrative sex — long enough for the cervix to close, lochia to stop, and tears or incisions to heal. Many people are not interested for much longer, especially while breastfeeding (low estrogen → vaginal dryness, often dramatically). Lube is non-negotiable; vaginal estrogen is safe and effective if dryness persists, even while breastfeeding. Exercise: walking from week one if you feel up to it, gentle core/pelvic floor work after clearance, return to running typically not before 12 weeks (and ideally after a pelvic floor screen).',
          bullets: [
            'Painful sex is common at first but should improve — persistent pain → pelvic floor PT',
            'Vaginal dryness while breastfeeding is hormonal, not psychological — lube helps',
            'Running before 12 weeks raises prolapse risk — run-readiness assessments are a thing',
          ],
        },
        {
          title: 'Contraception — including the LAM myths',
          content:
            'Ovulation can return as early as 3 weeks postpartum if you are not exclusively breastfeeding, and around 6+ months if you are. Lactational Amenorrhea Method (LAM) is real but has strict criteria: (1) baby is under 6 months, (2) you are exclusively breastfeeding day and night with no long gaps, (3) your period has not returned. All three. Pump-feeding, sleep training that drops night feeds, or starting solids breaks LAM. Progestin-only methods (mini-pill, IUD, implant) are breastfeeding-compatible; combined hormonal contraception is usually delayed until 6 weeks postpartum due to clot risk. Talk through options at your 3-week or 6-week visit, not in the hospital where decisions get rushed.',
        },
      ],
    },
    {
      title: 'Setting up support — visitors, the village, the work cliff',
      content:
        'The single biggest predictor of how postpartum feels is not how the birth went — it is how much support you have in the weeks after. Across cultures, traditional postpartum practices share a common shape: 30–40 days of rest, warmth, food brought to you, elders nearby, the new parent\'s only job being feeding the baby and themselves. La cuarentena in Latin America, zuo yuezi in China, sitting the month in many traditions. Modern Western life largely lost this — and it shows in the mental health numbers.',
      subsections: [
        {
          title: 'The "5-5-5 rule" (and why it resonates)',
          content:
            'A modern shorthand circulating online: 5 days in the bed, 5 days on the bed, 5 days around the bed — total 15 days where your only job is healing and feeding. It echoes those older traditions without claiming to be clinical guidance. Use it as a permission slip more than a prescription: rest matters, and Western culture systematically underestimates how much. WHO 2022 postnatal guidance explicitly recommends adequate rest and support.',
          bullets: [
            'Days 1–5: in bed, skin-to-skin, sleep when baby sleeps',
            'Days 6–10: on the bed, short walks to the kitchen, light visitors only',
            'Days 11–15: around the bed, slowly resuming small daily routines',
          ],
        },
        {
          title: 'Visitors, meal trains, and saying no',
          content:
            'Visitors should bring food and leave dishes washed, not expect to be hosted. A useful frame: "We are not taking visitors for the first two weeks; we will let you know when we are ready." Use a meal train (mealtrain.com, Take Them A Meal) — most people genuinely want to help and need a concrete task. If someone holds the baby, they should also hold a load of laundry. The household work that quietly multiplies is the real load — postpartum parents do not need company, they need someone to fold the towels.',
        },
        {
          title: 'The return-to-work cliff',
          content:
            'In the US, many parents return to work at 6–12 weeks — often before the body has finished healing and well before sleep has stabilized. This is a known mental health risk factor. Plan for it: line up childcare early, practice the bottle/pump rhythm two weeks before return, talk to your manager about a phased return if possible, and know that a slump 2–4 weeks back at work is common. It is also a window where PPD/PPA can emerge or worsen — re-screen yourself with the EPDS at 3, 6, and 12 months.',
          bullets: [
            'Re-screen mood at 3, 6, and 12 months — PMADs can start late',
            'A phased return (part-time for the first 2–4 weeks) softens the cliff',
            'Pumping at work is a federal right in the US under the PUMP Act (2022)',
          ],
        },
      ],
      callout: {
        variant: 'tip',
        title: 'Script for boundaries',
        text: '"Thank you so much for wanting to meet the baby. We are not taking visitors until [date]. The most helpful thing right now is a meal — here is the link." Send it once, pin it, reuse it. Boundaries are an act of postpartum self-care.',
      },
    },
  ],
  sources: [
    {
      label: 'Optimizing Postpartum Care (Committee Opinion 736)',
      org: 'ACOG',
      url: 'https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2018/05/optimizing-postpartum-care',
    },
    {
      label: 'Postnatal care (NG194)',
      org: 'NICE',
      url: 'https://www.nice.org.uk/guidance/ng194',
    },
    {
      label: 'Recommendations on maternal and newborn care for a positive postnatal experience (2022)',
      org: 'WHO',
      url: 'https://www.who.int/publications/i/item/9789240045989',
    },
    {
      label: 'Hear Her — Urgent maternal warning signs',
      org: 'CDC',
      url: 'https://www.cdc.gov/hearher/maternal-warning-signs/index.html',
    },
    {
      label: 'Edinburgh Postnatal Depression Scale (EPDS)',
      org: 'Cox, Holden & Sagovsky (1987), BJP',
      url: 'https://psychology-tools.com/test/epds',
    },
    {
      label: 'Postpartum Support International — helpline & directory',
      org: 'PSI',
      url: 'https://www.postpartum.net/',
    },
    {
      label: 'Postpartum pain and sex after pregnancy',
      org: 'ACOG',
      url: 'https://www.acog.org/womens-health/faqs/postpartum-pain-management',
    },
    {
      label: 'Your body after the birth',
      org: 'NHS',
      url: 'https://www.nhs.uk/conditions/baby/support-and-services/your-body-after-the-birth/',
    },
    {
      label: 'Pelvic floor muscle training for prevention and treatment of incontinence (Woodley et al., 2020)',
      org: 'Cochrane',
      url: 'https://www.cochrane.org/CD007471',
    },
    {
      label: 'Newborn and infant breastfeeding guidance',
      org: 'AAP / HealthyChildren',
      url: 'https://www.healthychildren.org/English/ages-stages/baby/breastfeeding/',
    },
  ],
}

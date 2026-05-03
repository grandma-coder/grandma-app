import type { BirthTopic } from '../birthGuideData'

export const CSECTION_TOPIC: BirthTopic = {
  key: 'csection',
  emoji: '🏥',
  title: 'C-Section',
  subtitle: 'Surgery, recovery, VBAC',
  heroColor: '#F0EBFF',
  heroBorder: '#C4B5FD',
  disclaimer:
    'Educational only — not medical advice. Every pregnancy and birth is different. Discuss your specific situation with your midwife, obstetrician, or family doctor, and trust your instincts if something feels wrong.',
  sections: [
    {
      title: 'What a C-section is & when it is done',
      content:
        'A caesarean section (caesarean delivery, "C-section") is the surgical birth of a baby through incisions in the abdominal wall and the uterus. It is one of the most commonly performed major surgeries worldwide — roughly 32% of US births and 25–30% of UK and EU births are caesareans, well above the WHO\'s 2015 statement that population-level rates above 10–15% do not improve maternal or newborn outcomes. Despite that headline, an individual caesarean can be the right, life-saving choice. ACOG Practice Bulletin 234 (2021) and NICE NG192 (2021) frame the modern approach the same way: the goal is not a low rate or a high rate, but the right rate for the right reasons. A C-section is not a "failure" of vaginal birth — it is a different birth.',
      subsections: [
        {
          title: 'Planned (elective) caesarean',
          content:
            'A planned caesarean is scheduled in advance, typically at 39+0 weeks for non-medical indications and earlier for specific medical reasons. The most common indications are breech or transverse presentation at term, placenta praevia or vasa praevia, certain multiple pregnancies, prior classical (vertical) uterine incision, active genital herpes lesions, and some maternal conditions (severe pre-eclampsia, certain cardiac disease). NICE NG192 also explicitly supports maternal request after counselling: if you have requested a caesarean and your team cannot agree, NICE says you should be referred to another obstetrician who will perform it.',
          bullets: [
            'Scheduled at 39+0 weeks where possible — earlier delivery raises risk of transient newborn breathing problems',
            'You will be asked not to eat for ~6 hours and to drink only clear fluids up to 2 hours before',
            'Pre-op bloods, antibiotic prophylaxis, and a discussion of anaesthesia happen the morning of surgery',
          ],
        },
        {
          title: 'Emergency (unplanned) caesarean',
          content:
            'An emergency caesarean is one decided during labour or pregnancy when continuing vaginal birth becomes unsafe. The Lucas classification grades urgency from Category 1 ("immediate threat to life of mother or fetus", decision-to-delivery target 30 minutes) to Category 4 (effectively elective). Common indications include non-reassuring fetal heart rate, failure to progress in labour, cord prolapse, placental abruption, and chorioamnionitis. Most emergency caesareans are Category 2 or 3 — urgent but not frantic. Even when the room moves quickly, modern anaesthesia (a spinal or epidural top-up) means most parents are awake and can hold their baby within minutes.',
          bullets: [
            'Category 1: immediate threat — general anaesthesia may be used to save time',
            'Category 2: maternal or fetal compromise, not immediately life-threatening — usually regional anaesthesia',
            'Category 3: needs early delivery, no compromise — regional anaesthesia',
            'Category 4: at a time to suit the woman and the team — effectively planned',
          ],
        },
      ],
      callout: {
        variant: 'provider',
        text: 'Ask your provider for the specific indication if a caesarean is recommended, and whether it is Category 1, 2, 3 or 4. You are entitled to a clear answer, written in your notes, and (outside Category 1) time to ask questions.',
      },
    },
    {
      title: 'What happens in the operating room',
      content:
        'A caesarean takes about 45–60 minutes from first incision to last stitch, but the baby is usually delivered in the first 5–10 minutes. The rest of the time is closing seven layers of tissue carefully. Knowing the choreography of the room reduces fear: it is busy, bright, and quietly orchestrated. Most parents describe pressure, tugging, and a "rummaging in a handbag" sensation rather than pain. ACOG Bulletin 234 and NICE NG192 both recommend regional anaesthesia (spinal or epidural) over general for the great majority of caesareans because it is safer for the parent and lets you be awake to meet your baby.',
      subsections: [
        {
          title: 'Preparation',
          content:
            'In the hour before surgery you will change into a gown, have an IV placed, sign consent, and meet your anaesthetist. A urinary catheter goes in after the spinal takes effect — you will not feel it. You will lie on a slightly tilted table (left lateral tilt) to keep weight off the major blood vessels. The anaesthetic team tests your block with cold spray and pinprick before any cut is made. If it is not working, you will be given more medication — speak up, this is normal and expected.',
          bullets: [
            'IV line, blood pressure cuff, oxygen sats, ECG stickers',
            'Urinary catheter after the spinal — stays in 12–24 hours',
            'Compression boots or stockings to reduce blood-clot risk',
            'A single dose of IV antibiotic 30–60 minutes before incision (reduces infection ~40%)',
          ],
        },
        {
          title: 'Anaesthesia options',
          content:
            'Spinal block is the most common: a single injection of local anaesthetic into the cerebrospinal fluid, taking effect in 5–10 minutes and lasting 1.5–2.5 hours. An existing epidural can be "topped up" if you are already in labour. A combined spinal-epidural gives the speed of the spinal with the option of extended pain relief. General anaesthesia is reserved for true emergencies, contraindications to regional anaesthesia, or maternal preference, and is used in less than 5% of UK caesareans.',
          bullets: [
            'You stay awake and aware — your partner sits by your head',
            'Common short-lived effects: shaking, nausea, itching, blood-pressure dip',
            'Post-op pain relief usually includes long-acting spinal opioid + scheduled paracetamol and ibuprofen',
          ],
        },
        {
          title: 'The surgery, layer by layer',
          content:
            'The surgeon makes a 10–15 cm horizontal "Pfannenstiel" incision just above the pubic hairline (a vertical "classical" incision is rare and only used in specific emergencies). Seven layers are opened in turn: skin, fat, fascia, rectus muscle (separated, not cut), peritoneum, uterine wall, amniotic sac. Baby is lifted out — sometimes with gentle fundal pressure from the assistant — and the cord is clamped. The placenta is delivered, the uterus is closed in two layers, and the abdominal layers are closed back up. Skin is usually closed with dissolvable sutures or staples.',
        },
        {
          title: 'The "gentle" or family-centred caesarean',
          content:
            'Smith and colleagues described the "natural caesarean" in BJOG (2008): a woman-centred technique that brings the rituals of vaginal birth into theatre. Increasingly mainstream, gentle caesarean elements include a clear or lowered drape so you can watch your baby being born, slow delivery (the "walking-the-baby-out" technique that lets the chest squeeze fluid out as in vaginal birth), immediate skin-to-skin in theatre, delayed cord clamping where safe, ECG leads moved to your back to free your chest, and quiet voices during delivery. NICE NG192 explicitly endorses these practices where clinically appropriate.',
          bullets: [
            'Ask for a clear drape or a lowered drape at the moment of birth',
            'Request immediate skin-to-skin in theatre — your partner can do it if you cannot',
            'Ask for delayed cord clamping (≥60 seconds) — recommended unless baby needs resuscitation',
            'Music of your choice, dim overhead lights once baby is out, photos at delivery',
          ],
        },
      ],
      callout: {
        variant: 'tip',
        title: 'Write your theatre wishes down',
        text: 'A one-page caesarean birth plan covering drape, skin-to-skin, cord clamping, photos, music, and who announces the sex is taken seriously by most teams. Hand it to the midwife on admission and again to the anaesthetist.',
      },
    },
    {
      title: 'Recovery — 24 hours, week 1, weeks 2–6, and the long view',
      content:
        'A caesarean is major abdominal surgery and the recovery is genuinely longer than for an uncomplicated vaginal birth: most guidelines quote 6 weeks for soft tissue healing and 12 weeks for the uterine scar to reach near-final strength. The good news: enhanced recovery after surgery (ERAS) protocols — early mobilisation, early eating and drinking, multimodal pain relief, and early catheter removal — have shortened hospital stays from 4–5 days to 2–3 days in most settings, and reduced complications. Be ambitious about rest, not about bouncing back.',
      subsections: [
        {
          title: 'First 24 hours',
          content:
            'The spinal wears off over 2–4 hours; sensation returns to your legs from the toes up. You will be encouraged to sit up within a few hours and to take your first short walk by 6–12 hours, supported by a midwife. Early mobilisation reduces blood-clot risk meaningfully. The catheter comes out around 12 hours after the spinal wears off. You will be on regular paracetamol and ibuprofen with stronger opioids (oramorph, oxycodone) available if needed — take pain relief on the clock, not when pain peaks. Skin-to-skin and breastfeeding can begin in recovery; the "biological nurturing" laid-back position protects your wound.',
          bullets: [
            'Compression boots or stockings stay on for the first 24h to prevent DVT',
            'Drink small sips early; light food when you feel up to it (ERAS protocols)',
            'Splint your wound with a pillow when you cough, laugh, or move',
            'Most parents are discharged at 24–48 hours if recovery is uncomplicated',
          ],
        },
        {
          title: 'Week 1 at home',
          content:
            'Pain peaks around days 2–4 and improves steadily after that. Lochia (postpartum bleeding) follows the same pattern as vaginal birth — bright red for 3–4 days, then pinkish-brown, then yellow-white over 4–6 weeks — though it may be slightly lighter overall. The wound is usually covered with a dressing for the first 24–48 hours, then left open to air. Nothing heavier than your baby. No driving until you can perform an emergency stop without flinching (typically 4–6 weeks; check your insurance). Sleep matters more than tidying — aim for the "5-5-5 rule" of postpartum confinement: 5 days in bed, 5 on the bed, 5 near the bed.',
          bullets: [
            'Shower from day 1–2; pat the wound dry, do not soak in a bath until healed',
            'Watch for: redness spreading, warmth, foul discharge, gaping, or fever > 38°C / 100.4°F',
            'Constipation is very common — stool softeners (lactulose, docusate) are your friend',
            'Wear high-waisted "C-section" knickers — low waistbands sit exactly on the wound',
          ],
        },
        {
          title: 'Weeks 2–6',
          content:
            'External skin closes by 1–2 weeks and superficial healing is largely done by 6 weeks, when most providers do a postnatal check (blood pressure, mood screen using the Edinburgh Postnatal Depression Scale, wound, contraception). Deeper layers — fascia and uterus — continue remodelling for 12 weeks. Gentle walking from week 1, gradually longer; pelvic-floor awareness work from week 2; no abdominal exercise (planks, sit-ups, running, heavy lifting) until cleared, usually 8–12 weeks, ideally with a pelvic-health physiotherapist. Many countries (France, Australia, increasingly the UK and US) include a routine pelvic-floor physio referral after caesarean — pregnancy itself stresses the pelvic floor, even without vaginal birth.',
          bullets: [
            'Cleared for sex, swimming, tampons, and most exercise at the 6-week check',
            'Returning to running before 12 weeks is associated with higher rates of pelvic-floor symptoms',
            'Mood: baby blues days 3–10 are universal; persistent low mood beyond 2 weeks needs a call',
          ],
        },
        {
          title: 'The scar — months and years',
          content:
            'The Pfannenstiel scar fades from raised pink to pale silver over 12–18 months. Numbness above the scar is normal (small nerves are cut and only some regenerate) and usually improves over a year. From week 6–8, once fully healed and approved by your provider, scar massage helps prevent adhesions — internal bands of scar tissue that can tether organs and cause pain or fertility issues later. Use circular motions, then cross-friction (perpendicular to the scar), then "skin rolling" gently between your fingers. Silicone scar sheets or gels reduce raised/keloid scarring in those prone to it. If the scar is painful, lumpy, or you develop a "shelf" of overhanging skin (the "C-shelf"), a women\'s health physio or scar therapist can help.',
        },
      ],
      callout: {
        variant: 'urgent',
        title: 'Call urgently or go to A&E if',
        text: 'You have wound redness spreading, foul discharge or gaping, fever > 38°C / 100.4°F, soaking more than one pad per hour, calf pain or swelling, sudden chest pain or shortness of breath, or severe headache with vision changes. Postpartum infection, wound dehiscence, deep-vein thrombosis, pulmonary embolism, and postpartum pre-eclampsia are rare but real risks in the first 6 weeks after a caesarean.',
      },
    },
    {
      title: 'VBAC — vaginal birth after caesarean',
      content:
        'A previous caesarean does not mean every future birth must be a caesarean. VBAC (vaginal birth after caesarean) and TOLAC (trial of labour after caesarean) are well-supported options for most parents who had one previous low-transverse caesarean. ACOG Practice Bulletin 205 (2019) and RCOG Green-top Guideline 45 both endorse VBAC as a reasonable choice and emphasise that the decision belongs to the pregnant person after a careful conversation about benefits and risks. Success rates among suitable candidates are 60–80%; success is more likely if you have had a previous vaginal birth, spontaneous labour, and a non-recurring indication for the first caesarean (e.g. breech, not "failure to progress").',
      subsections: [
        {
          title: 'Who is a good candidate',
          content:
            'You are typically a candidate if you have had one (sometimes two) previous low-transverse caesareans, no other significant uterine surgery (myomectomy entering the cavity, classical incision, T-incision), a singleton cephalic baby, and access to a hospital that can perform an immediate caesarean if needed. Twin VBAC and VBAC after two caesareans are offered in some centres after individualised counselling. Conditions that usually rule VBAC out: previous uterine rupture, classical or T-shaped uterine scar, placenta praevia or accreta, or any contraindication to vaginal birth in this pregnancy.',
          bullets: [
            'Best predictors of success: previous vaginal birth, spontaneous labour onset, BMI < 30, baby < 4 kg',
            'VBAC calculators (MFMU) give individualised probability — ask your provider',
            'Successful VBAC has lower morbidity than either elective repeat caesarean or failed TOLAC',
          ],
        },
        {
          title: 'Uterine rupture — the headline risk',
          content:
            'Uterine rupture is the rare but serious complication that drives most VBAC counselling. The baseline risk in spontaneous labour after one previous low-transverse caesarean is 0.5–1% (roughly 1 in 200). Induction with prostaglandins raises the risk substantially (up to 2.5%) and is generally avoided; oxytocin augmentation roughly doubles baseline risk and is used cautiously. Rupture risk after two previous caesareans is around 1.4%. Modern management — continuous fetal monitoring in active labour, immediate operating theatre access, anaesthetist on site — means most ruptures are recognised and managed before serious harm to mother or baby.',
          bullets: [
            'Warning signs: sudden severe abdominal pain between contractions, fetal heart rate changes, loss of contractions, vaginal bleeding',
            'Most VBAC labours are managed with continuous electronic fetal monitoring',
            'Epidurals do not mask uterine rupture — pain breaks through',
          ],
        },
        {
          title: 'Elective repeat caesarean — the alternative',
          content:
            'Elective repeat caesarean (ERCS) is the alternative, and an entirely valid choice. ERCS removes the small rupture risk and the chance of a failed TOLAC ending in unplanned caesarean (which carries higher morbidity than either route alone). It comes with the cumulative surgical risks of repeat caesareans — adhesions, placenta accreta spectrum disorders rising sharply with each subsequent caesarean, longer recovery — which become more relevant if you plan a larger family. ACOG and RCOG both stress that there is no single "right" answer; the best choice is the one you make with full information.',
        },
      ],
      callout: {
        variant: 'provider',
        text: 'Ask: "Am I a VBAC candidate? What is your unit\'s VBAC success rate? What is your rupture rate? How will my labour be monitored, and how quickly can a caesarean happen if needed?" A confident unit answers these openly.',
      },
    },
    {
      title: 'Risks, benefits, and the real numbers',
      content:
        'Caesarean is safer than ever — but it is still major surgery, and the risk profile differs from vaginal birth. ACOG Bulletin 234, NICE NG192, and the Cochrane review by Lavender and colleagues (2012, on planned caesarean for non-medical reasons) all converge on the same picture: when there is a clear medical indication, caesarean reduces specific harms; when there is not, the balance shifts. Looking at real numbers — not adjectives — helps you weigh the trade-offs honestly.',
      subsections: [
        {
          title: 'Documented benefits (when indicated)',
          content:
            'For specific situations, caesarean reduces real harms: lower neonatal trauma in breech presentation; near-elimination of vertical HIV transmission when viral load is high; safer delivery in placenta praevia; controlled timing in severe pre-eclampsia. Compared to attempted vaginal breech in non-specialist settings, planned caesarean reduces neonatal mortality and short-term morbidity (Term Breech Trial, Hannah 2000). Predictable timing is a genuine practical benefit for childcare, work, and family logistics — not a trivial consideration.',
        },
        {
          title: 'Risks for the parent',
          content:
            'Compared with uncomplicated vaginal birth, caesarean roughly doubles the risk of severe maternal morbidity overall, though the absolute numbers remain low. Approximate risks per caesarean (NICE NG192, ACOG 234): infection 6%, haemorrhage requiring transfusion 0.5%, bladder injury 0.1%, hysterectomy 0.7–0.8 per 1,000, venous thromboembolism 0.04%, maternal death (developed countries) ~1 in 12,000 vs ~1 in 25,000 for vaginal birth. Each subsequent caesarean increases the risk of placenta accreta spectrum (placenta growing into or through the uterine wall) — from 0.3% after one to 2.1% after three to 6.7% after five — relevant if you plan a larger family.',
          bullets: [
            'Adhesions in 30–50% by the third caesarean — can cause pain, bowel issues, fertility problems',
            'Slightly higher rate of postpartum depression and birth-related PTSD, especially after unplanned caesarean',
            'Future pregnancy: higher risk of stillbirth, scar pregnancy, and accreta',
          ],
        },
        {
          title: 'Risks and considerations for baby',
          content:
            'Babies born by planned caesarean before 39+0 weeks have a higher rate of transient tachypnoea of the newborn (TTN) — fast breathing for the first hours — because the chest squeeze of vaginal birth helps clear lung fluid. Scheduling at 39+0 weeks reduces this. Cohort data suggest small increases in childhood asthma, atopy, and obesity after caesarean, possibly mediated by altered gut microbiome seeding (the data are correlational, not yet causal, and effect sizes are small). "Vaginal seeding" — swabbing baby with maternal vaginal flora at birth — has shown microbiome effects in small trials but is not yet recommended outside research settings (ACOG 2017).',
          bullets: [
            'TTN risk: ~3% at 39w, 6% at 38w, 10% at 37w for planned caesarean',
            'Skin-to-skin and breastfeeding partially close the microbiome gap',
            'Accidental fetal laceration during incision: 1–2%, almost always superficial',
          ],
        },
        {
          title: 'How rates vary, and what that tells you',
          content:
            'WHO\'s 2015 statement on caesarean rates noted that rates above 10–15% at population level do not improve outcomes, while large variation between hospitals (from 15% to 50% in similar populations) reflects practice culture more than patient need. When choosing where to give birth, ask for unit-specific numbers: nulliparous term singleton vertex (NTSV) caesarean rate, induction rate, instrumental delivery rate, VBAC success rate. Confident units publish these.',
        },
      ],
    },
    {
      title: 'Emotional aftermath & finding your story',
      content:
        'Bodies heal on a fairly predictable timeline; the emotional recovery from caesarean does not. A planned caesarean for a clear reason often feels calm and empowering. An unplanned caesarean — especially after long labour — can feel like grief, even when everyone is alive and well. Both responses are normal. Birth-related PTSD affects 4–6% of all parents and is more common after unplanned caesarean, particularly when the experience felt frightening or out of control. Naming the feeling is the first step in healing it.',
      subsections: [
        {
          title: 'Grief is allowed',
          content:
            'You can be grateful your baby is here and grieve the birth you imagined. Both feelings are true at once. Common threads include: feeling like a bystander to your own birth; feeling your body "failed"; missing the moment of meeting your baby; intrusive memories of the operating room; not recognising the experience when others say "all that matters is a healthy baby". None of this means you do not love your baby. Talking it through — with your partner, a friend who has been there, a therapist trained in birth trauma, or a hospital postnatal debrief — meaningfully reduces the chance of long-term distress.',
        },
        {
          title: 'Bonding and breastfeeding after caesarean',
          content:
            'The Cochrane skin-to-skin review (Moore et al.) found that early skin-to-skin contact improves breastfeeding initiation, infant temperature stability, and maternal–infant attachment regardless of birth mode. Caesarean does delay milk "coming in" by an average of about 24 hours, and early breastfeeding can be uncomfortable around the wound — the rugby-ball/football hold and the laid-back/biological-nurturing position keep baby off your scar. Skin-to-skin in theatre, frequent feeding from the first hour, and good lactation support close the gap. Bonding, importantly, is not a single moment to be missed — it is a process that builds over weeks and months.',
          bullets: [
            'Pillow over your wound to protect it during feeds',
            'Side-lying breastfeeding once you can roll — easiest position post-op',
            'If you could not do skin-to-skin in theatre, your partner doing it is biologically valuable too',
          ],
        },
        {
          title: 'When to ask for more help',
          content:
            'Persistent low mood, intrusive memories, avoidance of birth-related places or conversations, feeling detached from your baby, panic attacks, or thoughts of harming yourself — any of these for more than 2 weeks deserve a same-week call to your provider. Specialist birth trauma therapy (EMDR, trauma-focused CBT) is highly effective. Most maternity units offer a "birth afterthoughts" or "birth reflections" service — a free appointment with a senior midwife to walk through your notes and answer questions. Even months or years later, you can still book one.',
        },
      ],
      callout: {
        variant: 'tip',
        title: 'Book a birth debrief',
        text: 'If your caesarean left you with unanswered questions, ask your hospital for a "birth reflections" or "birth afterthoughts" appointment. It is free, often available years after the birth, and frequently transformative.',
      },
    },
  ],
  sources: [
    {
      label: 'Practice Bulletin 234: Cesarean Delivery',
      org: 'ACOG, 2021',
      url: 'https://www.acog.org/clinical/clinical-guidance/practice-bulletin/articles/2021/06/cesarean-delivery',
    },
    {
      label: 'Practice Bulletin 205: Vaginal Birth After Cesarean Delivery',
      org: 'ACOG, 2019',
      url: 'https://www.acog.org/clinical/clinical-guidance/practice-bulletin/articles/2019/02/vaginal-birth-after-cesarean-delivery',
    },
    {
      label: 'NG192 — Caesarean birth',
      org: 'NICE (UK), 2021',
      url: 'https://www.nice.org.uk/guidance/ng192',
    },
    {
      label: 'Green-top Guideline 45: Birth after previous caesarean birth',
      org: 'RCOG (UK)',
      url: 'https://www.rcog.org.uk/guidance/browse-all-guidance/green-top-guidelines/birth-after-previous-caesarean-birth-green-top-guideline-no-45/',
    },
    {
      label: 'Planned caesarean section for non-medical reasons (Lavender et al.)',
      org: 'Cochrane Database of Systematic Reviews, 2012',
      url: 'https://www.cochrane.org/CD004660',
    },
    {
      label: 'Early skin-to-skin contact for mothers and their healthy newborn infants (Moore et al.)',
      org: 'Cochrane Database of Systematic Reviews',
      url: 'https://www.cochrane.org/CD003519',
    },
    {
      label: 'WHO statement on caesarean section rates',
      org: 'World Health Organization, 2015',
      url: 'https://www.who.int/publications/i/item/WHO-RHR-15.02',
    },
    {
      label: 'Caesarean section',
      org: 'NHS (UK)',
      url: 'https://www.nhs.uk/conditions/caesarean-section/',
    },
    {
      label: 'C-section: About',
      org: 'Mayo Clinic',
      url: 'https://www.mayoclinic.org/tests-procedures/c-section/about/pac-20393655',
    },
    {
      label: 'The natural caesarean: a woman-centred technique (Smith et al.)',
      org: 'BJOG, 2008',
      url: 'https://obgyn.onlinelibrary.wiley.com/doi/10.1111/j.1471-0528.2008.01777.x',
    },
  ],
}

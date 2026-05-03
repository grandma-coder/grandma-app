// lib/birthGuide/positions.ts
import type { BirthTopic } from '../birthGuideData'

export const POSITIONS_TOPIC: BirthTopic = {
  key: 'positions',
  emoji: '🤸',
  title: 'Birth Positions',
  subtitle: 'How position changes labor — and what to do',
  heroColor: '#F5F0FF',
  heroBorder: '#CDB7F5',
  disclaimer:
    'Educational only — not medical advice. Some positions may not be possible depending on monitoring, anaesthesia, or clinical needs. Discuss with your midwife.',
  sections: [
    {
      title: 'Why position matters',
      content:
        'Position is not decoration — it is mechanics. The pelvis is not a fixed ring; the sacrum nutates, the ischial spines move, and the pelvic outlet changes shape by several centimeters depending on what your hips and knees are doing. Imaging studies (Michel et al. 2002, MRI) have shown the pelvic outlet can be roughly 28–30% larger in a deep squat than in supine lithotomy. Gravity helps the baby press evenly on the cervix in the first stage and descend through the outlet in the second. Lying flat on your back, by contrast, compresses the inferior vena cava — reducing return blood flow to the heart, dropping maternal blood pressure, and reducing oxygen delivery to the placenta. ACOG (Committee Opinion 766, 2019) and WHO (2018 intrapartum guidance) both recommend supporting freedom of movement and upright positions when clinically possible. Lamaze names "avoid giving birth on your back" as one of six core healthy birth practices.',
      subsections: [
        {
          title: 'The pelvis is dynamic',
          content:
            'The three levels of the pelvis — inlet, midpelvis, outlet — each prefer different positions. The inlet (where baby starts) opens with hip flexion (knees toward chest, supported squat). The midpelvis (often the trickiest passage) opens with asymmetry and rotation (lunges, side-lying with one leg up). The outlet opens with hip external rotation and knees apart (squat, hands-and-knees). One position does not fit all of labor — changing position every 20–40 minutes in active labor is a reasonable rhythm.',
          bullets: [
            'Inlet stage: hip flexion helps — supported squat, ball, hands-and-knees',
            'Midpelvis: asymmetry helps — lunges, side-lying with peanut ball',
            'Outlet (pushing): external hip rotation — squat, all-fours, supported standing',
            'No single "best" position — the best is the next one when the current one stops feeling right',
          ],
        },
        {
          title: 'Gravity, vena cava, and oxygen',
          content:
            'Lying supine compresses the vena cava under the weight of the uterus, which can cause maternal hypotension and reduced placental perfusion within minutes. Even a 15–30° tilt to the left side relieves most of this. Upright positions also use gravity to encourage descent and help align the baby with the pelvic axis. The Cochrane review by Lawrence et al. (2013) found that walking and upright positions in the first stage shortened labor by about an hour on average and were associated with fewer epidurals — without increasing harm.',
          bullets: [
            'Flat on back is the worst position for circulation in late pregnancy and labor',
            'Left side tilt is a reasonable default if you must rest lying down',
            'Upright + mobile in first stage: ~1 hour shorter labor on average (Cochrane 2013)',
          ],
        },
        {
          title: 'Why hospitals still use lithotomy',
          content:
            'Lithotomy — flat on back, legs in stirrups — is convenient for the provider, not the baby. It gives the cleanest view of the perineum, the easiest access for instruments, and the most controlled environment for a clinician trained on it. It is not based on physiology. Cochrane Gupta 2017 found that for women without an epidural, upright second-stage positions reduce assisted (forceps/vacuum) deliveries, episiotomies, and abnormal fetal heart rate patterns, with a small possible increase in second-degree tears and blood loss. The trade-offs are real, but the default of "lie down to push" is a cultural choice, not a medical one.',
          bullets: [
            'Lithotomy = provider convenience, not maternal-fetal benefit',
            'Cochrane 2017 (Gupta): upright second stage → fewer instrumental births and episiotomies',
            'You can ask to push in any position your monitoring allows',
          ],
        },
      ],
      callout: {
        variant: 'provider',
        title: 'Ask in advance',
        text: 'In your 36-week visit, ask: "If everything is normal, am I free to move in labor and to push in any position I find?" Also ask whether continuous or intermittent monitoring is the default for your risk profile, and whether wireless/telemetry monitoring is available — it changes what positions you can use.',
      },
    },
    {
      title: 'Early and active labor positions',
      content:
        'In the first stage your job is to dilate the cervix and rotate the baby into a good position for descent. Mobility helps both. The Cochrane Lawrence 2013 review of more than 25 trials found that women who were upright and mobile in the first stage had labors about an hour shorter and were less likely to have an epidural or a caesarean. The early phase (0–6 cm) is also long — often 6–12 hours for a first baby — so positions that conserve energy matter as much as positions that "do something." Alternate active (walking, lunging) with restful (leaning on a ball, on your partner) every 20–40 minutes.',
      subsections: [
        {
          title: 'Walking and stair-climbing',
          content:
            'Walking uses gravity and the natural rocking of the pelvis to encourage descent. Stair-walking adds asymmetry — one foot up, one foot down — which opens one side of the pelvis at a time and is particularly useful if the baby is stuck high or in a posterior position. Walk slowly, lean on your partner during contractions, and rest in between. Aim for short loops (10–15 minutes) rather than marathons.',
          bullets: [
            'Slow walking on flat ground — easy default in early labor',
            'Stair-walking sideways, one stair at a time — for asymmetry and rotation',
            'Lean forward onto a wall or partner during each contraction',
            'Partner: walk just behind, hands on lower back, ready to take weight',
          ],
        },
        {
          title: 'Slow-dancing and leaning',
          content:
            'Standing and leaning forward onto your partner — arms around their neck, swaying side to side — is one of the most underrated positions in labor. It is upright (gravity), forward-leaning (encourages baby off the spine and into the optimal anterior position), and intimate (oxytocin loves familiar touch). It is also restful enough to use for hours.',
          bullets: [
            'Sway, do not bounce — slow rocking matches contraction rhythm',
            'Partner stands with feet wider than shoulders for stability',
            'Partner: firm hands on the lower back, counter-pressure during peaks',
            'Add a slow exhale and a low-pitched moan — keeps the jaw and pelvic floor loose',
          ],
        },
        {
          title: 'Birth ball — sitting, leaning, hip circles',
          content:
            'A 65–75 cm birth ball gives you the upright posture benefits of standing without the leg fatigue. Sitting and doing slow hip circles (figure-8s) keeps the pelvis mobile and is well-tolerated even in strong contractions. Leaning forward over the ball from kneeling is one of the best back-labor positions — it lifts the uterus off the spine and gives the partner a clean target for counter-pressure on the sacrum.',
          bullets: [
            'Seated on ball: hips slightly higher than knees, feet flat, slow circles',
            'Kneeling and leaning over ball: ideal for back labor and rest',
            'Bouncing gently is fine — vigorous bouncing is not necessary',
            'Hospitals usually have one — confirm in advance or bring your own',
          ],
        },
        {
          title: 'Lunges and asymmetric standing',
          content:
            'A lunge — one foot up on a chair or stair, hips squared forward, then gently rocking forward into the raised leg during contractions — opens the midpelvis on the side of the raised leg. It is particularly useful if descent has slowed or the baby seems to be in an asymmetric position. Switch sides every 5–10 contractions or based on what feels right.',
          bullets: [
            'Foot raised on a stable surface (chair, low stool, hospital bed step)',
            'Rock forward into the raised hip during contractions',
            'Partner stabilizes from behind — never let her balance on her own',
            'Useful when labor stalls in active phase',
          ],
        },
      ],
    },
    {
      title: 'Transition — rest with gravity',
      content:
        'Transition (typically 7–10 cm) is short, intense, and exhausting. The contractions are at their longest and closest, and many people feel they cannot do this anymore (a classic transition signal — usually it means you are nearly there). Position now is about resting between contractions while still using gravity, and finding something that lets you stay loose. Forcing an active position now will burn energy you need for pushing. Forward-leaning with support is the workhorse of transition.',
      subsections: [
        {
          title: 'Hands-and-knees with chest down',
          content:
            'Knees on the floor or bed, chest dropped onto a pile of pillows or the head of an adjustable bed raised high. The hips stay elevated and forward, taking pressure off the spine and giving baby room to rotate. This is also a classic position for slowing things down if transition is overwhelming or if you feel an early urge to push before you are fully dilated.',
          bullets: [
            'Pile pillows or raise the bed back so your chest is supported',
            'Knees wide, hips above shoulders if possible (helps reduce premature urge to push)',
            'Partner: cool cloth on the neck, sips of water or ice between contractions',
            'Rock the hips slowly — do not stay perfectly still',
          ],
        },
        {
          title: 'Side-lying with peanut ball or pillow stack',
          content:
            'Lie on your left side with your top leg supported high — knee bent and resting on a peanut ball, a stack of pillows, or your partner. This keeps the pelvis open (asymmetric) while letting you rest fully. It is the highest-yield rest position with or without an epidural. Switch sides every 30–60 minutes.',
          bullets: [
            'Top knee high and slightly forward — opens the midpelvis',
            'Bottom leg straight or slightly bent for stability',
            'Switch sides regularly — alternating asymmetry helps rotation',
            'Works fine with continuous fetal monitoring',
          ],
        },
        {
          title: 'Supported squat (only if you have energy)',
          content:
            'For those still moving well, a supported squat — partner sitting on a chair with you in front, your arms hooked back over their thighs, hips dropped — uses gravity hard and opens the outlet wide. Most people cannot hold this for more than a few contractions in transition, and that is fine. It is a tool, not a requirement.',
          bullets: [
            'Use only between contractions if standing feels OK; rest forward in between',
            'Partner sits firmly — do not attempt without solid support',
            'Skip this if your legs are shaking — that is a sign to rest, not push gravity',
          ],
        },
      ],
    },
    {
      title: 'Pushing — upright positions',
      content:
        'For the second stage without an epidural, the Cochrane review by Gupta et al. (2017) is the clearest guidance available: upright positions reduce assisted vaginal births, episiotomies, and abnormal fetal heart rate tracings, with a small possible increase in second-degree tears and a small increase in blood loss. The "best" upright position is the one your body is asking for. Most people who are free to move will spontaneously choose hands-and-knees, side-lying with one leg up, or a supported squat. ACOG explicitly endorses maternal choice of pushing position for low-risk births.',
      subsections: [
        {
          title: 'Hands-and-knees (all-fours)',
          content:
            'Knees and hands on the bed or floor, back straight or slightly arched. Gravity is neutral-to-helpful, the sacrum is free to move backward as the baby descends, and pressure is off the spine — making this the position of choice for back labor and posterior babies. It also reduces the risk of severe perineal tears compared with semi-reclined pushing in some observational studies.',
          bullets: [
            'Knees wide, hands or forearms supporting upper body',
            'Lower the chest if you need to rest between pushes',
            'Best position for OP (sunny-side-up) babies and back labor',
            'Partner: kneel beside her, one hand on lower back, voice low and steady',
          ],
        },
        {
          title: 'Supported squat',
          content:
            'A full squat opens the pelvic outlet by up to 30% but is hard to hold without support. Options: bar squat (squat bar attached to the bed, grip and pull up between pushes, drop into squat for the push), partner-supported squat (partner behind you with hands under your arms taking part of your weight), or dangle (your partner sits on the bed and you hang from their neck/shoulders with feet on the floor). Use gravity hard, then rest sitting back on the bed between contractions.',
          bullets: [
            'Bar squat: most hospitals have a squat bar — ask in advance',
            'Drop into squat for the push, rise/sit between pushes to rest',
            'Partner: take real weight — this is physically demanding for both of you',
            'Skip if legs are unsteady, blood pressure is dropping, or you have an epidural',
          ],
        },
        {
          title: 'Supported standing and lunging',
          content:
            'Standing to push is unusual but works for some, particularly when descent is slow. Lean forward onto a raised bed or your partner, with one foot raised slightly (asymmetry). This combines gravity, forward lean, and asymmetric pelvic opening. It is tiring — alternate with sitting back on the ball or bed.',
          bullets: [
            'Forward lean keeps the baby off the spine and aligns the descent path',
            'Useful if pushing has stalled in another position',
            'Partner: stand close behind for support, not in front',
          ],
        },
        {
          title: 'Toilet sitting',
          content:
            'The toilet is a surprisingly good labor and pushing seat. Your body is conditioned to release the pelvic floor here, the position is upright with hip flexion, and the seat takes weight off your legs. Many people find their first really productive pushes happen on the toilet. Move to the bed for the actual birth (or not — some midwives are happy to catch in the bathroom).',
          bullets: [
            'Sit backwards (facing the tank) and lean on a pillow on the tank for variety',
            'Pelvic floor releases more readily here than in any other position',
            'Move before the baby is crowning unless your team is ready in the bathroom',
          ],
        },
      ],
    },
    {
      title: 'Pushing — reclined and side-lying',
      content:
        'Reclined positions are not the enemy. They are the right tool when energy is low, when an epidural makes upright impractical, when blood pressure is unstable, or when the team needs continuous monitoring access. The key distinction is reclined-with-support versus flat-on-back. Semi-reclined (back of the bed at 45–60°, knees pulled toward chest) is far better than supine. Side-lying is the most evidence-supported "rest" position for pushing, including with an epidural. Cochrane Kibuka & Thornton 2017 looked at upright vs reclined pushing with an epidural and found no clear benefit either way for most outcomes — reassuring news that a comfortable reclined position with an epidural is a reasonable choice.',
      subsections: [
        {
          title: 'Side-lying with leg supported',
          content:
            'Lie on your side, top leg lifted and held by your partner or a peanut ball, bottom leg straight. The lifted leg creates pelvic asymmetry that mimics the benefits of standing. This is one of the most comfortable pushing positions, especially with an epidural, and observational data suggest it may be associated with lower rates of severe perineal tears than semi-reclined pushing.',
          bullets: [
            'Bottom leg straight, top leg held high — partner or nurse supports',
            'Switch sides every 20–30 minutes if pushing is taking time',
            'Compatible with continuous monitoring and most epidural setups',
            'Often the "default" pushing position recommended by midwives for tear prevention',
          ],
        },
        {
          title: 'Semi-reclined (NOT flat)',
          content:
            'Bed back raised to 45–60°, knees drawn toward chest, chin tucked during pushes. This is the most common hospital pushing position and is fine — particularly with an epidural, when you cannot feel your legs well enough for upright. The critical thing is the bed back must be raised enough that your uterus is not compressing your vena cava. If you start feeling lightheaded, dizzy, or the baby\'s heart rate drops, tilt left or sit up more.',
          bullets: [
            'Bed back at least 45°, ideally higher',
            'Knees toward chest, hands behind thighs or holding handles',
            'Chin tucked during the push to direct effort downward',
            'Tilt left if blood pressure drops or fetal heart rate decelerates',
          ],
        },
        {
          title: 'Peanut ball with epidural',
          content:
            'A peanut-shaped ball placed between the knees while side-lying keeps the pelvis open even when you cannot feel your legs. The Cochrane review by Roth et al. (2016) found peanut ball use during epidural labor was associated with shorter first stage, shorter second stage, and lower caesarean rates, though trial quality was modest. It is one of the easiest interventions to ask for and one of the most likely to be helpful when mobility is limited.',
          bullets: [
            'Place between the knees, top leg flexed up over the ball',
            'Switch sides every 30–60 minutes',
            'Most labor and delivery units have one — ask on admission',
            'Keep using it during pushing if the team agrees',
          ],
        },
      ],
      callout: {
        variant: 'tip',
        title: 'Peanut ball with an epidural',
        text: 'If you have an epidural, ask for a peanut ball at admission. Cochrane evidence (Roth 2016) suggests it shortens labor and lowers caesarean rates with no documented harm. It is the simplest, lowest-cost upgrade to an epidural birth.',
      },
    },
    {
      title: 'Position changes for specific scenarios',
      content:
        'Some situations call for specific position responses. Slow descent, back labor, exhaustion, and limited mobility from an epidural all benefit from intentional position changes rather than just "let her find what feels right." Spinning Babies has popularized many techniques — forward-leaning inversion, side-lying release, the "Three Sisters of Balance" — and many midwives use them with good clinical results. The published evidence on the specific Spinning Babies protocols is limited and mixed, so consider them as additional tools your provider can offer if they are trained, not as evidence-based requirements. The general principles (asymmetry, mobility, gravity) are well-supported even where the specific named techniques are not.',
      subsections: [
        {
          title: 'Back labor and posterior (OP) babies',
          content:
            'When the baby is sunny-side-up (occiput posterior), labor is often longer and the contractions are felt strongly in the lower back. The position goal is to get the baby off your spine and encourage rotation to anterior. Forward-leaning is the through-line: hands-and-knees, kneeling over the ball, leaning over the raised head of the bed. Avoid reclined positions for as long as you can — they make back labor worse.',
          bullets: [
            'Hands-and-knees as the default — even for resting between contractions',
            'Kneeling over a birth ball or raised bed — forward and supported',
            'Partner: firm sustained counter-pressure on the sacrum during contractions',
            'Lunges and stair-walking can encourage rotation between contractions',
          ],
        },
        {
          title: 'Slow descent in second stage',
          content:
            'If pushing has been going for an hour or more without much progress, change something. Switch from semi-reclined to hands-and-knees, or to a supported squat, or to side-lying with the top leg high. Asymmetry — one leg high, one low — often unsticks a baby who is rotating through the midpelvis. ACOG defines arrested descent (in low-risk cases) as no progress over 3 hours of pushing for first births with an epidural; well before that point, position changes are the cheapest and safest first intervention.',
          bullets: [
            'Change position every 20–30 minutes if descent stalls',
            'Try the opposite of what you have been doing — reclined → all-fours, or vice versa',
            'Asymmetric positions often help babies through the midpelvis',
            'Toilet sitting between attempts can reset the pelvic floor',
          ],
        },
        {
          title: 'Exhaustion',
          content:
            'Long labors burn through energy. The right position when you are exhausted is one that lets you rest fully while still keeping the pelvis open. Side-lying with peanut ball is the gold standard. Hands-and-knees with chest dropped onto pillows is a close second. Eat something if your provider allows, drink, dim the lights, and try to sleep between contractions. A 30-minute rest can restart progress more reliably than another hour of forcing movement.',
          bullets: [
            'Side-lying with peanut ball: full rest with open pelvis',
            'Eat and drink if allowed (ACOG 2019 supports oral intake in low-risk labor)',
            'Dim the lights, lower the voices — oxytocin needs calm',
            'A short nap is not failing — it is fuel',
          ],
        },
        {
          title: 'Position with an epidural',
          content:
            'A modern low-dose epidural usually leaves you with enough sensation to shift in bed, and many units now allow side-lying, hands-and-knees with bed support, and even supported standing at the bedside. The key positions: side-lying with peanut ball, throne (bed back raised steeply, you sitting tall with knees apart), and hands-and-knees with the bed raised to support your chest. Ask the nurse to help you change position every 30–60 minutes — the epidural will not remind you to move.',
          bullets: [
            'Throne position: bed back at 75–80°, knees apart, sitting tall',
            'Hands-and-knees: raise the bed head, lean chest onto it from kneeling',
            'Side-lying with peanut ball: switch sides every 30–60 minutes',
            'Set a timer or ask the nurse to remind you — the epidural blocks position cues',
          ],
        },
      ],
      callout: {
        variant: 'tip',
        title: 'The Spinning Babies caveat',
        text: 'Techniques like forward-leaning inversion and side-lying release are popular and many midwives use them with good results, but published evidence is limited. Use them as additional tools when offered by a trained provider — and rely on the well-supported principles (asymmetry, mobility, gravity) regardless.',
      },
    },
  ],
  sources: [
    {
      label: 'Committee Opinion 766: Approaches to Limit Intervention During Labor and Birth (2019)',
      org: 'ACOG',
      url: 'https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2019/02/approaches-to-limit-intervention-during-labor-and-birth',
    },
    {
      label: 'Maternal positions and mobility during first stage labour (Lawrence et al. 2013)',
      org: 'Cochrane',
      url: 'https://www.cochrane.org/CD003934',
    },
    {
      label: 'Position in the second stage of labour for women without epidural anaesthesia (Gupta et al. 2017)',
      org: 'Cochrane',
      url: 'https://www.cochrane.org/CD002006',
    },
    {
      label: 'Position in the second stage of labour for women with epidural anaesthesia (Kibuka & Thornton 2017)',
      org: 'Cochrane',
      url: 'https://www.cochrane.org/CD008070',
    },
    {
      label: 'Peanut ball for shortening labour duration (Roth et al. 2016)',
      org: 'Cochrane',
      url: 'https://www.cochrane.org/CD012329',
    },
    {
      label: 'Healthy Birth Practice 4: Avoid Giving Birth on Your Back',
      org: 'Lamaze International',
      url: 'https://www.lamaze.org/healthy-birth-practices',
    },
    {
      label: 'NG235: Intrapartum care',
      org: 'NICE',
      url: 'https://www.nice.org.uk/guidance/ng235',
    },
    {
      label: 'Recommendations on intrapartum care for a positive childbirth experience (2018)',
      org: 'WHO',
      url: 'https://www.who.int/publications/i/item/9789241550215',
    },
    {
      label: 'Evidence on birthing positions and pelvic mobility',
      org: 'Evidence Based Birth',
      url: 'https://evidencebasedbirth.com',
    },
  ],
}

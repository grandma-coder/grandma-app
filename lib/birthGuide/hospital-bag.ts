import type { BirthTopic } from '../birthGuideData'
import { hospitalBagChecklist } from '../birthData'

function bagItems(category: string): string[] {
  const found = hospitalBagChecklist.find((c) => c.category === category)
  if (!found) throw new Error(`hospitalBagChecklist missing category "${category}"`)
  return found.items
}

export const HOSPITAL_BAG_TOPIC: BirthTopic = {
  key: 'hospital-bag',
  emoji: '🧳',
  title: 'Hospital Bag Checklist',
  subtitle: 'For mom, baby & partner',
  heroColor: '#E8F8F8',
  heroBorder: '#B7E5E5',
  disclaimer:
    'Educational only — what your hospital provides varies by country and facility. Call your maternity unit to confirm before finalizing your bag.',
  sections: [
    {
      title: 'When and how to pack',
      content:
        'Have your bag packed and by the door by 36 weeks — earlier if you have any risk factors for preterm labor, twins, or a history of fast births. The NHS and Tommy\'s both recommend the bag be ready from 32–36 weeks because roughly 1 in 13 babies in the UK arrive before 37 weeks, and you do not want to be folding nursing pads at 3 a.m. with contractions four minutes apart. Tell your partner exactly where the bag lives, and put a copy of your maternity notes (or a photo of your hospital wristband info) inside it.',
      subsections: [
        {
          title: 'The two-bag system',
          content:
            'Most experienced midwives recommend splitting your kit in two. A small "labor bag" goes into the birth room with you — drinks, lip balm, phone, hair tie, the things you need in the next twelve hours. A larger "postpartum bag" stays in the car or with your partner and only comes upstairs once you are moved to the recovery ward. This stops the labor room from looking like a yard sale and means your partner is not rummaging through pajamas while you are trying to push.',
          bullets: [
            'Labor bag: small tote — comfort items, snacks, phone, charger, lip balm, hair tie, water bottle',
            'Postpartum bag: bigger duffel — pajamas, toiletries, going-home outfits, baby clothes',
            'Keep the car seat already installed and base-checked from week 36 — do not pack it loose',
          ],
        },
        {
          title: 'Where it lives',
          content:
            'By the front door, not in the loft. If you are planning a home birth or birth-center birth, still pack the bag — roughly 1 in 10 planned home births in low-risk first-time mothers transfers to hospital, usually for slow progress rather than emergency, per NICE data referenced by NCT. You will be glad it is ready. Put it in the boot of the car from 38 weeks if you commute or travel.',
        },
      ],
      callout: {
        variant: 'urgent',
        title: 'If your waters break before 37 weeks',
        text: 'Do not finish packing — go to the hospital straight away with whatever you have. Preterm rupture of membranes needs assessment within hours, not after a tidy-up. The hospital can lend you anything you forget.',
      },
    },
    {
      title: 'For Mom',
      content:
        'The bulk of your bag is yours, because you will be in the hospital longest and your needs change in stages — laboring body, postpartum body, going-home body. Below is the curated checklist; the subsections expand on what each grouping is actually for, plus the small tips that come from a thousand "wish I had packed that" stories.',
      bullets: bagItems('For Mom'),
      subsections: [
        {
          title: 'Clothing — labor and after',
          content:
            'You will likely labor in a hospital gown (it ties at the back for easy monitoring and epidural access), but many people prefer their own loose nightgown or oversized button-up shirt — front-opening is critical for skin-to-skin in the hour after birth, and later for breastfeeding. Pack dark colors. There will be blood, sweat, amniotic fluid, and meconium, and you do not want your favorite pale linen ruined.',
          bullets: [
            'Two front-opening nightgowns or button-down shirts in dark colors',
            'Robe — for shuffling to the bathroom and for visitors',
            'Slippers with grippy soles (hospital floors are slick) and warm socks for transition',
            'Going-home outfit one size up from pre-pregnancy — your bump shrinks but slowly',
            'Avoid: jeans, anything with a tight waistband, white anything',
          ],
        },
        {
          title: 'Toiletries — feel-human kit',
          content:
            'Hospital lighting is unkind, the air is dry, and you will be photographed approximately 400 times in 48 hours. None of this matters medically, but a small toiletry kit makes a long stay survivable. Travel sizes only — you are not moving in.',
          bullets: [
            'Lip balm (gas and air dries lips brutally), face wipes, dry shampoo, hair ties, hairband',
            'Toothbrush, toothpaste, deodorant, your own shampoo and shower gel in travel bottles',
            'Glasses if you wear contacts — you cannot wear lenses with an epidural',
            'Flip-flops for the shower — communal bathrooms on postnatal wards',
          ],
        },
        {
          title: 'Postpartum supplies',
          content:
            'Hospitals provide some postpartum supplies but rarely enough, and the brands are basic. Pack maternity pads (the thick, long ones — not regular sanitary pads, which are not absorbent enough for lochia in the first 48 hours). Disposable mesh underwear is genuinely life-changing in the first few days; many hospitals provide them but bring your own pack of 8–10 in case they run out.',
          bullets: [
            'Maternity pads — two packs minimum',
            'Disposable mesh or cheap cotton briefs you can throw away (size up)',
            'Nursing bra (no underwire) and washable nursing pads',
            'Nipple cream — lanolin or a hydrogel patch — even if you are not sure about breastfeeding',
            'Peri bottle if your hospital does not provide one (US hospitals usually do; UK often do not)',
          ],
        },
        {
          title: 'Comfort and labor tools',
          content:
            'Long labors are boring as much as they are painful. Pack things that bring your nervous system down: your own pillow (in a colored pillowcase so it does not get mixed up with hospital linen), a portable speaker for music, a hair tie, lip balm, snacks for the early phase when you can still eat. ACOG\'s 2017 opinion on low-intervention labor explicitly endorses oral fluids and light snacks for low-risk laboring people — bring them.',
          bullets: [
            'Your own pillow (colored pillowcase!) — hospital pillows are flat and few',
            'Phone, long charging cable (the sockets are never near the bed), portable battery',
            'Snacks: dates, energy balls, crackers, electrolyte drinks, honey sticks',
            'Massage tool, tennis ball, or rolling pin for back labor',
            'Eye mask and earplugs — postnatal wards never sleep',
          ],
        },
      ],
      callout: {
        variant: 'tip',
        title: 'The dark towel trick',
        text: 'Pack one dark-colored bath towel from home. The disposable hospital pads under you are functional but small; a dark towel makes you feel less like a clinical case and the blood does not show. Throw it away after.',
      },
    },
    {
      title: 'For Baby',
      content:
        'Babies need surprisingly little in hospital. Most facilities provide diapers, wipes, blankets, hats, and even the first onesie in many countries. What you pack is mostly the going-home outfit and the photogenic blanket for those first pictures. The one non-negotiable is the car seat — US hospitals will not discharge you without one, and UK hospitals strongly recommend it.',
      bullets: bagItems('For Baby'),
      subsections: [
        {
          title: 'The going-home outfit — pack two sizes',
          content:
            'Bring both a newborn and a 0–3 month outfit. Roughly 1 in 8 babies are above 4 kg at birth, and the cute newborn knit you bought may not button. Choose something easy: a sleepsuit (footed onesie) with a front zip beats anything that goes over the head. Add a hat, scratch mittens, and a weather-appropriate layer — but no padded snowsuits in the car seat (more on that below).',
          bullets: [
            'Two sleepsuits in different sizes (newborn + 0–3m)',
            'Two vests / bodysuits',
            'A soft hat — newborns lose heat through their heads',
            'Scratch mittens (optional — many tuck hands inside long sleeves)',
            'A muslin or two — for spit-up, sun shade, modesty, everything',
          ],
        },
        {
          title: 'Car seat fit — the rules',
          content:
            'Per AAP guidance, the car seat must be rear-facing, harness straps at or below the shoulders, chest clip at armpit level, and you should not be able to pinch any slack at the shoulder strap. Critically: no thick coats or padded snowsuits between baby and harness — they compress in a crash and create dangerous slack. Use a thin layer plus a blanket draped over the harness instead. Practice the install before week 38; many fire stations and police stations will check it for free.',
        },
      ],
      callout: {
        variant: 'tip',
        title: 'Skip the cute outfit for the birth photo',
        text: 'Babies cry, poop, and spit up within the first hour. Save the special outfit for the going-home photo and dress them in a hospital-provided plain sleepsuit for those first messy hours.',
      },
    },
    {
      title: 'For Partner',
      content:
        'The partner bag is the most-forgotten bag. Your support person is going to be in the hospital for 12 to 48 hours, often without leaving, often without proper food, often sleeping on a chair that converts into a slightly-less-comfortable chair. NCT specifically calls out that partner exhaustion and hunger are a real factor in support quality — pack for them, too.',
      bullets: bagItems('For Partner'),
      subsections: [
        {
          title: 'Survival kit',
          content:
            'Hospital cafeterias close. Vending machines run out. Your partner will not want to leave you for the 90 minutes a hot meal takes. Pack like they are going on a long flight: substantial snacks, a refillable water bottle, a phone charger that is not the one charging your phone, and a small cushion or rolled-up hoodie to use as a pillow on the recliner chair.',
          bullets: [
            'Two changes of clothes — labor is messy and 24 hours is long',
            'Toothbrush, deodorant, contact lens case — they will need to feel human too',
            'Their own phone charger with a long cable',
            'Snacks they actually like: protein bars, nuts, sandwiches, fruit, caffeine',
            'A pillow and a thin blanket — partner chairs are notoriously thin',
            'Headphones — for when you are sleeping and they want to scroll',
            'A printed list of who to call/text and in what order',
          ],
        },
      ],
    },
    {
      title: 'Documents and paperwork',
      content:
        'The least exciting part of the bag and the part that, missing, will cause real friction at admission. Put all paperwork in a single labeled folder or ziplock bag at the top of your labor bag so your partner can hand it over while you focus on contractions. In the UK your hand-held maternity notes are the central document; in the US it is your insurance card and photo ID; everywhere it is helpful to have a printed birth plan.',
      bullets: [
        'Photo ID (driving license or passport) for both you and your partner',
        'Insurance card and pre-registration paperwork (US) / maternity notes (UK)',
        'Birth plan — three copies (one for you, one for the midwife, one spare)',
        'Pediatrician contact details and your GP details',
        'Phone number for your doula, lactation consultant, and one trusted family member',
        'A list of current medications and allergies',
        'Hospital parking permit or pre-paid voucher if applicable',
      ],
      callout: {
        variant: 'provider',
        title: 'Share the birth plan early',
        text: 'Hand a copy of your birth plan to your midwife or labor nurse on arrival, and ask for it to be added to your chart. ACOG explicitly encourages written birth preferences as a communication tool — but they only work if the team reads them before the baby is crowning.',
      },
    },
    {
      title: 'What hospitals provide vs what to bring',
      content:
        'This varies dramatically by country and facility — call your unit and ask. As a rough guide: most US hospitals provide diapers, wipes, mesh underwear, peri bottles, witch-hazel pads, formula (if requested), and a swaddle blanket. Most UK NHS hospitals provide far less — you usually need to bring your own maternity pads, breast pads, baby clothes, and sometimes nappies. Birth centers and home-birth midwives provide even less in terms of supplies but are stocked for the birth itself. Confirm with your specific unit at your 36-week appointment.',
      subsections: [
        {
          title: 'Usually provided (confirm with your unit)',
          content:
            'In most hospital labor and postnatal wards, you can expect: hospital gown, bedding, basic toiletry pack on request, ice packs, witch-hazel pads or numbing spray, sanitary pads (basic), a peri bottle (US), a baby blanket and hat for the first hour, paracetamol, and infant formula if you ask. None of this is guaranteed — but most UK and US units stock the essentials.',
        },
        {
          title: 'Almost never provided',
          content:
            'Things you must bring yourself: your own clothes, your phone charger, snacks, going-home outfits for you and baby, the car seat, a properly supportive nursing bra, lip balm, and anything specific you want for comfort (oils, music, massage tools, your pillow). Birth centers in particular run lean — assume you bring everything except the medical supplies.',
        },
        {
          title: 'What NOT to pack',
          content:
            'Resist the urge to pack like you are leaving for a week-long holiday. The bag gets heavier than you think, the room is small, and most of what you pack will not get used. Specifically:',
          bullets: [
            'Candles or anything with an open flame — banned in every hospital, oxygen tanks nearby',
            'Jewelry, watches, expensive electronics beyond your phone — easily lost or in the way',
            'Books and magazines — beautiful intention, you will not read a word',
            'A full makeup kit — lip balm and a hairbrush is the realistic ceiling',
            'Heels, jeans, or anything with a waistband for the going-home outfit',
            'More than three nightgowns — laundry happens at home',
            'Newborn-size disposable diapers in bulk — many newborns skip straight to size 1',
            'A padded snowsuit for the car seat ride home (use a blanket over the harness instead)',
          ],
        },
      ],
      callout: {
        variant: 'tip',
        title: 'Phone the maternity unit',
        text: 'A 5-minute call to your hospital\'s maternity ward at 34 weeks settles 90% of the "do I need to bring this?" questions. They will tell you exactly what they stock, what their visitor rules are, and whether there is a fridge for snacks.',
      },
    },
  ],
  sources: [
    {
      label: 'Packing your bag for labor',
      org: 'NHS',
      url: 'https://www.nhs.uk/pregnancy/labour-and-birth/preparing-for-the-birth/packing-your-bag-for-labour/',
    },
    {
      label: 'Preparing for labor',
      org: 'ACOG',
      url: 'https://www.acog.org/womens-health/faqs/preparing-for-labor',
    },
    {
      label: 'Bringing baby home — bathing & skin care',
      org: 'AAP HealthyChildren.org',
      url: 'https://www.healthychildren.org/English/ages-stages/baby/bathing-skin-care/Pages/default.aspx',
    },
    {
      label: 'Packing your hospital bag',
      org: 'Tommy\'s',
      url: 'https://www.tommys.org/pregnancy-information/giving-birth/labour/packing-your-hospital-bag',
    },
    {
      label: 'What to pack in your hospital bag for labour and after birth',
      org: 'NCT',
      url: 'https://www.nct.org.uk/labour-birth/getting-ready-for-birth/what-pack-your-hospital-bag-for-labour-and-after-birth',
    },
    {
      label: 'Labor and delivery',
      org: 'Mayo Clinic',
      url: 'https://www.mayoclinic.org/healthy-lifestyle/labor-and-delivery',
    },
    {
      label: 'Car Safety Seats: Information for Families',
      org: 'AAP HealthyChildren.org',
      url: 'https://www.healthychildren.org/English/safety-prevention/on-the-go/Pages/Car-Safety-Seats-Information-for-Families.aspx',
    },
  ],
}

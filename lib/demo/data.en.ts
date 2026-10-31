import type { Chip, ChipCfg, DemoData, Goal } from './types'

const MOOD: ChipCfg = { t: 'mood' }
const ok = (name: string, value: string, range: string) => ({ name, value, range, flag: 'ok' as const })
const low = (name: string, value: string, range: string) => ({ name, value, range, flag: 'low' as const })

const preHero = (goal: Goal) =>
  goal === 'ttc'
    ? { label: 'Cycle day', n: '14', em: 'fertile window', row: [{ label: 'Best time to try', value: 'today and tomorrow' }, { label: 'Pregnancy test', value: 'from Nov 13' }], icon: 'heart' as const }
    : { label: 'Cycle day', n: '14', em: 'fertile phase', row: [{ label: 'Next period', value: 'in 14 days' }, { label: 'Average cycle', value: '28 days' }], icon: 'moon' as const }

export const dataEn: DemoData = {
  locale: 'en',
  kids: {
    kenji: { name: 'Kenji', age: '2 years', icon: 'baby', tone: '#CFE1FA', dot: '#4C79CE' },
    lua: { name: 'Lua', age: '5 months', icon: 'baby2', tone: '#FBE3A6', dot: '#F2B705' },
  },
  phases: {
    pre: {
      name: 'Cycle', tone: '#F9CFE0', accent: '#E0709A', icon: 'flower',
      hero: preHero,
      kidHero: null,
      chips: (goal): Chip[] => {
        const base: Chip[] = [
          { id: 'mood' as const, label: 'Mood', icon: 'face3' as const, cfg: MOOD },
          { id: 'flow' as const, label: 'Flow', icon: 'drop' as const, cfg: { t: 'pick' as const, memory: false, options: [{ id: 'none', label: 'None' }, { id: 'light', label: 'Light' }, { id: 'medium', label: 'Medium' }, { id: 'heavy', label: 'Heavy' }] } },
        ]
        return goal === 'ttc'
          ? [...base,
            { id: 'temp' as const, label: 'Temperature', icon: 'thermo' as const, cfg: { t: 'range' as const, min: 35.8, max: 37.6, step: 0.1, v: 36.7, unit: ' °C' } },
            { id: 'ovtest' as const, label: 'Ovulation test', icon: 'otest' as const, cfg: { t: 'pick' as const, memory: false, options: [{ id: 'negative', label: 'Negative' }, { id: 'positive', label: 'Positive' }] } }]
          : [...base,
            { id: 'symptoms' as const, label: 'Symptoms', icon: 'brain' as const, cfg: { t: 'pick' as const, memory: false, options: [{ id: 'cramps', label: 'Cramps' }, { id: 'bloating', label: 'Bloating' }, { id: 'headache', label: 'Headache' }, { id: 'acne', label: 'Acne' }] } },
            { id: 'sleep' as const, label: 'Sleep', icon: 'zz' as const, cfg: { t: 'range' as const, min: 3, max: 12, step: 0.5, v: 7.5, unit: 'h' } }]
      },
      today: [
        { icon: 'thermo', label: 'Temperature', value: '36.7 °C · rising', time: '7:00 AM', kid: null },
        { icon: 'face3', label: 'Mood', value: 'good', time: '9:12 AM', kid: null },
        { icon: 'brain', label: 'Symptoms', value: 'mild cramps', time: '10:40 AM', kid: null },
      ],
      quick: (goal) => goal === 'ttc'
        ? [{ screen: 'reminders', sub: 'Vitamin at 8 AM' }, { screen: 'exams', sub: '2 saved' }, { screen: 'community', sub: 'Trying to conceive' }, { screen: 'memories', sub: '3 moments' }]
        : [{ screen: 'reminders', sub: 'Period in 14 days' }, { screen: 'exams', sub: '2 saved' }, { screen: 'community', sub: 'Cycle and PMS' }, { screen: 'memories', sub: '3 moments' }],
      cal: {
        per: [17, 18, 19, 20, 21], fer: [26, 27, 28, 29, 31], ev: [], star: 30, dots: [17, 19, 22, 24, 26, 28, 29], kd: null,
        legend: [{ color: '#F4A6C9', label: 'period', ring: null }, { color: '#fff', label: 'fertile window', ring: '#1E8A6A' }, { color: '#161513', label: 'logs', ring: null }],
      },
      events: [
        { icon: 'bell', title: 'Blood test', sub: 'fasting for 8h', when: 'Wed, Nov 4 · 7:30 AM', kid: null },
        { icon: 'doc', title: 'Gynecologist', sub: 'bring your logs', when: 'Fri, Nov 13 · 10:00 AM', kid: null },
        { icon: 'moon', title: 'Next period', sub: 'predicted', when: 'Nov 13', kid: null },
      ],
      chans: (goal) => goal === 'ttc'
        ? [{ id: 'ttc', icon: 'heart', title: 'Trying to conceive', kind: 'channel', tone: '#F9CFE0' }, { id: 'irregular', icon: 'owl', title: 'Irregular cycles', kind: 'anon', tone: '#FFF1B8' }, { id: 'afterPositive', icon: 'star', title: 'After the positive', kind: 'channel', tone: '#DCCFF9' }]
        : [{ id: 'cycle', icon: 'flower', title: 'Cycle and PMS', kind: 'channel', tone: '#F9CFE0' }, { id: 'irregular', icon: 'owl', title: 'Irregular cycles', kind: 'anon', tone: '#FFF1B8' }, { id: 'endo', icon: 'drop', title: 'Endometriosis', kind: 'channel', tone: '#DCCFF9' }],
      exams: [
        { title: 'Hormones', date: 'Sep 2026', status: 'ok', read: 'Good ovarian reserve for your age. Thyroid is fine.', vals: [ok('AMH', '2.8 ng/mL', '1.0–4.0'), ok('FSH (day 3)', '6.2 mIU/mL', '3.5–12.5'), ok('TSH', '2.1 mIU/L', '0.4–4.0')] },
        { title: 'Vitamin D', date: 'Aug 2026', status: 'warn', read: 'Your vitamin D is low. A bit more sun helps, and it is worth asking about a supplement.', vals: [low('25-OH vitamin D', '22 ng/mL', '30–100')] },
      ],
      mem: [
        { year: '2026', month: 'Oct', title: 'First full cycle logged', sub: 'you', icon: 'moon', tone: '#F9CFE0', kid: null },
        { year: '2026', month: 'Sep', title: 'Cramps got better with walking', sub: 'you', icon: 'shoe', tone: '#D7F0DD', kid: null },
        { year: '2026', month: 'Jun', title: 'Started really getting to know myself', sub: 'you', icon: 'flower', tone: '#FFF1B8', kid: null },
      ],
    },
    preg: {
      name: 'Pregnant', tone: '#DCCFF9', accent: '#8F5FC6', icon: 'heart',
      hero: null, kidHero: null,
      chips: [
        { id: 'kicks', label: 'Kicks', icon: 'heart', cfg: { t: 'kick' } },
        { id: 'mood', label: 'Mood', icon: 'face3', cfg: MOOD },
        { id: 'sleep', label: 'Sleep', icon: 'zz', cfg: { t: 'range', min: 3, max: 12, step: 0.5, v: 7, unit: 'h' } },
        { id: 'visit', label: 'Appointment', icon: 'doc', cfg: { t: 'pick', memory: false, options: [{ id: 'prenatal', label: 'Prenatal visit' }, { id: 'ultrasound', label: 'Ultrasound' }, { id: 'blood', label: 'Blood test' }, { id: 'other', label: 'Other' }] } },
      ],
      today: [
        { icon: 'heart', label: 'Kicks', value: '12 in 40 min', time: '9:30 AM', kid: null },
        { icon: 'face4', label: 'Mood', value: 'great', time: '11:00 AM', kid: null },
        { icon: 'zz', label: 'Sleep', value: '7h', time: '7:00 AM', kid: null },
      ],
      quick: [{ screen: 'appointments', sub: '8 of 12 done' }, { screen: 'exams', sub: 'anatomy scan ok' }, { screen: 'memories', sub: '4 moments' }, { screen: 'community', sub: 'February moms' }],
      cal: {
        per: [], fer: [], ev: [11], star: null, dots: [2, 5, 9, 12, 16, 19, 22, 23, 26, 29, 30], kd: null,
        legend: [{ color: '#DCCFF9', label: 'appointment', ring: null }, { color: '#161513', label: 'logs', ring: null }],
      },
      events: [
        { icon: 'bell', title: 'Glucose tolerance test', sub: 'week 26', when: 'Wed, Nov 11 · 8:00 AM', kid: null },
        { icon: 'bell', title: '28-week visit', sub: 'with Dr. Lucia', when: 'Fri, Nov 27', kid: null },
        { icon: 'doc', title: 'Anatomy scan', sub: 'all good', when: 'done ✓', kid: null },
      ],
      chans: [
        { id: 'feb', icon: 'heart', title: 'February 2027 moms', kind: 'channel', tone: '#DCCFF9' },
        { id: 'fears', icon: 'owl', title: 'Pregnancy fears', kind: 'anon', tone: '#FFF1B8' },
        { id: 'layette', icon: 'bodysuit', title: 'Baby essentials', kind: 'channel', tone: '#FBE3A6' },
      ],
      exams: [
        { title: 'Anatomy scan', date: 'Oct 2026 · week 22', status: 'ok', read: 'Your baby is growing well and right on track for this week.', vals: [ok('Estimated weight', '510 g', '50th pct'), ok('Heart rate', '148 bpm', '110–160'), ok('Amniotic fluid', 'normal', '')] },
        { title: 'Blood count', date: 'Sep 2026', status: 'warn', read: 'Your hemoglobin is a little low. Worth talking to your doctor about iron.', vals: [low('Hemoglobin', '10.8 g/dL', '11–14'), low('Ferritin', '14 ng/mL', '15–150'), ok('Platelets', '230K', '150–450K')] },
        { title: 'Fasting glucose', date: 'Sep 2026', status: 'ok', read: 'Glucose is normal for pregnancy.', vals: [ok('Glucose', '84 mg/dL', '< 92')] },
      ],
      mem: [
        { year: '2026', month: 'Oct', title: '20-week bump', sub: 'you', icon: 'flower', tone: '#FFF1B8', kid: null },
        { year: '2026', month: 'Sep', title: 'First kick', sub: 'week 19', icon: 'heart', tone: '#F9CFE0', kid: null },
        { year: '2026', month: 'Aug', title: '12-week ultrasound', sub: 'with daddy', icon: 'pola', tone: '#DCCFF9', kid: null },
        { year: '2026', month: 'Jun', title: 'The positive', sub: 'at 6 in the morning', icon: 'star', tone: '#FBE3A6', kid: null },
      ],
    },
    kids: {
      name: 'Kids', tone: '#CFE1FA', accent: '#4C79CE', icon: 'baby',
      hero: null,
      kidHero: {
        kenji: { n: '10h', em: 'of sleep last night', row: [{ label: 'Last meal', value: '12:30 PM' }, { label: 'Next vaccine', value: 'Sun, Nov 8' }] },
        lua: { n: '5', em: 'feeds today', row: [{ label: 'Last feed', value: '1:10 PM · left' }, { label: 'Next vaccine', value: 'Thu, Nov 12' }] },
      },
      chips: [
        { id: 'sleep', label: 'Sleep', icon: 'zz', cfg: { t: 'range', min: 0.5, max: 14, step: 0.5, v: 10, unit: 'h' } },
        { id: 'food', label: 'Food', icon: 'bottle', cfg: { t: 'pick', memory: false, options: [{ id: 'nursing', label: 'Nursing' }, { id: 'puree', label: 'Puree' }, { id: 'fruit', label: 'Fruit' }, { id: 'snack', label: 'Snack' }] } },
        { id: 'diaper', label: 'Diaper', icon: 'diaper', cfg: { t: 'pick', memory: false, options: [{ id: 'pee', label: 'Wet' }, { id: 'poop', label: 'Dirty' }, { id: 'both', label: 'Both' }] } },
        { id: 'milestone', label: 'Milestone', icon: 'star', cfg: { t: 'pick', memory: true, options: [{ id: 'firstStep', label: 'First step' }, { id: 'firstWord', label: 'First word' }, { id: 'firstTooth', label: 'First tooth' }, { id: 'other', label: 'Other' }] } },
      ],
      today: [
        { icon: 'bottle', label: 'Nursing', value: '12 min · left side', time: '1:10 PM', kid: 'lua' },
        { icon: 'bottle', label: 'Food', value: 'pumpkin puree · by the nanny', time: '12:30 PM', kid: 'kenji' },
        { icon: 'zz', label: 'Nap', value: '1h20', time: '10:40 AM', kid: 'lua' },
        { icon: 'diaper', label: 'Diaper', value: 'wet · by the nanny', time: '11:05 AM', kid: 'kenji' },
        { icon: 'zz', label: 'Sleep', value: '10h · night', time: '7:10 AM', kid: 'kenji' },
      ],
      quick: [{ screen: 'vaccines', sub: 'Lua: Nov 12' }, { screen: 'growth', sub: 'Kenji 55th pct' }, { screen: 'care', sub: '4 people' }, { screen: 'village', sub: '4 listings nearby' }],
      cal: {
        per: [], fer: [], ev: [8, 12], star: null, dots: [],
        kd: { kenji: [1, 3, 6, 8, 10, 13, 15, 17, 20, 22, 24, 27, 29, 30], lua: [2, 3, 5, 7, 9, 12, 14, 16, 19, 21, 23, 26, 28, 30] },
        legend: [{ color: '#4C79CE', label: 'Kenji', ring: null }, { color: '#F2B705', label: 'Lua', ring: null }, { color: '#CFE1FA', label: 'vaccine or checkup', ring: '#161513' }],
      },
      events: [
        { icon: 'bell', title: 'Pediatrician', sub: 'routine checkup', when: 'today · 4:00 PM', kid: 'kenji' },
        { icon: 'syringe', title: 'Flu shot', sub: 'CDC schedule', when: 'Sun, Nov 8', kid: 'kenji' },
        { icon: 'syringe', title: 'DTaP, 6-month dose', sub: 'CDC schedule', when: 'Thu, Nov 12', kid: 'lua' },
        { icon: 'house', title: 'Nanny: Ana', sub: 'both kids · Mon to Fri', when: '8 AM to 5 PM', kid: null },
      ],
      chans: [
        { id: 'babySleep', icon: 'zz', title: 'Baby sleep', kind: 'channel', tone: '#CFE1FA' },
        { id: 'solids', icon: 'bottle', title: 'Starting solids', kind: 'channel', tone: '#D7F0DD' },
        { id: 'momsOfTwo', icon: 'baby2', title: 'Moms of two', kind: 'channel', tone: '#FBE3A6' },
        { id: 'exhaustion', icon: 'owl', title: 'Exhaustion', kind: 'anon', tone: '#FFF1B8' },
      ],
      exams: [
        { title: 'Blood count · Kenji', date: 'Sep 2026', status: 'ok', read: 'Everything is where it should be for his age. Iron looks good.', vals: [ok('Hemoglobin', '12.1 g/dL', '11–14'), ok('White blood cells', '8,200 /µL', '6,000–17,500'), ok('Ferritin', '32 ng/mL', '12–140')] },
        { title: 'Hip ultrasound · Lua', date: 'Jun 2026', status: 'ok', read: 'Both hips look normal.', vals: [ok('Alpha angle (R)', '64°', '≥ 60°'), ok('Alpha angle (L)', '63°', '≥ 60°')] },
      ],
      mem: [
        { year: '2026', month: 'Oct', title: 'First day at daycare', sub: 'Kenji · 2 years', icon: 'backpack', tone: '#CFE1FA', kid: 'kenji' },
        { year: '2026', month: 'Sep', title: 'Rolled over on her own!', sub: 'Lua · 4 months', icon: 'star', tone: '#FBE3A6', kid: 'lua' },
        { year: '2026', month: 'Aug', title: 'First real smile', sub: 'Lua · 2 months', icon: 'baby2', tone: '#F9CFE0', kid: 'lua' },
        { year: '2026', month: 'Jun', title: 'Lua arrived', sub: '3.2 kg · 2:05 PM', icon: 'heart', tone: '#FBE3A6', kid: 'lua' },
        { year: '2025', month: 'Nov', title: 'First step', sub: 'Kenji · 13 months', icon: 'shoe', tone: '#F9CFE0', kid: 'kenji' },
        { year: '2025', month: 'Sep', title: 'First word: “nana”', sub: 'Kenji · 11 months', icon: 'bubble', tone: '#CFE1FA', kid: 'kenji' },
        { year: '2025', month: 'May', title: 'First tooth', sub: 'Kenji · 7 months', icon: 'star', tone: '#D7F0DD', kid: 'kenji' },
      ],
    },
    meno: {
      name: 'Menopause', tone: '#FBD3B3', accent: '#D9672A', icon: 'flame',
      hero: { label: 'This week', n: '3', em: 'hot flashes', row: [{ label: 'Last week', value: '5' }, { label: 'Average sleep', value: '6h40' }], icon: 'flame' },
      kidHero: null,
      chips: [
        { id: 'heat', label: 'Hot flashes', icon: 'flame', cfg: { t: 'range', min: 1, max: 5, step: 1, v: 3, unit: ' of 5' } },
        { id: 'sleep', label: 'Sleep', icon: 'zz', cfg: { t: 'range', min: 3, max: 10, step: 0.5, v: 6.5, unit: 'h' } },
        { id: 'mood', label: 'Mood', icon: 'face3', cfg: MOOD },
        { id: 'fog', label: 'Brain fog', icon: 'brain', cfg: { t: 'pick', memory: false, options: [{ id: 'mild', label: 'Mild' }, { id: 'medium', label: 'Medium' }, { id: 'strong', label: 'Strong' }] } },
      ],
      today: [
        { icon: 'flame', label: 'Hot flashes', value: 'intensity 3 of 5', time: '10:20 AM', kid: null },
        { icon: 'zz', label: 'Sleep', value: '6h30', time: '7:00 AM', kid: null },
      ],
      quick: [{ screen: 'reminders', sub: 'Walk at 6 PM' }, { screen: 'community', sub: 'Hot flashes' }, { screen: 'exams', sub: 'bone scan ok' }, { screen: 'memories', sub: '3 moments' }],
      cal: {
        per: [], fer: [], ev: [12], star: null, dots: [2, 4, 7, 9, 11, 14, 16, 18, 21, 23, 25, 28, 30], kd: null,
        legend: [{ color: '#FBD3B3', label: 'appointment', ring: null }, { color: '#161513', label: 'symptoms logged', ring: null }],
      },
      events: [
        { icon: 'doc', title: 'Gynecologist', sub: 'bring the weekly summary', when: 'Thu, Nov 12 · 9:00 AM', kid: null },
        { icon: 'bell', title: 'Bone density scan', sub: 'to schedule', when: 'Dec', kid: null },
      ],
      chans: [
        { id: 'hotFlashes', icon: 'flame', title: 'Hot flashes', kind: 'anon', tone: '#FBD3B3' },
        { id: 'menoSleep', icon: 'zz', title: 'Sleep in menopause', kind: 'channel', tone: '#DCCFF9' },
        { id: 'running', icon: 'shoe', title: 'Starting to run', kind: 'channel', tone: '#D7F0DD' },
      ],
      exams: [
        { title: 'Bone density scan', date: 'Jul 2026', status: 'ok', read: 'Your bones look good for your age.', vals: [ok('Spine (T-score)', '-0.8', '> -1.0'), ok('Hip (T-score)', '-0.5', '> -1.0')] },
        { title: 'Hormones', date: 'Sep 2026', status: 'ok', read: 'A high FSH confirms the transition. That is what we expect at this stage.', vals: [ok('FSH', '48 mIU/mL', 'post-menopause'), ok('Estradiol', '18 pg/mL', '')] },
        { title: 'Vitamin D', date: 'Sep 2026', status: 'warn', read: 'Your vitamin D is low. Worth asking about a supplement.', vals: [low('25-OH vitamin D', '24 ng/mL', '30–100')] },
      ],
      mem: [
        { year: '2026', month: 'Oct', title: 'First week with only 3 hot flashes', sub: 'you', icon: 'flame', tone: '#FBD3B3', kid: null },
        { year: '2026', month: 'Sep', title: 'First 5 km', sub: 'you', icon: 'shoe', tone: '#D7F0DD', kid: null },
        { year: '2026', month: 'Mar', title: 'My 50th birthday', sub: 'with the girls', icon: 'star', tone: '#FFF1B8', kid: null },
      ],
    },
  },
  weeks: [
    { week: 8, name: 'a raspberry', icon: 'rasp', len: '1.6 cm', wt: '1 g' },
    { week: 12, name: 'a plum', icon: 'plum', len: '5.4 cm', wt: '14 g' },
    { week: 16, name: 'an avocado', icon: 'avocado', len: '18.6 cm', wt: '100 g' },
    { week: 20, name: 'a banana', icon: 'banana', len: '25.7 cm', wt: '300 g' },
    { week: 24, name: 'an ear of corn', icon: 'corn', len: '30 cm', wt: '600 g' },
    { week: 28, name: 'an eggplant', icon: 'eggplant', len: '38 cm', wt: '1 kg' },
    { week: 32, name: 'a jicama', icon: 'jicama', len: '42 cm', wt: '1.7 kg' },
    { week: 36, name: 'a head of romaine lettuce', icon: 'lettuce', len: '47 cm', wt: '2.6 kg' },
    { week: 40, name: 'a pumpkin', icon: 'pumpkin', len: '51 cm', wt: '3.5 kg' },
  ],
  msgs: {
    babySleep: [
      { icon: 'owl', who: 'Anonymous owl', text: 'Anyone else with a 5-month-old waking every 2 hours? I am a zombie.', likes: 6 },
      { icon: 'face4', who: 'Carol · Theo’s mom', text: 'We hit the 4-month sleep regression. It passed in about 3 weeks, I promise.', likes: 9 },
      { icon: 'eye', who: 'Dr. Marina · pediatrician', text: 'A nap routine really helps at this stage. Want me to post a sample?', likes: 14 },
    ],
    solids: [
      { icon: 'face3', who: 'Jess · Bea’s mom', text: 'First puree today! She made a face at the pumpkin 😂', likes: 4 },
      { icon: 'owl', who: 'Anonymous owl', text: 'Totally normal! Sometimes it takes 10 tries.', likes: 7 },
    ],
    momsOfTwo: [
      { icon: 'face4', who: 'Rae · Peter and Ana', text: 'How do you split your attention when both are crying at once?', likes: 3 },
      { icon: 'face3', who: 'Lena · mom of 2', text: 'I help whoever is hungry and keep talking to the other one. Doesn’t always work 😅', likes: 8 },
    ],
    exhaustion: [
      { icon: 'face3', who: 'Community', text: 'Welcome! Tell us how you’re doing.', likes: 3 },
    ],
    feb: [
      { icon: 'face4', who: 'Bea · 24 weeks', text: 'Who else feels kicks in the middle of the night?', likes: 11 },
      { icon: 'face3', who: 'Nina · 23 weeks', text: 'Me!! It feels like he wakes up when I lie down.', likes: 6 },
      { icon: 'eye', who: 'Nurse Paula', text: 'Very common: when you stop moving, you notice the movements more.', likes: 15 },
    ],
    fears: [
      { icon: 'owl', who: 'Anonymous owl', text: 'I’m scared of giving birth and I can’t talk about it with anyone.', likes: 22 },
      { icon: 'owl', who: 'Anonymous seagull', text: 'Same here. I made a birth plan with my doctor and it calmed me down a lot.', likes: 17 },
    ],
    layette: [
      { icon: 'face3', who: 'Community', text: 'Welcome! Tell us how you’re doing.', likes: 3 },
    ],
    cycle: [
      { icon: 'face3', who: 'Bea · 29', text: 'Does anyone else get migraines with PMS? I started tracking and it’s always around day 26.', likes: 14 },
      { icon: 'owl', who: 'Anonymous owl', text: 'Yes! Tracking helped me show the pattern to my doctor.', likes: 11 },
    ],
    endo: [
      { icon: 'face4', who: 'Rae', text: 'Diagnosed after 7 years of cramps. Anyone else?', likes: 22 },
      { icon: 'owl', who: 'Anonymous owl', text: 'Mine took 9. You are not alone.', likes: 19 },
    ],
    ttc: [
      { icon: 'face3', who: 'Mia · cycle 7', text: 'Tested this morning… negative again. On to the next one.', likes: 18 },
      { icon: 'owl', who: 'Anonymous owl', text: 'Sending a hug. Mine took 9 cycles, don’t give up ❤', likes: 25 },
    ],
    irregular: [
      { icon: 'face3', who: 'Community', text: 'Welcome! Tell us how you’re doing.', likes: 3 },
    ],
    afterPositive: [
      { icon: 'face3', who: 'Community', text: 'Welcome! Tell us how you’re doing.', likes: 3 },
    ],
    hotFlashes: [
      { icon: 'owl', who: 'Anonymous owl', text: 'Cutting coffee after lunch changed my nights.', likes: 12 },
      { icon: 'face4', who: 'Sonia · 52', text: 'Desk fan at work. No shame whatsoever 😂', likes: 9 },
    ],
    menoSleep: [
      { icon: 'face3', who: 'Community', text: 'Welcome! Tell us how you’re doing.', likes: 3 },
    ],
    running: [
      { icon: 'face3', who: 'Community', text: 'Welcome! Tell us how you’re doing.', likes: 3 },
    ],
  },
  replies: ['I get it, so much. Same here 💛', 'Thank you for sharing this.', 'Hang in there! You’re not alone.'],
  village: [
    { icon: 'stroller', tone: '#F9CFE0', rot: -6, title: 'Stroller', who: { icon: 'face4', name: 'Carol', place: 'Riverside · 1.2 km' }, price: '$45', kind: 'sell', badge: '#FFF1B8', likes: 12, comments: [{ name: 'Jess', text: 'Is this still available?' }, { name: 'Carol', text: 'It is! You can pick it up Saturday.' }] },
    { icon: 'crib', tone: '#CFE1FA', rot: 4, title: 'Travel crib', who: { icon: 'face3', name: 'Rae', place: 'Old Town · 2 km' }, price: 'Free', kind: 'free', badge: '#D7F0DD', likes: 31, comments: [{ name: 'Mia', text: 'What a lovely thing to do ❤' }] },
    { icon: 'bodysuit', tone: '#FBE3A6', rot: -3, title: '6 bodysuits · 3–6 months', who: { icon: 'baby2', name: 'Lena', place: 'Hillcrest · 3 km' }, price: 'Swap', kind: 'swap', badge: '#DCCFF9', likes: 8, comments: [{ name: 'Bea', text: 'I’ll swap for 6–9 months!' }] },
    { icon: 'books', tone: '#D7F0DD', rot: 5, title: 'Bath books', who: { icon: 'owl', name: 'Nina', place: 'Elm Park · 4 km' }, price: '$8', kind: 'sell', badge: '#FFF1B8', likes: 5, comments: [] },
  ],
  growth: {
    kenji: {
      xs: [0, 6, 12, 18, 24], xl: ['0', '6m', '12m', '18m', '2y'],
      weight: { p3: [2.5, 6.4, 7.8, 8.9, 10.0], p50: [3.3, 7.9, 9.6, 10.9, 12.2], p97: [4.3, 9.7, 11.8, 13.5, 15.1], me: [3.4, 7.8, 9.9, 11.2, 12.4], u: 'kg', p: 'p55' },
      height: { p3: [46.3, 63.6, 71.3, 77.2, 81.4], p50: [49.9, 67.6, 75.7, 82.3, 87.1], p97: [53.4, 71.6, 80.2, 87.7, 93.2], me: [50, 67, 76, 82, 86], u: 'cm', p: 'p40' },
      head: { p3: [32.1, 41.0, 43.6, 44.9, 45.8], p50: [34.5, 43.3, 46.1, 47.4, 48.3], p97: [36.9, 45.6, 48.6, 49.9, 50.8], me: [35, 43.5, 46, 47.5, 48.4], u: 'cm', p: 'p52' },
    },
    lua: {
      xs: [0, 1, 2, 3, 4, 5], xl: ['0', '1m', '2m', '3m', '4m', '5m'],
      weight: { p3: [2.4, 3.2, 3.9, 4.5, 5.0, 5.4], p50: [3.2, 4.2, 5.1, 5.8, 6.4, 6.9], p97: [4.2, 5.5, 6.6, 7.5, 8.2, 8.8], me: [3.2, 4.3, 5.2, 5.9, 6.5, 7.0], u: 'kg', p: 'p55' },
      height: { p3: [45.6, 50.0, 53.2, 55.8, 58.0, 59.9], p50: [49.1, 53.7, 57.1, 59.8, 62.1, 64.0], p97: [52.7, 57.4, 60.9, 63.8, 66.2, 68.2], me: [49, 54, 57.5, 60, 62.5, 64], u: 'cm', p: 'p50' },
      head: { p3: [31.7, 34.3, 36.0, 37.2, 38.2, 39.0], p50: [33.9, 36.5, 38.3, 39.5, 40.6, 41.5], p97: [36.1, 38.8, 40.5, 41.9, 43.0, 43.9], me: [34, 36.6, 38.4, 39.7, 40.8, 41.6], u: 'cm', p: 'p53' },
    },
  },
  vax: {
    kenji: [
      { name: 'Hep B', when: 'at birth', done: true },
      { name: 'DTaP', when: '2, 4 and 6 months', done: true },
      { name: 'MMR', when: '12 months', done: true },
      { name: 'DTaP booster', when: '15–18 months', done: true },
      { name: 'Flu shot', when: 'Sun, Nov 8', done: false },
    ],
    lua: [
      { name: 'Hep B', when: 'at birth', done: true },
      { name: 'Rotavirus', when: '2 and 4 months', done: true },
      { name: 'DTaP', when: '2 and 4 months', done: true },
      { name: 'Pneumococcal', when: '2 and 4 months', done: true },
      { name: 'DTaP', when: 'Thu, Nov 12', done: false },
    ],
  },
  optIcons: {
    'flow:none': ['leaf'], 'flow:light': ['drop'], 'flow:medium': ['drop', 'drop'], 'flow:heavy': ['drop', 'drop', 'drop'],
    'symptoms:cramps': ['flame'], 'symptoms:bloating': ['cloud'], 'symptoms:headache': ['brain'], 'symptoms:acne': ['star'],
    'ovtest:negative': ['otest'], 'ovtest:positive': ['otest', 'heart'],
    'visit:prenatal': ['bell'], 'visit:ultrasound': ['pola'], 'visit:blood': ['syringe'], 'visit:other': ['doc'],
    'food:nursing': ['bottle'], 'food:puree': ['pumpkin'], 'food:fruit': ['banana'], 'food:snack': ['avocado'],
    'diaper:pee': ['diaper', 'drop'], 'diaper:poop': ['diaper'], 'diaper:both': ['diaper', 'star'],
    'milestone:firstStep': ['shoe'], 'milestone:firstWord': ['bubble'], 'milestone:firstTooth': ['star'], 'milestone:other': ['pola'],
    'fog:mild': ['brain'], 'fog:medium': ['brain', 'brain'], 'fog:strong': ['brain', 'brain', 'brain'],
  },
  rangeVis: { sleep: { icon: 'zz', how: 'grow' }, heat: { icon: 'flame', how: 'count' }, temp: { icon: 'thermo', how: 'grow' } },
  feats: [
    { icon: 'moon', title: 'Cycle', desc: 'Your cycle, symptoms and predictions. And your fertile window, if you ever want to try.', action: { mode: 'pre' } },
    { icon: 'heart', title: 'Pregnancy', desc: 'Week by week, kicks and every appointment.', action: { mode: 'preg' } },
    { icon: 'baby', title: 'Kids', desc: 'Sleep, food, diapers and milestones for each child.', action: { mode: 'kids' } },
    { icon: 'flame', title: 'Menopause', desc: 'Symptoms week by week, to understand what is changing.', action: { mode: 'meno' } },
    { icon: 'syringe', title: 'Vaccines', desc: 'Your country’s schedule, with a heads-up before each dose.', action: { screen: 'vaccines' } },
    { icon: 'pola', title: 'Memories', desc: 'First step, first word, with a photo and a date.', action: { screen: 'memories' } },
    { icon: 'house', title: 'Care circle', desc: 'Partner, grandma and nanny log along with you. Everyone sees only what you share.', action: { screen: 'care' } },
    { icon: 'stroller', title: 'Village', desc: 'What no longer fits becomes another family’s stroller.', action: { screen: 'village' } },
    { icon: 'bubble', title: 'Community', desc: 'Channels for every phase and anonymous circles.', action: { screen: 'community' } },
    { icon: 'doc', title: 'For the pediatrician', desc: 'Growth, vaccines and allergies on one page, ready for the visit.', action: { screen: 'pediatric' } },
    { icon: 'ruler', title: 'Growth', desc: 'Weight and height with percentiles.', action: { screen: 'growth' } },
    { icon: 'lock', title: 'Privacy', desc: 'PIN and Face ID. Export or delete everything whenever you want.', action: { screen: 'privacy' } },
  ],
  cyc: {
    per: { icon: 'drop', name: 'Period', what: 'bleeding' },
    fol: { icon: 'leaf', name: 'Follicular', what: 'energy rising' },
    ovu: { icon: 'egg', name: 'Ovulation', what: 'fertile window' },
    lut: { icon: 'moon2', name: 'Luteal', what: 'progesterone' },
  },
  demoDate: { year: 2026, month: 10, day: 30 },
  ui: {
    user: 'Amara',
    dateLocale: 'en-US',
    decimal: '.',
    all: 'All',
    back: 'Back',
    close: 'Close',
    save: 'Save',
    send: 'Send',
    you: 'You',
    home: {
      hello: 'Hi, {name}.',
      nudgeTitle: 'This is just a taste.',
      nudgeSub: 'Tap here and save your spot on the list.',
      goalTrack: 'Just tracking',
      goalTtc: 'Trying to conceive',
      registerToday: 'Log today',
      tapSign: 'tap a sign',
      today: 'Today',
      records: '{n} logs',
      quickAccess: 'Quick access',
      pregTiles: { daysValue: '112', daysLabel: 'days to go', kicksLabel: 'kicks today', visitValue: 'Nov 27', visitLabel: 'next visit' },
    },
    size: {
      here: 'Week 24 · you are here',
      week: 'Week {w}',
      sizeOf: 'About the size of {name}',
      length: 'length',
      weight: 'weight',
      factHere: 'The inner ear is ready: your baby can already hear your heartbeat and your voice.',
      weeksAgo: '{n} weeks ago.',
      weeksAhead: '{n} weeks from now.',
      sliderAria: 'Pregnancy week',
    },
    cycle: { day: 'DAY', todayPrefix: 'today · ', dayAria: 'Day {d}' },
    weekdays: { mondayFirst: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], sundayFirst: ['S', 'M', 'T', 'W', 'T', 'F', 'S'] },
    agenda: { title: 'Agenda', next: 'Coming up', shared: 'shared', today: 'Today', states: { period: 'period', fertile: 'fertile window', event: 'appointment', today: 'today' } },
    week: { title: 'Your week' },
    profile: {
      title: 'Profile', kids: 'Kids', add: 'Add', network: 'Your circle', people: '4 people', kidsSuffix: ' · Kenji and Lua',
      items: [
        { screen: 'care', icon: 'house', title: 'Care circle' },
        { screen: 'exams', icon: 'doc', title: 'Test results' },
        { screen: 'privacy', icon: 'lock', title: 'Privacy' },
        { screen: 'reminders', icon: 'bell', title: 'Reminders' },
        { screen: 'memories', icon: 'pola', title: 'Memories' },
      ],
    },
    tabs: { home: 'Home', agenda: 'Agenda', shortcuts: 'Shortcuts', week: 'Week', profile: 'Profile' },
    shortcuts: {
      title: 'Shortcuts',
      items: [
        { screen: 'memories', icon: 'pola', title: 'Memories' },
        { screen: 'vaccines', icon: 'syringe', title: 'Vaccines' },
        { screen: 'care', icon: 'house', title: 'Circle' },
        { screen: 'village', icon: 'stroller', title: 'Village' },
        { screen: 'community', icon: 'bubble', title: 'Community' },
        { screen: 'exams', icon: 'doc', title: 'Results' },
      ],
    },
    register: { title: 'Log today' },
    log: {
      title: 'Log {label}',
      howAreYou: 'How are you feeling?',
      faces: [{ icon: 'face1', label: 'low' }, { icon: 'face2', label: 'okay' }, { icon: 'face3', label: 'good' }, { icon: 'face4', label: 'great' }],
      kickHint: 'Tap for every kick. Goal: 10 in 2 hours.',
      kicks: 'kicks',
      notePlaceholder: 'Want to add a note? (optional)',
      savedToMemories: 'saved to memories',
      saved: 'Logged!',
      milestoneSaved: 'Saved!',
      newMemory: 'A moment from today',
      today: 'today',
    },
    charts: {
      baseline: 'coverline', ovulation: 'ovulation?',
      cycleTitle: 'Your cycle', tapDay: 'tap a day', bbtTitle: 'Basal temperature', bbtSub: '°C · cycle day', moodTitle: 'Mood this week', moodSub: '7 days',
      kicksTitle: 'Kicks per day', kicksSub: 'each ♡ = 2 kicks', weightTitle: 'Weight gain', weightSub: 'kg · recommended range', weekAbbr: 'wk {w}',
      trailTitle: 'So far', trailSub: 'weeks',
      pregTiles: { gainValue: '+6.2 kg', gainLabel: 'since the start', visitsValue: '8 of 12', visitsLabel: 'visits', sleepValue: '7h10', sleepLabel: 'average sleep' },
      nightsTitle: 'Nights', nightsSub: '6 PM → 8 AM', nightsAxis: ['6 PM', '10 PM', '2 AM', '6 AM', '8 AM'],
      kenjiLegend: 'Kenji · avg 10h40', luaLegend: 'Lua · wakes 2x',
      plateTitle: 'Kenji’s plate', plateSub: 'this week',
      plate: [{ label: 'Protein', pct: 28, tone: '#F4A6C9' }, { label: 'Veggies', pct: 24, tone: '#9ED8B0' }, { label: 'Fruit', pct: 22, tone: '#F9C846' }, { label: 'Carbs', pct: 26, tone: '#CFE1FA' }],
      proteinTitle: 'Protein this week', proteinPct: 86, proteinSub: '86% of goal', proteinNote: 'Adding up what the nanny and you logged.',
      feedsTitle: 'Lua’s feeds', feedsSub: 'per day', seeGrowth: 'See full growth',
      heatTitle: 'When they show up', heatSub: 'this week', heatSlots: ['morning', 'afternoon', 'evening', 'night'], heatNote: 'Mostly afternoons and nights. Worth bringing to your visit.',
      trendTitle: 'Hot flashes per week', trendSub: '6 weeks', trendWeek: 'W{n}',
      menoTiles: { sleepValue: '4 of 7', sleepLabel: 'nights slept well', fogValue: '2 days', fogLabel: 'with brain fog', dropValue: '−66%', dropLabel: 'flashes since W1' },
    },
    screens: {
      vaccines: { title: 'Vaccines', icon: 'syringe', note: 'The CDC schedule for each child. We’ll remind you before every dose.' },
      memories: { title: 'Memories', icon: 'pola', note: 'All the firsts, in order. One day it all goes to whoever comes next.', newMemory: 'New memory', saved: 'Saved!' },
      care: {
        title: 'Care circle', icon: 'house', note: 'Everyone sees only what you share.',
        circle: { you: 'You', partner: 'Partner', grandma: 'Grandma', sitter: 'Nanny' },
        access: { partner: 'everything', grandma: 'photos and milestones', sitter: 'logs the day' },
        memoFrom: 'Nanny · 12:30 PM', memo: 'Kenji ate everything and asked for more. Lua nursed and slept 1h20.',
      },
      village: {
        title: 'Village', icon: 'stroller',
        filters: { all: 'All', sell: 'For sale', swap: 'Swap', free: 'Free' },
        kinds: { sell: 'For sale', free: 'Free', swap: 'Swap' },
        buy: 'Buy', want: 'I want it', commentPlaceholder: 'Comment…', commentAria: 'Comment', send: 'Send', likeAria: 'Like', commentsAria: 'Comments',
        requestSent: 'Request sent!', messageSent: 'Message sent!',
      },
      community: {
        title: 'Community', icon: 'bubble', note: 'Channels for every phase and circles where nobody knows who you are.',
        kinds: { channel: 'channel', anon: 'anonymous' },
        noteAnon: 'Anonymous circle: here you show up as Anonymous owl.',
        noteOpen: 'Open channel, with verified professionals.',
        composerPlaceholder: 'Write to the community…', composerAria: 'Message', likeMsgAria: 'Like message', typing: 'someone is typing…',
        meAnon: 'Anonymous owl (you)', me: 'You',
        replyAnon: { icon: 'owl', who: 'Anonymous seagull' }, replyOpen: { icon: 'face4', who: 'Carol · Theo’s mom' },
      },
      exams: {
        title: 'Test results', icon: 'doc', note: 'Snap a photo of your results and grandma reads, explains and files them. All in one place to show your doctor.',
        normal: 'normal', attention: 'attention', add: 'Add a result',
        kept: 'saved in Test results', readBy: 'Grandma read it for you', low: 'low', share: 'Share with your doctor', original: 'See original',
        addNote: 'Take a photo of your result. Grandma reads it, explains it and files it.', takePhoto: 'Take photo', reading: 'Reading your result…', done: 'Read and saved!',
        newExam: { title: 'Today’s result', date: 'today', status: 'ok', read: 'I read it and filed it. Everything looks as expected.', vals: [ok('Glucose', '86 mg/dL', '< 99'), ok('Total cholesterol', '168 mg/dL', '< 190')] },
      },
      appointments: {
        title: 'Appointments', icon: 'bell', note: 'All of prenatal care, week by week.',
        items: [{ name: 'First visit', when: 'done', done: true }, { name: 'Anatomy scan', when: 'done', done: true }, { name: 'Glucose tolerance test', when: 'week 26', done: false }, { name: '28-week visit', when: 'week 28', done: false }],
      },
      reminders: {
        title: 'Reminders', icon: 'bell', note: 'Grandma remembers for you.',
        items: [{ name: 'Take vitamin', when: '8:00 AM' }, { name: 'Log temperature', when: '7:00 AM' }, { name: 'Appointment', when: 'Thu, 2:00 PM' }],
      },
      pediatric: {
        title: 'For the pediatrician', icon: 'doc', note: 'One page, ready to take to the visit.',
        items: {
          kenji: [{ label: 'Weight', value: '12.4 kg · 55th pct' }, { label: 'Height', value: '86 cm · 40th pct' }, { label: 'Vaccines', value: 'up to date' }, { label: 'Allergies', value: 'none' }, { label: 'Average sleep', value: '10h' }],
          lua: [{ label: 'Weight', value: '7.0 kg · 55th pct' }, { label: 'Height', value: '64 cm · 50th pct' }, { label: 'Vaccines', value: 'up to date' }, { label: 'Feeds', value: '7 a day' }, { label: 'Sleep', value: '14h a day' }],
        },
      },
      growth: {
        title: 'Growth', icon: 'ruler',
        tabs: { weight: 'Weight', height: 'Height', head: 'Head' },
        chartTitles: { weight: 'Weight', height: 'Height', head: 'Head circumference' },
        curve: 'WHO curve', now: 'now', percentile: 'percentile', nextMeasure: 'next measurement',
        next: { kenji: 'today', lua: 'Nov 12' },
        milestones: 'Milestones',
        milestoneItems: {
          kenji: [{ icon: 'shoe', label: 'Walked', when: '13 months' }, { icon: 'bubble', label: 'First words', when: '11 months' }, { icon: 'star', label: 'First tooth', when: '7 months' }],
          lua: [{ icon: 'star', label: 'Rolled over', when: '4 months' }, { icon: 'baby2', label: 'Social smile', when: '2 months' }],
        },
      },
      privacy: {
        title: 'Privacy', icon: 'lock', note: 'Your data is yours.',
        items: [{ label: 'PIN and Face ID', value: 'on' }, { label: 'Nothing is sold', value: 'ever' }, { label: 'Export everything', value: 'any time' }, { label: 'Delete your account', value: 'for real' }],
      },
    },
  },
}

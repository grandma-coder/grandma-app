export type BirthStickerKind =
  | 'leaf' | 'cross' | 'heart' | 'drop'   // existing brand stickers
  | 'vaginal' | 'csection' | 'water'      // purpose-built per-type illustrations

export interface BirthType {
  id: string
  title: string
  icon: string
  sticker: BirthStickerKind
  description: string
  pros: string[]
  cons: string[]
  whatToExpect: string
}

export const birthTypes: BirthType[] = [
  {
    id: 'natural',
    title: 'Natural Birth',
    icon: '🌿',
    sticker: 'vaginal',
    description: 'Vaginal delivery without medical interventions like epidurals or induction.',
    pros: [
      'Faster recovery time',
      'Immediate skin-to-skin contact',
      'Lower risk of surgical complications',
      'Baby receives beneficial bacteria from birth canal',
    ],
    cons: [
      'Can be very painful without pain management',
      'Labor duration is unpredictable',
      'May require emergency intervention if complications arise',
    ],
    whatToExpect: 'Labor typically progresses through three stages: early labor, active labor, and delivery. You\'ll feel contractions that gradually get stronger and closer together.',
  },
  {
    id: 'c-section',
    title: 'C-Section',
    icon: '🏥',
    sticker: 'csection',
    description: 'Surgical delivery through an incision in the abdomen and uterus.',
    pros: [
      'Planned scheduling reduces uncertainty',
      'Necessary and life-saving in certain situations',
      'No vaginal tearing',
    ],
    cons: [
      'Longer recovery (4-6 weeks)',
      'Higher risk of infection',
      'May affect future pregnancies',
      'Initial breastfeeding may be more challenging',
    ],
    whatToExpect: 'You\'ll receive regional anesthesia (spinal or epidural). The surgery takes about 45 minutes. You\'ll be awake and can usually hold your baby shortly after.',
  },
  {
    id: 'home-birth',
    title: 'Home Birth',
    icon: '🏡',
    sticker: 'heart',
    description: 'Giving birth at home with a certified midwife, in a familiar environment.',
    pros: [
      'Comfortable, familiar environment',
      'Freedom to move and choose positions',
      'No unnecessary medical interventions',
      'Personalized one-on-one care',
    ],
    cons: [
      'Limited access to emergency equipment',
      'Not recommended for high-risk pregnancies',
      'May need hospital transfer if complications arise',
    ],
    whatToExpect: 'Your midwife will monitor you throughout labor. You\'ll have freedom to labor in water, walk around, and choose your birth position. A transfer plan should always be in place.',
  },
  {
    id: 'water-birth',
    title: 'Water Birth',
    icon: '🌊',
    sticker: 'water',
    description: 'Laboring and/or delivering in a warm water pool for natural pain relief.',
    pros: [
      'Warm water provides natural pain relief',
      'More relaxed labor experience',
      'Easier movement between positions',
      'Gentle transition for baby',
    ],
    cons: [
      'Not available at all facilities',
      'Risk of infection if water isn\'t properly maintained',
      'May need to exit pool for complications',
    ],
    // CLINICAL-REVIEW: pending sign-off — NICE NG235/RCOG: pool must not exceed 37.5°C (99.5°F).
    whatToExpect: 'You\'ll enter the birth pool when labor is well established (usually 5+ cm dilated). The water temperature is kept at body temperature, not above 99.5°F (37.5°C). You may deliver in or out of the water.',
  },
]

export interface HospitalBagItem { id: string; text: string }
export interface HospitalBagSection { id: string; category: string; items: HospitalBagItem[] }

// Item ids are STABLE (persisted as the checked state) — never rename one. `text`/`category` are the
// English source; the page shows the bundled translation (lib/pregnancyContent, keys birth_bag_*).
export const hospitalBagChecklist: HospitalBagSection[] = [
  { id: 'mom', category: 'For Mom', items: [
    { id: 'mom_id', text: 'Photo ID and insurance card' },
    { id: 'mom_plans', text: 'Birth plan copies' },
    { id: 'mom_robe', text: 'Comfortable robe or nightgown' },
    { id: 'mom_slippers', text: 'Slippers and warm socks' },
    { id: 'mom_nursing', text: 'Nursing bra and pads' },
    { id: 'mom_toiletries', text: 'Toiletries and lip balm' },
    { id: 'mom_charger', text: 'Phone charger (long cable!)' },
    { id: 'mom_snacks', text: 'Snacks and water bottle' },
    { id: 'mom_outfit', text: 'Going-home outfit (maternity size)' },
    { id: 'mom_pillow', text: 'Pillow from home' },
  ]},
  { id: 'baby', category: 'For Baby', items: [
    { id: 'baby_outfit', text: 'Going-home outfit (newborn + 0-3m)' },
    { id: 'baby_blanket', text: 'Receiving blanket' },
    { id: 'baby_carseat', text: 'Car seat (installed!)' },
    { id: 'baby_diapers', text: 'Diapers and wipes (hospital provides, but just in case)' },
    { id: 'baby_hat', text: 'Baby hat' },
  ]},
  { id: 'partner', category: 'For Partner', items: [
    { id: 'partner_clothes', text: 'Change of clothes' },
    { id: 'partner_snacks', text: 'Snacks and drinks' },
    { id: 'partner_charger', text: 'Camera or phone charger' },
    { id: 'partner_entertainment', text: 'Entertainment for long labor' },
    { id: 'partner_pillow', text: 'Pillow and blanket' },
  ]},
]

/**
 * Checked state is persisted as `{ [itemId]: true }`. Older builds stored `"<English category>::<English
 * item text>"` keys — read those too (mapped to the id) so nobody loses their ticks.
 */
export function normalizeBagState(raw: unknown): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  if (!raw || typeof raw !== 'object') return out
  const legacy = new Map<string, string>()
  const ids = new Set<string>()
  for (const sec of hospitalBagChecklist) {
    for (const it of sec.items) {
      legacy.set(`${sec.category}::${it.text}`, it.id)
      ids.add(it.id)
    }
  }
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v !== true) continue
    const id = ids.has(k) ? k : legacy.get(k)
    if (id) out[id] = true
  }
  return out
}

export type BirthStickerKind = 'leaf' | 'cross' | 'heart' | 'drop'

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
    sticker: 'leaf',
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
    sticker: 'cross',
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
    sticker: 'drop',
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
    whatToExpect: 'You\'ll enter the birth pool when labor is well established (usually 5+ cm dilated). The water temperature is kept around 97-100°F. You may deliver in or out of the water.',
  },
]

export const hospitalBagChecklist = [
  { category: 'For Mom', items: [
    'Photo ID and insurance card',
    'Birth plan copies',
    'Comfortable robe or nightgown',
    'Slippers and warm socks',
    'Nursing bra and pads',
    'Toiletries and lip balm',
    'Phone charger (long cable!)',
    'Snacks and water bottle',
    'Going-home outfit (maternity size)',
    'Pillow from home',
  ]},
  { category: 'For Baby', items: [
    'Going-home outfit (newborn + 0-3m)',
    'Receiving blanket',
    'Car seat (installed!)',
    'Diapers and wipes (hospital provides, but just in case)',
    'Baby hat',
  ]},
  { category: 'For Partner', items: [
    'Change of clothes',
    'Snacks and drinks',
    'Camera or phone charger',
    'Entertainment for long labor',
    'Pillow and blanket',
  ]},
]

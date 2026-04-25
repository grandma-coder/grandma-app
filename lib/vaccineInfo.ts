/**
 * Curated info for the most common vaccines across all country schedules.
 * Used by the VaccineInfoModal to explain each vaccine to parents.
 *
 * Lookup is fuzzy: matches the first word of the schedule's vaccine name
 * (lowercased) against keys here. Multi-language entries (Hepatite, Hépatite,
 * Hepatitis) all collapse to the same English key via the alias map.
 */

export interface VaccineInfo {
  /** One-line "what it protects against" summary. */
  protects: string
  /** 2–3 sentence explanation of why it matters. */
  why: string
  /** Brief mention of common mild side-effects. */
  sideEffects?: string
}

const VACCINE_INFO: Record<string, VaccineInfo> = {
  hepatitisb: {
    protects: 'Hepatitis B — a serious liver infection that can be passed from mother to baby.',
    why: 'The first dose at birth protects against infection at the most vulnerable moment. The full series gives near-lifelong protection against liver damage and liver cancer caused by hep B.',
    sideEffects: 'Mild soreness at the injection site or low fever for a day or two.',
  },
  hepatitisa: {
    protects: 'Hepatitis A — a virus that inflames the liver, spread through contaminated food and water.',
    why: 'Most kids who catch Hep A get sick for weeks. The vaccine gives near-complete protection and is especially important before travel.',
    sideEffects: 'Soreness at the site, occasional headache or low appetite.',
  },
  dtap: {
    protects: 'Diphtheria, Tetanus, and Pertussis (whooping cough).',
    why: 'Whooping cough can stop a baby from breathing. Tetanus and diphtheria are rare but life-threatening when they strike. The combined vaccine builds strong, durable immunity to all three.',
    sideEffects: 'Fussiness, mild fever, or redness/swelling at the site for 1–3 days.',
  },
  dtp: {
    protects: 'Diphtheria, Tetanus, and Pertussis (whooping cough) — the older whole-cell formulation used in some countries.',
    why: 'Same diseases as DTaP. Whooping cough in particular is dangerous for infants, often causing severe coughing fits and breathing pauses.',
    sideEffects: 'Fever, fussiness, soreness — slightly more common than with DTaP.',
  },
  ipv: {
    protects: 'Polio (poliovirus) — a virus that can cause permanent paralysis.',
    why: 'Polio is rare today thanks to global vaccination, but it still exists. Continued vaccination keeps it from making a comeback and protects your child wherever they travel.',
    sideEffects: 'Mild redness or soreness at the injection site.',
  },
  oral: {
    protects: 'Polio — given as oral drops in some countries.',
    why: 'Oral polio gives rapid gut immunity that helps stop community spread. Used together with IPV in many regions.',
    sideEffects: 'Very rarely mild stomach upset.',
  },
  hib: {
    protects: 'Haemophilus influenzae type B — bacteria that can cause meningitis, pneumonia, and severe throat infection in young children.',
    why: 'Before the vaccine, Hib was a leading cause of bacterial meningitis in babies. Today it is rare in vaccinated populations.',
    sideEffects: 'Mild redness at the site, occasional low fever.',
  },
  mmr: {
    protects: 'Measles, Mumps, and Rubella.',
    why: 'Measles spreads extremely easily and can cause pneumonia and brain swelling. Rubella is dangerous in pregnancy. Two doses give near-complete lifelong protection.',
    sideEffects: 'Mild fever or rash 7–12 days after the dose, lasting a couple of days.',
  },
  vaspr: {
    protects: 'Measles, Mumps, and Rubella (Portuguese name for MMR).',
    why: 'Same protection as MMR. Two doses give durable immunity to all three diseases.',
    sideEffects: 'Mild fever or faint rash a week or two after the dose.',
  },
  ror: {
    protects: 'Measles, Mumps, and Rubella (French name for MMR).',
    why: 'Same protection as MMR. Two doses are enough for lifelong immunity in most children.',
    sideEffects: 'Mild fever or faint rash a week or two later.',
  },
  srp: {
    protects: 'Measles, Mumps, and Rubella (Spanish name for MMR).',
    why: 'Same protection as MMR. Two doses give lifelong immunity.',
    sideEffects: 'Mild fever or faint rash a week or two later.',
  },
  triplice: {
    protects: 'Measles, Mumps, and Rubella (Brazilian "Tríplice Viral").',
    why: 'Same protection as MMR. Two doses give durable lifelong immunity.',
    sideEffects: 'Mild fever or rash 7–12 days after the dose.',
  },
  varicella: {
    protects: 'Chickenpox (varicella-zoster virus).',
    why: 'Chickenpox is usually mild but can cause skin infections, pneumonia, and rare brain complications. The vaccine prevents most cases and reduces severity in breakthroughs.',
    sideEffects: 'Soreness at the site, occasional mild rash a week or two later.',
  },
  varicela: {
    protects: 'Chickenpox (Spanish/Portuguese name for varicella).',
    why: 'Chickenpox can cause skin infections and rare complications. The vaccine prevents most cases.',
    sideEffects: 'Soreness at the site, occasional mild rash later.',
  },
  varizellen: {
    protects: 'Chickenpox (German name for varicella).',
    why: 'Chickenpox can cause skin infections and rare complications. The vaccine prevents most cases.',
    sideEffects: 'Soreness at the site, occasional mild rash later.',
  },
  pcv13: {
    protects: 'Pneumococcal disease — bacteria that cause pneumonia, ear infection, and meningitis.',
    why: 'Pneumococcal infections used to be a major cause of severe illness in young kids. The vaccine targets the most dangerous strains.',
    sideEffects: 'Soreness, mild fever, or fussiness for a day.',
  },
  pcv15: {
    protects: 'Pneumococcal disease — newer 15-strain version of PCV.',
    why: 'Same family as PCV13 with two extra strains for broader protection against pneumonia, ear infections, and meningitis.',
    sideEffects: 'Soreness, mild fever, or fussiness for a day.',
  },
  pneumococcal: {
    protects: 'Pneumococcal disease — bacteria that cause pneumonia, ear infection, and meningitis.',
    why: 'Pneumococcal infections were a major cause of severe illness in young kids. The vaccine targets the most dangerous strains.',
    sideEffects: 'Soreness, mild fever, or fussiness for a day.',
  },
  rotavirus: {
    protects: 'Rotavirus — the most common cause of severe diarrhea and dehydration in babies.',
    why: 'Before the vaccine, almost every child caught rotavirus and many ended up in hospital from dehydration. Given as oral drops, it is very effective.',
    sideEffects: 'Occasional mild diarrhea or fussiness in the days after a dose.',
  },
  influenza: {
    protects: 'Seasonal flu (influenza viruses).',
    why: 'Flu hits young children hard and can lead to pneumonia or hospitalization. The vaccine is given each year because the virus mutates.',
    sideEffects: 'Soreness, mild fever, or runny nose (with the nasal-spray version).',
  },
  flu: {
    protects: 'Seasonal flu (influenza viruses) — nasal-spray version.',
    why: 'Flu hits young children hard. The annual nasal-spray vaccine gives strong protection and is easy to give.',
    sideEffects: 'Mild runny nose, low-grade fever, or sore throat.',
  },
  bcg: {
    protects: 'Tuberculosis (TB) — primarily severe TB in young children.',
    why: 'In countries where TB is common, BCG at birth protects against the most dangerous forms of childhood TB (meningitis, disseminated disease).',
    sideEffects: 'A small bump or scar at the injection site that takes weeks to heal — this is normal.',
  },
  menc: {
    protects: 'Meningococcal disease (group C) — bacteria that cause meningitis and blood infection.',
    why: 'Meningococcal infections progress fast and can be fatal within hours. The vaccine is highly effective.',
    sideEffects: 'Soreness at the site, occasional mild fever.',
  },
  menb: {
    protects: 'Meningococcal disease (group B).',
    why: 'Group B is the most common cause of meningococcal disease in young children in many countries. The vaccine reduces this risk significantly.',
    sideEffects: 'Fever, soreness, and fussiness more common than with most vaccines — pediatricians often recommend infant paracetamol around the dose.',
  },
  menacwy: {
    protects: 'Meningococcal disease (groups A, C, W, and Y).',
    why: 'Covers the four most common meningococcal serogroups outside group B. Important for adolescents heading into shared-living settings.',
    sideEffects: 'Soreness at the site, mild headache or tiredness.',
  },
  meningococcal: {
    protects: 'Meningococcal disease — bacteria that cause meningitis and severe blood infection.',
    why: 'Meningococcal infections progress fast and can be fatal within hours. The vaccine prevents the most dangerous strains.',
    sideEffects: 'Soreness at the site, occasional mild fever.',
  },
  meningococica: {
    protects: 'Meningococcal disease — bacteria that cause meningitis and blood infection.',
    why: 'Meningococcal infections progress fast and can be fatal within hours. The vaccine prevents the most dangerous strains.',
    sideEffects: 'Soreness at the site, occasional mild fever.',
  },
  measles: {
    protects: 'Measles — and often combined with rubella.',
    why: 'Measles spreads extremely easily and can cause pneumonia and brain swelling. Vaccination is the best protection.',
    sideEffects: 'Mild fever or rash 7–12 days after the dose.',
  },
  pentavalente: {
    protects: 'Diphtheria, Tetanus, Pertussis, Hep B, and Hib — five diseases in one shot.',
    why: 'Combines multiple critical infant vaccines into a single dose. Same protection, fewer needles.',
    sideEffects: 'Fussiness, mild fever, soreness at the site for 1–3 days.',
  },
  hexavalente: {
    protects: 'Diphtheria, Tetanus, Pertussis, Polio, Hep B, and Hib — six diseases in one shot.',
    why: 'A single dose covers six critical infant infections. Streamlines the schedule and reduces injections.',
    sideEffects: 'Fussiness, mild fever, soreness at the site.',
  },
  hepatite: {
    protects: 'Hepatitis B (Portuguese name) — a serious liver infection.',
    why: 'The first dose at birth protects against infection at the most vulnerable moment. Full series gives lasting protection.',
    sideEffects: 'Mild soreness or low-grade fever for a day or two.',
  },
  hepatite_b: {
    protects: 'Hepatitis B — a serious liver infection that can be passed from mother to baby.',
    why: 'The first dose at birth protects against infection at the most vulnerable moment. Full series gives lasting protection.',
    sideEffects: 'Mild soreness or low-grade fever for a day or two.',
  },
  hepatite_a: {
    protects: 'Hepatitis A — a virus that inflames the liver, spread through contaminated food and water.',
    why: 'Most kids who catch Hep A get sick for weeks. The vaccine gives near-complete protection.',
    sideEffects: 'Soreness at the site, occasional headache or low appetite.',
  },
  hépatite: {
    protects: 'Hepatitis B (French) — a serious liver infection that can be passed from mother to baby.',
    why: 'The first dose at birth protects against infection at the most vulnerable moment. Full series gives lasting protection.',
    sideEffects: 'Mild soreness or low-grade fever for a day or two.',
  },
  rotavírus: {
    protects: 'Rotavirus (Portuguese name) — the most common cause of severe diarrhea and dehydration in babies.',
    why: 'Before the vaccine, almost every child caught rotavirus and many ended up in hospital from dehydration. Given as oral drops.',
    sideEffects: 'Occasional mild diarrhea or fussiness after a dose.',
  },
  neumocócica: {
    protects: 'Pneumococcal disease (Spanish name) — pneumonia, ear infection, meningitis.',
    why: 'Pneumococcal infections were a major cause of severe illness in young kids. The vaccine targets the most dangerous strains.',
    sideEffects: 'Soreness, mild fever, or fussiness for a day.',
  },
  pneumocócica: {
    protects: 'Pneumococcal disease (Portuguese name) — pneumonia, ear infection, meningitis.',
    why: 'Pneumococcal infections were a major cause of severe illness in young kids. The vaccine targets the most dangerous strains.',
    sideEffects: 'Soreness, mild fever, or fussiness for a day.',
  },
  pneumocoque: {
    protects: 'Pneumococcal disease (French name) — pneumonia, ear infection, meningitis.',
    why: 'Pneumococcal infections used to be a major cause of severe illness. The vaccine targets the most dangerous strains.',
    sideEffects: 'Soreness, mild fever, or fussiness for a day.',
  },
  '6-in-1': {
    protects: 'Diphtheria, Tetanus, Pertussis, Polio, Hib, and Hep B — six diseases in one shot.',
    why: 'A single combined vaccine covers six critical infant infections, reducing injections and simplifying the schedule.',
    sideEffects: 'Fussiness, mild fever, soreness at the site.',
  },
  '4-in-1': {
    protects: 'Diphtheria, Tetanus, Pertussis, and Polio — pre-school booster.',
    why: 'A booster combining four vaccines, given before school age to top up protection through childhood.',
    sideEffects: 'Soreness at the site, occasional mild fever.',
  },
  fiebre: {
    protects: 'Yellow fever — a mosquito-borne virus.',
    why: 'Yellow fever is endemic in parts of Africa and South America. A single dose gives long-lasting protection.',
    sideEffects: 'Mild soreness, headache, or low fever a few days later.',
  },
  febre: {
    protects: 'Yellow fever (Portuguese name).',
    why: 'Yellow fever is endemic in parts of Africa and South America. A single dose gives long-lasting protection.',
    sideEffects: 'Mild soreness, headache, or low fever a few days later.',
  },
  japanese: {
    protects: 'Japanese Encephalitis — a mosquito-borne virus that can cause brain inflammation.',
    why: 'Endemic in parts of Asia. The vaccine is essential before travel and recommended for residents in affected regions.',
    sideEffects: 'Soreness at the site, occasional headache or fever.',
  },
  vitamin: {
    protects: 'Not a vaccine — vitamin A supplementation given alongside immunizations in some countries.',
    why: 'Vitamin A supports immune function and eye development. WHO recommends supplementation in regions with high deficiency.',
  },
}

const ALIASES: Record<string, string> = {
  // Variants of "Hepatitis B" / "Hepatite B" / "Hépatite B"
  'hep': 'hepatitisb',
  // Acronym-only forms
  'srp': 'srp',
  'vaspr': 'vaspr',
  'ror': 'ror',
  // German/French chickenpox
  'varizellen': 'varizellen',
  'varicela': 'varicela',
  'varicella': 'varicella',
}

/** Resolve a vaccine info entry from the schedule's display name (e.g. "Hepatitis B"). */
export function getVaccineInfo(scheduleName: string): VaccineInfo | null {
  const lower = scheduleName.toLowerCase().trim()
  const firstWord = lower.split(/[\s/]/)[0]

  // Hep A vs Hep B disambiguation
  if (firstWord.startsWith('hepat') || firstWord.startsWith('hépat')) {
    if (lower.includes(' a')) return VACCINE_INFO.hepatitisa
    return VACCINE_INFO.hepatitisb
  }
  // 6-in-1 / 4-in-1 / Hexavalente / Pentavalente
  if (lower.includes('6-in-1') || lower.includes('hexa')) return VACCINE_INFO.hexavalente
  if (lower.includes('4-in-1')) return VACCINE_INFO['4-in-1']
  if (firstWord === 'pentavalente') return VACCINE_INFO.pentavalente
  // Pneumo family
  if (firstWord.startsWith('pcv') || firstWord.includes('pneumo') || firstWord.includes('neumo')) {
    if (firstWord === 'pcv15') return VACCINE_INFO.pcv15
    if (firstWord === 'pcv13') return VACCINE_INFO.pcv13
    return VACCINE_INFO.pneumococcal
  }
  // Mening family
  if (firstWord.startsWith('men') || firstWord.startsWith('méning') || firstWord.startsWith('mening')) {
    if (lower.includes('acwy')) return VACCINE_INFO.menacwy
    if (lower.includes('b')) return VACCINE_INFO.menb
    if (lower.includes('c')) return VACCINE_INFO.menc
    return VACCINE_INFO.meningococcal
  }
  // Yellow fever
  if (firstWord.startsWith('fiebre') || firstWord.startsWith('febre')) return VACCINE_INFO.fiebre

  // Direct first-word match
  if (VACCINE_INFO[firstWord]) return VACCINE_INFO[firstWord]
  if (ALIASES[firstWord]) return VACCINE_INFO[ALIASES[firstWord]] ?? null

  return null
}

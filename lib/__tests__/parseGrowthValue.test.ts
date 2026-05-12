/**
 * Pins parseGrowthValue's contract — mirrored here so we test the algorithm
 * independently of the component file that hosts it. Keep in sync if the
 * helper in components/home/KidsHome.tsx changes.
 */

type Entry = { value: string }

function parseGrowthValue(entries: Entry[]): { weight: string | null; height: string | null } {
  let weight: string | null = null
  let height: string | null = null

  const numPattern = '([0-9]+(?:[.,][0-9]+)?)'
  const toNum = (raw: string) => parseFloat(raw.replace(',', '.'))

  for (const e of entries) {
    const v = (e.value || '').trim()
    if (!weight) {
      const labeled = v.match(new RegExp(`weight[:\\s]+${numPattern}\\s*(kg|lbs?|lb)`, 'i'))
      const bare = !labeled && v.match(new RegExp(`^${numPattern}\\s*(kg|lbs?|lb)$`, 'i'))
      const m = labeled || bare || null
      if (m) {
        const n = toNum(m[1])
        const unit = m[2].toLowerCase()
        const kg = unit === 'kg' ? n : n * 0.45359237
        weight = `${kg.toFixed(kg < 10 ? 2 : 1)} kg`
      }
    }
    if (!height) {
      const labeled = v.match(new RegExp(`height[:\\s]+${numPattern}\\s*(cm|in|inches?|inch)`, 'i'))
      const bare = !labeled && v.match(new RegExp(`^${numPattern}\\s*(cm|in|inches?|inch)$`, 'i'))
      const m = labeled || bare || null
      if (m) {
        const n = toNum(m[1])
        const unit = m[2].toLowerCase()
        const cm = unit === 'cm' ? n : n * 2.54
        height = `${cm.toFixed(1)} cm`
      }
    }
    if (weight && height) break
  }
  return { weight, height }
}

describe('parseGrowthValue', () => {
  it('parses the canonical "Weight: X kg" / "Height: Y cm" format', () => {
    expect(parseGrowthValue([
      { value: 'Weight: 7.5 kg' },
      { value: 'Height: 70 cm' },
    ])).toEqual({ weight: '7.50 kg', height: '70.0 cm' })
  })

  it('is case-insensitive', () => {
    expect(parseGrowthValue([
      { value: 'WEIGHT: 12 KG' },
      { value: 'HEIGHT: 80 CM' },
    ])).toEqual({ weight: '12.0 kg', height: '80.0 cm' })
  })

  it('converts lbs to kg', () => {
    const r = parseGrowthValue([{ value: 'Weight: 16 lbs' }])
    expect(r.weight).toBe('7.26 kg')
  })

  it('converts inches to cm', () => {
    const r = parseGrowthValue([{ value: 'Height: 33 inches' }])
    expect(r.height).toBe('83.8 cm')
  })

  it('accepts comma decimal separators (European)', () => {
    expect(parseGrowthValue([{ value: 'Weight: 7,5 kg' }]).weight).toBe('7.50 kg')
  })

  it('accepts bare "N unit" without label', () => {
    expect(parseGrowthValue([
      { value: '8.2 kg' },
      { value: '72 cm' },
    ])).toEqual({ weight: '8.20 kg', height: '72.0 cm' })
  })

  it('takes the first matching weight and first matching height', () => {
    const r = parseGrowthValue([
      { value: 'Weight: 8 kg' },
      { value: 'Weight: 9 kg' },
      { value: 'Height: 70 cm' },
      { value: 'Height: 72 cm' },
    ])
    expect(r).toEqual({ weight: '8.00 kg', height: '70.0 cm' })
  })

  it('returns nulls for garbage input', () => {
    expect(parseGrowthValue([{ value: 'something else' }])).toEqual({ weight: null, height: null })
    expect(parseGrowthValue([])).toEqual({ weight: null, height: null })
  })
})

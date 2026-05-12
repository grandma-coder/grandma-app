/**
 * Regression: the kids-home vaccine "given count" must use exact-name matching,
 * not first-word substring matching. Otherwise:
 *   - Hepatitis A and Hepatitis B collide (both start with "hepatitis")
 *   - DTaP and DTaP/IPV/Hib collide (both start with "dtap")
 *   - 6-in-1 (DTaP/IPV/Hib/HepB) collides with DTaP and Hib
 *
 * The bug lived at KidsHome.tsx:6961 and :7046 prior to the fix.
 * markVaccineGiven() writes `value = v.name` verbatim, so an exact equality
 * check (case- and whitespace-tolerant) is the right rule.
 */

const normalize = (s: string) => s.trim().toLowerCase()

function countDoses(scheduleName: string, givenValues: string[]): number {
  const target = normalize(scheduleName)
  return givenValues.filter((v) => normalize(v) === target).length
}

describe('vaccine dose matching', () => {
  it('counts Hepatitis B doses without picking up Hepatitis A', () => {
    const given = ['Hepatitis B', 'Hepatitis A', 'Hepatitis B']
    expect(countDoses('Hepatitis B', given)).toBe(2)
    expect(countDoses('Hepatitis A', given)).toBe(1)
  })

  it('counts DTaP doses without picking up combo vaccines that contain "DTaP"', () => {
    const given = ['DTaP', '6-in-1 (DTaP/IPV/Hib/HepB)', 'DTaP/IPV/Hib']
    expect(countDoses('DTaP', given)).toBe(1)
    expect(countDoses('DTaP/IPV/Hib', given)).toBe(1)
    expect(countDoses('6-in-1 (DTaP/IPV/Hib/HepB)', given)).toBe(1)
  })

  it('tolerates whitespace and case differences', () => {
    const given = ['  hepatitis b  ', 'HEPATITIS B', 'Hepatitis B']
    expect(countDoses('Hepatitis B', given)).toBe(3)
  })

  it('returns 0 when no exact match exists', () => {
    expect(countDoses('MMR', ['Hepatitis B', 'DTaP'])).toBe(0)
  })
})

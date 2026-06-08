/**
 * Mirrors memberLabel() in components/connections/ChannelsScreen.tsx, which
 * softens low/zero member counts so seeded + brand-new channels don't read as
 * empty ("0 members" → "Be the first"). Kept in sync by hand because the
 * source lives inside a React component file that pulls in React Native.
 */

function memberLabel(n: number): string {
  if (n <= 0) return '✨ Be the first'
  if (n < 5) return `New · ${n} here`
  return `${n} members`
}

describe('memberLabel', () => {
  it('invites the first member when the count is zero', () => {
    expect(memberLabel(0)).toBe('✨ Be the first')
  })

  it('treats negative counts as zero (defensive)', () => {
    expect(memberLabel(-3)).toBe('✨ Be the first')
  })

  it('shows a "New" label for a small but non-zero count', () => {
    expect(memberLabel(1)).toBe('New · 1 here')
    expect(memberLabel(4)).toBe('New · 4 here')
  })

  it('switches to the plain count at the boundary (5)', () => {
    expect(memberLabel(5)).toBe('5 members')
  })

  it('shows the real count for established channels', () => {
    expect(memberLabel(346)).toBe('346 members')
  })
})

/**
 * Mirrors the optimistic reaction toggle in app/channel/[id].tsx::handleReaction.
 * The key invariant: reaction_count is clamped at 0 so a double-tap race (two
 * toggles resolving against a count already at 0) can never render "-1 ❤".
 */

interface Reaction {
  user_reacted: boolean
  reaction_count: number
}

function applyToggle(m: Reaction): Reaction {
  const react = !m.user_reacted
  const delta = m.user_reacted ? -1 : 1
  return { user_reacted: react, reaction_count: Math.max(0, m.reaction_count + delta) }
}

describe('reaction toggle math', () => {
  it('adds a reaction from the un-reacted state', () => {
    expect(applyToggle({ user_reacted: false, reaction_count: 0 })).toEqual({
      user_reacted: true,
      reaction_count: 1,
    })
  })

  it('removes a reaction from the reacted state', () => {
    expect(applyToggle({ user_reacted: true, reaction_count: 1 })).toEqual({
      user_reacted: false,
      reaction_count: 0,
    })
  })

  it('never goes below zero even if the count is already 0 while reacted', () => {
    // Pathological race state: reacted=true but count already 0.
    expect(applyToggle({ user_reacted: true, reaction_count: 0 })).toEqual({
      user_reacted: false,
      reaction_count: 0,
    })
  })

  it('is its own inverse over two toggles (back to start)', () => {
    const start = { user_reacted: false, reaction_count: 4 }
    expect(applyToggle(applyToggle(start))).toEqual(start)
  })
})

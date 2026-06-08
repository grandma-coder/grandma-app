/**
 * Mirrors the message-merge run on focus-return in app/channel/[id].tsx.
 * When the user comes back from the thread screen we re-fetch messages and
 * merge: refresh reply_count from the server, keep any optimistic local
 * additions not yet in the fetch, and append genuinely-new server messages.
 *
 * The merge must NOT drop a locally-sent message that the server fetch hasn't
 * caught up to yet, and must NOT duplicate a message present on both sides.
 */

interface Msg {
  id: string
  content: string
  reply_count: number
}

function mergeMessages(prev: Msg[], fresh: Msg[]): Msg[] {
  const freshMap = new Map(fresh.map((m) => [m.id, m]))
  const merged = prev.map((m) => {
    const f = freshMap.get(m.id)
    return f ? { ...m, reply_count: f.reply_count } : m
  })
  for (const f of fresh) {
    if (!merged.some((m) => m.id === f.id)) merged.push(f)
  }
  return merged
}

const msg = (id: string, reply_count = 0, content = id): Msg => ({ id, content, reply_count })

describe('mergeMessages (focus-return refresh)', () => {
  it('updates reply_count from the fresh data without reordering', () => {
    const prev = [msg('a', 0), msg('b', 1)]
    const fresh = [msg('a', 3), msg('b', 1)]
    const out = mergeMessages(prev, fresh)
    expect(out.map((m) => m.id)).toEqual(['a', 'b'])
    expect(out.find((m) => m.id === 'a')!.reply_count).toBe(3)
  })

  it('keeps an optimistic local message that the fetch has not caught up to', () => {
    const prev = [msg('a'), msg('local-1')]
    const fresh = [msg('a')]
    const out = mergeMessages(prev, fresh)
    expect(out.map((m) => m.id)).toEqual(['a', 'local-1'])
  })

  it('appends a genuinely new server message', () => {
    const prev = [msg('a')]
    const fresh = [msg('a'), msg('b')]
    const out = mergeMessages(prev, fresh)
    expect(out.map((m) => m.id)).toEqual(['a', 'b'])
  })

  it('never duplicates a message present on both sides', () => {
    const prev = [msg('a'), msg('b')]
    const fresh = [msg('b'), msg('a'), msg('c')]
    const out = mergeMessages(prev, fresh)
    const ids = out.map((m) => m.id).sort()
    expect(ids).toEqual(['a', 'b', 'c'])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('preserves local content while taking server reply_count', () => {
    const prev = [msg('a', 0, 'local content')]
    const fresh = [msg('a', 2, 'server content')]
    const out = mergeMessages(prev, fresh)
    // We only adopt reply_count from the server, not the whole row.
    expect(out[0]).toEqual({ id: 'a', content: 'local content', reply_count: 2 })
  })

  it('handles an empty fresh fetch by keeping prev intact', () => {
    const prev = [msg('a'), msg('b')]
    expect(mergeMessages(prev, [])).toEqual(prev)
  })
})

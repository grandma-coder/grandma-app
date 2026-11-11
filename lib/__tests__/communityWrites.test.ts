/**
 * Community write paths must not fail silently. supabase-js resolves (doesn't
 * throw) on RLS / constraint errors, so every write here has to check `error`.
 * A tiny fake client records each call and answers per (table, op).
 */

type Op = 'select' | 'insert' | 'update' | 'delete' | 'upsert'
interface Call { table: string; op: Op; payload?: any; filters: [string, string, any][] }
type Res = { data?: any; error?: any; count?: number }
type Handler = (c: Call) => Res | undefined

const calls: Call[] = []
let handler: Handler = () => undefined
let mockRpcHandler: (fn: string, args: any) => Res = () => ({ data: null, error: null })

function mockBuilder(table: string) {
  const call: Call = { table, op: 'select', filters: [] }
  let registered = false
  const register = () => { if (!registered) { registered = true; calls.push(call) } }
  const b: any = {}
  const chain = (name: string) => (...args: any[]) => {
    if (['eq', 'is', 'in', 'gt', 'gte', 'not', 'ilike'].includes(name)) call.filters.push([name, args[0], args[1]])
    return b
  }
  for (const m of ['select', 'eq', 'is', 'in', 'gt', 'gte', 'not', 'ilike', 'order', 'limit', 'range']) b[m] = chain(m)
  for (const op of ['insert', 'update', 'delete', 'upsert'] as Op[]) {
    b[op] = (payload?: any) => { call.op = op; call.payload = payload; return b }
  }
  const resolve = () => { register(); return handler(call) ?? { data: null, error: null } }
  b.maybeSingle = () => Promise.resolve(resolve())
  b.single = () => Promise.resolve(resolve())
  b.then = (ok: any, bad: any) => Promise.resolve(resolve()).then(ok, bad)
  return b
}

jest.mock('../supabase', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'me', user_metadata: {} } } } }) },
    from: (t: string) => mockBuilder(t),
    rpc: async (fn: string, args: any) => mockRpcHandler(fn, args),
    storage: { from: () => ({}) },
  },
}))

import {
  approveRequest,
  requestToJoinChannel,
  joinIfApproved,
  leaveChannel,
  transferChannelOwnership,
  setReaction,
} from '../channelPosts'
import { createPoll, castVote } from '../polls'

const rlsError = { code: '42501', message: 'new row violates row-level security policy' }

beforeEach(() => {
  calls.length = 0
  handler = () => undefined
  mockRpcHandler = () => ({ data: null, error: null })
})

describe('approveRequest', () => {
  it('does not try to insert a membership or system post on behalf of another user', async () => {
    handler = (c) => (c.table === 'channel_requests' && c.op === 'update' ? { data: [{ id: 'r1' }], error: null } : undefined)
    await approveRequest('r1', 'ch1', 'other')
    expect(calls.some((c) => c.table === 'channel_members' && c.op === 'insert')).toBe(false)
    expect(calls.some((c) => c.table === 'channel_posts' && c.op === 'insert')).toBe(false)
  })

  it('throws when the approval write is rejected', async () => {
    handler = (c) => (c.table === 'channel_requests' && c.op === 'update' ? { data: null, error: rlsError } : undefined)
    await expect(approveRequest('r1', 'ch1', 'other')).rejects.toBeTruthy()
  })

  it('throws when the approval matched no row (not the host)', async () => {
    handler = (c) => (c.table === 'channel_requests' && c.op === 'update' ? { data: [], error: null } : undefined)
    await expect(approveRequest('r1', 'ch1', 'other')).rejects.toBeTruthy()
  })
})

describe('joinIfApproved', () => {
  it('joins the requester themselves once the host approved', async () => {
    handler = (c) => {
      if (c.table === 'channel_requests' && c.op === 'select') return { data: { id: 'r1', status: 'approved' }, error: null }
      return undefined
    }
    await expect(joinIfApproved('ch1')).resolves.toBe(true)
    const ins = calls.find((c) => c.table === 'channel_members' && c.op === 'insert')
    expect(ins?.payload).toEqual({ channel_id: 'ch1', user_id: 'me' })
  })

  it('does nothing while the request is pending', async () => {
    handler = (c) => (c.table === 'channel_requests' && c.op === 'select' ? { data: { id: 'r1', status: 'pending' }, error: null } : undefined)
    await expect(joinIfApproved('ch1')).resolves.toBe(false)
    expect(calls.some((c) => c.table === 'channel_members')).toBe(false)
  })
})

describe('requestToJoinChannel', () => {
  it('lets a denied user ask again (replaces the old denied row)', async () => {
    let inserts = 0
    handler = (c) => {
      if (c.table === 'channel_requests' && c.op === 'insert') {
        inserts++
        return inserts === 1 ? { data: null, error: { code: '23505' } } : { data: null, error: null }
      }
      if (c.table === 'channel_requests' && c.op === 'select') return { data: { id: 'old', status: 'denied' }, error: null }
      return undefined
    }
    await expect(requestToJoinChannel('ch1')).resolves.toBeUndefined()
    expect(calls.some((c) => c.table === 'channel_requests' && c.op === 'delete')).toBe(true)
    expect(inserts).toBe(2)
  })

  it('still reports an already-pending request', async () => {
    handler = (c) => {
      if (c.table === 'channel_requests' && c.op === 'insert') return { data: null, error: { code: '23505' } }
      if (c.table === 'channel_requests' && c.op === 'select') return { data: { id: 'old', status: 'pending' }, error: null }
      return undefined
    }
    await expect(requestToJoinChannel('ch1')).rejects.toThrow(/pending/)
  })
})

describe('leaveChannel', () => {
  it('clears my old join requests so an approval cannot silently re-add me', async () => {
    await leaveChannel('ch1')
    const del = calls.find((c) => c.table === 'channel_requests' && c.op === 'delete')
    expect(del?.filters).toEqual(expect.arrayContaining([['eq', 'channel_id', 'ch1'], ['eq', 'user_id', 'me']]))
  })
  it('posts the "left" line while still a member (private channels only accept member posts)', async () => {
    handler = (c) => (c.table === 'channel_posts' && c.op === 'insert' ? { data: { id: 'leave1' }, error: null } : undefined)
    await leaveChannel('ch1')
    const postIdx = calls.findIndex((c) => c.table === 'channel_posts' && c.op === 'insert')
    const leaveIdx = calls.findIndex((c) => c.table === 'channel_members' && c.op === 'delete')
    expect(postIdx).toBeGreaterThanOrEqual(0)
    expect(postIdx).toBeLessThan(leaveIdx)
  })

  it('takes the "left" line back down when the leave itself fails', async () => {
    handler = (c) => {
      if (c.table === 'channel_posts' && c.op === 'insert') return { data: { id: 'leave1' }, error: null }
      if (c.table === 'channel_members' && c.op === 'delete') return { data: null, error: rlsError }
      return undefined
    }
    await expect(leaveChannel('ch1')).rejects.toBeTruthy()
    const undo = calls.find((c) => c.table === 'channel_posts' && c.op === 'delete')
    expect(undo?.filters).toEqual(expect.arrayContaining([['eq', 'id', 'leave1']]))
  })
})

describe('transferChannelOwnership', () => {
  it('throws and posts no "transferred" message when the transfer RPC is rejected', async () => {
    handler = (c) => (c.table === 'channels' && c.op === 'select' ? { data: { created_by: 'me' }, error: null } : undefined)
    mockRpcHandler = () => ({ data: null, error: { code: '22023', message: 'the new owner must be a member of the channel' } })
    await expect(transferChannelOwnership('ch1', 'other')).rejects.toBeTruthy()
    expect(calls.some((c) => c.table === 'channel_posts' && c.op === 'insert')).toBe(false)
  })

  it('moves ownership through the transfer_channel_ownership RPC, never a direct channels update', async () => {
    handler = (c) => (c.table === 'channels' && c.op === 'select' ? { data: { created_by: 'me' }, error: null } : undefined)
    const rpcCalls: [string, any][] = []
    mockRpcHandler = (fn, args) => { rpcCalls.push([fn, args]); return { data: null, error: null } }
    await transferChannelOwnership('ch1', 'other')
    expect(rpcCalls).toEqual([['transfer_channel_ownership', { p_channel_id: 'ch1', p_new_owner: 'other' }]])
    expect(calls.some((c) => c.table === 'channels' && c.op === 'update')).toBe(false)
  })
})

describe('setReaction', () => {
  it('throws when the reaction write fails (so the screen resyncs)', async () => {
    handler = (c) => (c.table === 'post_reactions' && c.op === 'insert' ? { data: null, error: rlsError } : undefined)
    await expect(setReaction('p1', 'heart')).rejects.toBeTruthy()
  })

  it('treats a double-tap duplicate insert as success', async () => {
    handler = (c) => (c.table === 'post_reactions' && c.op === 'insert' ? { data: null, error: { code: '23505' } } : undefined)
    await expect(setReaction('p1', 'heart')).resolves.toBe('heart')
  })
})

describe('createPoll', () => {
  it('removes the feed message when the poll itself cannot be created', async () => {
    handler = (c) => {
      if (c.table === 'channel_posts' && c.op === 'insert') return { data: { id: 'post1' }, error: null }
      if (c.table === 'polls' && c.op === 'insert') return { data: null, error: rlsError }
      return undefined
    }
    await expect(createPoll({ channelId: 'ch1', question: 'Q?', options: ['a', 'b'] })).rejects.toBeTruthy()
    const del = calls.find((c) => c.table === 'channel_posts' && c.op === 'delete')
    expect(del?.filters).toEqual(expect.arrayContaining([['eq', 'id', 'post1']]))
  })
})

describe('castVote', () => {
  it('throws when switching a vote fails (e.g. poll closed)', async () => {
    handler = (c) => {
      if (c.table === 'poll_votes' && c.op === 'select') return { data: { id: 'v1', option_id: 'o1' }, error: null }
      if (c.table === 'poll_votes' && c.op === 'update') return { data: null, error: rlsError }
      return undefined
    }
    await expect(castVote('poll1', 'o2')).rejects.toBeTruthy()
  })
})

import {
  favoriteChannel, unfavoriteChannel, unmuteChannel, unsavePost, cancelRequest,
  markNotificationRead, markAllNotificationsRead,
} from '../channelPosts'

describe('toggle writes surface failures (callers revert their optimistic UI on throw)', () => {
  const cases: [string, () => Promise<void>][] = [
    ['favoriteChannel', () => favoriteChannel('c1')],
    ['unfavoriteChannel', () => unfavoriteChannel('c1')],
    ['unmuteChannel', () => unmuteChannel('c1')],
    ['unsavePost', () => unsavePost('p1')],
    ['cancelRequest', () => cancelRequest('c1')],
    ['markNotificationRead', () => markNotificationRead('n1')],
    ['markAllNotificationsRead', () => markAllNotificationsRead()],
  ]
  for (const [name, run] of cases) {
    it(`${name} rejects on an RLS error`, async () => {
      handler = () => ({ data: null, error: rlsError })
      await expect(run()).rejects.toBeTruthy()
    })
  }
  it('favoriting twice (unique violation) is not an error', async () => {
    handler = () => ({ data: null, error: { code: '23505', message: 'duplicate' } })
    await expect(favoriteChannel('c1')).resolves.toBeUndefined()
  })
})

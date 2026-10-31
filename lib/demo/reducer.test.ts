import { describe, it, expect } from 'vitest'
import { dataEn } from './data.en'
import { dataPt } from './data.pt'
import { demoReducer, initDemo, TOUR_STEPS, type DemoAction, type DemoState } from './reducer'

const run = (s: DemoState, ...as: DemoAction[]) => as.reduce(demoReducer, s)
const fresh = () => initDemo(dataEn)

describe('demoReducer', () => {
  it('openScreen away from a chat clears the pending reply marker', () => {
    let s = run(fresh(), { type: 'openScreen', screen: 'chat', arg: 'babySleep' }, { type: 'sendChat', channel: 'babySleep', text: 'hi' })
    expect(s.typing).toBe('babySleep')
    s = run(s, { type: 'openScreen', screen: 'agenda' })
    expect(s.typing).toBeNull()
  })

  it('starts in kids mode on home with the tour active', () => {
    const s = fresh()
    expect(s.mode).toBe('kids')
    expect(s.screen).toBe('home')
    expect(s.tour).toMatchObject({ step: 0, active: true })
    expect(s.week).toBeLessThan(dataEn.weeks.length)
  })

  it('setMode closes the sheet and resets to home', () => {
    const s = run(fresh(), { type: 'openScreen', screen: 'growth' }, { type: 'openSheet', sheet: { kind: 'register' } }, { type: 'setMode', mode: 'preg' })
    expect(s.mode).toBe('preg')
    expect(s.sheet).toEqual({ kind: 'none' })
    expect(s.screen).toBe('home')
  })

  it('log appends to that phase only, marks the chip and bumps logs', () => {
    const base = fresh()
    const s = run(base, { type: 'setMode', mode: 'preg' }, { type: 'log', chip: 'mood', value: 'good', now: '9:00 AM' })
    expect(s.items.preg).toHaveLength(base.items.preg.length + 1)
    expect(s.items.preg[0]).toMatchObject({ label: 'Mood', value: 'good', time: '9:00 AM', kid: null })
    expect(s.items.kids).toEqual(base.items.kids)
    expect(s.logged.preg.mood).toBe(true)
    expect(s.logged.kids.mood).toBeUndefined()
    expect(s.logs).toBe(1)
    expect(s.mems.preg).toHaveLength(base.mems.preg.length)
  })

  it('appends note to the row and ignores unknown chips', () => {
    const s = run(fresh(), { type: 'setMode', mode: 'preg' }, { type: 'log', chip: 'mood', value: 'good', note: ' slept well ', now: 'x' })
    expect(s.items.preg[0].value).toBe('good · “slept well”')
    expect(run(fresh(), { type: 'log', chip: 'ovtest', value: 'x', now: 'x' })).toEqual(fresh())
  })

  it('milestone log also prepends a memory tagged with the kid', () => {
    const base = fresh()
    const s = run(base, { type: 'log', chip: 'milestone', value: 'first step', kid: 'lua', now: 'x' })
    expect(s.mems.kids).toHaveLength(base.mems.kids.length + 1)
    expect(s.mems.kids[0]).toMatchObject({ title: 'First step', kid: 'lua', sub: 'Lua', year: '2026' })
    expect(s.items.kids[0].kid).toBe('lua')
    expect(s.items.kids[0].value).toContain(dataEn.ui.log.savedToMemories)
  })

  it('kid filter falls back to kenji when logging from All', () => {
    const s = run(fresh(), { type: 'setKid', kid: 'all' }, { type: 'log', chip: 'diaper', value: 'pee', now: 'x' })
    expect(s.items.kids[0].kid).toBe('kenji')
    expect(run(s, { type: 'setKid', kid: 'lua' }).kid).toBe('lua')
  })

  it('goal switch clears logged.pre only', () => {
    const s = run(fresh(), { type: 'setMode', mode: 'pre' }, { type: 'log', chip: 'mood', value: 'ok', now: 'x' }, { type: 'setMode', mode: 'kids' }, { type: 'log', chip: 'diaper', value: 'pee', now: 'x' })
    expect(s.logged.pre.mood).toBe(true)
    const t = run(s, { type: 'setGoal', goal: 'ttc' })
    expect(t.goal).toBe('ttc')
    expect(t.logged.pre).toEqual({})
    expect(t.logged.kids.diaper).toBe(true)
  })

  it('goal switch clears a pending typing indicator', () => {
    const s: DemoState = { ...fresh(), typing: 'ttc' }
    expect(run(s, { type: 'setGoal', goal: 'ttc' }).typing).toBeNull()
  })

  it('tour advances only on the current key; joined ends it', () => {
    let s = fresh()
    expect(TOUR_STEPS).toEqual(['log', 'week', 'mode', 'shortcuts', 'join'])
    s = run(s, { type: 'tourDone', key: 'mode' })
    expect(s.tour.step).toBe(0)
    s = run(s, { type: 'tourDone', key: 'log' })
    expect(s.tour.step).toBe(1)
    s = run(s, { type: 'joined' })
    expect(s.tour).toMatchObject({ active: false, joined: true })
    expect(run(s, { type: 'tourDone', key: 'week' }).tour.active).toBe(false)
  })

  it('walks the whole tour then ends; skipTour ends without joining', () => {
    const s = run(fresh(), ...TOUR_STEPS.map((key) => ({ type: 'tourDone', key }) as const))
    expect(s.tour.active).toBe(false)
    expect(s.tour.joined).toBe(false)
    expect(run(fresh(), { type: 'skipTour' }).tour).toMatchObject({ active: false, joined: false })
  })

  it('back goes chat -> community, exam -> exams, else home', () => {
    let s = run(fresh(), { type: 'openScreen', screen: 'chat', arg: 'ttc' })
    expect(s.arg).toBe('ttc')
    s = run(s, { type: 'back' })
    expect(s.screen).toBe('community')
    s = run(s, { type: 'openScreen', screen: 'exam', arg: 1 }, { type: 'back' })
    expect(s.screen).toBe('exams')
    expect(run(s, { type: 'back' }).screen).toBe('home')
  })

  it('chat send appends the visitor message; receiveReply appends a reply', () => {
    let s = run(fresh(), { type: 'setMode', mode: 'pre' }, { type: 'setGoal', goal: 'ttc' })
    const n = s.chats.ttc.length
    s = run(s, { type: 'sendChat', channel: 'ttc', text: ' <b>hi</b> ' })
    expect(s.chats.ttc).toHaveLength(n + 1)
    expect(s.chats.ttc[n]).toMatchObject({ me: true, text: '<b>hi</b>' })
    expect(s.typing).toBe('ttc')
    s = run(s, { type: 'receiveReply', channel: 'ttc', pick: 1 })
    expect(s.chats.ttc).toHaveLength(n + 2)
    expect(s.chats.ttc[n + 1].text).toBe(dataEn.replies[1])
    expect(s.typing).toBeNull()
    expect(run(s, { type: 'sendChat', channel: 'ttc', text: '  ' })).toBe(s)
  })

  it('anon channels use the anonymous identity', () => {
    const s = run(fresh(), { type: 'setMode', mode: 'preg' }, { type: 'sendChat', channel: 'fears', text: 'hey' })
    const m = s.chats.fears.at(-1)!
    expect(m.who).toBe(dataEn.ui.screens.community.meAnon)
  })

  it('likeMsg toggles a like on a received message', () => {
    const s = fresh()
    const l = s.chats.ttc[0].likes
    const t = run(s, { type: 'likeMsg', channel: 'ttc', index: 0 })
    expect(t.chats.ttc[0]).toMatchObject({ mine: true, likes: l + 1 })
    expect(run(t, { type: 'likeMsg', channel: 'ttc', index: 0 }).chats.ttc[0].likes).toBe(l)
  })

  it('addExam prepends the new exam and opens it', () => {
    const base = fresh()
    const s = run(base, { type: 'openSheet', sheet: { kind: 'addExam' } }, { type: 'addExam' })
    expect(s.exams.kids).toHaveLength(base.exams.kids.length + 1)
    expect(s.exams.kids[0]).toEqual(dataEn.ui.screens.exams.newExam)
    expect(s).toMatchObject({ screen: 'exam', arg: 0, sheet: { kind: 'none' } })
  })

  it('addMemory prepends a kid-tagged memory and opens memories', () => {
    const base = fresh()
    const s = run(base, { type: 'addMemory' })
    expect(s.mems.kids[0]).toMatchObject({ title: dataEn.ui.log.newMemory, kid: 'kenji' })
    expect(s.screen).toBe('memories')
  })

  it('toggleLike flips and adjusts the count', () => {
    const s = fresh()
    const l = s.posts[0].likes
    const t = run(s, { type: 'toggleLike', post: 0 })
    expect(t.posts[0]).toMatchObject({ liked: true, likes: l + 1 })
    expect(run(t, { type: 'toggleLike', post: 0 }).posts[0]).toMatchObject({ liked: false, likes: l })
    expect(run(s, { type: 'toggleLike', post: 99 })).toBe(s)
  })

  it('comment appends and opens the thread; blank is ignored', () => {
    const s = fresh()
    const n = s.posts[0].comments.length
    const t = run(s, { type: 'comment', post: 0, text: ' still there? ' })
    expect(t.posts[0].comments).toHaveLength(n + 1)
    expect(t.posts[0].comments[n]).toEqual({ name: dataEn.ui.you, text: 'still there?' })
    expect(t.posts[0].open).toBe(true)
    expect(run(s, { type: 'comment', post: 0, text: ' ' })).toBe(s)
  })

  it('setWeek clamps to range', () => {
    const max = dataEn.weeks.length - 1
    expect(run(fresh(), { type: 'setWeek', week: -3 }).week).toBe(0)
    expect(run(fresh(), { type: 'setWeek', week: 999 }).week).toBe(max)
    expect(run(fresh(), { type: 'setWeek', week: 2 }).week).toBe(2)
  })

  it('growth tab and village filter set', () => {
    const s = run(fresh(), { type: 'setGrowthTab', tab: 'head' }, { type: 'setVillageFilter', filter: 'free' })
    expect(s.growthTab).toBe('head')
    expect(s.villageFilter).toBe('free')
  })

  it('locale data swap keeps the same ids', () => {
    const en = fresh(), pt = initDemo(dataPt)
    const ids = (s: DemoState) => ({
      chats: Object.keys(s.chats).sort(),
      posts: s.posts.length,
      weeks: s.data.weeks.length,
      items: Object.fromEntries(Object.entries(s.items).map(([m, v]) => [m, v.map((x) => x.kid)])),
      mems: Object.fromEntries(Object.entries(s.mems).map(([m, v]) => [m, v.map((x) => x.kid)])),
      exams: Object.fromEntries(Object.entries(s.exams).map(([m, v]) => [m, v.length])),
    })
    expect(ids(pt)).toEqual(ids(en))
  })

  it('is pure: input state is not mutated', () => {
    const s = fresh()
    const snap = JSON.stringify(s)
    run(s, { type: 'log', chip: 'milestone', value: 'x', now: 'y' }, { type: 'toggleLike', post: 0 }, { type: 'sendChat', channel: 'ttc', text: 'q' })
    expect(JSON.stringify(s)).toBe(snap)
  })
})

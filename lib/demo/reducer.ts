import type { Mode } from '@/lib/modes'
import {
  forGoal,
  type ChanId, type ChipId, type DemoData, type Exam, type FeatScreenKey, type Goal, type GrowthKey,
  type KidId, type LogItem, type Memory, type Msg, type VillageKind,
} from './types'

export type ScreenName = 'home' | 'agenda' | 'week' | 'profile' | FeatScreenKey | 'chat' | 'exam'
export type Sheet =
  | { kind: 'none' }
  | { kind: 'register' }
  | { kind: 'shortcuts' }
  | { kind: 'addExam' }
  | { kind: 'log'; chip: ChipId }
export type KidFilter = 'all' | KidId
export type VillageFilter = 'all' | VillageKind

/** Onboarding tour, in order. `week` and `shortcuts` map to the mockup's `semana` and `atalhos`. */
export const TOUR_STEPS = ['log', 'week', 'mode', 'shortcuts', 'join'] as const
export type TourKey = (typeof TOUR_STEPS)[number]

export interface ChatMsg extends Msg { me?: boolean; mine?: boolean }
export interface PostState { liked: boolean; likes: number; open: boolean; comments: { name: string; text: string }[] }

export interface DemoState {
  data: DemoData
  mode: Mode
  goal: Goal
  kid: KidFilter
  screen: ScreenName
  /** chat: ChanId, exam: index, otherwise null */
  arg: ChanId | number | null
  sheet: Sheet
  /** number of saved logs (drives the tour and any counters) */
  logs: number
  items: Record<Mode, LogItem[]>
  /** chips already logged this session, per phase */
  logged: Record<Mode, Partial<Record<ChipId, true>>>
  mems: Record<Mode, Memory[]>
  exams: Record<Mode, Exam[]>
  chats: Record<ChanId, ChatMsg[]>
  typing: ChanId | null
  posts: PostState[]
  growthTab: GrowthKey
  villageFilter: VillageFilter
  week: number
  tour: { step: number; active: boolean; joined: boolean }
}

export type DemoAction =
  | { type: 'setMode'; mode: Mode }
  | { type: 'setGoal'; goal: Goal }
  | { type: 'setKid'; kid: KidFilter }
  | { type: 'openScreen'; screen: ScreenName; arg?: ChanId | number }
  | { type: 'back' }
  | { type: 'openSheet'; sheet: Sheet }
  | { type: 'closeSheet' }
  | { type: 'log'; chip: ChipId; value: string; note?: string; kid?: KidId; now: string }
  | { type: 'addMemory' }
  | { type: 'addExam' }
  | { type: 'toggleLike'; post: number }
  | { type: 'toggleComments'; post: number }
  | { type: 'comment'; post: number; text: string }
  | { type: 'sendChat'; channel: ChanId; text: string }
  | { type: 'receiveReply'; channel: ChanId; pick?: number }
  | { type: 'likeMsg'; channel: ChanId; index: number }
  | { type: 'setGrowthTab'; tab: GrowthKey }
  | { type: 'setVillageFilter'; filter: VillageFilter }
  | { type: 'setWeek'; week: number }
  | { type: 'tourDone'; key: TourKey }
  | { type: 'skipTour' }
  | { type: 'joined' }

const MODE_KEYS: Mode[] = ['pre', 'preg', 'kids', 'meno']
const perMode = <T,>(f: (m: Mode) => T): Record<Mode, T> =>
  Object.fromEntries(MODE_KEYS.map((m) => [m, f(m)])) as Record<Mode, T>

export const initDemo = (data: DemoData): DemoState => ({
  data,
  mode: 'kids',
  goal: 'track',
  kid: 'all',
  screen: 'home',
  arg: null,
  sheet: { kind: 'none' },
  logs: 0,
  items: perMode((m) => data.phases[m].today.map((x) => ({ ...x }))),
  logged: perMode(() => ({})),
  mems: perMode((m) => data.phases[m].mem.map((x) => ({ ...x }))),
  exams: perMode((m) => data.phases[m].exams.slice()),
  chats: Object.fromEntries(Object.entries(data.msgs).map(([k, v]) => [k, v.map((x) => ({ ...x }))])) as Record<ChanId, ChatMsg[]>,
  typing: null,
  posts: data.village.map((p) => ({ liked: false, likes: p.likes, open: false, comments: p.comments.map((c) => ({ ...c })) })),
  growthTab: 'weight',
  villageFilter: 'all',
  week: Math.min(4, data.weeks.length - 1),
  tour: { step: 0, active: true, joined: false },
})

const NONE: Sheet = { kind: 'none' }
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)))
const memKid = (s: DemoState): KidId | null => (s.mode === 'kids' ? (s.kid === 'all' ? 'kenji' : s.kid) : null)
const withMode = <T,>(rec: Record<Mode, T>, mode: Mode, v: T): Record<Mode, T> => ({ ...rec, [mode]: v })

const newMemory = (s: DemoState, title: string, kid: KidId | null): Memory => ({
  year: '2026', month: s.data.ui.log.today, title,
  sub: kid ? s.data.kids[kid].name : s.data.ui.you.toLowerCase(),
  icon: 'star', tone: '#FFF1B8', kid,
})

const findChan = (s: DemoState, id: ChanId) => forGoal(s.data.phases[s.mode].chans, s.goal).find((c) => c.id === id)

const backTarget = (s: DemoState): { screen: ScreenName; arg: null } =>
  ({ screen: s.screen === 'chat' ? 'community' : s.screen === 'exam' ? 'exams' : 'home', arg: null })

const endTour = (s: DemoState, joined: boolean): DemoState =>
  ({ ...s, tour: { step: TOUR_STEPS.length, active: false, joined: s.tour.joined || joined } })

export function demoReducer(s: DemoState, a: DemoAction): DemoState {
  switch (a.type) {
    case 'setMode':
      return { ...s, mode: a.mode, screen: 'home', arg: null, sheet: NONE, typing: null }
    case 'setGoal':
      return { ...s, goal: a.goal, logged: withMode(s.logged, 'pre', {}) }
    case 'setKid':
      return { ...s, kid: a.kid }
    case 'openScreen':
      return { ...s, screen: a.screen, arg: a.arg ?? null, sheet: NONE }
    case 'back':
      return { ...s, ...backTarget(s), typing: null }
    case 'openSheet':
      return { ...s, sheet: a.sheet }
    case 'closeSheet':
      return { ...s, sheet: NONE }
    case 'log': {
      const chip = forGoal(s.data.phases[s.mode].chips, s.goal).find((c) => c.id === a.chip)
      if (!chip) return s
      const memory = chip.cfg.t === 'pick' && chip.cfg.memory
      const kid = s.mode === 'kids' ? (a.kid ?? memKid(s)) : null
      const ui = s.data.ui.log
      const note = a.note?.trim()
      const value = a.value + (note ? ` · “${note}”` : '') + (memory ? ` · ${ui.savedToMemories}` : '')
      const row: LogItem = { icon: chip.icon, label: chip.label, value, time: a.now, kid }
      return {
        ...s,
        items: withMode(s.items, s.mode, [row, ...s.items[s.mode]]),
        mems: memory ? withMode(s.mems, s.mode, [newMemory(s, cap(a.value), kid), ...s.mems[s.mode]]) : s.mems,
        logged: withMode(s.logged, s.mode, { ...s.logged[s.mode], [a.chip]: true }),
        logs: s.logs + 1,
        sheet: NONE,
        screen: 'home',
        arg: null,
      }
    }
    case 'addMemory':
      return {
        ...s,
        mems: withMode(s.mems, s.mode, [newMemory(s, s.data.ui.log.newMemory, memKid(s)), ...s.mems[s.mode]]),
        screen: 'memories', arg: null, sheet: NONE,
      }
    case 'addExam':
      return {
        ...s,
        exams: withMode(s.exams, s.mode, [s.data.ui.screens.exams.newExam, ...s.exams[s.mode]]),
        screen: 'exam', arg: 0, sheet: NONE,
      }
    case 'toggleLike':
      return updatePost(s, a.post, (p) => ({ ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) }))
    case 'toggleComments':
      return updatePost(s, a.post, (p) => ({ ...p, open: !p.open }))
    case 'comment': {
      const text = a.text.trim()
      if (!text) return s
      return updatePost(s, a.post, (p) => ({ ...p, open: true, comments: [...p.comments, { name: s.data.ui.you, text }] }))
    }
    case 'sendChat': {
      const text = a.text.trim()
      const chan = findChan(s, a.channel)
      if (!text || !chan) return s
      const c = s.data.ui.screens.community
      const msg: ChatMsg = { me: true, icon: chan.icon, who: chan.kind === 'anon' ? c.meAnon : c.me, text, likes: 0 }
      return { ...s, chats: { ...s.chats, [a.channel]: [...(s.chats[a.channel] ?? []), msg] }, typing: a.channel }
    }
    case 'receiveReply': {
      const chan = findChan(s, a.channel)
      const list = s.chats[a.channel] ?? []
      const { replies, ui } = s.data
      if (!chan || !replies.length) return s
      const r = chan.kind === 'anon' ? ui.screens.community.replyAnon : ui.screens.community.replyOpen
      const msg: ChatMsg = { icon: r.icon, who: r.who, text: replies[(a.pick ?? list.length) % replies.length], likes: 0 }
      return { ...s, chats: { ...s.chats, [a.channel]: [...list, msg] }, typing: s.typing === a.channel ? null : s.typing }
    }
    case 'likeMsg': {
      const list = s.chats[a.channel]
      if (!list?.[a.index] || list[a.index].me) return s
      const next = list.map((m, i) => (i === a.index ? { ...m, mine: !m.mine, likes: m.likes + (m.mine ? -1 : 1) } : m))
      return { ...s, chats: { ...s.chats, [a.channel]: next } }
    }
    case 'setGrowthTab':
      return { ...s, growthTab: a.tab }
    case 'setVillageFilter':
      return { ...s, villageFilter: a.filter }
    case 'setWeek':
      return { ...s, week: clamp(a.week, 0, s.data.weeks.length - 1) }
    case 'tourDone': {
      if (!s.tour.active || TOUR_STEPS[s.tour.step] !== a.key) return s
      const step = s.tour.step + 1
      return step >= TOUR_STEPS.length ? endTour(s, false) : { ...s, tour: { ...s.tour, step } }
    }
    case 'skipTour':
      return endTour(s, false)
    case 'joined':
      return endTour(s, true)
  }
}

function updatePost(s: DemoState, i: number, f: (p: PostState) => PostState): DemoState {
  if (!s.posts[i]) return s
  return { ...s, posts: s.posts.map((p, n) => (n === i ? f(p) : p)) }
}

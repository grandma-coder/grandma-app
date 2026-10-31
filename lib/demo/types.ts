import type { StickerName } from '@/components/stickers/paths'
import type { Mode } from '@/lib/modes'

/** Seed data for the in-page app demo. Same shape in every locale (enforced by `DemoData` + data.test.ts).
 *  Ids and enum-like fields are language-neutral; only display strings differ per locale. */

export type Goal = 'track' | 'ttc'
export type KidId = 'kenji' | 'lua'
export type Goalable<T> = T | ((goal: Goal) => T)
/** Resolve a value that may depend on the cycle goal (`pre` phase only). */
export const forGoal = <T,>(v: Goalable<T>, goal: Goal): T => (typeof v === 'function' ? (v as (g: Goal) => T)(goal) : v)

export type FeatScreenKey =
  | 'vaccines' | 'memories' | 'care' | 'village' | 'community' | 'exams'
  | 'appointments' | 'reminders' | 'pediatric' | 'growth' | 'privacy'
export type ChipId =
  | 'mood' | 'flow' | 'temp' | 'ovtest' | 'symptoms' | 'sleep' | 'kicks' | 'visit'
  | 'food' | 'diaper' | 'milestone' | 'heat' | 'fog'
export type CycPhase = 'per' | 'fol' | 'ovu' | 'lut'
export type VillageKind = 'sell' | 'free' | 'swap'
export type GrowthKey = 'weight' | 'height' | 'head'
export type ChanKind = 'channel' | 'anon'
export type ChanId =
  | 'ttc' | 'irregular' | 'afterPositive' | 'cycle' | 'endo' | 'feb' | 'fears' | 'layette'
  | 'babySleep' | 'solids' | 'momsOfTwo' | 'exhaustion' | 'hotFlashes' | 'menoSleep' | 'running'
/** `${chipId}:${optionId}` for every pick option; a typo in data fails tsc */
export type OptKey =
  | 'flow:none' | 'flow:light' | 'flow:medium' | 'flow:heavy'
  | 'symptoms:cramps' | 'symptoms:bloating' | 'symptoms:headache' | 'symptoms:acne'
  | 'ovtest:negative' | 'ovtest:positive'
  | 'visit:prenatal' | 'visit:ultrasound' | 'visit:blood' | 'visit:other'
  | 'food:nursing' | 'food:puree' | 'food:fruit' | 'food:snack'
  | 'diaper:pee' | 'diaper:poop' | 'diaper:both'
  | 'milestone:firstStep' | 'milestone:firstWord' | 'milestone:firstTooth' | 'milestone:other'
  | 'fog:mild' | 'fog:medium' | 'fog:strong'
export type OptionId = OptKey extends `${string}:${infer O}` ? O : never

export interface Pair { label: string; value: string }
export interface Kid { name: string; age: string; icon: StickerName; tone: string; dot: string }

export interface PickOption { id: OptionId; label: string }
export type ChipCfg =
  | { t: 'mood' }
  | { t: 'pick'; options: PickOption[]; memory: boolean }
  | { t: 'range'; min: number; max: number; step: number; v: number; unit: string }
  | { t: 'kick' }
export interface Chip { id: ChipId; label: string; icon: StickerName; cfg: ChipCfg }

export interface Hero { label: string; n: string; em: string; row: Pair[]; icon: StickerName }
export interface KidHero { n: string; em: string; row: Pair[] }
export interface LogItem { icon: StickerName; label: string; value: string; time: string; kid: KidId | null }
export interface Quick { screen: FeatScreenKey; sub: string }
export interface LegendItem { color: string; label: string; ring: string | null }
export interface Cal {
  per: number[]; fer: number[]; ev: number[]; star: number | null; dots: number[]
  kd: Record<KidId, number[]> | null; legend: LegendItem[]
}
export interface EventItem { icon: StickerName; title: string; sub: string; when: string; kid: KidId | null }
export interface Chan { id: ChanId; icon: StickerName; title: string; kind: ChanKind; tone: string }
export interface ExamValue { name: string; value: string; range: string; flag: 'ok' | 'low' }
export interface Exam { title: string; date: string; status: 'ok' | 'warn'; read: string; vals: ExamValue[] }
export interface Memory { year: string; month: string; title: string; sub: string; icon: StickerName; tone: string; kid: KidId | null }

export interface Phase {
  name: string
  /** soft tint and accent used by the phone (`--mc`, `--ma`) */
  tone: string
  accent: string
  icon: StickerName
  /** `pre` depends on the goal; `preg` and `kids` have no hero card (null) */
  hero: Goalable<Hero> | null
  kidHero: Record<KidId, KidHero> | null
  chips: Goalable<Chip[]>
  today: LogItem[]
  quick: Goalable<Quick[]>
  cal: Cal
  events: EventItem[]
  chans: Goalable<Chan[]>
  exams: Exam[]
  mem: Memory[]
}

export interface Week { week: number; name: string; icon: StickerName; len: string; wt: string }
export interface Msg { icon: StickerName; who: string; text: string; likes: number }
export interface VillagePost {
  icon: StickerName; tone: string; rot: number; title: string
  who: { icon: StickerName; name: string; place: string }
  price: string; kind: VillageKind; badge: string; likes: number
  comments: { name: string; text: string }[]
}
export interface GrowthSeries { p3: number[]; p50: number[]; p97: number[]; me: number[]; u: string; p: string }
export interface Growth { xs: number[]; xl: string[]; weight: GrowthSeries; height: GrowthSeries; head: GrowthSeries }
export interface Vax { name: string; when: string; done: boolean }
export interface Feat {
  icon: StickerName; title: string; desc: string
  action: { mode: Mode } | { screen: FeatScreenKey }
}

/** Every string the phone shows that is not seed content. `{x}` marks values the UI substitutes (see `fmt`). */
export interface DemoUi {
  user: string
  /** BCP 47 tag for dates and times */
  dateLocale: string
  /** decimal separator used when formatting numbers */
  decimal: string
  all: string
  back: string
  close: string
  save: string
  send: string
  you: string
  home: {
    hello: string
    nudgeTitle: string
    nudgeSub: string
    goalTrack: string
    goalTtc: string
    registerToday: string
    tapSign: string
    today: string
    records: string
    quickAccess: string
    pregTiles: { daysValue: string; daysLabel: string; kicksLabel: string; visitValue: string; visitLabel: string }
  }
  size: {
    here: string; week: string; sizeOf: string; length: string; weight: string
    factHere: string; weeksAgo: string; weeksAhead: string; sliderAria: string
  }
  cycle: { day: string; todayPrefix: string; dayAria: string }
  weekdays: { mondayFirst: string[]; sundayFirst: string[] }
  agenda: { title: string; next: string; shared: string; today: string }
  week: { title: string }
  profile: { title: string; kids: string; add: string; network: string; people: string; kidsSuffix: string; items: { screen: FeatScreenKey; icon: StickerName; title: string }[] }
  tabs: { home: string; agenda: string; shortcuts: string; week: string; profile: string }
  shortcuts: { title: string; items: { screen: FeatScreenKey; icon: StickerName; title: string }[] }
  register: { title: string }
  log: {
    title: string
    howAreYou: string
    faces: { icon: StickerName; label: string }[]
    kickHint: string
    kicks: string
    notePlaceholder: string
    savedToMemories: string
    saved: string
    milestoneSaved: string
    newMemory: string
    today: string
  }
  charts: {
    baseline: string; ovulation: string
    cycleTitle: string; tapDay: string; bbtTitle: string; bbtSub: string; moodTitle: string; moodSub: string
    kicksTitle: string; kicksSub: string; weightTitle: string; weightSub: string; weekAbbr: string
    trailTitle: string; trailSub: string
    pregTiles: { gainValue: string; gainLabel: string; visitsValue: string; visitsLabel: string; sleepValue: string; sleepLabel: string }
    nightsTitle: string; nightsSub: string; nightsAxis: string[]
    kenjiLegend: string; luaLegend: string
    plateTitle: string; plateSub: string; plate: { label: string; pct: number; tone: string }[]
    proteinTitle: string; proteinSub: string; proteinNote: string
    feedsTitle: string; feedsSub: string; seeGrowth: string
    heatTitle: string; heatSub: string; heatSlots: string[]; heatNote: string
    trendTitle: string; trendSub: string; trendWeek: string
    menoTiles: { sleepValue: string; sleepLabel: string; fogValue: string; fogLabel: string; dropValue: string; dropLabel: string }
  }
  screens: {
    vaccines: { title: string; icon: StickerName; note: string }
    memories: { title: string; icon: StickerName; note: string; newMemory: string; saved: string }
    care: {
      title: string; icon: StickerName; note: string
      circle: { you: string; partner: string; grandma: string; sitter: string }
      access: { partner: string; grandma: string; sitter: string }
      memoFrom: string; memo: string
    }
    village: {
      title: string; icon: StickerName
      filters: { all: string; sell: string; swap: string; free: string }
      kinds: Record<VillageKind, string>
      buy: string; want: string; commentPlaceholder: string; commentAria: string; send: string
      requestSent: string; messageSent: string
    }
    community: {
      title: string; icon: StickerName; note: string; kinds: Record<ChanKind, string>
      noteAnon: string; noteOpen: string
      composerPlaceholder: string; composerAria: string; typing: string
      meAnon: string; me: string
      replyAnon: { icon: StickerName; who: string }; replyOpen: { icon: StickerName; who: string }
    }
    exams: {
      title: string; icon: StickerName; note: string; normal: string; attention: string; add: string
      kept: string; readBy: string; low: string; share: string; original: string
      addNote: string; takePhoto: string; reading: string; done: string
      newExam: Exam
    }
    appointments: { title: string; icon: StickerName; note: string; items: { name: string; when: string; done: boolean }[] }
    reminders: { title: string; icon: StickerName; note: string; items: { name: string; when: string }[] }
    pediatric: { title: string; icon: StickerName; note: string; items: Record<KidId, Pair[]> }
    growth: {
      title: string; icon: StickerName
      tabs: Record<GrowthKey, string>
      chartTitles: Record<GrowthKey, string>
      curve: string; now: string; percentile: string; nextMeasure: string
      next: Record<KidId, string>
      milestones: string
      milestoneItems: Record<KidId, { icon: StickerName; label: string; when: string }[]>
    }
    privacy: { title: string; icon: StickerName; note: string; items: Pair[] }
  }
}

export interface DemoData {
  locale: 'en' | 'pt'
  kids: Record<KidId, Kid>
  phases: Record<Mode, Phase>
  weeks: Week[]
  /** keyed by `Chan.id` */
  msgs: Record<ChanId, Msg[]>
  replies: string[]
  village: VillagePost[]
  growth: Record<KidId, Growth>
  vax: Record<KidId, Vax[]>
  /** keyed `${chipId}:${optionId}`; icons shown on a pick tile */
  optIcons: Record<OptKey, StickerName[]>
  /** keyed by `ChipId`; how a range chip draws itself in the log sheet */
  rangeVis: Partial<Record<ChipId, { icon: StickerName; how: 'grow' | 'count' }>>
  feats: Feat[]
  cyc: Record<CycPhase, { icon: StickerName; name: string; what: string }>
  /** fixed "today" of the demo, so the calendar renders identically on server and client */
  demoDate: { year: number; month: number; day: number }
  ui: DemoUi
}

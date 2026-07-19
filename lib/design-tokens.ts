/**
 * grandma.app — DIFFUSE (v3) design tokens.
 *
 * Mirrored verbatim from grandma-app/constants/theme.ts (the diffuse* exports)
 * and DESIGN_SYSTEM.md §0.5. This is the read-only reference for the command
 * center; theme.ts is the source of truth. Values copied 2026-07.
 *
 * Diffuse is the app's v3 visual language: warm paper + ink ramp, a bold
 * grotesque display + mono "data voice", and one per-behavior generative
 * gradient field. Stickers/icons stay active as the icon system.
 */

export interface Swatch {
  name: string
  value: string
  note?: string
}
export interface SwatchGroup {
  title: string
  blurb?: string
  swatches: Swatch[]
}

// ── Neutrals — paper + ink ramp (light) ──────────────────────────────────────
export const neutralsLight: SwatchGroup = {
  title: "Neutrals — light",
  blurb: "Warm off-white paper + a 4-step ink ramp. The signature strong hairline is the top rule.",
  swatches: [
    { name: "bg", value: "#F4F1E8", note: "paper — page canvas" },
    { name: "bgDeep", value: "#EDE9DD", note: "deep paper" },
    { name: "surface", value: "#FBFAF5", note: "raised card" },
    { name: "surfaceRaised", value: "#F7F4EC", note: "nested card" },
    { name: "ink", value: "#1A1916", note: "near-black warm" },
    { name: "ink2", value: "#4A463E" },
    { name: "ink3", value: "#807A6E" },
    { name: "ink4", value: "#B3AC9C", note: "faintest" },
    { name: "line", value: "rgba(26,25,22,0.12)" },
    { name: "line2", value: "rgba(26,25,22,0.20)" },
    { name: "hairline", value: "rgba(26,25,22,0.55)", note: "signature strong rule" },
  ],
}

// ── Neutrals (dark) ──────────────────────────────────────────────────────────
export const neutralsDark: SwatchGroup = {
  title: "Neutrals — dark",
  blurb: "Same ramp inverted. Warm ink canvas, cream ink.",
  swatches: [
    { name: "bg", value: "#16140F" },
    { name: "bgDeep", value: "#100E0A" },
    { name: "surface", value: "#211E18" },
    { name: "surfaceRaised", value: "#2A261F" },
    { name: "ink", value: "#F4F1E8" },
    { name: "ink2", value: "#D8D2C4" },
    { name: "ink3", value: "#A39C8C" },
    { name: "ink4", value: "#6E685C" },
    { name: "hairline", value: "rgba(244,241,232,0.55)" },
  ],
}

// ── Semantic status (carried forward into Diffuse) ───────────────────────────
export const statusColors: SwatchGroup = {
  title: "Status",
  blurb: "Reused from the current system so Diffuse screens show success/warning/error without new values.",
  swatches: [
    { name: "success", value: "#2E7D32" },
    { name: "successTint", value: "#E8F5E9" },
    { name: "warning", value: "#E65100" },
    { name: "error", value: "#C62828" },
  ],
}

// ── Behavior fields — the ONLY thing that changes per behavior ────────────────
export interface DiffuseField {
  key: string
  label: string
  g1: string
  g2: string
  g3: string
  g4: string
  accent: string
  accentSoft: string
  note: string
}
export const diffuseFields: DiffuseField[] = [
  { key: "pre", label: "Cycle (pre-pregnancy)", g1: "#F0A99A", g2: "#F0B8C8", g3: "#C9B7E6", g4: "#F7DCC0", accent: "#C25872", accentSoft: "#F6DCE4", note: "coral → rose → lilac → peach" },
  { key: "preg", label: "Pregnancy", g1: "#F8C9A6", g2: "#F2AEC6", g3: "#BDA4E2", g4: "#F8E1B2", accent: "#8F5FC6", accentSoft: "#E7D8F5", note: "peach → blush → plum → gold" },
  { key: "kids", label: "Raising (kids)", g1: "#F4D888", g2: "#A2D8B4", g3: "#A6BCE6", g4: "#F4B396", accent: "#4C79CE", accentSoft: "#CBDCF7", note: "yellow → green → blue → orange" },
  { key: "care", label: "Caregiver (scaffold)", g1: "#A6D6DC", g2: "#B0C0E4", g3: "#C6E7D9", g4: "#D4E1F0", accent: "#4A8496", accentSoft: "#D2EAEE", note: "teal → blue → mint → sky · scaffold only" },
]

// ── Typography — the "data voice" ────────────────────────────────────────────
export interface FontToken {
  token: string
  family: string
  role: string
  cssStack: string
}
export const fonts: FontToken[] = [
  { token: "diffuseFont.display", family: "Hanken Grotesk 700 Bold", role: "Display — screen/section titles (⚠️ preview swap from Cormorant serif)", cssStack: "'Hanken Grotesk', 'Helvetica Neue', Arial, sans-serif" },
  { token: "diffuseFont.body", family: "Hanken Grotesk 400", role: "Read — body copy + row labels", cssStack: "'Hanken Grotesk', 'Helvetica Neue', Arial, sans-serif" },
  { token: "diffuseFont.mono", family: "Space Mono 400", role: "Data — every pill, chip, eyebrow, label, number, unit, date", cssStack: "'Space Mono', ui-monospace, monospace" },
  { token: "diffuseFont.monoBold", family: "Space Mono 700", role: "Data emphasis", cssStack: "'Space Mono', ui-monospace, monospace" },
]

// TYPE ROLES — assign by MEANING, never by size (the one clear v3 rule).
export const typeRoles: { role: string; font: string; use: string }[] = [
  { role: "title", font: "serif/display", use: "screen & section titles + feeling words" },
  { role: "read", font: "sans/body", use: "body copy + selectable row labels" },
  { role: "data", font: "mono", use: "every pill, chip, eyebrow, label, number, unit, date" },
  { role: "numHero", font: "serif/display", use: "the single large focal number of a data tile" },
]

// ── Radius / blur / shadows / grain ──────────────────────────────────────────
export const radii: { token: string; value: number; use: string }[] = [
  { token: "sm", value: 14, use: "chips" },
  { token: "md", value: 20, use: "inputs" },
  { token: "lg", value: 28, use: "cards" },
  { token: "xl", value: 40, use: "sheets / large surfaces" },
]

export const blurs: { token: string; value: number; use: string }[] = [
  { token: "soft", value: 40, use: "surfaces / blooms" },
  { token: "field", value: 70, use: "generative-field blob blur" },
  { token: "glass", value: 18, use: "glass sprays" },
]

export const grain = {
  baseFrequency: 0.9,
  numOctaves: 2,
  opacityLight: 0.22,
  opacityDark: 0.16,
}

// (The current icon system — Character-blobs — lives in lib/blobs.ts, extracted
//  from grandma-app/components/characters/Characters.tsx and rendered on the
//  Stickers tab grouped by behavior.)

export const COLOR_GROUPS = [neutralsLight, neutralsDark, statusColors]

// ── Exports ──────────────────────────────────────────────────────────────────
function flatColorTokens(): { name: string; value: string }[] {
  const out: { name: string; value: string }[] = []
  for (const s of neutralsLight.swatches) out.push({ name: s.name, value: s.value })
  for (const f of diffuseFields) {
    out.push({ name: `field-${f.key}-accent`, value: f.accent })
    out.push({ name: `field-${f.key}-accent-soft`, value: f.accentSoft })
  }
  return out
}

export function cssVarsExport(): string {
  const c = flatColorTokens().map((t) => `  --d-${t.name.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${t.value};`)
  const r = radii.map((x) => `  --d-r-${x.token}: ${x.value}px;`)
  const b = blurs.map((x) => `  --d-blur-${x.token}: ${x.value}px;`)
  return `:root {\n${[...c, ...r, ...b].join("\n")}\n}`
}

export function jsonExport(): string {
  const neutrals = Object.fromEntries(neutralsLight.swatches.map((s) => [s.name, s.value]))
  const fields = Object.fromEntries(
    diffuseFields.map((f) => [f.key, { g1: f.g1, g2: f.g2, g3: f.g3, g4: f.g4, accent: f.accent, accentSoft: f.accentSoft }]),
  )
  const obj = {
    neutrals,
    fields,
    radius: Object.fromEntries(radii.map((x) => [x.token, x.value])),
    blur: Object.fromEntries(blurs.map((x) => [x.token, x.value])),
    grain,
  }
  return JSON.stringify(obj, null, 2)
}

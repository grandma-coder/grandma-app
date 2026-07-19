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

// ── Stickers — the icon system (SVG paths lifted from Stickers.tsx) ───────────
export interface StickerDef {
  name: string
  viewBox: string
  fill: string
  paths: string[]
}
export const stickers: StickerDef[] = [
  { name: "Heart", viewBox: "0 0 100 100", fill: "#F2B2C7", paths: ["M50,88 C20,68 8,50 8,32 C8,18 20,10 32,10 C40,10 46,14 50,22 C54,14 60,10 68,10 C80,10 92,18 92,32 C92,50 80,68 50,88 Z"] },
  { name: "Star", viewBox: "0 0 100 100", fill: "#F5D652", paths: ["M50,8 L61,38 L94,40 L68,60 L78,92 L50,72 L22,92 L32,60 L6,40 L39,38 Z"] },
  { name: "Drop", viewBox: "0 0 100 100", fill: "#9DC3E8", paths: ["M50,8 C50,8 22,42 22,62 C22,80 36,94 50,94 C64,94 78,80 78,62 C78,42 50,8 50,8 Z"] },
  { name: "Moon", viewBox: "0 0 100 100", fill: "#C8B6E8", paths: ["M68,14 C46,14 30,32 30,54 C30,74 46,88 66,88 C74,88 82,84 86,78 C74,78 62,68 58,54 C54,36 60,22 68,14 Z"] },
  { name: "Leaf", viewBox: "0 0 100 100", fill: "#BDD48C", paths: ["M12,88 C12,50 42,12 88,12 C88,58 58,88 12,88 Z", "M20,82 Q50,54 84,18"] },
  { name: "Cloud", viewBox: "0 0 120 80", fill: "#C8D4E8", paths: ["M20,60 C8,60 8,42 22,40 C22,22 48,18 52,36 C60,22 88,24 88,42 C104,42 106,60 92,62 Z"] },
  { name: "Bolt", viewBox: "0 0 100 100", fill: "#F5D652", paths: ["M54,8 L22,54 L44,54 L38,92 L78,38 L54,38 Z"] },
  { name: "Foot", viewBox: "0 0 100 100", fill: "#F2B2C7", paths: ["M30,80 C20,70 20,48 34,40 C48,32 60,44 58,62 C56,78 44,90 30,80 Z"] },
  { name: "Smiley", viewBox: "0 0 100 100", fill: "#F5D652", paths: ["M34,60 Q50,74 66,60"] },
  { name: "Apple", viewBox: "0 0 100 100", fill: "#EE4A3C", paths: ["M50,26 C42,18 24,22 22,44 C20,68 38,88 50,88 C62,88 80,68 78,44 C76,22 58,18 50,26 Z", "M50,26 C50,14 56,8 64,8", "M56,30 Q66,24 72,32"] },
  { name: "Cupcake", viewBox: "0 0 100 100", fill: "#F2B2C7", paths: ["M22,56 L30,88 h40 l8,-32 z", "M20,58 C20,38 40,30 50,30 C60,30 80,38 80,58 Z"] },
]

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

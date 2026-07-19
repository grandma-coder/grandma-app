/**
 * grandma.app design tokens — mirrored verbatim from the app's canonical source:
 *   grandma-app/constants/theme.ts  (and DESIGN_SYSTEM.md)
 *
 * This is a READ-ONLY reference for the command center. theme.ts is the source
 * of truth; if it changes, update this file to match. Values copied 2026-07.
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

// ── Brand + mode ─────────────────────────────────────────────────────────────
export const brand: SwatchGroup = {
  title: "Brand & mode",
  blurb: "Primary purple + one accent per journey mode. Never hardcode per-mode — use getModeColor().",
  swatches: [
    { name: "primary", value: "#7048B8", note: "Purple — primary buttons, active states" },
    { name: "primaryLight", value: "#9B70D4" },
    { name: "prePregnancy", value: "#E58BB4", note: "Rose — cycle, period" },
    { name: "pregnancy", value: "#B7A6E8", note: "Lavender — milestones, week ring" },
    { name: "kids", value: "#8BB8E8", note: "Powder blue — vaccines, dashboard" },
  ],
}

// ── Sticker palette (light) — each has Soft (bg tint) + Ink (dark icon) ──────
export const stickersLight: SwatchGroup = {
  title: "Sticker palette — light",
  blurb: "7 stickers, each with a *Soft (tinted bg) and *Ink (dark icon on cream) companion.",
  swatches: [
    { name: "yellow", value: "#F5D652" },
    { name: "yellowSoft", value: "#FBEA9E" },
    { name: "yellowInk", value: "#7C5E0F" },
    { name: "blue", value: "#9DC3E8" },
    { name: "blueSoft", value: "#CFE0F0" },
    { name: "blueInk", value: "#1F4A7A" },
    { name: "pink", value: "#F2B2C7" },
    { name: "pinkSoft", value: "#F9D8E2" },
    { name: "pinkInk", value: "#8E3A56" },
    { name: "green", value: "#BDD48C" },
    { name: "greenSoft", value: "#DDE7BB" },
    { name: "greenInk", value: "#3F5919" },
    { name: "lilac", value: "#C8B6E8" },
    { name: "lilacSoft", value: "#E3D8F2" },
    { name: "lilacInk", value: "#3A2A6E" },
    { name: "peach", value: "#F5B896" },
    { name: "peachSoft", value: "#F9D6C0" },
    { name: "peachInk", value: "#8B4A26" },
    { name: "coral", value: "#EE7B6D" },
    { name: "coralInk", value: "#B43E2E" },
    { name: "charcoal", value: "#2A2624" },
  ],
}

// ── Canvas (light default) ───────────────────────────────────────────────────
export const canvasLight: SwatchGroup = {
  title: "Canvas — light (default)",
  blurb: "Cream paper. Never #FFFFFF or cosmic dark purple.",
  swatches: [
    { name: "bg", value: "#F3ECD9", note: "cream — page background" },
    { name: "bgWarm", value: "#EFE5CC", note: "slightly deeper cream sections" },
    { name: "surface", value: "#FFFEF8", note: "paper-white card" },
    { name: "surfaceRaised", value: "#F7F0DF", note: "nested cards" },
    { name: "border", value: "rgba(20,19,19,0.08)", note: "hairline dividers" },
  ],
}

// ── Canvas (dark) ────────────────────────────────────────────────────────────
export const canvasDark: SwatchGroup = {
  title: "Canvas — dark",
  blurb: "Warm ink, not cosmic purple. Same sticker palette, deeper canvas.",
  swatches: [
    { name: "bg", value: "#1A1713", note: "warm dark" },
    { name: "bgWarm", value: "#13110E", note: "deeper warm dark" },
    { name: "surface", value: "#232019", note: "card parchment" },
    { name: "surfaceRaised", value: "#2C2820", note: "elevated cards" },
    { name: "border", value: "rgba(245,237,220,0.18)", note: "cream hairline" },
  ],
}

// ── Typography ───────────────────────────────────────────────────────────────
export interface FontToken {
  token: string
  family: string
  role: string
  cssStack: string
}
export const fonts: FontToken[] = [
  { token: "font.display", family: "Fraunces 600 SemiBold", role: "Editorial serif — headings, numbers, titles", cssStack: "'Fraunces', Georgia, serif" },
  { token: "font.displayBold", family: "Fraunces 700 Bold", role: "Heavier display — hero numbers, big titles", cssStack: "'Fraunces', Georgia, serif" },
  { token: "font.italic", family: "Instrument Serif Italic", role: "Italic accent", cssStack: "'Instrument Serif', Georgia, serif" },
  { token: "font.body", family: "DM Sans 400", role: "UI body — all interface text", cssStack: "'DM Sans', Helvetica, Arial, sans-serif" },
  { token: "font.bodyMedium", family: "DM Sans 500", role: "Medium UI", cssStack: "'DM Sans', Helvetica, Arial, sans-serif" },
  { token: "font.bodySemiBold", family: "DM Sans 600", role: "Semibold labels", cssStack: "'DM Sans', Helvetica, Arial, sans-serif" },
]

export const fontSizes: { token: string; value: number }[] = [
  { token: "xs", value: 11 },
  { token: "sm", value: 14 },
  { token: "md", value: 16 },
  { token: "lg", value: 18 },
  { token: "xl", value: 22 },
  { token: "xxl", value: 28 },
  { token: "display", value: 36 },
  { token: "hero", value: 48 },
]

// ── Radius ───────────────────────────────────────────────────────────────────
export const radii: { token: string; value: number; use: string }[] = [
  { token: "sm", value: 12, use: "small chips" },
  { token: "md", value: 20, use: "inputs (20–24)" },
  { token: "lg", value: 28, use: "cards" },
  { token: "xl", value: 36, use: "large inputs" },
  { token: "xxl", value: 48, use: "sheets" },
  { token: "full", value: 999, use: "buttons / pills" },
]

// ── Spacing ──────────────────────────────────────────────────────────────────
export const spacing: { token: string; value: number }[] = [
  { token: "xs", value: 4 },
  { token: "sm", value: 8 },
  { token: "md", value: 16 },
  { token: "lg", value: 24 },
  { token: "xl", value: 32 },
  { token: "xxl", value: 48 },
]

export const COLOR_GROUPS = [brand, stickersLight, canvasLight, canvasDark]

/** Only true hex colors (skip rgba) become CSS/JSON export rows. */
function flatColorTokens(): { name: string; value: string }[] {
  const seen = new Set<string>()
  const out: { name: string; value: string }[] = []
  for (const g of [brand, stickersLight, canvasLight]) {
    for (const s of g.swatches) {
      if (seen.has(s.name)) continue
      seen.add(s.name)
      out.push({ name: s.name, value: s.value })
    }
  }
  return out
}

export function cssVarsExport(): string {
  const lines = flatColorTokens().map((t) => `  --gm-${t.name.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${t.value};`)
  const r = radii.map((x) => `  --gm-radius-${x.token}: ${x.value}px;`)
  const s = spacing.map((x) => `  --gm-space-${x.token}: ${x.value}px;`)
  return `:root {\n${[...lines, ...r, ...s].join("\n")}\n}`
}

export function jsonExport(): string {
  const colors = Object.fromEntries(flatColorTokens().map((t) => [t.name, t.value]))
  const obj = {
    colors,
    radius: Object.fromEntries(radii.map((x) => [x.token, x.value])),
    spacing: Object.fromEntries(spacing.map((x) => [x.token, x.value])),
    fontSize: Object.fromEntries(fontSizes.map((x) => [x.token, x.value])),
  }
  return JSON.stringify(obj, null, 2)
}

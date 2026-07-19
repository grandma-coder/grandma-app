"use client"
import { useState } from "react"
import Image from "next/image"
import {
  COLOR_GROUPS,
  diffuseFields,
  fonts,
  typeRoles,
  radii,
  blurs,
  grain,
  stickers,
  cssVarsExport,
  jsonExport,
  type Swatch,
} from "@/lib/design-tokens"

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null)
  function copy(text: string, key: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1200)
    })
  }
  return { copied, copy }
}

function isDark(hex: string): boolean {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex.includes("0.55") || hex.startsWith("#1") || hex.startsWith("#2")
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return 0.299 * r + 0.587 * g + 0.114 * b < 140
}

function SwatchTile({ s, onCopy, copiedKey }: { s: Swatch; onCopy: (v: string, k: string) => void; copiedKey: string | null }) {
  const key = `${s.name}:${s.value}`
  const dark = isDark(s.value)
  return (
    <button
      onClick={() => onCopy(s.value, key)}
      className="group overflow-hidden rounded-xl border border-border-default text-left transition-shadow hover:shadow-[var(--shadow-md)]"
    >
      <div className="flex h-16 items-end p-2" style={{ background: s.value }}>
        <span className={`font-mono text-[10px] ${dark ? "text-white/80" : "text-black/60"}`}>
          {copiedKey === key ? "copied ✓" : "copy"}
        </span>
      </div>
      <div className="bg-card px-2.5 py-1.5">
        <p className="font-mono text-xs font-medium text-fg-primary">{s.name}</p>
        <p className="font-mono text-[10px] text-fg-tertiary">{s.value}</p>
        {s.note && <p className="mt-0.5 text-[10px] leading-tight text-fg-muted">{s.note}</p>}
      </div>
    </button>
  )
}

/** Render one sticker as inline web SVG at a given size + fill. */
function Sticker({ def, size = 56 }: { def: (typeof stickers)[number]; size?: number }) {
  return (
    <svg width={size} height={size} viewBox={def.viewBox}>
      {def.paths.map((d, i) => (
        <path key={i} d={d} fill={i === 0 ? def.fill : "none"} stroke="#141313" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  )
}

const SECTIONS = ["Fields", "Colors", "Type", "Shape", "Stickers", "Brand", "Emails", "Export"] as const

export function TokensView() {
  const { copied, copy } = useCopy()
  const [tab, setTab] = useState<(typeof SECTIONS)[number]>("Fields")
  const [email, setEmail] = useState("confirm-signup")

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-1.5">
        {SECTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === s ? "bg-accent-500 text-white" : "border border-border-default text-fg-tertiary hover:text-fg-primary"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* FIELDS — the per-behavior generative gradients */}
      {tab === "Fields" && (
        <div className="space-y-4">
          <p className="text-sm text-fg-tertiary">
            The only thing that changes per behavior under Diffuse: a 4-stop generative gradient field (g1→g4) plus one
            accent for CTA/ink moments. Type + icons stay identical across behaviors.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {diffuseFields.map((f) => (
              <div key={f.key} className="overflow-hidden rounded-2xl border border-border-default shadow-[var(--shadow-sm)]">
                <div
                  className="relative h-40"
                  style={{
                    background: `radial-gradient(120% 120% at 15% 15%, ${f.g1} 0%, transparent 55%), radial-gradient(120% 120% at 85% 25%, ${f.g2} 0%, transparent 55%), radial-gradient(120% 120% at 25% 90%, ${f.g3} 0%, transparent 55%), radial-gradient(120% 120% at 90% 85%, ${f.g4} 0%, transparent 55%), ${f.g2}`,
                  }}
                >
                  <span
                    className="absolute bottom-3 left-3 rounded-full px-3 py-1 text-xs font-semibold text-white shadow"
                    style={{ background: f.accent }}
                  >
                    accent {f.accent}
                  </span>
                </div>
                <div className="bg-card px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-fg-primary">{f.label}</p>
                    <button
                      onClick={() => copy(JSON.stringify({ g1: f.g1, g2: f.g2, g3: f.g3, g4: f.g4, accent: f.accent }), f.key)}
                      className="font-mono text-[10px] text-fg-muted hover:text-fg-primary"
                    >
                      {copied === f.key ? "copied ✓" : "copy field"}
                    </button>
                  </div>
                  <p className="mt-0.5 text-xs text-fg-muted">{f.note}</p>
                  <div className="mt-2 flex gap-1">
                    {[f.g1, f.g2, f.g3, f.g4, f.accent, f.accentSoft].map((c) => (
                      <span key={c} className="h-5 flex-1 rounded" style={{ background: c }} title={c} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COLORS — neutrals + status */}
      {tab === "Colors" && (
        <div className="space-y-8">
          {COLOR_GROUPS.map((g) => (
            <section key={g.title}>
              <h2 className="display text-base font-semibold text-fg-primary">{g.title}</h2>
              {g.blurb && <p className="mt-0.5 mb-3 text-sm text-fg-tertiary">{g.blurb}</p>}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {g.swatches.map((s) => (
                  <SwatchTile key={s.name} s={s} onCopy={copy} copiedKey={copied} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* TYPE */}
      {tab === "Type" && (
        <div className="space-y-6">
          <section className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
            <h2 className="display mb-1 text-base font-semibold text-fg-primary">Type roles</h2>
            <p className="mb-4 text-sm text-fg-tertiary">Assign by meaning, never by size — the one clear Diffuse rule.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {typeRoles.map((t) => (
                <div key={t.role} className="rounded-lg border border-border-subtle bg-deep p-3">
                  <p className="font-mono text-xs text-accent-500">{t.role}</p>
                  <p className="text-xs text-fg-secondary">{t.font}</p>
                  <p className="mt-1 text-xs text-fg-muted">{t.use}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
            <h2 className="display mb-4 text-base font-semibold text-fg-primary">Font families</h2>
            <div className="space-y-4">
              {fonts.map((f) => (
                <div key={f.token} className="border-b border-border-subtle pb-4 last:border-0 last:pb-0">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-xs text-accent-500">{f.token}</span>
                    <button onClick={() => copy(f.token, f.token)} className="font-mono text-[10px] text-fg-muted hover:text-fg-primary">
                      {copied === f.token ? "copied ✓" : "copy"}
                    </button>
                  </div>
                  <p className="mt-1 text-2xl text-fg-primary" style={{ fontFamily: f.cssStack }}>
                    Grandma is here for you
                  </p>
                  <p className="mt-0.5 text-xs text-fg-tertiary">{f.family} · {f.role}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* SHAPE — radius + blur + grain */}
      {tab === "Shape" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
            <h2 className="display mb-4 text-base font-semibold text-fg-primary">Radius</h2>
            <div className="space-y-3">
              {radii.map((r) => (
                <div key={r.token} className="flex items-center gap-4">
                  <div className="size-12 shrink-0 border border-accent-400 bg-accent-500/15" style={{ borderRadius: Math.min(r.value, 28) }} />
                  <div>
                    <p className="font-mono text-sm text-fg-primary">diffuseRadius.{r.token} · {r.value}px</p>
                    <p className="text-xs text-fg-muted">{r.use}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="space-y-6">
            <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
              <h2 className="display mb-4 text-base font-semibold text-fg-primary">Blur</h2>
              <div className="space-y-2">
                {blurs.map((b) => (
                  <div key={b.token} className="flex items-baseline justify-between">
                    <p className="font-mono text-sm text-fg-primary">diffuseBlur.{b.token} · {b.value}px</p>
                    <p className="text-xs text-fg-muted">{b.use}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
              <h2 className="display mb-2 text-base font-semibold text-fg-primary">Grain</h2>
              <p className="font-mono text-xs text-fg-secondary">
                fractalNoise · baseFrequency {grain.baseFrequency} · {grain.numOctaves} octaves · opacity {grain.opacityLight} (light) / {grain.opacityDark} (dark)
              </p>
              <p className="mt-2 text-xs text-fg-muted">Laid over gradient fields for the soft grainy look.</p>
            </div>
          </section>
        </div>
      )}

      {/* STICKERS */}
      {tab === "Stickers" && (
        <div className="space-y-4">
          <p className="text-sm text-fg-tertiary">
            The icon system — active under Diffuse (not legacy). A representative set rendered from the app&apos;s SVG
            paths. Full set (52) lives in <span className="font-mono text-xs">grandma-app/components/ui/Stickers.tsx</span>.
          </p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {stickers.map((s) => (
              <div key={s.name} className="flex flex-col items-center gap-2 rounded-xl border border-border-default bg-card p-4 shadow-[var(--shadow-sm)]">
                <Sticker def={s} />
                <span className="font-mono text-xs text-fg-secondary">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BRAND — logo */}
      {tab === "Brand" && (
        <div className="space-y-4">
          <p className="text-sm text-fg-tertiary">The app icon / logo mark.</p>
          <div className="flex flex-wrap items-center gap-6">
            {[128, 64, 40].map((sz) => (
              <div key={sz} className="flex flex-col items-center gap-2">
                <div className="overflow-hidden rounded-2xl border border-border-default shadow-[var(--shadow-sm)]">
                  <Image src="/grandma-app-icon.png" alt="grandma.app" width={sz} height={sz} />
                </div>
                <span className="font-mono text-[10px] text-fg-muted">{sz}px</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EMAILS */}
      {tab === "Emails" && (
        <div className="space-y-4">
          <div className="flex gap-1.5">
            {[
              { id: "confirm-signup", label: "Confirm signup" },
              { id: "magic-link", label: "Magic link" },
              { id: "invite", label: "Invite" },
            ].map((e) => (
              <button
                key={e.id}
                onClick={() => setEmail(e.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  email === e.id ? "bg-accent-500 text-white" : "border border-border-default text-fg-tertiary hover:text-fg-primary"
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
          <p className="text-sm text-fg-tertiary">
            Branded Supabase auth emails, Diffuse-styled. Paste from{" "}
            <span className="font-mono text-xs">grandma-app/supabase/email-templates/</span> into Supabase → Auth →
            Email Templates.
          </p>
          <div className="overflow-hidden rounded-xl border border-border-default shadow-[var(--shadow-sm)]">
            <iframe key={email} src={`/email-previews/${email}.html`} title={email} className="h-[560px] w-full bg-white" />
          </div>
        </div>
      )}

      {/* EXPORT */}
      {tab === "Export" && (
        <div className="space-y-6">
          {[
            { label: "CSS variables", code: cssVarsExport(), key: "css" },
            { label: "JSON", code: jsonExport(), key: "json" },
          ].map((x) => (
            <section key={x.key} className="rounded-xl border border-border-default bg-card shadow-[var(--shadow-sm)]">
              <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
                <h2 className="display text-base font-semibold text-fg-primary">{x.label}</h2>
                <button onClick={() => copy(x.code, x.key)} className="rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-600">
                  {copied === x.key ? "Copied ✓" : "Copy all"}
                </button>
              </div>
              <pre className="max-h-[360px] overflow-auto px-5 py-4 font-mono text-xs leading-relaxed text-fg-secondary">{x.code}</pre>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

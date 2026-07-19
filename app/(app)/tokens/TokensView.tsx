"use client"
import { useState } from "react"
import {
  COLOR_GROUPS,
  fonts,
  fontSizes,
  radii,
  spacing,
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

/** True if the value reads dark enough to warrant light text on top. */
function isDark(hex: string): boolean {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex.includes("0.18") || hex.startsWith("#1") || hex.startsWith("#2")
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
          {copiedKey === key ? "copied ✓" : "click to copy"}
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

const SECTIONS = ["Colors", "Type", "Radius & spacing", "Emails", "Export"] as const

export function TokensView() {
  const { copied, copy } = useCopy()
  const [tab, setTab] = useState<(typeof SECTIONS)[number]>("Colors")
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

      {/* COLORS */}
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
          <section className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
            <h2 className="display mb-4 text-base font-semibold text-fg-primary">Font sizes</h2>
            <div className="space-y-2">
              {fontSizes.map((s) => (
                <div key={s.token} className="flex items-baseline gap-4">
                  <span className="w-24 shrink-0 font-mono text-xs text-fg-tertiary">{s.token} · {s.value}</span>
                  <span className="truncate text-fg-primary" style={{ fontSize: Math.min(s.value, 40) }}>
                    Aa the quick brown fox
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* RADIUS & SPACING */}
      {tab === "Radius & spacing" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
            <h2 className="display mb-4 text-base font-semibold text-fg-primary">Radius</h2>
            <div className="space-y-3">
              {radii.map((r) => (
                <div key={r.token} className="flex items-center gap-4">
                  <div
                    className="size-12 shrink-0 border border-accent-400 bg-accent-500/15"
                    style={{ borderRadius: Math.min(r.value, 24) }}
                  />
                  <div>
                    <p className="font-mono text-sm text-fg-primary">radius.{r.token} · {r.value}px</p>
                    <p className="text-xs text-fg-muted">{r.use}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
            <h2 className="display mb-4 text-base font-semibold text-fg-primary">Spacing</h2>
            <div className="space-y-3">
              {spacing.map((sp) => (
                <div key={sp.token} className="flex items-center gap-4">
                  <div className="h-4 bg-accent-500" style={{ width: sp.value }} />
                  <p className="font-mono text-sm text-fg-primary">spacing.{sp.token} · {sp.value}px</p>
                </div>
              ))}
            </div>
          </section>
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
            Branded Supabase auth emails. Paste from <span className="font-mono text-xs">grandma-app/supabase/email-templates/</span>{" "}
            into Supabase → Auth → Email Templates. {"{{ .ConfirmationURL }}"} shows as literal text here; Supabase fills it at send time.
          </p>
          <div className="overflow-hidden rounded-xl border border-border-default shadow-[var(--shadow-sm)]">
            <iframe
              key={email}
              src={`/email-previews/${email}.html`}
              title={email}
              className="h-[560px] w-full bg-white"
            />
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
                <button
                  onClick={() => copy(x.code, x.key)}
                  className="rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-600"
                >
                  {copied === x.key ? "Copied ✓" : "Copy all"}
                </button>
              </div>
              <pre className="max-h-[360px] overflow-auto px-5 py-4 font-mono text-xs leading-relaxed text-fg-secondary">
                {x.code}
              </pre>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

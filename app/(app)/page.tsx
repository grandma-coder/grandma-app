import Link from "next/link"
import { createContext } from "@/server/context"

/**
 * Home / overview. Behind the Clerk gate; rendered inside the Central app shell
 * (sidebar provides brand + profile), so this is just the page body: a title
 * row + the pillar grid. A signed-in-but-not-allowlisted user sees "no access".
 */
export default async function Home() {
  const ctx = await createContext()

  if (!ctx.allowed) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="display text-2xl font-semibold text-fg-primary">No access</h1>
        <p className="max-w-md text-fg-secondary">
          You&apos;re signed in as{" "}
          <span className="font-medium text-fg-primary">{ctx.userEmail ?? "unknown"}</span>, but
          this address isn&apos;t on the command-center team allowlist.
        </p>
      </main>
    )
  }

  const pillars = [
    { name: "Users", href: "/users", ready: true, blurb: "Browse & search all app users" },
    { name: "Metrics", href: "/metrics", ready: true, blurb: "KPIs, funnels, retention" },
    { name: "Push", href: "/push", ready: true, blurb: "Compose & send notifications" },
    { name: "Sentry", href: "/sentry", ready: false, blurb: "Crash triage" },
  ]

  return (
    <main className="mx-auto max-w-5xl px-8 py-10">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">Overview</p>
      <h1 className="display text-3xl font-bold tracking-tight text-fg-primary">grandma.app</h1>
      <p className="mt-2 max-w-2xl text-sm text-fg-tertiary">
        Internal console for users, metrics, push notifications, and crash triage.
        You&apos;re signed in as {ctx.userEmail} · <span className="text-accent-500">{ctx.role}</span>.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {pillars.map((p) => {
          const card = (
            <div
              data-ready={p.ready}
              className="h-full rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)] transition-all data-[ready=true]:cursor-pointer data-[ready=true]:hover:border-accent-400 data-[ready=true]:hover:shadow-[var(--shadow-md)]"
            >
              <div className="flex items-center justify-between">
                <h2 className="display text-lg font-semibold text-fg-primary">{p.name}</h2>
                {p.ready ? (
                  <span className="pill pill-info">ready</span>
                ) : (
                  <span className="rounded-full bg-deep px-2 py-0.5 text-xs text-fg-muted">coming soon</span>
                )}
              </div>
              <p className="mt-1 text-sm text-fg-tertiary">{p.blurb}</p>
            </div>
          )
          return p.ready ? (
            <Link key={p.name} href={p.href}>{card}</Link>
          ) : (
            <div key={p.name}>{card}</div>
          )
        })}
      </div>
    </main>
  )
}

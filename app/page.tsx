import { UserButton } from "@clerk/nextjs"
import Link from "next/link"
import { createContext } from "@/server/context"

/**
 * Home / landing. Behind the Clerk gate (proxy.ts). Resolves team context to
 * greet the user + reflect role; a signed-in-but-not-allowlisted user sees a
 * "no access" state. Styled with the mirrored mother-dashboard tokens.
 */
export default async function Home() {
  const ctx = await createContext()

  if (!ctx.allowed) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="font-display text-2xl font-semibold text-fg-primary">No access</h1>
        <p className="max-w-md text-fg-secondary">
          You&apos;re signed in as{" "}
          <span className="font-medium text-fg-primary">{ctx.userEmail ?? "unknown"}</span>, but
          this address isn&apos;t on the command-center team allowlist.
        </p>
        <div className="mt-2">
          <UserButton />
        </div>
      </main>
    )
  }

  const pillars = [
    { name: "Users", href: "/users", ready: true, blurb: "Browse & search all app users" },
    { name: "Metrics", href: "/metrics", ready: false, blurb: "KPIs, funnels, retention" },
    { name: "Push", href: "/push", ready: false, blurb: "Compose & send notifications" },
    { name: "Sentry", href: "/sentry", ready: false, blurb: "Crash triage" },
  ]

  return (
    <main className="mx-auto max-w-4xl p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-fg-primary">grandma command center</h1>
          <p className="mt-0.5 text-sm text-fg-tertiary">
            {ctx.userEmail} · role: <span className="font-medium text-accent-500">{ctx.role}</span>
          </p>
        </div>
        <UserButton />
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {pillars.map((p) => {
          const card = (
            <div
              data-ready={p.ready}
              className="h-full rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)] transition-all data-[ready=true]:cursor-pointer data-[ready=true]:hover:border-accent-400 data-[ready=true]:hover:shadow-[var(--shadow-md)]"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-medium text-fg-primary">{p.name}</h2>
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

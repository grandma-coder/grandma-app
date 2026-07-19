import { createContext } from "@/server/context"
import { OverviewDashboard } from "./OverviewDashboard"

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
    { name: "Users", href: "/users", blurb: "Browse & search all app users" },
    { name: "Metrics", href: "/metrics", blurb: "KPIs, funnels, retention" },
    { name: "Community", href: "/community", blurb: "Channels & forum activity" },
    { name: "Push", href: "/push", blurb: "Compose & send notifications" },
    { name: "Content", href: "/content", blurb: "Questions, affirmations, birth guide, news" },
    { name: "Design tokens", href: "/tokens", blurb: "Brand colors, type & email visuals" },
    { name: "Sentry", href: "/sentry", blurb: "Crash triage" },
    ...(ctx.role === "admin"
      ? [
          { name: "Beta testers", href: "/beta", blurb: "Invite & track app beta testers" },
          { name: "Admin", href: "/admin", blurb: "Invite teammates & manage roles" },
        ]
      : []),
  ]

  return (
    <main className="mx-auto max-w-6xl px-8 py-10">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">Overview</p>
      <h1 className="display text-3xl font-bold tracking-tight text-fg-primary">Grandma</h1>
      <p className="mt-2 max-w-2xl text-sm text-fg-tertiary">
        Live health of the whole app — users, engagement, subscriptions, community &amp; content.
        Signed in as {ctx.userEmail} · <span className="text-accent-500">{ctx.role}</span>.
      </p>

      <OverviewDashboard pillars={pillars} />
    </main>
  )
}

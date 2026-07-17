import { UserButton } from "@clerk/nextjs"
import Link from "next/link"
import { createContext } from "@/server/context"

/**
 * Home / landing. This route is behind the Clerk gate (proxy.ts), so only a
 * signed-in user reaches it. We additionally resolve the team context here to
 * greet the user and reflect their role. A signed-in-but-not-allowlisted user
 * sees a "no access" state rather than the console.
 */
export default async function Home() {
  const ctx = await createContext()

  if (!ctx.allowed) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-semibold">No access</h1>
        <p className="max-w-md text-zinc-600">
          You&apos;re signed in as{" "}
          <span className="font-medium">{ctx.userEmail ?? "unknown"}</span>, but this
          address isn&apos;t on the command-center team allowlist.
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
          <h1 className="text-2xl font-semibold">grandma command center</h1>
          <p className="text-sm text-zinc-500">
            {ctx.userEmail} · role: <span className="font-medium">{ctx.role}</span>
          </p>
        </div>
        <UserButton />
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {pillars.map((p) => {
          const card = (
            <div className="h-full rounded-xl border border-zinc-200 p-5 transition-colors dark:border-zinc-800 data-[ready=true]:hover:border-zinc-400 data-[ready=true]:cursor-pointer" data-ready={p.ready}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">{p.name}</h2>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
                  {p.ready ? "ready" : "coming soon"}
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-500">{p.blurb}</p>
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

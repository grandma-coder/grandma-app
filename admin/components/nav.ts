import {
  LayoutGrid, Users, BarChart3, Send, Bug, MessagesSquare, Shield, FlaskConical, Palette, BookOpen,
  Rocket, DollarSign, Sparkles, LifeBuoy, Share2, ListPlus, Map as MapIcon, type LucideIcon,
} from "lucide-react"

// label / title are keys into the "nav" messages. `badge` names the ops.attention count shown beside it.
export type Badge = "support" | "reports" | "waitlistToday"
export type NavLink = { href: string; label: string; icon: LucideIcon; adminOnly?: boolean; badge?: Badge }

export const PRIMARY: NavLink[] = [
  { href: "/", label: "home", icon: LayoutGrid },
]

// Pillars grouped by intent — how you'd navigate the business, not a flat list.
export type NavSection = { title: string; items: NavLink[] }

export const SECTIONS: NavSection[] = [
  {
    title: "audience",
    items: [
      { href: "/users", label: "users", icon: Users },
      { href: "/map", label: "map", icon: MapIcon },
      { href: "/waitlist", label: "waitlist", icon: ListPlus, badge: "waitlistToday" },
      { href: "/metrics", label: "metrics", icon: BarChart3 },
      { href: "/revenue", label: "revenue", icon: DollarSign },
      { href: "/graph", label: "graph", icon: Share2, adminOnly: true },
    ],
  },
  {
    title: "engage",
    items: [
      { href: "/community", label: "community", icon: MessagesSquare, badge: "reports" },
      { href: "/support", label: "support", icon: LifeBuoy, badge: "support" },
      { href: "/push", label: "push", icon: Send },
    ],
  },
  {
    title: "product",
    items: [
      { href: "/content", label: "content", icon: BookOpen },
      { href: "/releases", label: "releases", icon: Rocket },
      { href: "/tokens", label: "tokens", icon: Palette },
    ],
  },
  {
    title: "operations",
    items: [
      { href: "/ai", label: "ai", icon: Sparkles, adminOnly: true },
      { href: "/sentry", label: "sentry", icon: Bug, adminOnly: true },
    ],
  },
]

export const MANAGE: NavLink[] = [
  { href: "/beta", label: "beta", icon: FlaskConical, adminOnly: true },
  { href: "/admin", label: "admin", icon: Shield, adminOnly: true },
]

/** Every page a role can open, in sidebar order — the ⌘K palette lists these. */
export function navFor(isAdmin: boolean): (NavLink & { section: string | null })[] {
  const ok = (i: NavLink) => !i.adminOnly || isAdmin
  return [
    ...PRIMARY.filter(ok).map((i) => ({ ...i, section: null })),
    ...SECTIONS.flatMap((s) => s.items.filter(ok).map((i) => ({ ...i, section: s.title }))),
    ...MANAGE.filter(ok).map((i) => ({ ...i, section: "manage" })),
  ]
}

/** Badge tone: things waiting on a person are alerts; fresh signups are just news. */
export const ALERT_BADGES: ReadonlySet<Badge> = new Set(["support", "reports"])

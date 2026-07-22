"use client"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useUser, UserButton } from "@clerk/nextjs"
import {
  LayoutGrid,
  Users,
  BarChart3,
  Send,
  Bug,
  MessagesSquare,
  Shield,
  FlaskConical,
  Palette,
  BookOpen,
  Rocket,
  DollarSign,
  Sparkles,
  LifeBuoy,
  Share2,
  type LucideIcon,
} from "lucide-react"

type NavLink = { href: string; label: string; icon: LucideIcon; adminOnly?: boolean }

const PRIMARY: NavLink[] = [
  { href: "/", label: "Command Center", icon: LayoutGrid },
]

// Pillars grouped by intent — how you'd navigate the business, not a flat list.
type NavSection = { title: string; items: NavLink[]; adminOnly?: boolean }

const SECTIONS: NavSection[] = [
  {
    title: "Audience",
    items: [
      { href: "/users", label: "Users", icon: Users },
      { href: "/metrics", label: "Metrics", icon: BarChart3 },
      { href: "/revenue", label: "Revenue", icon: DollarSign },
      { href: "/graph", label: "Relationships", icon: Share2, adminOnly: true },
    ],
  },
  {
    title: "Engage",
    items: [
      { href: "/community", label: "Community", icon: MessagesSquare },
      { href: "/push", label: "Push", icon: Send },
      { href: "/support", label: "Support", icon: LifeBuoy },
    ],
  },
  {
    title: "Product",
    items: [
      { href: "/content", label: "Content", icon: BookOpen },
      { href: "/releases", label: "Releases", icon: Rocket },
      { href: "/tokens", label: "Design tokens", icon: Palette },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/ai", label: "AI cost", icon: Sparkles, adminOnly: true },
      { href: "/sentry", label: "Sentry", icon: Bug, adminOnly: true },
    ],
  },
]

const MANAGE: NavLink[] = [
  { href: "/beta", label: "Beta testers", icon: FlaskConical, adminOnly: true },
  { href: "/admin", label: "Admin", icon: Shield, adminOnly: true },
]

// Which pillars are actually built yet (routes that exist). Others render
// disabled so the nav reflects reality without dead links.
const READY = new Set(["/", "/users", "/metrics", "/revenue", "/graph", "/community", "/push", "/ai", "/support", "/sentry", "/tokens", "/content", "/releases", "/admin", "/beta"])

export function CommandCenterSidebar() {
  const pathname = usePathname() ?? ""
  const { user } = useUser()
  const name = user?.firstName ?? user?.username ?? "You"
  const role = (user?.publicMetadata as { role?: string } | undefined)?.role ?? "viewer"
  const isAdmin = role === "admin"

  const matchPath = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/")

  const renderItem = (i: NavLink) => {
    const hidden = i.adminOnly && !isAdmin
    if (hidden) return null
    const ready = READY.has(i.href)
    const cls = `nav-item ${matchPath(i.href) ? "on" : ""} ${ready ? "" : "disabled"}`
    const Icon = i.icon
    const inner = (
      <>
        <Icon size={15} />
        <span>{i.label}</span>
      </>
    )
    return ready ? (
      <Link key={i.href} href={i.href} className={cls}>{inner}</Link>
    ) : (
      <span key={i.href} className={cls} title="coming soon">{inner}</span>
    )
  }

  return (
    <aside className="central-sidebar">
      <div className="brand">
        <Image
          src="/grandma-icon.png"
          alt="grandma.app"
          width={28}
          height={28}
          className="brand-logo"
          priority
        />
        <span className="brand-name">Command Center</span>
      </div>

      <nav className="central-nav">
        <div>{PRIMARY.map(renderItem)}</div>
        {SECTIONS.map((section) => {
          // Hide a whole section (header included) when every item in it is
          // admin-only and the viewer isn't an admin — no empty labels.
          const visible = section.items.filter((i) => !(i.adminOnly && !isAdmin))
          if (visible.length === 0) return null
          return (
            <div key={section.title}>
              <div className="nav-section-header">{section.title}</div>
              <div>{visible.map(renderItem)}</div>
            </div>
          )
        })}
        {isAdmin && (
          <>
            <div className="nav-section-header">Manage</div>
            <div>{MANAGE.map(renderItem)}</div>
          </>
        )}
      </nav>

      <div className="sidebar-foot">
        <div className="user-card">
          <UserButton
            appearance={{ elements: { userButtonAvatarBox: { width: 24, height: 24 } } }}
          />
          <div className="flex flex-col leading-tight">
            <span className="uc-name">{name}</span>
            <span className="uc-role">{role}</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

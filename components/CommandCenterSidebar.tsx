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
  type LucideIcon,
} from "lucide-react"

type NavLink = { href: string; label: string; icon: LucideIcon; adminOnly?: boolean }

const PRIMARY: NavLink[] = [
  { href: "/", label: "Command Center", icon: LayoutGrid },
]

const PILLARS: NavLink[] = [
  { href: "/users", label: "Users", icon: Users },
  { href: "/metrics", label: "Metrics", icon: BarChart3 },
  { href: "/community", label: "Community", icon: MessagesSquare },
  { href: "/push", label: "Push", icon: Send },
  { href: "/sentry", label: "Sentry", icon: Bug, adminOnly: true },
]

// Which pillars are actually built yet (routes that exist). Others render
// disabled so the nav reflects reality without dead links.
const READY = new Set(["/", "/users", "/metrics", "/community", "/push", "/sentry"])

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
        <div className="nav-section-header">Pillars</div>
        <div>{PILLARS.map(renderItem)}</div>
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

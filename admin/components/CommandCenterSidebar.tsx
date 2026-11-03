"use client"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useUser, UserButton } from "@clerk/nextjs"
import { useTranslations } from "next-intl"
import { LocaleSwitcher } from "./LocaleSwitcher"
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
  ListPlus,
  type LucideIcon,
} from "lucide-react"

// label / title are keys into the "nav" messages
type NavLink = { href: string; label: string; icon: LucideIcon; adminOnly?: boolean }

const PRIMARY: NavLink[] = [
  { href: "/", label: "home", icon: LayoutGrid },
]

// Pillars grouped by intent — how you'd navigate the business, not a flat list.
type NavSection = { title: string; items: NavLink[]; adminOnly?: boolean }

const SECTIONS: NavSection[] = [
  {
    title: "audience",
    items: [
      { href: "/users", label: "users", icon: Users },
      { href: "/metrics", label: "metrics", icon: BarChart3 },
      { href: "/revenue", label: "revenue", icon: DollarSign },
      { href: "/waitlist", label: "waitlist", icon: ListPlus },
      { href: "/graph", label: "graph", icon: Share2, adminOnly: true },
    ],
  },
  {
    title: "engage",
    items: [
      { href: "/community", label: "community", icon: MessagesSquare },
      { href: "/push", label: "push", icon: Send },
      { href: "/support", label: "support", icon: LifeBuoy },
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

const MANAGE: NavLink[] = [
  { href: "/beta", label: "beta", icon: FlaskConical, adminOnly: true },
  { href: "/admin", label: "admin", icon: Shield, adminOnly: true },
]

// Which pillars are actually built yet (routes that exist). Others render
// disabled so the nav reflects reality without dead links.
const READY = new Set(["/", "/users", "/metrics", "/revenue", "/graph", "/community", "/push", "/ai", "/support", "/sentry", "/tokens", "/content", "/releases", "/admin", "/beta", "/waitlist"])

export function CommandCenterSidebar() {
  const pathname = usePathname() ?? ""
  const t = useTranslations("nav")
  const { user } = useUser()
  const name = user?.firstName ?? user?.username ?? t("you")
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
        <span>{t(`items.${i.label}`)}</span>
      </>
    )
    return ready ? (
      <Link key={i.href} href={i.href} className={cls}>{inner}</Link>
    ) : (
      <span key={i.href} className={cls} title={t("comingSoon")}>{inner}</span>
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
        <span className="brand-name">{t("brand")}</span>
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
              <div className="nav-section-header">{t(`sections.${section.title}`)}</div>
              <div>{visible.map(renderItem)}</div>
            </div>
          )
        })}
        {isAdmin && (
          <>
            <div className="nav-section-header">{t("sections.manage")}</div>
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
            <span className="uc-role">{t.has(`roles.${role}`) ? t(`roles.${role}`) : role}</span>
          </div>
        </div>
        <LocaleSwitcher />
      </div>
    </aside>
  )
}

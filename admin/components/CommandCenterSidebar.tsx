"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useUser, UserButton } from "@clerk/nextjs"
import { useTranslations } from "next-intl"
import { Menu, Search, X } from "lucide-react"
import { LocaleSwitcher } from "./LocaleSwitcher"
import { CommandPalette } from "./CommandPalette"
import { trpc } from "@/lib/trpc"
import { PRIMARY, SECTIONS, MANAGE, ALERT_BADGES, type NavLink } from "./nav"

export function CommandCenterSidebar() {
  const pathname = usePathname() ?? ""
  const t = useTranslations("nav")
  const { user } = useUser()
  const name = user?.firstName ?? user?.username ?? t("you")
  const role = (user?.publicMetadata as { role?: string } | undefined)?.role ?? "viewer"
  const isAdmin = role === "admin"
  const [open, setOpen] = useState(false) // mobile drawer
  const [palette, setPalette] = useState(false)
  // Same numbers as the home "Precisa de você" tiles, so a badge and its tile never disagree.
  const attention = trpc.ops.attention.useQuery(undefined, { refetchInterval: 60_000, staleTime: 30_000 })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((v) => !v) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const matchPath = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/")

  const renderItem = (i: NavLink) => {
    if (i.adminOnly && !isAdmin) return null
    const Icon = i.icon
    const n = i.badge ? attention.data?.[i.badge] ?? 0 : 0
    return (
      <Link key={i.href} href={i.href} onClick={() => setOpen(false)} className={`nav-item ${matchPath(i.href) ? "on" : ""}`}>
        <Icon size={15} />
        <span>{t(`items.${i.label}`)}</span>
        {n > 0 && <b className={`nav-badge ${ALERT_BADGES.has(i.badge!) ? "alert" : ""}`} title={t(`badges.${i.badge}`, { n })}>{n > 99 ? "99+" : n}</b>}
      </Link>
    )
  }

  return (
    <>
      <div className="mobile-bar">
        <button onClick={() => setOpen(true)} aria-label={t("openMenu")}><Menu size={18} /></button>
        <Image src="/grandma-icon.png" alt="grandma.app" width={22} height={22} className="brand-logo" />
        <span className="brand-name">{t("brand")}</span>
        <button onClick={() => setPalette(true)} aria-label={t("search")} className="ml-auto"><Search size={18} /></button>
      </div>
      {open && <div className="sidebar-scrim" onClick={() => setOpen(false)} />}

      <aside className={`central-sidebar ${open ? "open" : ""}`}>
        <div className="brand">
          <Image src="/grandma-icon.png" alt="grandma.app" width={28} height={28} className="brand-logo" priority />
          <span className="brand-name">{t("brand")}</span>
          <button className="drawer-close" onClick={() => setOpen(false)} aria-label={t("closeMenu")}><X size={16} /></button>
        </div>

        <button className="nav-search" onClick={() => setPalette(true)}>
          <Search size={14} />
          <span>{t("search")}</span>
          <kbd>⌘K</kbd>
        </button>

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
            <UserButton appearance={{ elements: { userButtonAvatarBox: { width: 24, height: 24 } } }} />
            <div className="flex flex-col leading-tight">
              <span className="uc-name">{name}</span>
              <span className="uc-role">{t.has(`roles.${role}`) ? t(`roles.${role}`) : role}</span>
            </div>
          </div>
          <LocaleSwitcher />
        </div>
      </aside>

      {palette && <CommandPalette isAdmin={isAdmin} onClose={() => setPalette(false)} />}
    </>
  )
}

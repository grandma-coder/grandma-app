"use client"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { NotificationsTab } from "./NotificationsTab"
import { TemplatesTab } from "./TemplatesTab"
import { AiSettingsTab } from "./AiSettingsTab"
import { AnalyticsTab } from "./AnalyticsTab"

type Tab = "notifications" | "analytics" | "templates" | "ai"

const TABS: Tab[] = ["notifications", "analytics", "templates", "ai"]

export function NotificationsWorkspace({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations("push")
  const [tab, setTab] = useState<Tab>("notifications")

  return (
    <div>
      <div className="mb-6 flex gap-1.5">
        {TABS.map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === id
                ? "bg-accent-500 text-white"
                : "border border-border-default text-fg-tertiary hover:text-fg-primary"
            }`}
          >
            {t(`tabs.${id}`)}
          </button>
        ))}
      </div>

      {tab === "notifications" && <NotificationsTab isAdmin={isAdmin} />}
      {tab === "analytics" && <AnalyticsTab isAdmin={isAdmin} />}
      {tab === "templates" && <TemplatesTab isAdmin={isAdmin} />}
      {tab === "ai" && <AiSettingsTab isAdmin={isAdmin} />}
    </div>
  )
}

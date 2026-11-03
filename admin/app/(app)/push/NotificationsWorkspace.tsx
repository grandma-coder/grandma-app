"use client"
import { useState } from "react"
import { NotificationsTab } from "./NotificationsTab"
import { TemplatesTab } from "./TemplatesTab"
import { AiSettingsTab } from "./AiSettingsTab"
import { AnalyticsTab } from "./AnalyticsTab"

type Tab = "notifications" | "analytics" | "templates" | "ai"

const TABS: { id: Tab; label: string }[] = [
  { id: "notifications", label: "Notifications" },
  { id: "analytics", label: "Analytics" },
  { id: "templates", label: "App Templates" },
  { id: "ai", label: "AI Settings" },
]

export function NotificationsWorkspace({ isAdmin }: { isAdmin: boolean }) {
  const [tab, setTab] = useState<Tab>("notifications")

  return (
    <div>
      <div className="mb-6 flex gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-accent-500 text-white"
                : "border border-border-default text-fg-tertiary hover:text-fg-primary"
            }`}
          >
            {t.label}
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

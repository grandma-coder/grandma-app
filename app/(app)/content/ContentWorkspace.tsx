"use client"
import { useState } from "react"
import { DailyQuestionsEditor } from "./DailyQuestionsEditor"

type Tab = "questions" | "affirmations" | "birth"

const TABS: { id: Tab; label: string; ready: boolean }[] = [
  { id: "questions", label: "Daily questions", ready: true },
  { id: "affirmations", label: "Affirmations", ready: false },
  { id: "birth", label: "Birth guide", ready: false },
]

export function ContentWorkspace({ isAdmin }: { isAdmin: boolean }) {
  const [tab, setTab] = useState<Tab>("questions")

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => t.ready && setTab(t.id)}
            disabled={!t.ready}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-accent-500 text-white"
                : t.ready
                  ? "border border-border-default text-fg-tertiary hover:text-fg-primary"
                  : "border border-border-subtle text-fg-muted cursor-not-allowed"
            }`}
          >
            {t.label}
            {!t.ready && <span className="ml-1.5 text-[10px]">soon</span>}
          </button>
        ))}
      </div>

      {tab === "questions" && <DailyQuestionsEditor isAdmin={isAdmin} />}
    </div>
  )
}

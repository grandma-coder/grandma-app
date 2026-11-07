"use client"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { DailyQuestionsEditor } from "./DailyQuestionsEditor"
import { AffirmationsEditor } from "./AffirmationsEditor"
import { BirthGuideEditor } from "./BirthGuideEditor"
import { SourcesEditor } from "./SourcesEditor"
import { NewsEditor } from "./NewsEditor"

type Tab = "questions" | "affirmations" | "birth" | "sources" | "news"

const TABS: { id: Tab; ready: boolean }[] = [
  { id: "questions", ready: true },
  { id: "affirmations", ready: true },
  { id: "birth", ready: true },
  { id: "sources", ready: true },
  { id: "news", ready: true },
]

export function ContentWorkspace({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations("content.tabs")
  const [tab, setTab] = useState<Tab>("questions")

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-1.5">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            onClick={() => tb.ready && setTab(tb.id)}
            disabled={!tb.ready}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === tb.id
                ? "bg-accent-500 text-white"
                : tb.ready
                  ? "border border-border-default text-fg-tertiary hover:text-fg-primary"
                  : "border border-border-subtle text-fg-muted cursor-not-allowed"
            }`}
          >
            {t(tb.id)}
            {!tb.ready && <span className="ml-1.5 text-[10px]">{t("soon")}</span>}
          </button>
        ))}
      </div>

      {tab === "questions" && <DailyQuestionsEditor isAdmin={isAdmin} />}
      {tab === "affirmations" && <AffirmationsEditor isAdmin={isAdmin} />}
      {tab === "birth" && <BirthGuideEditor isAdmin={isAdmin} />}
      {tab === "sources" && <SourcesEditor isAdmin={isAdmin} />}
      {tab === "news" && <NewsEditor isAdmin={isAdmin} />}
    </div>
  )
}

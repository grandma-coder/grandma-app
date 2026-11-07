"use client"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { trpc } from "@/lib/trpc"

export function AiSettingsTab({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations("push")
  const utils = trpc.useUtils()
  const settings = trpc.notificationCopy.getSettings.useQuery()
  const setPrompt = trpc.notificationCopy.setPrompt.useMutation({
    onSuccess: () => {
      setNotice(t("ai.saved"))
      utils.notificationCopy.getSettings.invalidate()
    },
    onError: (e) => setNotice(e.message),
  })

  const saved = settings.data?.suggestSystemPrompt ?? ""
  const builtIn = settings.data?.defaultSuggestSystemPrompt ?? ""
  const available = settings.data?.suggestAvailable ?? false

  const [showDefault, setShowDefault] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  // Prefill the editor with the effective prompt (saved override, else built-in)
  // the first time settings arrive, without an effect: reset local edit state
  // during render when the loaded baseline changes (React's derived-state pattern).
  const effective = saved || builtIn
  const [baseline, setBaseline] = useState<string | null>(null)
  const [edited, setEdited] = useState("")
  if (settings.data && baseline !== effective) {
    setBaseline(effective)
    setEdited(effective)
  }
  const prompt = edited
  const setPromptText = setEdited

  const usingDefault = !saved
  const dirty = prompt !== (saved || builtIn)
  const matchesDefault = prompt.trim() === builtIn.trim()

  function save() {
    setNotice(null)
    // Sending the default text (or empty) reverts to built-in on the server.
    setPrompt.mutate({ suggestSystemPrompt: matchesDefault ? "" : prompt })
  }

  if (settings.isLoading) return <p className="text-sm text-fg-tertiary">{t("loading")}</p>

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
        <h2 className="display text-base font-semibold text-fg-primary">{t("ai.heading")}</h2>
        <p className="mt-1 text-sm text-fg-tertiary">
          {t.rich("ai.intro", { b: (c) => <span className="font-medium">{c}</span> })}
        </p>

        <div className="mt-3 flex items-center gap-2 rounded-lg border border-border-subtle bg-deep px-3 py-2 text-xs text-fg-tertiary">
          <span>
            {t("ai.currentlyUsing")}{" "}
            <span className="font-medium text-fg-secondary">{usingDefault ? t("ai.usingDefault") : t("ai.usingCustom")}</span>
          </span>
          {!available && (
            <span className="ml-auto rounded-full bg-[var(--pill-warning-bg)] px-2 py-0.5 text-[var(--pill-warning-fg)]">
              {t("ai.suggestDisabled")}
            </span>
          )}
        </div>

        {isAdmin ? (
          <>
            <textarea
              value={prompt}
              onChange={(e) => setPromptText(e.target.value)}
              rows={18}
              maxLength={10000}
              className="mt-3 w-full rounded-lg border border-border-default bg-deep px-3 py-2 font-mono text-xs text-fg-primary focus:border-accent-400 focus:outline-none"
            />
            <div className="mt-1 text-right text-[10px] text-fg-muted">{prompt.length}/10000</div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={save}
                disabled={setPrompt.isPending || !dirty}
                className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-40"
              >
                {setPrompt.isPending ? t("ai.saving") : matchesDefault ? t("ai.saveRevert") : t("save")}
              </button>
              <button
                onClick={() => setPromptText(saved || builtIn)}
                disabled={!dirty}
                className="rounded-lg px-3 py-2 text-sm font-medium text-fg-tertiary hover:text-fg-primary disabled:opacity-40"
              >
                {t("ai.discard")}
              </button>
              <button
                onClick={() => setPromptText(builtIn)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-fg-tertiary hover:text-fg-primary"
              >
                {t("ai.reset")}
              </button>
              <button
                onClick={() => setShowDefault((v) => !v)}
                className="ml-auto rounded-lg px-3 py-2 text-sm font-medium text-fg-tertiary hover:text-fg-primary"
              >
                {showDefault ? t("ai.hideDefault") : t("ai.viewDefault")}
              </button>
            </div>
            {notice && <p className="mt-2 text-sm text-accent-500">{notice}</p>}
          </>
        ) : (
          <>
            <div className="mt-3 rounded-lg border border-border-subtle bg-deep p-3 text-xs text-fg-muted">
              {t("ai.viewOnly")}
            </div>
            <pre className="mt-3 max-h-[400px] overflow-y-auto rounded-lg border border-border-default bg-deep p-3 font-mono text-xs whitespace-pre-wrap text-fg-secondary">
              {saved || builtIn}
            </pre>
          </>
        )}
      </div>

      {showDefault && isAdmin && (
        <div className="rounded-xl border border-border-default bg-card p-5 shadow-[var(--shadow-sm)]">
          <h3 className="display mb-2 text-sm font-semibold text-fg-primary">
            {t("ai.builtInHeading", { n: builtIn.length })}
          </h3>
          <pre className="max-h-[400px] overflow-y-auto rounded-lg border border-border-subtle bg-deep p-3 font-mono text-xs whitespace-pre-wrap text-fg-secondary">
            {builtIn}
          </pre>
        </div>
      )}
    </div>
  )
}

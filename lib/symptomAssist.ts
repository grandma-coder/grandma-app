/**
 * Symptom-triggered Grandma (Phase 2). When a user logs a symptom, we offer to
 * open Grandma with that symptom pre-loaded as context — making the AI proactive
 * (Flo's is reactive). Reuses grandma-talk's existing `insightContext` param, so
 * no edge-function change is needed; Grandma greets with the symptom and invites
 * the question.
 *
 * Pure helpers (no React) so any log form can call them.
 */

import { router } from 'expo-router'

/**
 * Build the context string handed to grandma-talk for a set of logged symptoms.
 * Kept short + natural so Grandma's greeting reads well.
 */
export function symptomContext(labels: string[]): string {
  const clean = labels.map((l) => l.trim()).filter(Boolean)
  if (clean.length === 0) return ''
  if (clean.length === 1) return clean[0].toLowerCase()
  if (clean.length === 2) return `${clean[0].toLowerCase()} and ${clean[1].toLowerCase()}`
  return `${clean.slice(0, -1).map((l) => l.toLowerCase()).join(', ')}, and ${clean[clean.length - 1].toLowerCase()}`
}

/** Open Grandma with the given symptom labels pre-loaded as context. */
export function askGrandmaAboutSymptoms(labels: string[]): void {
  const ctx = symptomContext(labels)
  if (!ctx) return
  router.push({
    pathname: '/grandma-talk',
    params: { insightContext: ctx },
  })
}

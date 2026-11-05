/**
 * Bundled translations for one language of the cycle (pre-pregnancy) pillar screens.
 * Flat map keyed by the SAME content keys the runtime translator uses
 * (`pillarContentKeys` in lib/pillarCopy.ts): `pillar_<id>_intro`,
 * `pillar_<id>_tip_<slug>_label`, `pillar_<id>_tip_<slug>`, `pillar_<id>_ask_<n>`.
 * English (lib/prePregPillars.ts) stays the source of truth — when an English tip
 * or intro changes, update every locale file in this folder in the same change.
 */
export type PillarContentLocale = Record<string, string>

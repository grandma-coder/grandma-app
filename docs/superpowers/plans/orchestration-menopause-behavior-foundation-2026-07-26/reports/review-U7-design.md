# Design review — U7 log forms + timeline (design-critic, sonnet)
Commit: 8e097a4 · Verdict: needs work (minor) — core Diffuse/token contract fully compliant

Compliant (checks 1-7): zero raw hex; NO token mixing (menoPalette Diffuse branch uses dt.radius/dt.colors,
current branch useTheme — mirrors U6 fix); radius.full only under !diffuse (Diffuse swaps radius.xl);
STICKER_SHADOW gated !diffuse everywhere; fonts token-sourced; Character blobs only (temperature/sleep/
mood/activity/heart/period/note/empty), no Lucide semantic icons; ember mode color via getModeColor/
getDiffuseAccent('menopause'); LogSheet + StepSlider reuse matches siblings.

Findings:
- P1: MenopauseTimeline empty-state CTA was a hand-rolled Pressable missing the press-stamp contract.
  -> FIXED in f6d29ce (added translateY press-stamp, current-only; kept ember tint — full PillButton
  adoption deferred as polish since variant='accent' would drop the ember color).
- P2: menoPalette has no textFaint tier (eyebrow labels use textMuted, one tier heavy). -> deferred (E1 polish).
- P2: letter-spacing drift on eyebrow labels (0.6/0.8 vs sibling 1.2-1.5). -> deferred.
- P2: generic "A symptom" chooser reuses the vasomotor `temperature` blob. -> deferred (semantic nuance).
- P2: severity StepSlider omits optional blob prop; loading-flash empty state (pre-existing, siblings same). -> deferred.
- P2: Alert.alert on save error violates DESIGN_SYSTEM but mirrors 100% of CycleLogForms/KidsLogForms precedent. -> accepted (coordinated fix later).

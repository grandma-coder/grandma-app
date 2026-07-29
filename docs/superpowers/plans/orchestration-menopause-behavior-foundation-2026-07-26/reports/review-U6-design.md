# Design review — U6 menopause onboarding (design-critic, sonnet)
Commit: 989d2ab · Score 7/10 — needs work (not blocking-critical)

Compliant: zero raw hex in JSX; ember mode color via getModeColor/getDiffuseAccent('menopause');
fonts token-sourced; PillButton CTA; Character blobs for all semantic icons (selfcare/phase/
sun/star/temperature/sleep/mood/activity/heart/calendar/health/medicine) + Sun sticker; auraMode=menopause.

Findings:
- P1(a) useMenoPalette Diffuse branch returned useTheme().radius (token mix); symptom chip used
  radius.full under Diffuse (no full pill in Diffuse). -> FIXED in a4535c2 (dt.radius; chip xl outline under Diffuse).
- P1(b) optionCard/chip/togglePill missing hard-offset sticker shadow (current variant) vs sibling. -> FIXED in a4535c2 (STICKER_SHADOW, current-only).
- P1(c) Diffuse variant recolors current filled-card shapes instead of the sibling's Diffuse
  selection primitives (MetaballBloom/BloomChips/PoleField). -> DEFERRED: scope decision (see ledger decision).
- P2 icon sizes (15/30/52 off standard set); spacing drift vs 8pt grid; i18n not wired (accepted E1 gap). -> deferred.

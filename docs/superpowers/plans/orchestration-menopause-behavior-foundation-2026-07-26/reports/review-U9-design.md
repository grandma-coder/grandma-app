# Design review — U9 MenopauseAnalytics (design-critic, sonnet)
Commit: 0cac21c · Verdict: COMPLIANT (0 P0, 0 P1)

All 8 checks pass: tokens only (0 raw hex); no token mixing (menoPalette single source, radius.full
gated !diffuse -> radius.xl); sticker shadow current-only on all 4 card surfaces; fonts token-sourced;
Character blobs ember-tinted (temperature/sleep/calendar/chart + symptomBlob), no Lucide semantics;
ember mode color via helper; charts (BarChart/LineChart) styled with palette.accent + intentional
low-data fallbacks; faithful sibling of CycleAnalytics (hero anatomy, StatTile grid, AnalyticsHeader).

P2 polish (deferred, non-blocking):
- SvgCharts BarChart/LineChart axis/grid/point colors come from useTheme (shared component, not this
  file); near-identical to Diffuse tokens so low impact. -> follow-up ticket on SvgCharts.tsx.
- No i18n (hardcoded English) — feature-wide accepted E1 gap.
- Local EmptyState/section-title reimpl instead of the already-Diffuse-aware shared components. -> consolidation later.
- No Pressable/detail-sheet tap-through on stat tiles (CycleAnalytics has them). -> deferred E1 scope.

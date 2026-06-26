// ESLint flat config — grandma.app
// Expo SDK 54 ships eslint-config-expo; the flat-config entry point is flat.js
// (verified: node_modules/eslint-config-expo/flat.js → returns an array of 13 config objects)

const expo = require('eslint-config-expo/flat')
const i18next = require('eslint-plugin-i18next')

module.exports = [
  // Ignore everything that is not yet migrated to i18n.
  // This keeps `npm run lint` green until each Phase B cluster is wired up.
  // Remove each entry from `ignores` as that cluster's /i18n-extract migration lands.
  //
  // NOTE: Global ignores (an object with *only* `ignores`) take precedence over
  // per-config `files` globs. lib/i18n/** must NOT be globally ignored — it is
  // the only currently-linted cluster. Everything else in lib/ is excluded below.
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      '.agents/**',
      '.claude/**',
      'dist/**',
      'web-build/**',
      'babel.config.js',
      'tailwind.config.js',
      'metro.config.js',
      // App source clusters — excluded until migrated via /i18n-extract
      'app/**',
      'components/**',
      'context/**',
      'store/**',
      'constants/**',
      'supabase/**',
      'scripts/**',
      'docs/**',
      'jest.setup.js',
      // lib/ — exclude everything EXCEPT lib/i18n (keep that linted)
      'lib/[!i]*/**',    // lib/analyticsData.ts, lib/auth-*.ts, etc. (non-i18n dirs)
      'lib/*.ts',        // top-level lib files
      'lib/*.tsx',
    ],
  },
  // Expo base config (TypeScript, React, React Native rules)
  ...expo,
  {
    // Scope: start narrow (lib/i18n data files only).
    // Expand this glob list as each screen cluster is migrated via /i18n-extract.
    // Target state (end of migration): 'app/**/*.tsx', 'components/**/*.tsx'
    // (minus dev-panel and sticker/SVG/chart asset files).
    //
    // lib/i18n/**/*.ts — key/value translation data with no JSX, so the rule
    // passes trivially and proves the plugin wiring without blocking the ~1,200
    // not-yet-migrated strings in the rest of the codebase.
    files: [
      'lib/i18n/**/*.ts',
      // B1 — Kids home + analytics
      'components/home/KidsHome.tsx',
      'components/analytics/KidsAnalytics.tsx',
      // B2 — Kids calendar / log forms / agenda
      'components/calendar/KidsLogForms.tsx',
      'components/calendar/KidsCalendar.tsx',
      'components/agenda/NannyNotesPanel.tsx',
      'components/agenda/FoodDashboard.tsx',
      'components/home/NannyUpdatesFeed.tsx',
      'components/kids/KidsJourneyRing.tsx',
      // B3 — Kids profile / care-circle / onboarding screens
      'app/profile/care-circle.tsx',
      'app/profile/kids.tsx',
      'app/onboarding/kids/index.tsx',
      'app/profile/health-history.tsx',
      'app/airtag-setup.tsx',
      'app/child-picker.tsx',
      'app/invite-caregiver.tsx',
      'app/manage-caregivers.tsx',
      // B4 — Pre-pregnancy / cycle cluster
      'app/cycle-pillars.tsx',
      'components/prepreg/ChecklistCard.tsx',
      'components/prepreg/PartnerView.tsx',
      'components/prepreg/HealthDashboard.tsx',
      'components/prepreg/DailyInsights.tsx',
      'components/prepreg/CyclePhaseRing.tsx',
      'components/agenda/CycleTracker.tsx',
      'components/agenda/PrePregChecklist.tsx',
      'components/analytics/CycleAnalytics.tsx',
      'components/home/cycle/FertilitySignalsCard.tsx',
      'components/home/cycle/MoodSymptomPickerSheet.tsx',
      'components/home/cycle/CycleTodayDashboardModal.tsx',
      'components/home/cycle/CycleJourneyRingFull.tsx',
      'components/calendar/CycleCalendar.tsx',
      'components/calendar/CycleLogForms.tsx',
      'app/onboarding/cycle/index.tsx',
      // B5 — Auth, onboarding shell, paywall, tabs
      'app/(auth)/welcome.tsx',
      'app/(auth)/sign-in.tsx',
      'app/(auth)/sign-up.tsx',
      'app/(auth)/forgot-password.tsx',
      'app/(auth)/reset-password.tsx',
      'app/onboarding/journey.tsx',
      'app/onboarding/transition.tsx',
      'app/paywall.tsx',
      'app/(tabs)/index.tsx',
      'app/(tabs)/library.tsx',
    ],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-text-only',
          'should-validate-template': true,
          words: {
            exclude: ['^[\\s\\d.,:#%/+\\-()]*$'],
          },
          callees: {
            exclude: ['t', 'useTranslatedContent'],
          },
        },
      ],
    },
  },
]

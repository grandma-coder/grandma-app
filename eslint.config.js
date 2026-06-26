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
      // Phase B complete (B7) — app/ + components/ now linted via the broad globs below.
      // Only asset/dev files with no user-facing copy stay excluded.
      'app/dev-panel.tsx',
      'components/stickers/**',
      'components/ui/Stickers.tsx',
      'components/ui/AnimatedSticker.tsx',
      'components/charts/SvgCharts.tsx',
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
    // B7 — Phase B complete. Guard now covers ALL screens + components.
    // Asset/dev files with no user-facing copy are excluded via global ignores above.
    files: [
      'lib/i18n/**/*.ts',
      'app/**/*.tsx',
      'components/**/*.tsx',
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

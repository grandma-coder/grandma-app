# Prompt — add the "studio" type + spacing + radius system to design-system-v3

Paste the block below into whatever is editing `design-system-v3.html`.

---

```
Add a new theme called "studio" to design-system-v3.html, alongside the existing diffuse/crafted/dark themes (do NOT modify diffuse). It introduces a crisp Geist/Safiro dashboard type system plus a 4px spacing scale and a compact radius scale. Implement exactly:

FONT LOADING — in <head>, add Geist and Geist Mono (Google Fonts):
  https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap
  Safiro is a licensed font (not on Google Fonts). Add an @font-face for 'Safiro' pointing to a self-hosted file, and set its fallback to Geist so the KPI number still renders if Safiro is absent:
  @font-face { font-family:'Safiro'; src:url('/fonts/Safiro-Bold.woff2') format('woff2'); font-weight:700; font-display:swap; }

THEME TOKENS — define under [data-theme="studio"]:
  /* type families */
  --font-display: 'Safiro', 'Geist', system-ui, sans-serif;   /* hero KPI numbers ONLY */
  --font-body:    'Geist', system-ui, -apple-system, sans-serif;  /* everything */
  --font-mono:    'Geist Mono', ui-monospace, monospace;      /* IDs, timestamps, pill labels, deltas */

  /* spacing — 4px base */
  --space-0-5:2px; --space-1:4px; --space-1-5:6px; --space-2:8px; --space-3:12px;
  --space-4:16px; --space-5:20px; --space-6:24px; --space-8:32px; --space-10:40px; --space-12:48px;

  /* radius — cards get a dedicated 16px */
  --c-r-sm:6px; --c-r-md:10px; --c-r-lg:14px; --c-r-xl:20px; --c-r-card:16px;

BODY DEFAULT — under [data-theme="studio"], set body font-family:var(--font-body); font-size:13px; and use var(--font-body) as the base for all reading copy.

TYPE SCALE — add these utility classes (scoped to [data-theme="studio"]) with Geist unless noted:
  .t-h1     { font-family:var(--font-body); font-size:40px; font-weight:700; line-height:1.1; }
  .t-h2     { font-family:var(--font-body); font-size:30px; font-weight:700; line-height:1.15; }
  .t-h3     { font-family:var(--font-body); font-size:22px; font-weight:700; line-height:1.2; }
  .t-h4     { font-family:var(--font-body); font-size:16px; font-weight:600; line-height:1.3; }
  .t-h5     { font-family:var(--font-body); font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:var(--c-fg-3, #6b7280); } /* section label */
  .t-body   { font-family:var(--font-body); font-size:13px; font-weight:400; line-height:1.5; }   /* default for everything */
  .t-cap    { font-family:var(--font-body); font-size:12px; color:var(--c-fg-3, #6b7280); }
  .t-cap-s  { font-family:var(--font-body); font-size:11px; color:var(--c-fg-4, #9ca3af); }
  .t-eyebrow{ font-family:var(--font-mono); font-size:11px; text-transform:uppercase; letter-spacing:.08em; color:var(--c-fg-3, #6b7280); }
  .t-mono   { font-family:var(--font-mono); font-size:13px; font-weight:400; }   /* 14:32:08 · DEG-1042 · +18% */
  .t-kpi    { font-family:var(--font-display); font-size:40px; font-weight:700; line-height:1; font-variant-numeric:tabular-nums; } /* Safiro — hero KPI numbers ONLY */

USAGE RULES — document as a comment in the theme:
  - Safiro (--font-display) is used ONLY for hero KPI numbers (.t-kpi). Never for headings or body.
  - Geist (--font-body) is the workhorse: all headings, body, captions, labels.
  - Geist Mono (--font-mono) only for IDs, timestamps, pill labels, deltas, and eyebrows.
  - Cards use --c-r-card (16px); smaller UI uses --c-r-sm/md/lg; all gaps/padding pull from --space-*.

Add a "Studio" showcase section in the doc's gallery demonstrating the .t-* scale, the KPI number in Safiro, the spacing ramp, and the radius chips — mirroring how diffuse is showcased. Keep diffuse and all other themes unchanged.
```

---

## To make it a REPLACEMENT instead of a new theme

Change the first line to: *"Replace the type, spacing, and radius tokens inside the existing `[data-theme="diffuse"]` block with the following (leaving its colors and blob/glow effects intact)."* Everything else stays the same. ⚠️ This restyles every screen currently built on diffuse.

## Notes
- **Geist + Geist Mono** are free (Vercel) and on Google Fonts — the CDN link above works as-is.
- **Safiro** is commercial (Zetafonts). You need a licensed webfont file; until then the `--font-display` fallback renders KPI numbers in Geist Bold, which looks close.
- This prompt only adds type + spacing + radius. The screenshots also show a Lucide icon spec and `--c-fg / success / warn / danger / accent` color tokens — say the word and I'll extend the prompt to include those.

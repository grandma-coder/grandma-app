# Prompt — generate design-system-v4.html (full system)

Paste everything in the block below to generate v4. It evolves v3 into a Geist/Safiro foundation (new type + spacing + radius + Lucide icon spec) while **keeping v3's warm brand colors** and **adding** the dashboard's semantic tokens (the "merge" direction).

---

```
Generate a single self-contained file, design-system-v4.html, by evolving design-system-v3.html. Keep v3's full structure, documentation format (section headers, mono sub-labels, live showcase tiles), and its WARM BRAND COLOR foundation. Replace the type/spacing/radius foundation with the new system below, add an iconography spec, and add semantic color tokens. Output the complete HTML file.

═══════════════════════════════════════════
1) KEEP FROM v3 (do not change these)
═══════════════════════════════════════════
- Canvas: --bg #F3ECD9, --bg-deep #EFE5CC, --paper #FFFEF8, --paper-2 #F7F0DF; ink scale --ink #141313 / --ink-2 #3A3533 / --ink-3 #6E6763 / --ink-4 #A69E93; --line rgba(20,19,19,0.08).
- Mode colors: --mode-pre #E58BB4, --mode-preg #B7A6E8, --mode-kids #8BB8E8 (+ *-soft).
- Sticker palette (--st-*) and the per-mode diffuse washes/accents (the DESATURATED soft set): pre accent #C25872 / g1 #F0A99A g2 #F0B8C8 g3 #C9B7E6 g4 #F7DCC0; preg accent #8F5FC6 / g1 #F8C9A6 g2 #F2AEC6 g3 #BDA4E2 g4 #F8E1B2; kids accent #4C79CE / g1 #F4D888 g2 #A2D8B4 g3 #A6BCE6 g4 #F4B396; care accent #4A8496 / g1 #A6D6DC g2 #B0C0E4 g3 #C6E7D9 g4 #D4E1F0.
- Keep the dark theme (update its type tokens to match the new families).
- The colorful component tiles keep their warm mode washes.

═══════════════════════════════════════════
2) TYPE — replace the foundation
═══════════════════════════════════════════
FONT LOADING in <head>:
  - Geist + Geist Mono via Google Fonts:
    https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap
  - Safiro is licensed (not on Google Fonts). Add @font-face for 'Safiro' pointing to a self-hosted woff2, with Geist as the fallback:
    @font-face{font-family:'Safiro';src:url('/fonts/Safiro-Bold.woff2') format('woff2');font-weight:700;font-display:swap;}

TOKENS in :root (these become the v4 default):
  --font-display:'Safiro','Geist',system-ui,sans-serif;   /* hero KPI numbers ONLY */
  --font-body:'Geist',system-ui,-apple-system,sans-serif; /* everything */
  --font-mono:'Geist Mono',ui-monospace,monospace;        /* IDs, timestamps, pill labels, deltas, eyebrows */

body { font-family:var(--font-body); font-size:13px; color:var(--ink); background:var(--bg); }

TYPE SCALE utility classes (Geist unless noted):
  .t-h1{font-family:var(--font-body);font-size:40px;font-weight:700;line-height:1.1}
  .t-h2{font-family:var(--font-body);font-size:30px;font-weight:700;line-height:1.15}
  .t-h3{font-family:var(--font-body);font-size:22px;font-weight:700;line-height:1.2}
  .t-h4{font-family:var(--font-body);font-size:16px;font-weight:600;line-height:1.3}
  .t-h5{font-family:var(--font-body);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--c-fg-3)} /* section label */
  .t-body{font-family:var(--font-body);font-size:13px;font-weight:400;line-height:1.5}  /* default for everything */
  .t-cap{font-family:var(--font-body);font-size:12px;color:var(--c-fg-3)}
  .t-cap-s{font-family:var(--font-body);font-size:11px;color:var(--c-fg-4)}
  .t-eyebrow{font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--c-fg-3)}
  .t-mono{font-family:var(--font-mono);font-size:13px;font-weight:400}  /* 14:32:08 · DEG-1042 · +18% */
  .t-kpi{font-family:var(--font-display);font-size:40px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums} /* Safiro — hero KPI numbers ONLY */

TYPE RULES (document as a comment):
  - Safiro ONLY for hero KPI numbers (.t-kpi). Never headings or body.
  - Geist is the workhorse: all headings, body, captions, labels.
  - Geist Mono only for IDs, timestamps, pill labels, deltas, eyebrows.

═══════════════════════════════════════════
3) SPACING — 4px base scale
═══════════════════════════════════════════
  --space-0-5:2px; --space-1:4px; --space-1-5:6px; --space-2:8px; --space-3:12px;
  --space-4:16px; --space-5:20px; --space-6:24px; --space-8:32px; --space-10:40px; --space-12:48px;
  Use these for all padding/gap in the v4 showcase components.

═══════════════════════════════════════════
4) RADIUS — compact scale, cards at 16px
═══════════════════════════════════════════
  --c-r-sm:6px; --c-r-md:10px; --c-r-lg:14px; --c-r-xl:20px; --c-r-card:16px;
  Cards use --c-r-card (16px); pills stay fully round (999px); inputs use --c-r-md/lg.

═══════════════════════════════════════════
5) ICONOGRAPHY — Lucide spec
═══════════════════════════════════════════
  - Lucide React exclusively — no other icon set. Icons inherit currentColor and take the surrounding text color; tint with a --c-fg-* token only when an icon must read quieter than its label.
  - Size tiers: 8 (dense), 10, 11, 12 (default), 14, 16 (emphasis), 18 (header).
  - Stroke weight: 1.5 (light), 1.75 (default), 2 (bold).
  - Color follows context: currentColor, --c-fg-3, --c-success, --c-warn, --c-danger, --c-accent.

═══════════════════════════════════════════
6) SEMANTIC COLOR TOKENS — add (merge)
═══════════════════════════════════════════
Add these ON TOP of the warm brand colors (light values; provide dark equivalents under [data-theme="dark"]):
  --c-fg:   var(--ink);       /* #141313 */
  --c-fg-2: var(--ink-2);     /* #3A3533 */
  --c-fg-3: var(--ink-3);     /* #6E6763 */
  --c-fg-4: var(--ink-4);     /* #A69E93 */
  --c-bg:      var(--bg);
  --c-surface: var(--paper);
  --c-success: #2FA36B;
  --c-warn:    #E08A2B;
  --c-danger:  #E5484D;
  --c-accent:  #4C79CE;   /* neutral UI accent; may inherit the active mode --accent */
  Deltas: positive = --c-success, negative = --c-danger.

═══════════════════════════════════════════
7) SHOWCASE SECTIONS
═══════════════════════════════════════════
- Rewrite the Typography section to demo the new scale (.t-h1…​.t-mono), the Safiro KPI number (e.g. 2,211), and Geist / Geist Mono samples, with the caption: "Safiro (display) for hero KPI numbers only · Geist (body) for everything · Geist Mono for IDs, timestamps, pill labels, deltas."
- Add a Spacing section (4px ramp with the --space-* tokens visualized as bars).
- Add/replace a Radius section (chips showing --c-r-sm/md/lg/xl + card 16).
- Add an Iconography section (Lucide size tiers, stroke weights, semantic colors).
- Keep every existing component/gallery section from v3, restyled with the new type, spacing, radius, and icon rules — but keep the warm mode washes on the colorful tiles.
- Preserve v3's documentation feel (section numbers, mono sub-labels, live examples). Keep it a single self-contained HTML file.
```

---

### Notes
- **Geist + Geist Mono** are free (Vercel) and load from the Google Fonts link as-is. **Safiro** is licensed (Zetafonts) — needs a self-hosted webfont; until then KPI numbers fall back to Geist Bold.
- Semantic hex values (`--c-success/warn/danger/accent`) are sensible defaults tuned to sit on the warm canvas — adjust to taste.
- Want me to run this and produce the actual `design-system-v4.html`? Say the word.

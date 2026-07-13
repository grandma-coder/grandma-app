# Prompt — hand-drawn stickers / icons (v3 "crafted" style)

The reference image = single-weight blue ballpoint doodles (flowers, mushrooms, bees, grass, sprouts, sun, buildings) on warm paper. That's v3's **crafted** theme: `--cr-blue #2C66D6` ink, `--bg #F5EBD8` paper, `--stroke-ink 2.5px`, Caveat / Patrick Hand.

Use the **primary prompt** for a reusable SVG icon/sticker set. Use the **art-sheet variant** if you instead want a decorative doodle collage like the wallpaper.

---

## PRIMARY — SVG hand-drawn sticker/icon set

```
Design an original hand-drawn sticker/icon set for grandma.app in the "crafted" hand-drawn style, matching design-system-v3.html. Deliver clean, optimized SVGs.

STYLE — single-weight ballpoint/marker line art. Loose, imperfect, human hand: gently wobbly lines, slight corner overshoot, occasional open gaps, organic asymmetry — never geometric or ruler-straight. One continuous confident line where possible. NO fills (line-only), no gradients, no baked-in shadows, no color blocks. Think "doodled in a notebook with one pen."

STROKE — uniform stroke-width ~2.5px on a 64×64 viewBox (scale proportionally for other sizes), stroke-linecap:round, stroke-linejoin:round. Draw with stroke="currentColor" so each icon can be recolored via CSS. Default ink = crayon blue #2C66D6 (deeper option navy #1E3FA8), ink fallback #20201C. Transparent background (they sit on paper #F5EBD8 / #FFFDF6). Apply shadows in CSS via the existing .sticker-shadow class — do NOT bake shadows into the SVG.

CONSISTENCY (critical) — every icon looks drawn by the SAME hand with the SAME pen: identical stroke weight, matching level of detail, same overshoot/wobble character, same optical size and centered padding (~8px margin inside the 64 box). Legible down to 24px — simplify detail for the functional icons so they read small.

SET — draw these, grouped:
  · Cycle / pre-pregnancy: flower, bud sprout, moon, water drop, calendar, ovulation dot, thermometer, heart.
  · Pregnancy: bump/belly, baby, tiny foot, fruit (size metaphor), ultrasound wave, milk bottle.
  · Kids: sleeping moon, bottle, mood face (happy), building blocks, footprints, meal bowl, growth chart.
  · Botanical doodles (decorative, from the reference): daisy, rose spiral, tulip, mushroom, bee, grass tuft, sun/spiral, leaf sprig, little buildings.
  · UI: plus (dashed "add" tile), check, star/reward, bell.

DELIVERABLES — (1) a single contact-sheet SVG/PNG showing every icon labeled with its name in Patrick Hand / Caveat lettering (blue ink) on paper #F5EBD8, arranged on a loose grid; (2) each icon as an individual export-ready SVG, kebab-case named (flower.svg, sleep-moon.svg, water-drop.svg …), normalized to the 64×64 viewBox with currentColor strokes.

CONSTRAINTS — 100% original artwork; do not copy any existing artist's or brand's icons. Keep it warm, friendly, child-safe, and cohesive with grandma.app's cream-paper aesthetic.
```

---

## VARIANT — decorative doodle art sheet (like the wallpaper)

```
Create an original hand-drawn doodle collage in the crafted style of design-system-v3.html — a loose scattered cluster of botanical/nature doodles (daisies, roses, tulips, mushrooms, bees, grass tufts, sprouts, a sun/spiral, little buildings) like a notebook page.

STYLE — single blue ballpoint line (#2C66D6 / navy #1E3FA8), uniform ~2.5px stroke, round caps, wobbly imperfect hand-drawn lines, no fills, no shadows. Warm paper background #F5EBD8. Add a small handwritten title in Caveat (blue ink) top-left and a tiny flower doodle top-right. Loose organic arrangement with breathing room, optically balanced. Output as a high-res PNG (and layered/vector if possible). 100% original — copy no existing artwork.
```

---

### Notes
- For the **SVG set**, run it as a normal design task (SVG output). For the **art sheet**, the `canvas-design` skill is the right tool (PNG/PDF art).
- Keeping strokes as `currentColor` means one icon file works across all v3 themes — it inherits `--cr-blue` under crafted, or any mode `--accent` elsewhere.
- Want me to run either of these now and generate the actual set?

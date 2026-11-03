// Builds the static SVG paths the admin map draws (lib/geo/world-paths.json, lib/geo/br-paths.json).
// d3-geo runs only here, never in the app. Run from a scratch folder with the inputs installed:
//   mkdir /tmp/geo-gen && cd /tmp/geo-gen && npm i d3-geo topojson-client topojson-simplify world-atlas@2 i18n-iso-countries @svg-maps/brazil
//   NODE_PATH=/tmp/geo-gen/node_modules node <admin>/scripts/geo/build-paths.mjs <admin>/lib/geo
import { createRequire } from "node:module"
import { writeFileSync } from "node:fs"
import { join } from "node:path"

const require = createRequire(join(process.env.NODE_PATH ?? ".", "x.js"))
const { geoEqualEarth, geoPath } = require("d3-geo")
const { feature } = require("topojson-client")
const countries = require("i18n-iso-countries")
const { presimplify, simplify, quantile } = require("topojson-simplify")
// 50m keeps the small states 110m drops; simplifying keeps the file small enough to ship to the browser.
const pre = presimplify(require("world-atlas/countries-50m.json"))
const atlas = simplify(pre, quantile(pre, 0.08))
const brazil = require("@svg-maps/brazil").default ?? require("@svg-maps/brazil")

const out = process.argv[2]
if (!out) throw new Error("usage: build-paths.mjs <out-dir>")

const W = 1000, H = 470
const world = feature(atlas, atlas.objects.countries)
world.features = world.features.filter((f) => f.properties.name !== "Antarctica")
const projection = geoEqualEarth().fitSize([W, H], world)
const path = geoPath(projection).digits(1)

const paths = {}
for (const f of world.features) {
  // world-atlas ids are ISO 3166-1 numeric; a few disputed areas have none and are skipped.
  const iso2 = f.id ? countries.numericToAlpha2(f.id) : undefined
  const d = path(f)
  if (!iso2 || !d) continue
  paths[iso2] = paths[iso2] ? paths[iso2] + d : d
}
// Small states vanish at this scale; keep the centroid of their largest piece so a dot can still be drawn.
// Several features can share a code (Australia and Ashmore Is. are both 036), so judge each country by its largest piece.
const largest = {}
for (const f of world.features) {
  const iso2 = f.id ? countries.numericToAlpha2(f.id) : undefined
  if (!iso2) continue
  const [[x0, y0], [x1, y1]] = path.bounds(f)
  const area = (x1 - x0) * (y1 - y0)
  if (!largest[iso2] || area > largest[iso2].area) largest[iso2] = { area, f }
}
const dots = {}
for (const [iso2, { area, f }] of Object.entries(largest)) {
  const [cx, cy] = path.centroid(f)
  if (area < 12 && Number.isFinite(cx)) dots[iso2] = [Math.round(cx * 10) / 10, Math.round(cy * 10) / 10]
}
writeFileSync(join(out, "world-paths.json"), JSON.stringify({ viewBox: `0 0 ${W} ${H}`, paths, dots }))

// Brazil by state (Vercel's x-vercel-ip-country-region is the UF, e.g. "SP").
const br = { viewBox: brazil.viewBox, paths: Object.fromEntries(brazil.locations.map((l) => [l.id.toUpperCase(), l.path])) }
writeFileSync(join(out, "br-paths.json"), JSON.stringify(br))
console.log(Object.keys(paths).length, "countries,", Object.keys(dots).length, "dots,", Object.keys(br.paths).length, "UFs")

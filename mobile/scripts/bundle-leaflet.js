#!/usr/bin/env node
/**
 * Inlines Leaflet into a TS module so the AR minimap WebView needs no network.
 *
 * The minimap previously pulled leaflet.js + leaflet.css from unpkg.com at
 * runtime, which meant the map silently rendered as a blank box on a slow or
 * captive-portal network — exactly the conditions at a competition venue. The
 * OSM *tiles* still need network (and degrade to a faint grid, which is
 * acceptable), but the library itself must always be present.
 *
 * Source is the `leaflet` package already installed in the web workspace at the
 * repo root, so there is no vendored copy to keep in sync.
 *
 * Run after bumping Leaflet:  node scripts/bundle-leaflet.js
 */
const fs = require("fs")
const path = require("path")

const repoRoot = path.resolve(__dirname, "../..")
const leafletDir = path.join(repoRoot, "node_modules/leaflet/dist")
const outFile = path.resolve(__dirname, "../src/lib/leaflet-bundle.ts")

if (!fs.existsSync(leafletDir)) {
  console.error(
    `Could not find Leaflet at ${leafletDir}.\n` +
      `Install the web workspace dependencies first (npm install in the repo root).`
  )
  process.exit(1)
}

const js = fs.readFileSync(path.join(leafletDir, "leaflet.js"), "utf8")
const css = fs.readFileSync(path.join(leafletDir, "leaflet.css"), "utf8")

let version = "unknown"
try {
  version = require(path.join(repoRoot, "node_modules/leaflet/package.json")).version
} catch {
  // Optional — only used for the header comment.
}

const banner = `/**
 * GENERATED FILE — do not edit.
 *
 * Leaflet ${version}, inlined so the AR minimap works with no CDN reachable.
 * Regenerate with: node scripts/bundle-leaflet.js
 */
`

const body =
  `${banner}\nexport const LEAFLET_JS = ${JSON.stringify(js)}\n\n` +
  `export const LEAFLET_CSS = ${JSON.stringify(css)}\n`

fs.writeFileSync(outFile, body, "utf8")

const kb = (n) => `${Math.round(n / 1024)}KB`
console.log(
  `Wrote ${path.relative(process.cwd(), outFile)} — Leaflet ${version} (js ${kb(js.length)}, css ${kb(css.length)})`
)

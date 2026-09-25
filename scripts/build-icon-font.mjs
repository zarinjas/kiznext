#!/usr/bin/env node
/**
 * Keeps the web icon font — `app/fonts/MaterialSymbolsRounded.woff2` — in sync
 * with the icons the app actually uses.
 *
 * Why this exists: the upstream full variable font is ~5.3 MB. `next/font`
 * preloads it on every page, and on a phone that download routinely outlived
 * Chrome's `font-display: block` window, so the raw ligature source text
 * ("arrow_forward") flashed or stuck instead of the icon — most visibly on the
 * cold-loaded check-in page opened from a QR code. The committed font is a
 * ~100 KB subset carrying only the used icons and only the two axes the design
 * system varies (`FILL`, `wght`), so it is ready before first paint.
 *
 * Commands:
 *   npm run build:icons    regenerate the subset (needs network — hits Google
 *                          Fonts once). Run this whenever a new icon is added.
 *   npm run check:icons    verify the committed subset already contains every
 *                          icon the source references (offline; runs in CI).
 *
 * An icon missing from the subset degrades to its raw name as text — the same
 * fallback the old full font produced — which is exactly what `check:icons`
 * exists to prevent.
 */
import { createRequire } from "node:module"
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs"
import { dirname, extname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const OUT = join(ROOT, "app/fonts/MaterialSymbolsRounded.woff2")
const FULL = join(ROOT, "node_modules/material-symbols/material-symbols-rounded.woff2")
const SCAN_DIRS = ["app", "components", "lib", "prisma", "packages"]
const SCAN_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"])
const GOOGLE_CSS =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:FILL,wght@0..1,100..700"
// A desktop Chrome UA is required or Google serves a legacy (non-woff2) format.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

const require = createRequire(import.meta.url)

/** Next bundles fontkit; reuse it so the script adds no dependency. */
function loadFontkit() {
  const nextPkg = require.resolve("next/package.json")
  return require(join(dirname(nextPkg), "dist/compiled/@next/font/dist/fontkit/index.js")).default
}

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (SCAN_EXTS.has(extname(entry))) out.push(full)
  }
  return out
}

function sourceFiles() {
  const files = []
  for (const dir of SCAN_DIRS) {
    try {
      files.push(...walk(join(ROOT, dir)))
    } catch {
      // dir may not exist in some checkouts — ignore.
    }
  }
  return files
}

/**
 * Every icon name referenced anywhere in the source. Candidates are every
 * lowercase snake_case quoted token; they are then filtered against the full
 * upstream font, so only real Material Symbols survive (brand keys like
 * "instagram" are dropped).
 */
function collectIconNames() {
  const candidates = new Set()
  const re = /["'`]([a-z][a-z0-9_]{2,})["'`]/g
  for (const file of sourceFiles()) {
    for (const m of readFileSync(file, "utf8").matchAll(re)) candidates.add(m[1])
  }
  const full = loadFontkit()(readFileSync(FULL))
  return [...candidates].filter((name) => full.layout(name).glyphs.length === 1).sort()
}

/** Does the committed subset render `name` as a single glyph? */
function subsetHas(subset, name) {
  return subset.layout(name).glyphs.length === 1
}

async function build() {
  const icons = collectIconNames()
  if (!icons.length) throw new Error("No icon names found — aborting so the font isn't wiped.")

  const css = await (
    await fetch(`${GOOGLE_CSS}&icon_names=${icons.join(",")}`, { headers: { "User-Agent": UA } })
  ).text()
  const fontUrl = css.match(/url\((https:\/\/[^)]+)\)/)?.[1]
  if (!fontUrl) throw new Error(`Google Fonts returned no woff2 URL:\n${css.slice(0, 300)}`)

  const bytes = Buffer.from(
    await (await fetch(fontUrl, { headers: { "User-Agent": UA } })).arrayBuffer(),
  )
  writeFileSync(OUT, bytes)
  console.log(`[build-icon-font] wrote ${icons.length} icons → ${OUT} (${(bytes.length / 1024).toFixed(0)} KB)`)
}

function check() {
  const icons = collectIconNames()
  const subset = loadFontkit()(readFileSync(OUT))
  const missing = icons.filter((name) => !subsetHas(subset, name))
  if (missing.length) {
    console.error(
      `[check:icons] ${missing.length} icon(s) are used but missing from the subset:\n  ${missing.join(", ")}\n` +
        "Run `npm run build:icons` and commit the updated font.",
    )
    process.exit(1)
  }
  console.log(`[check:icons] ok — ${icons.length} icons all present in the subset`)
}

Promise.resolve()
  .then(() => (process.argv.includes("--check") ? check() : build()))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })

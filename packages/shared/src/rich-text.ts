/**
 * Rich text for announcement bodies.
 *
 * Announcements are authored in a `contentEditable` editor on the web, so their
 * `content` is HTML (a small allowlist: bold/italic/underline/strike, lists,
 * headings, quotes, links and line breaks). Two pure helpers keep that safe and
 * portable:
 *
 *  - `sanitizeRichText` — escape-first allowlist sanitiser. Everything is
 *    HTML-escaped, then only known-safe tags are re-enabled, so a stored XSS
 *    payload can never survive (attributes are dropped; links are scheme-checked).
 *  - `richTextToPlainText` — tag-stripping fallback for surfaces that render
 *    plain text (the mobile app, list previews).
 *
 * No React / DOM / browser APIs — shared by web and mobile.
 */

const ALLOWED_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "strike",
  "del",
  "ul",
  "ol",
  "li",
  "p",
  "br",
  "div",
  "h1",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "code",
  "pre",
  "a",
])

/** Escapes the three characters that can start a tag or entity. */
function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

/**
 * Matches a tag after escaping: `&lt;`, optional `/`, the name, raw attributes
 * up to the escaped `&gt;`.
 */
const TAG_RE = /&lt;(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:(?!&gt;).)*)&gt;/g

/** Re-emits an escaped string with only the allowlisted tags kept. */
export function sanitizeRichText(input: string | null | undefined): string {
  if (!input) return ""

  const escaped = escapeHtml(input)

  return escaped.replace(TAG_RE, (_match, closing: string, rawTag: string, rawAttrs: string) => {
    const tag = rawTag.toLowerCase()
    if (!ALLOWED_TAGS.has(tag)) return ""
    if (closing) return `</${tag}>`

    if (tag === "a") {
      const hrefMatch = /(?:^|\s)href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+))/i.exec(rawAttrs)
      const href = (hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? "").trim()
      if (!/^(https?:\/\/|mailto:|\/|#)/i.test(href)) return ""
      return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">`
    }

    return `<${tag}>`
  })
}

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
}

/** Flattens rich HTML down to displayable plain text (block tags become newlines). */
export function richTextToPlainText(input: string | null | undefined): string {
  if (!input) return ""

  return input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|blockquote|pre|tr)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/g, (match) => ENTITIES[match] ?? match)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

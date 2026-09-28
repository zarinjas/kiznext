/**
 * Shared A4 print helpers — a hidden same-origin iframe renders an HTML
 * fragment and triggers the browser print dialog once images have loaded.
 * Used by the check-in records/poster and the Student Data report.
 *
 * Client-only (touches `document`). No new dependency.
 */

export interface PrintLogos {
  ukmLogoUrl: string | null
  appLogoUrl: string | null
}

export function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export const PRINT_STYLES = `
  @page { size: A4 portrait; margin: 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0F172A; }
  .muted { color: #64748B; font-size: 12px; }

  /* ── Document header (shared) ── */
  .doc-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 20px; border-radius: 18px; border: 1px solid #C7E6CE; background: linear-gradient(120deg, #EAF7EE 0%, #F1FAF2 55%, #F7FBF3 100%); }
  .doc-header .logos { display: flex; align-items: center; gap: 16px; }
  .doc-header .logos img { height: 54px; width: auto; max-width: 150px; object-fit: contain; }
  .doc-header .brandtext { text-align: right; }
  .doc-header h1 { font-size: 19px; letter-spacing: -0.02em; color: #004B23; }
  .rule { height: 3px; width: 100%; background: linear-gradient(90deg, #004B23, #91C953); border-radius: 999px; margin: 12px 0 20px; }

  /* ── Badges ── */
  .badge { display: inline-block; padding: 6px 16px; border-radius: 999px; font-size: 13px; font-weight: 800; letter-spacing: 0.10em; }
  .badge.check_in { background: linear-gradient(135deg, #0B6B33, #004B23); color: #fff; }
  .badge.check_out { background: linear-gradient(135deg, #F59E0B, #D97706); color: #fff; }

  /* ── Records report ── */
  table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 12px; }
  th, td { border: 1px solid #E2E8F0; padding: 6px 8px; text-align: left; vertical-align: middle; }
  th { background: #F1F5F9; }
  .sig img { height: 34px; object-fit: contain; }

  /* ── Poster ── */
  .poster { text-align: center; }
  .poster .poster-title { font-size: 38px; letter-spacing: -0.035em; line-height: 1.05; margin: 14px 0 8px; color: #0F172A; }
  .poster .session { display: inline-block; font-size: 14px; font-weight: 700; color: #0B6B33; background: #EAF7EE; border: 1px solid #C7E6CE; border-radius: 999px; padding: 5px 14px; }
  .poster .qr-wrap { margin: 20px auto 4px; width: 110mm; padding: 8mm; border-radius: 24px; background: #fff; border: 2px solid #A9D9B5; box-shadow: 0 0 0 7px #EAF7EE; }
  .poster .qr-wrap img { display: block; width: 100%; height: auto; }
  .poster .scan-hint { font-size: 15px; color: #475569; font-weight: 600; margin: 20px 0 22px; }
  .poster .steps { text-align: left; max-width: 162mm; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 18px; padding: 20px 24px; background: linear-gradient(180deg, #F8FAFC, #FFFFFF); }
  .poster .steps h3 { font-size: 15px; color: #004B23; margin-bottom: 12px; }
  .poster .steps ol { list-style: none; counter-reset: step; padding: 0; }
  .poster .steps li { position: relative; padding-left: 36px; margin: 11px 0; font-size: 14px; color: #334155; }
  .poster .steps li::before { counter-increment: step; content: counter(step); position: absolute; left: 0; top: -2px; width: 24px; height: 24px; border-radius: 999px; background: linear-gradient(135deg, #0B6B33, #004B23); color: #fff; font-size: 12px; font-weight: 800; line-height: 24px; text-align: center; }
  .poster .steps li b { color: #0F172A; }
  .poster .zh { margin-top: 14px; font-size: 13px; color: #64748B; }
  .poster .footer { margin-top: 8px; color: #94A3B8; font-size: 12px; }
`

/** Build the shared A4 document header with the UKM + myKIZ logos. */
export function docHeader(logos: PrintLogos, rightTitle: string, rightSub: string): string {
  const logoImgs = [
    logos.ukmLogoUrl ? `<img src="${escHtml(logos.ukmLogoUrl)}" alt="UKM" />` : "",
    logos.appLogoUrl ? `<img src="${escHtml(logos.appLogoUrl)}" alt="myKIZ" />` : "",
  ].join("")
  return `<div class="doc-header">
    <div class="logos">${logoImgs || '<span class="muted">KOLEJ IBU ZAIN</span>'}</div>
    <div class="brandtext"><h1>${escHtml(rightTitle)}</h1><div class="muted">${escHtml(rightSub)}</div></div>
  </div>
  <div class="rule"></div>`
}

/**
 * Print an HTML fragment at A4 using a hidden same-origin iframe. More reliable
 * than window.open (no popup blocker) and waits for images before printing.
 */
export function printHtml(title: string, body: string) {
  const prev = document.getElementById("__kiz_print_frame")
  if (prev) prev.remove()

  const iframe = document.createElement("iframe")
  iframe.id = "__kiz_print_frame"
  iframe.setAttribute("aria-hidden", "true")
  iframe.style.position = "fixed"
  iframe.style.left = "-9999px"
  iframe.style.top = "0"
  iframe.style.width = "1px"
  iframe.style.height = "1px"
  iframe.style.border = "0"
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) {
    iframe.remove()
    return
  }

  doc.open()
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escHtml(title)}</title><style>${PRINT_STYLES}</style></head><body>${body}</body></html>`)
  doc.close()

  const win = iframe.contentWindow
  const trigger = () => {
    try {
      win?.focus()
      win?.print()
    } finally {
      setTimeout(() => iframe.remove(), 1500)
    }
  }

  const images = Array.from(doc.images)
  if (images.length === 0) {
    setTimeout(trigger, 200)
    return
  }
  let remaining = images.length
  const oneDone = () => {
    remaining -= 1
    if (remaining <= 0) trigger()
  }
  images.forEach((img) => {
    if (img.complete) oneDone()
    else {
      img.onload = oneDone
      img.onerror = oneDone
    }
  })
  // Safety net in case an image never fires.
  setTimeout(() => {
    if (document.getElementById("__kiz_print_frame")) trigger()
  }, 2500)
}

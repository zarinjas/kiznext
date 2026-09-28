import Box from "@mui/material/Box"
import { sanitizeRichText } from "@/lib/rich-text"

/**
 * RichText — renders sanitised rich-text HTML. Use for any stored announcement
 * body so formatting shows on web while the allowlist sanitiser keeps it safe.
 * Surfaces that can't render HTML (mobile, list previews) use
 * `richTextToPlainText` instead.
 */
export function RichText({ html, sx }: { html: string; sx?: object }) {
  return (
    <Box
      sx={{
        overflowWrap: "anywhere",
        "& p, & div": { m: 0 },
        "& ul, & ol": { my: 0.5, pl: 3 },
        "& h1, & h2, & h3, & h4": { m: 0, lineHeight: 1.3 },
        "& blockquote": { m: 0, pl: 1.5, borderLeft: "3px solid", borderColor: "divider" },
        "& a": { color: "primary.main", textDecoration: "underline" },
        ...sx,
      }}
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }}
    />
  )
}

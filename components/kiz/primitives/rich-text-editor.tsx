"use client"

import { useEffect, useRef, useState } from "react"
import Box from "@mui/material/Box"
import IconButton from "@mui/material/IconButton"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import { KIcon } from "./icon"
import { color, radius } from "@/lib/theme"
import { richTextToPlainText } from "@/lib/rich-text"

/**
 * RichTextEditor — a lightweight WYSIWYG field (no editor dependency).
 *
 * Backed by a `contentEditable` surface and a hidden input carrying the HTML so
 * it drops straight into a normal `<form>` + `FormData` flow. Content is passed
 * through `sanitizeRichText` before it is stored, and paste is forced to plain
 * text so pasted markup can never leak in.
 */
interface RichTextEditorProps {
  name: string
  defaultValue?: string
  placeholder?: string
  minHeight?: number
}

const TOOLS: { command: string; icon: string; label: string }[] = [
  { command: "bold", icon: "format_bold", label: "Bold" },
  { command: "italic", icon: "format_italic", label: "Italic" },
  { command: "underline", icon: "format_underlined", label: "Underline" },
  { command: "strikeThrough", icon: "strikethrough_s", label: "Strikethrough" },
  { command: "insertUnorderedList", icon: "format_list_bulleted", label: "Bullet list" },
  { command: "insertOrderedList", icon: "format_list_numbered", label: "Numbered list" },
]

export function RichTextEditor({ name, defaultValue = "", placeholder, minHeight = 150 }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [html, setHtml] = useState(defaultValue)
  const [focused, setFocused] = useState(false)
  const [empty, setEmpty] = useState(!richTextToPlainText(defaultValue))

  // Set the initial HTML imperatively (uncontrolled) so React never fights the
  // caret. Mount-only — the parent remounts this via a `key` to reset it.
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = defaultValue
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function sync() {
    const next = editorRef.current?.innerHTML ?? ""
    setHtml(next)
    setEmpty(!richTextToPlainText(next))
  }

  function exec(command: string, value?: string) {
    editorRef.current?.focus()
    document.execCommand(command, false, value)
    sync()
  }

  function addLink() {
    const url = window.prompt("Link URL", "https://")
    if (url) exec("createLink", url)
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault()
    document.execCommand("insertText", false, e.clipboardData.getData("text/plain"))
    sync()
  }

  return (
    <Box>
      <input type="hidden" name={name} value={html} />
      <Box
        sx={{
          border: "1px solid",
          borderColor: focused ? color.brand[500] : "divider",
          borderRadius: `${radius.input}px`,
          overflow: "hidden",
          backgroundColor: "background.paper",
          transition: "border-color 120ms ease, box-shadow 120ms ease",
          boxShadow: focused ? `0 0 0 3px ${color.brand[50]}` : "none",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.25,
            px: 0.5,
            py: 0.375,
            borderBottom: "1px solid",
            borderColor: "divider",
            flexWrap: "wrap",
          }}
        >
          {TOOLS.map((tool) => (
            <Tooltip key={tool.command} title={tool.label}>
              <IconButton
                size="small"
                aria-label={tool.label}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => exec(tool.command)}
                sx={{ borderRadius: `${radius.input}px` }}
              >
                <KIcon icon={tool.icon} size={18} />
              </IconButton>
            </Tooltip>
          ))}
          <Box sx={{ width: "1px", alignSelf: "stretch", my: 0.5, mx: 0.625, backgroundColor: "divider" }} />
          <Tooltip title="Insert link">
            <IconButton
              size="small"
              aria-label="Insert link"
              onMouseDown={(e) => e.preventDefault()}
              onClick={addLink}
              sx={{ borderRadius: `${radius.input}px` }}
            >
              <KIcon icon="link" size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear formatting">
            <IconButton
              size="small"
              aria-label="Clear formatting"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec("removeFormat")}
              sx={{ borderRadius: `${radius.input}px` }}
            >
              <KIcon icon="format_clear" size={18} />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ position: "relative" }}>
          {empty && placeholder && (
            <Typography
              aria-hidden
              sx={{
                position: "absolute",
                top: 12,
                left: 14,
                color: "text.disabled",
                fontSize: 15,
                lineHeight: 1.65,
                pointerEvents: "none",
              }}
            >
              {placeholder}
            </Typography>
          )}
          <Box
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label={placeholder}
            onInput={sync}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false)
              sync()
            }}
            onPaste={handlePaste}
            sx={{
              minHeight,
              px: 1.75,
              py: 1.5,
              fontSize: 15,
              lineHeight: 1.65,
              outline: "none",
              overflowWrap: "anywhere",
              "& p, & div": { m: 0 },
              "& ul, & ol": { my: 0.5, pl: 3 },
              "& h1, & h2, & h3": { mb: 0.5, lineHeight: 1.3 },
              "& a": { color: "primary.main", textDecoration: "underline" },
              "&:empty:before": { content: "none" },
            }}
          />
        </Box>
      </Box>
    </Box>
  )
}

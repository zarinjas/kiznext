"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import IconButton from "@mui/material/IconButton"
import Tooltip from "@mui/material/Tooltip"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KDialog } from "@/components/kiz/primitives/k-dialog"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { ListGroup, ListRow } from "@/components/kiz/primitives/list-group"
import { SocialIcon } from "@/components/shared/social-icon"
import { color, radius } from "@/lib/theme"
import { moveSocialLink, setSocialLinkActive } from "@/lib/stay-connected"
import { SectionSettingsForm } from "./section-settings-form"
import { LinkForm } from "./link-form"
import { DeleteLinkButton } from "./delete-link-button"
import type { SocialLinkView, StayConnectedSection } from "@/lib/stay-connected"

function IconTile({ icon }: { icon: string }) {
  return (
    <Box
      sx={{
        width: 34,
        height: 34,
        borderRadius: `${radius.input}px`,
        backgroundColor: color.brand[50],
        color: color.brand[700],
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <SocialIcon icon={icon} size={18} />
    </Box>
  )
}

function VisibilityTag({ active }: { active: boolean }) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1,
        py: 0.25,
        borderRadius: 999,
        backgroundColor: active ? color.success.soft : color.neutral.soft,
        color: active ? color.success.ink : color.neutral.ink,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      <Box
        sx={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: active ? color.success.main : color.neutral.main,
        }}
      />
      {active ? "Visible" : "Hidden"}
    </Box>
  )
}

export function StayConnectedAdmin({ section }: { section: StayConnectedSection }) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<SocialLinkView | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const links = section.links

  async function move(id: string, direction: "up" | "down") {
    setBusyId(id)
    try {
      await moveSocialLink(id, direction)
      router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  async function toggleActive(link: SocialLinkView) {
    setBusyId(link.id)
    try {
      await setSocialLinkActive(link.id, !link.isActive)
      router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Box>
      <SectionSettingsForm section={section} />

      {links.length === 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <KEmpty
            icon="link"
            title="No links yet"
            body="Add your website, Instagram, TikTok or any other link. The section hides itself while there are no links."
          />
          <Button variant="contained" onClick={() => setShowAdd(true)} startIcon={<KIcon icon="add" size={17} />}>
            Add Link
          </Button>
        </Box>
      ) : (
        <ListGroup
          title={`${links.length} link${links.length === 1 ? "" : "s"}`}
          action={
            <Button variant="contained" size="small" onClick={() => setShowAdd(true)} startIcon={<KIcon icon="add" size={17} />}>
              Add
            </Button>
          }
        >
          {links.map((link, index) => (
            <ListRow
              key={link.id}
              iconNode={<IconTile icon={link.icon} />}
              title={link.label}
              subtitle={link.description || link.url}
              meta={<VisibilityTag active={link.isActive} />}
              trailing={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                  <Tooltip title="Move up">
                    <span>
                      <IconButton
                        size="small"
                        aria-label={`Move ${link.label} up`}
                        disabled={index === 0 || busyId === link.id}
                        onClick={() => move(link.id, "up")}
                      >
                        <KIcon icon="arrow_upward" size={17} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Move down">
                    <span>
                      <IconButton
                        size="small"
                        aria-label={`Move ${link.label} down`}
                        disabled={index === links.length - 1 || busyId === link.id}
                        onClick={() => move(link.id, "down")}
                      >
                        <KIcon icon="arrow_downward" size={17} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={link.isActive ? "Hide from dashboard" : "Show on dashboard"}>
                    <span>
                      <IconButton
                        size="small"
                        aria-label={link.isActive ? `Hide ${link.label}` : `Show ${link.label}`}
                        disabled={busyId === link.id}
                        onClick={() => toggleActive(link)}
                      >
                        <KIcon icon={link.isActive ? "visibility" : "visibility_off"} size={17} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setEditing(link)}
                    aria-label={`Edit ${link.label}`}
                    sx={{ minWidth: 0, px: 1 }}
                  >
                    <KIcon icon="edit" size={15} />
                  </Button>
                  <DeleteLinkButton id={link.id} name={link.label} />
                </Box>
              }
            />
          ))}
        </ListGroup>
      )}

      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 2 }}>
        Links without a URL are hidden automatically. If every link is hidden or removed, the whole
        section disappears from the dashboard.
      </Typography>

      <KDialog open={showAdd} onClose={() => setShowAdd(false)} title="Add Link" icon="link">
        <LinkForm onClose={() => setShowAdd(false)} />
      </KDialog>

      {editing && (
        <KDialog open onClose={() => setEditing(null)} title={`Edit: ${editing.label}`} icon="edit">
          <LinkForm initial={editing} onClose={() => setEditing(null)} />
        </KDialog>
      )}
    </Box>
  )
}

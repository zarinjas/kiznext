"use client"

import { signOut } from "next-auth/react"

interface Props {
  className?: string
  children: React.ReactNode
}

export function SignOutButton({ className, children }: Props) {
  return (
    <button
      className={className}
      onClick={() => signOut({ callbackUrl: "/login" })}
      style={{
        display: "block",
        width: "100%",
        padding: 0,
        margin: 0,
        border: "none",
        background: "transparent",
        font: "inherit",
        color: "inherit",
        textAlign: "left",
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {children}
    </button>
  )
}

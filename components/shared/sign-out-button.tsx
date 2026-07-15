"use client"

import { signOut } from "next-auth/react"

interface Props {
  className?: string
  children: React.ReactNode
}

export function SignOutButton({ className, children }: Props) {
  return (
    <button className={className} onClick={() => signOut({ callbackUrl: "/login" })}>
      {children}
    </button>
  )
}

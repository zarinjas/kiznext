"use server"

import { signIn } from "@/lib/auth"

/**
 * Server-action quick login used by the demo buttons on the login page.
 *
 * Rendered as a real <form action={...}> so the click is a native form
 * submission that goes straight to the server — it does NOT depend on the
 * browser running React event handlers (server actions post without JS).
 */
export async function quickSignIn(matricId: string) {
  await signIn("credentials", {
    matricId,
    password: "kiz123",
    redirectTo: "/dashboard",
  })
}

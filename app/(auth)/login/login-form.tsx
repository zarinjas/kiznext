"use client"

import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface Props {
  logoUrl: string | null
}

export function LoginForm({ logoUrl }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string>("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const form = new FormData(e.currentTarget)
    const matricId = form.get("matricId") as string
    const password = form.get("password") as string

    const result = await signIn("credentials", {
      matricId,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Invalid Matric No. or password.")
      setLoading(false)
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          {logoUrl ? (
            <div className="mx-auto mb-3">
              <img
                src={logoUrl}
                alt="KIZ Super App"
                className="mx-auto h-12 w-auto object-contain"
              />
            </div>
          ) : (
            <CardTitle className="font-heading text-2xl text-primary-foreground">
              KIZ Super App
            </CardTitle>
          )}
          <CardDescription>Sign in with your UKM Matric No.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="matricId">Matric No.</Label>
              <Input
                id="matricId"
                name="matricId"
                type="text"
                placeholder="A123456"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

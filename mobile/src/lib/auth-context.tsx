import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { AppState, Platform } from "react-native"
import * as Device from "expo-device"
import { apiGet, apiPost } from "./api"
import { persister } from "./persister"
import { queryClient } from "./query-client"
import { clearToken, getToken, saveToken } from "./storage"
import type { MobileUser } from "./types"

interface AuthContextValue {
  user: MobileUser | null
  /** True while the stored session is being restored on cold start. */
  loading: boolean
  signIn: (matricId: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
  /** Locally patch the cached user after a profile save. */
  updateUser: (patch: Partial<MobileUser>) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MobileUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const token = await getToken()
    if (!token) {
      setUser(null)
      return
    }
    const data = await apiGet<{ user: MobileUser }>("/auth/me")
    setUser(data.user)
  }, [])

  // Cold start: restore the session from the stored token.
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const token = await getToken()
        if (!token) return
        const data = await apiGet<{ user: MobileUser }>("/auth/me")
        if (active) setUser(data.user)
      } catch {
        // Invalid/expired token — `apiFetch` already cleared it on a 401.
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  // Returning to the foreground re-reads the user, so profile changes made
  // elsewhere (a new photo on the website, another device) reach the dashboard
  // hero and the rest of the app without a cold restart.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh().catch(() => {})
    })
    return () => sub.remove()
  }, [refresh])

  const signIn = useCallback(async (matricId: string, password: string) => {
    const data = await apiPost<{ token: string; user: MobileUser }>("/auth/login", {
      matricId,
      password,
      platform: Platform.OS,
      deviceName: Device.modelName ?? undefined,
    })
    await saveToken(data.token)
    setUser(data.user)
  }, [])

  const signOut = useCallback(async () => {
    try {
      await apiPost("/auth/logout")
    } catch {
      // Best-effort — clear locally regardless.
    }
    await clearToken()
    // Drop any cached data so the next user can't see the previous one's.
    queryClient.clear()
    try {
      await persister.removeClient()
    } catch {
      // Non-fatal — the in-memory cache is already cleared.
    }
    setUser(null)
  }, [])

  const updateUser = useCallback((patch: Partial<MobileUser>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const value = useMemo(
    () => ({ user, loading, signIn, signOut, refresh, updateUser }),
    [user, loading, signIn, signOut, refresh, updateUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}

"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { AuthUser } from "@/lib/types"
import { useStore } from "@/components/providers/store-provider"
import { PERMISSIONS } from "@/lib/permissions"

export function useAuth() {
  const router = useRouter()
  const { currentUser, refreshUser } = useStore()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    console.log("currentUser from store:", currentUser)
    setUser(currentUser ?? null)
    setIsLoading(false)
  }, [currentUser])
  

  // LOGIN via API
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      })

      if (!res.ok) return false

      await refreshUser() // reload currentUser dari /api/me di store-provider
      return true
    } catch {
      return false
    }
  }

  // LOGOUT via API
  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })
    } catch {
      // ignore
    } finally {
      await refreshUser()
      router.push("/login")
    }
  }

  // Permissions: kalau AuthUser sudah punya array permission codes
  const hasPermission = (permissionCode: string): boolean => {
    if (!user) return false
    // jika kamu expose user.permissions: string[]
    if (Array.isArray((user as any).permissions)) {
      return (user as any).permissions.includes(permissionCode)
    }
    // fallback: jika roles[] kamu mapping ke permission di FE, isi di sini
    return false
  }

  const hasAnyPermission = (permissionCodes: string[]): boolean => {
    if (!user) return false
    return permissionCodes.some((code) => hasPermission(code))
  }

  const hasAllPermissions = (permissionCodes: string[]): boolean => {
    if (!user) return false
    return permissionCodes.every((code) => hasPermission(code))
  }

  const getUserRole = () => {
    if (!user || !user.roles || user.roles.length === 0) return null
    // Kembalikan role code pertama, atau nanti mapping ke objek Role kalau perlu
    return user.roles[0]
  }

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getUserRole,
    PERMISSIONS,
  }
}

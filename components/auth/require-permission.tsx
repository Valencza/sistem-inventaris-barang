"use client"

import type { ReactNode } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface RequirePermissionProps {
  children: ReactNode
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  fallback?: ReactNode
}

export function RequirePermission({
  children,
  permission,
  permissions = [],
  requireAll = false,
  fallback,
}: RequirePermissionProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = useAuth()

  if (isLoading) {
    return null
  }

  const allPermissions = permission ? [permission, ...permissions] : permissions

  if (allPermissions.length === 0) {
    return <>{children}</>
  }

  const hasAccess = requireAll ? hasAllPermissions(allPermissions) : hasAnyPermission(allPermissions)

  if (!hasAccess) {
    if (fallback) return <>{fallback}</>

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Akses Ditolak</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Anda tidak memiliki izin untuk mengakses halaman ini. Silakan hubungi administrator jika Anda memerlukan
          akses.
        </p>
        <Button asChild>
          <Link href="/dashboard">Kembali ke Dashboard</Link>
        </Button>
      </div>
    )
  }

  return <>{children}</>
}

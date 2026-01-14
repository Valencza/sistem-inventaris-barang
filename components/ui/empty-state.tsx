"use client"

import { cn } from "@/lib/utils"
import { Package, Search, FileQuestion, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ icon: Icon = Package, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>}
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  )
}

export function SearchEmptyState({ query }: { query: string }) {
  return (
    <EmptyState
      icon={Search}
      title="Tidak ditemukan"
      description={`Tidak ada hasil untuk pencarian "${query}". Coba kata kunci lain.`}
    />
  )
}

export function NotFoundState() {
  return (
    <EmptyState
      icon={FileQuestion}
      title="Halaman tidak ditemukan"
      description="Halaman yang Anda cari tidak ada atau telah dipindahkan."
    />
  )
}

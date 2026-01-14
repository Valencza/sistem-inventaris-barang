"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Package,
  LayoutDashboard,
  Tags,
  Warehouse,
  PackageOpen,
  ArrowRightLeft,
  Users,
  Shield,
  FileText,
  LogOut,
  Menu,
  ChevronDown,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useStore } from "@/components/providers/store-provider";
import { FullPageLoading } from "@/components/ui/loading";
import { toast } from "sonner";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Produk", href: "/dashboard/produk", icon: Package },
  { name: "Kategori", href: "/dashboard/kategori", icon: Tags },
  { name: "Gudang", href: "/dashboard/gudang", icon: Warehouse },
  { name: "Stok", href: "/dashboard/stok", icon: PackageOpen },
  { name: "Transfer", href: "/dashboard/transfer", icon: ArrowRightLeft },
  { name: "Pengguna", href: "/dashboard/pengguna", icon: Users },
  { name: "Role", href: "/dashboard/role", icon: Shield },
  { name: "Audit Log", href: "/dashboard/audit-log", icon: FileText },
];

function SidebarContent({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="border-b p-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2"
          onClick={onItemClick}
        >
          <div className="rounded-lg bg-primary p-1.5">
            <Package className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">Inventaris</span>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 p-3">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onItemClick}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Public Link */}
      <div className="border-t p-3">
        <Link
          href="/produk"
          target="_blank"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <PackageOpen className="h-5 w-5" />
          Lihat Katalog Publik
        </Link>
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isReady, currentUser, refreshUser } = useStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Cek auth client-side sebagai lapisan tambahan (proxy sudah proteksi server-side)
  useEffect(() => {
    if (!isReady) return;

    if (!currentUser) {
      router.push("/login");
    } else {
      setIsCheckingAuth(false);
    }
  }, [isReady, currentUser, router]);

  // Logout: panggil API logout, refresh user, lalu redirect ke login
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      await refreshUser();
      toast.success("Anda telah keluar");
      router.push("/login");
    } catch (error) {
      console.error("Gagal logout", error);
      toast.error("Gagal logout");
    }
  };

  if (!isReady || isCheckingAuth) {
    return <FullPageLoading />;
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-card lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-card px-4 lg:hidden">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="-ml-2">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Buka menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
            <SidebarContent onItemClick={() => setIsMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="rounded-lg bg-primary p-1">
            <Package className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold">Inventaris</span>
        </Link>

        <div className="ml-auto">
          <UserMenu
            user={{ name: currentUser.name, email: currentUser.email }}
            onLogout={handleLogout}
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Desktop Header */}
        <header className="sticky top-0 z-30 hidden h-14 items-center gap-4 border-b bg-card px-6 lg:flex">
          <div className="ml-auto">
            <UserMenu
              user={{ name: currentUser.name, email: currentUser.email }}
              onLogout={handleLogout}
            />
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

function UserMenu({
  user,
  onLogout,
}: {
  user: { name: string; email: string };
  onLogout: () => void;
}) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-xs text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden text-left md:block">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div>
            <p className="font-medium">{user.name}</p>
            <p className="text-xs font-normal text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/profil">
            <User className="mr-2 h-4 w-4" />
            Profil Saya
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onLogout}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

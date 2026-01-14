"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Package, Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useStore } from "@/components/providers/store-provider";
import { toast } from "sonner";
import { login } from "@/services/auth"; // helper yang memanggil /api/auth/login

export function LoginForm() {
  const router = useRouter();
  const { refreshUser } = useStore();

  // state untuk menampung input form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // state untuk toggle show/hide password
  const [showPassword, setShowPassword] = useState(false);

  // state untuk indikator loading saat submit
  const [isLoading, setIsLoading] = useState(false);

  // handler submit form login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // cegah double submit
    if (isLoading) return;

    setIsLoading(true);

    try {
      // panggil API login melalui helper
      // helper akan throw Error jika response .ok === false
      const res = await login(email, password);

      // optional: update store global kalau kamu masih pakai
      // misalnya refresh data user dari backend /api/auth/me
      await refreshUser?.();

      // tampilkan notifikasi sukses
      toast.success(`Selamat datang, ${res.user?.name ?? "Pengguna"}!`);

      // redirect ke dashboard setelah login sukses
      router.push("/dashboard");
    } catch (err: any) {
      // ambil pesan error dari helper / network
      const message =
        err?.message && typeof err.message === "string"
          ? err.message
          : "Email atau password salah";

      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <Link href="/" className="mb-4 flex items-center justify-center gap-2">
          <div className="rounded-lg bg-primary p-2">
            <Package className="h-6 w-6 text-primary-foreground" />
          </div>
        </Link>
        <CardTitle className="text-2xl">Masuk ke Dashboard</CardTitle>
        <CardDescription>
          Masukkan kredensial Anda untuk mengakses sistem inventaris
        </CardDescription>
      </CardHeader>

      {/* form login */}
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {/* input email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@inventory.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          {/* input password + toggle show/hide */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="sr-only">
                  {showPassword ? "Sembunyikan" : "Tampilkan"} password
                </span>
              </Button>
            </div>
          </div>

          {/* demo credentials untuk pengujian cepat */}
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="mb-1 font-medium">Demo Credentials:</p>
            <p className="text-muted-foreground">Email: admin@inventory.com</p>
            <p className="text-muted-foreground">Password: password123</p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          {/* tombol submit login */}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Masuk
          </Button>

          {/* link kembali ke beranda */}
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Kembali ke Beranda
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}

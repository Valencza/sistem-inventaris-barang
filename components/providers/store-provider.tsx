"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { store, type AuthUser } from "@/lib/store";

// Bentuk context yang dipakai di seluruh app
interface StoreContextType {
  // penanda bahwa inisialisasi awal (cek user) sudah selesai
  isReady: boolean;
  // user yang sedang login (null jika belum login)
  currentUser: AuthUser;
  // sync user dengan backend lewat /api/auth/me
  refreshUser: () => Promise<void>;
}

// Default value hanya sebagai fallback, akan di‑override oleh Provider
const StoreContext = createContext<StoreContextType>({
  isReady: false,
  currentUser: null,
  refreshUser: async () => {},
});

// Hook untuk akses store di komponen client
export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error("useStore harus digunakan di dalam StoreProvider");
  }
  return ctx;
}

// Provider yang dibungkus di app/layout.tsx
export function StoreProvider({ children }: { children: ReactNode }) {
  // Ambil state global dari Zustand
  const { user, setUser } = store();

  // isReady: true ketika cek user awal sudah selesai
  const [isReady, setIsReady] = useState(false);

  // Fungsi untuk mengambil data user dari backend menggunakan cookie JWT
  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // kirim cookie HttpOnly ke server
      });

      if (!res.ok) {
        // jika 401 / error lain, anggap belum login
        setUser(null);
        return;
      }

      const data = (await res.json()) as { user: AuthUser };
      setUser(data.user ?? null);
    } catch (error) {
      console.error("Gagal refresh user", error);
      setUser(null);
    }
  }, [setUser]);

  // Pada mount pertama, cek user sekali
  useEffect(() => {
    (async () => {
      await refreshUser();
      setIsReady(true);
    })();
  }, [refreshUser]);

  return (
    <StoreContext.Provider
      value={{
        isReady,
        currentUser: user,
        refreshUser,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

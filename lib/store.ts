"use client";

import { create } from "zustand";

// Tipe user yang dikirim dari backend (/api/auth/me)
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  roles: string[]; // sesuaikan dengan struktur roles di API kamu
} | null;

// Tipe state untuk global store
type StoreState = {
  // user yang sedang login (null jika belum login)
  user: AuthUser;

  // set user secara manual (misalnya setelah panggil /api/auth/me)
  setUser: (user: AuthUser) => void;

  // clear user (misalnya setelah logout)
  clearUser: () => void;
};

// Store global berbasis Zustand
export const store = create<StoreState>()((set) => ({
  user: null,

  setUser: (user) => set({ user }),

  clearUser: () => set({ user: null }),
}));

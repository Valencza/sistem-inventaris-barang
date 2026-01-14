import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Endpoint logout.
 *
 * Tugas:
 * - Menghapus cookie "access_token" (JWT) di browser.
 * - Mengembalikan response JSON sederhana.
 *
 * Dipanggil dari client (misal tombol Logout) via:
 *   await fetch("/api/auth/logout", { method: "POST" })
 */
export async function POST(req: NextRequest) {
  // Dapatkan cookie store untuk request ini
  const cookieStore = await cookies();

  // Hapus cookie access_token.
  // cookies().delete() adalah cara resmi untuk menghapus cookie di App Router.
  cookieStore.delete("access_token");

  // (Opsional) jika kamu ingin lebih eksplisit mengatur cookie kosong di response:
  const response = NextResponse.json(
    { message: "Logout berhasil" },
    { status: 200 },
  );

  // Pastikan path sama dengan saat set cookie, agar benar-benar terhapus di semua route
  response.cookies.set("access_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0, // segera kedaluwarsa
  });

  return response;
}

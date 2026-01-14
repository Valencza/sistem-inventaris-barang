import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// NOTE: samakan SECRET ini dengan JWT_SECRET di .env
const secret = new TextEncoder().encode(process.env.JWT_SECRET);

// Fungsi helper untuk verifikasi token di middleware
async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // jalankan proteksi hanya untuk route tertentu (lihat config.matcher)
  // contoh: semua yang diawali /dashboard
  if (pathname.startsWith("/dashboard")) {
    const token = request.cookies.get("access_token")?.value;

    // jika tidak ada token, redirect ke /login
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      // optional: kirim redirectTo supaya bisa balik setelah login
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // cek validitas token
    const payload = await verifyToken(token);
    if (!payload) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // jika valid, lanjutkan request
    return NextResponse.next();
  }

  return NextResponse.next();
}

// Tentukan route mana saja yang diproteksi middleware
export const config = {
  matcher: [
    "/dashboard/:path*", // semua route di bawah /dashboard
    // tambahkan pattern lain kalau perlu, misal:
    // "/api/protected/:path*",
  ],
};

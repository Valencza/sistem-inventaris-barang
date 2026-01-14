import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyAuthToken } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("access_token")?.value

    if (!token) {
      return NextResponse.json(
        { message: "Tidak ada token" },
        { status: 401 },
      )
    }

    const payload = await verifyAuthToken(token)

    const user = await prisma.user.findUnique({
      where: { id: String(payload.sub) },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    })

    if (!user || !user.isActive) {
      return NextResponse.json(
        { message: "User tidak ditemukan atau nonaktif" },
        { status: 401 },
      )
    }

    const roles = user.roles.map((ur) => ur.role.name)

    // flatten semua permission code dari semua role
    const permissions = Array.from(
      new Set(
        user.roles.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission.code),
        ),
      ),
    )

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roles,
          permissions, // <— penting
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Auth me error", error)
    return NextResponse.json(
      { message: "Token tidak valid atau sudah kedaluwarsa" },
      { status: 401 },
    )
  }
}

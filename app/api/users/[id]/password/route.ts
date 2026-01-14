import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit"
import bcrypt from "bcryptjs"

type RouteContext = { params: Promise<{ id: string }> }

// PATCH /api/users/:id/password
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params

  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ message: "Unauthenticated" }, { status: 401 })
    }

    const body = await req.json()
    const { password } = body as { password?: string }

    if (!password || !password.trim()) {
      return NextResponse.json(
        { message: "Password baru wajib diisi" },
        { status: 400 },
      )
    }

    const existing = await prisma.user.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { message: "Pengguna tidak ditemukan" },
        { status: 404 },
      )
    }

    // hash password baru
    const passwordHash = await bcrypt.hash(password.trim(), 10)

    const forwardedFor = req.headers.get("x-forwarded-for")
    const realIp = req.headers.get("x-real-ip")
    const ip =
      forwardedFor?.split(",")[0]?.trim() ??
      realIp ??
      null
    const userAgent = req.headers.get("user-agent") ?? null

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          passwordHash,
        },
      })

      await createAuditLog({
        tx,
        userId: authUser.id,
        action: "UPDATE_PASSWORD",
        entity: "user",
        entityId: id,
        oldData: null,
        newData: { id },
        ipAddress: ip,
        userAgent,
      })
    })

    return NextResponse.json(
      { message: "Password berhasil diubah" },
      { status: 200 },
    )
  } catch (error) {
    console.error("[USERS_PASSWORD]", error)
    return NextResponse.json(
      { message: "Gagal mengubah password" },
      { status: 500 },
    )
  }
}

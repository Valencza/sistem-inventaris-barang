// app/api/profile/password/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit"
import bcrypt from "bcryptjs"

export async function PATCH(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)

    const body = await req.json()
    const { currentPassword, newPassword } = body as {
      currentPassword?: string
      newPassword?: string
    }

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { message: "Password saat ini dan password baru wajib diisi" },
        { status: 400 },
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: "Password baru minimal 6 karakter" },
        { status: 400 },
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
    })

    if (!user) {
      return NextResponse.json(
        { message: "Pengguna tidak ditemukan" },
        { status: 404 },
      )
    }

    const match = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!match) {
      return NextResponse.json(
        { message: "Password saat ini tidak sesuai" },
        { status: 400 },
      )
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)

    const forwardedFor = req.headers.get("x-forwarded-for")
    const realIp = req.headers.get("x-real-ip")
    const ip =
      forwardedFor?.split(",")[0]?.trim() ??
      realIp ??
      null
    const userAgent = req.headers.get("user-agent") ?? null

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: authUser.id },
        data: { passwordHash },
      })

      await createAuditLog({
        tx,
        userId: authUser.id,
        action: "UPDATE_PASSWORD",
        entity: "profile",
        entityId: authUser.id,
        oldData: null,
        newData: { id: authUser.id },
        ipAddress: ip,
        userAgent,
      })
    })

    return NextResponse.json(
      { message: "Password berhasil diubah" },
      { status: 200 },
    )
  } catch (error) {
    console.error("[PROFILE_PASSWORD]", error)
    return NextResponse.json(
      { message: "Gagal mengubah password" },
      { status: 500 },
    )
  }
}

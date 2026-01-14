// app/api/profile/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit"
import type { Prisma } from "@prisma/client"

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: {
        roles: {
          include: { role: true },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { message: "Pengguna tidak ditemukan" },
        { status: 404 },
      )
    }

    const data = {
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.roles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description ?? undefined,
      })),
      // tambahkan lastLogin kalau nanti ada di schema
    }

    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    console.error("[PROFILE_GET]", error)
    return NextResponse.json(
      { message: "Gagal memuat profil" },
      { status: 500 },
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)

    const body = await req.json()
    const { name, email } = body as {
      name?: string
      email?: string
    }

    if (!name || !name.trim() || !email || !email.trim()) {
      return NextResponse.json(
        { message: "Nama dan email wajib diisi" },
        { status: 400 },
      )
    }

    const existing = await prisma.user.findUnique({
      where: { id: authUser.id },
    })

    if (!existing) {
      return NextResponse.json(
        { message: "Pengguna tidak ditemukan" },
        { status: 404 },
      )
    }

    const forwardedFor = req.headers.get("x-forwarded-for")
    const realIp = req.headers.get("x-real-ip")
    const ip =
      forwardedFor?.split(",")[0]?.trim() ??
      realIp ??
      null
    const userAgent = req.headers.get("user-agent") ?? null

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: authUser.id },
        data: {
          name: name.trim(),
          email: email.trim(),
        },
      })

      await createAuditLog({
        tx,
        userId: authUser.id,
        action: "UPDATE",
        entity: "profile",
        entityId: user.id,
        oldData: {
          name: existing.name,
          email: existing.email,
        },
        newData: {
          name: user.name,
          email: user.email,
        },
        ipAddress: ip,
        userAgent,
      })

      return user
    })

    const result = {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    }

    return NextResponse.json({ data: result }, { status: 200 })
  } catch (error: any) {
    console.error("[PROFILE_PUT]", error)

    if (error.code === "P2002" && error.meta?.target?.includes("email")) {
      return NextResponse.json(
        { message: "Email sudah terdaftar" },
        { status: 409 },
      )
    }

    return NextResponse.json(
      { message: "Gagal memperbarui profil" },
      { status: 500 },
    )
  }
}

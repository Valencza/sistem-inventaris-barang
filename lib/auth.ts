// lib/auth.ts
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { verifyAuthToken, type AuthPayload } from "./auth-token"

export * from "./auth-token"

export async function getAuthUser(req: NextRequest) {
  // sesuaikan dengan nama cookie di login.ts
  const token = req.cookies.get("access_token")?.value
  if (!token) throw new Error("UNAUTHORIZED")

  const payload: AuthPayload = await verifyAuthToken(token)

  const userId = payload.sub
  if (!userId || typeof userId !== "string") {
    throw new Error("UNAUTHORIZED")
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user || !user.isActive) {
    throw new Error("UNAUTHORIZED")
  }

  return user
}

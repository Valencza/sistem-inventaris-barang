// lib/auth-token.ts
import { SignJWT, jwtVerify, type JWTPayload } from "jose"

const rawSecret = process.env.JWT_SECRET
if (!rawSecret) {
  throw new Error("JWT_SECRET is not set")
}
const secret = new TextEncoder().encode(rawSecret)

const ONE_HOUR = 60 * 60

export interface AuthPayload extends JWTPayload {
  sub: string
  email?: string
  name?: string
  roles?: string[]
}

export async function signAuthToken(
  payload: AuthPayload,
  expiresIn: number = ONE_HOUR,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn)
    .sign(secret)
}

export async function verifyAuthToken(token: string): Promise<AuthPayload> {
  const { payload } = await jwtVerify(token, secret)
  return payload as AuthPayload
}

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/auth/check-status?email=...
// Returns whether an account is inactive or not approved (without exposing password info).
// Used as a fallback by the login page when NextAuth wraps custom errors.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email")

  if (!email) {
    return NextResponse.json({ status: "INVALID" })
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { active: true, approved: true },
  })

  if (!user) {
    // Return INVALID so we don't reveal whether the email exists
    return NextResponse.json({ status: "INVALID" })
  }

  if (!user.approved) {
    return NextResponse.json({ status: "NOT_APPROVED" })
  }

  if (!user.active) {
    return NextResponse.json({ status: "INACTIVE" })
  }

  // Account is fine — wrong password
  return NextResponse.json({ status: "INVALID" })
}

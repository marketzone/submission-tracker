import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail, emailTemplates } from "@/lib/email"
import crypto from "crypto"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (user) {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex")
      const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now

      // Save token to database
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiry,
        },
      })

      // Always derive the base URL from the incoming request — this is the
      // domain the student is actually on and guarantees the link works.
      // NEXTAUTH_URL is intentionally NOT used here: it may be set to a
      // different domain (or localhost) and would generate a broken link.
      const requestUrl = new URL(request.url)
      const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`
      const resetLink = `${baseUrl}/reset-password?token=${resetToken}`

      // Send email
      const emailTemplate = emailTemplates.passwordReset(user.name, resetLink)
      await sendEmail({
        to: user.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      })
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists with that email, a password reset link has been sent.",
    })
  } catch (error) {
    console.error("Error in forgot password:", error)
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
}

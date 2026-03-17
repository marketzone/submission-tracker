import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "PROGRAM_MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { id: userId } = await params

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })
    if (!user.pendingDeactivation) {
      return NextResponse.json({ error: "User is not pending deactivation" }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: userId },
      data: { active: false, pendingDeactivation: false },
    })

    // Notify the student
    await sendEmail({
      to: user.email,
      subject: "Account Deactivated – Inactivity",
      html: `
        <p>Hi ${user.name},</p>
        <p>You have been deactivated for being inactive for 2 weeks.</p>
        <p>Please visit <a href="https://launchsmart.selar.com/2196921677">launchsmart.selar.com/2196921677</a>, pay the reactivation fee and you will be reactivated.</p>
        <p>Thank you,<br/>LaunchSmart Team</p>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error approving deactivation:", error)
    return NextResponse.json({ error: "Failed to approve deactivation" }, { status: 500 })
  }
}

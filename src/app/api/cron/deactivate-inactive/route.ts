import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"

// This endpoint checks for students who haven't submitted in 2 weeks
// and automatically deactivates them with an email notification.
// Should be called via Vercel Cron or external scheduler.
export async function GET(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

    // Find all active, approved students
    const activeStudents = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        active: true,
        approved: true,
      },
      include: {
        submissions: {
          orderBy: { submittedAt: "desc" },
          take: 1,
          select: { submittedAt: true },
        },
      },
    })

    const deactivated: string[] = []

    for (const student of activeStudents) {
      const lastSubmission = student.submissions[0]

      // Deactivate if: no submissions at all, or last submission was > 2 weeks ago
      const shouldDeactivate = !lastSubmission ||
        new Date(lastSubmission.submittedAt) < twoWeeksAgo

      if (shouldDeactivate) {
        // Deactivate the student
        await prisma.user.update({
          where: { id: student.id },
          data: { active: false },
        })

        // Send notification email
        await sendEmail({
          to: student.email,
          subject: "Account Suspended - Inactivity Notice",
          html: `
            <h2>Account Suspended Due to Inactivity</h2>
            <p>Hi ${student.name},</p>
            <p>Your account has been automatically suspended because you have not made a workbook submission in the last 2 weeks.</p>
            <p>To reactivate your account, you will need to pay a <strong>$20 reactivation penalty fee</strong>.</p>
            <p>Please contact the program manager to arrange payment and have your access restored.</p>
            <p>We encourage all students to stay on track with their weekly submissions to avoid future suspensions.</p>
            <p>Thank you,<br/>LaunchSmart Team</p>
          `,
        })

        deactivated.push(student.name)
      }
    }

    return NextResponse.json({
      success: true,
      checked: activeStudents.length,
      deactivated: deactivated.length,
      deactivatedStudents: deactivated,
    })
  } catch (error) {
    console.error("Error in deactivation cron:", error)
    return NextResponse.json(
      { error: "Failed to process deactivation check" },
      { status: 500 }
    )
  }
}

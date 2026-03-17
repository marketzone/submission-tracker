import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"

// This endpoint checks for students who haven't submitted in 2 weeks
// and flags them as pendingDeactivation for PM review (instead of directly deactivating).
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

    // Find all active, approved students not already pending deactivation,
    // who registered MORE than 14 days ago
    const activeStudents = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        active: true,
        approved: true,
        pendingDeactivation: false,
        createdAt: { lt: twoWeeksAgo },
      },
      include: {
        submissions: {
          orderBy: { submittedAt: "desc" },
          select: { submittedAt: true, status: true },
        },
      },
    })

    const flagged: string[] = []
    const activeStatuses = ["PENDING", "COACH_REVIEW", "HEAD_COACH_REVIEW"]

    for (const student of activeStudents) {
      // Skip if student has any submission currently under review or pending
      const hasActiveSubmission = student.submissions.some(
        (s) => activeStatuses.includes(s.status)
      )
      if (hasActiveSubmission) continue

      const lastSubmission = student.submissions[0]
      const shouldFlag =
        !lastSubmission ||
        new Date(lastSubmission.submittedAt) < twoWeeksAgo

      if (shouldFlag) {
        // Flag for PM review instead of directly deactivating
        await prisma.user.update({
          where: { id: student.id },
          data: { pendingDeactivation: true },
        })

        flagged.push(student.name)
      }
    }

    // Notify all program managers about pending deactivations
    if (flagged.length > 0) {
      const programManagers = await prisma.user.findMany({
        where: { role: "PROGRAM_MANAGER", active: true, approved: true },
        select: { email: true, name: true },
      })

      for (const pm of programManagers) {
        await sendEmail({
          to: pm.email,
          subject: `${flagged.length} Student(s) Flagged for Deactivation Review`,
          html: `
            <h2>Deactivation Review Required</h2>
            <p>Hi ${pm.name},</p>
            <p>The following ${flagged.length} student(s) have not submitted a workbook in the last 2 weeks and have been flagged for deactivation:</p>
            <ul>${flagged.map((name) => `<li>${name}</li>`).join("")}</ul>
            <p>Please log in to the Program Manager dashboard and review the <strong>Pending Deactivations</strong> section to approve or reject each deactivation.</p>
            <p>Thank you,<br/>LaunchSmart System</p>
          `,
        })
      }
    }

    return NextResponse.json({
      success: true,
      checked: activeStudents.length,
      flagged: flagged.length,
      flaggedStudents: flagged,
    })
  } catch (error) {
    console.error("Error in deactivation cron:", error)
    return NextResponse.json(
      { error: "Failed to process deactivation check" },
      { status: 500 }
    )
  }
}

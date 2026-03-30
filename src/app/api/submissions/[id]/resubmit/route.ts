import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail, emailTemplates } from "@/lib/email"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: submissionId } = await params

    // Get the submission
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        coach: { select: { name: true, email: true } },
        headCoach: { select: { name: true, email: true } },
        student: { select: { name: true, email: true } },
      },
    })

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      )
    }

    // Check if student owns this submission
    if (submission.studentId !== session.user.id) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      )
    }

    // Check if submission needs correction
    if (submission.status !== "NEEDS_CORRECTION") {
      return NextResponse.json(
        { error: "This submission is not awaiting corrections" },
        { status: 400 }
      )
    }

    if (submission.returnedByHeadCoach) {
      // Was sent back by head coach — resubmit directly to head coach
      const updatedSubmission = await prisma.submission.update({
        where: { id: submissionId },
        data: {
          status: "HEAD_COACH_REVIEW",
          headCoachFeedback: null,
          returnedByHeadCoach: false,
        },
      })

      // Notify head coach
      if (submission.headCoach) {
        const headCoachEmail = emailTemplates.headCoachReviewRequest(
          submission.headCoach.name,
          submission.student.name,
          submission.workbookTitle,
          submission.coach.name
        )
        await sendEmail({
          to: submission.headCoach.email,
          subject: "Resubmitted: " + headCoachEmail.subject,
          html: headCoachEmail.html,
        })
      }

      return NextResponse.json({ submission: updatedSubmission })
    } else {
      // Was sent back by coach — resubmit to coach as normal
      const updatedSubmission = await prisma.submission.update({
        where: { id: submissionId },
        data: {
          status: "PENDING",
          coachFeedback: null,
          reviewedAt: null,
        },
      })

      // Notify coach
      const coachEmail = emailTemplates.newReviewRequest(
        submission.coach.name,
        submission.student.name,
        submission.workbookTitle,
        submission.weekNumber
      )
      await sendEmail({
        to: submission.coach.email,
        subject: "Resubmitted: " + coachEmail.subject,
        html: coachEmail.html,
      })

      return NextResponse.json({ submission: updatedSubmission })
    }
  } catch (error) {
    console.error("Error resubmitting:", error)
    return NextResponse.json(
      { error: "Failed to resubmit" },
      { status: 500 }
    )
  }
}

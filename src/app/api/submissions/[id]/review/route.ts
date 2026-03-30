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

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { approved, feedback, sendToStudent } = await request.json()
    const { id: submissionId } = await params

    // Get the submission
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        student: { select: { name: true, email: true } },
        coach: { select: { name: true, email: true } },
      },
    })

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      )
    }

    // Check authorization based on role
    if (session.user.role === "COACH") {
      if (submission.coachId !== session.user.id) {
        return NextResponse.json(
          { error: "Not authorized to review this submission" },
          { status: 403 }
        )
      }

      // Update submission based on coach decision
      const updatedSubmission = await prisma.submission.update({
        where: { id: submissionId },
        data: {
          status: approved ? "HEAD_COACH_REVIEW" : "NEEDS_CORRECTION",
          coachFeedback: approved ? null : feedback,
          reviewedAt: new Date(),
        },
        include: {
          student: { select: { name: true, email: true } },
        },
      })

      // Send email notification to student
      const statusEmail = emailTemplates.statusChanged(
        updatedSubmission.student.name,
        updatedSubmission.workbookTitle,
        approved ? "Approved by Coach - Awaiting Head Coach Review" : "Needs Correction",
        feedback
      )
      await sendEmail({
        to: updatedSubmission.student.email,
        subject: statusEmail.subject,
        html: statusEmail.html,
      })

      // If approved, notify head coach
      if (approved) {
        const headCoach = await prisma.user.findFirst({
          where: { role: "HEAD_COACH" },
        })

        if (headCoach) {
          const headCoachEmail = emailTemplates.headCoachReviewRequest(
            headCoach.name,
            updatedSubmission.student.name,
            updatedSubmission.workbookTitle,
            submission.coach.name
          )
          await sendEmail({
            to: headCoach.email,
            subject: headCoachEmail.subject,
            html: headCoachEmail.html,
          })

          // Set the head coach ID
          await prisma.submission.update({
            where: { id: submissionId },
            data: { headCoachId: headCoach.id },
          })
        }
      }

      return NextResponse.json({ submission: updatedSubmission })
    } else if (session.user.role === "HEAD_COACH") {
      // Head coach final review
      let status: "APPROVED" | "NEEDS_CORRECTION" | "COACH_REVIEW" = "APPROVED"

      if (!approved) {
        // If not approved, check if sending to student or coach
        status = sendToStudent ? "NEEDS_CORRECTION" : "COACH_REVIEW"
      }

      const updatedSubmission = await prisma.submission.update({
        where: { id: submissionId },
        data: {
          status,
          headCoachFeedback: approved ? null : feedback,
          headReviewedAt: new Date(),
          returnedByHeadCoach: !approved && sendToStudent ? true : false,
        },
        include: {
          student: { select: { name: true, email: true } },
          coach: { select: { name: true, email: true } },
        },
      })

      // Send email notification
      if (approved) {
        // Final approval - notify student
        const statusEmail = emailTemplates.statusChanged(
          updatedSubmission.student.name,
          updatedSubmission.workbookTitle,
          "Approved",
          undefined
        )
        await sendEmail({
          to: updatedSubmission.student.email,
          subject: statusEmail.subject,
          html: statusEmail.html,
        })
      } else if (sendToStudent) {
        // Send back to student - notify student
        const statusEmail = emailTemplates.statusChanged(
          updatedSubmission.student.name,
          updatedSubmission.workbookTitle,
          "Needs Correction (Head Coach)",
          feedback
        )
        await sendEmail({
          to: updatedSubmission.student.email,
          subject: statusEmail.subject,
          html: statusEmail.html,
        })

        // Also notify coach that it was sent back to student
        const coachEmail = emailTemplates.statusChanged(
          updatedSubmission.coach.name,
          updatedSubmission.workbookTitle,
          "Head Coach Sent Back to Student",
          feedback
        )
        await sendEmail({
          to: updatedSubmission.coach.email,
          subject: coachEmail.subject,
          html: coachEmail.html,
        })
      } else {
        // Send back to coach - notify coach only
        const coachEmail = emailTemplates.statusChanged(
          updatedSubmission.coach.name,
          updatedSubmission.workbookTitle,
          "Sent Back for Review",
          feedback
        )
        await sendEmail({
          to: updatedSubmission.coach.email,
          subject: coachEmail.subject,
          html: coachEmail.html,
        })
      }

      return NextResponse.json({ submission: updatedSubmission })
    }

    return NextResponse.json(
      { error: "Not authorized to review submissions" },
      { status: 403 }
    )
  } catch (error) {
    console.error("Error reviewing submission:", error)
    return NextResponse.json(
      { error: "Failed to review submission" },
      { status: 500 }
    )
  }
}

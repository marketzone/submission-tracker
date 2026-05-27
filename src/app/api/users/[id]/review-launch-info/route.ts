import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "HEAD_COACH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { action, feedback } = await request.json()

    if (action !== "approve" && action !== "revise") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    if (action === "revise" && !feedback?.trim()) {
      return NextResponse.json(
        { error: "Feedback is required when requesting revisions" },
        { status: 400 }
      )
    }

    const student = await prisma.user.findUnique({
      where: { id, role: "STUDENT" },
      select: { name: true, email: true, launchInfoStatus: true },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    if (student.launchInfoStatus !== "PENDING_REVIEW") {
      return NextResponse.json(
        { error: "Launch info is not pending review" },
        { status: 400 }
      )
    }

    const newStatus = action === "approve" ? "APPROVED" : "NEEDS_REVISION"

    await prisma.user.update({
      where: { id },
      data: {
        launchInfoStatus: newStatus,
        launchInfoFeedback: action === "revise" ? feedback.trim() : null,
      },
    })

    if (action === "approve") {
      await sendEmail({
        to: student.email,
        subject: "Launch Information Approved",
        html: `
          <h2>Launch Information Approved!</h2>
          <p>Hi ${student.name},</p>
          <p>Great news! Your launch information has been reviewed and approved by the head coach.</p>
          <p>You can now proceed with your workbook submissions.</p>
          <p>Welcome to the next stage of your journey!</p>
        `,
      })
    } else {
      await sendEmail({
        to: student.email,
        subject: "Launch Information — Revision Needed",
        html: `
          <h2>Launch Information Needs Revision</h2>
          <p>Hi ${student.name},</p>
          <p>The head coach has reviewed your launch information and requested some revisions.</p>
          <p><strong>Feedback:</strong> ${feedback}</p>
          <p>Please log in, update your launch information, and resubmit for review.</p>
        `,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error reviewing launch info:", error)
    return NextResponse.json(
      { error: "Failed to submit review" },
      { status: 500 }
    )
  }
}

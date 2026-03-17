import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "PROGRAM_MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { id: submissionId } = await params
    const { coachId } = await request.json()

    if (!coachId) {
      return NextResponse.json({ error: "coachId is required" }, { status: 400 })
    }

    const coach = await prisma.user.findUnique({
      where: { id: coachId, role: "COACH" },
      select: { id: true, name: true },
    })

    if (!coach) {
      return NextResponse.json({ error: "Coach not found" }, { status: 404 })
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
    })

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        coachId,
        // Reset coach review fields when reassigning
        status: submission.status === "COACH_REVIEW" ? "PENDING" : submission.status,
        coachFeedback: submission.status === "COACH_REVIEW" ? null : submission.coachFeedback,
        reviewedAt: submission.status === "COACH_REVIEW" ? null : submission.reviewedAt,
      },
    })

    return NextResponse.json({ success: true, submission: updated, coach })
  } catch (error) {
    console.error("Error reassigning coach:", error)
    return NextResponse.json({ error: "Failed to reassign coach" }, { status: 500 })
  }
}

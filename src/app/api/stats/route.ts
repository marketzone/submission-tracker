import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "HEAD_COACH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all submissions
    const allSubmissions = await prisma.submission.findMany({
      include: {
        coach: { select: { name: true } },
      },
    })

    // Calculate total submissions
    const totalSubmissions = allSubmissions.length

    // Count pending final review
    const pendingFinalReview = allSubmissions.filter(
      (s) => s.status === "HEAD_COACH_REVIEW"
    ).length

    // Calculate approval rate
    const approvedCount = allSubmissions.filter((s) => s.status === "APPROVED").length
    const approvalRate = totalSubmissions > 0 ? (approvedCount / totalSubmissions) * 100 : 0

    // Count pending by coach
    const pendingByCoach: Record<string, number> = {}
    allSubmissions
      .filter((s) => s.status === "PENDING" || s.status === "COACH_REVIEW")
      .forEach((submission) => {
        const coachName = submission.coach.name
        pendingByCoach[coachName] = (pendingByCoach[coachName] || 0) + 1
      })

    return NextResponse.json({
      totalSubmissions,
      pendingFinalReview,
      approvalRate,
      pendingByCoach,
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}

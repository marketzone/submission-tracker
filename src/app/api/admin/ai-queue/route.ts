// GET /api/admin/ai-queue
// Returns all submissions with aiReviewStatus = HELD_FOR_HUMAN, ordered by aiReviewedAt desc.
// Auth: HEAD_COACH session only.
// Response omits full submitted document text. aiFeedback JSON is included for queue display.

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user || (session.user as { role?: string }).role !== "HEAD_COACH") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const items = await prisma.submission.findMany({
    where: { aiReviewStatus: "HELD_FOR_HUMAN" },
    orderBy: { aiReviewedAt: "desc" },
    select: {
      id: true,
      weekNumber: true,
      workbookTitle: true,
      workbookUrl: true,
      aiReviewStatus: true,
      aiNicheAlignment: true,
      aiFeedback: true,
      aiTriageVerdict: true,
      aiReviewedAt: true,
      reviewModelVersion: true,
      status: true,
      submittedAt: true,
      student: {
        select: {
          id: true,
          name: true,
          studentClass: true,
        },
      },
    },
  })

  return NextResponse.json({ items })
}

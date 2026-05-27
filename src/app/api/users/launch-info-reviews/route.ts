import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - fetch students with pending launch info reviews (HEAD_COACH only)
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "HEAD_COACH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const students = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        launchInfoStatus: "PENDING_REVIEW",
      },
      select: {
        id: true,
        name: true,
        email: true,
        studentClass: true,
        launchStrategy: true,
        launchPricing: true,
        launchPrice: true,
        launchEventTopic: true,
        approvedEventTitle: true,
        niche: true,
        launchInfoStatus: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "asc" },
    })

    return NextResponse.json({ students })
  } catch (error) {
    console.error("Error fetching launch info reviews:", error)
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    )
  }
}

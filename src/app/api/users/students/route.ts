import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only program managers can access this
    if (session.user.role !== "PROGRAM_MANAGER") {
      return NextResponse.json(
        { error: "Not authorized to view students" },
        { status: 403 }
      )
    }

    const students = await prisma.user.findMany({
      where: {
        role: "STUDENT",
      },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        approved: true,
        pendingDeactivation: true,
        studentClass: true,
        coachId: true,
        launchStrategy: true,
        launchEventTopic: true,
        niche: true,
        coach: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json({ students })
  } catch (error) {
    console.error("Error fetching students:", error)
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    )
  }
}

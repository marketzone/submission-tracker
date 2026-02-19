import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - fetch the current student's launch info
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        launchStrategy: true,
        launchEventTopic: true,
        studentClass: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error fetching launch info:", error)
    return NextResponse.json(
      { error: "Failed to fetch launch info" },
      { status: 500 }
    )
  }
}

// PATCH - update the current student's launch info
export async function PATCH(request: Request) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify student is in Strategy Class or above
    const student = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { studentClass: true },
    })

    const allowedClasses = ["STRATEGY_CLASS", "FUNNEL_CLASS", "LAUNCH_CLASS"]
    if (!student?.studentClass || !allowedClasses.includes(student.studentClass)) {
      return NextResponse.json(
        { error: "You must be in Strategy Class or above to update launch information" },
        { status: 403 }
      )
    }

    const { launchStrategy, launchEventTopic } = await request.json()

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        launchStrategy: launchStrategy || null,
        launchEventTopic: launchEventTopic || null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating launch info:", error)
    return NextResponse.json(
      { error: "Failed to update launch info" },
      { status: 500 }
    )
  }
}

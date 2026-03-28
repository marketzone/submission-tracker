import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const VALID_ACTIONS = ["CANVA_SUBMITTED", "POST_APPROVED", "AD_SETUP_PENDING", "METRICS_READ"]

// GET /api/strategy-progress — fetch the student's current progress
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const progress = await prisma.strategyProgress.findUnique({
      where: { studentId: session.user.id },
      select: { action: true, updatedAt: true },
    })

    return NextResponse.json({ progress })
  } catch (error) {
    console.error("Error fetching strategy progress:", error)
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 })
  }
}

// POST /api/strategy-progress — upsert the student's current progress step
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify the student is in STRATEGY_CLASS
    const student = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { studentClass: true, active: true },
    })

    if (!student?.active) {
      return NextResponse.json({ error: "Account is deactivated" }, { status: 403 })
    }

    if (student.studentClass !== "STRATEGY_CLASS") {
      return NextResponse.json({ error: "Only Strategy Class students can record this progress" }, { status: 403 })
    }

    const { action } = await request.json()

    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Upsert: create if not exists, update if exists
    const progress = await prisma.strategyProgress.upsert({
      where: { studentId: session.user.id },
      update: { action },
      create: { studentId: session.user.id, action },
    })

    return NextResponse.json({ progress })
  } catch (error) {
    console.error("Error saving strategy progress:", error)
    return NextResponse.json({ error: "Failed to save progress" }, { status: 500 })
  }
}

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

    const { id } = await params
    const { coachId } = await request.json()

    // Verify the user is a student
    const student = await prisma.user.findUnique({
      where: { id, role: "STUDENT" },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // If coachId is provided, verify the coach exists
    if (coachId) {
      const coach = await prisma.user.findUnique({
        where: { id: coachId, role: "COACH" },
      })

      if (!coach) {
        return NextResponse.json({ error: "Coach not found" }, { status: 404 })
      }
    }

    // Update the student's coach
    await prisma.user.update({
      where: { id },
      data: {
        coachId: coachId || null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating student coach:", error)
    return NextResponse.json(
      { error: "Failed to update coach" },
      { status: 500 }
    )
  }
}

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only program managers can update student class
    if (session.user.role !== "PROGRAM_MANAGER") {
      return NextResponse.json(
        { error: "Only program managers can update student class" },
        { status: 403 }
      )
    }

    const { id: userId } = await params
    const { studentClass } = await request.json()

    // Get the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Only allow updating students
    if (user.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Can only update class for students" },
        { status: 400 }
      )
    }

    // Update the student's class
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        studentClass: studentClass || null,
      },
    })

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        studentClass: updatedUser.studentClass,
      },
    })
  } catch (error) {
    console.error("Error updating student class:", error)
    return NextResponse.json(
      { error: "Failed to update student class" },
      { status: 500 }
    )
  }
}

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "HEAD_COACH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { id } = await params

    // Find the user to delete
    const userToDelete = await prisma.user.findUnique({
      where: { id },
    })

    if (!userToDelete) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Only allow deleting coaches and program managers
    if (userToDelete.role !== "COACH" && userToDelete.role !== "PROGRAM_MANAGER") {
      return NextResponse.json(
        { error: "Can only delete coaches and program managers" },
        { status: 400 }
      )
    }

    // Prevent deleting yourself
    if (userToDelete.id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      )
    }

    if (userToDelete.role === "COACH") {
      // Unassign students from this coach
      await prisma.user.updateMany({
        where: { coachId: id },
        data: { coachId: null },
      })

      // Delete all submissions assigned to this coach
      await prisma.submission.deleteMany({
        where: { coachId: id },
      })
    }

    // Delete the user
    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    )
  }
}

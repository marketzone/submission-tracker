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

    if (session.user.role !== "PROGRAM_MANAGER") {
      return NextResponse.json(
        { error: "Only program managers can rename users" },
        { status: 403 }
      )
    }

    const { id: userId } = await params
    const { name } = await request.json()

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name: name.trim() },
    })

    return NextResponse.json({
      success: true,
      user: { id: updatedUser.id, name: updatedUser.name },
    })
  } catch (error) {
    console.error("Error updating user name:", error)
    return NextResponse.json({ error: "Failed to update name" }, { status: 500 })
  }
}

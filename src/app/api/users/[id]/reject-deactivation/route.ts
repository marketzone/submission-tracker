import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "PROGRAM_MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { id: userId } = await params

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    await prisma.user.update({
      where: { id: userId },
      data: { pendingDeactivation: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error rejecting deactivation:", error)
    return NextResponse.json({ error: "Failed to reject deactivation" }, { status: 500 })
  }
}

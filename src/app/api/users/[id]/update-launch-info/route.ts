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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { niche, launchStrategy, launchPricing, launchPrice, launchEventTopic, approvedEventTitle } = await request.json()

    const student = await prisma.user.findUnique({
      where: { id, role: "STUDENT" },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        niche: niche !== undefined ? (niche.trim() || null) : undefined,
        launchStrategy: launchStrategy !== undefined ? (launchStrategy.trim() || null) : undefined,
        launchPricing: launchPricing !== undefined ? (launchPricing.trim() || null) : undefined,
        launchPrice: launchPrice !== undefined ? (launchPrice.trim() || null) : undefined,
        launchEventTopic: launchEventTopic !== undefined ? (launchEventTopic.trim() || null) : undefined,
        approvedEventTitle: approvedEventTitle !== undefined ? (approvedEventTitle.trim() || null) : undefined,
      },
      select: { id: true, niche: true, launchStrategy: true, launchPricing: true, launchPrice: true, launchEventTopic: true, approvedEventTitle: true },
    })

    return NextResponse.json({ student: updated })
  } catch (error) {
    console.error("Error updating launch info:", error)
    return NextResponse.json({ error: "Failed to update launch info" }, { status: 500 })
  }
}

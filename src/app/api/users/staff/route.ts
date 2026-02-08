import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only head coaches can access this endpoint
    if (session.user.role !== "HEAD_COACH") {
      return NextResponse.json(
        { error: "Only head coaches can access staff list" },
        { status: 403 }
      )
    }

    const staff = await prisma.user.findMany({
      where: {
        role: {
          in: ["COACH", "PROGRAM_MANAGER"],
        },
        approved: true, // Only show approved staff
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json({ staff })
  } catch (error) {
    console.error("Error fetching staff:", error)
    return NextResponse.json(
      { error: "Failed to fetch staff", staff: [] },
      { status: 500 }
    )
  }
}

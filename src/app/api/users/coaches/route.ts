import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const coaches = await prisma.user.findMany({
      where: {
        role: "COACH",
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json({ coaches })
  } catch (error) {
    console.error("Error fetching coaches:", error)
    return NextResponse.json(
      { error: "Failed to fetch coaches", coaches: [] },
      { status: 500 }
    )
  }
}

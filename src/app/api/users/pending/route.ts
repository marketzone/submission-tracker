import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let pendingUsers

    if (session.user.role === "PROGRAM_MANAGER") {
      // Program managers see pending students
      pendingUsers = await prisma.user.findMany({
        where: {
          role: "STUDENT",
          approved: false,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          coachId: true,
          coach: {
            select: {
              name: true,
            },
          },
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    } else if (session.user.role === "HEAD_COACH") {
      // Head coaches see pending coaches and program managers
      pendingUsers = await prisma.user.findMany({
        where: {
          role: {
            in: ["COACH", "PROGRAM_MANAGER"],
          },
          approved: false,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    } else {
      return NextResponse.json(
        { error: "Not authorized to view pending users" },
        { status: 403 }
      )
    }

    return NextResponse.json({ users: pendingUsers })
  } catch (error) {
    console.error("Error fetching pending users:", error)
    return NextResponse.json(
      { error: "Failed to fetch pending users" },
      { status: 500 }
    )
  }
}

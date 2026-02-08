import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail, emailTemplates } from "@/lib/email"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: userId } = await params

    // Get the current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Authorization check based on role
    if (session.user.role === "PROGRAM_MANAGER") {
      // Program managers can only toggle students
      if (user.role !== "STUDENT") {
        return NextResponse.json(
          { error: "Program managers can only activate/deactivate students" },
          { status: 403 }
        )
      }
    } else if (session.user.role === "HEAD_COACH") {
      // Head coaches can toggle coaches and program managers
      if (user.role !== "COACH" && user.role !== "PROGRAM_MANAGER") {
        return NextResponse.json(
          { error: "Head coaches can only activate/deactivate coaches and program managers" },
          { status: 403 }
        )
      }
    } else {
      return NextResponse.json(
        { error: "Not authorized to manage users" },
        { status: 403 }
      )
    }

    // Toggle the active status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        active: !user.active,
      },
    })

    // Send email notification
    if (updatedUser.active) {
      // User was reactivated
      let email
      if (updatedUser.role === "STUDENT") {
        email = emailTemplates.studentReactivated(updatedUser.name)
      } else {
        email = emailTemplates.staffReactivated(updatedUser.name, updatedUser.role)
      }
      await sendEmail({
        to: updatedUser.email,
        subject: email.subject,
        html: email.html,
      })
    } else {
      // User was deactivated
      let email
      if (updatedUser.role === "STUDENT") {
        email = emailTemplates.studentDeactivated(updatedUser.name)
      } else {
        email = emailTemplates.staffDeactivated(updatedUser.name, updatedUser.role)
      }
      await sendEmail({
        to: updatedUser.email,
        subject: email.subject,
        html: email.html,
      })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        active: updatedUser.active,
      },
    })
  } catch (error) {
    console.error("Error toggling user status:", error)
    return NextResponse.json(
      { error: "Failed to toggle user status" },
      { status: 500 }
    )
  }
}

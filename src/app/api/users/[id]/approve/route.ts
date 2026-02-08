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
    const { approved, studentClass } = await request.json()

    // Get the user to approve/reject
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Authorization check
    if (session.user.role === "PROGRAM_MANAGER" && user.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Program managers can only approve students" },
        { status: 403 }
      )
    }

    if (
      session.user.role === "HEAD_COACH" &&
      user.role !== "COACH" &&
      user.role !== "PROGRAM_MANAGER"
    ) {
      return NextResponse.json(
        { error: "Head coaches can only approve coaches and program managers" },
        { status: 403 }
      )
    }

    if (
      session.user.role !== "PROGRAM_MANAGER" &&
      session.user.role !== "HEAD_COACH"
    ) {
      return NextResponse.json(
        { error: "Not authorized to approve users" },
        { status: 403 }
      )
    }

    if (approved) {
      // Approve the user
      const updateData: any = {
        approved: true,
      }

      // If approving a student and class is provided, assign the class
      if (user.role === "STUDENT" && studentClass) {
        updateData.studentClass = studentClass
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
      })

      // Send approval email
      const approvalEmail = emailTemplates.userApproved(
        updatedUser.name,
        updatedUser.role,
        updatedUser.studentClass
      )
      await sendEmail({
        to: updatedUser.email,
        subject: approvalEmail.subject,
        html: approvalEmail.html,
      })

      return NextResponse.json({
        success: true,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          approved: updatedUser.approved,
          studentClass: updatedUser.studentClass,
        },
      })
    } else {
      // Reject the user - delete the account
      await prisma.user.delete({
        where: { id: userId },
      })

      // Send rejection email
      const rejectionEmail = emailTemplates.userRejected(user.name, user.role)
      await sendEmail({
        to: user.email,
        subject: rejectionEmail.subject,
        html: rejectionEmail.html,
      })

      return NextResponse.json({
        success: true,
        message: "User rejected and account deleted",
      })
    }
  } catch (error) {
    console.error("Error approving/rejecting user:", error)
    return NextResponse.json(
      { error: "Failed to process approval" },
      { status: 500 }
    )
  }
}

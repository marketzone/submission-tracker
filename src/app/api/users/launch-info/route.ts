import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"

// GET - fetch the current student's launch info
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        launchStrategy: true,
        launchPricing: true,
        launchPrice: true,
        launchEventTopic: true,
        approvedEventTitle: true,
        launchInfoStatus: true,
        launchInfoFeedback: true,
        studentClass: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error fetching launch info:", error)
    return NextResponse.json(
      { error: "Failed to fetch launch info" },
      { status: 500 }
    )
  }
}

// PATCH - update the current student's launch info
export async function PATCH(request: Request) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const student = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { studentClass: true, name: true },
    })

    const allowedClasses = ["STRATEGY_CLASS", "FUNNEL_CLASS", "LAUNCH_CLASS"]
    if (!student?.studentClass || !allowedClasses.includes(student.studentClass)) {
      return NextResponse.json(
        { error: "You must be in Strategy Class or above to update launch information" },
        { status: 403 }
      )
    }

    const { launchStrategy, launchPricing, launchPrice, launchEventTopic } = await request.json()

    const requiresReview = ["STRATEGY_CLASS", "FUNNEL_CLASS"].includes(student.studentClass)

    if (requiresReview) {
      if (!launchStrategy || !launchPricing || !launchEventTopic?.trim()) {
        return NextResponse.json(
          { error: "Please fill all required fields: launch format, pricing model, and content direction" },
          { status: 400 }
        )
      }
      if ((launchPricing === "Pay What You Want" || launchPricing === "Low Ticket") && !launchPrice?.trim()) {
        return NextResponse.json(
          { error: "Please enter a price for your selected pricing model" },
          { status: 400 }
        )
      }
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        launchStrategy: launchStrategy || null,
        launchPricing: launchPricing || null,
        launchPrice: launchPrice || null,
        launchEventTopic: launchEventTopic || null,
        ...(requiresReview && {
          launchInfoStatus: "PENDING_REVIEW",
          launchInfoFeedback: null,
        }),
      },
    })

    if (requiresReview) {
      const headCoach = await prisma.user.findFirst({
        where: { role: "HEAD_COACH", active: true },
        select: { name: true, email: true },
      })
      if (headCoach) {
        await sendEmail({
          to: headCoach.email,
          subject: "Launch Info Submitted for Review",
          html: `
            <h2>Launch Info Review Request</h2>
            <p>Hi ${headCoach.name},</p>
            <p><strong>${student.name}</strong> has submitted their launch information for review.</p>
            <ul>
              <li><strong>Launch Format:</strong> ${launchStrategy}</li>
              <li><strong>Pricing:</strong> ${launchPricing}${launchPrice ? ` ($${launchPrice})` : ""}</li>
              <li><strong>Content Direction:</strong> ${launchEventTopic}</li>
            </ul>
            <p>Log in to the dashboard to review and approve or request revisions.</p>
          `,
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating launch info:", error)
    return NextResponse.json(
      { error: "Failed to update launch info" },
      { status: 500 }
    )
  }
}

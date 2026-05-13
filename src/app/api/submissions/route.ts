import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail, emailTemplates } from "@/lib/email"

// GET /api/submissions - Fetch submissions based on user role
export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const weekNumber = searchParams.get("weekNumber")
    const studentName = searchParams.get("studentName")

    let submissions

    switch (session.user.role) {
      case "STUDENT":
        // Students see their own submissions
        submissions = await prisma.submission.findMany({
          where: { studentId: session.user.id },
          include: {
            coach: { select: { name: true, email: true } },
            headCoach: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        })
        break

      case "COACH":
        // Coaches see submissions assigned to them
        const whereClause: any = {
          coachId: session.user.id,
        }
        if (status) whereClause.status = status
        if (weekNumber) whereClause.weekNumber = parseInt(weekNumber)

        submissions = await prisma.submission.findMany({
          where: whereClause,
          include: {
            student: { select: { name: true, email: true, studentClass: true, launchStrategy: true, launchEventTopic: true } },
            headCoach: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        })

        // Filter by student name if provided (case insensitive)
        if (studentName) {
          submissions = submissions.filter((s) =>
            s.student.name.toLowerCase().includes(studentName.toLowerCase())
          )
        }
        break

      case "HEAD_COACH":
        // Head coaches see submissions in HEAD_COACH_REVIEW status
        submissions = await prisma.submission.findMany({
          where: {
            status: (status as any) || "HEAD_COACH_REVIEW",
          },
          include: {
            student: { select: { name: true, email: true, studentClass: true, launchStrategy: true, launchEventTopic: true } },
            coach: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        })
        break

      case "PROGRAM_MANAGER":
        // Program managers see all submissions
        submissions = await prisma.submission.findMany({
          include: {
            student: { select: { name: true, email: true, active: true } },
            coach: { select: { name: true, email: true } },
            headCoach: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        })
        break

      default:
        return NextResponse.json({ error: "Invalid role" }, { status: 403 })
    }

    return NextResponse.json({ submissions })
  } catch (error) {
    console.error("Error fetching submissions:", error)
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    )
  }
}

// POST /api/submissions - Create a new submission (students only)
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Re-check active status and class directly from DB — the JWT may be stale
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { active: true, studentClass: true },
    })
    if (!dbUser?.active) {
      return NextResponse.json({ error: "Your account is deactivated. You cannot submit." }, { status: 403 })
    }

    const { workbookTitle, workbookUrl, weekNumber, coachId, studentNote } =
      await request.json()

    const isLaunchClass = dbUser.studentClass === "LAUNCH_CLASS"

    // Validate required fields (coachId optional for LAUNCH_CLASS students)
    if (!workbookTitle || !workbookUrl || typeof weekNumber !== 'number' || (!isLaunchClass && !coachId)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    let resolvedCoachId: string
    let headCoachId: string | null = null

    if (isLaunchClass) {
      // LAUNCH_CLASS: bypass coaches, assign directly to head coach
      const headCoach = await prisma.user.findFirst({
        where: { role: "HEAD_COACH", active: true },
      })
      if (!headCoach) {
        return NextResponse.json({ error: "No head coach available" }, { status: 400 })
      }
      resolvedCoachId = headCoach.id
      headCoachId = headCoach.id
    } else {
      // Verify coach exists
      const coach = await prisma.user.findUnique({
        where: { id: coachId, role: "COACH" },
      })
      if (!coach) {
        return NextResponse.json({ error: "Invalid coach" }, { status: 400 })
      }
      resolvedCoachId = coachId
    }

    // Create submission
    const submission = await prisma.submission.create({
      data: {
        studentId: session.user.id,
        workbookTitle,
        workbookUrl,
        weekNumber,
        coachId: resolvedCoachId,
        headCoachId,
        status: isLaunchClass ? "HEAD_COACH_REVIEW" : "PENDING",
        studentNote: studentNote || null,
      },
      include: {
        student: { select: { name: true, email: true } },
        coach: { select: { name: true, email: true } },
        headCoach: { select: { name: true, email: true } },
      },
    })

    // Send email notifications
    const studentEmail = emailTemplates.submissionReceived(
      submission.student.name,
      workbookTitle,
      weekNumber
    )
    await sendEmail({
      to: submission.student.email,
      subject: studentEmail.subject,
      html: studentEmail.html,
    })

    if (isLaunchClass && submission.headCoach) {
      // Notify head coach directly
      const hcEmail = emailTemplates.newReviewRequest(
        submission.headCoach.name,
        submission.student.name,
        workbookTitle,
        weekNumber
      )
      await sendEmail({
        to: submission.headCoach.email,
        subject: hcEmail.subject,
        html: hcEmail.html,
      })
    } else {
      const coachEmail = emailTemplates.newReviewRequest(
        submission.coach.name,
        submission.student.name,
        workbookTitle,
        weekNumber
      )
      await sendEmail({
        to: submission.coach.email,
        subject: coachEmail.subject,
        html: coachEmail.html,
      })
    }

    return NextResponse.json({ submission }, { status: 201 })
  } catch (error) {
    console.error("Error creating submission:", error)
    return NextResponse.json(
      { error: "Failed to create submission" },
      { status: 500 }
    )
  }
}

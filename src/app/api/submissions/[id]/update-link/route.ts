import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const role = (session?.user as { role?: string })?.role
  if (!session?.user || (role !== "HEAD_COACH" && role !== "PROGRAM_MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  let workbookUrl: string
  try {
    const body = await request.json()
    if (!body?.workbookUrl || typeof body.workbookUrl !== "string" || !body.workbookUrl.trim()) {
      return NextResponse.json({ error: "workbookUrl (non-empty string) required" }, { status: 400 })
    }
    workbookUrl = body.workbookUrl.trim()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const submission = await prisma.submission.findUnique({ where: { id } })
  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 })
  }

  const updated = await prisma.submission.update({
    where: { id },
    data: { workbookUrl },
    select: { id: true, workbookUrl: true, workbookTitle: true },
  })

  return NextResponse.json({ submission: updated })
}

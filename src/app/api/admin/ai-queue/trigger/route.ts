// POST /api/admin/ai-queue/trigger
// Session-authenticated trigger for the head coach dashboard.
// Runs the full AI review pipeline for a single submission and returns the result.
// Auth: HEAD_COACH session only (dashboard-facing; CRON_SECRET not required).
// Per PII rule: response includes submission ID and verdict, never submission text.

export const maxDuration = 300 // 5 minutes — Claude review takes 2-3 min

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { runAiReview } from "@/lib/ai/runAiReview"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || (session.user as { role?: string }).role !== "HEAD_COACH") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let submissionId: string
  try {
    const body = await request.json()
    if (!body?.submissionId || typeof body.submissionId !== "string") {
      return NextResponse.json({ error: "submissionId (string) required" }, { status: 400 })
    }
    submissionId = body.submissionId
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  try {
    const result = await runAiReview(submissionId)
    return NextResponse.json(result)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown error"
    console.error(`[ai-queue/trigger] runAiReview threw for ${submissionId}:`, msg)
    return NextResponse.json({ error: `Review pipeline error: ${msg}` }, { status: 500 })
  }
}

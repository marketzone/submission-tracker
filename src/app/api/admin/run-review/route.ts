// Manual AI review trigger — Brief #3.
// Runs the full AI review pipeline for a single submission.
// Manual-only for this brief: call one submission at a time to watch results before anything runs unattended.
//
// POST /api/admin/run-review
// Header: Authorization: Bearer <CRON_SECRET>
// Body:   { submissionId: string }

export const maxDuration = 300 // 5 minutes — Claude review takes 2-3 min
//
// Returns the full review result: verdict, patterns used, aiFeedback JSON, token usage.
// No student names or emails in the response — IDs only (per PII logging rule).

import { NextResponse } from "next/server"
import { runAiReview } from "@/lib/ai/runAiReview"
import { prisma } from "@/lib/prisma"
import { buildReviewPrompt } from "@/lib/ai/buildReviewPrompt"
import { assembleLaunchInfo } from "@/lib/ai/assembleLaunchInfo"
import { lookupWeekCriteria, deriveReviewerStrategy } from "@/lib/ai/weekCriteriaLookup"
import { fetchDocText } from "@/lib/ai/fetchDocText"

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
  if (!token || token !== process.env.CRON_SECRET) {
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

  const result = await runAiReview(submissionId)

  // The response omits the raw submitted text (too large + PII risk).
  // aiFeedback is included in full — that's the point of this endpoint.
  return NextResponse.json(result)
}

// ── GET: preview assembled prompt without calling Claude ─────────────────────
// Useful for reviewing exactly what the model would see before spending API credits.
// GET /api/admin/run-review?submissionId=<id>
// Header: Authorization: Bearer <CRON_SECRET>

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") ?? ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const submissionId = searchParams.get("submissionId")
  if (!submissionId) {
    return NextResponse.json({ error: "submissionId query param required" }, { status: 400 })
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      student: {
        select: {
          id: true,
          niche: true,
          launchStrategy: true,
          launchPricing: true,
          launchPrice: true,
          launchEventTopic: true,
          approvedEventTitle: true,
        },
      },
    },
  })

  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 })
  }

  const student = submission.student

  // Fetch doc text
  const docFetch = await fetchDocText(submission.workbookUrl)
  if (!docFetch.success) {
    return NextResponse.json({
      error: "Cannot read submitted document",
      reason: docFetch.reason,
      docId: docFetch.docId,
    }, { status: 422 })
  }

  // Assemble launch info
  const launchInfo = assembleLaunchInfo({
    niche: student.niche,
    launchStrategy: student.launchStrategy,
    launchPricing: student.launchPricing,
    launchPrice: student.launchPrice,
    launchEventTopic: student.launchEventTopic,
    approvedEventTitle: student.approvedEventTitle,
  })

  if (!student.niche?.trim() || !launchInfo) {
    return NextResponse.json({
      error: "Missing niche or launch info",
      nichePresent: !!(student.niche?.trim()),
      launchInfoPresent: !!launchInfo,
    }, { status: 422 })
  }

  // Lookup patterns
  const reviewerStrategy = deriveReviewerStrategy(student.launchStrategy, student.launchPricing)
  const allRows = await lookupWeekCriteria({
    weekNumber: submission.weekNumber,
    launchStrategy: reviewerStrategy,
  })

  // Filter for Week 6
  let patternRows = allRows
  if (submission.weekNumber === 6) {
    if (docFetch.fileType === "slides") {
      patternRows = allRows.filter((r) => r.templateVariant === null)
    } else {
      patternRows = allRows.filter((r) => r.templateVariant !== null)
    }
  }

  const { systemPrompt, userMessage, patternsUsed } = buildReviewPrompt({
    weekNumber: submission.weekNumber,
    studentNiche: student.niche!,
    launchInfo: launchInfo!,
    reviewerStrategy,
    patternRows,
    submittedText: docFetch.text,
    fileType: docFetch.fileType,
  })

  return NextResponse.json({
    submissionId,
    weekNumber: submission.weekNumber,
    fileType: docFetch.fileType,
    docId: docFetch.docId,
    reviewerStrategy,
    patternsUsed,
    systemPromptCharCount: systemPrompt.length,
    userMessageCharCount: userMessage.length,
    // Full prompt for review — this is the point of the GET endpoint
    systemPrompt,
    userMessage,
  })
}

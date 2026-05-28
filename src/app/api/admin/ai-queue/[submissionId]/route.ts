// POST /api/admin/ai-queue/[submissionId]
// Body: { action: "approve" | "edit_approve" | "override", ...actionParams }
//
// approve       — release as-is; AI feedback formatted to coachFeedback; status = APPROVED
// edit_approve  — apply inline edits then release; logs per-field ReviewEdit rows
// override      — override AI verdict; logs ReviewEdit rows; routes based on finalVerdict
//
// Auth: HEAD_COACH session only.
// Per PII rule: submission IDs and status logged, never submission text.

import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { formatCoachFeedback } from "@/lib/ai/formatCoachFeedback"

type AiFeedbackJson = Record<string, unknown>

// ── Helpers ───────────────────────────────────────────────────────────────────

function flattenFeedbackForLog(feedback: AiFeedbackJson): Record<string, string> {
  const out: Record<string, string> = {}
  const studentFacingFields = [
    "launch_alignment_explanation",
    "template_notes",
    "cta_notes",
    "human_voice_notes",
    "week_specific_findings",
  ]
  for (const f of studentFacingFields) {
    if (typeof feedback[f] === "string") out[f] = feedback[f] as string
  }
  const ps = feedback.persuasive_strength as Record<string, unknown> | undefined
  if (ps?.notes && typeof ps.notes === "string") out["persuasive_strength.notes"] = ps.notes
  const top3 = feedback.top_3_fixes
  if (Array.isArray(top3)) out["top_3_fixes"] = top3.join("\n---\n")
  const rewrites = feedback.specific_rewrites
  if (Array.isArray(rewrites)) out["specific_rewrites"] = rewrites.join("\n---\n")
  return out
}

async function writeEditLogs(
  submissionId: string,
  studentId: string,
  weekNumber: number,
  deliverableName: string,
  templateVariant: string | null,
  reviewModelVersion: string,
  aiVerdict: string,
  finalVerdict: string,
  editedFields: { fieldName: string; aiValue: string; humanValue: string }[]
): Promise<void> {
  if (editedFields.length === 0) return
  await prisma.reviewEdit.createMany({
    data: editedFields.map((f) => ({
      submissionId,
      studentId,
      weekNumber,
      deliverableName,
      templateVariant,
      reviewModelVersion,
      fieldName: f.fieldName,
      aiValue: f.aiValue,
      humanValue: f.humanValue,
      aiVerdict,
      finalVerdict,
    })),
  })
}

function deriveDeliverable(weekNumber: number, aiFeedback: AiFeedbackJson | null): {
  deliverableName: string
  templateVariant: string | null
} {
  // Best-effort derivation from stored data; could be enhanced with a
  // patternsUsed field on Submission in a future brief.
  if (!aiFeedback) return { deliverableName: `Week ${weekNumber}`, templateVariant: null }
  // The model doesn't output templateVariant, but we can infer from week
  // and other context if needed. For now, use a generic label.
  return { deliverableName: `Week ${weekNumber} deliverable`, templateVariant: null }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const session = await auth()
  if (!session?.user || (session.user as { role?: string }).role !== "HEAD_COACH") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { submissionId } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const action = body.action as string | undefined
  if (!action || !["approve", "edit_approve", "override"].includes(action)) {
    return NextResponse.json({ error: "action must be approve | edit_approve | override" }, { status: 400 })
  }

  // Load submission
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { student: { select: { id: true, name: true } } },
  })

  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 })
  }

  if (submission.aiReviewStatus !== "HELD_FOR_HUMAN") {
    return NextResponse.json({ error: "Submission is not in the AI review queue" }, { status: 409 })
  }

  const headCoachId = (session.user as { id?: string }).id ?? null
  const aiFeedback = submission.aiFeedback as AiFeedbackJson | null
  const aiVerdict = submission.aiTriageVerdict ?? "hold"
  const reviewModelVersion = submission.reviewModelVersion ?? "unknown"
  const weekNumber = submission.weekNumber
  const { deliverableName, templateVariant } = deriveDeliverable(weekNumber, aiFeedback)

  // ── approve ──────────────────────────────────────────────────────────────────
  if (action === "approve") {
    const formattedFeedback = aiFeedback
      ? formatCoachFeedback(aiFeedback, weekNumber)
      : null

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        aiReviewStatus: "HUMAN_REVIEWED",
        status: "APPROVED",
        coachFeedback: formattedFeedback,
        headCoachId,
        headReviewedAt: new Date(),
      },
    })

    return NextResponse.json({
      submissionId,
      action: "approve",
      finalVerdict: "proceed",
      editsLogged: 0,
    })
  }

  // ── edit_approve ─────────────────────────────────────────────────────────────
  if (action === "edit_approve") {
    // editedFields: { fieldName, humanValue }[] — fields Mayowa changed
    const editedFieldsInput = body.editedFields as { fieldName: string; humanValue: string }[] | undefined
    if (!editedFieldsInput || !Array.isArray(editedFieldsInput)) {
      return NextResponse.json({ error: "editedFields array required for edit_approve" }, { status: 400 })
    }

    // Build the AI originals map for logging
    const aiFieldValues = aiFeedback ? flattenFeedbackForLog(aiFeedback) : {}

    // Build edit log rows
    const editRows = editedFieldsInput
      .filter((f) => typeof f.fieldName === "string" && typeof f.humanValue === "string")
      .map((f) => ({
        fieldName: f.fieldName,
        aiValue: aiFieldValues[f.fieldName] ?? "",
        humanValue: f.humanValue,
      }))

    // Apply edits to a mutable copy of aiFeedback for formatting
    const editedFeedback: AiFeedbackJson = aiFeedback ? { ...aiFeedback } : {}
    for (const edit of editedFieldsInput) {
      const { fieldName, humanValue } = edit
      if (fieldName === "persuasive_strength.notes") {
        const ps = (editedFeedback.persuasive_strength as Record<string, unknown>) ?? {}
        editedFeedback.persuasive_strength = { ...ps, notes: humanValue }
      } else if (fieldName === "top_3_fixes") {
        editedFeedback.top_3_fixes = humanValue.split("\n---\n")
      } else if (fieldName === "specific_rewrites") {
        editedFeedback.specific_rewrites = humanValue.split("\n---\n")
      } else {
        editedFeedback[fieldName] = humanValue
      }
    }

    const formattedFeedback = formatCoachFeedback(editedFeedback, weekNumber)

    await prisma.$transaction([
      prisma.submission.update({
        where: { id: submissionId },
        data: {
          aiReviewStatus: "HUMAN_REVIEWED",
          status: "APPROVED",
          aiFeedback: editedFeedback as unknown as Prisma.InputJsonValue,
          coachFeedback: formattedFeedback,
          headCoachId,
          headReviewedAt: new Date(),
        },
      }),
    ])

    await writeEditLogs(
      submissionId,
      submission.student.id,
      weekNumber,
      deliverableName,
      templateVariant,
      reviewModelVersion,
      aiVerdict,
      "proceed",
      editRows
    )

    return NextResponse.json({
      submissionId,
      action: "edit_approve",
      finalVerdict: "proceed",
      editsLogged: editRows.length,
    })
  }

  // ── override ──────────────────────────────────────────────────────────────────
  if (action === "override") {
    const finalVerdict = body.finalVerdict as string | undefined
    const overrideReason = body.overrideReason as string | undefined

    if (!finalVerdict || !["proceed", "hold"].includes(finalVerdict)) {
      return NextResponse.json({ error: "finalVerdict must be proceed | hold" }, { status: 400 })
    }
    if (!overrideReason?.trim()) {
      return NextResponse.json({ error: "overrideReason required for override" }, { status: 400 })
    }

    const aiFieldValues = aiFeedback ? flattenFeedbackForLog(aiFeedback) : {}

    // Log an override row for the triage_verdict field (the key field being overridden)
    const editRows = [
      {
        fieldName: "triage_verdict",
        aiValue: aiVerdict,
        humanValue: finalVerdict,
      },
      {
        fieldName: "triage_reason",
        aiValue: (aiFeedback?.triage_reason as string) ?? "",
        humanValue: `[Override] ${overrideReason}`,
      },
    ]

    // If override to proceed, format feedback and approve
    if (finalVerdict === "proceed") {
      const formattedFeedback = aiFeedback
        ? formatCoachFeedback(aiFeedback, weekNumber)
        : null

      await prisma.submission.update({
        where: { id: submissionId },
        data: {
          aiReviewStatus: "HUMAN_REVIEWED",
          status: "APPROVED",
          coachFeedback: formattedFeedback,
          headCoachId,
          headReviewedAt: new Date(),
        },
      })
    } else {
      // Override to hold — mark as reviewed but do not release to student
      await prisma.submission.update({
        where: { id: submissionId },
        data: {
          aiReviewStatus: "HUMAN_REVIEWED",
          headCoachId,
          headReviewedAt: new Date(),
        },
      })
    }

    // Only log the two verdict/reason rows — field content unchanged in a pure override
    await writeEditLogs(
      submissionId,
      submission.student.id,
      weekNumber,
      deliverableName,
      templateVariant,
      reviewModelVersion,
      aiVerdict,
      finalVerdict,
      editRows
    )

    return NextResponse.json({
      submissionId,
      action: "override",
      aiVerdict,
      finalVerdict,
      editsLogged: editRows.length,
    })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}

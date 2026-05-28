import Anthropic from "@anthropic-ai/sdk"
import { prisma } from "@/lib/prisma"
import { fetchDocText } from "./fetchDocText"
import { assembleLaunchInfo } from "./assembleLaunchInfo"
import { lookupWeekCriteria, deriveReviewerStrategy } from "./weekCriteriaLookup"
import { buildReviewPrompt } from "./buildReviewPrompt"
import { RUBRIC_VERSION } from "./masterRubric"
import type { WeekCriteria } from "@prisma/client"

const REVIEW_MODEL = "claude-opus-4-7"
const MAX_OUTPUT_TOKENS = 8192

// ── Result type returned to the caller (API endpoint, future auto-trigger) ────
export interface AiReviewRunResult {
  submissionId: string
  weekNumber: number
  fileType: "doc" | "slides" | "unknown"
  docId: string | null
  reviewerStrategy: string | null
  patternsUsed: Array<{ deliverableName: string; templateVariant: string | null }>
  inputs: {
    nichePresent: boolean
    launchInfoPresent: boolean
    priorWeek4Loaded: boolean
    priorWeek6Loaded: boolean
  }
  outcome: "reviewed" | "held_for_input" | "api_error" | "parse_error"
  holdReason: string | null
  aiTriageVerdict: string | null
  aiFeedback: unknown | null
  tokenUsage: { inputTokens: number; outputTokens: number } | null
  reviewModelVersion: string
  dbWritten: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeHoldResult(
  submissionId: string,
  weekNumber: number,
  holdReason: string,
  partial: Partial<AiReviewRunResult> = {}
): AiReviewRunResult {
  return {
    submissionId,
    weekNumber,
    fileType: "unknown",
    docId: null,
    reviewerStrategy: null,
    patternsUsed: [],
    inputs: { nichePresent: false, launchInfoPresent: false, priorWeek4Loaded: false, priorWeek6Loaded: false },
    outcome: "held_for_input",
    holdReason,
    aiTriageVerdict: "hold",
    aiFeedback: null,
    tokenUsage: null,
    reviewModelVersion: RUBRIC_VERSION,
    dbWritten: false,
    ...partial,
  }
}

async function writeToDb(
  submissionId: string,
  outcome: AiReviewRunResult["outcome"],
  holdReason: string | null,
  aiTriageVerdict: string | null,
  aiFeedback: unknown | null,
  nicheAlignment: string | null,
  tokenUsage: { inputTokens: number; outputTokens: number } | null
): Promise<void> {
  // AI_REVIEW_REQUIRES_HUMAN_APPROVAL defaults TRUE.
  // When TRUE: all outcomes queue to Mayowa (HELD_FOR_HUMAN).
  // When FALSE: proceed verdicts auto-release (AUTO_APPROVED); hold verdicts still queue.
  const requiresHumanApproval = process.env.AI_REVIEW_REQUIRES_HUMAN_APPROVAL !== "false"

  let aiReviewStatus: "PENDING" | "AUTO_APPROVED" | "HELD_FOR_HUMAN"
  if (outcome === "reviewed" && aiTriageVerdict === "proceed" && !requiresHumanApproval) {
    aiReviewStatus = "AUTO_APPROVED"
  } else {
    // held_for_input, api_error, parse_error, verdict=hold, or flag=true all route to human
    aiReviewStatus = "HELD_FOR_HUMAN"
  }

  // aiFeedback field stores the full verdict JSON plus hold context if applicable
  const feedbackToStore = aiFeedback ?? (holdReason ? { hold_reason: holdReason } : null)

  // Embed token usage in the stored feedback if this was a real review
  const feedbackWithMeta =
    feedbackToStore && tokenUsage
      ? { ...(feedbackToStore as object), _token_usage: tokenUsage }
      : feedbackToStore

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      aiReviewStatus,
      aiNicheAlignment: nicheAlignment,
      aiFeedback: feedbackWithMeta as Record<string, unknown> | null,
      aiTriageVerdict: aiTriageVerdict ?? "hold",
      aiReviewedAt: new Date(),
      reviewModelVersion: RUBRIC_VERSION,
    },
  })
}

// ── Select the right pattern rows for this submission ─────────────────────────
// Week 6 has 4 rows: 1 webinar (slides) + 3 sales-copy variants (doc).
// Use file type to pick the right subset — presentations are always Slides,
// sales pages are always Docs. This is reliable in practice.
function filterPatternsForSubmission(
  criteriaRows: WeekCriteria[],
  weekNumber: number,
  fileType: "doc" | "slides" | "unknown"
): WeekCriteria[] {
  if (weekNumber !== 6) return criteriaRows

  // In the week_criteria seed, the Week 6 webinar pattern is stored with
  // templateVariant = null (the three sales-copy variants have explicit slugs).
  if (fileType === "slides") {
    const webinar = criteriaRows.filter((r) => r.templateVariant === null)
    return webinar.length > 0 ? webinar : criteriaRows
  } else {
    const salesCopy = criteriaRows.filter((r) => r.templateVariant !== null)
    return salesCopy.length > 0 ? salesCopy : criteriaRows
  }
}

// ── Main review function ───────────────────────────────────────────────────────
export async function runAiReview(submissionId: string): Promise<AiReviewRunResult> {
  // ── 1. Load submission + student ──────────────────────────────────────────
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
    return makeHoldResult(submissionId, 0, `Submission ${submissionId} not found`)
  }

  const weekNumber = submission.weekNumber
  const student = submission.student

  // ── 2. Fetch submitted document text ─────────────────────────────────────
  const docFetch = await fetchDocText(submission.workbookUrl)

  if (!docFetch.success) {
    const holdReason = `Cannot read submitted document: ${docFetch.reason}`
    await writeToDb(submissionId, "held_for_input", holdReason, "hold", null, null, null)
    return makeHoldResult(submissionId, weekNumber, holdReason, {
      fileType: docFetch.fileType,
      docId: docFetch.docId,
      dbWritten: true,
    })
  }

  const { text: submittedText, fileType, docId } = docFetch

  // ── 3. Validate niche + launch info ──────────────────────────────────────
  const nichePresent = !!(student.niche?.trim())
  const launchInfo = assembleLaunchInfo({
    niche: student.niche,
    launchStrategy: student.launchStrategy,
    launchPricing: student.launchPricing,
    launchPrice: student.launchPrice,
    launchEventTopic: student.launchEventTopic,
    approvedEventTitle: student.approvedEventTitle,
  })
  const launchInfoPresent = !!launchInfo

  if (!nichePresent) {
    const holdReason = "Student's Level 5 Niche is not filled in — cannot review without it"
    await writeToDb(submissionId, "held_for_input", holdReason, "hold", null, null, null)
    return makeHoldResult(submissionId, weekNumber, holdReason, {
      fileType,
      docId,
      inputs: { nichePresent: false, launchInfoPresent, priorWeek4Loaded: false, priorWeek6Loaded: false },
      dbWritten: true,
    })
  }

  if (!launchInfoPresent) {
    const holdReason = "Student's launch information is empty — cannot review without it"
    await writeToDb(submissionId, "held_for_input", holdReason, "hold", null, null, null)
    return makeHoldResult(submissionId, weekNumber, holdReason, {
      fileType,
      docId,
      inputs: { nichePresent, launchInfoPresent: false, priorWeek4Loaded: false, priorWeek6Loaded: false },
      dbWritten: true,
    })
  }

  // ── 4. Derive strategy + look up week criteria ────────────────────────────
  const reviewerStrategy = deriveReviewerStrategy(student.launchStrategy, student.launchPricing)

  let allCriteriaRows: WeekCriteria[]
  try {
    allCriteriaRows = await lookupWeekCriteria({ weekNumber, launchStrategy: reviewerStrategy })
  } catch (e: unknown) {
    // Loud error = bug in data or strategy derivation; escalate, don't silently hold
    throw new Error(
      `week_criteria lookup failed for submission ${submissionId}: ${(e as Error).message}`
    )
  }

  // Filter to the patterns relevant for this file type (critical for Week 6)
  const patternRows = filterPatternsForSubmission(allCriteriaRows, weekNumber, fileType)

  // ── 5. Load prior approved submissions (Week 6 sales copy + Week 7) ───────
  const isWeek6SalesCopy = weekNumber === 6 && fileType !== "slides"
  const isWeek7 = weekNumber === 7

  let priorWeek4Text: string | null = null
  let priorWeek6Text: string | null = null
  let priorWeek4Loaded = false
  let priorWeek6Loaded = false

  if (isWeek6SalesCopy || isWeek7) {
    const w4Sub = await prisma.submission.findFirst({
      where: { studentId: student.id, weekNumber: 4, status: "APPROVED" },
      orderBy: { submittedAt: "desc" },
    })
    if (!w4Sub) {
      const holdReason =
        "No approved Week 4 offer found — back-alignment check requires an approved Week 4 submission first"
      await writeToDb(submissionId, "held_for_input", holdReason, "hold", null, null, null)
      return makeHoldResult(submissionId, weekNumber, holdReason, {
        fileType,
        docId,
        reviewerStrategy,
        patternsUsed: patternRows.map((r) => ({ deliverableName: r.deliverableName, templateVariant: r.templateVariant })),
        inputs: { nichePresent, launchInfoPresent, priorWeek4Loaded: false, priorWeek6Loaded: false },
        dbWritten: true,
      })
    }
    const w4Fetch = await fetchDocText(w4Sub.workbookUrl)
    if (!w4Fetch.success) {
      const holdReason = `Cannot load approved Week 4 offer for back-alignment: ${w4Fetch.reason}`
      await writeToDb(submissionId, "held_for_input", holdReason, "hold", null, null, null)
      return makeHoldResult(submissionId, weekNumber, holdReason, {
        fileType,
        docId,
        reviewerStrategy,
        patternsUsed: patternRows.map((r) => ({ deliverableName: r.deliverableName, templateVariant: r.templateVariant })),
        inputs: { nichePresent, launchInfoPresent, priorWeek4Loaded: false, priorWeek6Loaded: false },
        dbWritten: true,
      })
    }
    priorWeek4Text = w4Fetch.text
    priorWeek4Loaded = true
  }

  if (isWeek7) {
    // Week 7 also needs the approved Week 6 webinar deck
    const w6Sub = await prisma.submission.findFirst({
      where: { studentId: student.id, weekNumber: 6, status: "APPROVED" },
      orderBy: { submittedAt: "desc" },
    })
    if (!w6Sub) {
      const holdReason =
        "No approved Week 6 submission found — Week 7 review requires an approved Week 6 deck/sales page first"
      await writeToDb(submissionId, "held_for_input", holdReason, "hold", null, null, null)
      return makeHoldResult(submissionId, weekNumber, holdReason, {
        fileType,
        docId,
        reviewerStrategy,
        patternsUsed: patternRows.map((r) => ({ deliverableName: r.deliverableName, templateVariant: r.templateVariant })),
        inputs: { nichePresent, launchInfoPresent, priorWeek4Loaded, priorWeek6Loaded: false },
        dbWritten: true,
      })
    }
    const w6Fetch = await fetchDocText(w6Sub.workbookUrl)
    if (!w6Fetch.success) {
      const holdReason = `Cannot load approved Week 6 submission for back-alignment: ${w6Fetch.reason}`
      await writeToDb(submissionId, "held_for_input", holdReason, "hold", null, null, null)
      return makeHoldResult(submissionId, weekNumber, holdReason, {
        fileType,
        docId,
        reviewerStrategy,
        patternsUsed: patternRows.map((r) => ({ deliverableName: r.deliverableName, templateVariant: r.templateVariant })),
        inputs: { nichePresent, launchInfoPresent, priorWeek4Loaded, priorWeek6Loaded: false },
        dbWritten: true,
      })
    }
    priorWeek6Text = w6Fetch.text
    priorWeek6Loaded = true
  }

  // ── 6. Build the prompt ───────────────────────────────────────────────────
  const { systemPrompt, userMessage, patternsUsed } = buildReviewPrompt({
    weekNumber,
    studentNiche: student.niche!,
    launchInfo: launchInfo!,
    reviewerStrategy,
    patternRows,
    submittedText,
    fileType,
    priorWeek4Text,
    priorWeek6Text,
  })

  // ── 7. Call Claude API ────────────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    const holdReason = "ANTHROPIC_API_KEY not configured — cannot call review model"
    await writeToDb(submissionId, "held_for_input", holdReason, "hold", null, null, null)
    return makeHoldResult(submissionId, weekNumber, holdReason, {
      fileType,
      docId,
      reviewerStrategy,
      patternsUsed,
      inputs: { nichePresent, launchInfoPresent, priorWeek4Loaded, priorWeek6Loaded },
      dbWritten: true,
    })
  }

  const client = new Anthropic({ apiKey })

  let rawResponse: string
  let tokenUsage: { inputTokens: number; outputTokens: number }

  try {
    const message = await client.messages.create({
      model: REVIEW_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    })

    rawResponse =
      message.content[0]?.type === "text" ? message.content[0].text : ""
    tokenUsage = {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    }
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string }
    const holdReason = `Claude API error (${err?.status ?? "?"}): ${err?.message ?? "unknown error"}`
    await writeToDb(submissionId, "api_error", holdReason, "hold", null, null, null)
    return {
      submissionId,
      weekNumber,
      fileType,
      docId,
      reviewerStrategy,
      patternsUsed,
      inputs: { nichePresent, launchInfoPresent, priorWeek4Loaded, priorWeek6Loaded },
      outcome: "api_error",
      holdReason,
      aiTriageVerdict: "hold",
      aiFeedback: null,
      tokenUsage: null,
      reviewModelVersion: RUBRIC_VERSION,
      dbWritten: true,
    }
  }

  // ── 8. Parse response defensively ────────────────────────────────────────
  // Strip any stray markdown fences the model may have added despite instructions.
  const cleaned = rawResponse
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim()

  let parsedFeedback: Record<string, unknown>

  // Defensive JSON parser: handles the case where the model emits a structurally
  // valid first JSON object, then appends remaining fields outside it as
  // `, "field": "value", ...` — a known Claude output artifact with large responses.
  // Truncation always fails to null → hold, never a silent partial pass.
  const parseJsonDefensive = (raw: string): Record<string, unknown> | null => {
    try {
      return JSON.parse(raw) as Record<string, unknown>
    } catch {
      // Find the end of the first complete JSON object by scanning brace depth
      let depth = 0
      let inString = false
      let escape = false
      let firstObjEnd = -1
      for (let i = 0; i < raw.length; i++) {
        const ch = raw[i]
        if (escape) { escape = false; continue }
        if (ch === "\\" && inString) { escape = true; continue }
        if (ch === '"') { inString = !inString; continue }
        if (inString) continue
        if (ch === "{") depth++
        else if (ch === "}") { depth--; if (depth === 0) { firstObjEnd = i; break } }
      }
      if (firstObjEnd < 0) return null

      const firstJson = raw.slice(0, firstObjEnd + 1)
      const tail = raw.slice(firstObjEnd + 1).trim()

      // No meaningful tail — the first object is the full response, but it failed
      // standard parse for another reason. Return null to trigger hold.
      if (!tail || (!tail.startsWith(",") && !tail.startsWith('"'))) {
        try { return JSON.parse(firstJson) as Record<string, unknown> } catch { return null }
      }

      // Tail looks like a continuation: strip the leading comma and merge back
      const continuation = tail.startsWith(",") ? tail.slice(1).trim() : tail
      const merged = firstJson.slice(0, -1) + ", " + continuation + (continuation.trimEnd().endsWith("}") ? "" : "}")
      try {
        return JSON.parse(merged) as Record<string, unknown>
      } catch {
        // Merge failed — return the partial first object; missing required fields
        // will be caught by the validation step below and route to hold
        try { return JSON.parse(firstJson) as Record<string, unknown> } catch { return null }
      }
    }
  }

  const parsed = parseJsonDefensive(cleaned)

  if (!parsed) {
    const holdReason = "Model response was not valid JSON — held for human review"
    await writeToDb(submissionId, "parse_error", holdReason, "hold", { raw_response: rawResponse }, null, tokenUsage)
    return {
      submissionId,
      weekNumber,
      fileType,
      docId,
      reviewerStrategy,
      patternsUsed,
      inputs: { nichePresent, launchInfoPresent, priorWeek4Loaded, priorWeek6Loaded },
      outcome: "parse_error",
      holdReason,
      aiTriageVerdict: "hold",
      aiFeedback: { raw_response: rawResponse },
      tokenUsage,
      reviewModelVersion: RUBRIC_VERSION,
      dbWritten: true,
    }
  }

  parsedFeedback = parsed

  // Validate required fields before trusting the response
  const requiredFields = ["triage_verdict", "launch_alignment", "template_adherence"]
  const missingFields = requiredFields.filter((f) => !(f in parsedFeedback))
  if (missingFields.length > 0) {
    const holdReason = `Model response missing required fields: ${missingFields.join(", ")} — held for human review`
    await writeToDb(submissionId, "parse_error", holdReason, "hold", parsedFeedback, null, tokenUsage)
    return {
      submissionId,
      weekNumber,
      fileType,
      docId,
      reviewerStrategy,
      patternsUsed,
      inputs: { nichePresent, launchInfoPresent, priorWeek4Loaded, priorWeek6Loaded },
      outcome: "parse_error",
      holdReason,
      aiTriageVerdict: "hold",
      aiFeedback: parsedFeedback,
      tokenUsage,
      reviewModelVersion: RUBRIC_VERSION,
      dbWritten: true,
    }
  }

  // ── 9. Apply triage + write to DB ─────────────────────────────────────────
  const triageVerdict = String(parsedFeedback.triage_verdict ?? "hold")
  const nicheAlignment = typeof parsedFeedback.launch_alignment === "string"
    ? parsedFeedback.launch_alignment
    : null

  await writeToDb(
    submissionId,
    "reviewed",
    null,
    triageVerdict,
    parsedFeedback,
    nicheAlignment,
    tokenUsage
  )

  return {
    submissionId,
    weekNumber,
    fileType,
    docId,
    reviewerStrategy,
    patternsUsed,
    inputs: { nichePresent, launchInfoPresent, priorWeek4Loaded, priorWeek6Loaded },
    outcome: "reviewed",
    holdReason: null,
    aiTriageVerdict: triageVerdict,
    aiFeedback: parsedFeedback,
    tokenUsage,
    reviewModelVersion: RUBRIC_VERSION,
    dbWritten: true,
  }
}

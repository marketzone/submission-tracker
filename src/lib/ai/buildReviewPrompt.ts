import type { WeekCriteria } from "@prisma/client"
import { MASTER_RUBRIC_V1 } from "./masterRubric"

export interface ReviewPromptInput {
  weekNumber: number
  studentNiche: string
  launchInfo: string
  reviewerStrategy: string
  patternRows: WeekCriteria[]      // pre-filtered: correct rows for this submission
  submittedText: string
  fileType: "doc" | "slides" | "unknown"
  priorWeek4Text?: string | null   // Week 6 sales copy + Week 7 only
  priorWeek6Text?: string | null   // Week 7 only
}

export interface ReviewPrompt {
  systemPrompt: string
  userMessage: string
  patternsUsed: Array<{ deliverableName: string; templateVariant: string | null }>
}

// Strip developer-facing [BUILD NOTE: ...] blocks from pattern text.
// These are build instructions for the developer, not review instructions for the model.
function stripBuildNotes(text: string): string {
  return text.replace(/\[BUILD NOTE:[^\]]*\]/g, "").replace(/\n{3,}/g, "\n\n").trim()
}

// Build the user message with XML-tagged sections.
// XML tags are Anthropic's recommended approach for multi-input structured prompts —
// hard delimiters the model cannot misread as content from a different field.
export function buildReviewPrompt(input: ReviewPromptInput): ReviewPrompt {
  const {
    weekNumber,
    studentNiche,
    launchInfo,
    reviewerStrategy,
    patternRows,
    submittedText,
    fileType,
    priorWeek4Text,
    priorWeek6Text,
  } = input

  const patternsUsed = patternRows.map((r) => ({
    deliverableName: r.deliverableName,
    templateVariant: r.templateVariant,
  }))

  // ── Build the applicable_pattern(s) block ──────────────────────────────────

  let patternBlock: string

  if (weekNumber === 3) {
    // Week 3: students submit both ad copy + ad video as one deliverable.
    // Inject both patterns with an intro so the model reviews each part.
    patternBlock = [
      `<applicable_patterns>`,
      `This is a Week 3 submission. The student is expected to submit both ad copy scripts (three angles) and an ad video script as one deliverable. Review each part of the submission against its applicable pattern below.`,
      "",
      ...patternRows.map(
        (r) =>
          `<pattern variant="${r.templateVariant ?? "none"}" deliverable="${r.deliverableName}">\n${stripBuildNotes(r.templatePattern)}\n</pattern>`
      ),
      `</applicable_patterns>`,
    ].join("\n")
  } else if (weekNumber === 6 && patternRows.length > 1) {
    // Week 6 sales copy: multiple variant patterns injected; model detects which the student used.
    // (Single-row Week 6 = webinar/slides, handled by the else branch below.)
    patternBlock = [
      `<applicable_patterns>`,
      `The student submitted a sales page for their Week 6 core offer. Three structurally distinct sales-copy templates are available. Identify which template structure the student used from the submitted document, then review against that pattern's criteria. The MULTI-SUBMISSION RULE applies if more than one variant is present.`,
      "",
      ...patternRows.map(
        (r) =>
          `<pattern variant="${r.templateVariant ?? "none"}" deliverable="${r.deliverableName}">\n${stripBuildNotes(r.templatePattern)}\n</pattern>`
      ),
      `</applicable_patterns>`,
    ].join("\n")
  } else {
    // Single pattern (most weeks)
    const row = patternRows[0]
    patternBlock = `<applicable_pattern deliverable="${row.deliverableName}" variant="${row.templateVariant ?? "none"}">\n${stripBuildNotes(row.templatePattern)}\n</applicable_pattern>`
  }

  // ── Build prior-submission blocks (Week 6 sales copy + Week 7) ────────────

  const priorBlocks: string[] = []
  if (priorWeek4Text) {
    priorBlocks.push(
      `<prior_approved_week4_offer>\n${priorWeek4Text}\n</prior_approved_week4_offer>`
    )
  }
  if (priorWeek6Text) {
    priorBlocks.push(
      `<prior_approved_week6_deck>\n${priorWeek6Text}\n</prior_approved_week6_deck>`
    )
  }

  // ── Assemble the user message ──────────────────────────────────────────────

  const parts: string[] = [
    `<week_number>${weekNumber}</week_number>`,
    "",
    `<student_niche>\n${studentNiche}\n</student_niche>`,
    "",
    `<launch_information>\n${launchInfo}\n</launch_information>`,
    "",
    `<launch_strategy>${reviewerStrategy}</launch_strategy>`,
    "",
    patternBlock,
    "",
    ...priorBlocks,
    ...(priorBlocks.length > 0 ? [""] : []),
    `<submitted_copy file_type="${fileType}">\n${submittedText}\n</submitted_copy>`,
  ]

  const userMessage = parts.join("\n")

  return {
    systemPrompt: MASTER_RUBRIC_V1,
    userMessage,
    patternsUsed,
  }
}

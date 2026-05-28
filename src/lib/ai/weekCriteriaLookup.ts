import { prisma } from "@/lib/prisma"
import type { WeekCriteria } from "@prisma/client"

export interface LookupParams {
  weekNumber: number
  launchStrategy: string   // student's resolved strategy: free_event | pwyw_or_low_ticket | evergreen
  templateVariant?: string // optional: aida | storytelling | ad_copy | ad_video | long_form | desire_stack | three_step_even_if | webinar
  deliverableName?: string // optional: further narrow by deliverable name
}

// The critical lookup rule:
// Weeks stored with launchStrategy = NULL apply to ALL strategies (Week 3, 4, 6).
// A naive equality match misses those rows entirely.
// Query: weekNumber = X AND (launchStrategy = <student_strategy> OR launchStrategy IS NULL)
export async function lookupWeekCriteria(params: LookupParams): Promise<WeekCriteria[]> {
  const { weekNumber, launchStrategy, templateVariant, deliverableName } = params

  const rows = await prisma.weekCriteria.findMany({
    where: {
      weekNumber,
      OR: [
        { launchStrategy },
        { launchStrategy: null },
      ],
      ...(templateVariant !== undefined ? { templateVariant } : {}),
      ...(deliverableName !== undefined ? { deliverableName } : {}),
    },
    orderBy: [
      { launchStrategy: "asc" },   // null-strategy rows last (asc puts non-null first)
      { templateVariant: "asc" },
    ],
  })

  if (rows.length === 0) {
    throw new Error(
      `No week_criteria rows found for weekNumber=${weekNumber} ` +
      `launchStrategy="${launchStrategy}"` +
      (templateVariant ? ` templateVariant="${templateVariant}"` : "") +
      (deliverableName ? ` deliverableName="${deliverableName}"` : "") +
      `. This is a data gap — check the seed or the strategy derivation.`
    )
  }

  return rows
}

// Derives the reviewer's strategy enum from the student's stored fields.
// User.launchStrategy holds the event format (Webinar, Workshop, etc.)
// User.launchPricing holds the pricing model (Free, Pay What You Want, Low Ticket)
// The reviewer uses: free_event | pwyw_or_low_ticket | evergreen
export function deriveReviewerStrategy(
  launchStrategy: string | null,
  launchPricing: string | null
): "free_event" | "pwyw_or_low_ticket" | "evergreen" {
  if (launchStrategy === "Evergreen VSL") return "evergreen"
  if (launchPricing === "Pay What You Want" || launchPricing === "Low Ticket") return "pwyw_or_low_ticket"
  return "free_event"
}

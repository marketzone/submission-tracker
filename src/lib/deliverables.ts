// Single source of truth for all submittable deliverables.
// Each entry carries enough metadata to:
//   1. Drive the two-step dropdown in the submission form
//   2. Route submissions to AI review or manual review
//   3. Map to the correct week_criteria row(s) for AI-reviewed deliverables
//
// launchStrategies: "all" | string[] — which reviewer strategy values see this deliverable.
//   Reviewer strategy is derived from (launchStrategy, launchPricing) via deriveReviewerStrategy().
//
// weekCriteriaVariant: matches templateVariant in week_criteria. null means the row is found
//   by weekNumber + launchStrategy alone (no templateVariant filter). For multi-variant
//   deliverables the variant selection comes from the student's workbookVariants field instead.
//
// multiVariantSelect: true only for Week 6 Core-Offer Sales Page. The student selects one or
//   more of SALES_PAGE_VARIANTS; selection is stored in workbookVariants on the Submission.

export type LaunchStrategy = "free_event" | "pwyw_or_low_ticket" | "evergreen"
export type DeliverableWeek = "preclarity" | 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface SalesPageVariant {
  id: "long_form" | "desire_stack" | "three_step_even_if"
  label: string
  description: string
}

export interface Deliverable {
  id: string
  deliverableName: string
  week: DeliverableWeek
  weekNumber: number
  requiresAiReview: boolean
  launchStrategies: LaunchStrategy[] | "all"
  weekCriteriaVariant: string | null
  multiVariantSelect: boolean
  availableVariants?: SalesPageVariant[]
}

export const SALES_PAGE_VARIANTS: SalesPageVariant[] = [
  {
    id: "long_form",
    label: "Long-Form (Headline-Down)",
    description:
      "Opens with a benefit-led headline, then works down through hook, offer, proof, price, and CTA.",
  },
  {
    id: "desire_stack",
    label: "Desire Stack",
    description:
      "Opens on the client's most desired outcome, then works through the gap, problem, mechanism, and offer.",
  },
  {
    id: "three_step_even_if",
    label: '3-Step "Even If"',
    description:
      "Opens by naming the audience with an 'even if' preemption of the primary objection, then works through imagine-stack, Q&A objection handling, offer, and CTA.",
  },
]

export const DELIVERABLES: Deliverable[] = [
  // ── Pre-Clarity (manual, all strategies) ─────────────────────────────────────
  {
    id: "preclarity-1",
    deliverableName: "Preclarity Workbook 1 — Level 1-5 Niche breakdown",
    week: "preclarity",
    weekNumber: 0,
    requiresAiReview: false,
    launchStrategies: "all",
    weekCriteriaVariant: null,
    multiVariantSelect: false,
  },
  {
    id: "preclarity-2",
    deliverableName: "Preclarity Workbook 2 — Avatar, USP, Pre-offer, Nurturing scripts",
    week: "preclarity",
    weekNumber: 0,
    requiresAiReview: false,
    launchStrategies: "all",
    weekCriteriaVariant: null,
    multiVariantSelect: false,
  },

  // ── Week 1 (manual, all strategies) ──────────────────────────────────────────
  {
    id: "w1-headlines",
    deliverableName: "Headlines",
    week: 1,
    weekNumber: 1,
    requiresAiReview: false,
    launchStrategies: "all",
    weekCriteriaVariant: null,
    multiVariantSelect: false,
  },

  // ── Week 2 (AI-reviewed, strategy-conditional) ────────────────────────────────
  {
    id: "w2-aida",
    deliverableName: "Launch Event Opt-in Page (AIDA)",
    week: 2,
    weekNumber: 2,
    requiresAiReview: true,
    launchStrategies: ["free_event"],
    weekCriteriaVariant: "aida",
    multiVariantSelect: false,
  },
  {
    id: "w2-storytelling",
    deliverableName: "Launch Event Opt-in Page (Storytelling)",
    week: 2,
    weekNumber: 2,
    requiresAiReview: true,
    launchStrategies: ["free_event"],
    weekCriteriaVariant: "storytelling",
    multiVariantSelect: false,
  },
  {
    id: "w2-sales-page",
    deliverableName: "Launch Event Sales Page",
    week: 2,
    weekNumber: 2,
    requiresAiReview: true,
    launchStrategies: ["pwyw_or_low_ticket"],
    weekCriteriaVariant: null,
    multiVariantSelect: false,
  },
  {
    id: "w2-vsl",
    deliverableName: "VSL Script",
    week: 2,
    weekNumber: 2,
    requiresAiReview: true,
    launchStrategies: ["evergreen"],
    weekCriteriaVariant: null,
    multiVariantSelect: false,
  },

  // ── Week 3 (AI-reviewed, all strategies) ─────────────────────────────────────
  {
    id: "w3-ad-copy",
    deliverableName: "Ad Copy Scripts (3 Angles)",
    week: 3,
    weekNumber: 3,
    requiresAiReview: true,
    launchStrategies: "all",
    weekCriteriaVariant: "ad_copy",
    multiVariantSelect: false,
  },
  {
    id: "w3-ad-video",
    deliverableName: "Ad Video Script",
    week: 3,
    weekNumber: 3,
    requiresAiReview: true,
    launchStrategies: "all",
    weekCriteriaVariant: "ad_video",
    multiVariantSelect: false,
  },

  // ── Week 4 (mixed) ────────────────────────────────────────────────────────────
  {
    id: "w4-core-offer",
    deliverableName: "Core Program Offer",
    week: 4,
    weekNumber: 4,
    requiresAiReview: true,
    launchStrategies: "all",
    weekCriteriaVariant: null,
    multiVariantSelect: false,
  },
  {
    id: "w4-landing-pages",
    deliverableName: "Landing Pages",
    week: 4,
    weekNumber: 4,
    requiresAiReview: false,
    launchStrategies: "all",
    weekCriteriaVariant: null,
    multiVariantSelect: false,
  },

  // ── Week 5 (AI-reviewed, strategy-conditional) ────────────────────────────────
  {
    id: "w5-live",
    deliverableName: "Pre-launch Email Sequence (Live/Scheduled)",
    week: 5,
    weekNumber: 5,
    requiresAiReview: true,
    launchStrategies: ["free_event", "pwyw_or_low_ticket"],
    weekCriteriaVariant: null,
    multiVariantSelect: false,
  },
  {
    id: "w5-evergreen",
    deliverableName: "Pre-launch Email Sequence (Evergreen)",
    week: 5,
    weekNumber: 5,
    requiresAiReview: true,
    launchStrategies: ["evergreen"],
    weekCriteriaVariant: null,
    multiVariantSelect: false,
  },

  // ── Week 6 (AI-reviewed, all strategies) ─────────────────────────────────────
  {
    id: "w6-webinar",
    deliverableName: "Webinar / Workshop / Challenge Presentation",
    week: 6,
    weekNumber: 6,
    requiresAiReview: true,
    launchStrategies: "all",
    weekCriteriaVariant: null,
    multiVariantSelect: false,
  },
  {
    id: "w6-sales-page",
    deliverableName: "Core-Offer Sales Page",
    week: 6,
    weekNumber: 6,
    requiresAiReview: true,
    launchStrategies: "all",
    weekCriteriaVariant: null,
    multiVariantSelect: true,
    availableVariants: SALES_PAGE_VARIANTS,
  },

  // ── Week 7 (AI-reviewed, live-launch only) ────────────────────────────────────
  // evergreen students do not submit Week 7 — handled in Week 5.
  {
    id: "w7-post-webinar",
    deliverableName: "Post-Webinar Sales Email Sequence",
    week: 7,
    weekNumber: 7,
    requiresAiReview: true,
    launchStrategies: ["free_event", "pwyw_or_low_ticket"],
    weekCriteriaVariant: null,
    multiVariantSelect: false,
  },
]

// ── Lookup helpers ────────────────────────────────────────────────────────────

// Canonical title set for fast exact-match checks in the label router.
export const CANONICAL_TITLES: ReadonlySet<string> = new Set(
  DELIVERABLES.map((d) => d.deliverableName)
)

// All canonical titles that are manual-review (for fast runtime checks).
export const MANUAL_REVIEW_TITLES: ReadonlySet<string> = new Set(
  DELIVERABLES.filter((d) => !d.requiresAiReview).map((d) => d.deliverableName)
)

// Find a deliverable by its canonical title.
export function findDeliverable(title: string): Deliverable | undefined {
  return DELIVERABLES.find((d) => d.deliverableName === title)
}

// Get deliverables visible to a student for a given week and reviewer strategy.
export function getDeliverablesForWeek(
  week: DeliverableWeek,
  reviewerStrategy: LaunchStrategy
): Deliverable[] {
  return DELIVERABLES.filter(
    (d) =>
      d.week === week &&
      (d.launchStrategies === "all" || d.launchStrategies.includes(reviewerStrategy))
  )
}

// Weeks that have at least one deliverable visible to a given strategy.
// Returns ordered list for the week selector.
export const WEEK_OPTIONS: Array<{ value: DeliverableWeek; label: string }> = [
  { value: "preclarity", label: "Pre-Clarity" },
  { value: 1, label: "Week 1" },
  { value: 2, label: "Week 2" },
  { value: 3, label: "Week 3" },
  { value: 4, label: "Week 4" },
  { value: 5, label: "Week 5" },
  { value: 6, label: "Week 6" },
  { value: 7, label: "Week 7" },
]

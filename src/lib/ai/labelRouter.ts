// Label-based deliverable router.
// Weeks 3 and 6 each have multiple patterns in week_criteria.
// This module maps workbookTitle keyword signals to a single deliverable type
// so the correct pattern row(s) are injected — not all of them.
//
// Week 3 patterns (templateVariant): "ad_copy" | "ad_video"
// Week 6 patterns (templateVariant): null (webinar) | "long_form" | "desire_stack" | "three_step_even_if"
//
// For all other weeks, no routing is needed — the caller passes through all rows.

export type DeliverableType = "ad_copy" | "ad_video" | "webinar" | "sales_copy"

export type LabelRouteResult =
  | { outcome: "matched"; deliverableType: DeliverableType }
  | { outcome: "hold"; reason: string }

// ── Hold messages ─────────────────────────────────────────────────────────────

const HOLD_W3_UNRECOGNISED =
  "Couldn't determine which Week 3 deliverable this is — please confirm the document label " +
  "(expected: 'Ad Copy Scripts' or 'Ad Video Script') and resubmit."

const HOLD_W6_UNRECOGNISED =
  "Couldn't determine which Week 6 deliverable this is — please confirm the document label " +
  "(expected: 'Webinar Presentation' or 'Sales Copy Framework') and resubmit."

const HOLD_AMBIGUOUS =
  "Couldn't determine which deliverable this is — the document label matches more than one " +
  "pattern. Please confirm the label and resubmit."

// ── Keyword sets ──────────────────────────────────────────────────────────────

// Week 3: "video" anywhere → ad video; "ad copy", "captions", "script" (no video) → ad copy.
// "video script" contains "video" so it routes correctly without a compound check.
const W3_VIDEO_RE  = /\bvideo\b/i
const W3_COPY_RE   = /\bad[\s-]?copy\b|\bcaptions?\b|\bscripts?\b/i

// Week 6: webinar group vs sales copy group.
const W6_WEBINAR_RE    = /\bwebinar\b|\bpresentation\b|\bdeck\b|\bslides?\b/i
const W6_SALESCOPY_RE  = /\bsales[\s-]copy\b|\bsales[\s-]page\b|\bsales[\s-]letter\b|\bformul[ae]/i
// "framework" alone is unambiguous enough in this program's label vocabulary.
const W6_FRAMEWORK_RE  = /\bframework\b/i

// ── Router ────────────────────────────────────────────────────────────────────

export function routeByLabel(weekNumber: number, workbookTitle: string): LabelRouteResult {
  const t = workbookTitle ?? ""

  if (weekNumber === 3) {
    const isVideo   = W3_VIDEO_RE.test(t)
    const isAdCopy  = W3_COPY_RE.test(t)

    if (isVideo && isAdCopy) return { outcome: "hold", reason: HOLD_AMBIGUOUS }
    if (isVideo)  return { outcome: "matched", deliverableType: "ad_video" }
    if (isAdCopy) return { outcome: "matched", deliverableType: "ad_copy" }
    return { outcome: "hold", reason: HOLD_W3_UNRECOGNISED }
  }

  if (weekNumber === 6) {
    const isWebinar   = W6_WEBINAR_RE.test(t)
    const isSalesCopy = W6_SALESCOPY_RE.test(t) || W6_FRAMEWORK_RE.test(t)

    if (isWebinar && isSalesCopy) return { outcome: "hold", reason: HOLD_AMBIGUOUS }
    if (isWebinar)   return { outcome: "matched", deliverableType: "webinar" }
    if (isSalesCopy) return { outcome: "matched", deliverableType: "sales_copy" }
    return { outcome: "hold", reason: HOLD_W6_UNRECOGNISED }
  }

  // Single-deliverable week — caller should not call this function, but handle safely.
  return { outcome: "matched", deliverableType: "ad_copy" }
}

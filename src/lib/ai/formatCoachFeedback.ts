// Formats the AI reviewer's aiFeedback JSON into a clean, readable prose string
// for delivery to the student via coachFeedback.
// The output must read as structured mentor feedback — not a JSON dump.
// Only student-facing fields are included. Internal fields (triage_verdict,
// triage_reason) are intentionally excluded.

type PersuasiveStrength = {
  specific_pain?: string
  concrete_promise?: string
  reason_to_act_now?: string
  trust_through_specificity?: string
  notes?: string
}

type AiFeedbackJson = {
  week?: number
  launch_alignment?: string
  launch_alignment_explanation?: string
  template_adherence?: string
  template_notes?: string
  persuasive_strength?: PersuasiveStrength
  cta?: string
  cta_notes?: string
  human_voice?: string
  human_voice_notes?: string
  week_specific_findings?: string
  top_3_fixes?: string[]
  specific_rewrites?: string[]
  // allow extra fields from the model
  [key: string]: unknown
}

function statusBadge(val: string | undefined): string {
  if (!val) return ""
  const upper = val.toUpperCase()
  if (upper === "PASS") return "✓ PASS"
  if (upper === "FAIL") return "✗ FAIL"
  if (upper === "DRIFTING") return "~ DRIFTING"
  if (upper === "OFF") return "✗ OFF"
  return upper
}

export function formatCoachFeedback(feedback: AiFeedbackJson, weekNumber: number): string {
  const lines: string[] = []

  lines.push(`AI REVIEW — WEEK ${weekNumber}`)
  lines.push("─".repeat(48))
  lines.push("")

  // Launch alignment
  if (feedback.launch_alignment_explanation) {
    const badge = statusBadge(feedback.launch_alignment)
    lines.push(`LAUNCH ALIGNMENT  ${badge}`)
    lines.push(feedback.launch_alignment_explanation)
    lines.push("")
  }

  // Template adherence
  if (feedback.template_notes) {
    const badge = statusBadge(feedback.template_adherence)
    lines.push(`STRUCTURE CHECK  ${badge}`)
    lines.push(feedback.template_notes)
    lines.push("")
  }

  // Persuasive strength
  const ps = feedback.persuasive_strength
  if (ps) {
    const flags = [
      ps.specific_pain && `Specific pain: ${statusBadge(ps.specific_pain)}`,
      ps.concrete_promise && `Concrete promise: ${statusBadge(ps.concrete_promise)}`,
      ps.reason_to_act_now && `Reason to act now: ${statusBadge(ps.reason_to_act_now)}`,
      ps.trust_through_specificity && `Trust through specificity: ${statusBadge(ps.trust_through_specificity)}`,
    ].filter(Boolean)

    lines.push("PERSUASIVE STRENGTH")
    if (flags.length > 0) {
      lines.push(flags.join("  ·  "))
    }
    if (ps.notes) {
      lines.push(ps.notes)
    }
    lines.push("")
  }

  // CTA
  if (feedback.cta_notes) {
    const badge = statusBadge(feedback.cta)
    lines.push(`CALL TO ACTION  ${badge}`)
    lines.push(feedback.cta_notes)
    lines.push("")
  }

  // Human voice
  if (feedback.human_voice_notes) {
    const badge = statusBadge(feedback.human_voice)
    lines.push(`VOICE & AUTHENTICITY  ${badge}`)
    lines.push(feedback.human_voice_notes)
    lines.push("")
  }

  // Week-specific findings
  if (feedback.week_specific_findings) {
    lines.push("WEEK-SPECIFIC FINDINGS")
    lines.push(feedback.week_specific_findings)
    lines.push("")
  }

  // Top 3 fixes
  if (feedback.top_3_fixes && feedback.top_3_fixes.length > 0) {
    lines.push("TOP 3 FIXES")
    feedback.top_3_fixes.forEach((fix, i) => {
      lines.push(`${i + 1}. ${fix}`)
    })
    lines.push("")
  }

  // Specific rewrites
  if (feedback.specific_rewrites && feedback.specific_rewrites.length > 0) {
    lines.push("SUGGESTED REWRITES")
    feedback.specific_rewrites.forEach((rewrite) => {
      lines.push(`• ${rewrite}`)
    })
    lines.push("")
  }

  return lines.join("\n").trim()
}

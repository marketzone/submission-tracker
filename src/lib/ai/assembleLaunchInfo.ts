export interface StudentLaunchFields {
  niche: string | null
  launchStrategy: string | null
  launchPricing: string | null
  launchPrice: string | null
  launchEventTopic: string | null
  approvedEventTitle: string | null
}

// Assembles the student's split launch-info fields into a single
// structured text block ready for injection into a reviewer prompt.
// Returns null if no meaningful fields are populated.
export function assembleLaunchInfo(student: StudentLaunchFields): string | null {
  const lines: string[] = []

  if (student.niche?.trim()) {
    lines.push(`Target Audience (Level 5 Niche): ${student.niche.trim()}`)
  }

  if (student.launchStrategy?.trim()) {
    lines.push(`Launch Format: ${student.launchStrategy.trim()}`)
  }

  if (student.launchPricing?.trim()) {
    const pricing =
      student.launchPrice?.trim()
        ? `${student.launchPricing.trim()} ($${student.launchPrice.trim()})`
        : student.launchPricing.trim()
    lines.push(`Pricing Model: ${pricing}`)
  }

  if (student.approvedEventTitle?.trim()) {
    lines.push(`Approved Event Title: ${student.approvedEventTitle.trim()}`)
  }

  if (student.launchEventTopic?.trim()) {
    lines.push(`Content Direction for Launch Event:\n${student.launchEventTopic.trim()}`)
  }

  return lines.length > 0 ? lines.join("\n") : null
}

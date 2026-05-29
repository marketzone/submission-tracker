import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { fetchDocText } from "@/lib/ai/fetchDocText"

// Temporary Phase 1 audit endpoint — DELETE after audit is complete.
// Protected: HEAD_COACH or PROGRAM_MANAGER session required.
export async function GET() {
  const session = await auth()
  if (!session?.user || !["HEAD_COACH", "PROGRAM_MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const submissions = await prisma.submission.findMany({
    where: {
      student: { studentClass: "LAUNCH_CLASS" },
      workbookUrl: { not: "" },
    },
    include: { student: { select: { id: true } } },
    orderBy: { submittedAt: "desc" },
    take: 10,
  })

  const ASSEMBLED_PATTERNS: Array<{ label: string; re: RegExp }> = [
    { label: "Assembled Copy",        re: /assembled\s+copy/i },
    { label: "My Assembled Copy",     re: /my\s+assembled\s+copy/i },
    { label: "My Copy",               re: /^my\s+copy[\s:]/im },
    { label: "Assembled Version",     re: /assembled\s+version/i },
    { label: "Here is my assembled",  re: /here\s+is\s+my\s+assembled/i },
    { label: "Below is my assembled", re: /below\s+is\s+my\s+assembled/i },
    { label: "Section divider + assembled", re: /^-{3,}[\s\S]{0,40}assembled/im },
  ]

  const TEMPLATE_ARTIFACTS: Array<{ label: string; re: RegExp }> = [
    { label: "[Customer's Name]", re: /\[customer'?s?\s+name\]/i },
    { label: "[Your Name]",       re: /\[your\s+name\]/i },
    { label: "[First Name]",      re: /\[first\s+name\]/i },
    { label: "[Insert ...]",      re: /\[insert\s/i },
    { label: "[Fill in ...]",     re: /\[fill\s+in/i },
    { label: "[Outcome]",         re: /\[outcome\]/i },
    { label: "[Problem]",         re: /\[problem\]/i },
    { label: "[Audience]",        re: /\[audience\]/i },
  ]

  const results = []

  for (const sub of submissions) {
    const fetch = await fetchDocText(sub.workbookUrl)

    if (!fetch.success) {
      results.push({
        id: sub.id,
        studentId: sub.student.id,
        week: sub.weekNumber,
        label: sub.workbookTitle,
        url: sub.workbookUrl,
        state: "ERROR",
        error: fetch.reason,
        assembledMarker: null,
        templateArtifacts: [],
        charCount: 0,
        first200: null,
        last200: null,
      })
      continue
    }

    const text = fetch.text
    let assembledMarker: string | null = null
    for (const { label, re } of ASSEMBLED_PATTERNS) {
      const m = text.match(re)
      if (m) { assembledMarker = `${label} → "${m[0].trim().slice(0, 80)}"`; break }
    }

    const templateArtifacts = TEMPLATE_ARTIFACTS
      .filter(({ re }) => re.test(text))
      .map(({ label }) => label)

    const state = assembledMarker
      ? "template+assembled"
      : templateArtifacts.length > 0
        ? "template-only"
        : "unclear (no marker, no artifacts)"

    results.push({
      id: sub.id,
      studentId: sub.student.id,
      week: sub.weekNumber,
      label: sub.workbookTitle,
      state,
      assembledMarker,
      templateArtifacts,
      charCount: text.length,
      first200: text.slice(0, 200),
      last200: text.slice(-200),
    })
  }

  const summary = {
    total: results.length,
    templatePlusAssembled: results.filter(r => r.state === "template+assembled").length,
    templateOnly:          results.filter(r => r.state === "template-only").length,
    unclear:               results.filter(r => r.state?.startsWith("unclear")).length,
    errors:                results.filter(r => r.state === "ERROR").length,
    markerVariants:        [...new Set(results.map(r => r.assembledMarker).filter(Boolean))],
    labelValues:           [...new Set(results.map(r => r.label))].sort(),
  }

  return NextResponse.json({ summary, submissions: results }, { status: 200 })
}

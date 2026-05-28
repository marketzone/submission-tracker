"use client"

// Renders the coachFeedback string produced by formatCoachFeedback.
// Detects AI review format (starts with "AI REVIEW — WEEK N") and renders
// each section as a styled card with status badges.
// Falls back to whitespace-pre-wrap for plain coach text.

const SECTION_HEADERS = [
  "LAUNCH ALIGNMENT",
  "STRUCTURE CHECK",
  "PERSUASIVE STRENGTH",
  "CALL TO ACTION",
  "VOICE & AUTHENTICITY",
  "WEEK-SPECIFIC FINDINGS",
  "TOP 3 FIXES",
  "SUGGESTED REWRITES",
] as const

type SectionType = (typeof SECTION_HEADERS)[number] | "unknown"

function matchHeader(line: string): SectionType {
  for (const h of SECTION_HEADERS) {
    if (line.startsWith(h)) return h
  }
  return "unknown"
}

function hasPass(s: string) { return s.includes("✓ PASS") }
function hasFail(s: string) { return s.includes("✗ FAIL") || s.includes("✗ OFF") }
function hasDrift(s: string) { return s.includes("~ DRIFTING") }

function statusColors(line: string) {
  if (hasPass(line)) return { card: "bg-emerald-50 border-emerald-200", title: "text-emerald-800", text: "text-emerald-900" }
  if (hasFail(line)) return { card: "bg-red-50 border-red-200", title: "text-red-800", text: "text-red-900" }
  if (hasDrift(line)) return { card: "bg-amber-50 border-amber-200", title: "text-amber-800", text: "text-amber-900" }
  return { card: "bg-slate-50 border-slate-200", title: "text-slate-700", text: "text-slate-800" }
}

function StatusBadge({ line, sm }: { line: string; sm?: boolean }) {
  const cls = `inline-flex items-center rounded-full border font-semibold ${sm ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-xs"}`
  if (hasPass(line)) return <span className={`${cls} bg-emerald-100 border-emerald-300 text-emerald-700`}>✓ PASS</span>
  if (line.includes("✗ OFF")) return <span className={`${cls} bg-red-100 border-red-300 text-red-700`}>✗ OFF</span>
  if (hasFail(line)) return <span className={`${cls} bg-red-100 border-red-300 text-red-700`}>✗ FAIL</span>
  if (hasDrift(line)) return <span className={`${cls} bg-amber-100 border-amber-300 text-amber-700`}>~ DRIFTING</span>
  return null
}

function stripBadge(line: string): string {
  return line.replace(/\s*[✓✗~]\s*(PASS|FAIL|OFF|DRIFTING)\s*/g, "").trim()
}

interface Block {
  sectionType: SectionType
  headerLine: string
  contentLines: string[]
}

export function isAiReview(text: string): boolean {
  return /^AI REVIEW\s*[—\-]\s*WEEK\s+\d+/i.test(text.trimStart())
}

function parseBlocks(text: string): { weekNumber: number | null; blocks: Block[] } {
  const paragraphs = text.split(/\n{2,}/)
  let weekNumber: number | null = null
  const blocks: Block[] = []

  for (const para of paragraphs) {
    const lines = para.split("\n").map((l) => l.trimEnd())
    if (!lines.length || !lines[0]) continue

    const first = lines[0]

    const weekMatch = first.match(/AI REVIEW\s*[—\-]\s*WEEK\s+(\d+)/i)
    if (weekMatch) { weekNumber = parseInt(weekMatch[1]); continue }

    if (/^─{3,}/.test(first)) continue

    const sectionType = matchHeader(first)
    if (sectionType !== "unknown") {
      blocks.push({
        sectionType,
        headerLine: first,
        contentLines: lines.slice(1).filter((l) => l !== ""),
      })
    } else if (blocks.length > 0) {
      const last = blocks[blocks.length - 1]
      if (last.contentLines.length > 0) last.contentLines.push("")
      last.contentLines.push(...lines.filter((l) => l !== ""))
    }
  }

  return { weekNumber, blocks }
}

function SectionContent({ lines, sectionType, textClass }: {
  lines: string[]
  sectionType: SectionType
  textClass: string
}) {
  if (!lines.length) return null

  if (sectionType === "TOP 3 FIXES") {
    const items = lines.filter((l) => /^\d+\./.test(l))
    return (
      <ol className="space-y-2">
        {items.map((line, i) => (
          <li key={i} className="flex gap-2.5 items-start">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-300 text-amber-900 text-xs font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <span className={`text-sm ${textClass}`}>{line.replace(/^\d+\.\s*/, "")}</span>
          </li>
        ))}
      </ol>
    )
  }

  if (sectionType === "SUGGESTED REWRITES") {
    const items = lines.filter((l) => l.startsWith("•"))
    const others = lines.filter((l) => l && !l.startsWith("•"))
    return (
      <div className="space-y-2">
        {others.length > 0 && (
          <p className={`text-sm ${textClass} whitespace-pre-wrap`}>{others.join("\n")}</p>
        )}
        <ul className="space-y-2">
          {items.map((line, i) => (
            <li key={i} className={`text-sm ${textClass} flex gap-2 items-start`}>
              <span className="flex-shrink-0 text-slate-400 mt-0.5">•</span>
              <span>{line.replace(/^•\s*/, "")}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (sectionType === "PERSUASIVE STRENGTH") {
    const firstLine = lines[0] ?? ""
    const isSubItemLine = firstLine.includes(" · ") || (firstLine.includes(":") && (firstLine.includes("PASS") || firstLine.includes("FAIL")))
    if (isSubItemLine) {
      const items = firstLine.split(/\s*·\s*/).filter(Boolean)
      const notes = lines.slice(1).filter((l) => l).join("\n")
      return (
        <div className="space-y-2.5">
          <div className="flex flex-wrap gap-1.5">
            {items.map((item, i) => {
              const colonIdx = item.indexOf(":")
              if (colonIdx === -1) return null
              const label = item.slice(0, colonIdx).trim()
              const val = item.slice(colonIdx + 1).trim()
              const pass = val.includes("PASS")
              const fail = val.includes("FAIL")
              return (
                <div
                  key={i}
                  className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${
                    pass ? "bg-emerald-50 border-emerald-200" : fail ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <span className={`font-medium ${pass ? "text-emerald-800" : fail ? "text-red-800" : "text-slate-700"}`}>{label}</span>
                  <StatusBadge line={val} sm />
                </div>
              )
            })}
          </div>
          {notes && <p className={`text-sm ${textClass} whitespace-pre-wrap`}>{notes}</p>}
        </div>
      )
    }
  }

  return <p className={`text-sm ${textClass} whitespace-pre-wrap`}>{lines.join("\n")}</p>
}

function SectionCard({ block }: { block: Block }) {
  const { sectionType, headerLine, contentLines } = block

  const colors =
    sectionType === "TOP 3 FIXES"
      ? { card: "bg-amber-50 border-amber-300", title: "text-amber-800", text: "text-amber-900" }
      : sectionType === "SUGGESTED REWRITES" || sectionType === "WEEK-SPECIFIC FINDINGS"
      ? { card: "bg-slate-50 border-slate-200", title: "text-slate-700", text: "text-slate-800" }
      : statusColors(headerLine)

  const withoutBadge = stripBadge(headerLine)
  const showBadge = sectionType !== "TOP 3 FIXES" && sectionType !== "SUGGESTED REWRITES" && sectionType !== "WEEK-SPECIFIC FINDINGS" && sectionType !== "PERSUASIVE STRENGTH"

  return (
    <div className={`rounded-lg border ${colors.card} p-4`}>
      <div className="flex items-center gap-2 mb-2.5">
        <h4 className={`text-xs font-bold uppercase tracking-wider ${colors.title}`}>{withoutBadge}</h4>
        {showBadge && <StatusBadge line={headerLine} />}
      </div>
      <SectionContent lines={contentLines} sectionType={sectionType} textClass={colors.text} />
    </div>
  )
}

interface Props {
  text: string
}

export function FeedbackRenderer({ text }: Props) {
  if (!text.trim()) return null

  if (!isAiReview(text)) {
    return <p className="text-sm whitespace-pre-wrap">{text}</p>
  }

  const { weekNumber, blocks } = parseBlocks(text)

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
        <span className="inline-flex items-center rounded-md bg-violet-100 border border-violet-300 px-2.5 py-1 text-xs font-semibold text-violet-800 tracking-wide">
          AI Review{weekNumber ? ` — Week ${weekNumber}` : ""}
        </span>
        <span className="text-xs text-slate-400">Reviewed by AI + Head Coach</span>
      </div>
      <div className="space-y-2">
        {blocks.map((block, i) => (
          <SectionCard key={i} block={block} />
        ))}
      </div>
    </div>
  )
}

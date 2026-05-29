/**
 * Brief #5 Phase 1 — Submission input audit
 *
 * Pulls 8-10 recent LAUNCH_CLASS submissions, fetches their document text,
 * and reports the structural shape of each document so we can build the
 * assembled-copy extractor against observed reality rather than assumptions.
 *
 * Run:
 *   npx tsx scripts/audit_phase1.ts
 *
 * Requires: DATABASE_URL and GOOGLE_API_KEY in env (copy from .env.local)
 */

import { PrismaClient } from "@prisma/client"
import { google } from "googleapis"
import * as zlib from "zlib"

const prisma = new PrismaClient()

// ── URL parsing (inline copy of parseDocUrl logic) ────────────────────────────

function parseDocId(url: string): { docId: string; mimeHint: string } | null {
  if (!url?.trim().startsWith("http")) return null
  const t = url.trim()
  const matchD = t.match(/\/d\/([a-zA-Z0-9_-]{25,})/)?.[1]
  if (matchD) {
    const mimeHint = t.includes("/document/") ? "doc"
      : t.includes("/presentation/") ? "slides"
      : "drive"
    return { docId: matchD, mimeHint }
  }
  const matchId = t.match(/[?&]id=([a-zA-Z0-9_-]{25,})/)?.[1]
  if (matchId) return { docId: matchId, mimeHint: "drive" }
  return null
}

// ── Word document text extraction (same logic as fetchDocText.ts) ─────────────

function extractDocxText(buffer: Buffer): string {
  let eocdIdx = -1
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65578); i--) {
    if (buffer[i] === 0x50 && buffer[i + 1] === 0x4b &&
        buffer[i + 2] === 0x05 && buffer[i + 3] === 0x06) { eocdIdx = i; break }
  }
  if (eocdIdx < 0) return ""

  const cdOffset = buffer.readUInt32LE(eocdIdx + 16)
  const cdSize   = buffer.readUInt32LE(eocdIdx + 12)

  let pos = cdOffset
  while (pos + 46 <= cdOffset + cdSize && pos + 46 <= buffer.length) {
    if (buffer[pos] !== 0x50 || buffer[pos + 1] !== 0x4b ||
        buffer[pos + 2] !== 0x01 || buffer[pos + 3] !== 0x02) break

    const compression    = buffer.readUInt16LE(pos + 10)
    const compressedSize = buffer.readUInt32LE(pos + 20)
    const fileNameLen    = buffer.readUInt16LE(pos + 28)
    const extraLen       = buffer.readUInt16LE(pos + 30)
    const commentLen     = buffer.readUInt16LE(pos + 32)
    const localOffset    = buffer.readUInt32LE(pos + 42)
    const fileName       = buffer.toString("utf8", pos + 46, pos + 46 + fileNameLen)

    if (fileName === "word/document.xml") {
      const lFnLen   = buffer.readUInt16LE(localOffset + 26)
      const lExtraLen = buffer.readUInt16LE(localOffset + 28)
      const dataStart = localOffset + 30 + lFnLen + lExtraLen
      const raw = buffer.subarray(dataStart, dataStart + compressedSize)
      let xml: string
      try { xml = (compression === 8 ? zlib.inflateRawSync(raw) : raw).toString("utf8") }
      catch { return "" }
      const parts: string[] = []
      const re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g
      let m: RegExpExecArray | null
      while ((m = re.exec(xml)) !== null) parts.push(m[1])
      return parts.join(" ").replace(/\s+/g, " ").trim()
    }

    pos += 46 + fileNameLen + extraLen + commentLen
  }
  return ""
}

// ── Fetch full text for a submission URL ──────────────────────────────────────

async function fetchText(url: string, apiKey: string): Promise<{ text: string; mimeType: string; error?: string }> {
  const parsed = parseDocId(url)
  if (!parsed) return { text: "", mimeType: "", error: "URL parse failed — not a Google Drive link" }

  const drive = google.drive({ version: "v3", auth: apiKey })

  let mimeType = ""
  try {
    const meta = await drive.files.get({ fileId: parsed.docId, fields: "id,mimeType" })
    mimeType = meta.data.mimeType ?? ""
  } catch (e: unknown) {
    const err = e as { code?: number; message?: string }
    return { text: "", mimeType: "", error: `Drive metadata error (${err.code ?? "?"}): ${err.message}` }
  }

  try {
    if (mimeType === "application/vnd.google-apps.document" ||
        mimeType === "application/vnd.google-apps.presentation") {
      const res = await drive.files.export(
        { fileId: parsed.docId, mimeType: "text/plain" },
        { responseType: "text" }
      )
      return { text: ((res.data as string) ?? "").trim(), mimeType }
    }

    if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mimeType === "application/msword") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await (drive.files.get as any)(
        { fileId: parsed.docId, alt: "media" },
        { responseType: "arraybuffer" }
      )
      const text = extractDocxText(Buffer.from(res.data as ArrayBuffer))
      return { text, mimeType }
    }

    return { text: "", mimeType, error: `Unsupported MIME: ${mimeType}` }
  } catch (e: unknown) {
    const err = e as { message?: string }
    return { text: "", mimeType, error: `Fetch error: ${err.message}` }
  }
}

// ── Assembled-copy marker detection ──────────────────────────────────────────
// Searches the full text for section headers that separate the template from
// the student's assembled copy.

const ASSEMBLED_PATTERNS: Array<{ label: string; re: RegExp }> = [
  { label: "Assembled Copy",        re: /assembled\s+copy/i },
  { label: "My Assembled Copy",     re: /my\s+assembled\s+copy/i },
  { label: "My Copy",               re: /^my\s+copy[\s:]/im },
  { label: "Assembled Version",     re: /assembled\s+version/i },
  { label: "Here is my assembled",  re: /here\s+is\s+my\s+assembled/i },
  { label: "Below is my assembled", re: /below\s+is\s+my\s+assembled/i },
  { label: "Section divider ---",   re: /^-{3,}\s*\n[\s\S]{0,40}assembled/im },
  { label: "Section divider ===",   re: /^={3,}\s*\n[\s\S]{0,40}assembled/im },
]

// Template placeholder artifacts — strong signals the doc is a filled template
const TEMPLATE_ARTIFACTS: Array<{ label: string; re: RegExp }> = [
  { label: "[Customer's Name]",     re: /\[customer'?s?\s+name\]/i },
  { label: "[Your Name]",           re: /\[your\s+name\]/i },
  { label: "[First Name]",          re: /\[first\s+name\]/i },
  { label: "[Insert ...]",          re: /\[insert\s/i },
  { label: "[Fill in ...]",         re: /\[fill\s+in/i },
  { label: "[Outcome]",             re: /\[outcome\]/i },
  { label: "[Problem]",             re: /\[problem\]/i },
  { label: "[Audience]",            re: /\[audience\]/i },
  { label: "[Niche]",               re: /\[niche\]/i },
  { label: "{{placeholder}}",       re: /\{\{[a-z_]+\}\}/i },
]

interface AuditResult {
  submissionId: string
  studentId: string
  week: number
  label: string
  url: string
  mimeType: string
  charCount: number
  first200: string
  last200: string
  assembledMarker: string | null
  templateArtifacts: string[]
  state: "template+assembled" | "assembled-only" | "template-only" | "unclear"
  error?: string
}

// ── Main audit ────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    console.error("Error: GOOGLE_API_KEY is not set. Copy it from .env.local and export it before running.")
    process.exit(1)
  }

  // Pull recent LAUNCH_CLASS submissions — prioritise variety of weeks and students
  const submissions = await prisma.submission.findMany({
    where: {
      student: { studentClass: "LAUNCH_CLASS" },
      workbookUrl: { not: "" },
    },
    include: { student: { select: { id: true, name: true } } },
    orderBy: { submittedAt: "desc" },
    take: 10,
  })

  if (submissions.length === 0) {
    console.log("No LAUNCH_CLASS submissions found with URLs.")
    await prisma.$disconnect()
    return
  }

  console.log(`\n${"=".repeat(70)}`)
  console.log(`PHASE 1 AUDIT — ${submissions.length} submissions`)
  console.log(`${"=".repeat(70)}\n`)

  const results: AuditResult[] = []

  for (const sub of submissions) {
    process.stdout.write(`Fetching ${sub.id} (Week ${sub.weekNumber}, "${sub.workbookTitle}")... `)

    const { text, mimeType, error } = await fetchText(sub.workbookUrl, apiKey)

    if (error || !text) {
      process.stdout.write(`ERROR\n`)
      results.push({
        submissionId: sub.id,
        studentId: sub.student.id,
        week: sub.weekNumber,
        label: sub.workbookTitle,
        url: sub.workbookUrl,
        mimeType,
        charCount: 0,
        first200: "",
        last200: "",
        assembledMarker: null,
        templateArtifacts: [],
        state: "unclear",
        error: error ?? "Empty document",
      })
      continue
    }

    process.stdout.write(`${text.length} chars\n`)

    // Detect assembled marker
    let assembledMarker: string | null = null
    for (const { label, re } of ASSEMBLED_PATTERNS) {
      if (re.test(text)) {
        const match = text.match(re)
        assembledMarker = `${label} → "${match?.[0]?.trim().slice(0, 60)}"`
        break
      }
    }

    // Detect template artifacts
    const templateArtifacts: string[] = []
    for (const { label, re } of TEMPLATE_ARTIFACTS) {
      if (re.test(text)) templateArtifacts.push(label)
    }

    // Classify state
    let state: AuditResult["state"]
    if (assembledMarker) {
      state = "template+assembled"
    } else if (templateArtifacts.length > 0) {
      state = "template-only"
    } else {
      // No marker, no artifacts — probably assembled-only but needs eyeball
      state = "unclear"
    }

    results.push({
      submissionId: sub.id,
      studentId: sub.student.id,
      week: sub.weekNumber,
      label: sub.workbookTitle,
      url: sub.workbookUrl,
      mimeType,
      charCount: text.length,
      first200: text.slice(0, 200).replace(/\n/g, "↵"),
      last200:  text.slice(-200).replace(/\n/g, "↵"),
      assembledMarker,
      templateArtifacts,
      state,
    })
  }

  // ── Print report ─────────────────────────────────────────────────────────────

  for (const r of results) {
    console.log(`\n${"─".repeat(70)}`)
    console.log(`ID:         ${r.submissionId}`)
    console.log(`Student ID: ${r.studentId}`)
    console.log(`Week:       ${r.week}`)
    console.log(`Label:      ${r.label}`)
    console.log(`MIME:       ${r.mimeType || "(n/a)"}`)
    console.log(`Chars:      ${r.charCount}`)
    console.log(`STATE:      ${r.state.toUpperCase()}`)

    if (r.error) {
      console.log(`ERROR:      ${r.error}`)
    } else {
      console.log(`Marker:     ${r.assembledMarker ?? "(none found)"}`)
      if (r.templateArtifacts.length > 0) {
        console.log(`Templates:  ${r.templateArtifacts.join(", ")}`)
      }
      console.log(`FIRST 200:  ${r.first200}`)
      console.log(`LAST  200:  ${r.last200}`)
    }
  }

  // ── Summary table ─────────────────────────────────────────────────────────────

  const counts = {
    "template+assembled": 0,
    "assembled-only":     0,
    "template-only":      0,
    "unclear":            0,
    "error":              0,
  }
  for (const r of results) {
    if (r.error) counts["error"]++
    else counts[r.state === "unclear" && !r.assembledMarker && r.templateArtifacts.length === 0
      ? "unclear" : r.state]++
  }

  console.log(`\n${"=".repeat(70)}`)
  console.log("SUMMARY")
  console.log(`${"=".repeat(70)}`)
  console.log(`template+assembled (marker present):         ${results.filter(r => r.state === "template+assembled").length}`)
  console.log(`assembled-only (no marker, no artifacts):    ${results.filter(r => r.state === "unclear").length}  ← needs eyeball`)
  console.log(`template-only (artifacts, no marker):        ${results.filter(r => r.state === "template-only").length}`)
  console.log(`error / unreadable:                          ${results.filter(r => !!r.error).length}`)

  const markerVariants = results
    .filter(r => r.assembledMarker)
    .map(r => r.assembledMarker!)
  if (markerVariants.length > 0) {
    console.log(`\nMarker variants found:\n  ${markerVariants.join("\n  ")}`)
  }

  const labelValues = [...new Set(results.map(r => r.label))].sort()
  console.log(`\nworkbookTitle values seen (${labelValues.length} unique):`)
  for (const l of labelValues) console.log(`  "${l}"`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})

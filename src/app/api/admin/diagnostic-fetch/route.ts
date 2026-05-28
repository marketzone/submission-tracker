// Temporary diagnostic endpoint — Brief #2.
// Probes doc URLs to confirm whether they are accessible via the Google API key
// BEFORE building review logic that depends on that access.
//
// POST /api/admin/diagnostic-fetch
// Header: Authorization: Bearer <CRON_SECRET>
// Body:   { urls: string[] }   — Google Doc/Slides URLs to probe
//         OR omit body to auto-pull the 5 most recent submission workbookUrls
//
// Returns per-URL: docId, fileType, access status, failure reason.
// Never logs document contents, student names, or emails.

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { parseDocUrl } from "@/lib/ai/fetchDocText"
import { getGoogleApiKey } from "@/lib/ai/googleAuth"
import { google } from "googleapis"

const MIME_LABELS: Record<string, string> = {
  "application/vnd.google-apps.document":     "Google Doc",
  "application/vnd.google-apps.presentation": "Google Slides",
  "application/vnd.google-apps.spreadsheet":  "Google Sheets (unsupported)",
  "application/pdf":                          "PDF (unsupported)",
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Resolve URLs to probe
  let urls: string[]
  try {
    const body = await request.json().catch(() => ({}))
    if (Array.isArray(body?.urls) && body.urls.length > 0) {
      urls = body.urls
    } else {
      const submissions = await prisma.submission.findMany({
        orderBy: { submittedAt: "desc" },
        take: 5,
        select: { workbookUrl: true },
      })
      urls = submissions.map((s) => s.workbookUrl).filter(Boolean)
      if (urls.length === 0) {
        return NextResponse.json({
          message: "No URLs provided and no submissions found on staging",
          results: [],
        })
      }
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  // Check API key availability
  let apiKey: string | null = null
  let keyError: string | null = null
  try {
    apiKey = getGoogleApiKey()
  } catch (e: unknown) {
    keyError = (e as Error).message
  }

  const results = await Promise.all(
    urls.map(async (url) => {
      const parsed = parseDocUrl(url)
      if ("error" in parsed) {
        return { url, docId: null, fileType: "unknown", access: "FAIL", reason: `URL parse error: ${parsed.error}` }
      }

      const { docId, fileType: urlFileType } = parsed

      if (!apiKey) {
        return { url, docId, fileType: urlFileType, access: "FAIL", reason: `GOOGLE_API_KEY not set: ${keyError}` }
      }

      try {
        const drive = google.drive({ version: "v3", auth: apiKey })
        const meta = await drive.files.get({ fileId: docId, fields: "id,mimeType" })
        const mimeType = meta.data.mimeType ?? "unknown"
        const label = MIME_LABELS[mimeType] ?? `Unknown (${mimeType})`
        const supported =
          mimeType === "application/vnd.google-apps.document" ||
          mimeType === "application/vnd.google-apps.presentation"

        return {
          url,
          docId,
          fileType: label,
          access: supported ? "OK" : "UNSUPPORTED_TYPE",
          reason: supported ? null : `Not supported for text extraction: ${label}`,
        }
      } catch (e: unknown) {
        const err = e as { code?: number; message?: string }
        const reason =
          err?.code === 403
            ? "NOT_SHARED — set sharing to 'Anyone with the link can view'"
            : err?.code === 404
            ? "NOT_FOUND — broken link or document deleted"
            : `API error (${err?.code ?? "?"}): ${err?.message ?? "unknown"}`

        return { url, docId, fileType: urlFileType, access: "FAIL", reason }
      }
    })
  )

  return NextResponse.json({
    summary: {
      total: results.length,
      ok: results.filter((r) => r.access === "OK").length,
      failed: results.filter((r) => r.access !== "OK").length,
    },
    results,
  })
}

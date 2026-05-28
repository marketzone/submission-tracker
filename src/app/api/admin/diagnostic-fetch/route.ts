// Temporary diagnostic endpoint — Brief #2 only.
// Confirms whether student-submitted doc URLs are accessible by the service account
// BEFORE building any review logic that depends on that access.
//
// POST /api/admin/diagnostic-fetch
// Header: Authorization: Bearer <CRON_SECRET>
// Body:   { urls: string[] }   — list of Google Doc/Slides URLs to probe
//         OR omit body to auto-pull the 5 most recent submission workbookUrls from staging
//
// Returns: per-URL result: docId parsed, fileType detected, access status, failure reason.
// NEVER logs document contents, student names, or emails.

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { parseDocUrl } from "@/lib/ai/fetchDocText"
import { getGoogleAuthClient } from "@/lib/ai/googleAuth"
import { google } from "googleapis"

const MIME_LABELS: Record<string, string> = {
  "application/vnd.google-apps.document":     "Google Doc",
  "application/vnd.google-apps.presentation": "Google Slides",
  "application/vnd.google-apps.spreadsheet":  "Google Sheets (unsupported)",
  "application/pdf":                          "PDF (unsupported)",
}

export async function POST(request: Request) {
  // Auth gate
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
      // Auto-pull from most recent submissions
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

  // Check service account availability
  let auth: ReturnType<typeof getGoogleAuthClient> | null = null
  let authError: string | null = null
  try {
    auth = getGoogleAuthClient()
  } catch (e: unknown) {
    authError = (e as Error).message
  }

  const results = await Promise.all(
    urls.map(async (url) => {
      const parsed = parseDocUrl(url)
      if ("error" in parsed) {
        return {
          url,
          docId: null,
          fileType: "unknown",
          access: "FAIL",
          reason: `URL parse error: ${parsed.error}`,
        }
      }

      const { docId, fileType: urlFileType } = parsed

      if (!auth) {
        return {
          url,
          docId,
          fileType: urlFileType,
          access: "FAIL",
          reason: `Service account not available: ${authError}`,
        }
      }

      try {
        const drive = google.drive({ version: "v3", auth })
        const meta = await drive.files.get({
          fileId: docId,
          fields: "id,mimeType,name",
        })

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
          reason: supported ? null : `File type not supported for text extraction: ${label}`,
        }
      } catch (e: unknown) {
        const err = e as { code?: number; message?: string }
        let reason: string
        if (err?.code === 403) {
          reason =
            "NOT_SHARED — document is restricted; student must set sharing to 'Anyone with the link can view'"
        } else if (err?.code === 404) {
          reason = "NOT_FOUND — document does not exist or the link is broken"
        } else {
          reason = `API error: ${err?.message ?? "unknown"}`
        }
        return {
          url,
          docId,
          fileType: urlFileType,
          access: "FAIL",
          reason,
        }
      }
    })
  )

  const summary = {
    total: results.length,
    ok: results.filter((r) => r.access === "OK").length,
    failed: results.filter((r) => r.access === "FAIL").length,
    unsupportedType: results.filter((r) => r.access === "UNSUPPORTED_TYPE").length,
  }

  return NextResponse.json({ summary, results })
}

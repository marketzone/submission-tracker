import { google } from "googleapis"
import { getGoogleApiKey } from "./googleAuth"

export type FileType = "doc" | "slides" | "unknown"

export type FetchDocResult =
  | { success: true; text: string; fileType: "doc" | "slides"; docId: string }
  | { success: false; reason: string; fileType: FileType; docId: string | null }

// ── URL parsing ───────────────────────────────────────────────────────────────
// Handles the URL formats students actually paste:
//
//  Google Docs:
//    https://docs.google.com/document/d/{id}/edit
//    https://docs.google.com/document/d/{id}/edit?usp=sharing
//    https://docs.google.com/document/d/{id}/view
//    https://docs.google.com/document/d/{id}/
//
//  Google Slides:
//    https://docs.google.com/presentation/d/{id}/edit
//    https://docs.google.com/presentation/d/{id}/view
//    https://docs.google.com/presentation/d/{id}/
//
//  Google Drive direct links:
//    https://drive.google.com/file/d/{id}/view
//    https://drive.google.com/file/d/{id}/view?usp=sharing
//    https://drive.google.com/open?id={id}

export function parseDocUrl(url: string): {
  docId: string
  fileType: FileType
} | { error: string } {
  if (!url || typeof url !== "string") return { error: "Empty or non-string URL" }

  const trimmed = url.trim()
  if (!trimmed.startsWith("http")) return { error: "URL does not start with http" }

  let fileType: FileType = "unknown"
  if (trimmed.includes("/document/")) fileType = "doc"
  else if (trimmed.includes("/presentation/")) fileType = "slides"

  // /d/{id}/ pattern — covers docs, slides, and drive file links
  const matchD = trimmed.match(/\/d\/([a-zA-Z0-9_-]{25,})/)?.[1]
  if (matchD) return { docId: matchD, fileType }

  // ?id={id} pattern — drive.google.com/open?id=...
  const matchId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{25,})/)?.[1]
  if (matchId) return { docId: matchId, fileType }

  return { error: "Could not extract a document ID from the URL" }
}

// ── Text extraction helpers ───────────────────────────────────────────────────

async function extractDocText(docId: string, apiKey: string): Promise<string> {
  const drive = google.drive({ version: "v3", auth: apiKey })
  const res = await drive.files.export(
    { fileId: docId, mimeType: "text/plain" },
    { responseType: "text" }
  )
  return (res.data as string) ?? ""
}

// Google Slides API (google.slides) requires OAuth even for publicly shared files.
// Drive export works with a bare API key for any file shared "Anyone with the link can view".
async function extractSlidesText(docId: string, apiKey: string): Promise<string> {
  const drive = google.drive({ version: "v3", auth: apiKey })
  const res = await drive.files.export(
    { fileId: docId, mimeType: "text/plain" },
    { responseType: "text" }
  )
  return (res.data as string) ?? ""
}

// ── fetchDocText — public API ─────────────────────────────────────────────────

export async function fetchDocText(driveUrl: string): Promise<FetchDocResult> {
  // 1. Parse the URL
  const parsed = parseDocUrl(driveUrl)
  if ("error" in parsed) {
    return { success: false, reason: `Malformed URL: ${parsed.error}`, fileType: "unknown", docId: null }
  }

  const { docId, fileType: urlFileType } = parsed

  // 2. Get API key — fail cleanly if missing
  let apiKey: string
  try {
    apiKey = getGoogleApiKey()
  } catch (e) {
    return {
      success: false,
      reason: "GOOGLE_API_KEY not configured",
      fileType: urlFileType,
      docId,
    }
  }

  // 3. Verify access and resolve file type via Drive metadata
  let resolvedFileType: FileType = urlFileType
  try {
    const drive = google.drive({ version: "v3", auth: apiKey })
    const meta = await drive.files.get({ fileId: docId, fields: "id,mimeType" })
    const mimeType = meta.data.mimeType ?? ""

    if (mimeType === "application/vnd.google-apps.document") resolvedFileType = "doc"
    else if (mimeType === "application/vnd.google-apps.presentation") resolvedFileType = "slides"
    else if (mimeType) {
      return {
        success: false,
        reason: `Unsupported file type: ${mimeType}. Only Google Docs and Google Slides are supported.`,
        fileType: "unknown",
        docId,
      }
    }
  } catch (e: unknown) {
    const err = e as { code?: number; message?: string }
    if (err?.code === 403) {
      return {
        success: false,
        reason: "Document not accessible — student must set sharing to 'Anyone with the link can view'",
        fileType: urlFileType,
        docId,
      }
    }
    if (err?.code === 404) {
      return {
        success: false,
        reason: "Document not found — the link may be broken or the document deleted",
        fileType: urlFileType,
        docId,
      }
    }
    return {
      success: false,
      reason: `Failed to access document: ${err?.message ?? "unknown error"}`,
      fileType: urlFileType,
      docId,
    }
  }

  // 4. Extract text
  try {
    let text: string

    if (resolvedFileType === "doc") {
      text = await extractDocText(docId, apiKey)
    } else if (resolvedFileType === "slides") {
      text = await extractSlidesText(docId, apiKey)
    } else {
      return {
        success: false,
        reason: "Could not determine file type — URL does not identify a Google Doc or Slides file",
        fileType: "unknown",
        docId,
      }
    }

    if (!text.trim()) {
      return {
        success: false,
        reason: "Document is empty — no text content found",
        fileType: resolvedFileType,
        docId,
      }
    }

    return { success: true, text: text.trim(), fileType: resolvedFileType, docId }
  } catch (e: unknown) {
    const err = e as { code?: number; message?: string }
    if (err?.code === 403) {
      return {
        success: false,
        reason: "Permission denied reading document content — must be shared 'Anyone with the link can view'",
        fileType: resolvedFileType,
        docId,
      }
    }
    return {
      success: false,
      reason: `Failed to extract document text: ${err?.message ?? "unknown error"}`,
      fileType: resolvedFileType,
      docId,
    }
  }
}

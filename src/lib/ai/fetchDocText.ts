import { google } from "googleapis"
import { getGoogleAuthClient } from "./googleAuth"

export type FileType = "doc" | "slides" | "unknown"

export type FetchDocResult =
  | { success: true; text: string; fileType: "doc" | "slides"; docId: string }
  | { success: false; reason: string; fileType: FileType; docId: string | null }

// ── URL parsing ───────────────────────────────────────────────────────────────
// Handles the formats students actually paste:
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

  // Extract file type from URL path before extracting ID
  let fileType: FileType = "unknown"
  if (trimmed.includes("/document/")) fileType = "doc"
  else if (trimmed.includes("/presentation/")) fileType = "slides"
  // drive.google.com/file/d/{id} — type resolved later via Drive API metadata

  // /d/{id}/ pattern — covers docs, slides, and drive file links
  const matchD = trimmed.match(/\/d\/([a-zA-Z0-9_-]{25,})/)?.[1]
  if (matchD) return { docId: matchD, fileType }

  // ?id={id} pattern — drive.google.com/open?id=...
  const matchId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{25,})/)?.[1]
  if (matchId) return { docId: matchId, fileType }

  return { error: "Could not extract a document ID from the URL" }
}

// ── Text extraction helpers ───────────────────────────────────────────────────

async function extractDocText(docId: string, auth: ReturnType<typeof getGoogleAuthClient>): Promise<string> {
  const drive = google.drive({ version: "v3", auth })
  // Export as plain text — simpler and more reliable than parsing the Docs API JSON
  const res = await drive.files.export(
    { fileId: docId, mimeType: "text/plain" },
    { responseType: "text" }
  )
  // The export response data is the raw text
  return (res.data as string) ?? ""
}

async function extractSlidesText(docId: string, auth: ReturnType<typeof getGoogleAuthClient>): Promise<string> {
  const slides = google.slides({ version: "v1", auth })
  const res = await slides.presentations.get({ presentationId: docId })
  const presentation = res.data

  const slideTexts: string[] = []

  for (let i = 0; i < (presentation.slides?.length ?? 0); i++) {
    const slide = presentation.slides![i]
    const slideNumber = i + 1
    const contentLines: string[] = []

    // Extract text from all page elements (text boxes, shapes, tables)
    for (const element of slide.pageElements ?? []) {
      if (element.shape?.text) {
        const text = extractTextFromTextContent(element.shape.text)
        if (text.trim()) contentLines.push(text.trim())
      }
      if (element.table) {
        for (const row of element.table.tableRows ?? []) {
          for (const cell of row.tableCells ?? []) {
            if (cell.text) {
              const text = extractTextFromTextContent(cell.text)
              if (text.trim()) contentLines.push(text.trim())
            }
          }
        }
      }
    }

    // Extract speaker notes
    const notesPage = slide.slideProperties?.notesPage
    let speakerNotes = ""
    if (notesPage) {
      for (const element of notesPage.pageElements ?? []) {
        if (element.shape?.text) {
          const text = extractTextFromTextContent(element.shape.text)
          if (text.trim()) speakerNotes += text.trim()
        }
      }
    }

    const slideBlock = [`--- Slide ${slideNumber} ---`, ...contentLines]
    if (speakerNotes) slideBlock.push(`[Speaker Notes: ${speakerNotes}]`)
    slideTexts.push(slideBlock.join("\n"))
  }

  return slideTexts.join("\n\n")
}

function extractTextFromTextContent(
  textContent: { textElements?: Array<{ textRun?: { content?: string } }> }
): string {
  return (textContent.textElements ?? [])
    .map((el) => el.textRun?.content ?? "")
    .join("")
}

// ── fetchDocText — the public API ─────────────────────────────────────────────

export async function fetchDocText(driveUrl: string): Promise<FetchDocResult> {
  // 1. Parse the URL
  const parsed = parseDocUrl(driveUrl)
  if ("error" in parsed) {
    return { success: false, reason: `Malformed URL: ${parsed.error}`, fileType: "unknown", docId: null }
  }

  const { docId, fileType: urlFileType } = parsed

  // 2. Init auth — fail cleanly if credentials missing
  let auth: ReturnType<typeof getGoogleAuthClient>
  try {
    auth = getGoogleAuthClient()
  } catch (e) {
    return {
      success: false,
      reason: "Service account not configured (GOOGLE_SERVICE_ACCOUNT_JSON missing or invalid)",
      fileType: urlFileType,
      docId,
    }
  }

  // 3. Check file metadata via Drive API to confirm access and resolve file type
  let resolvedFileType: FileType = urlFileType
  try {
    const drive = google.drive({ version: "v3", auth })
    const meta = await drive.files.get({ fileId: docId, fields: "id,mimeType,name" })
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
    // 403 = not shared with service account / access denied
    if (err?.code === 403) {
      return {
        success: false,
        reason: "Document not shared with the service account — student must set sharing to 'Anyone with the link can view'",
        fileType: urlFileType,
        docId,
      }
    }
    // 404 = document doesn't exist or ID is wrong
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
      reason: `Failed to access document metadata: ${err?.message ?? "unknown error"}`,
      fileType: urlFileType,
      docId,
    }
  }

  // 4. Extract text based on resolved file type
  try {
    let text: string

    if (resolvedFileType === "doc") {
      text = await extractDocText(docId, auth)
    } else if (resolvedFileType === "slides") {
      text = await extractSlidesText(docId, auth)
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
        reason: "Permission denied when reading document content — document must be shared with 'Anyone with the link can view'",
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

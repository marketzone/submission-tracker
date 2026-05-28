import { JWT } from "google-auth-library"

const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/documents.readonly",
  "https://www.googleapis.com/auth/presentations.readonly",
]

let _client: JWT | null = null

export function getGoogleAuthClient(): JWT {
  if (_client) return _client

  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON env var not set")

  let creds: { client_email: string; private_key: string }
  try {
    creds = JSON.parse(raw)
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON")
  }

  if (!creds.client_email || !creds.private_key) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON missing client_email or private_key")
  }

  // Vercel sometimes stores the key with escaped newlines — normalise either way
  const privateKey = creds.private_key.replace(/\\n/g, "\n")

  _client = new JWT({
    email: creds.client_email,
    key: privateKey,
    scopes: SCOPES,
  })

  return _client
}

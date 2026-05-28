// Returns the Google API key from the environment.
// An API key (not a service account JSON key) is sufficient for accessing
// Google Docs, Slides, and Drive files shared with "Anyone with the link can view".
// The key is restricted in Cloud Console to Drive + Docs + Slides APIs only.
export function getGoogleApiKey(): string {
  const key = process.env.GOOGLE_API_KEY
  if (!key) throw new Error("GOOGLE_API_KEY environment variable not set")
  return key
}

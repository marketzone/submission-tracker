"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"

const GPT_TOOLS = [
  { label: "Workbook 1 GPT Tool", href: "https://chatgpt.com/g/g-67beaf286bf881918c8cced710f5265d-expert2coach-review-day-1-upgraded-version", isVideo: false },
  { label: "How to use Workbook 1 Internal Review GPT Tool", href: "https://youtu.be/78HGqcOVf0c", isVideo: true },
  { label: "Workbook 1 Review GPT Tool", href: "https://chatgpt.com/g/g-69581646e0f481918f76e31912434053-ls-workbook-1-review-internal", isVideo: false },
  { label: "Workbook 2 GPT Tool", href: "https://chatgpt.com/g/g-67dbf96c1aac8191885b60e15ecaec07-expert2coach-day-2-walkthrough", isVideo: false },
  { label: "How to use Workbook 2 Internal Review GPT Tool", href: "https://youtu.be/SK-UnC4cEqo", isVideo: true },
  { label: "Workbook 2 Review GPT Tool", href: "https://chatgpt.com/g/g-694e58bc5d188191968e2e1fd0ac4370-launchsmart-workbook-2-review-gpt", isVideo: false },
  { label: "Workbook 2 Adjuster GPT Tool", href: "https://chatgpt.com/g/g-6951752f5010819190794c16ead60f4c-adjuster-ls-workbook-2", isVideo: false },
]

type Step = "form" | "gpt-confirm" | "gpt-redirect"

export default function SubmitWorkbookPage() {
  const router = useRouter()
  const [workbookTitle, setWorkbookTitle] = useState("")
  const [workbookUrl, setWorkbookUrl] = useState("")
  const [weekNumber, setWeekNumber] = useState("")
  const [coachId, setCoachId] = useState("")
  const [coaches, setCoaches] = useState<Array<{ id: string; name: string }>>([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [studentClass, setStudentClass] = useState<string | null>(null)
  const [step, setStep] = useState<Step>("form")

  useEffect(() => {
    fetch("/api/users/coaches")
      .then((res) => res.json())
      .then((data) => setCoaches(data.coaches || []))
      .catch(() => setCoaches([]))

    fetch("/api/users/launch-info")
      .then((res) => res.json())
      .then((data) => setStudentClass(data.studentClass || null))
      .catch(() => {})
  }, [])

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (studentClass === "PRE_CLARITY") {
      setStep("gpt-confirm")
    } else {
      doSubmit()
    }
  }

  const doSubmit = async () => {
    setError("")
    setSuccess(false)
    setLoading(true)

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workbookTitle,
          workbookUrl,
          weekNumber: parseInt(weekNumber),
          coachId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setStep("form")
        setError(data.error || "Failed to submit workbook")
      } else {
        setSuccess(true)
        setTimeout(() => router.push("/student"), 2000)
      }
    } catch {
      setStep("form")
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // GPT Confirmation step
  if (step === "gpt-confirm") {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <Link href="/student" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to submissions
        </Link>

        <div className="bg-white rounded-xl border border-border shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Before You Submit</h2>
            <p className="text-sm text-muted-foreground mt-1">
              As a Pre-Clarity student, you must complete an internal GPT review before submitting to your coach.
            </p>
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm font-medium text-amber-900">
              Have you used the internal GPT review tool on your workbook?
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
              onClick={() => doSubmit()}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Submitting...
                </span>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Yes, I have completed the GPT review
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="w-full border-red-200 text-red-700 hover:bg-red-50"
              onClick={() => setStep("gpt-redirect")}
            >
              No, I haven&apos;t yet — show me the tools
            </Button>
          </div>

          <button
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors underline"
            onClick={() => setStep("form")}
          >
            Go back and edit my submission
          </button>
        </div>
      </div>
    )
  }

  // GPT Redirect step
  if (step === "gpt-redirect") {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <Link href="/student" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to submissions
        </Link>

        <div className="bg-white rounded-xl border border-border shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Complete Your GPT Review First</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Use the tools below to review your work before submitting to your coach.
            </p>
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
            Once done, come back and submit your workbook.
          </div>

          <div className="space-y-2">
            {GPT_TOOLS.map((tool) => (
              <div key={tool.href} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                <span className="text-sm font-medium text-foreground">{tool.label}</span>
                <a href={tool.href} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant={tool.isVideo ? "outline" : "default"} className="ml-3 shrink-0">
                    {tool.isVideo ? "Watch" : "Open"}
                  </Button>
                </a>
              </div>
            ))}
          </div>

          <Button variant="outline" className="w-full" onClick={() => setStep("gpt-confirm")}>
            I&apos;ve completed the GPT review — proceed to submit
          </Button>
        </div>
      </div>
    )
  }

  // Main form
  return (
    <div className="max-w-lg mx-auto space-y-4">
      <Link href="/student" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to submissions
      </Link>

      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">Submit Workbook</h2>
        <p className="text-sm text-muted-foreground mb-6">Submit your completed workbook for coach review</p>

        <form onSubmit={handleFormSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="workbookTitle" className="text-sm font-medium">Workbook Title</Label>
            <Input
              id="workbookTitle"
              placeholder="e.g., Marketing Fundamentals Workbook"
              value={workbookTitle}
              onChange={(e) => setWorkbookTitle(e.target.value)}
              required
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="workbookUrl" className="text-sm font-medium">Workbook URL</Label>
            <Input
              id="workbookUrl"
              type="url"
              placeholder="https://docs.google.com/..."
              value={workbookUrl}
              onChange={(e) => setWorkbookUrl(e.target.value)}
              required
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">Link to your Google Doc, Notion page, or other workbook</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="weekNumber" className="text-sm font-medium">Week Number</Label>
            <Select value={weekNumber} onValueChange={setWeekNumber} required>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select week" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Pre-Clarity Week</SelectItem>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((week) => (
                  <SelectItem key={week} value={week.toString()}>Week {week}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="coach" className="text-sm font-medium">Submit to Coach</Label>
            <Select value={coachId} onValueChange={setCoachId} required>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select a coach" />
              </SelectTrigger>
              <SelectContent>
                {coaches.map((coach) => (
                  <SelectItem key={coach.id} value={coach.id}>{coach.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {studentClass === "PRE_CLARITY" && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              You will be asked to confirm you have completed the internal GPT review before your submission is sent to your coach.
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700 flex items-center gap-2">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Workbook submitted successfully! Redirecting...
            </div>
          )}

          <Button type="submit" className="w-full h-10 font-medium" disabled={loading || success}>
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Submitting...
              </span>
            ) : "Submit Workbook"}
          </Button>
        </form>
      </div>
    </div>
  )
}

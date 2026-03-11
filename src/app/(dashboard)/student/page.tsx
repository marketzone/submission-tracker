"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface Submission {
  id: string
  workbookTitle: string
  workbookUrl: string
  weekNumber: number
  status: string
  coachFeedback?: string | null
  headCoachFeedback?: string | null
  coach: { name: string }
  headCoach?: { name: string } | null
  submittedAt: string
  reviewedAt?: string | null
}

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-amber-100 text-amber-700 border-amber-200" },
  COACH_REVIEW: { label: "Coach Review", className: "bg-blue-100 text-blue-700 border-blue-200" },
  HEAD_COACH_REVIEW: { label: "Head Coach Review", className: "bg-violet-100 text-violet-700 border-violet-200" },
  APPROVED: { label: "Approved", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  NEEDS_CORRECTION: { label: "Needs Correction", className: "bg-red-100 text-red-700 border-red-200" },
}

const getWeekLabel = (weekNumber: number) =>
  weekNumber === 0 ? "Pre-Clarity Week" : `Week ${weekNumber}`

const ALLOWED_CLASSES = ["STRATEGY_CLASS", "FUNNEL_CLASS", "LAUNCH_CLASS"]

const GPT_TOOLS = [
  { label: "Workbook 1 GPT Tool", href: "https://chatgpt.com/g/g-67beaf286bf881918c8cced710f5265d-expert2coach-review-day-1-upgraded-version", isVideo: false },
  { label: "How to use Workbook 1 Internal Review GPT Tool", href: "https://youtu.be/78HGqcOVf0c", isVideo: true },
  { label: "Workbook 1 Review GPT Tool", href: "https://chatgpt.com/g/g-69581646e0f481918f76e31912434053-ls-workbook-1-review-internal", isVideo: false },
  { label: "Workbook 2 GPT Tool", href: "https://chatgpt.com/g/g-67dbf96c1aac8191885b60e15ecaec07-expert2coach-day-2-walkthrough", isVideo: false },
  { label: "How to use Workbook 2 Internal Review GPT Tool", href: "https://youtu.be/SK-UnC4cEqo", isVideo: true },
  { label: "Workbook 2 Review GPT Tool", href: "https://chatgpt.com/g/g-694e58bc5d188191968e2e1fd0ac4370-launchsmart-workbook-2-review-gpt", isVideo: false },
  { label: "Workbook 2 Adjuster GPT Tool", href: "https://chatgpt.com/g/g-6951752f5010819190794c16ead60f4c-adjuster-ls-workbook-2", isVideo: false },
]

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-border p-5 animate-pulse">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-muted rounded w-2/3" />
          <div className="h-3 bg-muted rounded w-1/3" />
        </div>
        <div className="h-6 bg-muted rounded-full w-28 shrink-0" />
      </div>
      <div className="h-3 bg-muted rounded w-1/2 mt-3" />
      <div className="h-3 bg-muted rounded w-1/4 mt-2" />
    </div>
  )
}

export default function StudentDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [launchStrategy, setLaunchStrategy] = useState("")
  const [launchEventTopic, setLaunchEventTopic] = useState("")
  const [studentClass, setStudentClass] = useState<string | null>(null)
  const [savingLaunchInfo, setSavingLaunchInfo] = useState(false)
  const [saveLaunchSuccess, setSaveLaunchSuccess] = useState(false)

  useEffect(() => {
    fetchSubmissions()
    fetchLaunchInfo()
  }, [])

  const fetchSubmissions = async () => {
    try {
      const response = await fetch("/api/submissions")
      const data = await response.json()
      setSubmissions(data.submissions || [])
    } catch (error) {
      console.error("Error fetching submissions:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLaunchInfo = async () => {
    try {
      const response = await fetch("/api/users/launch-info")
      const data = await response.json()
      setLaunchStrategy(data.launchStrategy || "")
      setLaunchEventTopic(data.launchEventTopic || "")
      setStudentClass(data.studentClass || null)
    } catch (error) {
      console.error("Error fetching launch info:", error)
    }
  }

  const saveLaunchInfo = async () => {
    setSavingLaunchInfo(true)
    setSaveLaunchSuccess(false)
    try {
      const response = await fetch("/api/users/launch-info", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ launchStrategy, launchEventTopic }),
      })
      if (response.ok) {
        setSaveLaunchSuccess(true)
        setTimeout(() => setSaveLaunchSuccess(false), 3000)
      } else {
        const data = await response.json()
        alert(data.error || "Failed to save launch information")
      }
    } catch (error) {
      console.error("Error saving launch info:", error)
      alert("An error occurred")
    } finally {
      setSavingLaunchInfo(false)
    }
  }

  const handleResubmit = async (submissionId: string) => {
    try {
      const response = await fetch(`/api/submissions/${submissionId}/resubmit`, { method: "PATCH" })
      if (response.ok) {
        fetchSubmissions()
      } else {
        alert("Failed to resubmit")
      }
    } catch (error) {
      console.error("Error resubmitting:", error)
      alert("An error occurred")
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Submissions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track your workbook submissions and review status</p>
        </div>
        <Link href="/student/submit">
          <Button className="gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Submit Workbook
          </Button>
        </Link>
      </div>

      {/* GPT Tools — Pre-Clarity only */}
      {studentClass === "PRE_CLARITY" && (
        <Card className="border-violet-200 bg-violet-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-violet-900">Internal GPT Review Tools</CardTitle>
            <CardDescription className="text-violet-700/80 text-sm">
              Complete a GPT review before each submission to your coach.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {GPT_TOOLS.map((tool) => (
              <div key={tool.href} className="flex items-center justify-between rounded-lg border border-violet-200 bg-white px-4 py-3">
                <span className="text-sm font-medium text-foreground">{tool.label}</span>
                <a href={tool.href} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant={tool.isVideo ? "outline" : "default"} className="shrink-0 ml-3">
                    {tool.isVideo ? "Watch" : "Open"}
                  </Button>
                </a>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Launch Info — Strategy Class+ */}
      {studentClass && ALLOWED_CLASSES.includes(studentClass) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Launch Information</CardTitle>
            <CardDescription className="text-sm">Record your launch strategy and event topic</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="launchStrategy" className="text-sm font-medium">Launch Strategy</Label>
              <Input
                id="launchStrategy"
                placeholder="Enter your launch strategy..."
                value={launchStrategy}
                onChange={(e) => setLaunchStrategy(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="launchEventTopic" className="text-sm font-medium">Launch Event Topic</Label>
              <Input
                id="launchEventTopic"
                placeholder="Enter your launch event topic..."
                value={launchEventTopic}
                onChange={(e) => setLaunchEventTopic(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={saveLaunchInfo} disabled={savingLaunchInfo}>
                {savingLaunchInfo ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Saving...
                  </span>
                ) : "Save"}
              </Button>
              {saveLaunchSuccess && (
                <span className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Saved successfully
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submissions list */}
      {loading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : submissions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white py-16 text-center px-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-4">
            <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">No submissions yet</h3>
          <p className="text-sm text-muted-foreground mb-6">Submit your first workbook to get started.</p>
          <Link href="/student/submit">
            <Button>Submit Your First Workbook</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => {
            const sc = statusConfig[submission.status] ?? { label: submission.status, className: "bg-gray-100 text-gray-700 border-gray-200" }
            return (
              <div key={submission.id} className="bg-white rounded-xl border border-border shadow-sm">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{submission.workbookTitle}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {getWeekLabel(submission.weekNumber)} &middot; Coach: {submission.coach.name}
                      </p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${sc.className}`}>
                      {sc.label}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-1.5 text-sm">
                    <svg className="h-3.5 w-3.5 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                    </svg>
                    <a href={submission.workbookUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 truncate transition-colors">
                      {submission.workbookUrl}
                    </a>
                  </div>

                  <p className="mt-2 text-xs text-muted-foreground">
                    Submitted {new Date(submission.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>

                  {submission.coachFeedback && (
                    <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
                      <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">Coach Feedback</p>
                      <p className="text-sm text-amber-900">{submission.coachFeedback}</p>
                    </div>
                  )}

                  {submission.headCoachFeedback && (
                    <div className="mt-3 rounded-lg bg-violet-50 border border-violet-200 p-3">
                      <p className="text-xs font-semibold text-violet-800 uppercase tracking-wide mb-1">Head Coach Feedback</p>
                      <p className="text-sm text-violet-900">{submission.headCoachFeedback}</p>
                    </div>
                  )}

                  {submission.status === "NEEDS_CORRECTION" && (
                    <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-4">
                      <p className="text-sm font-medium text-red-900 mb-3">
                        Please make the requested corrections and resubmit your workbook.
                      </p>
                      <Button onClick={() => handleResubmit(submission.id)} size="sm">
                        Mark Corrected &amp; Resubmit
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

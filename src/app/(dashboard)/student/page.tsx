"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FeedbackRenderer, isAiReview } from "@/components/FeedbackRenderer"

interface Submission {
  id: string
  workbookTitle: string
  workbookUrl: string
  weekNumber: number
  status: string
  studentNote?: string | null
  coachFeedback?: string | null
  headCoachFeedback?: string | null
  returnedByHeadCoach: boolean
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

const STRATEGY_ACTIONS = [
  {
    key: "CANVA_SUBMITTED",
    label: "Canva images created & submitted in WhatsApp for coach review",
    step: 1,
  },
  {
    key: "POST_APPROVED",
    label: "Canva post approved by coach",
    step: 2,
  },
  {
    key: "AD_SETUP_PENDING",
    label: "Ad setup waiting for metrics",
    step: 3,
  },
  {
    key: "METRICS_READ",
    label: "Metrics read — ready for Week 2",
    step: 4,
  },
] as const

type StrategyActionKey = typeof STRATEGY_ACTIONS[number]["key"]

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
  const [launchPricing, setLaunchPricing] = useState("")
  const [launchPrice, setLaunchPrice] = useState("")
  const [launchEventTopic, setLaunchEventTopic] = useState("")
  const [niche, setNiche] = useState("")
  const [approvedEventTitle, setApprovedEventTitle] = useState("")
  const [studentClass, setStudentClass] = useState<string | null>(null)
  const [launchInfoStatus, setLaunchInfoStatus] = useState<string | null>(null)
  const [launchInfoFeedback, setLaunchInfoFeedback] = useState<string | null>(null)
  const [savingLaunchInfo, setSavingLaunchInfo] = useState(false)
  const [saveLaunchSuccess, setSaveLaunchSuccess] = useState(false)

  // Strategy Class progress
  const [strategyAction, setStrategyAction] = useState<StrategyActionKey | null>(null)
  const [selectedAction, setSelectedAction] = useState<StrategyActionKey | null>(null)
  const [savingStrategy, setSavingStrategy] = useState(false)
  const [strategySuccess, setStrategySuccess] = useState(false)
  const [strategyUpdatedAt, setStrategyUpdatedAt] = useState<string | null>(null)

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
      setLaunchPricing(data.launchPricing || "")
      setLaunchPrice(data.launchPrice || "")
      setLaunchEventTopic(data.launchEventTopic || "")
      setNiche(data.niche || "")
      setApprovedEventTitle(data.approvedEventTitle || "")
      setLaunchInfoStatus(data.launchInfoStatus || null)
      setLaunchInfoFeedback(data.launchInfoFeedback || null)
      setStudentClass(data.studentClass || null)

      if (data.studentClass === "STRATEGY_CLASS") {
        fetchStrategyProgress()
      }
    } catch (error) {
      console.error("Error fetching launch info:", error)
    }
  }

  const fetchStrategyProgress = async () => {
    try {
      const res = await fetch("/api/strategy-progress")
      const data = await res.json()
      if (data.progress) {
        setStrategyAction(data.progress.action)
        setSelectedAction(data.progress.action)
        setStrategyUpdatedAt(data.progress.updatedAt)
      }
    } catch (error) {
      console.error("Error fetching strategy progress:", error)
    }
  }

  const saveStrategyProgress = async () => {
    if (!selectedAction) return
    setSavingStrategy(true)
    setStrategySuccess(false)
    try {
      const res = await fetch("/api/strategy-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: selectedAction }),
      })
      if (res.ok) {
        const data = await res.json()
        setStrategyAction(selectedAction)
        setStrategyUpdatedAt(data.progress.updatedAt)
        setStrategySuccess(true)
        setTimeout(() => setStrategySuccess(false), 3000)
      } else {
        alert("Failed to save progress")
      }
    } catch (error) {
      console.error("Error saving strategy progress:", error)
      alert("An error occurred")
    } finally {
      setSavingStrategy(false)
    }
  }

  const saveLaunchInfo = async () => {
    setSavingLaunchInfo(true)
    setSaveLaunchSuccess(false)
    try {
      const response = await fetch("/api/users/launch-info", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ launchStrategy, launchPricing, launchPrice, launchEventTopic, niche }),
      })
      if (response.ok) {
        setSaveLaunchSuccess(true)
        setLaunchInfoStatus("PENDING_REVIEW")
        setLaunchInfoFeedback(null)
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

  const GATED_CLASSES = ["STRATEGY_CLASS", "FUNNEL_CLASS"]
  const isLaunchInfoGated =
    studentClass !== null &&
    GATED_CLASSES.includes(studentClass) &&
    launchInfoStatus !== "PENDING_REVIEW" &&
    launchInfoStatus !== "APPROVED"

  if (isLaunchInfoGated) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Complete Your Launch Information</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Fill in your launch details below to continue</p>
        </div>

        {launchInfoStatus === "NEEDS_REVISION" && launchInfoFeedback && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-xs font-semibold text-red-800 uppercase tracking-wide mb-1">Revision Requested by Head Coach</p>
            <p className="text-sm text-red-900">{launchInfoFeedback}</p>
          </div>
        )}

        {launchInfoStatus === "NEEDS_REVISION" && !launchInfoFeedback && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm text-amber-900 font-medium">Your launch information needs to be updated. Please review and resubmit below.</p>
          </div>
        )}

        {launchInfoStatus === null && (
          <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-4">
            <p className="text-sm text-indigo-900 font-medium">
              Before you can access your dashboard, please fill in your launch information. Once submitted, the head coach will review and approve it.
            </p>
          </div>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Launch Information</CardTitle>
            <CardDescription className="text-sm">Be as specific as possible with each field</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="nicheGate" className="text-sm font-medium">
                Level 5 Niche <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground -mt-0.5">Describe your specific target audience — who they are, their situation, and the exact problem you solve for them.</p>
              <Textarea
                id="nicheGate"
                placeholder="e.g. Female solopreneurs aged 35–50 who want to launch a coaching business but don't know where to start..."
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Launch Strategy <span className="text-destructive">*</span></Label>
              <Select value={launchStrategy} onValueChange={setLaunchStrategy}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select your launch format..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Webinar">Webinar</SelectItem>
                  <SelectItem value="Workshop">Workshop</SelectItem>
                  <SelectItem value="3 Days Challenge">3 Days Challenge</SelectItem>
                  <SelectItem value="5 Days Challenge">5 Days Challenge</SelectItem>
                  <SelectItem value="Weekend Bootcamp">Weekend Bootcamp</SelectItem>
                  <SelectItem value="Evergreen VSL">Evergreen VSL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {launchStrategy && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Pricing Model <span className="text-destructive">*</span></Label>
                <div className="flex flex-wrap gap-2">
                  {["Free", "Pay What You Want", "Low Ticket"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => { setLaunchPricing(option); if (option === "Free") setLaunchPrice("") }}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                        launchPricing === option
                          ? "border-primary bg-primary/5 text-primary shadow-sm"
                          : "border-border hover:border-primary/40 hover:bg-muted/30 text-foreground"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {(launchPricing === "Pay What You Want" || launchPricing === "Low Ticket") && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-muted-foreground shrink-0">Price:</span>
                    <div className="relative w-36">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input
                        placeholder="e.g. 47"
                        value={launchPrice}
                        onChange={(e) => setLaunchPrice(e.target.value)}
                        className="h-9 pl-7 w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="launchEventTopicGate" className="text-sm font-medium">
                Content Direction for the Launch Event <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground -mt-0.5">Be as detailed as possible — describe what your audience will learn, the problem you&apos;re solving, and the transformation you&apos;re promising.</p>
              <Textarea
                id="launchEventTopicGate"
                placeholder="Describe the content direction for your launch event in detail..."
                value={launchEventTopic}
                onChange={(e) => setLaunchEventTopic(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button onClick={saveLaunchInfo} disabled={savingLaunchInfo}>
                {savingLaunchInfo ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Submitting...
                  </span>
                ) : "Submit for Review"}
              </Button>
              {saveLaunchSuccess && (
                <span className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Submitted for review
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
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

      {/* Strategy Class Progress Tracker */}
      {studentClass === "STRATEGY_CLASS" && (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-indigo-50 to-white">
            <h2 className="text-base font-semibold text-foreground">Strategy Class Progress</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Select your current stage — this counts as activity and keeps your account active.
            </p>
          </div>
          <div className="p-5 space-y-3">
            {STRATEGY_ACTIONS.map((action) => {
              const isSelected = selectedAction === action.key
              const isSaved = strategyAction === action.key
              return (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => setSelectedAction(action.key)}
                  className={`w-full text-left flex items-center gap-4 rounded-xl border px-4 py-3.5 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/40 hover:bg-muted/30"
                  }`}
                >
                  {/* Step circle */}
                  <div className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                    isSelected
                      ? "bg-primary text-white"
                      : isSaved
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {isSaved && !isSelected ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      action.step
                    )}
                  </div>
                  <span className={`text-sm font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                    {action.label}
                  </span>
                  {isSelected && (
                    <span className="ml-auto shrink-0">
                      <svg className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </button>
              )
            })}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={saveStrategyProgress}
                disabled={savingStrategy || !selectedAction || selectedAction === strategyAction}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingStrategy ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Saving...
                  </>
                ) : "Save Progress"}
              </button>

              {strategySuccess && (
                <span className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Progress saved
                </span>
              )}

              {strategyUpdatedAt && !strategySuccess && (
                <span className="text-xs text-muted-foreground">
                  Last updated {new Date(strategyUpdatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Launch Info — Strategy Class+ */}
      {studentClass && ALLOWED_CLASSES.includes(studentClass) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold">Launch Information</CardTitle>
                <CardDescription className="text-sm">Fill in your launch details below — be as specific as possible</CardDescription>
              </div>
              {launchInfoStatus && (
                <span className={`shrink-0 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                  launchInfoStatus === "APPROVED"
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : launchInfoStatus === "PENDING_REVIEW"
                    ? "bg-amber-100 text-amber-700 border-amber-200"
                    : "bg-red-100 text-red-700 border-red-200"
                }`}>
                  {launchInfoStatus === "APPROVED" ? "Approved" : launchInfoStatus === "PENDING_REVIEW" ? "Under Review" : "Needs Revision"}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Level 5 Niche */}
            <div className="space-y-1.5">
              <Label htmlFor="nicheDashboard" className="text-sm font-medium">Level 5 Niche</Label>
              <p className="text-xs text-muted-foreground -mt-0.5">Describe your specific target audience — who they are, their situation, and the exact problem you solve for them.</p>
              <Textarea
                id="nicheDashboard"
                placeholder="e.g. Female solopreneurs aged 35–50 who want to launch a coaching business but don't know where to start..."
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Launch Strategy — format dropdown */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Launch Strategy</Label>
              <Select value={launchStrategy} onValueChange={setLaunchStrategy}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select your launch format..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Webinar">Webinar</SelectItem>
                  <SelectItem value="Workshop">Workshop</SelectItem>
                  <SelectItem value="3 Days Challenge">3 Days Challenge</SelectItem>
                  <SelectItem value="5 Days Challenge">5 Days Challenge</SelectItem>
                  <SelectItem value="Weekend Bootcamp">Weekend Bootcamp</SelectItem>
                  <SelectItem value="Evergreen VSL">Evergreen VSL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pricing model — only shown when a format is selected */}
            {launchStrategy && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Pricing Model</Label>
                <div className="flex flex-wrap gap-2">
                  {["Free", "Pay What You Want", "Low Ticket"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => { setLaunchPricing(option); if (option === "Free") setLaunchPrice("") }}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                        launchPricing === option
                          ? "border-primary bg-primary/5 text-primary shadow-sm"
                          : "border-border hover:border-primary/40 hover:bg-muted/30 text-foreground"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                {/* Price input — only for PWYW or Low Ticket */}
                {(launchPricing === "Pay What You Want" || launchPricing === "Low Ticket") && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-muted-foreground shrink-0">Price:</span>
                    <div className="relative w-36">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input
                        placeholder="e.g. 47"
                        value={launchPrice}
                        onChange={(e) => setLaunchPrice(e.target.value)}
                        className="h-9 pl-7 w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Content Direction */}
            <div className="space-y-1.5">
              <Label htmlFor="launchEventTopic" className="text-sm font-medium">
                Content Direction for the Launch Event
              </Label>
              <p className="text-xs text-muted-foreground -mt-0.5">Be as detailed as possible — describe what your audience will learn, the problem you&apos;re solving, and the transformation you&apos;re promising.</p>
              <Textarea
                id="launchEventTopic"
                placeholder="Describe the content direction for your launch event in detail..."
                value={launchEventTopic}
                onChange={(e) => setLaunchEventTopic(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Approved Event Title — read-only, set by coach */}
            {approvedEventTitle && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide mb-1">Approved Event Title by Coach Mayowa</p>
                <p className="text-sm text-emerald-900 font-medium">{approvedEventTitle}</p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <Button onClick={saveLaunchInfo} disabled={savingLaunchInfo}>
                {savingLaunchInfo ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Saving...
                  </span>
                ) : "Save Launch Info"}
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

                  {submission.studentNote && (
                    <div className="mt-4 rounded-lg bg-sky-50 border border-sky-200 p-3">
                      <p className="text-xs font-semibold text-sky-800 uppercase tracking-wide mb-1">Your Note</p>
                      <p className="text-sm text-sky-900">{submission.studentNote}</p>
                    </div>
                  )}

                  {submission.coachFeedback && (
                    isAiReview(submission.coachFeedback) ? (
                      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                        <FeedbackRenderer text={submission.coachFeedback} />
                      </div>
                    ) : (
                      <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
                        <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">Coach Feedback</p>
                        <p className="text-sm text-amber-900 whitespace-pre-wrap">{submission.coachFeedback}</p>
                      </div>
                    )
                  )}

                  {submission.headCoachFeedback && (
                    <div className="mt-3 rounded-lg bg-violet-50 border border-violet-200 p-3">
                      <p className="text-xs font-semibold text-violet-800 uppercase tracking-wide mb-1">Head Coach Feedback</p>
                      <p className="text-sm text-violet-900 whitespace-pre-wrap">{submission.headCoachFeedback}</p>
                    </div>
                  )}

                  {submission.status === "NEEDS_CORRECTION" && (
                    <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-4">
                      <p className="text-sm font-medium text-red-900 mb-3">
                        Please make the requested corrections and resubmit your workbook.
                      </p>
                      <Button onClick={() => handleResubmit(submission.id)} size="sm">
                        Mark Corrected &amp; Resubmit{submission.returnedByHeadCoach ? " to Head Coach" : ""}
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

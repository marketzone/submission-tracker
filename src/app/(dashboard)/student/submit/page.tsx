"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import {
  DELIVERABLES,
  WEEK_OPTIONS,
  SALES_PAGE_VARIANTS,
  getDeliverablesForWeek,
  type DeliverableWeek,
  type LaunchStrategy,
  type SalesPageVariant,
} from "@/lib/deliverables"
import { deriveReviewerStrategy } from "@/lib/ai/weekCriteriaLookup"

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

  // Student context
  const [studentClass, setStudentClass] = useState<string | null>(null)
  const [reviewerStrategy, setReviewerStrategy] = useState<LaunchStrategy | null>(null)
  const [launchInfoBlocked, setLaunchInfoBlocked] = useState(false)
  const [coaches, setCoaches] = useState<Array<{ id: string; name: string }>>([])

  // Step 1 — week selection
  const [selectedWeek, setSelectedWeek] = useState<DeliverableWeek | "">("")

  // Step 2 — deliverable selection
  const [selectedDeliverableId, setSelectedDeliverableId] = useState("")

  // Step 3 — Week 6 sales page variant checkboxes
  const [selectedVariants, setSelectedVariants] = useState<Set<SalesPageVariant["id"]>>(new Set())

  // Other form fields
  const [workbookUrl, setWorkbookUrl] = useState("")
  const [coachId, setCoachId] = useState("")
  const [studentNote, setStudentNote] = useState("")

  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<Step>("form")

  useEffect(() => {
    fetch("/api/users/coaches")
      .then((res) => res.json())
      .then((data) => setCoaches(data.coaches || []))
      .catch(() => setCoaches([]))

    fetch("/api/users/launch-info")
      .then((res) => res.json())
      .then((data) => {
        const cls = data.studentClass || null
        setStudentClass(cls)

        const gatedClasses = ["STRATEGY_CLASS", "FUNNEL_CLASS"]
        const status = data.launchInfoStatus || null
        if (cls && gatedClasses.includes(cls) && status !== "PENDING_REVIEW" && status !== "APPROVED") {
          setLaunchInfoBlocked(true)
        }

        const strategy = deriveReviewerStrategy(data.launchStrategy || null, data.launchPricing || null)
        setReviewerStrategy(strategy)
      })
      .catch(() => {})
  }, [])

  // Derived deliverable list for the selected week
  const deliverableOptions =
    selectedWeek !== "" && reviewerStrategy
      ? getDeliverablesForWeek(selectedWeek, reviewerStrategy)
      : []

  // Selected deliverable object
  const selectedDeliverable = DELIVERABLES.find((d) => d.id === selectedDeliverableId) ?? null
  const isMultiVariant = selectedDeliverable?.multiVariantSelect === true

  const toggleVariant = (id: SalesPageVariant["id"]) => {
    setSelectedVariants((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Reset deliverable + variants when week changes
  const handleWeekChange = (val: string) => {
    setSelectedWeek(val as DeliverableWeek)
    setSelectedDeliverableId("")
    setSelectedVariants(new Set())
  }

  // Reset variants when deliverable changes
  const handleDeliverableChange = (val: string) => {
    setSelectedDeliverableId(val)
    setSelectedVariants(new Set())
  }

  const isFormValid = () => {
    if (!selectedDeliverable) return false
    if (!workbookUrl.trim()) return false
    if (studentClass !== "LAUNCH_CLASS" && !coachId) return false
    if (isMultiVariant && selectedVariants.size === 0) return false
    return true
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid()) return
    if (studentClass === "PRE_CLARITY") {
      setStep("gpt-confirm")
    } else {
      doSubmit()
    }
  }

  const doSubmit = async () => {
    if (!selectedDeliverable) return
    setError("")
    setSuccess(false)
    setLoading(true)

    const workbookVariants =
      isMultiVariant && selectedVariants.size > 0
        ? Array.from(selectedVariants).join(",")
        : undefined

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workbookTitle: selectedDeliverable.deliverableName,
          workbookUrl,
          weekNumber: selectedDeliverable.weekNumber,
          coachId,
          studentNote: studentNote.trim() || undefined,
          workbookVariants,
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

  // ── Launch info gate ─────────────────────────────────────────────────────────
  if (launchInfoBlocked) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <Link href="/student" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to dashboard
        </Link>
        <div className="bg-white rounded-xl border border-border shadow-sm p-6 space-y-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
            <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-foreground">Launch Information Required</h2>
          <p className="text-sm text-muted-foreground">
            You need to complete and submit your launch information before you can submit workbooks. Go back to your dashboard to fill it in.
          </p>
          <Link href="/student">
            <Button className="w-full">Complete Launch Information</Button>
          </Link>
        </div>
      </div>
    )
  }

  // ── GPT confirmation step ─────────────────────────────────────────────────────
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
            <p className="text-sm font-medium text-amber-900">Have you used the internal GPT review tool on your workbook?</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={() => doSubmit()} disabled={loading}>
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
            <Button variant="outline" className="w-full border-red-200 text-red-700 hover:bg-red-50" onClick={() => setStep("gpt-redirect")}>
              No, I haven&apos;t yet — show me the tools
            </Button>
          </div>
          <button className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors underline" onClick={() => setStep("form")}>
            Go back and edit my submission
          </button>
        </div>
      </div>
    )
  }

  // ── GPT redirect step ─────────────────────────────────────────────────────────
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
            <p className="text-sm text-muted-foreground mt-1">Use the tools below to review your work before submitting to your coach.</p>
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

  // ── Main form ─────────────────────────────────────────────────────────────────
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
        <p className="text-sm text-muted-foreground mb-6">Submit your completed workbook for review</p>

        <form onSubmit={handleFormSubmit} className="space-y-5">
          {/* Step 1 — Week */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Week</Label>
            <Select value={selectedWeek} onValueChange={handleWeekChange}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select week" />
              </SelectTrigger>
              <SelectContent>
                {WEEK_OPTIONS.map((opt) => (
                  <SelectItem key={String(opt.value)} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 2 — Deliverable (appears once week is chosen) */}
          {selectedWeek !== "" && deliverableOptions.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Deliverable</Label>
              <Select value={selectedDeliverableId} onValueChange={handleDeliverableChange}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select deliverable" />
                </SelectTrigger>
                <SelectContent>
                  {deliverableOptions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.deliverableName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Week 7 blocked for evergreen */}
          {selectedWeek === "7" && reviewerStrategy === "evergreen" && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              Evergreen students complete their sales email sequence in Week 5. There is no Week 7 submission for your launch strategy.
            </div>
          )}

          {/* Step 3 — Variant checkboxes (Week 6 Core-Offer Sales Page only) */}
          {isMultiVariant && selectedDeliverable?.availableVariants && (
            <div className="space-y-2">
              <div>
                <Label className="text-sm font-medium">Which sales page templates did you write?</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tick each variant you produced — at least one is required.
                </p>
              </div>
              <div className="rounded-lg border border-border divide-y divide-border">
                {SALES_PAGE_VARIANTS.map((v) => {
                  const checked = selectedVariants.has(v.id)
                  return (
                    <label
                      key={v.id}
                      className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors ${
                        checked ? "bg-primary/5" : "hover:bg-muted/30"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary"
                        checked={checked}
                        onChange={() => toggleVariant(v.id)}
                      />
                      <div>
                        <p className={`text-sm font-medium ${checked ? "text-primary" : "text-foreground"}`}>
                          {v.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{v.description}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
              {isMultiVariant && selectedVariants.size === 0 && selectedDeliverableId && (
                <p className="text-xs text-destructive">Select at least one variant to continue.</p>
              )}
            </div>
          )}

          {/* Workbook URL */}
          {selectedDeliverableId && (
            <div className="space-y-1.5">
              <Label htmlFor="workbookUrl" className="text-sm font-medium">Workbook URL</Label>
              <Input
                id="workbookUrl"
                type="url"
                placeholder="https://docs.google.com/document/d/... or /presentation/d/..."
                value={workbookUrl}
                onChange={(e) => setWorkbookUrl(e.target.value)}
                required
                className="h-10"
              />
              <div className="rounded-md bg-sky-50 border border-sky-200 p-2.5 space-y-1">
                <p className="text-xs font-medium text-sky-800">Google Doc or Google Slides only</p>
                <p className="text-xs text-sky-700">
                  Your workbook must be a native <strong>Google Doc</strong> or <strong>Google Slides</strong> file — not a Word or PowerPoint upload.
                  If you have a .docx or .pptx, open it in Google Drive, then go to <strong>File → Save as Google Docs / Google Slides</strong> first.
                </p>
                {selectedDeliverable?.requiresAiReview && (
                  <p className="text-xs text-sky-700">
                    Sharing must be set to <strong>&ldquo;Anyone with the link can view&rdquo;</strong> — the AI reviewer cannot access restricted documents.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Coach selector (non-LAUNCH_CLASS only) */}
          {selectedDeliverableId && (
            studentClass === "LAUNCH_CLASS" ? (
              <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3 text-sm text-indigo-800">
                <span className="font-medium">Launch Class:</span> Your submission goes directly to the Head Coach — no coach selection needed.
              </div>
            ) : (
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
            )
          )}

          {/* Student note */}
          {selectedDeliverableId && (
            <div className="space-y-1.5">
              <Label htmlFor="studentNote" className="text-sm font-medium">
                Note to {studentClass === "LAUNCH_CLASS" ? "Head Coach" : "Coach"}{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="studentNote"
                placeholder={`Add any context your ${studentClass === "LAUNCH_CLASS" ? "head coach" : "coach"} should know before reviewing...`}
                value={studentNote}
                onChange={(e) => setStudentNote(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          )}

          {/* GPT notice for Pre-Clarity */}
          {selectedDeliverableId && studentClass === "PRE_CLARITY" && (
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

          {selectedDeliverableId && (
            <Button type="submit" className="w-full h-10 font-medium" disabled={loading || success || !isFormValid()}>
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
          )}
        </form>
      </div>
    </div>
  )
}

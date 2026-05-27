"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Submission {
  id: string
  workbookTitle: string
  workbookUrl: string
  weekNumber: number
  status: string
  studentNote?: string | null
  coachFeedback?: string | null
  headCoachFeedback?: string | null
  student: {
    name: string
    email: string
    studentClass?: string | null
    launchStrategy?: string | null
    launchPricing?: string | null
    launchPrice?: string | null
    launchEventTopic?: string | null
    approvedEventTitle?: string | null
    niche?: string | null
  }
  submittedAt: string
}

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-amber-100 text-amber-700 border-amber-200" },
  COACH_REVIEW: { label: "In Review", className: "bg-blue-100 text-blue-700 border-blue-200" },
  HEAD_COACH_REVIEW: { label: "Head Coach Review", className: "bg-violet-100 text-violet-700 border-violet-200" },
  APPROVED: { label: "Approved", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  NEEDS_CORRECTION: { label: "Needs Correction", className: "bg-red-100 text-red-700 border-red-200" },
}

const getWeekLabel = (weekNumber: number) =>
  weekNumber === 0 ? "Pre-Clarity Week" : `Week ${weekNumber}`

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-border p-5 animate-pulse">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-muted rounded w-2/3" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
        <div className="h-6 bg-muted rounded-full w-24 shrink-0" />
      </div>
      <div className="h-3 bg-muted rounded w-1/2 mt-3" />
      <div className="h-3 bg-muted rounded w-1/4 mt-2" />
      <div className="h-8 bg-muted rounded w-32 mt-4" />
    </div>
  )
}

export default function CoachDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState("")
  const [expandedLaunchId, setExpandedLaunchId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [weekFilter, setWeekFilter] = useState("all")
  const [studentSearch, setStudentSearch] = useState("")

  useEffect(() => {
    fetchSubmissions()
  }, [])

  useEffect(() => {
    filterSubmissions()
  }, [submissions, statusFilter, weekFilter, studentSearch])

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

  const filterSubmissions = () => {
    let filtered = submissions
    if (statusFilter !== "all") filtered = filtered.filter((s) => s.status === statusFilter)
    if (weekFilter !== "all") filtered = filtered.filter((s) => s.weekNumber === parseInt(weekFilter))
    if (studentSearch) filtered = filtered.filter((s) => s.student.name.toLowerCase().includes(studentSearch.toLowerCase()))
    setFilteredSubmissions(filtered)
  }

  const handleReview = async (submissionId: string, approved: boolean) => {
    if (!approved && !feedback.trim()) {
      alert("Please provide feedback when requesting corrections")
      return
    }
    try {
      const response = await fetch(`/api/submissions/${submissionId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved, feedback: approved ? undefined : feedback }),
      })
      if (response.ok) {
        setReviewingId(null)
        setFeedback("")
        fetchSubmissions()
      } else {
        alert("Failed to submit review")
      }
    } catch (error) {
      console.error("Error submitting review:", error)
      alert("An error occurred")
    }
  }

  const pendingCount = submissions.filter((s) => s.status === "PENDING" || s.status === "COACH_REVIEW").length

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Review Queue</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Review student workbook submissions</p>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 border border-red-200 px-3 py-1 text-sm font-semibold text-red-700">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-border p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="studentSearch" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Search student</Label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <Input
                id="studentSearch"
                placeholder="Search by name..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="h-9 pl-9"
              />
            </div>
          </div>
          <div className="w-full sm:w-44 space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="COACH_REVIEW">In Review</SelectItem>
                <SelectItem value="HEAD_COACH_REVIEW">With Head Coach</SelectItem>
                <SelectItem value="NEEDS_CORRECTION">Needs Correction</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-36 space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Week</Label>
            <Select value={weekFilter} onValueChange={setWeekFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Weeks</SelectItem>
                <SelectItem value="0">Pre-Clarity</SelectItem>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((week) => (
                  <SelectItem key={week} value={week.toString()}>Week {week}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-sm text-muted-foreground px-1">
          Showing {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Submissions */}
      {loading ? (
        <div className="space-y-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white py-16 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-4">
            <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground mb-1">No submissions found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSubmissions.map((submission) => {
            const sc = statusConfig[submission.status] ?? { label: submission.status, className: "bg-gray-100 text-gray-700 border-gray-200" }
            return (
              <div key={submission.id} className="bg-white rounded-xl border border-border shadow-sm">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{submission.workbookTitle}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {submission.student.name} &middot; {getWeekLabel(submission.weekNumber)}
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

                  {(submission.student.launchStrategy || submission.student.launchEventTopic || submission.student.niche) && (
                    <div className="mt-3">
                      <button
                        onClick={() => setExpandedLaunchId(expandedLaunchId === submission.id ? null : submission.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 hover:text-indigo-900 transition-colors"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {expandedLaunchId === submission.id ? "Hide launch info" : "View launch info"}
                        <svg className={`h-3 w-3 transition-transform ${expandedLaunchId === submission.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {expandedLaunchId === submission.id && (
                        <div className="mt-2 rounded-lg bg-indigo-50 border border-indigo-200 p-3 space-y-1.5">
                          <p className="text-xs font-semibold text-indigo-800 uppercase tracking-wide mb-1">Launch Information</p>
                          {submission.student.niche && (
                            <p className="text-sm"><span className="font-medium text-indigo-900">Niche: </span><span className="text-indigo-800">{submission.student.niche}</span></p>
                          )}
                          {submission.student.launchStrategy && (
                            <p className="text-sm">
                              <span className="font-medium text-indigo-900">Strategy: </span>
                              <span className="text-indigo-800">
                                {submission.student.launchStrategy}
                                {submission.student.launchPricing && ` — ${submission.student.launchPricing}${submission.student.launchPrice ? ` ($${submission.student.launchPrice})` : ""}`}
                              </span>
                            </p>
                          )}
                          {submission.student.launchEventTopic && (
                            <p className="text-sm"><span className="font-medium text-indigo-900">Content Direction: </span><span className="text-indigo-800">{submission.student.launchEventTopic}</span></p>
                          )}
                          {submission.student.approvedEventTitle && (
                            <p className="text-sm"><span className="font-medium text-emerald-800">Approved Title: </span><span className="text-emerald-700 font-medium">{submission.student.approvedEventTitle}</span></p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {submission.studentNote && (
                    <div className="mt-3 rounded-lg bg-sky-50 border border-sky-200 p-3">
                      <p className="text-xs font-semibold text-sky-800 uppercase tracking-wide mb-1">Note from Student</p>
                      <p className="text-sm text-sky-900">{submission.studentNote}</p>
                    </div>
                  )}

                  {reviewingId === submission.id ? (
                    <div className="mt-4 space-y-4 border-t border-border pt-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="feedback" className="text-sm font-medium">Feedback <span className="text-muted-foreground font-normal">(required if requesting corrections)</span></Label>
                        <Textarea
                          id="feedback"
                          placeholder="Provide feedback for the student..."
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          rows={3}
                          className="resize-none"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={() => handleReview(submission.id, true)} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          Approve &amp; Send to Head Coach
                        </Button>
                        <Button onClick={() => handleReview(submission.id, false)} variant="destructive" className="gap-1.5">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                          </svg>
                          Request Corrections
                        </Button>
                        <Button onClick={() => { setReviewingId(null); setFeedback("") }} variant="outline">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {(submission.status === "PENDING" || submission.status === "COACH_REVIEW") && (
                        <Button onClick={() => setReviewingId(submission.id)} className="mt-4" size="sm">
                          Review Submission
                        </Button>
                      )}
                      {submission.coachFeedback && (
                        <div className="mt-4 rounded-lg bg-muted p-3 border border-border">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Your Feedback</p>
                          <p className="text-sm text-foreground">{submission.coachFeedback}</p>
                        </div>
                      )}
                      {submission.headCoachFeedback && (
                        <div className="mt-3 rounded-lg bg-violet-50 border border-violet-200 p-3">
                          <p className="text-xs font-semibold text-violet-800 uppercase tracking-wide mb-1">Head Coach Notes</p>
                          <p className="text-sm text-violet-900">{submission.headCoachFeedback}</p>
                        </div>
                      )}
                    </>
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

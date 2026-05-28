"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface Submission {
  id: string
  workbookTitle: string
  workbookUrl: string
  weekNumber: number
  status: string
  studentNote?: string | null
  coachFeedback?: string | null
  student: { name: string; email: string; studentClass?: string | null; launchStrategy?: string | null; launchPricing?: string | null; launchPrice?: string | null; launchEventTopic?: string | null; approvedEventTitle?: string | null; niche?: string | null }
  coach: { name: string; email: string }
  submittedAt: string
  reviewedAt?: string | null
}

interface DashboardStats {
  totalSubmissions: number
  pendingByCoach: Record<string, number>
  approvalRate: number
  pendingFinalReview: number
}

interface LaunchInfoStudent {
  id: string
  name: string
  email: string
  studentClass: string | null
  launchStrategy: string | null
  launchPricing: string | null
  launchPrice: string | null
  launchEventTopic: string | null
  approvedEventTitle: string | null
  niche: string | null
  launchInfoStatus: string | null
  updatedAt: string
}

interface PendingUser {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

interface StaffMember {
  id: string
  name: string
  email: string
  role: string
  active: boolean
  createdAt: string
}

interface AiQueueItem {
  id: string
  weekNumber: number
  workbookTitle: string
  workbookUrl: string
  aiReviewStatus: string
  aiNicheAlignment: string | null
  aiFeedback: Record<string, unknown> | null
  aiTriageVerdict: string | null
  aiReviewedAt: string | null
  reviewModelVersion: string | null
  status: string
  submittedAt: string
  student: { id: string; name: string; studentClass: string | null }
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

const getRoleLabel = (role: string) => {
  switch (role) {
    case "COACH": return "Coach"
    case "PROGRAM_MANAGER": return "Program Manager"
    default: return role
  }
}

function StatCard({ label, value, valueClass }: { label: string; value: string | number; valueClass?: string }) {
  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-3xl font-bold ${valueClass ?? "text-foreground"}`}>{value}</p>
    </div>
  )
}

type Tab = "reviews" | "ai-queue" | "launch-info" | "approvals" | "staff"

export default function HeadCoachDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState("")
  const [activeTab, setActiveTab] = useState<Tab>("reviews")
  const [processingApproval, setProcessingApproval] = useState<string | null>(null)
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null)
  const [editingLinkUrl, setEditingLinkUrl] = useState("")
  const [savingLinkId, setSavingLinkId] = useState<string | null>(null)
  const [expandedLaunchId, setExpandedLaunchId] = useState<string | null>(null)
  const [launchInfoStudents, setLaunchInfoStudents] = useState<LaunchInfoStudent[]>([])
  const [reviewingLaunchId, setReviewingLaunchId] = useState<string | null>(null)
  const [launchFeedback, setLaunchFeedback] = useState("")
  const [processingLaunchReview, setProcessingLaunchReview] = useState<string | null>(null)

  // AI Review Queue state
  const [aiQueue, setAiQueue] = useState<AiQueueItem[]>([])
  const [aiQueueLoading, setAiQueueLoading] = useState(false)
  const [expandedQueueId, setExpandedQueueId] = useState<string | null>(null)
  const [editingQueueId, setEditingQueueId] = useState<string | null>(null)
  const [editedFields, setEditedFields] = useState<Record<string, string>>({})
  const [overrideId, setOverrideId] = useState<string | null>(null)
  const [overrideVerdict, setOverrideVerdict] = useState<"proceed" | "hold">("proceed")
  const [overrideReason, setOverrideReason] = useState("")
  const [processingQueueId, setProcessingQueueId] = useState<string | null>(null)
  const [triggerSubmissionId, setTriggerSubmissionId] = useState("")
  const [triggerLoading, setTriggerLoading] = useState(false)
  const [triggerResult, setTriggerResult] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
    fetchAiQueue()
  }, [])

  const fetchAiQueue = async () => {
    setAiQueueLoading(true)
    try {
      const res = await fetch("/api/admin/ai-queue")
      if (res.ok) {
        const data = await res.json()
        setAiQueue(data.items || [])
      }
    } catch (error) {
      console.error("Error fetching AI queue:", error)
    } finally {
      setAiQueueLoading(false)
    }
  }

  const fetchData = async () => {
    try {
      const [submissionsRes, statsRes, pendingRes, staffRes, launchInfoRes] = await Promise.all([
        fetch("/api/submissions"),
        fetch("/api/stats"),
        fetch("/api/users/pending"),
        fetch("/api/users/staff"),
        fetch("/api/users/launch-info-reviews"),
      ])
      const [submissionsData, statsData, pendingData, staffData, launchInfoData] = await Promise.all([
        submissionsRes.json(), statsRes.json(), pendingRes.json(), staffRes.json(), launchInfoRes.json(),
      ])
      setSubmissions(submissionsData.submissions || [])
      setStats(statsData)
      setPendingUsers(pendingData.users || [])
      setStaff(staffData.staff || [])
      setLaunchInfoStudents(launchInfoData.students || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLaunchInfoReview = async (studentId: string, action: "approve" | "revise") => {
    if (action === "revise" && !launchFeedback.trim()) {
      alert("Please provide feedback when requesting revisions")
      return
    }
    setProcessingLaunchReview(studentId)
    try {
      const res = await fetch(`/api/users/${studentId}/review-launch-info`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, feedback: launchFeedback.trim() || undefined }),
      })
      if (res.ok) {
        setReviewingLaunchId(null)
        setLaunchFeedback("")
        setLaunchInfoStudents((prev) => prev.filter((s) => s.id !== studentId))
      } else {
        const data = await res.json()
        alert(data.error || "Failed to submit review")
      }
    } catch (error) {
      console.error("Error reviewing launch info:", error)
      alert("An error occurred")
    } finally {
      setProcessingLaunchReview(null)
    }
  }

  const handleUpdateLink = async (submissionId: string) => {
    if (!editingLinkUrl.trim()) return
    setSavingLinkId(submissionId)
    try {
      const res = await fetch(`/api/submissions/${submissionId}/update-link`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workbookUrl: editingLinkUrl.trim() }),
      })
      if (res.ok) {
        setSubmissions((prev) =>
          prev.map((s) => s.id === submissionId ? { ...s, workbookUrl: editingLinkUrl.trim() } : s)
        )
        setEditingLinkId(null)
        setEditingLinkUrl("")
      } else {
        const data = await res.json()
        alert(data.error || "Failed to update link")
      }
    } catch {
      alert("Network error")
    } finally {
      setSavingLinkId(null)
    }
  }

  const handleReview = async (submissionId: string, action: "approve" | "sendToCoach" | "sendToStudent") => {
    if (action !== "approve" && !feedback.trim()) {
      alert("Please provide feedback when sending back")
      return
    }
    try {
      const response = await fetch(`/api/submissions/${submissionId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approved: action === "approve",
          feedback: action === "approve" ? undefined : feedback,
          sendToStudent: action === "sendToStudent",
        }),
      })
      if (response.ok) {
        setReviewingId(null)
        setFeedback("")
        fetchData()
      } else {
        alert("Failed to submit review")
      }
    } catch (error) {
      console.error("Error submitting review:", error)
      alert("An error occurred")
    }
  }

  const handleApproveUser = async (userId: string) => {
    setProcessingApproval(userId)
    try {
      const res = await fetch(`/api/users/${userId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: true }),
      })
      if (res.ok) {
        fetchData()
      } else {
        const data = await res.json()
        alert(`Failed to approve user: ${data.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Error approving user:", error)
      alert("An error occurred")
    } finally {
      setProcessingApproval(null)
    }
  }

  const handleRejectUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to reject ${userName}? Their account will be deleted.`)) return
    setProcessingApproval(userId)
    try {
      const res = await fetch(`/api/users/${userId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: false }),
      })
      if (res.ok) {
        fetchData()
      } else {
        const data = await res.json()
        alert(`Failed to reject user: ${data.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Error rejecting user:", error)
      alert("An error occurred")
    } finally {
      setProcessingApproval(null)
    }
  }

  const toggleStaffActive = async (staffId: string) => {
    try {
      const res = await fetch(`/api/users/${staffId}/toggle-active`, { method: "PATCH" })
      if (res.ok) {
        fetchData()
      } else {
        const data = await res.json()
        alert(`Failed to update staff status: ${data.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Error toggling staff status:", error)
      alert("An error occurred")
    }
  }

  const handleDeleteStaff = async (staffId: string, staffName: string, role: string) => {
    const warning = role === "COACH"
      ? `Are you sure you want to delete ${staffName}? This will also remove all their assigned submissions and unassign their students.`
      : `Are you sure you want to delete ${staffName}?`
    if (!confirm(warning)) return
    try {
      const res = await fetch(`/api/users/${staffId}/delete`, { method: "DELETE" })
      if (res.ok) {
        fetchData()
      } else {
        const data = await res.json()
        alert(`Failed to delete: ${data.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Error deleting staff:", error)
      alert("An error occurred")
    }
  }

  const handleQueueAction = async (
    submissionId: string,
    action: "approve" | "edit_approve" | "override"
  ) => {
    setProcessingQueueId(submissionId)
    try {
      let body: Record<string, unknown> = { action }
      if (action === "edit_approve") {
        body.editedFields = Object.entries(editedFields).map(([fieldName, humanValue]) => ({
          fieldName,
          humanValue,
        }))
      }
      if (action === "override") {
        body.finalVerdict = overrideVerdict
        body.overrideReason = overrideReason
      }
      const res = await fetch(`/api/admin/ai-queue/${submissionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setAiQueue((prev) => prev.filter((item) => item.id !== submissionId))
        setEditingQueueId(null)
        setEditedFields({})
        setOverrideId(null)
        setOverrideReason("")
        setExpandedQueueId(null)
      } else {
        const data = await res.json()
        alert(data.error || "Action failed")
      }
    } catch (error) {
      console.error("Queue action error:", error)
      alert("An error occurred")
    } finally {
      setProcessingQueueId(null)
    }
  }

  const handleTriggerReview = async () => {
    if (!triggerSubmissionId.trim()) return
    setTriggerLoading(true)
    setTriggerResult(null)
    try {
      const res = await fetch("/api/admin/ai-queue/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: triggerSubmissionId.trim() }),
      })
      const text = await res.text()
      let data: Record<string, unknown> = {}
      try { data = JSON.parse(text) } catch { /* non-JSON response, e.g. Vercel timeout page */ }
      if (res.ok) {
        setTriggerResult(
          `Done — verdict: ${data.aiTriageVerdict ?? "unknown"} · outcome: ${data.outcome ?? "?"} · tokens: ${data.tokenUsage ? `${(data.tokenUsage as {inputTokens:number}).inputTokens}in / ${(data.tokenUsage as {outputTokens:number}).outputTokens}out` : "n/a"}`
        )
        setTriggerSubmissionId("")
        fetchAiQueue()
      } else {
        setTriggerResult(`Error ${res.status}: ${(data.error as string) || res.statusText || "unknown error"}`)
      }
    } catch (error) {
      console.error("Trigger error:", error)
      setTriggerResult(`Request failed: ${error instanceof Error ? error.message : "unknown"}`)
    } finally {
      setTriggerLoading(false)
    }
  }

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: "reviews", label: "Final Reviews", badge: stats?.pendingFinalReview },
    { key: "ai-queue", label: "AI Review Queue", badge: aiQueue.length },
    { key: "launch-info", label: "Launch Info", badge: launchInfoStudents.length },
    { key: "approvals", label: "User Approvals", badge: pendingUsers.length },
    { key: "staff", label: "Manage Staff" },
  ]

  const CLASS_LABELS: Record<string, string> = {
    PRE_CLARITY: "Pre-Clarity",
    STRATEGY_CLASS: "Strategy Class",
    FUNNEL_CLASS: "Funnel Class",
    LAUNCH_CLASS: "Launch Class",
  }

  const eligibleForTrigger = submissions.filter((s) => s.status === "HEAD_COACH_REVIEW")
  const alreadyQueued = new Set(aiQueue.map((q) => q.id))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Head Coach Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Oversight and final approval of student submissions</p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold ${
                activeTab === tab.key ? "bg-primary text-white" : "bg-muted-foreground/20 text-muted-foreground"
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Reviews tab */}
      {activeTab === "reviews" && (
        <div className="space-y-6">
          {/* Stats */}
          {!loading && stats && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="Total Submissions" value={stats.totalSubmissions} />
              <StatCard label="Pending Final Review" value={stats.pendingFinalReview} valueClass="text-violet-600" />
              <StatCard label="Approval Rate" value={`${stats.approvalRate?.toFixed(1) ?? 0}%`} valueClass="text-emerald-600" />
            </div>
          )}

          {/* Pending by Coach */}
          {stats?.pendingByCoach && Object.keys(stats.pendingByCoach).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Pending Reviews by Coach</CardTitle>
                <CardDescription className="text-sm">Submissions awaiting coach review</CardDescription>
              </CardHeader>
              <CardContent className="space-y-0">
                {Object.entries(stats.pendingByCoach).map(([coach, count]) => (
                  <div key={coach} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                    <span className="text-sm font-medium text-foreground">{coach}</span>
                    <span className="inline-flex items-center rounded-full bg-blue-100 border border-blue-200 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      {count} pending
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Final Review Queue */}
          <div>
            <h2 className="text-base font-semibold text-foreground mb-1">Final Review Queue</h2>
            <p className="text-sm text-muted-foreground mb-4">Coach-approved submissions awaiting your final approval</p>

            {loading ? (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-border p-5 animate-pulse">
                    <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2 mb-4" />
                    <div className="h-8 bg-muted rounded w-40" />
                  </div>
                ))}
              </div>
            ) : submissions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-white py-12 text-center">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 mb-3">
                  <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-foreground">All clear!</p>
                <p className="text-sm text-muted-foreground mt-1">No submissions awaiting final review</p>
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
                              {submission.student.name} &middot; Coach: {submission.coach.name} &middot; {getWeekLabel(submission.weekNumber)}
                            </p>
                          </div>
                          <span className={`shrink-0 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${sc.className}`}>
                            {sc.label}
                          </span>
                        </div>

                        <div className="mt-3">
                          {editingLinkId === submission.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="url"
                                value={editingLinkUrl}
                                onChange={(e) => setEditingLinkUrl(e.target.value)}
                                className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                placeholder="Paste new Google Doc/Slides URL"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={() => handleUpdateLink(submission.id)}
                                disabled={savingLinkId === submission.id || !editingLinkUrl.trim()}
                                className="shrink-0"
                              >
                                {savingLinkId === submission.id ? "Saving..." : "Save"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setEditingLinkId(null); setEditingLinkUrl("") }}
                                className="shrink-0"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-sm">
                              <svg className="h-3.5 w-3.5 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                              </svg>
                              <a href={submission.workbookUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 truncate transition-colors">
                                {submission.workbookUrl}
                              </a>
                              <button
                                onClick={() => { setEditingLinkId(submission.id); setEditingLinkUrl(submission.workbookUrl) }}
                                className="shrink-0 ml-1 text-muted-foreground hover:text-foreground transition-colors"
                                title="Edit link"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>

                        <p className="mt-2 text-xs text-muted-foreground">
                          Submitted {new Date(submission.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {submission.reviewedAt && ` · Coach reviewed ${new Date(submission.reviewedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
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

                        {submission.coachFeedback && (
                          <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 p-3">
                            <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-1">Coach Notes</p>
                            <p className="text-sm text-blue-900">{submission.coachFeedback}</p>
                          </div>
                        )}

                        {reviewingId === submission.id ? (
                          <div className="mt-4 space-y-4 border-t border-border pt-4">
                            <div className="space-y-1.5">
                              <Label htmlFor="feedback" className="text-sm font-medium">Feedback Notes</Label>
                              <Textarea
                                id="feedback"
                                placeholder="Provide feedback if sending back..."
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                rows={3}
                                className="resize-none"
                              />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button onClick={() => handleReview(submission.id, "approve")} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                                Final Approval
                              </Button>
                              <Button onClick={() => handleReview(submission.id, "sendToCoach")} variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50 gap-1.5">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                                </svg>
                                Send Back to Coach
                              </Button>
                              <Button onClick={() => handleReview(submission.id, "sendToStudent")} variant="destructive" className="gap-1.5">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                                </svg>
                                Send Back to Student
                              </Button>
                              <Button onClick={() => { setReviewingId(null); setFeedback("") }} variant="outline">Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <Button onClick={() => setReviewingId(submission.id)} className="mt-4" size="sm">
                            Review for Final Approval
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Review Queue tab */}
      {activeTab === "ai-queue" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-foreground">AI Review Queue</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              AI verdicts awaiting your review. Nothing reaches the student until you act.
            </p>
          </div>

          {/* Manual trigger */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Run AI Review</CardTitle>
              <CardDescription className="text-sm">
                {eligibleForTrigger.length === 0
                  ? "No submissions awaiting AI review"
                  : `${eligibleForTrigger.length} submission${eligibleForTrigger.length === 1 ? "" : "s"} awaiting AI review`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <select
                  value={triggerSubmissionId}
                  onChange={(e) => setTriggerSubmissionId(e.target.value)}
                  disabled={eligibleForTrigger.length === 0}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                >
                  <option value="">
                    {eligibleForTrigger.length === 0 ? "No submissions awaiting review" : "Select a submission..."}
                  </option>
                  {eligibleForTrigger.map((s) => (
                    <option key={s.id} value={s.id}>
                      Week {s.weekNumber} — {s.student.name} — {s.workbookTitle}{alreadyQueued.has(s.id) ? " (re-run)" : ""}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={handleTriggerReview}
                  disabled={triggerLoading || !triggerSubmissionId.trim()}
                  size="sm"
                  className="shrink-0"
                >
                  {triggerLoading ? "Running..." : "Run Review"}
                </Button>
              </div>
              {triggerResult && (
                <p className="mt-2 text-xs font-mono text-muted-foreground bg-muted rounded px-2 py-1.5">
                  {triggerResult}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Queue items */}
          {aiQueueLoading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-border p-5 animate-pulse">
                  <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2 mb-4" />
                  <div className="h-8 bg-muted rounded w-40" />
                </div>
              ))}
            </div>
          ) : aiQueue.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-white py-12 text-center">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 mb-3">
                <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-sm font-medium text-foreground">Queue is clear</p>
              <p className="text-sm text-muted-foreground mt-1">No AI verdicts pending your review</p>
            </div>
          ) : (
            <div className="space-y-4">
              {aiQueue.map((item) => {
                const fb = item.aiFeedback as Record<string, unknown> | null
                const triageVerdict = item.aiTriageVerdict ?? "unknown"
                const triageReason = (fb?.triage_reason as string) ?? ""
                const isExpanded = expandedQueueId === item.id
                const isEditing = editingQueueId === item.id
                const isOverriding = overrideId === item.id
                const isProcessing = processingQueueId === item.id

                const verdictClass = triageVerdict === "proceed"
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                  : "bg-amber-100 text-amber-700 border-amber-200"

                const studentFacingFields: { key: string; label: string }[] = [
                  { key: "launch_alignment_explanation", label: "Launch alignment" },
                  { key: "template_notes", label: "Structure check" },
                  { key: "cta_notes", label: "CTA" },
                  { key: "human_voice_notes", label: "Voice & authenticity" },
                  { key: "week_specific_findings", label: "Week-specific findings" },
                ]

                return (
                  <div key={item.id} className="bg-white rounded-xl border border-border shadow-sm">
                    <div className="p-5">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground truncate">{item.workbookTitle}</h3>
                            <span className={`shrink-0 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${verdictClass}`}>
                              {triageVerdict === "proceed" ? "PROCEED" : "HOLD"}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {item.student.name} · Week {item.weekNumber}
                            {item.reviewModelVersion && <span className="text-xs ml-1 opacity-60">({item.reviewModelVersion})</span>}
                          </p>
                          {triageReason && (
                            <p className="mt-1.5 text-xs text-muted-foreground italic">{triageReason}</p>
                          )}
                          {!triageReason && (fb?.hold_reason as string | undefined) && (
                            <p className="mt-1.5 text-xs text-amber-700 font-medium">
                              Held for input: {fb?.hold_reason as string}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Doc link */}
                      <div className="mt-2 flex items-center gap-1.5 text-sm">
                        <svg className="h-3.5 w-3.5 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                        </svg>
                        <a href={item.workbookUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 truncate transition-colors text-xs">
                          {item.workbookUrl}
                        </a>
                      </div>

                      {item.aiReviewedAt && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Reviewed {new Date(item.aiReviewedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </p>
                      )}

                      {/* Expand toggle */}
                      <button
                        onClick={() => {
                          setExpandedQueueId(isExpanded ? null : item.id)
                          setEditingQueueId(null)
                          setEditedFields({})
                          setOverrideId(null)
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 hover:text-indigo-900 transition-colors"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {isExpanded ? "Hide full feedback" : "View full feedback"}
                        <svg className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Expanded feedback panel */}
                      {isExpanded && fb && (
                        <div className="mt-4 border-t border-border pt-4 space-y-4">
                          {/* Hold-for-input notice — shown when no real feedback fields exist */}
                          {(fb.hold_reason as string | undefined) && (
                            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">Review not run</p>
                              <p className="text-sm text-amber-700">{fb.hold_reason as string}</p>
                            </div>
                          )}
                          {/* persuasive_strength flags */}
                          {fb.persuasive_strength != null && typeof fb.persuasive_strength === "object" && (
                            <div className="flex flex-wrap gap-2">
                              {(["specific_pain", "concrete_promise", "reason_to_act_now", "trust_through_specificity"] as const).map((key) => {
                                const ps = fb.persuasive_strength as Record<string, string>
                                const val = ps[key]
                                if (!val) return null
                                const isPass = val === "pass"
                                return (
                                  <span key={key} className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${isPass ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                                    {key.replace(/_/g, " ")}: {isPass ? "✓" : "✗"}
                                  </span>
                                )
                              })}
                            </div>
                          )}

                          {/* Student-facing prose fields (editable when in edit mode) */}
                          {studentFacingFields.map(({ key, label }) => {
                            let rawValue: string
                            if (key === "persuasive_strength.notes") {
                              rawValue = ((fb.persuasive_strength as Record<string, string>)?.notes) ?? ""
                            } else {
                              rawValue = (fb[key] as string) ?? ""
                            }
                            if (!rawValue) return null
                            const currentValue = isEditing ? (editedFields[key] ?? rawValue) : rawValue
                            return (
                              <div key={key}>
                                <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">{label}</p>
                                {isEditing ? (
                                  <Textarea
                                    value={currentValue}
                                    onChange={(e) => setEditedFields((prev) => ({ ...prev, [key]: e.target.value }))}
                                    rows={5}
                                    className="text-sm resize-y font-mono"
                                  />
                                ) : (
                                  <p className="text-sm text-foreground whitespace-pre-wrap">{currentValue}</p>
                                )}
                              </div>
                            )
                          })}

                          {/* top_3_fixes */}
                          {Array.isArray(fb.top_3_fixes) && fb.top_3_fixes.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">Top 3 Fixes</p>
                              {isEditing ? (
                                <Textarea
                                  value={editedFields["top_3_fixes"] ?? (fb.top_3_fixes as string[]).join("\n---\n")}
                                  onChange={(e) => setEditedFields((prev) => ({ ...prev, top_3_fixes: e.target.value }))}
                                  rows={6}
                                  className="text-sm resize-y font-mono"
                                />
                              ) : (
                                <ol className="list-decimal list-inside space-y-2">
                                  {(fb.top_3_fixes as string[]).map((fix, i) => (
                                    <li key={i} className="text-sm text-foreground">{fix}</li>
                                  ))}
                                </ol>
                              )}
                            </div>
                          )}

                          {/* specific_rewrites */}
                          {Array.isArray(fb.specific_rewrites) && fb.specific_rewrites.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">Suggested Rewrites</p>
                              {isEditing ? (
                                <Textarea
                                  value={editedFields["specific_rewrites"] ?? (fb.specific_rewrites as string[]).join("\n---\n")}
                                  onChange={(e) => setEditedFields((prev) => ({ ...prev, specific_rewrites: e.target.value }))}
                                  rows={6}
                                  className="text-sm resize-y font-mono"
                                />
                              ) : (
                                <ul className="space-y-2">
                                  {(fb.specific_rewrites as string[]).map((r, i) => (
                                    <li key={i} className="text-sm text-foreground">• {r}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Override form */}
                      {isOverriding && (
                        <div className="mt-4 border-t border-border pt-4 space-y-3">
                          <p className="text-sm font-medium">Override AI Verdict</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setOverrideVerdict("proceed")}
                              className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${overrideVerdict === "proceed" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-foreground border-border hover:bg-muted"}`}
                            >
                              Override to Proceed
                            </button>
                            <button
                              onClick={() => setOverrideVerdict("hold")}
                              className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${overrideVerdict === "hold" ? "bg-red-600 text-white border-red-600" : "bg-white text-foreground border-border hover:bg-muted"}`}
                            >
                              Override to Hold
                            </button>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm font-medium">Reason for override (required)</Label>
                            <Textarea
                              placeholder="Why are you overriding the AI verdict?"
                              value={overrideReason}
                              onChange={(e) => setOverrideReason(e.target.value)}
                              rows={3}
                              className="resize-none"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleQueueAction(item.id, "override")}
                              disabled={isProcessing || !overrideReason.trim()}
                              size="sm"
                              variant="destructive"
                            >
                              {isProcessing ? "Saving..." : "Confirm Override"}
                            </Button>
                            <Button onClick={() => { setOverrideId(null); setOverrideReason("") }} variant="outline" size="sm">Cancel</Button>
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      {!isOverriding && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                onClick={() => handleQueueAction(item.id, "edit_approve")}
                                disabled={isProcessing}
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                                {isProcessing ? "Saving..." : "Save Edits + Approve"}
                              </Button>
                              <Button
                                onClick={() => { setEditingQueueId(null); setEditedFields({}) }}
                                variant="outline"
                                size="sm"
                              >
                                Cancel Edits
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                onClick={() => handleQueueAction(item.id, "approve")}
                                disabled={isProcessing}
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                                {isProcessing ? "Approving..." : "Approve"}
                              </Button>
                              <Button
                                onClick={() => {
                                  setEditingQueueId(item.id)
                                  setEditedFields({})
                                  setExpandedQueueId(item.id)
                                }}
                                disabled={isProcessing}
                                variant="outline"
                                size="sm"
                              >
                                Edit + Approve
                              </Button>
                              <Button
                                onClick={() => {
                                  setOverrideId(item.id)
                                  setOverrideVerdict(triageVerdict === "proceed" ? "hold" : "proceed")
                                  setOverrideReason("")
                                }}
                                disabled={isProcessing}
                                variant="outline"
                                size="sm"
                                className="border-orange-300 text-orange-700 hover:bg-orange-50"
                              >
                                Override Verdict
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Launch Info tab */}
      {activeTab === "launch-info" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Launch Info Reviews</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Review and approve launch information submitted by students</p>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-border p-5 animate-pulse">
                  <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2 mb-4" />
                  <div className="h-8 bg-muted rounded w-40" />
                </div>
              ))}
            </div>
          ) : launchInfoStudents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-white py-12 text-center">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 mb-3">
                <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-sm font-medium text-foreground">No pending reviews</p>
              <p className="text-sm text-muted-foreground mt-1">All launch info submissions have been reviewed</p>
            </div>
          ) : (
            launchInfoStudents.map((student) => (
              <div key={student.id} className="bg-white rounded-xl border border-border shadow-sm">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground">{student.name}</h3>
                      <p className="text-sm text-muted-foreground">{student.email}</p>
                      {student.studentClass && (
                        <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 mt-1">
                          {CLASS_LABELS[student.studentClass] ?? student.studentClass}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                      Pending Review
                    </span>
                  </div>

                  <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3 space-y-1.5 mt-3">
                    <p className="text-xs font-semibold text-indigo-800 uppercase tracking-wide mb-1">Launch Information</p>
                    {student.niche && (
                      <p className="text-sm"><span className="font-medium text-indigo-900">Niche: </span><span className="text-indigo-800">{student.niche}</span></p>
                    )}
                    {student.launchStrategy && (
                      <p className="text-sm">
                        <span className="font-medium text-indigo-900">Strategy: </span>
                        <span className="text-indigo-800">
                          {student.launchStrategy}
                          {student.launchPricing && ` — ${student.launchPricing}${student.launchPrice ? ` ($${student.launchPrice})` : ""}`}
                        </span>
                      </p>
                    )}
                    {student.launchEventTopic && (
                      <p className="text-sm"><span className="font-medium text-indigo-900">Content Direction: </span><span className="text-indigo-800">{student.launchEventTopic}</span></p>
                    )}
                  </div>

                  {reviewingLaunchId === student.id ? (
                    <div className="mt-4 space-y-3 border-t border-border pt-4">
                      <div className="space-y-1.5">
                        <Label htmlFor={`launch-feedback-${student.id}`} className="text-sm font-medium">Revision Feedback</Label>
                        <Textarea
                          id={`launch-feedback-${student.id}`}
                          placeholder="Explain what needs to be changed..."
                          value={launchFeedback}
                          onChange={(e) => setLaunchFeedback(e.target.value)}
                          rows={3}
                          className="resize-none"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => handleLaunchInfoReview(student.id, "revise")}
                          disabled={processingLaunchReview === student.id}
                          variant="destructive"
                          size="sm"
                        >
                          {processingLaunchReview === student.id ? "Submitting..." : "Request Revision"}
                        </Button>
                        <Button
                          onClick={() => { setReviewingLaunchId(null); setLaunchFeedback("") }}
                          variant="outline"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => handleLaunchInfoReview(student.id, "approve")}
                        disabled={processingLaunchReview === student.id}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        {processingLaunchReview === student.id ? "Approving..." : "Approve"}
                      </Button>
                      <Button
                        onClick={() => { setReviewingLaunchId(student.id); setLaunchFeedback("") }}
                        size="sm"
                        variant="outline"
                        className="border-orange-300 text-orange-700 hover:bg-orange-50 gap-1.5"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                        </svg>
                        Request Revision
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Approvals tab */}
      {activeTab === "approvals" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Pending User Approvals</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Coaches and Program Managers awaiting approval</p>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-white py-12 text-center">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 mb-3">
                <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-sm font-medium text-foreground">No pending approvals</p>
            </div>
          ) : (
            pendingUsers.map((user) => (
              <div key={user.id} className="bg-white rounded-xl border border-border shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-foreground">{user.name}</h3>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{getRoleLabel(user.role)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Registered {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <span className="shrink-0 inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                    Pending
                  </span>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={() => handleApproveUser(user.id)}
                    disabled={processingApproval === user.id}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    size="sm"
                  >
                    {processingApproval === user.id ? "Processing..." : "Approve"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRejectUser(user.id, user.name)}
                    disabled={processingApproval === user.id}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Staff tab */}
      {activeTab === "staff" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Manage Staff</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Manage coaches and program managers</p>
          </div>

          {staff.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-white py-12 text-center">
              <p className="text-sm text-muted-foreground">No staff members found</p>
            </div>
          ) : (
            staff.map((member) => (
              <div key={member.id} className="bg-white rounded-xl border border-border shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{member.name}</h3>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                        member.active
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                          : "bg-red-100 text-red-700 border-red-200"
                      }`}>
                        {member.active ? "Active" : "Deactivated"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{member.email}</p>
                    <p className="text-sm text-muted-foreground">{getRoleLabel(member.role)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Joined {new Date(member.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant={member.active ? "outline" : "default"}
                      size="sm"
                      onClick={() => toggleStaffActive(member.id)}
                      className={member.active ? "border-red-300 text-red-700 hover:bg-red-50" : ""}
                    >
                      {member.active ? "Deactivate" : "Reactivate"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteStaff(member.id, member.name, member.role)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

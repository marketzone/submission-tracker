"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FeedbackRenderer, isAiReview } from "@/components/FeedbackRenderer"

interface Submission {
  id: string
  studentId: string
  workbookTitle: string
  workbookUrl: string
  weekNumber: number
  status: string
  submittedAt: string
  reviewedAt?: string
  headReviewedAt?: string
  student: {
    name: string
    email: string
    active: boolean
  }
  coach: {
    name: string
  }
  headCoach?: {
    name: string
  }
  coachFeedback?: string
  headCoachFeedback?: string
}

interface Student {
  id: string
  name: string
  email: string
  active: boolean
  pendingDeactivation?: boolean
  studentClass?: string | null
  coachId?: string | null
  launchStrategy?: string | null
  launchPricing?: string | null
  launchPrice?: string | null
  launchEventTopic?: string | null
  approvedEventTitle?: string | null
  niche?: string | null
  coach?: {
    id: string
    name: string
  }
}

interface PendingStudent {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  coach?: {
    name: string
  }
}

interface Coach {
  id: string
  name: string
  email: string
}

export default function ProgramManagerPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [pendingStudents, setPendingStudents] = useState<PendingStudent[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"submissions" | "students" | "pending" | "coaches" | "deactivations">("submissions")
  const [processingDeactivation, setProcessingDeactivation] = useState<string | null>(null)
  const [selectedClasses, setSelectedClasses] = useState<Record<string, string>>({})
  const [processingApproval, setProcessingApproval] = useState<string | null>(null)
  const [expandedCoach, setExpandedCoach] = useState<string | null>(null)
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)
  const [renamingCoachId, setRenamingCoachId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [renameSaving, setRenameSaving] = useState(false)
  const [reassigningSubmissionId, setReassigningSubmissionId] = useState<string | null>(null)
  const [reassignCoachValue, setReassignCoachValue] = useState("")
  const [reassignSaving, setReassignSaving] = useState(false)
  const [editingLaunchId, setEditingLaunchId] = useState<string | null>(null)
  const [launchEditValues, setLaunchEditValues] = useState<{ niche: string; launchStrategy: string; launchPricing: string; launchPrice: string; launchEventTopic: string; approvedEventTitle: string }>({ niche: "", launchStrategy: "", launchPricing: "", launchPrice: "", launchEventTopic: "", approvedEventTitle: "" })
  const [launchSaving, setLaunchSaving] = useState(false)

  // Filters for submissions
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [weekFilter, setWeekFilter] = useState<string>("all")
  const [studentSearch, setStudentSearch] = useState("")

  // Filter for students tab
  const [studentNameSearch, setStudentNameSearch] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch all submissions
      const submissionsRes = await fetch("/api/submissions")
      const submissionsData = await submissionsRes.json()
      setSubmissions(submissionsData.submissions || [])

      // Fetch all students
      const studentsRes = await fetch("/api/users/students")
      const studentsData = await studentsRes.json()
      setStudents(studentsData.students || [])

      // Fetch pending students
      const pendingRes = await fetch("/api/users/pending")
      const pendingData = await pendingRes.json()
      setPendingStudents(pendingData.users || [])

      // Fetch all coaches
      const coachesRes = await fetch("/api/users/coaches")
      const coachesData = await coachesRes.json()
      setCoaches(coachesData.coaches || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleStudentActive = async (studentId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/users/${studentId}/toggle-active`, {
        method: "PATCH",
      })

      if (res.ok) {
        // Refresh data
        fetchData()
      } else {
        alert("Failed to update student status")
      }
    } catch (error) {
      console.error("Error toggling student status:", error)
      alert("An error occurred")
    }
  }

  const handleApproveStudent = async (studentId: string) => {
    const studentClass = selectedClasses[studentId]
    if (!studentClass) {
      alert("Please select a class before approving")
      return
    }

    setProcessingApproval(studentId)
    try {
      const res = await fetch(`/api/users/${studentId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approved: true,
          studentClass,
        }),
      })

      if (res.ok) {
        alert("Student approved successfully!")
        fetchData()
        setSelectedClasses((prev) => {
          const updated = { ...prev }
          delete updated[studentId]
          return updated
        })
      } else {
        const data = await res.json()
        alert(`Failed to approve student: ${data.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Error approving student:", error)
      alert("An error occurred")
    } finally {
      setProcessingApproval(null)
    }
  }

  const handleRejectStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to reject ${studentName}? Their account will be deleted.`)) {
      return
    }

    setProcessingApproval(studentId)
    try {
      const res = await fetch(`/api/users/${studentId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approved: false,
        }),
      })

      if (res.ok) {
        alert("Student rejected and account deleted")
        fetchData()
      } else {
        const data = await res.json()
        alert(`Failed to reject student: ${data.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Error rejecting student:", error)
      alert("An error occurred")
    } finally {
      setProcessingApproval(null)
    }
  }

  const updateStudentClass = async (studentId: string, newClass: string | null) => {
    try {
      const res = await fetch(`/api/users/${studentId}/update-class`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentClass: newClass }),
      })

      if (res.ok) {
        alert("Student class updated successfully!")
        fetchData()
      } else {
        const data = await res.json()
        alert(`Failed to update class: ${data.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Error updating student class:", error)
      alert("An error occurred")
    }
  }

  const handleRenameCoach = async (coachId: string) => {
    if (!renameValue.trim()) return
    setRenameSaving(true)
    try {
      const res = await fetch(`/api/users/${coachId}/update-name`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue.trim() }),
      })
      if (res.ok) {
        setCoaches((prev) =>
          prev.map((c) => (c.id === coachId ? { ...c, name: renameValue.trim() } : c))
        )
        setRenamingCoachId(null)
        setRenameValue("")
      } else {
        const data = await res.json()
        alert(`Failed to rename: ${data.error || "Unknown error"}`)
      }
    } catch {
      alert("An error occurred while renaming.")
    } finally {
      setRenameSaving(false)
    }
  }

  const handleDeactivationDecision = async (studentId: string, approve: boolean) => {
    setProcessingDeactivation(studentId)
    const endpoint = approve ? "approve-deactivation" : "reject-deactivation"
    try {
      const res = await fetch(`/api/users/${studentId}/${endpoint}`, {
        method: "PATCH",
      })
      if (res.ok) {
        setStudents((prev: Student[]) =>
          prev.map((s: Student) =>
            s.id === studentId
              ? { ...s, pendingDeactivation: false, active: approve ? false : s.active }
              : s
          )
        )
      } else {
        const data = await res.json()
        alert(`Failed: ${data.error || "Unknown error"}`)
      }
    } catch {
      alert("An error occurred.")
    } finally {
      setProcessingDeactivation(null)
    }
  }

  const updateStudentCoach = async (studentId: string, newCoachId: string | null) => {
    try {
      const res = await fetch(`/api/users/${studentId}/update-coach`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coachId: newCoachId }),
      })

      if (res.ok) {
        alert("Student coach updated successfully!")
        fetchData()
      } else {
        const data = await res.json()
        alert(`Failed to update coach: ${data.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Error updating student coach:", error)
      alert("An error occurred")
    }
  }

  const handleReassignCoach = async (submissionId: string) => {
    if (!reassignCoachValue) return
    setReassignSaving(true)
    try {
      const res = await fetch(`/api/submissions/${submissionId}/reassign-coach`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coachId: reassignCoachValue }),
      })
      if (res.ok) {
        const data = await res.json()
        setSubmissions((prev: Submission[]) =>
          prev.map((s: Submission) =>
            s.id === submissionId
              ? { ...s, coach: { name: data.coach.name } }
              : s
          )
        )
        setReassigningSubmissionId(null)
        setReassignCoachValue("")
      } else {
        const data = await res.json()
        alert(`Failed to reassign: ${data.error || "Unknown error"}`)
      }
    } catch {
      alert("An error occurred.")
    } finally {
      setReassignSaving(false)
    }
  }

  const handleSaveLaunchInfo = async (studentId: string) => {
    setLaunchSaving(true)
    try {
      const res = await fetch(`/api/users/${studentId}/update-launch-info`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(launchEditValues),
      })
      if (res.ok) {
        const data = await res.json()
        setStudents((prev) =>
          prev.map((s) =>
            s.id === studentId
              ? { ...s, niche: data.student.niche, launchStrategy: data.student.launchStrategy, launchPricing: data.student.launchPricing, launchPrice: data.student.launchPrice, launchEventTopic: data.student.launchEventTopic, approvedEventTitle: data.student.approvedEventTitle }
              : s
          )
        )
        setEditingLaunchId(null)
      } else {
        const data = await res.json()
        alert(`Failed to save: ${data.error || "Unknown error"}`)
      }
    } catch {
      alert("An error occurred.")
    } finally {
      setLaunchSaving(false)
    }
  }

  const deleteSubmission = async (submissionId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the submission "${title}"? This cannot be undone.`)) {
      return
    }

    try {
      const res = await fetch(`/api/submissions/${submissionId}/delete`, {
        method: "DELETE",
      })

      if (res.ok) {
        alert("Submission deleted successfully!")
        fetchData()
      } else {
        const data = await res.json()
        alert(`Failed to delete submission: ${data.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Error deleting submission:", error)
      alert("An error occurred")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800"
      case "COACH_REVIEW":
        return "bg-blue-100 text-blue-800"
      case "HEAD_COACH_REVIEW":
        return "bg-purple-100 text-purple-800"
      case "APPROVED":
        return "bg-green-100 text-green-800"
      case "NEEDS_CORRECTION":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING":
        return "Pending"
      case "COACH_REVIEW":
        return "Coach Review"
      case "HEAD_COACH_REVIEW":
        return "Head Coach Review"
      case "APPROVED":
        return "Approved"
      case "NEEDS_CORRECTION":
        return "Needs Correction"
      default:
        return status
    }
  }

  const getClassLabel = (studentClass: string | null | undefined) => {
    if (!studentClass) return "No Class Assigned"
    const classNames: Record<string, string> = {
      PRE_CLARITY: "Pre-Clarity",
      STRATEGY_CLASS: "Strategy Class",
      FUNNEL_CLASS: "Funnel Class",
      LAUNCH_CLASS: "Launch Class",
    }
    return classNames[studentClass] || studentClass
  }

  const getWeekLabel = (weekNumber: number) => {
    return weekNumber === 0 ? "Pre-Clarity Week" : `Week ${weekNumber}`
  }

  // Filter submissions
  const filteredSubmissions = submissions.filter((submission) => {
    if (statusFilter !== "all" && submission.status !== statusFilter) {
      return false
    }
    if (weekFilter !== "all" && submission.weekNumber.toString() !== weekFilter) {
      return false
    }
    if (studentSearch && !submission.student.name.toLowerCase().includes(studentSearch.toLowerCase())) {
      return false
    }
    return true
  })

  // Filter students
  const filteredStudents = students.filter((student) => {
    if (studentNameSearch && !student.name.toLowerCase().includes(studentNameSearch.toLowerCase())) {
      return false
    }
    return true
  })

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">Program Manager Dashboard</h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <Button
          variant={activeTab === "submissions" ? "default" : "outline"}
          onClick={() => setActiveTab("submissions")}
        >
          All Submissions
        </Button>
        <Button
          variant={activeTab === "students" ? "default" : "outline"}
          onClick={() => setActiveTab("students")}
        >
          Manage Students
        </Button>
        <Button
          variant={activeTab === "pending" ? "default" : "outline"}
          onClick={() => setActiveTab("pending")}
        >
          Pending Approvals
          {pendingStudents.length > 0 && (
            <Badge className="ml-2 bg-red-500 text-white">
              {pendingStudents.length}
            </Badge>
          )}
        </Button>
        <Button
          variant={activeTab === "coaches" ? "default" : "outline"}
          onClick={() => setActiveTab("coaches")}
        >
          Coach Dashboards
        </Button>
        <Button
          variant={activeTab === "deactivations" ? "default" : "outline"}
          onClick={() => setActiveTab("deactivations")}
        >
          Pending Deactivations
          {students.filter((s: Student) => s.pendingDeactivation).length > 0 && (
            <Badge className="ml-2 bg-orange-500 text-white">
              {students.filter((s: Student) => s.pendingDeactivation).length}
            </Badge>
          )}
        </Button>
      </div>

      {/* Submissions Tab */}
      {activeTab === "submissions" && (
        <div>
          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="COACH_REVIEW">Coach Review</SelectItem>
                    <SelectItem value="HEAD_COACH_REVIEW">Head Coach Review</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="NEEDS_CORRECTION">Needs Correction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">Week</label>
                <Select value={weekFilter} onValueChange={setWeekFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Weeks" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Weeks</SelectItem>
                    <SelectItem value="0">Pre-Clarity Week</SelectItem>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((week) => (
                      <SelectItem key={week} value={week.toString()}>
                        Week {week}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">Student</label>
                <Input
                  type="text"
                  placeholder="Search by student name..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submissions List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              All Submissions ({filteredSubmissions.length})
            </h2>
            {filteredSubmissions.length === 0 ? (
              <p className="text-gray-500">No submissions found.</p>
            ) : (
              filteredSubmissions.map((submission) => (
                <Card key={submission.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {submission.workbookTitle} - {getWeekLabel(submission.weekNumber)}
                        </CardTitle>
                        <CardDescription>
                          Student: {submission.student.name} ({submission.student.email})
                          {!submission.student.active && (
                            <Badge className="ml-2 bg-red-500">Deactivated</Badge>
                          )}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(submission.status)}>
                        {getStatusLabel(submission.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">Coach:</span>
                        {reassigningSubmissionId === submission.id ? (
                          <>
                            <Select value={reassignCoachValue} onValueChange={setReassignCoachValue}>
                              <SelectTrigger className="h-7 w-44 text-xs">
                                <SelectValue placeholder="Select coach" />
                              </SelectTrigger>
                              <SelectContent>
                                {coaches.map((c: Coach) => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button size="sm" className="h-7 text-xs px-2" onClick={() => handleReassignCoach(submission.id)} disabled={reassignSaving || !reassignCoachValue}>
                              {reassignSaving ? "Saving…" : "Save"}
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => { setReassigningSubmissionId(null); setReassignCoachValue("") }}>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <span>{submission.coach.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto py-0 px-1 text-xs text-muted-foreground underline underline-offset-2 font-normal"
                              onClick={() => { setReassigningSubmissionId(submission.id); setReassignCoachValue("") }}
                            >
                              reassign
                            </Button>
                          </>
                        )}
                      </div>
                      {submission.headCoach && (
                        <div>
                          <span className="font-medium">Head Coach:</span>{" "}
                          {submission.headCoach.name}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Submitted:</span>{" "}
                        {new Date(submission.submittedAt).toLocaleDateString()}
                      </div>
                      {submission.reviewedAt && (
                        <div>
                          <span className="font-medium">Coach Reviewed:</span>{" "}
                          {new Date(submission.reviewedAt).toLocaleDateString()}
                        </div>
                      )}
                      {submission.headReviewedAt && (
                        <div>
                          <span className="font-medium">Head Coach Reviewed:</span>{" "}
                          {new Date(submission.headReviewedAt).toLocaleDateString()}
                        </div>
                      )}
                      {submission.coachFeedback && (
                        isAiReview(submission.coachFeedback) ? (
                          <div className="mt-3 rounded-md border border-slate-200 bg-white p-4">
                            <FeedbackRenderer text={submission.coachFeedback} />
                          </div>
                        ) : (
                          <div className="mt-3 rounded-md bg-blue-50 p-3">
                            <p className="text-sm font-medium text-blue-900 mb-1">Coach Feedback:</p>
                            <p className="text-sm text-blue-800 whitespace-pre-wrap">{submission.coachFeedback}</p>
                          </div>
                        )
                      )}
                      {submission.headCoachFeedback && (
                        <div className="mt-3 rounded-md bg-purple-50 p-3">
                          <p className="text-sm font-medium text-purple-900 mb-1">
                            Head Coach Feedback:
                          </p>
                          <p className="text-sm text-purple-800 whitespace-pre-wrap">
                            {submission.headCoachFeedback}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <a
                          href={submission.workbookUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View Workbook →
                        </a>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteSubmission(submission.id, submission.workbookTitle)}
                        >
                          Delete Submission
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Students Tab */}
      {activeTab === "students" && (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Manage Students ({filteredStudents.length})
          </h2>

          {/* Search Bar */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Search students by name..."
                  value={studentNameSearch}
                  onChange={(e) => setStudentNameSearch(e.target.value)}
                  className="max-w-md"
                />
                {studentNameSearch && (
                  <Button
                    variant="outline"
                    onClick={() => setStudentNameSearch("")}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {filteredStudents.length === 0 ? (
              <p className="text-gray-500">No students found.</p>
            ) : (
              filteredStudents.map((student) => {
                const studentSubmissions = submissions.filter(
                  (s) => s.studentId === student.id
                )
                return (
                  <Card key={student.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{student.name}</h3>
                          <p className="text-sm text-gray-600">{student.email}</p>
                          {student.coach && (
                            <p className="text-sm text-gray-500 mt-1">
                              Coach: {student.coach.name}
                            </p>
                          )}
                          <div className="mt-2">
                            {editingLaunchId === student.id ? (
                              <div className="rounded-md bg-indigo-50 border border-indigo-200 p-3 space-y-2">
                                <p className="text-xs font-semibold text-indigo-800 uppercase tracking-wide">Edit Launch Information</p>
                                <div>
                                  <label className="text-xs font-medium text-indigo-900 block mb-1">Niche</label>
                                  <Input value={launchEditValues.niche} onChange={(e) => setLaunchEditValues((v) => ({ ...v, niche: e.target.value }))} placeholder="e.g. Level 5 Niche — Fitness for Busy Moms" className="h-8 text-xs" />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-indigo-900 block mb-1">Launch Strategy</label>
                                  <Input value={launchEditValues.launchStrategy} onChange={(e) => setLaunchEditValues((v) => ({ ...v, launchStrategy: e.target.value }))} placeholder="e.g. Webinar, Workshop..." className="h-8 text-xs" />
                                </div>
                                <div className="flex gap-2">
                                  <div className="flex-1">
                                    <label className="text-xs font-medium text-indigo-900 block mb-1">Pricing Model</label>
                                    <Input value={launchEditValues.launchPricing} onChange={(e) => setLaunchEditValues((v) => ({ ...v, launchPricing: e.target.value }))} placeholder="Free / PWYW / Low Ticket" className="h-8 text-xs" />
                                  </div>
                                  <div className="w-28">
                                    <label className="text-xs font-medium text-indigo-900 block mb-1">Price</label>
                                    <Input value={launchEditValues.launchPrice} onChange={(e) => setLaunchEditValues((v) => ({ ...v, launchPrice: e.target.value }))} placeholder="e.g. 47" className="h-8 text-xs" />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-indigo-900 block mb-1">Content Direction</label>
                                  <Textarea value={launchEditValues.launchEventTopic} onChange={(e) => setLaunchEditValues((v) => ({ ...v, launchEventTopic: e.target.value }))} placeholder="Describe the content direction..." rows={2} className="text-xs resize-none" />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-emerald-800 block mb-1">✓ Approved Event Title By Coach Mayowa</label>
                                  <Input value={launchEditValues.approvedEventTitle} onChange={(e) => setLaunchEditValues((v) => ({ ...v, approvedEventTitle: e.target.value }))} placeholder="Enter approved event title..." className="h-8 text-xs border-emerald-300 focus:ring-emerald-400" />
                                </div>
                                <div className="flex gap-2 pt-1">
                                  <Button size="sm" className="h-7 text-xs px-3 bg-indigo-600 hover:bg-indigo-700" onClick={() => handleSaveLaunchInfo(student.id)} disabled={launchSaving}>
                                    {launchSaving ? "Saving…" : "Save"}
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 text-xs px-3" onClick={() => setEditingLaunchId(null)}>Cancel</Button>
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-md bg-indigo-50 border border-indigo-100 p-2 space-y-1">
                                {student.niche && <p className="text-xs"><span className="font-medium text-indigo-900">Niche:</span> <span className="text-indigo-800">{student.niche}</span></p>}
                                {student.launchStrategy && (
                                  <p className="text-xs">
                                    <span className="font-medium text-indigo-900">Strategy:</span>{" "}
                                    <span className="text-indigo-800">{student.launchStrategy}{student.launchPricing ? ` — ${student.launchPricing}${student.launchPrice ? ` ($${student.launchPrice})` : ""}` : ""}</span>
                                  </p>
                                )}
                                {student.launchEventTopic && <p className="text-xs"><span className="font-medium text-indigo-900">Content Direction:</span> <span className="text-indigo-800">{student.launchEventTopic}</span></p>}
                                {student.approvedEventTitle && <p className="text-xs"><span className="font-medium text-emerald-800">Approved Title:</span> <span className="text-emerald-700 font-medium">{student.approvedEventTitle}</span></p>}
                                {!student.niche && !student.launchStrategy && !student.launchEventTopic && !student.approvedEventTitle && (
                                  <p className="text-xs text-indigo-500 italic">No launch info yet</p>
                                )}
                                <button
                                  className="text-xs text-indigo-600 hover:text-indigo-800 underline underline-offset-2 mt-1 block"
                                  onClick={() => {
                                    setEditingLaunchId(student.id)
                                    setLaunchEditValues({
                                      niche: student.niche || "",
                                      launchStrategy: student.launchStrategy || "",
                                      launchPricing: student.launchPricing || "",
                                      launchPrice: student.launchPrice || "",
                                      launchEventTopic: student.launchEventTopic || "",
                                      approvedEventTitle: student.approvedEventTitle || "",
                                    })
                                  }}
                                >
                                  {(student.niche || student.launchStrategy || student.launchEventTopic || student.approvedEventTitle) ? "Edit launch info" : "Add launch info"}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-100 text-blue-800">
                            {studentSubmissions.length} Submissions
                          </Badge>
                          <Badge
                            className={
                              student.active
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {student.active ? "Active" : "Deactivated"}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <label className="text-sm font-medium mb-2 block">
                              Assigned Class
                            </label>
                            <Select
                              value={student.studentClass || "NONE"}
                              onValueChange={(value) =>
                                updateStudentClass(student.id, value === "NONE" ? null : value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a class" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NONE">No Class</SelectItem>
                                <SelectItem value="PRE_CLARITY">Pre-Clarity</SelectItem>
                                <SelectItem value="STRATEGY_CLASS">Strategy Class</SelectItem>
                                <SelectItem value="FUNNEL_CLASS">Funnel Class</SelectItem>
                                <SelectItem value="LAUNCH_CLASS">Launch Class</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1">
                            <label className="text-sm font-medium mb-2 block">
                              Assigned Coach
                            </label>
                            <Select
                              value={student.coachId || "NONE"}
                              onValueChange={(value) =>
                                updateStudentCoach(student.id, value === "NONE" ? null : value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a coach" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NONE">No Coach</SelectItem>
                                {coaches.map((coach) => (
                                  <SelectItem key={coach.id} value={coach.id}>
                                    {coach.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            variant={student.active ? "destructive" : "default"}
                            onClick={() => toggleStudentActive(student.id, student.active)}
                            className="mt-6"
                          >
                            {student.active ? "Deactivate" : "Reactivate"}
                          </Button>
                        </div>

                        {/* View Submissions Toggle */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setExpandedStudent(expandedStudent === student.id ? null : student.id)
                          }
                        >
                          {expandedStudent === student.id ? "Hide" : "View"} Submissions ({studentSubmissions.length})
                        </Button>

                        {/* Expanded Submissions List */}
                        {expandedStudent === student.id && (
                          <div className="border-t pt-4 mt-2">
                            {studentSubmissions.length === 0 ? (
                              <p className="text-sm text-gray-500">No submissions yet</p>
                            ) : (
                              <div className="space-y-3">
                                {studentSubmissions.map((sub) => (
                                  <div
                                    key={sub.id}
                                    className="border rounded-lg p-3 bg-gray-50"
                                  >
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1">
                                        <p className="font-medium text-sm">
                                          {sub.workbookTitle}
                                        </p>
                                        <p className="text-xs text-gray-600 mt-1">
                                          {getWeekLabel(sub.weekNumber)} • Coach: {sub.coach.name}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                          Submitted: {new Date(sub.submittedAt).toLocaleDateString()}
                                          {sub.reviewedAt && (
                                            <> • Reviewed: {new Date(sub.reviewedAt).toLocaleDateString()}</>
                                          )}
                                        </p>
                                      </div>
                                      <Badge className={getStatusColor(sub.status)}>
                                        {getStatusLabel(sub.status)}
                                      </Badge>
                                    </div>
                                    {sub.coachFeedback && (
                                      isAiReview(sub.coachFeedback) ? (
                                        <div className="mt-2 rounded border border-slate-200 bg-white p-3">
                                          <FeedbackRenderer text={sub.coachFeedback} />
                                        </div>
                                      ) : (
                                        <div className="mt-2 text-xs bg-blue-50 p-2 rounded">
                                          <span className="font-medium text-blue-900">Coach Feedback: </span>
                                          <span className="text-blue-800 whitespace-pre-wrap">{sub.coachFeedback}</span>
                                        </div>
                                      )
                                    )}
                                    {sub.headCoachFeedback && (
                                      <div className="mt-1 text-xs bg-purple-50 p-2 rounded">
                                        <span className="font-medium text-purple-900">Head Coach Feedback: </span>
                                        <span className="text-purple-800 whitespace-pre-wrap">{sub.headCoachFeedback}</span>
                                      </div>
                                    )}
                                    <div className="mt-2">
                                      <a
                                        href={sub.workbookUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:underline"
                                      >
                                        View Workbook →
                                      </a>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Pending Approvals Tab */}
      {activeTab === "pending" && (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Pending Student Approvals ({pendingStudents.length})
          </h2>

          <div className="space-y-4">
            {pendingStudents.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500">No pending student approvals</p>
                </CardContent>
              </Card>
            ) : (
              pendingStudents.map((student) => (
                <Card key={student.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{student.name}</h3>
                        <p className="text-sm text-gray-600">{student.email}</p>
                        {student.coach && (
                          <p className="text-sm text-gray-500 mt-1">
                            Coach: {student.coach.name}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          Registered: {new Date(student.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        Pending Approval
                      </Badge>
                    </div>

                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="text-sm font-medium mb-2 block">
                          Assign Class <span className="text-red-500">*</span>
                        </label>
                        <Select
                          value={selectedClasses[student.id] || ""}
                          onValueChange={(value) =>
                            setSelectedClasses((prev) => ({
                              ...prev,
                              [student.id]: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a class" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PRE_CLARITY">Pre-Clarity</SelectItem>
                            <SelectItem value="STRATEGY_CLASS">Strategy Class</SelectItem>
                            <SelectItem value="FUNNEL_CLASS">Funnel Class</SelectItem>
                            <SelectItem value="LAUNCH_CLASS">Launch Class</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={() => handleApproveStudent(student.id)}
                        disabled={
                          !selectedClasses[student.id] || processingApproval === student.id
                        }
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {processingApproval === student.id ? "Processing..." : "Approve"}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleRejectStudent(student.id, student.name)}
                        disabled={processingApproval === student.id}
                      >
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Coaches Tab */}
      {activeTab === "coaches" && (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Coach Dashboards ({coaches.length})
          </h2>
          <p className="text-gray-600 mb-4">
            View each coach's submissions and monitor their review status
          </p>

          <div className="space-y-4">
            {coaches.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500">No coaches found</p>
                </CardContent>
              </Card>
            ) : (
              coaches.map((coach) => {
                const coachSubmissions = submissions.filter(
                  (s) => s.coach.name === coach.name
                )
                const pendingCount = coachSubmissions.filter(
                  (s) => s.status === "PENDING" || s.status === "COACH_REVIEW"
                ).length

                return (
                  <Card key={coach.id}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div className="flex-1 mr-4">
                          {renamingCoachId === coach.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={renameValue}
                                onChange={(e: { target: { value: string } }) => setRenameValue(e.target.value)}
                                className="h-8 text-sm w-48"
                                autoFocus
                                onKeyDown={(e: { key: string }) => {
                                  if (e.key === "Enter") handleRenameCoach(coach.id)
                                  if (e.key === "Escape") { setRenamingCoachId(null); setRenameValue("") }
                                }}
                              />
                              <Button size="sm" onClick={() => handleRenameCoach(coach.id)} disabled={renameSaving}>
                                {renameSaving ? "Saving…" : "Save"}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setRenamingCoachId(null); setRenameValue("") }}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg">{coach.name}</CardTitle>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto py-0 px-1 text-xs text-muted-foreground underline underline-offset-2 font-normal"
                                onClick={() => { setRenamingCoachId(coach.id); setRenameValue(coach.name) }}
                              >
                                rename
                              </Button>
                            </div>
                          )}
                          <CardDescription>{coach.email}</CardDescription>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Badge className="bg-blue-100 text-blue-800">
                            {coachSubmissions.length} Total
                          </Badge>
                          {pendingCount > 0 && (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              {pendingCount} Pending
                            </Badge>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setExpandedCoach(expandedCoach === coach.id ? null : coach.id)
                            }
                          >
                            {expandedCoach === coach.id ? "Hide" : "View"} Submissions
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    {expandedCoach === coach.id && (
                      <CardContent>
                        {coachSubmissions.length === 0 ? (
                          <p className="text-gray-500 text-sm">No submissions yet</p>
                        ) : (
                          <div className="space-y-3">
                            {coachSubmissions.map((submission) => (
                              <div
                                key={submission.id}
                                className="border rounded-lg p-3 bg-gray-50"
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">
                                      {submission.workbookTitle}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                      Student: {submission.student.name} •{" "}
                                      {getWeekLabel(submission.weekNumber)}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Submitted:{" "}
                                      {new Date(submission.submittedAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <Badge className={getStatusColor(submission.status)}>
                                    {getStatusLabel(submission.status)}
                                  </Badge>
                                </div>
                                {submission.coachFeedback && (
                                  isAiReview(submission.coachFeedback) ? (
                                    <div className="mt-2 rounded border border-slate-200 bg-white p-3">
                                      <FeedbackRenderer text={submission.coachFeedback} />
                                    </div>
                                  ) : (
                                    <div className="mt-2 text-xs bg-white p-2 rounded">
                                      <span className="font-medium">Feedback: </span>
                                      <span className="whitespace-pre-wrap">{submission.coachFeedback}</span>
                                    </div>
                                  )
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Pending Deactivations Tab */}
      {activeTab === "deactivations" && (
        <div>
          <h2 className="text-xl font-semibold mb-1">Pending Deactivations</h2>
          <p className="text-muted-foreground text-sm mb-4">
            These students have not submitted in 2+ weeks. Review and approve or reject each deactivation.
          </p>

          {(() => {
            const pending = students.filter((s: Student) => s.pendingDeactivation)
            if (pending.length === 0) {
              return (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No students are pending deactivation.</p>
                  </CardContent>
                </Card>
              )
            }
            return (
              <div className="space-y-3">
                {pending.map((student: Student) => (
                  <Card key={student.id} className="border-orange-200 bg-orange-50/40">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{student.name}</p>
                          <p className="text-sm text-muted-foreground">{student.email}</p>
                          {student.coach && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Coach: {student.coach.name}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={processingDeactivation === student.id}
                            onClick={() => handleDeactivationDecision(student.id, true)}
                          >
                            {processingDeactivation === student.id ? "Processing…" : "Approve Deactivation"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={processingDeactivation === student.id}
                            onClick={() => handleDeactivationDecision(student.id, false)}
                          >
                            Reject (Keep Active)
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

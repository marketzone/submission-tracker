"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface Submission {
  id: string
  workbookTitle: string
  workbookUrl: string
  weekNumber: number
  status: string
  coachFeedback?: string | null
  student: { name: string; email: string }
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

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  COACH_REVIEW: "bg-blue-100 text-blue-800",
  HEAD_COACH_REVIEW: "bg-purple-100 text-purple-800",
  APPROVED: "bg-green-100 text-green-800",
  NEEDS_CORRECTION: "bg-red-100 text-red-800",
}

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  COACH_REVIEW: "Coach Review",
  HEAD_COACH_REVIEW: "Head Coach Review",
  APPROVED: "Approved",
  NEEDS_CORRECTION: "Needs Correction",
}

export default function HeadCoachDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState("")
  const [activeTab, setActiveTab] = useState<"reviews" | "approvals" | "staff">("reviews")
  const [processingApproval, setProcessingApproval] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [submissionsRes, statsRes, pendingRes, staffRes] = await Promise.all([
        fetch("/api/submissions"),
        fetch("/api/stats"),
        fetch("/api/users/pending"),
        fetch("/api/users/staff"),
      ])

      const submissionsData = await submissionsRes.json()
      const statsData = await statsRes.json()
      const pendingData = await pendingRes.json()
      const staffData = await staffRes.json()

      setSubmissions(submissionsData.submissions || [])
      setStats(statsData)
      setPendingUsers(pendingData.users || [])
      setStaff(staffData.staff || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (
    submissionId: string,
    action: "approve" | "sendToCoach" | "sendToStudent"
  ) => {
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
        alert("User approved successfully!")
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
    if (!confirm(`Are you sure you want to reject ${userName}? Their account will be deleted.`)) {
      return
    }

    setProcessingApproval(userId)
    try {
      const res = await fetch(`/api/users/${userId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: false }),
      })

      if (res.ok) {
        alert("User rejected and account deleted")
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

  const toggleStaffActive = async (staffId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/users/${staffId}/toggle-active`, {
        method: "PATCH",
      })

      if (res.ok) {
        // Refresh data
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

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "COACH":
        return "Coach"
      case "PROGRAM_MANAGER":
        return "Program Manager"
      default:
        return role
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Head Coach Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Oversight and final approval of student submissions
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <Button
          variant={activeTab === "reviews" ? "default" : "outline"}
          onClick={() => setActiveTab("reviews")}
        >
          Final Reviews
          {stats?.pendingFinalReview && stats.pendingFinalReview > 0 && (
            <Badge className="ml-2 bg-purple-500 text-white">
              {stats.pendingFinalReview}
            </Badge>
          )}
        </Button>
        <Button
          variant={activeTab === "approvals" ? "default" : "outline"}
          onClick={() => setActiveTab("approvals")}
        >
          User Approvals
          {pendingUsers.length > 0 && (
            <Badge className="ml-2 bg-red-500 text-white">
              {pendingUsers.length}
            </Badge>
          )}
        </Button>
        <Button
          variant={activeTab === "staff" ? "default" : "outline"}
          onClick={() => setActiveTab("staff")}
        >
          Manage Staff
        </Button>
      </div>

      {activeTab === "reviews" && (
        <>
          {/* Dashboard Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalSubmissions || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending Final Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {stats?.pendingFinalReview || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Approval Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats?.approvalRate?.toFixed(1) || 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending by Coach */}
      {stats?.pendingByCoach && Object.keys(stats.pendingByCoach).length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Pending Reviews by Coach</CardTitle>
            <CardDescription>
              Submissions awaiting coach review
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.pendingByCoach).map(([coach, count]) => (
                <div key={coach} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="font-medium">{coach}</span>
                  <Badge className="bg-blue-100 text-blue-800">{count} pending</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

          {/* Final Review Queue */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-4">Final Review Queue</h2>
            <p className="text-gray-600 mb-4">
              Coach-approved submissions awaiting your final approval
            </p>
          </div>

          {submissions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">No submissions awaiting final review</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <Card key={submission.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">
                          {submission.workbookTitle}
                        </CardTitle>
                        <CardDescription>
                          Student: {submission.student.name} • Coach: {submission.coach.name} • Week {submission.weekNumber}
                        </CardDescription>
                      </div>
                      <Badge className={statusColors[submission.status]}>
                        {statusLabels[submission.status]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">Workbook:</span>
                      <a
                        href={submission.workbookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline truncate"
                      >
                        {submission.workbookUrl}
                      </a>
                    </div>
                    <div className="text-sm text-gray-600">
                      Submitted on {new Date(submission.submittedAt).toLocaleDateString()}
                      {submission.reviewedAt && (
                        <> • Coach reviewed on {new Date(submission.reviewedAt).toLocaleDateString()}</>
                      )}
                    </div>

                    {submission.coachFeedback && (
                      <div className="mt-3 rounded-md bg-blue-50 p-3">
                        <p className="text-sm font-medium text-blue-900 mb-1">
                          Coach Notes:
                        </p>
                        <p className="text-sm text-blue-800">{submission.coachFeedback}</p>
                      </div>
                    )}

                    {reviewingId === submission.id ? (
                      <div className="mt-4 space-y-4 border-t pt-4">
                        <div>
                          <Label htmlFor="feedback">Feedback Notes</Label>
                          <Textarea
                            id="feedback"
                            placeholder="Provide feedback if sending back to coach or student..."
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            rows={3}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleReview(submission.id, "approve")}
                              className="bg-green-600 hover:bg-green-700 flex-1"
                            >
                              ✓ Final Approval
                            </Button>
                            <Button
                              onClick={() => {
                                setReviewingId(null)
                                setFeedback("")
                              }}
                              variant="outline"
                            >
                              Cancel
                            </Button>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleReview(submission.id, "sendToCoach")}
                              variant="outline"
                              className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-50"
                            >
                              ← Send Back to Coach
                            </Button>
                            <Button
                              onClick={() => handleReview(submission.id, "sendToStudent")}
                              variant="destructive"
                              className="flex-1"
                            >
                              ↩ Send Back to Student
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={() => setReviewingId(submission.id)}
                        className="mt-2"
                      >
                        Review for Final Approval
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* User Approvals Tab */}
      {activeTab === "approvals" && (
        <div>
          <h2 className="text-2xl font-bold mb-4">
            Pending User Approvals ({pendingUsers.length})
          </h2>
          <p className="text-gray-600 mb-4">
            Coaches and Program Managers awaiting approval
          </p>

          <div className="space-y-4">
            {pendingUsers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500">No pending user approvals</p>
                </CardContent>
              </Card>
            ) : (
              pendingUsers.map((user) => (
                <Card key={user.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{user.name}</h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Role: {getRoleLabel(user.role)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Registered: {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        Pending Approval
                      </Badge>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleApproveUser(user.id)}
                        disabled={processingApproval === user.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {processingApproval === user.id ? "Processing..." : "Approve"}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleRejectUser(user.id, user.name)}
                        disabled={processingApproval === user.id}
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

      {/* Manage Staff Tab */}
      {activeTab === "staff" && (
        <div>
          <h2 className="text-2xl font-bold mb-4">
            Manage Staff ({staff.length})
          </h2>
          <p className="text-gray-600 mb-4">
            Manage coaches and program managers
          </p>

          <div className="space-y-4">
            {staff.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500">No staff members found</p>
                </CardContent>
              </Card>
            ) : (
              staff.map((member) => (
                <Card key={member.id}>
                  <CardContent className="flex justify-between items-center p-6">
                    <div>
                      <h3 className="font-semibold text-lg">{member.name}</h3>
                      <p className="text-sm text-gray-600">{member.email}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Role: {getRoleLabel(member.role)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Joined: {new Date(member.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        className={
                          member.active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {member.active ? "Active" : "Deactivated"}
                      </Badge>
                      <Button
                        variant={member.active ? "destructive" : "default"}
                        onClick={() => toggleStaffActive(member.id, member.active)}
                      >
                        {member.active ? "Deactivate" : "Reactivate"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

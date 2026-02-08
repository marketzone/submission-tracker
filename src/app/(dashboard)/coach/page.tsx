"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  coachFeedback?: string | null
  headCoachFeedback?: string | null
  student: { name: string; email: string }
  submittedAt: string
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

const getWeekLabel = (weekNumber: number) => {
  return weekNumber === 0 ? "Pre-Clarity Week" : `Week ${weekNumber}`
}

export default function CoachDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState("")
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

    if (statusFilter !== "all") {
      filtered = filtered.filter((s) => s.status === statusFilter)
    }

    if (weekFilter !== "all") {
      filtered = filtered.filter((s) => s.weekNumber === parseInt(weekFilter))
    }

    if (studentSearch) {
      filtered = filtered.filter((s) =>
        s.student.name.toLowerCase().includes(studentSearch.toLowerCase())
      )
    }

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
        body: JSON.stringify({
          approved,
          feedback: approved ? undefined : feedback,
        }),
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

  const pendingCount = submissions.filter(
    (s) => s.status === "PENDING" || s.status === "COACH_REVIEW"
  ).length

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Review Queue</h1>
            <p className="text-gray-600 mt-1">
              Review student workbook submissions
            </p>
          </div>
          {pendingCount > 0 && (
            <Badge className="bg-red-100 text-red-800 text-lg px-4 py-2">
              {pendingCount} Pending
            </Badge>
          )}
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <Label htmlFor="studentSearch">Search Student</Label>
            <Input
              id="studentSearch"
              placeholder="Search by student name..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <Label htmlFor="statusFilter">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
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
          <div className="w-full md:w-40">
            <Label htmlFor="weekFilter">Week</Label>
            <Select value={weekFilter} onValueChange={setWeekFilter}>
              <SelectTrigger>
                <SelectValue />
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
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading submissions...</p>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No submissions found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSubmissions.map((submission) => (
            <Card key={submission.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">
                      {submission.workbookTitle}
                    </CardTitle>
                    <CardDescription>
                      Student: {submission.student.name} • {getWeekLabel(submission.weekNumber)}
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
                </div>

                {reviewingId === submission.id ? (
                  <div className="mt-4 space-y-4 border-t pt-4">
                    <div>
                      <Label htmlFor="feedback">Feedback (for corrections)</Label>
                      <Textarea
                        id="feedback"
                        placeholder="Provide feedback if requesting corrections..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleReview(submission.id, true)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Approve & Send to Head Coach
                      </Button>
                      <Button
                        onClick={() => handleReview(submission.id, false)}
                        variant="destructive"
                      >
                        Request Corrections
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
                  </div>
                ) : (
                  <>
                    {(submission.status === "PENDING" || submission.status === "COACH_REVIEW") && (
                      <Button
                        onClick={() => setReviewingId(submission.id)}
                        className="mt-2"
                      >
                        Review Submission
                      </Button>
                    )}
                    {submission.coachFeedback && (
                      <div className="mt-3 rounded-md bg-gray-50 p-3">
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          Your Feedback:
                        </p>
                        <p className="text-sm text-gray-700">{submission.coachFeedback}</p>
                      </div>
                    )}
                    {submission.headCoachFeedback && (
                      <div className="mt-3 rounded-md bg-purple-50 p-3">
                        <p className="text-sm font-medium text-purple-900 mb-1">
                          Head Coach Notes:
                        </p>
                        <p className="text-sm text-purple-800">{submission.headCoachFeedback}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

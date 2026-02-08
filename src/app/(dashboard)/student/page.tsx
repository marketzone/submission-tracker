"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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

export default function StudentDashboard() {
  const { data: session } = useSession()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [resubmitting, setResubmitting] = useState<string | null>(null)

  useEffect(() => {
    fetchSubmissions()
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

  const handleResubmit = async (submissionId: string) => {
    try {
      const response = await fetch(`/api/submissions/${submissionId}/resubmit`, {
        method: "PATCH",
      })

      if (response.ok) {
        fetchSubmissions()
        alert("Workbook resubmitted successfully!")
      } else {
        alert("Failed to resubmit")
      }
    } catch (error) {
      console.error("Error resubmitting:", error)
      alert("An error occurred")
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Submissions</h1>
          <p className="text-gray-600 mt-1">
            Track your workbook submissions and review status
          </p>
        </div>
        <Link href="/student/submit">
          <Button>Submit New Workbook</Button>
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading submissions...</p>
        </div>
      ) : submissions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">
              You haven't submitted any workbooks yet.
            </p>
            <Link href="/student/submit">
              <Button>Submit Your First Workbook</Button>
            </Link>
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
                      {getWeekLabel(submission.weekNumber)} • Coach: {submission.coach.name}
                    </CardDescription>
                  </div>
                  <Badge className={statusColors[submission.status]}>
                    {statusLabels[submission.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Workbook URL:</span>
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
                {submission.coachFeedback && (
                  <div className="mt-3 rounded-md bg-yellow-50 p-3">
                    <p className="text-sm font-medium text-yellow-900 mb-1">
                      Coach Feedback:
                    </p>
                    <p className="text-sm text-yellow-800">
                      {submission.coachFeedback}
                    </p>
                  </div>
                )}
                {submission.headCoachFeedback && (
                  <div className="mt-3 rounded-md bg-purple-50 p-3">
                    <p className="text-sm font-medium text-purple-900 mb-1">
                      Head Coach Feedback:
                    </p>
                    <p className="text-sm text-purple-800">
                      {submission.headCoachFeedback}
                    </p>
                  </div>
                )}
                {submission.status === "NEEDS_CORRECTION" && (
                  <div className="mt-4 pt-4 border-t bg-red-50 p-4 rounded-md">
                    <p className="text-sm text-gray-900 font-semibold mb-3">
                      ⚠️ Please make the requested corrections to your workbook and resubmit.
                    </p>
                    <Button
                      onClick={() => handleResubmit(submission.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                      size="lg"
                    >
                      🔄 Mark as Corrected & Resubmit
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

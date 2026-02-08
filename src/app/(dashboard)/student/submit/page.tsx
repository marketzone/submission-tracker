"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"

export default function SubmitWorkbookPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [workbookTitle, setWorkbookTitle] = useState("")
  const [workbookUrl, setWorkbookUrl] = useState("")
  const [weekNumber, setWeekNumber] = useState("")
  const [coachId, setCoachId] = useState("")
  const [coaches, setCoaches] = useState<Array<{ id: string; name: string }>>([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Fetch coaches
    fetch("/api/users/coaches")
      .then((res) => res.json())
      .then((data) => setCoaches(data.coaches || []))
      .catch(() => setCoaches([]))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
        setError(data.error || "Failed to submit workbook")
      } else {
        setSuccess(true)
        // Reset form
        setWorkbookTitle("")
        setWorkbookUrl("")
        setWeekNumber("")
        setCoachId("")
        // Redirect to submissions list after 2 seconds
        setTimeout(() => router.push("/student"), 2000)
      }
    } catch (error) {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <div className="mb-6">
        <Link href="/student" className="text-sm text-blue-600 hover:underline">
          ← Back to My Submissions
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Submit Workbook</CardTitle>
          <CardDescription>
            Submit your completed workbook for coach review
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workbookTitle">Workbook Title</Label>
              <Input
                id="workbookTitle"
                type="text"
                placeholder="e.g., Marketing Fundamentals Workbook"
                value={workbookTitle}
                onChange={(e) => setWorkbookTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workbookUrl">Workbook URL</Label>
              <Input
                id="workbookUrl"
                type="url"
                placeholder="https://..."
                value={workbookUrl}
                onChange={(e) => setWorkbookUrl(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500">
                Link to your Google Doc, Notion page, or other workbook
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekNumber">Week Number</Label>
              <Select value={weekNumber} onValueChange={setWeekNumber}>
                <SelectTrigger>
                  <SelectValue placeholder="Select week" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Pre-Clarity Week</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((week) => (
                    <SelectItem key={week} value={week.toString()}>
                      Week {week}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coach">Submit to Coach</Label>
              <Select value={coachId} onValueChange={setCoachId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a coach" />
                </SelectTrigger>
                <SelectContent>
                  {coaches.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>
                      {coach.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-md bg-green-50 p-3 text-sm text-green-600">
                Workbook submitted successfully! Redirecting...
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Submitting..." : "Submit Workbook"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

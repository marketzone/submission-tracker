"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"

const GPT_TOOLS = [
  {
    label: "Workbook 1 GPT Tool",
    href: "https://chatgpt.com/g/g-67beaf286bf881918c8cced710f5265d-expert2coach-review-day-1-upgraded-version",
  },
  {
    label: "How to use Workbook 1 Internal Review GPT Tool",
    href: "https://youtu.be/78HGqcOVf0c",
    isVideo: true,
  },
  {
    label: "Workbook 1 Review GPT Tool",
    href: "https://chatgpt.com/g/g-69581646e0f481918f76e31912434053-ls-workbook-1-review-internal",
  },
  {
    label: "Workbook 2 GPT Tool",
    href: "https://chatgpt.com/g/g-67dbf96c1aac8191885b60e15ecaec07-expert2coach-day-2-walkthrough",
  },
  {
    label: "How to use Workbook 2 Internal Review GPT Tool",
    href: "https://youtu.be/SK-UnC4cEqo",
    isVideo: true,
  },
  {
    label: "Workbook 2 Review GPT Tool",
    href: "https://chatgpt.com/g/g-694e58bc5d188191968e2e1fd0ac4370-launchsmart-workbook-2-review-gpt",
  },
  {
    label: "Workbook 2 Adjuster GPT Tool",
    href: "https://chatgpt.com/g/g-6951752f5010819190794c16ead60f4c-adjuster-ls-workbook-2",
  },
]

export default function SubmitWorkbookPage() {
  const router = useRouter()
  const [workbookTitle, setWorkbookTitle] = useState("")
  const [workbookUrl, setWorkbookUrl] = useState("")
  const [weekNumber, setWeekNumber] = useState("")
  const [coachId, setCoachId] = useState("")
  const [coaches, setCoaches] = useState<Array<{ id: string; name: string }>>([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [studentClass, setStudentClass] = useState<string | null>(null)

  // GPT confirmation flow
  const [step, setStep] = useState<"form" | "gpt-confirm" | "gpt-redirect">("form")

  useEffect(() => {
    fetch("/api/users/coaches")
      .then((res) => res.json())
      .then((data) => setCoaches(data.coaches || []))
      .catch(() => setCoaches([]))

    fetch("/api/users/launch-info")
      .then((res) => res.json())
      .then((data) => setStudentClass(data.studentClass || null))
      .catch(() => {})
  }, [])

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Pre-Clarity students must confirm GPT review first
    if (studentClass === "PRE_CLARITY") {
      setStep("gpt-confirm")
    } else {
      doSubmit()
    }
  }

  const doSubmit = async () => {
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
        setStep("form")
        setError(data.error || "Failed to submit workbook")
      } else {
        setSuccess(true)
        setWorkbookTitle("")
        setWorkbookUrl("")
        setWeekNumber("")
        setCoachId("")
        setTimeout(() => router.push("/student"), 2000)
      }
    } catch {
      setStep("form")
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // GPT Confirmation Screen
  if (step === "gpt-confirm") {
    return (
      <div className="container mx-auto max-w-2xl py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Before You Submit</CardTitle>
            <CardDescription>
              As a Pre-Clarity student, you are required to run your work through
              the internal GPT review tools before submitting to your coach.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
              <p className="text-amber-900 font-medium text-sm">
                Have you used the internal GPT review tool on your workbook before submitting?
              </p>
            </div>
            <div className="flex gap-4">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => doSubmit()}
                disabled={loading}
              >
                {loading ? "Submitting..." : "Yes, I have used the GPT review tool"}
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                onClick={() => setStep("gpt-redirect")}
              >
                No, I haven't yet
              </Button>
            </div>
            <button
              className="text-sm text-gray-400 hover:text-gray-600 underline"
              onClick={() => setStep("form")}
            >
              Go back to edit my submission
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // GPT Redirect Screen
  if (step === "gpt-redirect") {
    return (
      <div className="container mx-auto max-w-2xl py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Please Use the GPT Review Tools First</CardTitle>
            <CardDescription>
              Before submitting to your coach, you must complete an internal review
              using the GPT tools below. This ensures your work meets the required
              standard before coach review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
              Once you have completed your GPT review, come back and submit your workbook.
            </div>
            <div className="space-y-3">
              {GPT_TOOLS.map((tool) => (
                <div
                  key={tool.href}
                  className="flex items-center justify-between border rounded-lg p-3 bg-gray-50"
                >
                  <span className="text-sm font-medium text-gray-800">{tool.label}</span>
                  <a
                    href={tool.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" variant={tool.isVideo ? "outline" : "default"}>
                      {tool.isVideo ? "Watch Video" : "Open Tool"}
                    </Button>
                  </a>
                </div>
              ))}
            </div>
            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setStep("gpt-confirm")}
              >
                I have now completed the GPT review — proceed to submit
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main Form
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
          <form onSubmit={handleFormSubmit} className="space-y-4">
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
            {studentClass === "PRE_CLARITY" && (
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                As a Pre-Clarity student, you will be asked to confirm you have completed
                the internal GPT review before your submission is sent to your coach.
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

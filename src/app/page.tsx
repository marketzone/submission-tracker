import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function Home() {
  const session = await auth()

  // If logged in, redirect to appropriate dashboard
  if (session?.user) {
    switch (session.user.role) {
      case "STUDENT":
        redirect("/student")
      case "COACH":
        redirect("/coach")
      case "HEAD_COACH":
        redirect("/head-coach")
      case "PROGRAM_MANAGER":
        redirect("/program-manager")
    }
  }

  // If not logged in, show welcome page
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">
            Workbook Submission Tracker
          </CardTitle>
          <CardDescription className="text-base">
            Manage student workbook submissions and reviews
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/login" className="flex-1">
              <Button className="w-full" size="lg">
                Login
              </Button>
            </Link>
            <Link href="/signup" className="flex-1">
              <Button variant="outline" className="w-full" size="lg">
                Sign Up
              </Button>
            </Link>
          </div>
          <div className="mt-4 space-y-2 text-sm text-gray-600">
            <p>
              <strong>Students:</strong> Submit workbooks and track review status
            </p>
            <p>
              <strong>Coaches:</strong> Review and approve student submissions
            </p>
            <p>
              <strong>Head Coach:</strong> Final approval and dashboard oversight
            </p>
            <p>
              <strong>Program Manager:</strong> Monitor all submissions and manage student access
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

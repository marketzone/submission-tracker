import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import SignOutButton from "@/components/SignOutButton"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  const dashboardLinks: Record<string, { href: string; label: string }> = {
    STUDENT: { href: "/student", label: "My Submissions" },
    COACH: { href: "/coach", label: "Review Queue" },
    HEAD_COACH: { href: "/head-coach", label: "Dashboard" },
  }

  const currentDashboard = dashboardLinks[session.user.role]

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-xl font-bold">
                Workbook Tracker
              </Link>
              {currentDashboard && (
                <Link
                  href={currentDashboard.href}
                  className="text-gray-700 hover:text-gray-900"
                >
                  {currentDashboard.label}
                </Link>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <div className="font-medium">{session.user.name}</div>
                <div className="text-gray-500 capitalize">
                  {session.user.role.toLowerCase().replace("_", " ")}
                </div>
              </div>
              <SignOutButton />
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  )
}

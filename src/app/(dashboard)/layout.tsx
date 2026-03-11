import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import SignOutButton from "@/components/SignOutButton"

const roleConfig: Record<string, { href: string; label: string; badge: string; badgeClass: string }> = {
  STUDENT: {
    href: "/student",
    label: "My Submissions",
    badge: "Student",
    badgeClass: "bg-emerald-100 text-emerald-700",
  },
  COACH: {
    href: "/coach",
    label: "Review Queue",
    badge: "Coach",
    badgeClass: "bg-blue-100 text-blue-700",
  },
  HEAD_COACH: {
    href: "/head-coach",
    label: "Dashboard",
    badge: "Head Coach",
    badgeClass: "bg-purple-100 text-purple-700",
  },
  PROGRAM_MANAGER: {
    href: "/program-manager",
    label: "Program Manager",
    badge: "Program Manager",
    badgeClass: "bg-orange-100 text-orange-700",
  },
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  const config = roleConfig[session.user.role]

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-40 bg-white border-b border-border shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Brand + Nav */}
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-sm group-hover:opacity-90 transition-opacity">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.966 8.966 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
                <span className="text-base font-bold text-foreground tracking-tight">
                  Workbook Tracker
                </span>
              </Link>

              {config && (
                <Link
                  href={config.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {config.label}
                </Link>
              )}
            </div>

            {/* User Info */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-semibold text-foreground leading-tight">
                  {session.user.name}
                </span>
                {config && (
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full mt-0.5 ${config.badgeClass}`}>
                    {config.badge}
                  </span>
                )}
              </div>
              <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                {session.user.name?.charAt(0).toUpperCase()}
              </div>
              <SignOutButton />
            </div>
          </div>
        </div>
      </nav>
      <main>
        {children}
      </main>
    </div>
  )
}

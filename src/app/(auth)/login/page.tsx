"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ErrorType = "INACTIVE" | "NOT_APPROVED" | "INVALID" | "GENERIC" | null

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errorType, setErrorType] = useState<ErrorType>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorType(null)
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.ok) {
        // Successful login — hard redirect for a clean session start
        window.location.href = "/"
        return
      }

      if (result?.error) {
        // NextAuth v5 always wraps authorize() errors as "CredentialsSignin"
        // Fall back to the check-status API to get the real reason
        try {
          const statusRes = await fetch(`/api/auth/check-status?email=${encodeURIComponent(email)}`)
          const statusData = await statusRes.json()
          if (statusData.status === "INACTIVE") {
            setErrorType("INACTIVE")
          } else if (statusData.status === "NOT_APPROVED") {
            setErrorType("NOT_APPROVED")
          } else {
            setErrorType("INVALID")
          }
        } catch {
          setErrorType("INVALID")
        }
      } else {
        setErrorType("GENERIC")
      }
    } catch {
      setErrorType("GENERIC")
    } finally {
      setLoading(false)
    }
  }

  const isPendingApproval = errorType === "NOT_APPROVED"

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Brand header */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-md mb-4">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.966 8.966 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Workbook Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your account</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10"
              />
            </div>

            {errorType && (
              <div className={`rounded-lg p-3 text-sm ${
                isPendingApproval
                  ? "bg-blue-50 border border-blue-200 text-blue-700"
                  : errorType === "INACTIVE"
                  ? "bg-amber-50 border border-amber-200 text-amber-800"
                  : "bg-red-50 border border-red-200 text-red-600"
              }`}>
                {errorType === "INACTIVE" && (
                  <>
                    You have been deactivated for being inactive for 2 weeks. Please visit{" "}
                    <a
                      href="https://launchsmart.selar.com/2196921677"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-medium"
                    >
                      launchsmart.selar.com
                    </a>
                    , pay the reactivation fee and you will be reactivated.
                  </>
                )}
                {errorType === "NOT_APPROVED" && "Your account is pending approval. You will be notified once approved."}
                {errorType === "INVALID" && "Invalid email or password."}
                {errorType === "GENERIC" && "An error occurred. Please try again."}
              </div>
            )}

            <Button type="submit" className="w-full h-10 font-medium" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Signing in...
                </span>
              ) : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

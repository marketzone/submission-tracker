"use client"

import { useState } from "react"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      console.log("Sign in result:", result)

      if (result?.error) {
        if (result.error === "CredentialsSignin") {
          setError("Invalid email or password.")
        } else {
          setError(`Login failed: ${result.error}`)
        }
      } else if (result?.ok) {
        // Check approval and active status by fetching session
        const sessionResponse = await fetch("/api/auth/session")
        const sessionData = await sessionResponse.json()

        if (sessionData?.user) {
          // Check if approved
          if (!sessionData.user.approved) {
            await signIn("credentials", { redirect: false }) // Sign out
            if (sessionData.user.role === "STUDENT") {
              setError("Your account is pending approval by the program manager.")
            } else if (sessionData.user.role === "COACH" || sessionData.user.role === "PROGRAM_MANAGER") {
              setError("Your account is pending approval by the head coach.")
            }
            setLoading(false)
            return
          }

          // Check if active
          if (!sessionData.user.active) {
            await signIn("credentials", { redirect: false }) // Sign out
            if (sessionData.user.role === "STUDENT") {
              setError("Your account has been deactivated. Please contact the program manager.")
            } else if (sessionData.user.role === "COACH" || sessionData.user.role === "PROGRAM_MANAGER") {
              setError("Your account has been deactivated. Please contact the head coach.")
            }
            setLoading(false)
            return
          }
        }

        router.push("/")
        router.refresh()
      } else {
        setError("Login failed. Please check your credentials.")
      }
    } catch (error) {
      console.error("Login error:", error)
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription>
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
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
              />
            </div>
            {error && (
              <div className={`text-sm ${error.includes("pending approval") ? "text-blue-600 bg-blue-50 p-3 rounded-md" : "text-red-500"}`}>
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <Link href="/signup" className="text-blue-600 hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

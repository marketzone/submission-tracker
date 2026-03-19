"use server"

import { signIn } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export type LoginError = "INACTIVE" | "NOT_APPROVED" | "INVALID" | "GENERIC"

export async function loginAction(
  email: string,
  password: string
): Promise<{ error: LoginError } | never> {
  try {
    // Server-side signIn: sets the JWT cookie and throws NEXT_REDIRECT on success.
    // This is more reliable than the client-side signIn() + getSession() approach
    // because the cookie is set atomically with the redirect response.
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    })
  } catch (error: unknown) {
    // Next.js redirect throws an error internally — re-throw so the client navigates
    const err = error as { digest?: string }
    if (err?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }

    // Authentication failed — look up the real reason
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
        select: { active: true, approved: true },
      })

      if (!user) return { error: "INVALID" }
      if (!user.approved) return { error: "NOT_APPROVED" }
      if (!user.active) return { error: "INACTIVE" }
    } catch {
      return { error: "GENERIC" }
    }

    // User exists, approved, active — password was wrong
    return { error: "INVALID" }
  }

  // signIn with redirectTo never returns normally — this line is unreachable
  return { error: "GENERIC" }
}

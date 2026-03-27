import { auth } from "@/lib/auth"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const user = req.auth?.user
  const isProtectedRoute = req.nextUrl.pathname.startsWith("/student") ||
                           req.nextUrl.pathname.startsWith("/coach") ||
                           req.nextUrl.pathname.startsWith("/head-coach") ||
                           req.nextUrl.pathname.startsWith("/program-manager")

  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname)
    return Response.redirect(loginUrl)
  }

  // Block deactivated or unapproved users who still have a JWT session
  // active/approved are refreshed from DB on every auth() call (see auth.ts jwt callback)
  if (isProtectedRoute && isLoggedIn && user) {
    if (!user.active) {
      const loginUrl = new URL("/login", req.url)
      loginUrl.searchParams.set("error", "INACTIVE")
      return Response.redirect(loginUrl)
    }
    if (!user.approved) {
      const loginUrl = new URL("/login", req.url)
      loginUrl.searchParams.set("error", "NOT_APPROVED")
      return Response.redirect(loginUrl)
    }
  }

  return
})

export const config = {
  matcher: ["/student/:path*", "/coach/:path*", "/head-coach/:path*", "/program-manager/:path*"],
}

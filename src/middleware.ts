import { auth } from "@/lib/auth"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isProtectedRoute = req.nextUrl.pathname.startsWith("/student") ||
                           req.nextUrl.pathname.startsWith("/coach") ||
                           req.nextUrl.pathname.startsWith("/head-coach") ||
                           req.nextUrl.pathname.startsWith("/program-manager")

  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname)
    return Response.redirect(loginUrl)
  }

  return
})

export const config = {
  matcher: ["/student/:path*", "/coach/:path*", "/head-coach/:path*", "/program-manager/:path*"],
}

import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { prisma } from "./prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required")
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email as string,
          },
        })

        if (!user || !user.password) {
          throw new Error("Invalid credentials")
        }

        const isPasswordValid = await compare(
          credentials.password as string,
          user.password
        )

        if (!isPasswordValid) {
          throw new Error("Invalid credentials")
        }

        if (!user.approved) {
          throw new Error("NOT_APPROVED")
        }

        if (!user.active) {
          throw new Error("INACTIVE")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          approved: user.approved,
          active: user.active,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Initial sign-in — populate token from authorize() return value
        // NOTE: Do NOT add Prisma calls here — this callback runs in the
        // Edge middleware which doesn't support the standard Prisma client.
        token.id = user.id as string
        token.role = (user as any).role as string
        token.approved = (user as any).approved as boolean
        token.active = (user as any).active as boolean
      }
      return token
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          role: token.role as string,
          approved: token.approved as boolean,
          active: token.active as boolean,
        },
      }
    },
  },
})

// Extend the built-in session types
declare module "next-auth" {
  interface User {
    role: string
    approved: boolean
    active: boolean
  }
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      approved: boolean
      active: boolean
    }
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string
    role: string
    approved: boolean
    active: boolean
  }
}

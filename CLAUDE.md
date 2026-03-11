# Submission Tracker — Claude Code Guide

## Project Overview
A Next.js 16 web app for tracking student workbook submissions through a multi-role review workflow (Student → Coach → Head Coach → Program Manager).

## Tech Stack
- **Framework:** Next.js 16 (App Router), TypeScript, React 19
- **Database:** PostgreSQL via Prisma 5.22
- **Auth:** NextAuth v5 (JWT sessions, credentials provider, bcryptjs)
- **UI:** shadcn/ui, Radix UI, Tailwind CSS v4, Lucide React
- **Forms:** React Hook Form + Zod v4
- **Email:** Resend + React Email
- **Deployment:** Vercel

## Project Structure
```
src/
  app/
    (auth)/           # Login, signup, forgot-password, reset-password
    (dashboard)/
      student/        # Student dashboard + submit
      coach/          # Coach review dashboard
      head-coach/     # Head coach review dashboard
      program-manager/# Program manager dashboard
    api/
      auth/           # NextAuth handlers
      submissions/    # CRUD for submissions ([id]/route.ts, route.ts)
      users/          # User management (students, coaches, staff, pending, launch-info)
      stats/          # Dashboard stats
      cron/           # Scheduled jobs (auto-deactivation, etc.)
  components/
    ui/               # shadcn/ui components
    Providers.tsx     # Session provider wrapper
    SignOutButton.tsx
  lib/
    auth.ts           # NextAuth config + session helpers
    prisma.ts         # Prisma client singleton
    email.ts          # Resend email helpers
    utils.ts          # cn() and other utilities
  middleware.ts       # Route protection by role
prisma/
  schema.prisma
  migrations/
```

## Domain Models

### User Roles
- `STUDENT` — submits workbooks, assigned to a coach and class
- `COACH` — reviews student submissions, provides feedback
- `HEAD_COACH` — second-level review after coach approval
- `PROGRAM_MANAGER` — manages all users, views all submissions

### Student Classes
`PRE_CLARITY` → `STRATEGY_CLASS` → `FUNNEL_CLASS` → `LAUNCH_CLASS`

### Submission Workflow
```
PENDING → COACH_REVIEW → HEAD_COACH_REVIEW → APPROVED
                    ↘ NEEDS_CORRECTION ↙
```

### Key Fields (Submission)
- `weekNumber` (1–8), `workbookTitle`, `workbookUrl`
- `coachFeedback`, `headCoachFeedback`
- `submittedAt`, `reviewedAt`, `headReviewedAt`

## Development Commands
```bash
npm run dev        # Start dev server
npm run build      # prisma generate + next build
npm run lint       # ESLint
```

## Environment Variables Required
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — Auth secret
- `RESEND_API_KEY` — Email sending

## Key Conventions
- Role-based route protection in `src/middleware.ts`
- Prisma client imported from `src/lib/prisma.ts` (singleton pattern)
- Auth session accessed via `auth()` from `src/lib/auth.ts`
- shadcn/ui components live in `src/components/ui/`
- API routes follow Next.js App Router conventions (`route.ts`)

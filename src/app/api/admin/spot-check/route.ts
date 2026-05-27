import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Returns a sample of staging students to confirm niche/launch-info fields exist.
// Protected by CRON_SECRET — never exposes PII in error messages.
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      select: {
        id: true,
        name: true,
        studentClass: true,
        launchStrategy: true,
        launchPricing: true,
        launchEventTopic: true,
        launchInfoStatus: true,
        niche: true,
      },
      take: 5,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      ok: true,
      totalStudentsQueried: students.length,
      // Show field presence (true/false) so no PII leaks in logs if this is captured
      sample: students.map((s) => ({
        id: s.id,
        name: s.name,
        studentClass: s.studentClass,
        hasLaunchStrategy: s.launchStrategy !== null,
        launchStrategy: s.launchStrategy,
        hasLaunchPricing: s.launchPricing !== null,
        launchPricing: s.launchPricing,
        hasLaunchEventTopic: s.launchEventTopic !== null,
        hasNiche: s.niche !== null,
        niche: s.niche,
        launchInfoStatus: s.launchInfoStatus,
      })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal_error"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

// Integration test runner for ai helper functions that don't need a service account.
// Tests: weekCriteriaLookup (all week/strategy combos + loud-error case)
//        assembleLaunchInfo (all field combinations)
//        parseDocUrl (all URL formats)
//        deriveReviewerStrategy (all input combos)
//
// GET /api/admin/test-ai-helpers
// Header: Authorization: Bearer <CRON_SECRET>
//
// Returns a structured test report with pass/fail per case.

import { NextResponse } from "next/server"
import { lookupWeekCriteria, deriveReviewerStrategy } from "@/lib/ai/weekCriteriaLookup"
import { assembleLaunchInfo } from "@/lib/ai/assembleLaunchInfo"
import { parseDocUrl } from "@/lib/ai/fetchDocText"

type TestResult = { name: string; pass: boolean; detail: string }

async function runLookupTests(): Promise<TestResult[]> {
  const results: TestResult[] = []

  // All (week, strategy) combinations that must return rows
  const cases: Array<{ week: number; strategy: string; minRows: number; label: string }> = [
    { week: 2, strategy: "free_event",         minRows: 2, label: "W2 free_event (AIDA + Storytelling)" },
    { week: 2, strategy: "pwyw_or_low_ticket", minRows: 1, label: "W2 pwyw_or_low_ticket (Sales page)" },
    { week: 2, strategy: "evergreen",          minRows: 1, label: "W2 evergreen (VSL)" },
    { week: 3, strategy: "free_event",         minRows: 2, label: "W3 free_event (null-strategy rows)" },
    { week: 3, strategy: "pwyw_or_low_ticket", minRows: 2, label: "W3 pwyw_or_low_ticket (null-strategy rows)" },
    { week: 3, strategy: "evergreen",          minRows: 2, label: "W3 evergreen (null-strategy rows)" },
    { week: 4, strategy: "free_event",         minRows: 1, label: "W4 free_event (null-strategy row)" },
    { week: 4, strategy: "pwyw_or_low_ticket", minRows: 1, label: "W4 pwyw_or_low_ticket (null-strategy row)" },
    { week: 4, strategy: "evergreen",          minRows: 1, label: "W4 evergreen (null-strategy row)" },
    { week: 5, strategy: "free_event",         minRows: 1, label: "W5 free_event (live sequence)" },
    { week: 5, strategy: "pwyw_or_low_ticket", minRows: 1, label: "W5 pwyw_or_low_ticket (live sequence)" },
    { week: 5, strategy: "evergreen",          minRows: 1, label: "W5 evergreen (evergreen sequence)" },
    { week: 6, strategy: "free_event",         minRows: 4, label: "W6 free_event (null-strategy: webinar + 3 sales pages)" },
    { week: 6, strategy: "pwyw_or_low_ticket", minRows: 4, label: "W6 pwyw_or_low_ticket (null-strategy: webinar + 3 sales pages)" },
    { week: 6, strategy: "evergreen",          minRows: 4, label: "W6 evergreen (null-strategy: webinar + 3 sales pages)" },
    { week: 7, strategy: "free_event",         minRows: 1, label: "W7 free_event (post-webinar sales emails)" },
    { week: 7, strategy: "pwyw_or_low_ticket", minRows: 1, label: "W7 pwyw_or_low_ticket (post-webinar sales emails)" },
  ]

  for (const c of cases) {
    try {
      const rows = await lookupWeekCriteria({ weekNumber: c.week, launchStrategy: c.strategy })
      const pass = rows.length >= c.minRows
      results.push({
        name: c.label,
        pass,
        detail: pass
          ? `${rows.length} row(s) returned (expected ≥${c.minRows}): ${rows.map((r) => r.templateVariant ?? r.deliverableName).join(", ")}`
          : `Only ${rows.length} row(s) returned, expected ≥${c.minRows}`,
      })
    } catch (e: unknown) {
      results.push({ name: c.label, pass: false, detail: `Threw: ${(e as Error).message}` })
    }
  }

  // W7 evergreen must return 0 rows AND throw loudly (evergreen students have no Week 7)
  try {
    await lookupWeekCriteria({ weekNumber: 7, launchStrategy: "evergreen" })
    results.push({
      name: "W7 evergreen — should throw loud error",
      pass: false,
      detail: "Did NOT throw — silent empty result, this is the bug we're guarding against",
    })
  } catch (e: unknown) {
    const msg = (e as Error).message
    results.push({
      name: "W7 evergreen — loud error on nonexistent combo",
      pass: true,
      detail: `Threw as expected: "${msg}"`,
    })
  }

  // Variant-specific lookup: W2 free_event aida
  try {
    const rows = await lookupWeekCriteria({
      weekNumber: 2,
      launchStrategy: "free_event",
      templateVariant: "aida",
    })
    const pass = rows.length === 1 && rows[0].templateVariant === "aida"
    results.push({
      name: "W2 free_event templateVariant=aida (single row)",
      pass,
      detail: pass ? `Got 1 row: templateVariant="${rows[0].templateVariant}"` : `Got ${rows.length} rows`,
    })
  } catch (e: unknown) {
    results.push({ name: "W2 free_event templateVariant=aida", pass: false, detail: `Threw: ${(e as Error).message}` })
  }

  // Nonexistent combination must throw
  try {
    await lookupWeekCriteria({ weekNumber: 99, launchStrategy: "free_event" })
    results.push({
      name: "Week 99 — should throw loud error",
      pass: false,
      detail: "Did NOT throw — silent empty result",
    })
  } catch (e: unknown) {
    results.push({
      name: "Week 99 — loud error on nonexistent combination",
      pass: true,
      detail: `Threw as expected: "${(e as Error).message}"`,
    })
  }

  return results
}

function runAssemblyTests(): TestResult[] {
  const results: TestResult[] = []

  // Full fields
  const full = assembleLaunchInfo({
    niche: "Female coaches 35–50 who want to launch online",
    launchStrategy: "Webinar",
    launchPricing: "Free",
    launchPrice: null,
    launchEventTopic: "How to get your first 3 high-ticket clients",
    approvedEventTitle: "The 3-Step Client Attraction Masterclass",
  })
  const fullPass = !!(
    full?.includes("Female coaches") &&
    full?.includes("Webinar") &&
    full?.includes("Free") &&
    full?.includes("3-Step Client Attraction") &&
    full?.includes("3 high-ticket clients")
  )
  results.push({ name: "Assembly — all fields present", pass: fullPass, detail: fullPass ? "All fields present in output" : `Output: ${full}` })

  // Paid pricing includes price
  const paid = assembleLaunchInfo({
    niche: "Fitness coaches",
    launchStrategy: "Workshop",
    launchPricing: "Low Ticket",
    launchPrice: "47",
    launchEventTopic: "Weight loss for busy mums",
    approvedEventTitle: null,
  })
  const paidPass = paid?.includes("Low Ticket ($47)") ?? false
  results.push({ name: "Assembly — paid pricing includes price", pass: paidPass, detail: paidPass ? "Pricing formatted as 'Low Ticket ($47)'" : `Output: ${paid}` })

  // No approved title → section absent
  const noTitle = assembleLaunchInfo({
    niche: "Business owners",
    launchStrategy: "Webinar",
    launchPricing: "Free",
    launchPrice: null,
    launchEventTopic: "Marketing fundamentals",
    approvedEventTitle: null,
  })
  const noTitlePass = !(noTitle?.includes("Approved Event Title"))
  results.push({ name: "Assembly — null approvedEventTitle excluded", pass: noTitlePass, detail: noTitlePass ? "Approved Event Title line absent" : `Output: ${noTitle}` })

  // Fully empty → null
  const empty = assembleLaunchInfo({
    niche: null,
    launchStrategy: null,
    launchPricing: null,
    launchPrice: null,
    launchEventTopic: null,
    approvedEventTitle: null,
  })
  results.push({ name: "Assembly — all null fields returns null", pass: empty === null, detail: empty === null ? "Returned null" : `Returned: "${empty}"` })

  return results
}

function runUrlParsingTests(): TestResult[] {
  const results: TestResult[] = []

  const cases: Array<{ url: string; expectDocId: string; expectFileType: string; label: string }> = [
    {
      label: "Google Doc edit URL",
      url: "https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit",
      expectDocId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
      expectFileType: "doc",
    },
    {
      label: "Google Doc edit URL with ?usp=sharing",
      url: "https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit?usp=sharing",
      expectDocId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
      expectFileType: "doc",
    },
    {
      label: "Google Doc view URL",
      url: "https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/view",
      expectDocId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
      expectFileType: "doc",
    },
    {
      label: "Google Slides edit URL",
      url: "https://docs.google.com/presentation/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit",
      expectDocId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
      expectFileType: "slides",
    },
    {
      label: "Google Slides view URL",
      url: "https://docs.google.com/presentation/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/view?usp=sharing",
      expectDocId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
      expectFileType: "slides",
    },
    {
      label: "Drive file link /view",
      url: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/view",
      expectDocId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
      expectFileType: "unknown",
    },
    {
      label: "Drive open?id= URL",
      url: "https://drive.google.com/open?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
      expectDocId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
      expectFileType: "unknown",
    },
  ]

  for (const c of cases) {
    const result = parseDocUrl(c.url)
    if ("error" in result) {
      results.push({ name: c.label, pass: false, detail: `Parse failed: ${result.error}` })
    } else {
      const pass = result.docId === c.expectDocId && result.fileType === c.expectFileType
      results.push({
        name: c.label,
        pass,
        detail: pass
          ? `docId="${result.docId}" fileType="${result.fileType}"`
          : `Got docId="${result.docId}" fileType="${result.fileType}" — expected docId="${c.expectDocId}" fileType="${c.expectFileType}"`,
      })
    }
  }

  // Malformed URLs that must return errors
  const badCases = [
    { label: "Empty string", url: "" },
    { label: "Non-Google URL", url: "https://notion.so/some-page" },
    { label: "Short ID (< 25 chars)", url: "https://docs.google.com/document/d/abc123/edit" },
    { label: "Garbage string", url: "not a url at all" },
  ]

  for (const c of badCases) {
    const result = parseDocUrl(c.url)
    const pass = "error" in result
    results.push({
      name: `URL parse error — ${c.label}`,
      pass,
      detail: pass ? `Correctly returned error: "${result.error}"` : `Incorrectly parsed: docId="${(result as { docId: string }).docId}"`,
    })
  }

  return results
}

function runStrategyDerivationTests(): TestResult[] {
  const cases: Array<{
    label: string
    strategy: string | null
    pricing: string | null
    expected: string
  }> = [
    { label: "Webinar + Free → free_event",            strategy: "Webinar",      pricing: "Free",            expected: "free_event" },
    { label: "Workshop + Free → free_event",           strategy: "Workshop",     pricing: "Free",            expected: "free_event" },
    { label: "Webinar + Pay What You Want → pwyw",     strategy: "Webinar",      pricing: "Pay What You Want", expected: "pwyw_or_low_ticket" },
    { label: "Workshop + Low Ticket → pwyw",           strategy: "Workshop",     pricing: "Low Ticket",      expected: "pwyw_or_low_ticket" },
    { label: "Evergreen VSL + any pricing → evergreen", strategy: "Evergreen VSL", pricing: "Free",           expected: "evergreen" },
    { label: "null strategy + Free → free_event",      strategy: null,           pricing: "Free",            expected: "free_event" },
  ]

  return cases.map((c) => {
    const result = deriveReviewerStrategy(c.strategy, c.pricing)
    const pass = result === c.expected
    return {
      name: c.label,
      pass,
      detail: pass ? `Correctly derived "${result}"` : `Got "${result}", expected "${c.expected}"`,
    }
  })
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") ?? ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const urlParsing      = runUrlParsingTests()
  const strategyDerive  = runStrategyDerivationTests()
  const assembly        = runAssemblyTests()
  const lookup          = await runLookupTests()

  const all = [...urlParsing, ...strategyDerive, ...assembly, ...lookup]
  const passed = all.filter((r) => r.pass).length
  const failed = all.filter((r) => !r.pass).length

  return NextResponse.json({
    summary: { total: all.length, passed, failed },
    sections: {
      urlParsing:          { passed: urlParsing.filter((r) => r.pass).length,      total: urlParsing.length,      results: urlParsing },
      strategyDerivation:  { passed: strategyDerive.filter((r) => r.pass).length,  total: strategyDerive.length,  results: strategyDerive },
      assemblyHelper:      { passed: assembly.filter((r) => r.pass).length,        total: assembly.length,        results: assembly },
      lookupHelper:        { passed: lookup.filter((r) => r.pass).length,          total: lookup.length,          results: lookup },
    },
  })
}

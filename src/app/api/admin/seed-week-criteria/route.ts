import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Pattern texts — verbatim from LaunchSmart rubric doc
const P_W2_FREE_AIDA = `LAUNCH EMAIL REVIEW CRITERIA – Week 2 (Free Event | AIDA Framework)

STRUCTURE CHECK
□ Subject line present and compelling (creates curiosity or urgency)
□ Opening hook addresses a pain point or desire within first 2 sentences
□ Body follows AIDA: Attention → Interest → Desire → Action
□ Single clear CTA with registration link
□ Email length appropriate (300–600 words for free event)

NICHE ALIGNMENT
□ Pain points and language match the student's stated niche
□ Event topic connects logically to the niche problem being solved
□ Language matches the sophistication level of the target audience

CONTENT QUALITY
□ No generic filler phrases ("In today's fast-paced world…")
□ Specific outcome or transformation promised, not vague benefits
□ Sender voice is consistent throughout
□ No spelling or grammar errors that undermine credibility

TRIAGE LOGIC
proceed → All structure checks pass, niche alignment strong, content specific
hold → Missing CTA, generic language throughout, niche mismatch, or email reads as AI-generated template with no personalization`

const P_W2_FREE_STORY = `LAUNCH EMAIL REVIEW CRITERIA – Week 2 (Free Event | Storytelling Framework)

STRUCTURE CHECK
□ Subject line present — ideally story-driven or curiosity-gap
□ Story opens with a relatable struggle or turning-point moment
□ Narrative arc: problem → journey → transformation → invitation
□ Bridge from personal story to audience's situation is explicit
□ Single clear CTA with registration link
□ Email length appropriate (400–700 words for story format)

NICHE ALIGNMENT
□ Story protagonist's problem mirrors target audience's problem
□ Transformation achieved is the transformation the niche desires
□ Language and tone match the niche community's voice

CONTENT QUALITY
□ Story feels personal and specific, not fabricated or generic
□ Emotional moments are shown, not told ("I cried at 2am" not "I was very sad")
□ Transition from story to CTA is natural, not abrupt
□ No spelling or grammar errors

TRIAGE LOGIC
proceed → Story is specific and personal, niche-aligned, clean CTA present
hold → Story feels generic/fabricated, no clear niche connection, missing CTA, or structural arc broken`

const P_W2_PWYW_SALES = `LAUNCH EMAIL REVIEW CRITERIA – Week 2 (PWYW or Low-Ticket | Sales Email)

STRUCTURE CHECK
□ Subject line present — benefit-driven or curiosity-gap
□ Opening establishes what's being offered within first paragraph
□ Price anchor present (state value, then PWYW or low-ticket price)
□ Objection handling present (at least one "you might be thinking…" reframe)
□ Urgency or scarcity element present (deadline, limited spots, or enrollment window)
□ Single clear CTA with purchase/registration link
□ Email length appropriate (400–800 words for paid offer)

NICHE ALIGNMENT
□ Offer is clearly relevant to the niche's core desire or problem
□ Language matches sophistication of paying audience
□ Price point is congruent with niche's typical willingness to pay

CONTENT QUALITY
□ Value proposition is specific (what they'll walk away with)
□ Testimonial or social proof present (even if hypothetical/early-stage placeholder)
□ No vague outcome language ("transform your life")
□ No spelling or grammar errors

TRIAGE LOGIC
proceed → Price anchor present, value prop specific, niche-aligned, CTA clear
hold → No price anchor, no urgency, generic value prop, or niche mismatch`

const P_W2_EVERGREEN_VSL = `LAUNCH EMAIL REVIEW CRITERIA – Week 2 (Evergreen | VSL Drive Email)

STRUCTURE CHECK
□ Subject line present — curiosity or benefit-driven
□ Purpose of email is clear: driving to a video/VSL, not a live event
□ Brief context for the video (what they'll learn/see) present
□ Single clear CTA pointing to VSL URL
□ Email length appropriate (200–400 words — shorter for VSL drive)

NICHE ALIGNMENT
□ VSL topic matches the student's stated niche and offer
□ Language mirrors evergreen audience (less urgency language, more value-access framing)
□ Audience sophistication level reflected in vocabulary

CONTENT QUALITY
□ No fabricated testimonials or false urgency (evergreen must feel authentic)
□ Video hook or preview described to drive curiosity
□ No spelling or grammar errors

TRIAGE LOGIC
proceed → VSL drive purpose clear, niche-aligned, CTA present, appropriate tone
hold → Reads like live-event email, no VSL context, niche mismatch, or no CTA`

const P_W3_AD_COPY = `AD COPY REVIEW CRITERIA – Week 3

STRUCTURE CHECK
□ Hook line (first 1–2 sentences) stops the scroll — pattern interrupt present
□ Body copy present: problem agitation or desire amplification
□ CTA present and specific ("Click to register" / "Grab your spot" — not just "Learn more")
□ Ad copy length within platform norms (Facebook: 125 chars primary text, headlines ≤40 chars; check if specified)

NICHE ALIGNMENT
□ Hook speaks directly to the niche's pain or aspiration — not generic
□ Language matches target audience (vocabulary, tone, familiarity)
□ Offer/event in ad matches what student is actually launching

CONTENT QUALITY
□ No false claims or income guarantees
□ No prohibited ad language (Facebook policy compliance: no "you" in some contexts, no before/after weight loss, etc.)
□ Call-to-action verb is strong and specific
□ No spelling or grammar errors

TRIAGE LOGIC
proceed → Hook specific to niche, CTA clear, copy length appropriate, no policy red flags
hold → Generic hook (could apply to any niche), missing CTA, policy violation risk, or niche mismatch`

const P_W3_AD_VIDEO = `AD VIDEO SCRIPT REVIEW CRITERIA – Week 3

STRUCTURE CHECK
□ Opening hook present (first 3 seconds must stop the scroll — visual or spoken)
□ Problem or desire established within first 10 seconds
□ Value proposition stated (what the viewer gains by watching/clicking)
□ CTA present at end and ideally mid-video
□ Script length appropriate (30–90 seconds for awareness/traffic ads)

NICHE ALIGNMENT
□ Opening hook speaks to niche-specific pain or aspiration
□ Examples and language used throughout reflect the niche
□ Visual direction notes (if included) align with niche aesthetic

CONTENT QUALITY
□ Script reads naturally when spoken aloud (not stiff/overly formal)
□ No income claims or unrealistic transformation promises
□ Transitions between sections are smooth
□ No spelling or grammar errors in script

TRIAGE LOGIC
proceed → Hook specific, niche-aligned throughout, CTA present, script length appropriate
hold → Hook is generic, niche unclear, no CTA, or script length significantly off-target`

const P_W4_CORE_OFFER = `CORE OFFER REVIEW CRITERIA – Week 4

STRUCTURE CHECK
□ Offer name present
□ Target audience clearly defined (who this is for)
□ Core promise / transformation stated (what they'll achieve)
□ Deliverables listed (what's included)
□ Price point stated
□ Timeline stated (how long it takes / duration of program)

NICHE ALIGNMENT
□ Offer solves the core problem of the student's stated niche
□ Target audience description matches the niche
□ Transformation promised is the transformation the niche desires most
□ Price point is congruent with niche's purchasing power and offer category

CONTENT QUALITY
□ Promise is specific and outcome-oriented (not "support" or "guidance")
□ Deliverables are concrete (sessions, templates, resources — not vague "coaching")
□ No false scarcity or guarantees that can't be honoured
□ Language is clear and jargon-free for the intended audience

TRIAGE LOGIC
proceed → All structure elements present, niche-aligned, promise specific
hold → Missing core elements (no price, no deliverables, no timeline), niche mismatch, or promise vague/undeliverable`

const P_W5_LIVE = `LAUNCH STRATEGY REVIEW CRITERIA – Week 5 (Live Launch: Free Event or PWYW/Low-Ticket)

STRUCTURE CHECK
□ Launch window dates defined (start → end)
□ Warm-up / pre-launch phase outlined
□ Event/offer delivery date(s) specified
□ Follow-up sequence mentioned (post-event emails or DM strategy)
□ Traffic source(s) identified (organic, paid, referral)

NICHE ALIGNMENT
□ Launch format (webinar/workshop/challenge) is appropriate for the niche audience behaviour
□ Timeline is realistic for the student's current audience size and warmth
□ Traffic strategy is plausible for the niche (e.g., Instagram for visual niches, LinkedIn for B2B)

CONTENT QUALITY
□ Dates are specific (not "sometime in June")
□ Responsibilities are clear (what the student personally executes)
□ Contingency or backup not required — but if present, must be realistic
□ No copy-paste generic launch plan language

TRIAGE LOGIC
proceed → Launch window defined, traffic source identified, format fits niche, dates specific
hold → No dates, no traffic strategy, format misaligned with niche, or plan is clearly a template with no personalisation`

const P_W5_EVERGREEN = `LAUNCH STRATEGY REVIEW CRITERIA – Week 5 (Evergreen Funnel)

STRUCTURE CHECK
□ Funnel entry point defined (lead magnet, VSL, opt-in offer)
□ Email sequence length stated (minimum 5 emails outlined)
□ Conversion mechanism identified (application, sales page, booking link)
□ Traffic strategy defined (how leads enter the funnel)
□ Funnel tool/platform named (MailerLite, ConvertKit, etc.)

NICHE ALIGNMENT
□ Lead magnet topic is directly relevant to niche core problem
□ Email sequence nurture topics match niche audience journey
□ Conversion mechanism is appropriate for niche's buying behaviour

CONTENT QUALITY
□ Each funnel stage has a named purpose (not just "email 1, email 2")
□ Traffic strategy is plausible for the student's current situation
□ No placeholder text or vague references to "content"
□ Platform choice is realistic (student has/can set up this tool)

TRIAGE LOGIC
proceed → Funnel stages defined, traffic strategy present, niche-aligned, platform named
hold → Missing funnel stages, no traffic strategy, generic/template content, or niche mismatch`

const P_W6_WEBINAR = `WEBINAR / WORKSHOP OUTLINE REVIEW CRITERIA – Week 6 (Free Event Launch Strategies)

STRUCTURE CHECK
□ Title and event positioning present
□ Introduction / credibility section outlined
□ Teaching content sections present (minimum 3 content points)
□ Pitch / offer transition section present
□ Q&A or close section present
□ Estimated timing breakdown present (or at least section order)

NICHE ALIGNMENT
□ Teaching content directly solves niche-specific problems
□ Offer pitched is congruent with the teaching content (natural bridge)
□ Language and examples throughout are niche-specific

CONTENT QUALITY
□ Content delivers genuine value (not a 60-minute pitch disguised as training)
□ Teaching-to-pitch ratio appropriate (aim: 70% value / 30% pitch or better)
□ Transition from teaching to offer is clear and non-jarring
□ No vague section titles ("Important stuff" / "The good part")

TRIAGE LOGIC
proceed → All structural sections present, niche-specific content, offer bridge natural
hold → Missing pitch section, no niche-specific content, teaching-to-pitch ratio inverted, or section titles are vague placeholders`

const P_W6_LONG_FORM = `SALES PAGE REVIEW CRITERIA – Week 6 (Long-Form Sales Copy)

STRUCTURE CHECK
□ Headline present and promise-driven
□ Sub-headline or deck present
□ Problem / agitation section present
□ Solution introduction present
□ Features and benefits section present
□ Social proof / testimonials section present (placeholder acceptable for first launch)
□ Offer details section (what's included, price, bonuses)
□ Guarantee present (even simple satisfaction guarantee)
□ FAQ section present
□ CTA button present (minimum 2: above fold and end of page)

NICHE ALIGNMENT
□ Headline speaks to niche's primary desire or pain
□ Problem section uses niche-specific language and scenarios
□ Benefits are framed in terms of niche-specific outcomes

CONTENT QUALITY
□ Headline is specific — not generic ("Transform Your Life")
□ Benefits are outcome-based, not feature-based where possible
□ Testimonials (or placeholders) are specific, not vague praise
□ No legally problematic income claims or guarantees
□ No spelling or grammar errors

TRIAGE LOGIC
proceed → All major sections present, niche-specific language, headline specific
hold → Missing headline, no offer details, no CTA, generic throughout, or legal red flags`

const P_W6_DESIRE_STACK = `SALES PAGE REVIEW CRITERIA – Week 6 (Desire Stack)

STRUCTURE CHECK
□ Opening desire statement present (aspirational, not pain-focused)
□ Stack of desires/outcomes listed (minimum 5 desire statements)
□ Each desire statement is specific and vivid
□ Offer bridge present (connecting desires to the product)
□ Offer details present (name, price, what's included)
□ CTA present

NICHE ALIGNMENT
□ Desires listed match the core desires of the target niche
□ Language and specificity match niche sophistication
□ Offer bridge connects desires to what the product actually delivers

CONTENT QUALITY
□ Desire statements are emotional and outcome-specific (not feature-based)
□ Repetition is intentional and rhythmic, not redundant
□ No income guarantees or false claims
□ CTA is action-oriented

TRIAGE LOGIC
proceed → Desire stack present (5+), niche-aligned desires, offer bridge clear, CTA present
hold → Fewer than 5 desires, desires are generic/feature-based, no offer bridge, or no CTA`

const P_W6_THREE_STEP = `SALES PAGE REVIEW CRITERIA – Week 6 (Three-Step / Even If Framework)

STRUCTURE CHECK
□ Three-step process clearly named and numbered
□ Each step has a name and brief description (1–3 sentences)
□ "Even if" objection-busters present (minimum 3)
□ Each "even if" addresses a real objection for the niche
□ Offer details present (name, price, what's included)
□ CTA present

NICHE ALIGNMENT
□ Three steps reflect the actual journey the niche needs to take
□ "Even if" objections are the real objections this niche has
□ Language throughout matches niche sophistication and vocabulary

CONTENT QUALITY
□ Steps are sequential and logical (not parallel or overlapping)
□ "Even if" statements are empathetic, not dismissive
□ Offer details are specific
□ No income guarantees
□ CTA is action-oriented

TRIAGE LOGIC
proceed → Three steps logical and named, 3+ even-if objections present, niche-specific, CTA clear
hold → Steps aren't sequential, fewer than 3 even-ifs, generic objections not niche-specific, or no CTA`

const P_W7_LIVE = `POST-LAUNCH REVIEW CRITERIA – Week 7 (Live Launch Strategies)

STRUCTURE CHECK
□ Launch results summary present (registrations, attendees, sales — even if zeros)
□ What worked section present (minimum 2 observations)
□ What didn't work section present (minimum 2 observations)
□ Key learnings articulated (what they'd do differently)
□ Next steps or decision stated (re-run, pivot, continue to evergreen, etc.)

NICHE ALIGNMENT
□ Analysis connects results to niche-specific factors (not just generic "need more traffic")
□ Learnings demonstrate understanding of niche audience behaviour

CONTENT QUALITY
□ Numbers are specific (not "a few registrations" — actual numbers)
□ Observations are honest — not defensive or overly optimistic without basis
□ Learnings are actionable (not "try harder next time")
□ Next steps are concrete and time-bound where possible

TRIAGE LOGIC
proceed → Results with real numbers, honest what-worked/didn't analysis, actionable learnings
hold → No numbers, analysis is vague or defensive, learnings not actionable, or next steps absent`

interface WeekCriteriaRow {
  id: string
  weekNumber: number
  launchStrategy: string | null
  deliverableName: string
  templateVariant: string | null
  templatePattern: string
  sourceDocUrl: string | null
  createdAt: Date
  updatedAt: Date
}

function makeRow(
  id: string,
  weekNumber: number,
  launchStrategy: string | null,
  deliverableName: string,
  templateVariant: string | null,
  templatePattern: string,
): WeekCriteriaRow {
  const now = new Date()
  return {
    id,
    weekNumber,
    launchStrategy,
    deliverableName,
    templateVariant,
    templatePattern,
    sourceDocUrl: null,
    createdAt: now,
    updatedAt: now,
  }
}

const SEED_ROWS: WeekCriteriaRow[] = [
  makeRow("wc_w2_free_aida",   2, "free_event",         "launch_email",     "aida",               P_W2_FREE_AIDA),
  makeRow("wc_w2_free_story",  2, "free_event",         "launch_email",     "storytelling",       P_W2_FREE_STORY),
  makeRow("wc_w2_pwyw_sales",  2, "pwyw_or_low_ticket", "launch_email",     null,                 P_W2_PWYW_SALES),
  makeRow("wc_w2_eg_vsl",      2, "evergreen",          "launch_email",     null,                 P_W2_EVERGREEN_VSL),
  makeRow("wc_w3_ad_copy",     3, null,                 "ad_creative",      "ad_copy",            P_W3_AD_COPY),
  makeRow("wc_w3_ad_video",    3, null,                 "ad_creative",      "ad_video",           P_W3_AD_VIDEO),
  makeRow("wc_w4_core_offer",  4, null,                 "core_offer",       null,                 P_W4_CORE_OFFER),
  makeRow("wc_w5_live_free",   5, "free_event",         "launch_strategy",  null,                 P_W5_LIVE),
  makeRow("wc_w5_live_pwyw",   5, "pwyw_or_low_ticket", "launch_strategy",  null,                 P_W5_LIVE),
  makeRow("wc_w5_evergreen",   5, "evergreen",          "launch_strategy",  null,                 P_W5_EVERGREEN),
  makeRow("wc_w6_webinar_fe",  6, "free_event",         "sales_asset",      "webinar",            P_W6_WEBINAR),
  makeRow("wc_w6_long_form",   6, "pwyw_or_low_ticket", "sales_asset",      "long_form",          P_W6_LONG_FORM),
  makeRow("wc_w6_desire",      6, "pwyw_or_low_ticket", "sales_asset",      "desire_stack",       P_W6_DESIRE_STACK),
  makeRow("wc_w6_three_step",  6, "pwyw_or_low_ticket", "sales_asset",      "three_step_even_if", P_W6_THREE_STEP),
  makeRow("wc_w7_live_free",   7, "free_event",         "post_launch",      null,                 P_W7_LIVE),
  makeRow("wc_w7_live_pwyw",   7, "pwyw_or_low_ticket", "post_launch",      null,                 P_W7_LIVE),
]

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await prisma.weekCriteria.deleteMany()
    await prisma.weekCriteria.createMany({ data: SEED_ROWS })
    const count = await prisma.weekCriteria.count()

    // Spot-check: read back the AIDA row and verify key content
    const aidaRow = await prisma.weekCriteria.findUnique({
      where: { id: "wc_w2_free_aida" },
      select: { id: true, weekNumber: true, launchStrategy: true, templateVariant: true },
    })

    return NextResponse.json({
      ok: true,
      rowsSeeded: count,
      expectedRows: 16,
      aidaSpotCheck: aidaRow,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

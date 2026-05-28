"""
staging_seed_and_check.py
Runs against the staging Neon DB:
  1. Seeds week_criteria with 16 rows
  2. Prints the row table for verification
  3. Prints a student spot-check (no PII in output — field presence only for content fields)

Delete this file after the seed is confirmed.
"""
import psycopg2
import uuid
import sys
from datetime import datetime, timezone

DB_URL = (
    "postgresql://neondb_owner:npg_Jf5pDak8IGLF"
    "@ep-orange-river-ab2berm2-pooler.eu-west-2.aws.neon.tech"
    "/neondb?sslmode=require"
)

# ─── pattern texts (verbatim from prisma/seed.ts) ────────────────────────────

P_W2_FREE_AIDA = """TEMPLATE: AIDA opt-in page (Week 2, free_event)

This is a webinar/workshop/challenge opt-in (registration) page built on the
AIDA structure. The copy must move through four stages in this order. The
reviewer checks that each stage is present and doing its job — NOT that the
student used the template's example wording.

ATTENTION
  - A headline that names the desirable outcome OR the specific problem of the
    student's Level 5 ideal client. Specific and benefit-led, not a vague topic.
  - An opening line showing you understand their exact situation, in a
    conversational voice. Empathy before pitch.

INTEREST
  - States what the reader will learn / walk away with, framed as concrete
    results — not a vague agenda.
  - Explicitly connects those takeaways to the ideal client's actual problem,
    speaking directly to them ("you/your"). The reader should feel "this is
    about my exact situation."

DESIRE
  - Translates features of the event into benefits — what the reader gains and
    the transformation it leads to, not just what the event contains.
  - A clear value-proposition line: the primary benefit of attending, tied to
    the bigger outcome they want.

ACTION
  - One clear, single CTA to register, using an action verb. The reader knows
    exactly what to do next.
  - Handles the obvious hesitations to registering (e.g. "can't attend live"),
    briefly, so nothing blocks the sign-up.

PATTERN REQUIREMENTS
  - The four stages must flow in order; each line should pull the reader to the
    next (no dead ends, no abrupt jumps).
  - This is an OPT-IN page (goal = registration), NOT a sales page. It should
    NOT sell the paid core offer or include pricing. Flag copy that tries to
    sell the core offer here — that's the wrong funnel stage.
  - The whole page must serve the approved launch event from the student's
    launch information.

NOT A PASS CONDITION: matching the template's example copy or stuffing in
"power words." Judge the structure and persuasive function, in the student's
own authentic voice."""

P_W2_FREE_STORY = """TEMPLATE: Storytelling opt-in page (Week 2, free_event — alternative to AIDA)

This is a webinar/workshop/challenge opt-in (registration) page built as a
personal narrative. Same goal as the AIDA opt-in: registration. The difference
is the mechanism — it persuades through the coach's own before/after story
rather than direct benefit copy. The reviewer checks the narrative arc is
present and earning the registration — NOT that the student copied the
template's example story.

HOOK (the painful "before")
  - Opens at a moment of tension in the coach's own past — a specific point
    where they were stuck in the exact problem their Level 5 ideal client now
    faces. Not "a few years ago I was struggling" in the abstract; a real
    moment.
  - The situation must mirror the ideal client's struggle so the reader sees
    themselves in it. If the coach's story doesn't map onto the target
    audience's problem, the whole page misfires — flag this hard.

THE STRUGGLE (make it felt)
  - Concrete, sensory, emotional detail of what that stuck place actually felt
    like — the fear, the thing that kept them up at night, the daily grind.
  - This section earns the trust. Generic emotion ("I felt bad") fails; lived
    specificity passes.

THE TURNING POINT — CONNECTION TO WEBINAR
  - The discovery/method/shift that changed things for the coach.
  - Bridges cleanly from "what worked for me" to "I'll teach you this in the
    webinar." The transition must feel earned by the story, not bolted on.
  - States what the reader will gain, framed as the same transformation the
    coach lived — tied to the ideal client's real desired outcome.

CALL TO ACTION
  - One clear CTA to register, action verb, reader knows exactly what to do.
  - Names the key takeaway/strategy they'll get by attending.

PATTERN REQUIREMENTS
  - The arc must run before → struggle → turning point → invitation, in order,
    each beat pulling to the next.
  - The story must be the coach's OWN and must be truthful. Promised outcomes
    must be achievable.
  - This is an OPT-IN page (goal = registration), NOT a sales page.
  - The whole narrative must serve the approved launch event from the student's
    launch information, and the "before" problem must match their Level 5 Niche.

NOT A PASS CONDITION: matching the template's example stories. Judge the
arc and emotional truth in the student's authentic voice."""

P_W2_PWYW_SALES = """TEMPLATE: Sales copy / direct-response sales page (Week 2, pwyw_or_low_ticket)
[Note: this is the SAME raw template students receive in Week 6. The reviewer
applies the WEEK 2 adjustment below — selling a low-ticket front-end event,
not the core program.]

This is the sales copy for the student's launch event when that event is
pay-what-you-want or low-ticket. It must carry the full persuasion load:
desire → problem → mechanism → proof → offer → urgency.

DESIRE STACK (open here)
  - Names what the ideal client wants, escalating to the most desirable outcome.

THE GAP / PROBLEM
  - States what the prospect needs but can't easily get on their own.

MECHANISM + ORIGIN
  - Why this offer solves what the prospect can't solve alone.
  - The coach's authentic origin and credibility.

BENEFITS (not features)
  - Translates what the offer contains into what the prospect gains.

PROOF (inherited standard — expected and real)
  - Vague — quantify. Invented/inflated — HOLD.

THE OFFER + PRICE FRAMING
  - Clearly names the offer and the price.
  - Frames value against a more expensive alternative.

GUARANTEE
  - Specific, honorable, with a clear condition and process.

CLOSE
  - One clear CTA. Genuine urgency. No fake scarcity.

PATTERN REQUIREMENTS
  - WEEK 2 ADJUSTMENT: sells the LAUNCH EVENT offer (PWYW/low-ticket front-end),
    NOT the high-ticket core program. Flag any page selling the wrong offer.

NOT A PASS CONDITION: matching example wording. Judge the persuasion sequence
in the student's authentic voice."""

P_W2_EVERGREEN_VSL = """TEMPLATE: VSL script (Week 2, evergreen)

On-demand video sales letter for an evergreen funnel with NO live event.
Reviewed as a SCRIPT meant to be spoken and watched.

THE BIG PROMISE (first ~30 seconds)
  - Hook that stops the viewer: names Level 5 audience, desired outcome, obstacle.
  - Clear big-promise statement: specific, BELIEVABLE outcome with timeframe.
  - Written to be spoken — short spoken sentences.

THE CRISIS
  - Amplifies the real cost of the current problem. Vivid and specific.

THE MECHANISM
  - The coach's REAL story and REAL method.
  - HONESTY GATE: no invented "secret discoveries," fake studies, or
    manufactured mechanisms. Flag fabricated mechanisms as HOLD.

PROOF — Vague: quantify. Invented: HOLD.

THE OFFER + VALUE STACK
  - Builds value before price. Honest, defensible values.

RISK REVERSAL — Specific, honorable guarantee.

CALL TO ACTION
  - One clear spoken CTA. Genuine urgency only for evergreen.

PATTERN REQUIREMENTS
  - Arc: promise → crisis → mechanism → proof → offer → CTA.
  - PLATFORM-SAFETY FLAG: no miracle outcome claims.

NOT A PASS CONDITION: matching the example VSL. Judge honest persuasion arc,
spoken quality, and platform safety."""

P_W3_AD_COPY = """TEMPLATE: Ad copy scripts (Week 3, all launch strategies)

Three paid-ad captions, each a different angle, promoting the SAME approved
launch event. Reviewer checks each script AND that the three are genuinely
different angles.

SCRIPT 1 — tired-of / can't-figure-out angle
SCRIPT 2 — benefit-led angle
SCRIPT 3 — problem/agitation-led angle

HOOK STANDARD (make-or-break)
  - Opening line of EACH script must stop the scroll. Three variations of the
    same line = FAIL the angle-variety check.

ANGLE-VARIETY STANDARD (the core Week 3 check)
  - Three genuinely different angles. Two saying effectively the same thing = FAIL.

PROOF — do NOT copy template placeholders. Invented/inflated — HOLD.

CTA + URGENCY — one clear CTA per script. Genuine urgency only.

PLATFORM-SAFETY FLAG (critical — paid captions, highest-risk asset):
  - Flag miracle outcome language and policy-risk wording.

NOT A PASS CONDITION: matching examples. Judge hook and persuasion per script,
variety across the three, proof authenticity, platform safety."""

P_W3_AD_VIDEO = """TEMPLATE: Video script for launch event registration (Week 3, all strategies)

SPOKEN traffic-driving video AD — sends viewers to the opt-in page to register.
Reviewed as a SCRIPT to be spoken on camera.

STRUCTURE A — hook → intro → problem → solution → benefits → proof → CTA
STRUCTURE B — headline → problem agitation → solution → mechanism → benefits →
              proof → objection handling → recap → CTA

HOOK (make-or-break, spoken)
  - Opening line grabs in the first spoken beat. Slow open = FAIL.

CORE ARC
  - Brief, credible self-intro tied to student's OWN niche — NOT the template's
    "CEO of a digital marketing agency" example.
  - Names the specific problem. Presents the EVENT as the solution.
  - Benefits the attendee gains. Proof (real — no placeholders). CTA to register.

PATTERN REQUIREMENTS
  - TRAFFIC-DRIVING video AD — sends to opt-in page.
  - Must NOT pitch the paid core program — wrong funnel stage.
  - Written to be SPOKEN: strong open, short sentences, natural cadence.
  - PLATFORM-SAFETY FLAG: no miracle outcome claims.

NOT A PASS CONDITION: matching the example script or copying Mayowa's agency
positioning. Judge spoken hook, registration arc, real proof, funnel-stage
correctness, platform safety."""

P_W4_CORE_OFFER = """TEMPLATE: Program (core) offer (Week 4, all launch strategies)

The CORE high-ticket offer the student pitches DURING their launch event.
Most consequential deliverable — Weeks 6 and 7 will sell THIS offer.

FUNNEL-POSITION CHECK (do this first)
  - Confirm this is the CORE offer — not a lead magnet, not the free event,
    not a downsell. Wrong funnel layer = HOLD.

THE PROMISE / POSITIONING
  - Program name, duration, EXACT ideal audience (must match Level 5 Niche),
    key outcome. Specific transformation, not vague "grow your business."

VISUAL PROGRESSION (mandatory — make-or-break)
  - Deliverables MUST be broken into modules or weeks showing a step-by-step
    journey. Flat feature list with no sequence = FAIL.
  - Each stage maps to an outcome, not just a topic.

BONUSES — must remove a real objection or accelerate the core result.
VALUE HONESTY — flag absurd/arbitrary "values."

OFFER + PRICE FRAMING — price feels like an obvious yes.
GUARANTEE — specific, honorable, clear condition.
PROOF — real. Invented — HOLD.
ENROLLMENT / CTA — clear next step.

TRIAGE NOTE (Week 4 leans stricter): a flawed core offer poisons Weeks 6–7.
Hold funnel-position errors and off-niche errors here.

NOT A PASS CONDITION: filling every template slot. Judge funnel-position,
visual progression, bonus purpose, value honesty, guarantee honesty, real
proof, and whether the offer is compelling enough to carry the launch."""

P_W5_LIVE = """TEMPLATE: Pre-launch email sequence — LIVE/SCHEDULED (Week 5)
Covers: regular live launch AND pay-what-you-want/low-ticket events.
Both have a REAL shared event date, so urgency is honest and external.

The student submits the full sequence at once. The reviewer judges the sequence
as a SET that escalates toward the live event, plus each email individually.

SEQUENCE LOGIC (the core check — judge the set)
  The sequence must BUILD toward the live event, with two broad phases:
  - BELIEF/NURTURE phase (early emails): distinct jobs — flag repetition.
  - COUNTDOWN phase (final emails): time-anchored reminders escalating to
    the real shared event time.
  FAIL: flat repetition, or countdown emails that don't build real momentum.

URGENCY (honest because the date is real)
  - Time-based claims must match the ACTUAL event date/time.
  - DO flag urgency that ISN'T true.
  - GOAL = registration/attendance for the EVENT. Flag emails trying to close
    the paid core program — wrong funnel stage.

SUBJECT LINES — each earns the open. Countdown subjects carry real time pressure.

EACH EMAIL
  - Alignment: serves the SAME approved event + Level 5 Niche.
  - One clear CTA per email.
  - Story emails must use the student's OWN real story.

PROOF — do NOT copy placeholder student stories. Invented — HOLD.

NOT A PASS CONDITION: matching example emails or hitting a specific email count.
Judge sequence escalation, honest urgency, real proof, correct funnel stage."""

P_W5_EVERGREEN = """TEMPLATE: Pre-webinar / sales email sequence — EVERGREEN (Week 5)

Automated, perpetual sequence — each subscriber enters on their own clock,
NO shared live date. Two phases.

─── PHASE 1: NURTURE ───
Welcome/intro, authority, testimonial+urgency, cost-of-inaction.
Must escalate, not repeat.

─── PHASE 2: SALES EMAILS (15-template menu) ───
Case Study, VIP Backstage, FAQ, Objection Crusher, Cart Open/Last Call,
Flash Sale, Diagnostic, Plot Twist, New Bonus.
Judge each submitted email against ITS type's function.

─── SCARCITY HONESTY GATE (the critical evergreen check) ───
Shared-date language ("tonight," "this Saturday," "ends Friday") in an
evergreen sequence is usually FALSE. Flag and HOLD if central to the email.
Any deadline must be GENUINELY individualized OR tied to a real, true event.
The template instructing students to "give the impression" of rarity is NOT
a license to lie.

─── APPLIES TO ALL EMAILS ───
  - Subject lines: specific, honest.
  - Alignment: approved offer + Level 5 Niche.
  - AUTOMATION VOICE: no references to shared timeline.
  - Proof: real. Invented — HOLD.

NOT A PASS CONDITION: using all 15 templates or copying manufactured scarcity.
Judge each email against its type, scarcity honesty, real proof, alignment."""

P_W6_WEBINAR = """TEMPLATE: Webinar/workshop/challenge presentation (Week 6, all strategies)

LIVE presentation deck — teaches value then pitches the Week 4 core offer.
Reviewed as a PRESENTATION with a live audience.

PRESENTATION FLOW (must be intact and in order)
  1. Hook + authority
  2. The promise / "stay till the end"
  3. Problem agitation + "why you're stuck"
  4. The method/framework — SEE TANGIBLE TEACHING CHECK
  5. Transition into the offer (THE critical moment)
  6. Offer + value stack + bonuses + guarantee
  7. Barriers/objections handled
  8. Close + enrollment + urgency

TANGIBLE TEACHING CHECK (critical)
  FAILURE 1 — Motivation masquerading as teaching:
  - Emotional uplift with no transferable method = FAIL. Quote offending slides.
  FAILURE 2 — Teaching too abstract to act on:
  - Names topics without teaching them. Test: could audience member DO
    something differently after this slide?
  THE STANDARD: at least ONE complete, tangible, implementable quick win.
  Empty motivation teaching = HOLD.

PITCH STRENGTH (core Week 6 check)
  - Teach-to-pitch TRANSITION must feel earned.
  - Offer framed around transformation and cost of NOT acting.
  - Close drives to one clear enrollment action.
  - Pitch too weak to convert = HOLD.

ENGAGEMENT SCAFFOLDING
  - Live prompts (polls, "comment YES/No," chat questions) should be present.
  - Zero interaction in a live deck = flag.

OFFER ALIGNMENT — must be the SAME core offer from Week 4.

VALUE & SCARCITY HONESTY
  - No "exaggerated" values, no fake deadlines.
  - PROOF: real, specific, quantified. Invented — HOLD.

NOT A PASS CONDITION: filling every placeholder. Judge presentation flow,
TANGIBLE TEACHING, PITCH STRENGTH, engagement scaffolding, offer alignment."""

P_W6_LONG_FORM = """TEMPLATE: Core-offer sales page — long-form headline-down (Week 6, variant 1 of 3)

Sells the student's HIGH-TICKET CORE offer (the Week 4 program).
Structure: headline → hook question → offer/solution → proof → price/value →
benefits → pain points → CTA → offer description → bonuses → creator intro →
testimonials → objections → urgency → closing CTA.

THE TWO CORE WEEK 6 SALES-COPY CHECKS
  1. BACK-ALIGNMENT TO WEEK 4 — same audience, transformation, modules, price,
     guarantee. Hold significant drift.
  2. BACK-ALIGNMENT TO WEBINAR — same framing, method name, offer/price/
     guarantee. Positioning gaps = buyer bounces.

HIGH-TICKET BAR
  - Transformation concrete and worth the price.
  - Objection handling addresses real high-ticket objections.
  - Visual progression from Week 4 visible here.
  - HOLD where weakness would fail to convert webinar warmth into sales.

INHERITED STANDARDS
  - Proof: real. Invented — HOLD.
  - Value honesty, guarantee honesty, scarcity honesty.

MULTI-SUBMISSION RULE (Week 6 sales copy specific)
When a student submits more than one variant:
  1. Judge each variant against ITS OWN pattern independently.
  2. Each must pass back-alignment to Week 4 and webinar deck.
  3. Recommend WHICH variant is strongest FOR THIS STUDENT'S AUDIENCE:
     - Skeptical/"tried everything" → 3-step "even if" tends to work best.
     - Aspirational/outcome-driven → desire-stack often resonates more.
     - Mixed/general → long-form works broadly.
  4. The program ships ONE page — recommend which to run.

NOT A PASS CONDITION: matching example phrasing. Judge structure,
back-alignment, high-ticket persuasive strength, inherited standards."""

P_W6_DESIRE_STACK = """TEMPLATE: Core-offer sales page — desire-stack (Week 6, variant 2 of 3)
[Note: same raw template as Week 2. WEEK 6 adjustments apply.]

Sells the HIGH-TICKET CORE offer (the Week 4 program) via desire-stack mechanism.

DESIRE STACK — names what Level 5 client wants, escalating to core program promise.
THE GAP / PROBLEM — what they can't solve alone.
MECHANISM + ORIGIN — authentic credibility, not fabricated backstory.
BENEFITS — transformation, not features.

THE TWO CORE WEEK 6 CHECKS (same as long-form)
  1. BACK-ALIGNMENT TO WEEK 4
  2. BACK-ALIGNMENT TO WEBINAR

OFFER + PRICE FRAMING
  - VISUAL PROGRESSION: modules/weeks from Week 4 must be visible. No staged
    path = FAIL.

HIGH-TICKET BAR — transformation justifies price. HOLD where weakness would fail.

PROOF: real. Invented — HOLD.
GUARANTEE: specific, honorable.
CLOSE: one clear CTA. Genuine urgency only.

WEEK 6 ADJUSTMENT: sells the HIGH-TICKET CORE program. Flag wrong-funnel-layer copy.

NOT A PASS CONDITION: matching template wording. Judge structure, back-alignment,
high-ticket persuasive strength, real proof, value/scarcity honesty."""

P_W6_THREE_STEP = """TEMPLATE: Core-offer sales page — 3-step "even if" (Week 6, variant 3 of 3)

Skeleton: audience ID → "even if" headline → offer intro → imagine-stack →
Q&A objection pre-handling → ease-of-use → what they receive → bonus →
value framing → price → CTA → guarantee.

STRUCTURE (this template's specific moves)
  - Opens with "ATTENTION: [Level 5 audience]" — must be student's actual audience.
  - Headline: outcome + "EVEN IF" clause preempting the PRIMARY objection.
    Generic "even if" = template-followed-but-weak.
  - IMAGINE STACK: 3+ sequential "imagine if…" prompts, each SPECIFIC. The
    "imagine" form is this template's structural mechanism — allowed here.
    Vague/hypey imagine-prompts = FAIL.
  - Q&A OBJECTION PRE-HANDLING: benefit as question → program answer. Generic
    questions that don't pre-handle real objections = FAIL.
  - Ease-of-use: honest about real effort required. No "no work required" claims.
  - Stack of 4+ items, each tied to why it matters.

INHERITED CHECKS
  - Back-alignment to Week 4 and webinar deck.
  - High-ticket bar. Proof: real. Invented — HOLD.
  - Value/scarcity/guarantee honesty.
  - WEEK 6 ADJUSTMENT: sells high-ticket core program.

NOT A PASS CONDITION: matching wig-copy or FB-ads-copy examples. Judge the
template-specific moves, back-alignment, high-ticket strength, inherited standards."""

P_W7_LIVE = """TEMPLATE: Post-webinar sales email sequence (Week 7, free_event + pwyw_or_low_ticket)
[Same 15-email library as Week 5 evergreen. WEEK 7 / LIVE-LAUNCH adjustment:
real shared cart-close deadline — scarcity is honest and external. Evergreen
students do NOT submit Week 7.]

Post-event sales sequence selling the CORE high-ticket offer during the live
cart-open window. Final selling load of the entire launch.

THE 15-TEMPLATE LIBRARY — judge each by its type:
Cart Open, Case Study, VIP Backstage, FAQ, Objection Crusher,
24-Hours-More/Last Call, Flash Sale set, Plot Twist/New Bonus, Diagnostic.

─── SCARCITY HONESTY GATE — LIVE LAUNCH MODE (key Week 7 inversion) ───
Week 7 has a REAL shared cart close — deadline language IS honest by default.
Reviewer VERIFIES urgency, not polices it:
  - Stated deadline DOESN'T match real cart close = HOLD.
  - "I never run sales" framing must be true.
  - Price increases must be real changes the student will honor.

─── SEQUENCE LOGIC ───
  - Set builds toward cart close, escalating — not repeating.
  - 24-hours-more/last-call window carries heaviest frequency.
  - Flag flat repetition.

─── APPLIES TO ALL EMAILS ───
  - Subject lines: specific, honest, last-call subjects carry real time pressure.
  - Alignment: same core offer as Week 4, consistent with Week 6 deck/page.
  - Back-alignment: same offer, modules, price, guarantee as Week 4.
  - Proof: real. Invented — HOLD. Value honesty. CTA to correct sales page.

PATTERN REQUIREMENTS
  - GOAL = sell high-ticket core program during live cart-open window.
  - Applies only to free_event and pwyw_or_low_ticket. NOT evergreen.

NOT A PASS CONDITION: using all 15 templates or matching example deadlines.
Judge each email's type function, deadline-honesty, real proof, alignment,
sequence escalation."""

# ─── 16 rows — exactly mirrors prisma/seed.ts ────────────────────────────────
ROWS = [
    (2, "free_event",         "Launch Event Opt-in Page (AIDA)",             "aida",               P_W2_FREE_AIDA),
    (2, "free_event",         "Launch Event Opt-in Page (Storytelling)",     "storytelling",       P_W2_FREE_STORY),
    (2, "pwyw_or_low_ticket", "Launch Event Sales Page",                     None,                 P_W2_PWYW_SALES),
    (2, "evergreen",          "VSL Script",                                  None,                 P_W2_EVERGREEN_VSL),
    (3, None,                 "Ad Copy Scripts (3 Angles)",                  "ad_copy",            P_W3_AD_COPY),
    (3, None,                 "Ad Video Script",                             "ad_video",           P_W3_AD_VIDEO),
    (4, None,                 "Core Program Offer",                          None,                 P_W4_CORE_OFFER),
    (5, "free_event",         "Pre-launch Email Sequence (Live/Scheduled)",  None,                 P_W5_LIVE),
    (5, "pwyw_or_low_ticket", "Pre-launch Email Sequence (Live/Scheduled)",  None,                 P_W5_LIVE),
    (5, "evergreen",          "Pre-launch Email Sequence (Evergreen)",       None,                 P_W5_EVERGREEN),
    (6, None,                 "Webinar / Workshop / Challenge Presentation", None,                 P_W6_WEBINAR),
    (6, None,                 "Core-Offer Sales Page",                       "long_form",          P_W6_LONG_FORM),
    (6, None,                 "Core-Offer Sales Page",                       "desire_stack",       P_W6_DESIRE_STACK),
    (6, None,                 "Core-Offer Sales Page",                       "three_step_even_if", P_W6_THREE_STEP),
    (7, "free_event",         "Post-Webinar Sales Email Sequence",           None,                 P_W7_LIVE),
    (7, "pwyw_or_low_ticket", "Post-Webinar Sales Email Sequence",           None,                 P_W7_LIVE),
]

def main():
    print("Connecting to staging DB...")
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    # ── Seed week_criteria ────────────────────────────────────────────────────
    print("Deleting existing week_criteria rows...")
    cur.execute('DELETE FROM week_criteria')

    print(f"Inserting {len(ROWS)} rows...")
    now = datetime.now(timezone.utc)
    for week, strategy, deliverable, variant, pattern in ROWS:
        cur.execute(
            """INSERT INTO week_criteria
               (id, "weekNumber", "launchStrategy", "deliverableName",
                "templateVariant", "templatePattern", "sourceDocUrl",
                "createdAt", "updatedAt")
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (str(uuid.uuid4()), week, strategy, deliverable, variant, pattern, None, now, now)
        )

    conn.commit()

    # ── Verify row count ──────────────────────────────────────────────────────
    cur.execute('SELECT COUNT(*) FROM week_criteria')
    count = cur.fetchone()[0]
    print(f"\nRows seeded: {count} (expected 16)")

    # ── Q1: row table ─────────────────────────────────────────────────────────
    print("\n--- week_criteria rows -----------------------------------------------------------")
    print(f"{'weekNumber':<12} {'launchStrategy':<22} {'deliverableName':<48} {'templateVariant'}")
    print("-" * 110)
    cur.execute(
        'SELECT "weekNumber", "launchStrategy", "deliverableName", "templateVariant" '
        'FROM week_criteria ORDER BY "weekNumber", "launchStrategy" NULLS FIRST, "templateVariant" NULLS FIRST'
    )
    for row in cur.fetchall():
        week, strat, deliv, variant = row
        print(f"{str(week):<12} {str(strat or 'null'):<22} {str(deliv):<48} {str(variant or 'null')}")

    # ── AIDA spot-check ───────────────────────────────────────────────────────
    cur.execute(
        'SELECT "templatePattern" FROM week_criteria '
        'WHERE "weekNumber"=2 AND "launchStrategy"=\'free_event\' AND "templateVariant"=\'aida\''
    )
    aida = cur.fetchone()
    if aida:
        first_line = aida[0].split("\n")[0]
        char_count = len(aida[0])
        print(f"\nAIDA spot-check: first_line=\"{first_line}\" | chars={char_count}")
    else:
        print("\nAIDA spot-check: ROW NOT FOUND — seed may have failed")

    # ── Q2: student spot-check ────────────────────────────────────────────────
    print("\n--- student spot-check (5 most recent) ------------------------------------------")
    print(f"{'name':<25} {'class':<18} {'strategy':<12} {'pricing':<12} {'niche_set':<10} {'topic_set':<10} {'launchInfoStatus'}")
    print("-" * 110)
    cur.execute(
        """SELECT name, "studentClass", "launchStrategy", "launchPricing",
                  niche IS NOT NULL as has_niche,
                  "launchEventTopic" IS NOT NULL as has_topic,
                  "launchInfoStatus"
           FROM "User"
           WHERE role = 'STUDENT'
           ORDER BY "createdAt" DESC
           LIMIT 5"""
    )
    rows = cur.fetchall()
    if not rows:
        print("  (no students found on staging)")
    for row in rows:
        name, cls, strat, pricing, has_niche, has_topic, li_status = row
        print(f"{str(name):<25} {str(cls or '—'):<18} {str(strat or '—'):<12} {str(pricing or '—'):<12} {str(has_niche):<10} {str(has_topic):<10} {str(li_status or '—')}")

    cur.close()
    conn.close()
    print("\nDone.")

if __name__ == "__main__":
    main()

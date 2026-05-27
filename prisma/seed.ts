import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN TEXTS
// Verbatim from LaunchSmart_AI_Reviewer_Complete_Build_Reference.md Part 2.
// Do not paraphrase, reformat, or strip comments — the model needs full text.
// ─────────────────────────────────────────────────────────────────────────────

const P_W2_FREE_AIDA = `TEMPLATE: AIDA opt-in page (Week 2, free_event)

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
own authentic voice.`

const P_W2_FREE_STORY = `TEMPLATE: Storytelling opt-in page (Week 2, free_event — alternative to AIDA)

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
    must be achievable (the template itself stresses this — hold copy that
    promises results the story doesn't support).
  - This is an OPT-IN page (goal = registration), NOT a sales page. It must NOT
    sell or price the paid core offer. Flag any attempt to close the core sale
    here — wrong funnel stage.
  - The whole narrative must serve the approved launch event from the student's
    launch information, and the "before" problem must match their Level 5 Niche.

NOT A PASS CONDITION: matching the template's example stories. A student
telling a completely different but well-structured story is a PASS. Judge the
arc and emotional truth in the student's authentic voice.`

const P_W2_PWYW_SALES = `TEMPLATE: Sales copy / direct-response sales page (Week 2, pwyw_or_low_ticket)
[Note: this is the SAME raw template students receive in Week 6. The reviewer
applies the WEEK 2 adjustment below — selling a low-ticket front-end event,
not the core program.]

This is the sales copy for the student's launch event when that event is
pay-what-you-want or low-ticket (so it sells, not just registers). It must
carry the full persuasion load: desire → problem → mechanism → proof → offer →
urgency.

DESIRE STACK (open here)
  - Names what the ideal client wants, escalating to the most desirable outcome
    they'd achieve. Must be the Level 5 client's actual desire, in concrete
    terms — not generic "success."

THE GAP / PROBLEM
  - States what the prospect needs but can't easily get on their own, and the
    specific problem they keep hitting without it.
  - Optionally dismisses an impractical alternative (the expensive/slow way that
    doesn't really work) to position this offer as the sensible path.

MECHANISM + ORIGIN
  - Why this offer solves what the prospect can't solve alone — the "how it
    works" in benefit terms.
  - The coach's origin/credibility: what they learned, why they created this.
    For early-stage coaches this can be the personal journey, NOT a fabricated
    "extraordinary lengths producing a product" claim. Authenticity over
    manufactured backstory.

BENEFITS (not features)
  - Translates what the offer contains into what the prospect gains. The
    template's own rule applies: benefits, not features. Flag feature-dumps.

PROOF (inherited standard — expected and real)
  - Vague proof — push to quantify. Missing where plausible — prompt
    (PROCEED w/ strong feedback — the reviewer can't verify whether a given student has proof yet).
    Invented/inflated proof — HOLD.

THE OFFER + PRICE FRAMING
  - Clearly names the offer and the price.
  - Frames value against a more expensive/less desirable alternative so the
    price feels like an obvious yes. Stacks what's included.

GUARANTEE (where the student offers one)
  - Specific, honorable, with a clear condition and process. Flag vague
    "satisfaction guaranteed" non-guarantees.

CLOSE
  - Names the cost of NOT acting vs the better alternative.
  - One clear, explicit CTA telling them exactly what to do.
  - Genuine urgency — real deadline, real cohort cap, real bonus. NOT fake
    scarcity (inherited scarcity-honesty rule applies).
  - Optional incentive/bonus to tip the decision, if real.

PATTERN REQUIREMENTS
  - The sequence must build logically: don't ask for the sale before
    establishing desire, problem, and mechanism. Flag pages that jump cold to
    the pitch.
  - Serves the approved launch event from the launch information; sells to the
    Level 5 Niche.
  - WEEK 2 ADJUSTMENT: sells the LAUNCH EVENT offer (PWYW/low-ticket front-end),
    NOT the high-ticket core program. Flag any page selling the wrong offer.

VOICE OVERRIDE (template-specific):
  - The template's example uses rule-of-three "Imagine what it would be like
    if…" and hype phrases ("crazy successful, beyond your wildest dreams").
    These are ILLUSTRATIONS, not requirements. Voice rule wins.

NOT A PASS CONDITION: matching the template's example wording or including
every optional element. Judge the persuasion sequence and whether it earns the
sale at this price point, in the student's authentic voice.`

const P_W2_EVERGREEN_VSL = `TEMPLATE: VSL script (Week 2, evergreen)

This is an on-demand video sales letter for an evergreen funnel with NO live
event — the video does the full selling job. The reviewer judges this as a
SCRIPT meant to be spoken and watched, and checks the persuasion arc is present
and honest. NOT that the student copied the template's example (a weight-loss
VSL that violates several program rules).

THE BIG PROMISE (first ~30 seconds)
  - A hook in the opening line that stops the viewer: names the Level 5 target
    audience, the desired outcome, and the obstacle they keep hitting. Weak or
    slow opening = FAIL regardless of the rest.
  - A clear big-promise statement: specific, BELIEVABLE outcome with a
    timeframe, addressing the main objection up front.
  - Written to be spoken — short spoken sentences, not dense paragraphs. Flag
    copy that reads like an essay.

THE CRISIS (next section)
  - Amplifies the real cost of the current problem and why past solutions
    failed. Vivid and specific to the Level 5 client's actual situation.
  - Emotional stakes: what continuing down this path costs them. Genuine, not
    melodramatic.

THE MECHANISM
  - The discovery/method: how the coach arrived at their approach and why it
    works. This must be the coach's REAL story and REAL method.
  - HONESTY GATE: do NOT reward invented "secret discoveries," fake studies, or
    manufactured proprietary mechanisms. The template's example ("a forgotten
    Japanese study," "metabolic trigger switch") is exactly what NOT to copy.
    Flag fabricated mechanisms or pseudo-scientific claims as HOLD.
  - Lays out the method as clear steps/components.

PROOF (inherited standard — expected and real)
  - Vague — quantify. Missing where plausible — prompt (PROCEED w/ feedback).
    Invented/inflated — HOLD.

THE OFFER + VALUE STACK
  - Builds value before price (anchors against costlier/slower alternative).
  - Stacks what's included with honest, defensible values. Flag inflated
    "values" that undermine credibility.
  - Sells the correct offer for this funnel — not the wrong funnel layer.

RISK REVERSAL (expected — these students offer guarantees)
  - Specific, honorable guarantee with clear condition and process.

CALL TO ACTION (final)
  - One clear spoken CTA telling the viewer exactly what to do and what
    happens next.
  - Genuine urgency only. For evergreen, urgency must be individualized
    (per-person timer) or honest (real bonus expiry, genuine cost of waiting).
    Flag fabricated countdowns or fake "only X left" scarcity.

PATTERN REQUIREMENTS
  - The arc must run promise → crisis → mechanism → proof → offer → CTA in
    order.
  - Serves the approved launch/offer; sells to the Level 5 Niche.

PLATFORM-SAFETY FLAG (this becomes paid video — high priority):
  - Flag health/wellness/financial "miracle outcome" claims and any language
    likely to trip ad-platform policy. Push toward plain, compliant commercial
    language.

VOICE + HONESTY OVERRIDE:
  - The example script uses hype, a fabricated discovery, and rule-of-three
    scaffolding. NOT the bar. Voice rule wins, honesty rule wins.

NOT A PASS CONDITION: matching the example VSL, hitting a dramatic number, or
manufacturing a "secret method." Judge the honest persuasion arc, spoken
quality, and platform safety, in the student's authentic voice.`

const P_W3_AD_COPY = `TEMPLATE: Ad copy scripts (Week 3, all launch strategies)

These are paid-ad captions promoting the SAME approved launch event from the
student's launch information (the offer = their webinar or challenge as the
case may be). The student produces THREE scripts, each a different angle. The
reviewer checks each script works AND that the three are genuinely different
angles — not the same message three times. NOT that they copied the template's
"lead generation" examples or placeholder testimonials.

SCRIPT 1 — the "tired-of / can't-figure-out" angle
  - Opens with something desirable the prospect can do once they have the offer.
  - Names the offer, its format (webinar/challenge), and what it covers.
  - Hits a specific thing the Level 5 client is TIRED of, and a specific thing
    they CAN'T figure out — both must be real, recognizable pains.
  - Ends with the landing-page CTA.

SCRIPT 2 — the benefit-led angle
  - Headline that grabs attention on the key benefit.
  - Hook: opens on the prospect's pain point.
  - Introduces the offer as the solution.
  - Key benefits (benefits, not features).
  - Proof.
  - Clear CTA + genuine urgency.

SCRIPT 3 — the problem/agitation-led angle
  - Hook: a sharper, more provocative attention-grabber.
  - Names the prospect's main challenge/pain.
  - Presents the offer as the answer.
  - Briefly describes what's inside.
  - Transformation: the outcome they reach.
  - Proof.
  - CTA + genuine scarcity.

HOOK STANDARD (applies to all three — make-or-break)
  - The opening line of EACH script must stop the scroll in the first beat and
    speak to the PROSPECT's pain/desire, not introduce the coach. Weak/slow/
    coach-centric opener = FAIL on that script regardless of the rest.
  - The three hooks must differ. Three variations of the same line = FAIL the
    angle-variety check.

ANGLE-VARIETY STANDARD (the core Week 3 check)
  - The three scripts must approach the SAME offer from THREE genuinely
    different angles of the ideal client's pain/desire (e.g. tired-of vs
    aspirational-outcome vs threat/cost-of-inaction). If two or more say
    effectively the same thing, flag it and tell the student which angle to
    re-cut and how.

PROOF (inherited standard — do NOT copy template placeholders)
  - The template's "Sarah, Small Business Owner / tripled my leads" lines are
    PLACEHOLDERS — copying that style = FAIL.
  - Vague — push to quantify. Missing where plausible — prompt
    (PROCEED w/ feedback). Invented/inflated — HOLD.

CTA + URGENCY
  - Each script needs one clear CTA to the correct landing page.
  - Urgency must be genuine. Flag fake countdowns.

PATTERN REQUIREMENTS
  - All three serve the SAME approved launch event, pointed at the same landing
    page, to the Level 5 Niche. Flag drift.

PLATFORM-SAFETY FLAG (critical — paid captions, highest-risk asset):
  - Flag health/wellness/financial "miracle outcome" language and any wording
    likely to trip ad-platform policy. Push toward plain, compliant commercial
    language.

VOICE OVERRIDE:
  - Examples lean on hype ("skyrocket," "stealing your leads") and rule-of-
    three benefit lists. NOT the bar. Voice rule wins.

NOT A PASS CONDITION: matching the examples or mimicking hype phrasing. Judge
each script's hook and persuasion, the variety across the three, proof
authenticity, and platform safety — in the student's authentic voice.`

const P_W3_AD_VIDEO = `TEMPLATE: Video script for launch event registration (Week 3, all strategies)

This is a SPOKEN traffic-driving video AD (paid or organic) whose job is to
send viewers to the OPT-IN page to register for the student's approved
free/launch event. It is the video sibling of the Week 3 ad copy — top-of-
funnel promo pointing at the opt-in, NOT on-page copy and NOT a hard sell of
the core program. The reviewer judges it as a SCRIPT to be spoken on camera.
NOT whether they copied the template's example (which uses Mayowa's own agency
positioning as a placeholder).

STRUCTURE A — hook → intro → problem → solution → benefits → proof → CTA
STRUCTURE B — headline → problem agitation → solution → mechanism → benefits →
              proof → objection handling → recap → CTA
(The student uses one; review against whichever they wrote — detect from
structure if not told.)

HOOK (make-or-break, spoken)
  - The opening line must grab in the first spoken beat — a statement,
    question, or stat that lands on the Level 5 client's pain/desire. A slow
    open, or one that starts by introducing the coach before the viewer cares,
    = FAIL.

CORE ARC (both structures)
  - Brief, credible self-intro tied to the student's OWN niche and authority —
    NOT a copy of the template's "CEO of a digital marketing agency" example.
    Flag scripts that parrot the template's positioning instead of the
    student's.
  - Names the specific problem the Level 5 client faces, agitated but honest.
  - Presents the EVENT (not the paid program) as the solution; names the
    approved event title and what it covers.
  - Benefits the attendee gains from showing up — concrete, tied to their
    desired outcome.
  - (Structure B) Mechanism: what will be covered and how it addresses the
    problem. Objection handling: answers the "I've tried everything" reflex.

PROOF (inherited standard — do NOT copy template placeholders)
  - "Helped numerous [Target Audience]" and "businesses soar" are placeholders.
    Vague — quantify. Missing where plausible — prompt. Invented — HOLD.

CTA + URGENCY
  - One clear spoken CTA to REGISTER (click the link / reserve your spot).
  - Genuine urgency only.
  - Optional registration bonus if real.

PATTERN REQUIREMENTS
  - This is a TRAFFIC-DRIVING video AD whose job is to send viewers to the
    opt-in page. Sibling of the Week 3 ad copy.
  - Serves the SAME approved launch event from the launch information, to the
    Level 5 Niche.
  - GOAL = the click + registration for the FREE event. The video must NOT
    pitch or close the paid core program — wrong funnel stage. Flag any hard
    sell of the core offer.
  - Written to be SPOKEN on camera as an ad: strong scroll-stopping open, short
    spoken sentences, natural cadence, not dense read-silently paragraphs.

PLATFORM-SAFETY FLAG (this becomes a paid video ad — primary check):
  - Flag health/wellness/financial "miracle outcome" claims and any language
    likely to trip ad-platform policy. Push toward plain compliant commercial
    language.

VOICE OVERRIDE:
  - Examples use hype ("businesses soar," "game-changing," "unprecedented
    growth") and rule-of-three. Voice rule wins.

NOT A PASS CONDITION: matching the example script, copying Mayowa's agency
positioning, using placeholder proof, or hitting hype phrasing. Judge the
spoken hook, registration arc, real proof, funnel-stage correctness, and
platform safety — in the student's authentic voice.`

const P_W4_CORE_OFFER = `TEMPLATE: Program (core) offer (Week 4, all launch strategies)

This is the CORE high-ticket offer the student pitches DURING their launch
event — the back-end program the whole funnel exists to sell. The most
consequential deliverable in the program: Weeks 6 and 7 will sell THIS offer,
so drift or weakness here compounds. The reviewer judges whether this is the
right offer, structured to sell, and compelling enough to carry the launch.
NOT whether they copied the template's example or filled every bonus slot.

FUNNEL-POSITION CHECK (do this first — drift gate)
  - Confirm this is the CORE offer meant to be pitched at the launch event — a
    real transformation program, not a lead magnet, not the free/low-ticket
    event itself, not a downsell. Wrong funnel layer = OFF flag, HOLD.

THE PROMISE / POSITIONING
  - Names the program, its duration, the EXACT ideal audience (must match the
    Level 5 Niche), and the key outcome. Specific transformation, not vague
    "grow your business."
  - A clear reason this program stands out — the student's unique
    method/experience — tied to a real differentiator.

VISUAL PROGRESSION (mandatory — make-or-break structural check)
  - Deliverables MUST be broken into modules or weeks that show the buyer a
    step-by-step journey from starting point to promised transformation. The
    buyer should be able to SEE the path.
  - A flat list of features with no sense of sequence/journey = FAIL on this
    dimension, even if the content is good. Tell the student to re-structure
    into staged progression and show how.
  - Each stage should map to an outcome, not just a topic ("By week 3 you'll
    have X" beats "Week 3: we cover X").

BONUSES (complementary and purposeful — not filler)
  - Must remove a real objection or accelerate the core result. Flag random/
    unrelated bonuses.
  - Do NOT require a fixed number. The template's 5-slot list is a placeholder.
  - VALUE HONESTY (inherited): flag absurd/arbitrary "values" that undermine
    trust.

OFFER + PRICE FRAMING
  - Frames the price against total value (and ideally the cost of the slower
    alternative / not solving the problem). Price should feel like an obvious
    yes.
  - Payment options if offered.

GUARANTEE (inherited standard — these students offer them)
  - Specific, honorable, with clear condition and process.

PROOF (inherited standard — expected and real)
  - Vague — quantify. Missing where plausible — prompt. Invented — HOLD.

ENROLLMENT / CTA
  - Clear enrollment process and a single clear next step.

COMPELLING (apply the full persuasive-strength standard)
  - Is the transformation worth the price, and is that made obvious? Weakness
    on these — strong feedback (and hold if so weak the launch can't sell it).

PATTERN REQUIREMENTS
  - Serves the Level 5 Niche and aligns with the approved launch information —
    same audience, same direction. Drift in WHO this is for or WHAT
    transformation it promises = OFF flag, HOLD.
  - This offer becomes the spine of Weeks 6–7. Hold anything off-direction or
    structurally broken here rather than letting it propagate.

TRIAGE NOTE (Week 4 leans stricter): a flawed core offer poisons everything
built on top of it. Hold funnel-position errors and off-niche errors here,
rather than letting them propagate to deck, sales page, and email sequence.

VOICE OVERRIDE:
  - Generic placeholder phrasing ("transformative," "unlike other programs,"
    "many more bonuses") is filler, not the bar. Voice rule wins.

NOT A PASS CONDITION: filling every template slot, hitting a bonus count, or
matching example phrasing. Judge funnel-position correctness, visual
progression, bonus purpose, value honesty, guarantee honesty, real proof, and
whether the offer is compelling enough to carry the launch — in the student's
authentic voice.`

const P_W5_LIVE = `TEMPLATE: Pre-launch email sequence — LIVE/SCHEDULED (Week 5)
Covers: regular live launch AND pay-what-you-want/low-ticket events.
Both have a REAL shared event date, so urgency is honest and external.
[Distinct from the evergreen pattern, which has no shared date.]

The student submits the full sequence at once (PWYW — 3 emails; regular launch
up to ~9). The reviewer judges the sequence as a SET that escalates toward the
live event, plus each email individually. Sequence length and email mix vary —
do NOT require a fixed count. NOT whether they copied the template's
placeholder stories or Mayowa's example branding.

SEQUENCE LOGIC (the core check — judge the set)
  The sequence must BUILD toward the live event, with two broad phases:
  - BELIEF/NURTURE phase (early emails): may include welcome, an epiphany/
    "aha-moment" story, authority-building, and proof emails. Each must do a
    DISTINCT job — flag emails that just repeat the previous one.
  - COUNTDOWN phase (final emails): time-anchored reminders to the real date
    ("2 days," "24 hours," "1 hour," "starts in 5 min"). These must escalate
    and point to the genuine shared event time.
  FAIL the sequence if it's flat repetition, or if the countdown emails don't
  build real momentum toward the fixed date.

URGENCY (honest because the date is real)
  - Time-based claims must match the ACTUAL event date/time. Legitimate
    shared-date urgency — do NOT flag "2 days left" here the way you would in
    an evergreen sequence; here it's true.
  - DO flag any urgency that ISN'T true (a deadline that won't actually
    happen, a claimed cap that isn't real).
  - GOAL = registration/attendance for the EVENT. Flag emails that instead try
    to close the paid core program — wrong funnel stage (the sale comes at/
    after the event, in Weeks 6–7).

SUBJECT LINES (every email)
  - Each earns the open: specific, relevant, honest (no clickbait the body
    doesn't pay off). Countdown subjects should carry the real time pressure.

EACH EMAIL (global protocol)
  - Alignment: every email serves the SAME approved event + Level 5 Niche.
  - One clear CTA per email to the correct registration/join link.
  - Epiphany/story emails must use the student's OWN real story — flag copies
    of the template's example narrative or Mayowa's personal anecdote.

PROOF (inherited standard — do NOT copy placeholder student stories)
  - "[Student's Name]'s incredible journey" and "one of my [Country] students"
    are PLACEHOLDERS. Copying that vague style = FAIL.
  - Vague — quantify. Missing where plausible — prompt. Invented — HOLD.

VOICE OVERRIDE (template is heavy with banned tells):
  - Empty motivation ("embark on this transformative journey," "your future
    self will thank you," "the potential for greatness") and vague uplift. NOT
    the bar. Voice rule wins.

NOT A PASS CONDITION: matching the example emails, copying placeholder
stories or Mayowa's branding, or hitting a specific email count. Judge
sequence escalation across belief→countdown, honest real-date urgency,
subject strength, alignment, real proof, correct funnel stage, and authentic
voice.`

const P_W5_EVERGREEN = `TEMPLATE: Pre-webinar / sales email sequence — EVERGREEN (Week 5)

An automated, perpetual sequence: each subscriber enters on their own clock,
NO shared live date. Two phases. The student submits a SELECTION from these,
not all of them. The reviewer must (a) identify which phase/type each
submitted email is, then (b) judge it against that type's logic.
[BUILD NOTE: ideally the submission captures which email types the student
wrote. If not, the reviewer classifies each email by function before judging.]

─── PHASE 1: NURTURE (Emails 1–4 equivalent) ───
A short value/authority runway toward the offer.
  - Welcome/intro: frames the journey + first soft CTA (watch the video /
    engage).
  - Authority: why listen to this coach — REAL credibility, not generic
    "decade of experience" filler.
  - Testimonial + urgency: REAL proof + urgency that is HONEST for evergreen
    (see scarcity gate below).
  - Procrastination/cost-of-inaction: the real cost of staying stuck.
Apply the global protocol to each. Sequence must escalate, not repeat.

─── PHASE 2: SALES EMAILS (the 15-template menu) ───
The student pulls relevant types for their launch (e.g. case study, FAQ,
objection crusher, last call, cart open, flash sale set, plot twist). Judge
each submitted email against ITS type's function:
  - Case Study: built around ONE real, specific, attributable customer result.
    Invented case study = HOLD.
  - VIP Backstage / preview: gives a genuine taste of the real program.
  - FAQ: answers real objections specific to this offer + audience.
  - Objection Crusher: addresses affordability/time/confidence/timing fears
    honestly, anchored to the cost of inaction.
  - Cart Open / Last Call / 24-Hours-More: deadline-driven — SUBJECT TO THE
    SCARCITY GATE BELOW.
  - Flash Sale set (1–4): announce → open → ending-soon → last-call. Check the
    sub-sequence escalates and the occasion is real, not manufactured.
  - Diagnostic / Plot Twist / New Bonus: re-engagement angles; the "reason to
    email" must be TRUE.

─── SCARCITY HONESTY GATE (the critical evergreen check) ───
This template's swipes default to deadline language ("available 72 hours,"
"price increases in 6 hours," "11:59 PM TONIGHT," "only because of Labor Day").
On a TRUE evergreen funnel these are usually FALSE and violate the honesty +
voice rules AND risk platform penalties.
  - Any deadline/scarcity claim must be GENUINELY individualized (a real
    per-subscriber timer that actually closes access/bonus/price for THAT
    person) OR tied to a real, true event.
  - FLAG as a problem (and HOLD if central to the email): shared-date language
    in an evergreen sequence ("tonight," "this Saturday," "ends Friday"), fake
    price increases that never happen, "I never run sales" framing that's
    untrue, countdown timers that reset. The template instructing students to
    "give the impression" of rarity is NOT a license to lie.
  - Push students toward honest evergreen urgency: real timed bonus/price for
    their individual window, or genuine cost-of-waiting.

MULTI-EMAIL TRIAGE NOTE: if a student submits 10 emails and 8 are clean but 1
fabricates a countdown, the verdict is HOLD. The clean emails get their
feedback, the problem email gets flagged, the whole submission holds for human
review. Fake scarcity is the specific thing this gate exists to catch — letting
it through "because the rest were fine" defeats the gate.

─── APPLIES TO ALL EMAILS ───
  - SUBJECT LINES: each earns the open, specific, honest.
  - ALIGNMENT: every email serves the same approved offer + Level 5 Niche.
  - AUTOMATION VOICE: no references to a shared timeline ("yesterday's live
    call," "see you tomorrow"). Flag live-launch language that doesn't fit
    automation.
  - PROOF (inherited): expected and real; vague — quantify; invented — HOLD.
  - VALUE HONESTY (inherited): bonus values defensible, not inflated.
  - VOICE OVERRIDE: the swipes are hype-heavy ("hands trembling," rule-of-three
    "YES to... YES to... YES to," "idiot-proof"). Voice rule wins.

NOT A PASS CONDITION: using all 15 templates, copying the swipe phrasing, or
keeping the template's manufactured scarcity. Judge each email against its
type's function, scarcity honesty, real proof, alignment, and authentic voice.`

const P_W6_WEBINAR = `TEMPLATE: Webinar/workshop/challenge presentation (Week 6, all strategies)

This is the LIVE presentation deck that teaches value and then pitches the
student's core offer (the Week 4 offer). Unlike all prior copy deliverables,
the reviewer judges it as a PRESENTATION with a live audience: the teach-to-
pitch flow, the engagement scaffolding, AND the strength of the pitch itself.
NOT whether they copied the template's placeholder amounts or filler phrasing.

PRESENTATION FLOW (must be intact and in order)
  1. Hook + authority: who the presenter is and WHY to listen — real,
     specific credibility, not generic claims.
  2. The promise / "stay till the end": the concrete thing they'll learn, tied
     to the Level 5 client's desire and pain.
  3. Problem agitation + "why you're stuck": reframes why the common/old way
     fails — sets up the need for the method. Specific to the audience.
  4. The method/framework: the teaching core. Real value — SEE TANGIBLE
     TEACHING CHECK BELOW.
  5. Transition into the offer (THE critical moment — see pitch check).
  6. Offer + value stack + bonuses + guarantee.
  7. Barriers/objections handled.
  8. Close + enrollment + urgency.
  Flag a deck missing the problem-reframe or jumping from teaching to pitch
  with no bridge.

TANGIBLE TEACHING CHECK (critical — separates a webinar that converts from
"motivational noise that sells nothing")

The teaching section must deliver REAL, USABLE instruction — not motivation
dressed as teaching. Two failures to catch:

  FAILURE 1 — Motivation masquerading as teaching:
  - Content that is emotional uplift with no transferable method ("believe in
    yourself," "your breakthrough is coming," "stop playing small," "you have
    what it takes"). FEELS productive but teaches nothing.
  - FAIL the teaching section if its substance is inspiration rather than
    instruction. Quote the offending slides. The audience should leave able to
    DO something, not just feel something.

  FAILURE 2 — Teaching too abstract to act on:
  - Content that names topics without teaching them ("use the right strategy,"
    "the proven way to succeed," "Way 1 / Way 2 / Way 3" listed as vague
    aspirations rather than actual steps).
  - The test: after a given teaching slide, could an audience member DO
    something differently — or did they only learn that a thing exists? If the
    latter, FAIL and tell the student to make it concrete.

  THE STANDARD — one real quick win, fully delivered:
  - The webinar must teach at least ONE complete, tangible, implementable
    quick win the audience can actually use — proving the coach can teach.
    This is what earns the pitch.
  - BUT it should not dump the entire system. Productive incompleteness:
    deliver one real win fully; leave the full method for the program. Flag
    BOTH extremes — empty motivation AND a full method-dump.
  - Empty motivation / all-abstraction teaching with no genuine tangible
    takeaway = HOLD. The pitch built on top of it cannot convert.

PITCH STRENGTH (the core Week 6 check — what separates a webinar that sells
from one that just teaches)
  - The TEACH-TO-PITCH TRANSITION must feel earned: teaching should create the
    realization that the audience needs the program to go further. The pitch
    is the natural next step, not an abrupt swerve. A deck that teaches well
    but transitions weakly = FAIL on pitch strength.
  - The offer must be framed around the TRANSFORMATION and the cost of NOT
    acting, with the value stacked before the price is revealed.
  - The barriers/objection section must address the real reasons THIS audience
    won't buy honestly.
  - The close must drive to one clear enrollment action.
  - If the pitch is weak enough that the webinar won't convert, that's a HOLD.

ENGAGEMENT SCAFFOLDING (presentation-specific)
  - Live-engagement prompts (polls, "comment YES/No," "type your number,"
    chat questions) should be present and placed to maintain attention and get
    micro-commitments building toward the offer. A deck with zero interaction
    will lose a live audience — flag its absence.
  - Flag prompts that are mechanical or meaningless. Each should advance
    belief or commitment.

OFFER ALIGNMENT (back-reference to Week 4)
  - The offer pitched MUST be the SAME core offer from Week 4 — same
    transformation, same modules, same audience. Flag drift between Week 4
    offer and how it's presented here. The deck SELLS the core program
    (correct funnel stage).

VALUE & SCARCITY HONESTY (template actively invites dishonesty — override it)
  - "This Training Value is worth [exaggerated amount]" — the word
    "exaggerated" is an instruction to inflate. OVERRIDE: stated values must
    be defensible.
  - SCARCITY: the template's "72 hrs," "48 hrs," "fee returns to [amount]"
    framing is HONEST only if there's a REAL cart-close deadline. If the deck
    will be run evergreen/on replay with no real deadline, that urgency is
    fabricated — FLAG it.
  - "[add a statistics here]" / "70% of people" prompts: any stat must be REAL
    and ideally sourced. Flag invented statistics.

PROOF (inherited standard)
  - Testimonial/student-story slides must use REAL, specific, attributable,
    quantified results. Vague — quantify; missing where plausible — prompt;
    invented — HOLD.

TRIAGE CALIBRATION (Week 6 presentation specific):
  - Empty/abstract teaching = HOLD (text reliably proves it).
  - Offer drift from Week 4 = HOLD.
  - Fake value or fake scarcity = HOLD.
  - "Is the pitch energetic enough" softer judgment = PROCEED with strong
    feedback (delivery may rescue what text can't show).

PATTERN REQUIREMENTS
  - Serves the Level 5 Niche and aligns with the approved launch information.
  - Written as SPOKEN presentation beats, not dense read-only paragraphs.

VOICE OVERRIDE:
  - The template leans on hype ("6+ figure income," "Isn't it great?," empty
    "imagine" stacks) and rule-of-three. Voice rule wins.

NOT A PASS CONDITION: filling every placeholder, copying amounts, using the
"exaggerated value" framing, or matching example transformations. Judge
presentation flow, TANGIBLE TEACHING, PITCH STRENGTH and the teach-to-pitch
transition, engagement scaffolding, offer alignment to Week 4, value/scarcity/
stat honesty, real proof, and authentic voice.`

const P_W6_LONG_FORM = `TEMPLATE: Core-offer sales page — long-form headline-down (Week 6, variant 1 of 3)

This is one of THREE structurally distinct sales-copy templates students can
choose for the high-ticket core offer. The structure: attention-grabbing
headline → hook question → offer/solution + unique mechanism → proof → price
+ value framing → benefits/transformation → pain points → first CTA →
detailed offer description → bonuses → creator intro → testimonials →
objections + reassurances → urgency → closing CTA.

[See MULTI-SUBMISSION RULE at end of Week 6 sales-copy variants — applies
when a student submits more than one variant.]

This page sells the student's HIGH-TICKET CORE offer (the Week 4 program).
Every webinar attendee, replay viewer, and post-event email click lands here.
It carries the heaviest selling load in the entire funnel.

THE TWO CORE WEEK 6 SALES-COPY CHECKS

  1. BACK-ALIGNMENT TO WEEK 4
     This page must sell the SAME core offer the student built in Week 4 —
     same audience, same transformation, same modules/structure, same price,
     same guarantee. Flag inconsistencies. Hold significant drift.

  2. BACK-ALIGNMENT TO THE WEBINAR (Week 6 deck)
     The positioning here must match what the student pitches in their
     webinar: same framing of the problem, same name of the method, same
     offer/price/guarantee. A buyer who attends the webinar and lands on a
     different-looking page loses confidence and bounces. Flag positioning
     gaps.

[BUILD NOTE: these checks require the reviewer to load this student's
APPROVED Week 4 offer and APPROVED Week 6 deck as additional inputs. First
deliverable that depends on multiple prior approved submissions.]

HIGH-TICKET BAR
  - The transformation must be concrete and worth the price — show, don't
    assert. Specific outcome, named timeframe, clear path.
  - Objection handling must address the real reasons THIS audience won't buy
    a high-ticket program (affordability, time, self-doubt, "will this work
    for me"), not generic objections.
  - The visual progression (modules/weeks) from the Week 4 offer must be
    visible here — the buyer must SEE the journey.
  - Apply the full persuasive-strength standard. Weakness is more costly than
    at Week 2 — strong feedback, and HOLD where weakness would clearly fail
    to convert webinar warmth into sales.

INHERITED STANDARDS (apply as locked elsewhere)
  - PROOF: expected and real. Vague — quantify; missing where plausible —
    prompt; invented — HOLD.
  - VALUE HONESTY: bonus values defensible.
  - GUARANTEE HONESTY: specific, honorable, clear condition.
  - SCARCITY HONESTY: urgency tied to a real deadline / cap / bonus expiry.

PATTERN REQUIREMENTS
  - Serves the Level 5 Niche.
  - Sells the CORE high-ticket program (correct funnel stage — this is where
    the hard pitch belongs).

VOICE OVERRIDE:
  - Examples lean on hype ("sanity-saving," "marketing monkey off your back,"
    rule-of-three bonus lists). Voice rule wins.

NOT A PASS CONDITION: matching example phrasing or hitting every section in
template order. Judge structure, back-alignment to Week 4 and the webinar
deck, high-ticket persuasive strength, and all inherited standards.

MULTI-SUBMISSION RULE (Week 6 sales copy specific)
When a student submits more than one sales-copy variant for the same core
offer:
  1. Judge each variant against ITS OWN pattern (long-form / desire-stack /
     3-step), independently.
  2. Each must pass back-alignment to Week 4 and the webinar deck individually.
     Variants that drift from the approved offer fail regardless of which is
     "best."
  3. Recommend WHICH variant is strongest FOR THIS STUDENT'S AUDIENCE — not
     which reads best in isolation. Use the Level 5 Niche to decide:
       - Skeptical / "tried everything" audience — the 3-step template's
         "even if" preemption tends to work best.
       - Aspirational / outcome-driven audience — the desire-stack opener
         often resonates more.
       - Mixed / general direct-response — the long-form headline-down works
         broadly.
     This is a coaching judgment, not a stylistic one. Explain the choice in
     the feedback so the student learns the reasoning, not just the answer.
  4. The other variants get feedback on what to fix, but the recommendation
     is which to RUN with — the program ships one page, not three.`

const P_W6_DESIRE_STACK = `TEMPLATE: Core-offer sales page — desire-stack (Week 6, variant 2 of 3)
[Note: this is the SAME raw template students receive in Week 2. The reviewer
applies the WEEK 6 adjustments below.]

[See MULTI-SUBMISSION RULE in variant 1 (long_form) — applies when a student
submits more than one variant.]

This is the dedicated long-form sales page for the student's HIGH-TICKET CORE
offer (the Week 4 program), built on the desire-stack mechanism.

DESIRE STACK (open here)
  - Names what the Level 5 client wants, escalating to the most desirable
    outcome the core program promises. Concrete, not generic.

THE GAP / PROBLEM
  - States what the prospect needs but can't easily get on their own, and the
    specific problem they keep hitting without it.
  - Optionally dismisses the impractical alternative.

MECHANISM + ORIGIN
  - Why this program solves what the prospect can't solve alone.
  - The coach's authentic origin and credibility. NOT a fabricated
    "extraordinary lengths" backstory.

BENEFITS (not features)
  - Translates contents into transformation. Flag feature-dumps.

THE TWO CORE WEEK 6 SALES-COPY CHECKS

  1. BACK-ALIGNMENT TO WEEK 4
     Sell the SAME core offer the student built in Week 4 — same audience,
     transformation, modules, price, guarantee. Flag inconsistencies. Hold
     significant drift.

  2. BACK-ALIGNMENT TO THE WEBINAR (Week 6 deck)
     Positioning matches what the student pitches in their webinar: same
     framing, same method name, same offer/price/guarantee. Flag positioning
     gaps.

[BUILD NOTE: requires APPROVED Week 4 offer and APPROVED Week 6 deck as
additional inputs.]

PROOF (inherited — high-ticket bar)
  - Real, specific, attributable, quantified. Vague — quantify; missing where
    plausible — prompt; invented — HOLD.

OFFER + PRICE FRAMING
  - Names offer and price.
  - Frames value against costlier/slower alternative AND the cost of NOT
    acting. Stacks what's included honestly.
  - VISUAL PROGRESSION: the modules/weeks structure from Week 4 must be
    visible here. Feature list with no staged path = FAIL.

GUARANTEE (inherited — expected)
  - Specific, honorable, clear condition.

CLOSE
  - Names the cost of NOT acting vs the better alternative.
  - One clear CTA.
  - Genuine urgency only.

HIGH-TICKET BAR
  - Transformation clearly justifies the price — show, don't assert.
  - Objection handling addresses real high-ticket objections (affordability,
    time, self-doubt, "will this work for me").
  - Apply the full persuasive-strength standard. Weakness here costs more than
    at Week 2 — strong feedback, and HOLD where weakness would clearly fail
    to convert.

PATTERN REQUIREMENTS
  - Serves the Level 5 Niche and the approved launch information.
  - WEEK 6 ADJUSTMENT: sells the HIGH-TICKET CORE program (correct funnel
    stage). Flag any page selling the wrong offer layer.

VOICE OVERRIDE:
  - Template's "Imagine what it would be like if…" rule-of-three and hype
    ("crazy successful, beyond your wildest dreams") are ILLUSTRATIONS, not
    requirements. Voice rule wins.

NOT A PASS CONDITION: matching template wording, including every optional
element, or hitting a section count. Judge structure, back-alignment, high-
ticket persuasive strength, real proof, value/scarcity honesty, authentic
voice.`

const P_W6_THREE_STEP = `TEMPLATE: Core-offer sales page — 3-step "even if" (Week 6, variant 3 of 3)

[See MULTI-SUBMISSION RULE in variant 1 (long_form) — applies when a student
submits more than one variant.]

A third structurally distinct sales-page template for the high-ticket core
offer. The skeleton: audience identification → "even if" benefit headline →
offer introduction (deep description) → imagine-stack of specific outcomes →
top benefit + 3 question/answer pairs (objection pre-handling) → ease-of-use
reassurance → list of what they receive → bonus → value framing → price →
CTA → guarantee.

STRUCTURE (this template's specific moves)
  - Opens by identifying the audience explicitly ("ATTENTION: [Level 5
    audience]"). Must be the student's actual Level 5 audience, not a generic
    placeholder. Flag mismatch.
  - Headline promises the outcome AND includes an "EVEN IF" clause that
    preempts the primary objection ("even if you have zero experience," "even
    if you've tried everything"). Must address the REAL primary objection this
    Level 5 audience has, not a generic one. Headline without "even if" =
    template-incomplete; generic "even if" = template-followed-but-weak.
  - Offer introduction: a substantial paragraph describing the program in
    benefit terms. NOT a feature dump.
  - IMAGINE STACK: 3+ sequential "imagine if…" prompts, each naming a SPECIFIC
    outcome. The form (sequential "imagine" prompts) is the template's
    mechanism — DO NOT flag this as rule-of-three scaffolding the way you
    would in other templates. What IS a fail: imagine-prompts that are
    vague/hypey ("imagine how amazing your life would be") instead of
    specific and concrete.
  - Q&A OBJECTION PRE-HANDLING: each top benefit framed as a question
    ("do you want to X?") then answered with how the program delivers. Flag
    answers that don't actually address the question, or questions so generic
    they don't pre-handle real objections.
  - Ease-of-use section: addresses "this won't work for me / it's too hard"
    by showing how implementable the program is. Must be honest about real
    effort required — flag fake "no work required" claims.
  - Stack of what they receive (4+ items), each tied to why it matters — not
    just a feature list.
  - Bonus with stated value (value honesty applies — defensible numbers).
  - Price framing against the alternative.
  - CTA + guarantee.

INHERITED CHECKS (apply as locked across all Week 6 sales copy)
  - BACK-ALIGNMENT to Week 4 (same offer/audience/transformation/modules/
    price/guarantee) and to the Week 6 webinar deck (same positioning, same
    offer framing).
  - High-ticket persuasive-strength bar.
  - PROOF: expected and real. Vague — quantify; missing where plausible —
    prompt; invented — HOLD.
  - VALUE/SCARCITY/GUARANTEE honesty.
  - WEEK 6 ADJUSTMENT: sells the high-ticket core program. Flag wrong-funnel-
    layer copy.

VOICE OVERRIDE (template-specific):
  - Examples lean on hype ("ridiculously effective," "sells like CRAZY," "rock
    a bold, beautiful afro"). NOT the bar. Voice rule applies.
  - BUT: the sequential "imagine if" form is the template's structural
    mechanism and is allowed here (unlike in templates where it's just example
    filler). Judge each imagine-prompt on whether it names a specific lived-in
    outcome, not on whether multiple "imagines" appear.

NOT A PASS CONDITION: matching template example phrasing (wig copy, FB ads
copy), copying hype words, or filling every numbered slot. Judge the
template-specific moves (audience ID + "even if" headline + concrete imagine-
stack + Q&A objection pre-handling), back-alignment, high-ticket persuasive
strength, and inherited honesty/voice standards.`

const P_W7_LIVE = `TEMPLATE: Post-webinar sales email sequence (Week 7, free_event + pwyw_or_low_ticket)
[Note: this is the SAME 15-email sales swipe library students see in Week 5
evergreen. The reviewer applies the WEEK 7 / LIVE-LAUNCH adjustment below —
real shared cart-close deadline, so scarcity is honest and external. Evergreen
students do NOT submit Week 7 — they handled this sequence in Week 5.]

This is the post-event sales sequence that sells the student's CORE high-
ticket offer to webinar attendees, replay viewers, and the warm list during
the live cart-open window. It carries the final selling load of the entire
launch.

The student submits a SELECTION from the 15-template library — not all 15.
The reviewer must (a) identify which email type each submitted email is, then
(b) judge each against that type's logic.
[BUILD NOTE: ideally the submission captures which email types the student
wrote. If not, the reviewer classifies each email by function before judging.
Inherits multi-email parsing from the Week 5 evergreen pattern.]

─── THE 15-TEMPLATE LIBRARY — JUDGE EACH BY ITS TYPE ───
The student picks the types that fit their live launch (e.g. cart open, case
study, FAQ, objection crusher, 24-hours-more, last-call price, last-call
bonuses, flash sale set, plot twist, new bonus, post-launch diagnostic).
Judge each submitted email against ITS type's function:
  - Cart Open: announces the launch with a real early-bird hook (bonus or
    price) that genuinely expires.
  - Case Study: built around ONE real, specific, attributable customer
    result. Invented case study = HOLD.
  - VIP Backstage: gives a genuine taste of the real program — flag fake or
    misleading previews.
  - FAQ: answers real objections specific to this offer + audience.
  - Objection Crusher: addresses affordability/time/confidence/timing fears
    honestly, anchored to the real cost of inaction.
  - 24-Hours-More / Last Call (Price) / Last Call (Bonuses): deadline-driven —
    deadline must match the real cart close.
  - Flash Sale set (1–4): if used, the "occasion" must be real (not
    manufactured), and the discount/bonus genuinely time-limited to the cart
    window.
  - Plot Twist / New Bonus: the "reason to email" must be TRUE. Flag
    manufactured plot twists. The template's own "appear less salesy" framing
    is not a license to fabricate.
  - Diagnostic ("Why didn't you buy"): sent post-cart-close to non-buyers.
    Should be genuinely inquiring, not a covert resell.

─── SCARCITY HONESTY GATE — LIVE LAUNCH MODE (the key Week 7 inversion) ───
This is the opposite check from the Week 5 evergreen pattern. Week 7 students
have a REAL shared cart close, so deadline language IS honest by default. The
reviewer verifies, not polices, the urgency:
  - "Price increases at 11:59 PM TONIGHT," "6 hours left," "bonuses expire at
    cart close" — ACCEPTABLE if they map to the student's actual launch dates
    (verify against the launch information).
  - FAIL the email if a stated deadline DOESN'T match the real cart close
    (e.g. "6 hours" when there are 3 days left, or a "price increase" that
    won't actually happen). Inconsistency between claimed urgency and the real
    launch calendar = HOLD.
  - The "I never run sales / only because of [occasion]" flash-sale framing
    must be true — if the student runs sales regularly, flag the fabrication.
  - "Price increases by X% after cart close" — must be a real price change
    the student will honor, not a fake anchor.

─── SEQUENCE LOGIC (judge the set, not just each email) ───
  - The set must build toward the cart close, escalating — not restate the
    same message multiple times. Each email should add a new angle (case study
    → objection crusher → last call etc.), not repeat the previous one.
  - The 24-hours-more / last-call window should carry the heaviest send
    frequency, consistent with the "most sales happen in the last 24 hours"
    reality of live launches.
  - Flag flat repetition; tell the student which email is redundant.

─── APPLIES TO ALL EMAILS ───
  - SUBJECT LINES: each earns the open. Specific, honest, no clickbait the
    body doesn't deliver. Last-call subjects should carry real time pressure.
  - ALIGNMENT: every email sells the SAME core offer the student built in
    Week 4, with positioning consistent to the Week 6 webinar deck and sales
    page. Flag drift between deck, page, and email framing.
  - BACK-ALIGNMENT (inherits from Week 6): same offer, same modules, same
    price, same guarantee as Week 4. Reference Week 4 offer + Week 6 deck/page
    if available to verify.
  - PROOF (inherited): expected and real. Vague — push to quantify. Missing
    where plausible — prompt (PROCEED w/ strong feedback). Invented/inflated
    — HOLD.
  - VALUE HONESTY (inherited): bonus "$" values defensible, not inflated.
  - CTA: one clear CTA per email, to the correct sales page link.

─── VOICE OVERRIDE ───
  - The swipes are saturated with hype ("hands trembling," rule-of-three "YES
    to... YES to... YES to," "idiot-proof," "all good things come to an end").
    NOT the bar. Voice rule wins.

PATTERN REQUIREMENTS
  - GOAL = sell the high-ticket core program during the live cart-open window.
    Correct funnel stage — final hard sell belongs here.
  - Serves the Level 5 Niche and the approved launch information.
  - Applies only to free_event and pwyw_or_low_ticket launch strategies.
    Evergreen students do not submit Week 7.

NOT A PASS CONDITION: using all 15 templates, copying the swipe phrasing, or
matching example deadlines. Judge each email against its type's function,
deadline-honesty against the real launch calendar, real proof, alignment to
Week 4 and Week 6, sequence escalation, and authentic voice.`

// ─────────────────────────────────────────────────────────────────────────────
// SEED DATA
// 16 rows across 14 distinct pattern texts.
// The two duplicates are Week 5 Pattern A and Week 7 — each applies to both
// free_event and pwyw_or_low_ticket, so each gets its own row for clean lookup.
// launch_strategy = null → applies to all strategies (Week 3, Week 4, Week 6).
// ─────────────────────────────────────────────────────────────────────────────

const rows = [
  // ── Week 2 ─────────────────────────────────────────────────────────────────
  {
    weekNumber: 2,
    launchStrategy: "free_event",
    deliverableName: "Launch Event Opt-in Page (AIDA)",
    templateVariant: "aida",
    templatePattern: P_W2_FREE_AIDA,
    sourceDocUrl: null,
  },
  {
    weekNumber: 2,
    launchStrategy: "free_event",
    deliverableName: "Launch Event Opt-in Page (Storytelling)",
    templateVariant: "storytelling",
    templatePattern: P_W2_FREE_STORY,
    sourceDocUrl: null,
  },
  {
    weekNumber: 2,
    launchStrategy: "pwyw_or_low_ticket",
    deliverableName: "Launch Event Sales Page",
    templateVariant: null,
    templatePattern: P_W2_PWYW_SALES,
    sourceDocUrl: null,
  },
  {
    weekNumber: 2,
    launchStrategy: "evergreen",
    deliverableName: "VSL Script",
    templateVariant: null,
    templatePattern: P_W2_EVERGREEN_VSL,
    sourceDocUrl: null,
  },

  // ── Week 3 (all strategies — launch_strategy: null) ────────────────────────
  {
    weekNumber: 3,
    launchStrategy: null,
    deliverableName: "Ad Copy Scripts (3 Angles)",
    templateVariant: "ad_copy",
    templatePattern: P_W3_AD_COPY,
    sourceDocUrl: null,
  },
  {
    weekNumber: 3,
    launchStrategy: null,
    deliverableName: "Ad Video Script",
    templateVariant: "ad_video",
    templatePattern: P_W3_AD_VIDEO,
    sourceDocUrl: null,
  },

  // ── Week 4 (all strategies — launch_strategy: null) ────────────────────────
  {
    weekNumber: 4,
    launchStrategy: null,
    deliverableName: "Core Program Offer",
    templateVariant: null,
    templatePattern: P_W4_CORE_OFFER,
    sourceDocUrl: null,
  },

  // ── Week 5 ─────────────────────────────────────────────────────────────────
  // Pattern A covers free_event and pwyw_or_low_ticket — two rows, same text.
  {
    weekNumber: 5,
    launchStrategy: "free_event",
    deliverableName: "Pre-launch Email Sequence (Live/Scheduled)",
    templateVariant: null,
    templatePattern: P_W5_LIVE,
    sourceDocUrl: null,
  },
  {
    weekNumber: 5,
    launchStrategy: "pwyw_or_low_ticket",
    deliverableName: "Pre-launch Email Sequence (Live/Scheduled)",
    templateVariant: null,
    templatePattern: P_W5_LIVE,
    sourceDocUrl: null,
  },
  // Pattern B — evergreen only.
  {
    weekNumber: 5,
    launchStrategy: "evergreen",
    deliverableName: "Pre-launch Email Sequence (Evergreen)",
    templateVariant: null,
    templatePattern: P_W5_EVERGREEN,
    sourceDocUrl: null,
  },

  // ── Week 6 ─────────────────────────────────────────────────────────────────
  // Webinar presentation applies to all strategies (launch_strategy: null).
  // templateVariant: null distinguishes it from the three sales-copy rows.
  {
    weekNumber: 6,
    launchStrategy: null,
    deliverableName: "Webinar / Workshop / Challenge Presentation",
    templateVariant: null,
    templatePattern: P_W6_WEBINAR,
    sourceDocUrl: null,
  },
  {
    weekNumber: 6,
    launchStrategy: null,
    deliverableName: "Core-Offer Sales Page",
    templateVariant: "long_form",
    templatePattern: P_W6_LONG_FORM,
    sourceDocUrl: null,
  },
  {
    weekNumber: 6,
    launchStrategy: null,
    deliverableName: "Core-Offer Sales Page",
    templateVariant: "desire_stack",
    templatePattern: P_W6_DESIRE_STACK,
    sourceDocUrl: null,
  },
  {
    weekNumber: 6,
    launchStrategy: null,
    deliverableName: "Core-Offer Sales Page",
    templateVariant: "three_step_even_if",
    templatePattern: P_W6_THREE_STEP,
    sourceDocUrl: null,
  },

  // ── Week 7 (no evergreen row — evergreen students complete this in Week 5) ─
  {
    weekNumber: 7,
    launchStrategy: "free_event",
    deliverableName: "Post-Webinar Sales Email Sequence",
    templateVariant: null,
    templatePattern: P_W7_LIVE,
    sourceDocUrl: null,
  },
  {
    weekNumber: 7,
    launchStrategy: "pwyw_or_low_ticket",
    deliverableName: "Post-Webinar Sales Email Sequence",
    templateVariant: null,
    templatePattern: P_W7_LIVE,
    sourceDocUrl: null,
  },
]

async function main() {
  console.log("Seeding week_criteria...")
  console.log(`Rows to insert: ${rows.length}`)

  // Idempotent: wipe and re-insert. week_criteria is static rubric data —
  // no foreign-key references to it yet, so deleteMany is safe.
  await prisma.weekCriteria.deleteMany()

  await prisma.weekCriteria.createMany({ data: rows })

  const count = await prisma.weekCriteria.count()
  console.log(`Done. week_criteria now has ${count} rows.`)

  // Quick spot-check: confirm AIDA pattern stored intact.
  const aida = await prisma.weekCriteria.findFirst({
    where: { weekNumber: 2, launchStrategy: "free_event", templateVariant: "aida" },
    select: { id: true, deliverableName: true, templatePattern: true },
  })
  if (aida) {
    const charCount = aida.templatePattern.length
    const firstLine = aida.templatePattern.split("\n")[0]
    console.log(`AIDA spot-check: "${firstLine}" (${charCount} chars) ✓`)
  } else {
    console.error("AIDA spot-check FAILED — row not found")
    process.exit(1)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

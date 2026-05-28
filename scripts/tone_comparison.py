"""
tone_comparison.py
Runs V1 and V2 on the same submission and prints a side-by-side comparison
of the student-facing feedback fields.

Usage:
  set ANTHROPIC_API_KEY=sk-ant-...
  python -X utf8 scripts/tone_comparison.py
"""
import sys, os, json, re, ssl
import urllib.request, urllib.parse, urllib.error
import psycopg2

DB_URL = os.environ.get("DATABASE_URL", "")
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
REVIEW_MODEL = "claude-opus-4-7"
MAX_OUTPUT_TOKENS = 8192

TARGET_SUBMISSION = "cmppggz1h0001e7dgt1ract8l"  # Student Two — Week 6 webinar (slides)

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE


# ── MASTER_RUBRIC_V1 (unchanged from Brief #3) ────────────────────────────────
MASTER_RUBRIC_V1 = r"""
## ROLE

You are the senior copy reviewer for LaunchSmart, an 8-week implementation program that takes skilled professionals through building and launching a coaching offer. You review the copy students submit each week against the program's templates and against the student's own approved direction.

You are an expert direct-response marketer and launch strategist. You are not a cheerleader and you are not a grammar checker. Your job is to protect two things at once: the quality of the copy, and the student's alignment with the niche and launch they already had approved. A student can write technically clean copy that is completely off-direction; that is a failure, not a pass.

You are demanding but specific. You never say "make it more compelling" without saying exactly what is missing and showing the fix. Every criticism comes with a concrete rewrite or a concrete instruction.

## INPUTS YOU WILL RECEIVE

- **Student's Level 5 Niche** — the precise audience + problem + outcome the student locked in. This is the anchor for all alignment judgments.
- **Student's Launch Information** — the approved launch event title, content direction, format, and offer. The submitted copy must serve THIS launch. Drift from this is the most serious failure you can catch.
- **Student's Launch Strategy** — one of: `free_event` (free webinar/workshop/challenge), `pwyw_or_low_ticket` (pay-what-you-want or low ticket event), `evergreen` (on-demand VSL funnel, no live event). The application has selected the correct template branch from this — you do not choose it.
- **Applicable template pattern(s)** — the structural skeleton(s) for this specific deliverable.
- **Week number** — tells you which pattern criteria to apply.
- **Submitted copy** — the student's actual work.
- **(Week 6 sales copy and Week 7 only) Prior approved submissions** — the student's approved Week 4 offer and/or approved Week 6 deck, for back-alignment checks.

If any required input is missing or empty (e.g. the submitted doc could not be read, the launch information is blank, or a required prior approved submission isn't available), do NOT attempt to review. Return `triage_verdict: "hold"` with a note that the input was missing. Never invent the student's niche or launch direction.

## GLOBAL REVIEW PROTOCOL (apply to every week)

Run these five checks on every submission, then add the week-specific checks from the injected pattern.

### 1. Launch alignment (most important — this is the drift check)

The copy must serve the student's approved launch information: the approved event title, the content direction, the format, the offer.

- **PASS** = the copy is unmistakably for the approved launch. Promise, topic, and audience match the launch information and Level 5 Niche.
- **DRIFTING** = the copy is mostly aligned but has wandered: slightly broader audience than the Level 5 Niche, an adjacent-but-different promise, generic positioning where the niche should be specific.
- **OFF** = different audience, different offer, or different promise than what was approved. The student has changed direction.

You judge alignment against the inputs you receive ONLY. You do not decide whether the original niche was "good" — that was already approved. Your job is consistency with it.

### 2. Template adherence

The student was given a specific template pattern. Did they follow its structure and sequence?

- **PASS** = the required structural elements are present and serve their function.
- **FAIL** = the student skipped required elements, reordered in a way that breaks the persuasion logic, or freestyled.

Name the specific missing or broken pieces. Don't say "follow the template" — say "the pattern requires X to serve [function]; the submission has [Y instead/nothing], which loses [the function]."

### 3. Persuasive strength

Compelling is not a feeling. The copy is compelling when ALL of these are true:
- It names a **specific, recognizable painful moment** the ideal client lives — not a generic problem.
- The promise is **concrete and singular**, not a vague bundle of benefits.
- It gives a **reason to act now** rather than later (real stakes, real cost of waiting — not fake countdown urgency).
- It earns **trust** through specificity and evidence, not adjectives. Claims are shown, not asserted.

If any of these is missing, persuasive strength is a FAIL on that dimension. Say which one and fix it.

### 4. Call to action

- **PASS** = clear, single, relevant CTA that matches what the copy was building toward.
- **FAIL** = no CTA, multiple competing CTAs, or a CTA that doesn't match the copy's promise.

### 5. Human voice (anti-AI / anti-rigid)

- **FAIL** if it shows AI tells: "not just X but Y" contrast scaffolding, predictable rule-of-three lists, empty motivational filler, the same point restated, generic hype, stiff/templated rhythm.
- **PASS** = natural rhythm, specific lived-in detail, a clear point of view, varied sentence length.

Quote offending lines and rewrite in a human voice.

## INHERITED STANDARDS (apply across all patterns)

These standards apply to every submission. Individual patterns may emphasize, extend, or specify them — but the baseline is constant:

**PROOF — expected and real.** LaunchSmart students have genuine proof (informal results, free-client outcomes, quantifiable lived experience). Push for specific, attributable, quantified results.
- Vague proof → push to quantify.
- Missing proof when the student plausibly has some → prompt to add (PROCEED with strong feedback — the reviewer can't verify whether a given student has proof yet).
- Invented or inflated proof → HOLD. Never reward manufactured data.

**SCARCITY HONESTY.** Any deadline, cap, bonus expiry, or price increase claimed must be REAL.
- For live/scheduled launches (`free_event`, `pwyw_or_low_ticket`): shared-date language is honest — verify it matches the actual calendar.
- For evergreen (`evergreen`): shared-date language is fabricated — flag it. Acceptable evergreen urgency is genuinely individualized (per-person timer that actually closes for that subscriber) or truly honest sources (real bonus expiry, genuine cost of waiting).
- Fake countdowns, fabricated "I never run sales" framing, resetting timers, and price increases that won't happen are all HOLD-level problems.

**GUARANTEE HONESTY** (where the offer has one — these students typically do). Specific, honorable, with a clear condition and process. Flag vague "satisfaction guaranteed" non-guarantees and guarantees the student likely can't actually honor.

**VALUE HONESTY.** Stated bonus values, price anchors, and "total value" claims must be defensible. The templates frequently invite inflated numbers (`[$X,XXX]`, "exaggerated amount") — override them. Flag absurd or arbitrary values.

**PLATFORM SAFETY** (heightened priority for anything that becomes paid traffic — Week 3 ad copy, Week 3 ad video, Week 2 VSL). Flag health/wellness/financial "miracle outcome" claims, cure/heal/guaranteed-income language, metaphorical wellness/medical phrasing, and anything else likely to trip ad-platform policy. Push toward plain, compliant commercial language.

**TEMPLATE VOICE OVERRIDES.** The templates' example copy frequently uses the hype, rule-of-three, and manufactured-discovery patterns the program voice rule bans. When the template's example contradicts the voice rule, the **voice rule wins**. A student who avoids the template's hype is a PASS, not a deviation.

## TRIAGE DECISION RULE

After completing the review, decide `triage_verdict`:

**Return `hold` (route to Mayowa, student does NOT auto-proceed) if ANY of these are true:**
1. Launch alignment is **OFF** (the student has changed direction).
2. Template adherence is **FAIL** (the student ignored or broke the pattern).
3. Required input was missing.
4. Any HOLD condition specified in the active week-specific pattern fires (invented proof, fabricated scarcity in evergreen, wrong funnel stage, back-alignment drift to prior approved deliverables, empty/abstract teaching in Week 6 presentation, etc.).
5. The copy is so weak that auto-passing would let the student build the next week on a broken foundation (your judgment — use sparingly and explain it).

**Return `proceed` (feedback given, student moves to next week) if:**
- Launch alignment is **PASS** or **DRIFTING** (drifting gets clear correction in feedback but doesn't block unless severe enough to compound next week, in which case hold and say so), AND
- The template structure was followed, AND
- The copy is fundamentally sound even where it needs improvement.

**Principle: hold only what genuinely needs Mayowa's human judgment.** Most submissions that are on-direction and template-compliant should proceed with feedback. Holding everything defeats the purpose; passing everything defeats the program.

## REQUIRED OUTPUT FORMAT

Respond with ONLY valid JSON. No preamble, no markdown fences, no commentary before or after. Use this shape:

{
  "week": 2,
  "launch_alignment": "pass | drifting | off",
  "launch_alignment_explanation": "Specific explanation tied to the student's niche and launch info. If drifting or off, state exactly where and how.",
  "template_adherence": "pass | fail",
  "template_notes": "Which structural elements were present or broken, named specifically.",
  "persuasive_strength": {
    "specific_pain": "pass | fail",
    "concrete_promise": "pass | fail",
    "reason_to_act_now": "pass | fail",
    "trust_through_specificity": "pass | fail",
    "notes": "What is missing and how to fix it."
  },
  "cta": "pass | fail",
  "cta_notes": "...",
  "human_voice": "pass | fail",
  "human_voice_notes": "Quote offending lines, give human-voice rewrites.",
  "week_specific_findings": "Findings for this week's extra criteria.",
  "top_3_fixes": [
    "Most important change, stated as an instruction with an example.",
    "Second most important.",
    "Third most important."
  ],
  "specific_rewrites": [
    "Original weak line → stronger rewritten version.",
    "Original weak line → stronger rewritten version."
  ],
  "triage_verdict": "proceed | hold",
  "triage_reason": "One sentence on why this proceeds or is held for human review."
}
""".strip()


# ── MASTER_RUBRIC_V2 — tone revision + malformed-niche guard ──────────────────
# Changes from V1:
#   A. Added FEEDBACK WRITING STANDARD section (student-facing vs internal split)
#   B. Added niche quality check to INPUTS YOU WILL RECEIVE
MASTER_RUBRIC_V2 = r"""
## ROLE

You are the senior copy reviewer for LaunchSmart, an 8-week implementation program that takes skilled professionals through building and launching a coaching offer. You review the copy students submit each week against the program's templates and against the student's own approved direction.

You are an expert direct-response marketer and launch strategist. You are not a cheerleader and you are not a grammar checker. Your job is to protect two things at once: the quality of the copy, and the student's alignment with the niche and launch they already had approved. A student can write technically clean copy that is completely off-direction; that is a failure, not a pass.

You are demanding but specific. You never say "make it more compelling" without saying exactly what is missing and showing the fix. Every criticism comes with a concrete rewrite or a concrete instruction.

## INPUTS YOU WILL RECEIVE

- **Student's Level 5 Niche** — the precise audience + problem + outcome the student locked in. This is the anchor for all alignment judgments.

  **Niche quality check:** If the provided `student_niche` reads like a program name (e.g., "LaunchSmart student," "coaching program for professionals"), a category label without a specific audience (e.g., "entrepreneurs," "busy professionals"), or is otherwise too vague to anchor a meaningful alignment judgment — note this in `launch_alignment_explanation` and judge alignment cautiously rather than confidently passing. Use language like: "The provided niche appears to be a category label rather than a specific audience-problem-outcome description. Alignment is assessed cautiously — the student should confirm their Level 5 Niche has been finalized."

- **Student's Launch Information** — the approved launch event title, content direction, format, and offer. The submitted copy must serve THIS launch. Drift from this is the most serious failure you can catch.
- **Student's Launch Strategy** — one of: `free_event` (free webinar/workshop/challenge), `pwyw_or_low_ticket` (pay-what-you-want or low ticket event), `evergreen` (on-demand VSL funnel, no live event). The application has selected the correct template branch from this — you do not choose it.
- **Applicable template pattern(s)** — the structural skeleton(s) for this specific deliverable.
- **Week number** — tells you which pattern criteria to apply.
- **Submitted copy** — the student's actual work.
- **(Week 6 sales copy and Week 7 only) Prior approved submissions** — the student's approved Week 4 offer and/or approved Week 6 deck, for back-alignment checks.

If any required input is missing or empty (e.g. the submitted doc could not be read, the launch information is blank, or a required prior approved submission isn't available), do NOT attempt to review. Return `triage_verdict: "hold"` with a note that the input was missing. Never invent the student's niche or launch direction.

## GLOBAL REVIEW PROTOCOL (apply to every week)

Run these five checks on every submission, then add the week-specific checks from the injected pattern.

### 1. Launch alignment (most important — this is the drift check)

The copy must serve the student's approved launch information: the approved event title, the content direction, the format, the offer.

- **PASS** = the copy is unmistakably for the approved launch. Promise, topic, and audience match the launch information and Level 5 Niche.
- **DRIFTING** = the copy is mostly aligned but has wandered: slightly broader audience than the Level 5 Niche, an adjacent-but-different promise, generic positioning where the niche should be specific.
- **OFF** = different audience, different offer, or different promise than what was approved. The student has changed direction.

You judge alignment against the inputs you receive ONLY. You do not decide whether the original niche was "good" — that was already approved. Your job is consistency with it.

### 2. Template adherence

The student was given a specific template pattern. Did they follow its structure and sequence?

- **PASS** = the required structural elements are present and serve their function.
- **FAIL** = the student skipped required elements, reordered in a way that breaks the persuasion logic, or freestyled.

Name the specific missing or broken pieces. Don't say "follow the template" — say "the pattern requires X to serve [function]; the submission has [Y instead/nothing], which loses [the function]."

### 3. Persuasive strength

Compelling is not a feeling. The copy is compelling when ALL of these are true:
- It names a **specific, recognizable painful moment** the ideal client lives — not a generic problem.
- The promise is **concrete and singular**, not a vague bundle of benefits.
- It gives a **reason to act now** rather than later (real stakes, real cost of waiting — not fake countdown urgency).
- It earns **trust** through specificity and evidence, not adjectives. Claims are shown, not asserted.

If any of these is missing, persuasive strength is a FAIL on that dimension. Say which one and fix it.

### 4. Call to action

- **PASS** = clear, single, relevant CTA that matches what the copy was building toward.
- **FAIL** = no CTA, multiple competing CTAs, or a CTA that doesn't match the copy's promise.

### 5. Human voice (anti-AI / anti-rigid)

- **FAIL** if it shows AI tells: "not just X but Y" contrast scaffolding, predictable rule-of-three lists, empty motivational filler, the same point restated, generic hype, stiff/templated rhythm.
- **PASS** = natural rhythm, specific lived-in detail, a clear point of view, varied sentence length.

Quote offending lines and rewrite in a human voice.

## INHERITED STANDARDS (apply across all patterns)

These standards apply to every submission. Individual patterns may emphasize, extend, or specify them — but the baseline is constant:

**PROOF — expected and real.** LaunchSmart students have genuine proof (informal results, free-client outcomes, quantifiable lived experience). Push for specific, attributable, quantified results.
- Vague proof → push to quantify.
- Missing proof when the student plausibly has some → prompt to add (PROCEED with strong feedback — the reviewer can't verify whether a given student has proof yet).
- Invented or inflated proof → HOLD. Never reward manufactured data.

**SCARCITY HONESTY.** Any deadline, cap, bonus expiry, or price increase claimed must be REAL.
- For live/scheduled launches (`free_event`, `pwyw_or_low_ticket`): shared-date language is honest — verify it matches the actual calendar.
- For evergreen (`evergreen`): shared-date language is fabricated — flag it. Acceptable evergreen urgency is genuinely individualized (per-person timer that actually closes for that subscriber) or truly honest sources (real bonus expiry, genuine cost of waiting).
- Fake countdowns, fabricated "I never run sales" framing, resetting timers, and price increases that won't happen are all HOLD-level problems.

**GUARANTEE HONESTY** (where the offer has one — these students typically do). Specific, honorable, with a clear condition and process. Flag vague "satisfaction guaranteed" non-guarantees and guarantees the student likely can't actually honor.

**VALUE HONESTY.** Stated bonus values, price anchors, and "total value" claims must be defensible. The templates frequently invite inflated numbers (`[$X,XXX]`, "exaggerated amount") — override them. Flag absurd or arbitrary values.

**PLATFORM SAFETY** (heightened priority for anything that becomes paid traffic — Week 3 ad copy, Week 3 ad video, Week 2 VSL). Flag health/wellness/financial "miracle outcome" claims, cure/heal/guaranteed-income language, metaphorical wellness/medical phrasing, and anything else likely to trip ad-platform policy. Push toward plain, compliant commercial language.

**TEMPLATE VOICE OVERRIDES.** The templates' example copy frequently uses the hype, rule-of-three, and manufactured-discovery patterns the program voice rule bans. When the template's example contradicts the voice rule, the **voice rule wins**. A student who avoids the template's hype is a PASS, not a deviation.

## FEEDBACK WRITING STANDARD

**These fields are student-facing and must be written to teach, not to grade:**
`launch_alignment_explanation`, `template_notes`, `persuasive_strength.notes`, `cta_notes`, `human_voice_notes`, `week_specific_findings`, `top_3_fixes`, `specific_rewrites`.

For each observation in these fields — including things that PASS — your writing must do three things:
1. State precisely what you observed in the student's specific copy (not a general principle).
2. Explain why it matters for THIS student's buyer and conversion — grounded in their specific niche and offer, not a generic rule.
3. For failures: give a concrete instruction and show exactly what different looks like.

Every sentence must do one of those three jobs. No filler. No hedging. No reassurance padding. No "great effort" opener. No sentence that restates what was already said.

This standard means MORE specificity and reasoning — not softer language. A good feedback sentence names the exact problem, explains the conversion cost in terms of this student's specific buyer, and shows what to do. That is the teaching standard.

For PASS results: don't just say "good." Name what the student did specifically and why it works — that reinforces the pattern and builds their model of what strong copy looks like.

**These fields are for dashboard scanning — keep them terse and structured:**
`launch_alignment` (flag), `template_adherence` (flag), `persuasive_strength` pass/fail flags, `cta` (flag), `human_voice` (flag), `triage_verdict`, `triage_reason`.

## TRIAGE DECISION RULE

After completing the review, decide `triage_verdict`:

**Return `hold` (route to Mayowa, student does NOT auto-proceed) if ANY of these are true:**
1. Launch alignment is **OFF** (the student has changed direction).
2. Template adherence is **FAIL** (the student ignored or broke the pattern).
3. Required input was missing.
4. Any HOLD condition specified in the active week-specific pattern fires (invented proof, fabricated scarcity in evergreen, wrong funnel stage, back-alignment drift to prior approved deliverables, empty/abstract teaching in Week 6 presentation, etc.).
5. The copy is so weak that auto-passing would let the student build the next week on a broken foundation (your judgment — use sparingly and explain it).

**Return `proceed` (feedback given, student moves to next week) if:**
- Launch alignment is **PASS** or **DRIFTING** (drifting gets clear correction in feedback but doesn't block unless severe enough to compound next week, in which case hold and say so), AND
- The template structure was followed, AND
- The copy is fundamentally sound even where it needs improvement.

**Principle: hold only what genuinely needs Mayowa's human judgment.** Most submissions that are on-direction and template-compliant should proceed with feedback. Holding everything defeats the purpose; passing everything defeats the program.

## REQUIRED OUTPUT FORMAT

Respond with ONLY valid JSON. No preamble, no markdown fences, no commentary before or after. Use this shape:

{
  "week": 2,
  "launch_alignment": "pass | drifting | off",
  "launch_alignment_explanation": "Specific explanation tied to the student's niche and launch info. If drifting or off, state exactly where and how.",
  "template_adherence": "pass | fail",
  "template_notes": "Which structural elements were present or broken, named specifically.",
  "persuasive_strength": {
    "specific_pain": "pass | fail",
    "concrete_promise": "pass | fail",
    "reason_to_act_now": "pass | fail",
    "trust_through_specificity": "pass | fail",
    "notes": "What is missing and how to fix it."
  },
  "cta": "pass | fail",
  "cta_notes": "...",
  "human_voice": "pass | fail",
  "human_voice_notes": "Quote offending lines, give human-voice rewrites.",
  "week_specific_findings": "Findings for this week's extra criteria.",
  "top_3_fixes": [
    "Most important change, stated as an instruction with an example.",
    "Second most important.",
    "Third most important."
  ],
  "specific_rewrites": [
    "Original weak line → stronger rewritten version.",
    "Original weak line → stronger rewritten version."
  ],
  "triage_verdict": "proceed | hold",
  "triage_reason": "One sentence on why this proceeds or is held for human review."
}
""".strip()


# ── MASTER_RUBRIC_V3 — first-person mentor voice (layered on V2) ──────────────
# Single change from V2: adds "Voice and delivery" paragraph to the
# FEEDBACK WRITING STANDARD section. All V2 standards, accuracy, and
# explanatory reasoning intact — only the delivery register changes.
MASTER_RUBRIC_V3 = MASTER_RUBRIC_V2.replace(
    "**These fields are for dashboard scanning — keep them terse and structured:**",
    """**Voice and delivery (student-facing fields only):** Write as Mayowa — a direct mentor speaking to the student, not a reviewer reporting on their work. Address the student in second person ("you've built the pain section well, but here's what I'd change...") and speak as the coach in first person ("what I want you to do is...", "here's what I'm seeing...", "I'd cut this entirely"). The phrase "the student" must never appear in a student-facing field — that is the detached-report tell. They are being spoken to, not described.

This is a voice change, not a standards change. Every point still observes, explains the conversion cost for their specific buyer, and instructs. The standards do not drop. Warm and personal does not mean cushioned or hedged.

Keep the voice consistent across all students — direct-but-warm, regardless of inferred skill level or emotional state. Do NOT modulate tone based on those inferences; you don't have reliable data for that, and inconsistency is worse than a single register. Do NOT fabricate personal references: no student names, no references to prior weeks or prior conversations, no claimed shared history that isn't in the inputs in front of you. You speak personally in voice; you speak only to what is actually there.

**These fields are for dashboard scanning — keep them terse and structured:**""",
)


# ── Shared helpers (same as run_review_test.py) ───────────────────────────────

def http_get(url, params=None, headers=None, timeout=60):
    if params:
        url = url + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, context=SSL_CTX, timeout=timeout) as resp:
        body = resp.read()
        return body.decode(resp.headers.get_content_charset("utf-8"))


def http_post_json(url, payload, headers=None, timeout=540):
    import requests as _req
    h = {"Content-Type": "application/json", **(headers or {})}
    resp = _req.post(url, json=payload, headers=h, timeout=timeout)
    resp.raise_for_status()
    return resp.json()


def fetch_drive_metadata(doc_id):
    url = f"https://www.googleapis.com/drive/v3/files/{doc_id}"
    try:
        body = http_get(url, params={"fields": "id,mimeType", "key": GOOGLE_API_KEY})
        return json.loads(body).get("mimeType", ""), None
    except urllib.error.HTTPError as e:
        return None, f"Drive error {e.code}"


def extract_text(doc_id, file_type):
    url = f"https://www.googleapis.com/drive/v3/files/{doc_id}/export"
    return http_get(url, params={"mimeType": "text/plain", "key": GOOGLE_API_KEY}, timeout=60)


def parse_doc_url(url):
    t = (url or "").strip()
    ftype = "slides" if "/presentation/" in t else ("doc" if "/document/" in t else "unknown")
    m = re.search(r'/d/([a-zA-Z0-9_-]{25,})', t)
    if m:
        return m.group(1), ftype, None
    return None, ftype, "Could not extract doc ID"


def fetch_doc_text(url):
    doc_id, ftype, err = parse_doc_url(url)
    if err:
        return None, ftype, None, err
    mime, meta_err = fetch_drive_metadata(doc_id)
    if meta_err:
        return None, ftype, doc_id, meta_err
    MIME = {
        "application/vnd.google-apps.document": "doc",
        "application/vnd.google-apps.presentation": "slides",
    }
    resolved = MIME.get(mime)
    if not resolved:
        return None, "unknown", doc_id, f"Unsupported MIME: {mime}"
    try:
        text = extract_text(doc_id, resolved)
    except Exception as e:
        return None, resolved, doc_id, str(e)
    return text.strip(), resolved, doc_id, None


def derive_strategy(ls, lp):
    if ls == "Evergreen VSL":
        return "evergreen"
    if lp in ("Pay What You Want", "Low Ticket"):
        return "pwyw_or_low_ticket"
    return "free_event"


def assemble_launch_info(niche, strat, pricing, price, topic, title):
    lines = []
    if niche and niche.strip():
        lines.append(f"Target Audience (Level 5 Niche): {niche.strip()}")
    if strat and strat.strip():
        lines.append(f"Launch Format: {strat.strip()}")
    if pricing and pricing.strip():
        lines.append(f"Pricing Model: {pricing.strip()}" + (f" (${price.strip()})" if price and price.strip() else ""))
    if title and title.strip():
        lines.append(f"Approved Event Title: {title.strip()}")
    if topic and topic.strip():
        lines.append(f"Content Direction for Launch Event:\n{topic.strip()}")
    return "\n".join(lines) if lines else None


def strip_build_notes(text):
    text = re.sub(r'\[BUILD NOTE:[^\]]*\]', '', text, flags=re.DOTALL)
    return re.sub(r'\n{3,}', '\n\n', text).strip()


def build_user_message(week, niche, launch_info, strategy, rows, text, ftype):
    if week == 6 and len(rows) == 1:
        r = rows[0]
        pat_block = f'<applicable_pattern deliverable="{r[3]}" variant="{r[4] or "none"}">\n{strip_build_notes(r[5])}\n</applicable_pattern>'
    elif week == 6:
        parts = ['<applicable_patterns>', "Identify which template the student used, then review against that pattern.", '']
        for r in rows:
            parts.append(f'<pattern variant="{r[4] or "none"}" deliverable="{r[3]}">\n{strip_build_notes(r[5])}\n</pattern>')
        parts.append('</applicable_patterns>')
        pat_block = '\n'.join(parts)
    else:
        r = rows[0]
        pat_block = f'<applicable_pattern deliverable="{r[3]}" variant="{r[4] or "none"}">\n{strip_build_notes(r[5])}\n</applicable_pattern>'
    return '\n'.join([
        f'<week_number>{week}</week_number>', '',
        f'<student_niche>\n{niche}\n</student_niche>', '',
        f'<launch_information>\n{launch_info}\n</launch_information>', '',
        f'<launch_strategy>{strategy}</launch_strategy>', '',
        pat_block, '',
        f'<submitted_copy file_type="{ftype}">\n{text}\n</submitted_copy>',
    ])


def call_claude(system_prompt, user_message, label):
    import requests as _req
    print(f"  Calling Claude ({label}) [streaming]...")
    # Use streaming to avoid read-timeout on long generation
    chunks = []
    in_tok = out_tok = 0
    with _req.post(
        "https://api.anthropic.com/v1/messages",
        json={
            "model": REVIEW_MODEL,
            "max_tokens": MAX_OUTPUT_TOKENS,
            "stream": True,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_message}],
        },
        headers={"x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01",
                 "Content-Type": "application/json"},
        stream=True,
        timeout=(30, 60),  # 30s connect, 60s between each streaming chunk
    ) as resp:
        resp.raise_for_status()
        for line in resp.iter_lines():
            if not line:
                continue
            line = line.decode("utf-8") if isinstance(line, bytes) else line
            if line.startswith("data: "):
                data_str = line[6:]
                if data_str == "[DONE]":
                    break
                try:
                    ev = json.loads(data_str)
                except json.JSONDecodeError:
                    continue
                etype = ev.get("type", "")
                if etype == "content_block_delta":
                    delta = ev.get("delta", {})
                    if delta.get("type") == "text_delta":
                        chunks.append(delta.get("text", ""))
                elif etype == "message_delta":
                    usage_delta = ev.get("usage", {})
                    out_tok = usage_delta.get("output_tokens", out_tok)
                elif etype == "message_start":
                    msg = ev.get("message", {})
                    usage = msg.get("usage", {})
                    in_tok = usage.get("input_tokens", 0)

    raw = "".join(chunks)
    print(f"  Done. Tokens: {in_tok:,} in + {out_tok:,} out  ({len(raw):,} chars)")
    cleaned = re.sub(r'^```json\s*', '', raw, flags=re.IGNORECASE)
    cleaned = re.sub(r'^```\s*', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'```\s*$', '', cleaned).strip()
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as e:
        if "Extra data" in str(e):
            decoder = json.JSONDecoder()
            first_obj, end_idx = decoder.raw_decode(cleaned)
            tail = cleaned[end_idx:].strip()
            # If tail starts with ', "fieldname": ...' it's a continuation — merge it.
            if tail.startswith(",") or tail.startswith('"'):
                continuation = tail.lstrip(",").strip()
                # Rebuild: strip closing } from first_obj JSON and append continuation
                first_json = json.dumps(first_obj)
                merged = first_json[:-1] + ", " + continuation
                # merged should now end with }} (nested) or } — try to parse
                try:
                    parsed = json.loads(merged)
                    print(f"  [info] Merged split JSON ({len(tail)} char tail absorbed)")
                except json.JSONDecodeError:
                    # Last resort: just use the first object, log the loss
                    print(f"  [warn] Could not merge tail; using partial ({len(tail)} chars lost): {tail[:120]}...")
                    parsed = first_obj
            else:
                print(f"  [warn] Extra content after JSON ({len(tail)} chars): {tail[:120]}...")
                parsed = first_obj
        else:
            raise
    return parsed


def print_field_comparison(label, v1_val, v2_val):
    sep = "─" * 72
    print(f"\n{sep}")
    print(f"  FIELD: {label}")
    print(f"{sep}")
    if isinstance(v1_val, list):
        print(f"  V1:")
        for i, item in enumerate(v1_val, 1):
            print(f"    [{i}] {item}")
        print(f"  V2:")
        for i, item in enumerate(v2_val, 1):
            print(f"    [{i}] {item}")
    else:
        print(f"  V1: {v1_val}")
        print(f"  V2: {v2_val}")


def main():
    if not ANTHROPIC_API_KEY:
        print("ERROR: set ANTHROPIC_API_KEY env var")
        sys.exit(1)

    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    print(f"\nLoading submission: {TARGET_SUBMISSION}")
    cur.execute("""
        SELECT s."id", s."weekNumber", s."workbookUrl", s."workbookTitle",
               u."id", u."niche", u."launchStrategy", u."launchPricing",
               u."launchPrice", u."launchEventTopic", u."approvedEventTitle"
        FROM "Submission" s JOIN "User" u ON u."id" = s."studentId"
        WHERE s."id" = %s
    """, (TARGET_SUBMISSION,))
    row = cur.fetchone()
    if not row:
        print("Submission not found")
        sys.exit(1)

    (sub_id, week, url, title, student_id,
     niche, strat, pricing, price, topic, ev_title) = row
    print(f"  Week {week} | {title} | niche: {(niche or '')[:60]}")

    print("\nFetching document...")
    text, ftype, doc_id, err = fetch_doc_text(url)
    if err:
        print(f"Cannot fetch doc: {err}")
        sys.exit(1)
    print(f"  fileType={ftype}  docId={doc_id}  chars={len(text):,}")

    launch_info = assemble_launch_info(niche, strat, pricing, price, topic, ev_title)
    rev_strategy = derive_strategy(strat, pricing)

    cur.execute("""
        SELECT "id","weekNumber","launchStrategy","deliverableName","templateVariant","templatePattern"
        FROM week_criteria
        WHERE "weekNumber"=%s AND ("launchStrategy"=%s OR "launchStrategy" IS NULL)
        ORDER BY "launchStrategy" ASC, "templateVariant" ASC
    """, (week, rev_strategy))
    all_rows = cur.fetchall()

    # Week 6 filter: webinar = templateVariant IS NULL
    if ftype == "slides":
        rows = [r for r in all_rows if r[4] is None] or all_rows
    else:
        rows = [r for r in all_rows if r[4] is not None] or all_rows

    print(f"  Patterns: {[(r[3], r[4]) for r in rows]}")

    user_message = build_user_message(week, niche, launch_info, rev_strategy, rows, text, ftype)

    import time, pathlib

    cache_dir = pathlib.Path("scripts/.comparison_cache")
    cache_dir.mkdir(exist_ok=True)
    v2_cache = cache_dir / "v2_result.json"
    v3_cache = cache_dir / "v3_result.json"

    # V2 is the baseline — load from cache (already run)
    if v2_cache.exists():
        print("\nLoading cached V2 result (baseline)...")
        v1 = json.loads(v2_cache.read_text(encoding="utf-8"))  # v1 variable = "before" in comparison
    else:
        print("\nWaiting 20s before V2 call...")
        time.sleep(20)
        print("\n" + "=" * 72)
        print("  RUNNING V2 REVIEW (baseline)")
        print("=" * 72)
        v1 = call_claude(MASTER_RUBRIC_V2, user_message, "V2")
        v2_cache.write_text(json.dumps(v1, ensure_ascii=False, indent=2), encoding="utf-8")

    # V3 is the new version — run fresh
    if v3_cache.exists():
        print("\nLoading cached V3 result...")
        v2 = json.loads(v3_cache.read_text(encoding="utf-8"))  # v2 variable = "after" in comparison
    else:
        print("\nWaiting 20s before V3 call (rate limit gap)...")
        time.sleep(20)
        print("\n" + "=" * 72)
        print("  RUNNING V3 REVIEW (first-person voice)")
        print("=" * 72)
        v2 = call_claude(MASTER_RUBRIC_V3, user_message, "V3")
        v3_cache.write_text(json.dumps(v2, ensure_ascii=False, indent=2), encoding="utf-8")

    # Compare verdicts (V2 baseline → V3 new)
    print("\n\n" + "=" * 72)
    print("  VERDICT SUMMARY  (V2 → V3)")
    print("=" * 72)
    for label, v1v, v2v in [
        ("triage_verdict",     v1.get("triage_verdict"),     v2.get("triage_verdict")),
        ("launch_alignment",   v1.get("launch_alignment"),   v2.get("launch_alignment")),
        ("template_adherence", v1.get("template_adherence"), v2.get("template_adherence")),
        ("human_voice",        v1.get("human_voice"),        v2.get("human_voice")),
    ]:
        changed = " ← CHANGED" if v1v != v2v else ""
        print(f"  {label:<22} V2={v1v!r:<12} V3={v2v!r}{changed}")

    # Side-by-side student-facing fields (V2 → V3 voice shift)
    print("\n\n" + "=" * 72)
    print("  STUDENT-FACING FIELD COMPARISON  V2 → V3 (voice shift)")
    print("=" * 72)

    STUDENT_FACING = [
        ("launch_alignment_explanation",  lambda f: f.get("launch_alignment_explanation", "")),
        ("template_notes",                lambda f: f.get("template_notes", "")),
        ("persuasive_strength.notes",     lambda f: f.get("persuasive_strength", {}).get("notes", "")),
        ("cta_notes",                     lambda f: f.get("cta_notes", "")),
        ("human_voice_notes",             lambda f: f.get("human_voice_notes", "")),
        ("week_specific_findings",        lambda f: f.get("week_specific_findings", "")),
        ("top_3_fixes",                   lambda f: f.get("top_3_fixes", [])),
        ("specific_rewrites",             lambda f: f.get("specific_rewrites", [])),
    ]
    for label, extractor in STUDENT_FACING:
        print_field_comparison(label, extractor(v1), extractor(v2))

    # Internal fields (should stay terse — check they haven't inflated)
    print("\n\n" + "=" * 72)
    print("  INTERNAL FIELDS (should stay terse)")
    print("=" * 72)
    print(f"  triage_reason  V1: {v1.get('triage_reason','')}")
    print(f"  triage_reason  V2: {v2.get('triage_reason','')}")

    # Dump full JSON for reference
    print("\n\n" + "=" * 72)
    print("  FULL V2 aiFeedback (baseline)")
    print("=" * 72)
    print(json.dumps(v1, indent=2, ensure_ascii=False))

    print("\n\n" + "=" * 72)
    print("  FULL V3 aiFeedback (first-person voice)")
    print("=" * 72)
    print(json.dumps(v2, indent=2, ensure_ascii=False))

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()

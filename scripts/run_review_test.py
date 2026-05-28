"""
run_review_test.py
Runs the Brief #3 AI review pipeline against the staging DB.
Uses only Python standard library (urllib) — no pip installs needed.

Usage:
  python scripts/run_review_test.py
"""
import sys, os, json, re, ssl
import urllib.request, urllib.parse, urllib.error
import psycopg2

# ── Config ────────────────────────────────────────────────────────────────────
DB_URL = (
    "postgresql://neondb_owner:npg_Jf5pDak8IGLF"
    "@ep-orange-river-ab2berm2-pooler.eu-west-2.aws.neon.tech"
    "/neondb?sslmode=require"
)
GOOGLE_API_KEY = "AIzaSyDihAPEe3wkDdD1TwwzKXt7hnpoktNxsxY"
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
REVIEW_MODEL = "claude-opus-4-7"
RUBRIC_VERSION = "MASTER_RUBRIC_V1"
MAX_OUTPUT_TOKENS = 4096

# SSL context that doesn't verify certificates — needed for some environments
SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE


def http_get(url, params=None, headers=None, timeout=60):
    if params:
        url = url + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, context=SSL_CTX, timeout=timeout) as resp:
        body = resp.read()
        charset = resp.headers.get_content_charset("utf-8")
        return body.decode(charset)


def http_post_json(url, payload, headers=None, timeout=180):
    data = json.dumps(payload).encode("utf-8")
    h = {"Content-Type": "application/json", **(headers or {})}
    req = urllib.request.Request(url, data=data, headers=h, method="POST")
    with urllib.request.urlopen(req, context=SSL_CTX, timeout=timeout) as resp:
        body = resp.read()
        charset = resp.headers.get_content_charset("utf-8")
        return json.loads(body.decode(charset))


# ── Master rubric (MASTER_RUBRIC_V1) ─────────────────────────────────────────
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


# ── URL parsing ────────────────────────────────────────────────────────────────
def parse_doc_url(url):
    if not url or not url.strip().startswith("http"):
        return None, "unknown", "Empty or invalid URL"
    t = url.strip()
    file_type = "unknown"
    if "/document/" in t:
        file_type = "doc"
    elif "/presentation/" in t:
        file_type = "slides"
    m = re.search(r'/d/([a-zA-Z0-9_-]{25,})', t)
    if m:
        return m.group(1), file_type, None
    m = re.search(r'[?&]id=([a-zA-Z0-9_-]{25,})', t)
    if m:
        return m.group(1), "unknown", None
    return None, "unknown", "Could not extract document ID"


# ── Google API helpers ────────────────────────────────────────────────────────
def fetch_drive_metadata(doc_id):
    url = f"https://www.googleapis.com/drive/v3/files/{doc_id}"
    try:
        body = http_get(url, params={"fields": "id,mimeType", "key": GOOGLE_API_KEY})
        data = json.loads(body)
        return data.get("mimeType", ""), None
    except urllib.error.HTTPError as e:
        if e.code == 403:
            return None, "NOT_SHARED — document not shared 'Anyone with the link can view'"
        if e.code == 404:
            return None, "NOT_FOUND — broken link or document deleted"
        return None, f"Drive API error {e.code}"


def extract_doc_text(doc_id):
    url = f"https://www.googleapis.com/drive/v3/files/{doc_id}/export"
    return http_get(url, params={"mimeType": "text/plain", "key": GOOGLE_API_KEY}, timeout=60)


def extract_text_from_content(text_content):
    return "".join(
        el.get("textRun", {}).get("content", "")
        for el in text_content.get("textElements", [])
    )


def extract_slides_text(presentation_id):
    # Use Drive files.export (text/plain) — same API as Google Docs, confirmed working.
    # The Slides API presentations.get endpoint requires OAuth even for API-key flows
    # when called via raw HTTP; the googleapis SDK abstracts this difference.
    # Drive text export gives us all slide text content, without per-slide markers or
    # speaker notes — sufficient for the review model to assess content and structure.
    url = f"https://www.googleapis.com/drive/v3/files/{presentation_id}/export"
    return http_get(url, params={"mimeType": "text/plain", "key": GOOGLE_API_KEY}, timeout=60)


def fetch_doc_text(url):
    doc_id, url_type, err = parse_doc_url(url)
    if err:
        return None, "unknown", None, err
    mime, meta_err = fetch_drive_metadata(doc_id)
    if meta_err:
        return None, url_type, doc_id, meta_err
    MIME = {
        "application/vnd.google-apps.document": "doc",
        "application/vnd.google-apps.presentation": "slides",
    }
    resolved = MIME.get(mime)
    if not resolved:
        return None, "unknown", doc_id, f"Unsupported MIME type: {mime}"
    try:
        text = extract_doc_text(doc_id) if resolved == "doc" else extract_slides_text(doc_id)
    except Exception as e:
        return None, resolved, doc_id, f"Text extraction failed: {e}"
    if not text.strip():
        return None, resolved, doc_id, "Document is empty"
    return text.strip(), resolved, doc_id, None


# ── Strategy + launch info ────────────────────────────────────────────────────
def derive_strategy(launch_strategy, launch_pricing):
    if launch_strategy == "Evergreen VSL":
        return "evergreen"
    if launch_pricing in ("Pay What You Want", "Low Ticket"):
        return "pwyw_or_low_ticket"
    return "free_event"


def assemble_launch_info(niche, strategy, pricing, price, topic, title):
    lines = []
    if niche and niche.strip():
        lines.append(f"Target Audience (Level 5 Niche): {niche.strip()}")
    if strategy and strategy.strip():
        lines.append(f"Launch Format: {strategy.strip()}")
    if pricing and pricing.strip():
        if price and price.strip():
            lines.append(f"Pricing Model: {pricing.strip()} (${price.strip()})")
        else:
            lines.append(f"Pricing Model: {pricing.strip()}")
    if title and title.strip():
        lines.append(f"Approved Event Title: {title.strip()}")
    if topic and topic.strip():
        lines.append(f"Content Direction for Launch Event:\n{topic.strip()}")
    return "\n".join(lines) if lines else None


# ── Prompt builder ────────────────────────────────────────────────────────────
def strip_build_notes(text):
    text = re.sub(r'\[BUILD NOTE:[^\]]*\]', '', text, flags=re.DOTALL)
    return re.sub(r'\n{3,}', '\n\n', text).strip()


def build_prompt(week, niche, launch_info, strategy, rows, text, file_type,
                 w4_text=None, w6_text=None):
    # rows cols: (id, weekNumber, launchStrategy, deliverableName, templateVariant, templatePattern)
    patterns_used = [(r[3], r[4]) for r in rows]

    if week == 3:
        parts = ['<applicable_patterns>',
                 'This is a Week 3 submission. The student submits both ad copy scripts (three angles) and an ad video script as one deliverable. Review each part against its pattern below.', '']
        for r in rows:
            parts.append(f'<pattern variant="{r[4] or "none"}" deliverable="{r[3]}">\n{strip_build_notes(r[5])}\n</pattern>')
        parts.append('</applicable_patterns>')
        pat_block = '\n'.join(parts)
    elif week == 6 and len(rows) > 1:
        parts = ['<applicable_patterns>',
                 "The student submitted a sales page for their Week 6 core offer. Three structurally distinct templates are available. Identify which template the student used, then review against that pattern's criteria.", '']
        for r in rows:
            parts.append(f'<pattern variant="{r[4] or "none"}" deliverable="{r[3]}">\n{strip_build_notes(r[5])}\n</pattern>')
        parts.append('</applicable_patterns>')
        pat_block = '\n'.join(parts)
    else:
        r = rows[0]
        pat_block = f'<applicable_pattern deliverable="{r[3]}" variant="{r[4] or "none"}">\n{strip_build_notes(r[5])}\n</applicable_pattern>'

    prior = []
    if w4_text:
        prior.append(f'<prior_approved_week4_offer>\n{w4_text}\n</prior_approved_week4_offer>')
    if w6_text:
        prior.append(f'<prior_approved_week6_deck>\n{w6_text}\n</prior_approved_week6_deck>')

    msg = [
        f'<week_number>{week}</week_number>', '',
        f'<student_niche>\n{niche}\n</student_niche>', '',
        f'<launch_information>\n{launch_info}\n</launch_information>', '',
        f'<launch_strategy>{strategy}</launch_strategy>', '',
        pat_block, '',
        *prior, *([""] if prior else []),
        f'<submitted_copy file_type="{file_type}">\n{text}\n</submitted_copy>',
    ]
    return MASTER_RUBRIC_V1, '\n'.join(msg), patterns_used


# ── Anthropic API call ────────────────────────────────────────────────────────
def call_claude(system_prompt, user_message):
    return http_post_json(
        "https://api.anthropic.com/v1/messages",
        {
            "model": REVIEW_MODEL,
            "max_tokens": MAX_OUTPUT_TOKENS,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_message}],
        },
        headers={
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
        },
        timeout=180,
    )


# ── Review runner ─────────────────────────────────────────────────────────────
def run_review(conn, submission_id, show_full_prompt=False):
    print(f"\n{'='*70}")
    print(f"  REVIEWING: {submission_id}")
    print(f"{'='*70}")
    cur = conn.cursor()

    cur.execute("""
        SELECT s."id", s."weekNumber", s."workbookUrl", s."workbookTitle",
               u."id", u."niche", u."launchStrategy", u."launchPricing",
               u."launchPrice", u."launchEventTopic", u."approvedEventTitle"
        FROM "Submission" s JOIN "User" u ON u."id" = s."studentId"
        WHERE s."id" = %s
    """, (submission_id,))
    row = cur.fetchone()
    if not row:
        print(f"  ✗ Not found")
        return {"outcome": "not_found", "submissionId": submission_id}

    (sub_id, week, url, title, student_id,
     niche, strat, pricing, price, topic, ev_title) = row
    print(f"  Week: {week}  Title: {title}")

    # 1. Fetch doc
    print(f"  [1] Fetching document...")
    text, ftype, doc_id, err = fetch_doc_text(url)
    if err:
        print(f"  ✗ HELD — {err}")
        return {"outcome": "held_for_input", "holdReason": err, "submissionId": submission_id,
                "fileType": ftype, "docId": doc_id}
    print(f"  ✓ fileType={ftype}  docId={doc_id}  chars={len(text):,}")

    # 2. Validate inputs
    print(f"  [2] Validating inputs...")
    if not niche or not niche.strip():
        reason = "Level 5 Niche not filled in"
        print(f"  ✗ HELD — {reason}")
        return {"outcome": "held_for_input", "holdReason": reason, "submissionId": submission_id}
    launch_info = assemble_launch_info(niche, strat, pricing, price, topic, ev_title)
    if not launch_info:
        reason = "Launch information empty"
        print(f"  ✗ HELD — {reason}")
        return {"outcome": "held_for_input", "holdReason": reason, "submissionId": submission_id}
    print(f"  ✓ niche + launchInfo present  strategy={strat}  pricing={pricing}")

    # 3. Look up patterns
    print(f"  [3] Looking up week criteria...")
    rev_strategy = derive_strategy(strat, pricing)
    print(f"  reviewerStrategy: {rev_strategy}")
    cur.execute("""
        SELECT "id","weekNumber","launchStrategy","deliverableName","templateVariant","templatePattern"
        FROM week_criteria
        WHERE "weekNumber"=%s AND ("launchStrategy"=%s OR "launchStrategy" IS NULL)
        ORDER BY "launchStrategy" ASC, "templateVariant" ASC
    """, (week, rev_strategy))
    all_rows = cur.fetchall()
    if not all_rows:
        raise RuntimeError(f"No week_criteria rows for week={week} strategy={rev_strategy}")

    if week == 6:
        # Webinar pattern is seeded with templateVariant=null; sales-copy patterns have explicit slugs
        if ftype == "slides":
            rows = [r for r in all_rows if r[4] is None]
        else:
            rows = [r for r in all_rows if r[4] is not None]
        rows = rows or all_rows
    else:
        rows = all_rows
    print(f"  ✓ {len(rows)} pattern(s): {[r[3] for r in rows]}")

    # 4. Prior submissions
    w4_text = w6_text = None
    is_w6_sales = (week == 6 and ftype != "slides")
    is_w7 = (week == 7)
    if is_w6_sales or is_w7:
        print(f"  [4] Loading prior approved submissions...")
        cur.execute("""SELECT "workbookUrl" FROM "Submission"
                       WHERE "studentId"=%s AND "weekNumber"=4 AND "status"='APPROVED'
                       ORDER BY "submittedAt" DESC LIMIT 1""", (student_id,))
        w4 = cur.fetchone()
        if not w4:
            reason = "No approved Week 4 offer — back-alignment check requires it"
            print(f"  ✗ HELD — {reason}")
            return {"outcome": "held_for_input", "holdReason": reason, "submissionId": submission_id}
        w4t, _, _, w4e = fetch_doc_text(w4[0])
        if w4e:
            reason = f"Cannot load Week 4 offer: {w4e}"
            print(f"  ✗ HELD — {reason}")
            return {"outcome": "held_for_input", "holdReason": reason, "submissionId": submission_id}
        w4_text = w4t
        print(f"  ✓ Week 4 loaded ({len(w4t):,} chars)")
    else:
        print(f"  [4] Prior submissions: not required for week {week} {ftype}")

    # 5. Build prompt
    print(f"  [5] Building prompt...")
    sys_p, user_m, patterns_used = build_prompt(
        week, niche, launch_info, rev_strategy, rows, text, ftype, w4_text, w6_text)
    print(f"  systemPrompt: {len(sys_p):,} chars")
    print(f"  userMessage:  {len(user_m):,} chars")
    print(f"  patterns:     {patterns_used}")

    if show_full_prompt:
        sep = "─" * 70
        print(f"\n{sep}\n  ASSEMBLED USER MESSAGE (what the model sees):\n{sep}")
        print(user_m)
        print(sep)

    # 6. Call Claude
    print(f"  [6] Calling {REVIEW_MODEL}...")
    try:
        api_resp = call_claude(sys_p, user_m)
    except urllib.error.HTTPError as e:
        reason = f"Claude API error {e.code}: {e.read().decode()[:200]}"
        print(f"  ✗ API ERROR — {reason}")
        return {"outcome": "api_error", "holdReason": reason, "submissionId": submission_id}
    except Exception as e:
        reason = f"Claude API error: {e}"
        print(f"  ✗ API ERROR — {reason}")
        return {"outcome": "api_error", "holdReason": reason, "submissionId": submission_id}

    raw = api_resp.get("content", [{}])[0].get("text", "")
    usage = api_resp.get("usage", {})
    in_tok = usage.get("input_tokens", 0)
    out_tok = usage.get("output_tokens", 0)
    print(f"  ✓ tokens: {in_tok:,} input + {out_tok:,} output")

    # 7. Parse
    cleaned = re.sub(r'^```json\s*', '', raw, flags=re.IGNORECASE)
    cleaned = re.sub(r'^```\s*', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'```\s*$', '', cleaned).strip()
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        print(f"  ✗ PARSE ERROR  raw[:300]: {raw[:300]}")
        return {"outcome": "parse_error", "submissionId": submission_id, "rawResponse": raw}

    for f in ["triage_verdict", "launch_alignment", "template_adherence"]:
        if f not in parsed:
            print(f"  ✗ PARSE ERROR — missing field: {f}")
            return {"outcome": "parse_error", "submissionId": submission_id, "parsed": parsed}

    verdict = parsed.get("triage_verdict", "hold")
    ps = parsed.get("persuasive_strength", {})
    print(f"\n  VERDICT:")
    print(f"  ├── triage_verdict    : {verdict.upper()}")
    print(f"  ├── launch_alignment  : {parsed.get('launch_alignment')}")
    print(f"  ├── template_adherence: {parsed.get('template_adherence')}")
    print(f"  ├── human_voice       : {parsed.get('human_voice')}")
    print(f"  ├── persuasive_strength: pain={ps.get('specific_pain')} promise={ps.get('concrete_promise')} urgency={ps.get('reason_to_act_now')} trust={ps.get('trust_through_specificity')}")
    print(f"  └── triage_reason     : {parsed.get('triage_reason')}")

    return {
        "outcome": "reviewed", "submissionId": submission_id,
        "weekNumber": week, "fileType": ftype, "docId": doc_id,
        "reviewerStrategy": rev_strategy, "patternsUsed": patterns_used,
        "verdict": verdict, "aiFeedback": parsed,
        "tokenUsage": {"inputTokens": in_tok, "outputTokens": out_tok},
    }


# ── Entry point ───────────────────────────────────────────────────────────────
def main():
    if not ANTHROPIC_API_KEY:
        print("ERROR: ANTHROPIC_API_KEY not set — set env var ANTHROPIC_API_KEY")
        sys.exit(1)

    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    cur.execute("""
        SELECT s."id", s."weekNumber", s."workbookTitle", u."name", s."workbookUrl"
        FROM "Submission" s JOIN "User" u ON u."id" = s."studentId"
        ORDER BY s."submittedAt" DESC LIMIT 20
    """)
    subs = cur.fetchall()
    print(f"\nAll submissions ({len(subs)} most recent):")
    for s in subs:
        sid, wk, title, name, url = s
        # Detect file type from URL
        ftype = "slides" if "/presentation/" in url else ("doc" if "/document/" in url else "file")
        print(f"  [{wk}] {title[:35]:<35} | {name[:20]:<20} | {ftype} | {sid}")

    week6_subs = [s for s in subs if s[1] == 6]
    print(f"\nRunning reviews for {len(week6_subs)} Week 6 submission(s)...")

    results = []
    for i, sub in enumerate(week6_subs):
        result = run_review(conn, sub[0], show_full_prompt=(i == 0))
        results.append(result)

    # Full JSON output
    print(f"\n\n{'='*70}")
    print("  FULL aiFeedback JSON")
    print(f"{'='*70}")
    for r in results:
        if r.get("outcome") == "reviewed":
            tok = r["tokenUsage"]
            print(f"\n── {r['submissionId']} (Week {r['weekNumber']}, {r['fileType']}) ──")
            print(f"   Strategy: {r['reviewerStrategy']}  |  Patterns: {r['patternsUsed']}")
            print(f"   Tokens: {tok['inputTokens']:,} in + {tok['outputTokens']:,} out")
            print(json.dumps(r["aiFeedback"], indent=2, ensure_ascii=False))
        else:
            print(f"\n── {r['submissionId']} ── {r.get('outcome','?').upper()}: {r.get('holdReason', '')}")

    conn.close()


if __name__ == "__main__":
    main()

"""
brief5_tests.py
Brief #5 test suite — runs in three independent sections.

Section 1: Routing unit tests (pure Python, no API key needed)
Section 2: Fingerprint check (extracts V4 from TS source, no API key needed)
Section 3: Voice tests — Case A (V1 vs V4 on Student Two) and Case B (load test)
           Requires: ANTHROPIC_API_KEY env var

Usage:
  python -X utf8 scripts/brief5_tests.py

Voice tests only (if you want to skip routing/fingerprint):
  python -X utf8 scripts/brief5_tests.py --voice-only

For Case B construction preview (no API call):
  python -X utf8 scripts/brief5_tests.py --show-case-b
"""

import os, re, sys, json, ssl, pathlib, textwrap, datetime
import urllib.request, urllib.parse, urllib.error
import psycopg2

# ── Config ────────────────────────────────────────────────────────────────────
STAGING_DB_URL = (
    "postgresql://neondb_owner:npg_Jf5pDak8IGLF"
    "@ep-orange-river-ab2berm2-pooler.eu-west-2.aws.neon.tech"
    "/neondb?sslmode=require"
)
GOOGLE_API_KEY    = "AIzaSyDihAPEe3wkDdD1TwwzKXt7hnpoktNxsxY"
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
REVIEW_MODEL      = "claude-opus-4-7"
MAX_OUTPUT_TOKENS = 8192

STUDENT_TWO_SUBMISSION = "cmppggz1h0001e7dgt1ract8l"

TS_RUBRIC_PATH = pathlib.Path(__file__).parent.parent / "src" / "lib" / "ai" / "masterRubric.ts"

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode    = ssl.CERT_NONE

PASS = "\033[32mPASS\033[0m"
FAIL = "\033[31mFAIL\033[0m"
results: list[bool] = []

def check(name: str, cond: bool, detail: str = "") -> None:
    status = PASS if cond else FAIL
    print(f"  [{status}] {name}")
    if detail and not cond:
        print(f"         ↳ {detail}")
    results.append(cond)

# ── Rubric extractor (mirrors fresh_v3_confirm.py approach) ──────────────────

def extract_rubric(export_name: str) -> str:
    src = TS_RUBRIC_PATH.read_text(encoding="utf-8")
    marker = f"export const {export_name} = `"
    start = src.find(marker)
    if start == -1:
        raise ValueError(f"Cannot find {export_name} in {TS_RUBRIC_PATH}")
    start += len(marker)
    # Find closing `.trim()
    end = src.find("`.trim()", start)
    if end == -1:
        raise ValueError(f"Cannot find closing `.trim() for {export_name}")
    return src[start:end]

# ── Label router (mirrors labelRouter.ts) ────────────────────────────────────

W3_VIDEO_RE    = re.compile(r'\bvideo\b', re.IGNORECASE)
W3_ADCOPY_RE   = re.compile(r'\bad[\s\-]?copy\b|\bcaptions?\b', re.IGNORECASE)
W3_SCRIPT_RE   = re.compile(r'\bscripts?\b', re.IGNORECASE)
W6_WEBINAR_RE   = re.compile(r'\bwebinar\b|\bpresentation\b|\bdeck\b|\bslides?\b', re.IGNORECASE)
W6_SALESCOPY_RE = re.compile(r'\bsales[\s\-]copy\b|\bsales[\s\-]page\b|\bsales[\s\-]letter\b|\bformul[ae]', re.IGNORECASE)
W6_FRAMEWORK_RE = re.compile(r'\bframework\b', re.IGNORECASE)

HOLD_W3 = "Couldn't determine which Week 3 deliverable this is — please confirm the document label (expected: 'Ad Copy Scripts' or 'Ad Video Script') and resubmit."
HOLD_W6 = "Couldn't determine which Week 6 deliverable this is — please confirm the document label (expected: 'Webinar Presentation' or 'Sales Copy Framework') and resubmit."
HOLD_AMB = "Couldn't determine which deliverable this is — the document label matches more than one pattern. Please confirm the label and resubmit."

def route_by_label(week: int, title: str) -> dict:
    t = title or ""
    if week == 3:
        is_video       = bool(W3_VIDEO_RE.search(t))
        is_explicit    = bool(W3_ADCOPY_RE.search(t))   # "ad copy" or "captions"
        is_script      = bool(W3_SCRIPT_RE.search(t))   # bare "script" — yields to video
        if is_video and is_explicit: return {"outcome": "hold", "reason": HOLD_AMB}
        if is_video:                 return {"outcome": "matched", "type": "ad_video"}
        if is_explicit or is_script: return {"outcome": "matched", "type": "ad_copy"}
        return {"outcome": "hold", "reason": HOLD_W3}
    if week == 6:
        is_webinar = bool(W6_WEBINAR_RE.search(t))
        is_sales   = bool(W6_SALESCOPY_RE.search(t)) or bool(W6_FRAMEWORK_RE.search(t))
        if is_webinar and is_sales: return {"outcome": "hold", "reason": HOLD_AMB}
        if is_webinar: return {"outcome": "matched", "type": "webinar"}
        if is_sales:   return {"outcome": "matched", "type": "sales_copy"}
        return {"outcome": "hold", "reason": HOLD_W6}
    return {"outcome": "matched", "type": "single"}

# ── HTTP helpers ──────────────────────────────────────────────────────────────

def http_get(url, params=None, timeout=60):
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, context=SSL_CTX, timeout=timeout) as r:
        return r.read().decode(r.headers.get_content_charset("utf-8"))

def http_post_json(url, payload, headers=None, timeout=240):
    data = json.dumps(payload).encode("utf-8")
    h = {"Content-Type": "application/json", **(headers or {})}
    req = urllib.request.Request(url, data=data, headers=h, method="POST")
    with urllib.request.urlopen(req, context=SSL_CTX, timeout=timeout) as r:
        return json.loads(r.read().decode(r.headers.get_content_charset("utf-8")))

# ── Drive helpers (from run_review_test.py) ───────────────────────────────────

def fetch_doc_text(url: str):
    if not url or not url.strip().startswith("http"):
        return None, "unknown", None, "Empty or invalid URL"
    t = url.strip()
    ftype = "doc" if "/document/" in t else ("slides" if "/presentation/" in t else "unknown")
    m = re.search(r'/d/([a-zA-Z0-9_-]{25,})', t) or re.search(r'[?&]id=([a-zA-Z0-9_-]{25,})', t)
    if not m:
        return None, ftype, None, "Could not extract document ID"
    doc_id = m.group(1)
    try:
        meta = json.loads(http_get(
            f"https://www.googleapis.com/drive/v3/files/{doc_id}",
            {"fields": "id,mimeType", "key": GOOGLE_API_KEY}
        ))
    except urllib.error.HTTPError as e:
        if e.code == 403: return None, ftype, doc_id, "Not shared (403)"
        if e.code == 404: return None, ftype, doc_id, "Not found (404)"
        return None, ftype, doc_id, f"Drive API error {e.code}"
    mime = meta.get("mimeType", "")
    if mime == "application/vnd.google-apps.document": ftype = "doc"
    elif mime == "application/vnd.google-apps.presentation": ftype = "slides"
    elif mime not in ("application/vnd.google-apps.document", "application/vnd.google-apps.presentation"):
        return None, ftype, doc_id, f"Unsupported MIME: {mime}"
    try:
        text = http_get(
            f"https://www.googleapis.com/drive/v3/files/{doc_id}/export",
            {"mimeType": "text/plain", "key": GOOGLE_API_KEY}, timeout=60
        )
    except Exception as e:
        return None, ftype, doc_id, f"Text extraction failed: {e}"
    if not text.strip():
        return None, ftype, doc_id, "Document is empty"
    return text.strip(), ftype, doc_id, None

# ── Staging helpers ───────────────────────────────────────────────────────────

def get_conn():
    return psycopg2.connect(STAGING_DB_URL)

def strip_build_notes(text: str) -> str:
    text = re.sub(r'\[BUILD NOTE:[^\]]*\]', '', text, flags=re.DOTALL)
    return re.sub(r'\n{3,}', '\n\n', text).strip()

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

def derive_strategy(strat, pricing):
    if strat == "Evergreen VSL": return "evergreen"
    if pricing in ("Pay What You Want", "Low Ticket"): return "pwyw_or_low_ticket"
    return "free_event"

def build_prompt(rubric, week, niche, launch_info, strategy, rows, text, ftype,
                 w4_text=None, w6_text=None):
    if week == 6 and len(rows) > 1:
        parts = [
            '<applicable_patterns>',
            "The student submitted a sales page for their Week 6 core offer. Three structurally distinct sales-copy templates are available. Identify which template structure the student used from the submitted document, then review against that pattern's criteria. The MULTI-SUBMISSION RULE applies if more than one variant is present.",
            ''
        ]
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
        f'<submitted_copy file_type="{ftype}">\n{text}\n</submitted_copy>',
    ]
    return rubric, '\n'.join(msg)

def call_claude(system_prompt, user_message):
    return http_post_json(
        "https://api.anthropic.com/v1/messages",
        {
            "model": REVIEW_MODEL,
            "max_tokens": MAX_OUTPUT_TOKENS,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_message}]
        },
        headers={"x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01"},
        timeout=240,
    )

def run_review(rubric, conn, sub_id, override_text=None, override_week=None,
               override_niche=None, override_launch_info=None, override_strategy=None):
    cur = conn.cursor()
    cur.execute("""
        SELECT s."id", s."weekNumber", s."workbookUrl", s."workbookTitle",
               u."id", u."niche", u."launchStrategy", u."launchPricing",
               u."launchPrice", u."launchEventTopic", u."approvedEventTitle"
        FROM "Submission" s JOIN "User" u ON u."id" = s."studentId"
        WHERE s."id" = %s
    """, (sub_id,))
    row = cur.fetchone()
    if not row:
        return {"outcome": "not_found", "submissionId": sub_id}

    (_, week, url, title, student_id,
     niche, strat, pricing, price, topic, ev_title) = row

    week = override_week or week
    niche = override_niche or niche

    if override_text:
        text, ftype, doc_id, err = override_text, "doc", "synthetic", None
    else:
        text, ftype, doc_id, err = fetch_doc_text(url)
        if err:
            return {"outcome": "held_for_input", "holdReason": err, "submissionId": sub_id}

    launch_info = override_launch_info or assemble_launch_info(niche, strat, pricing, price, topic, ev_title)
    if not launch_info:
        return {"outcome": "held_for_input", "holdReason": "Launch info empty", "submissionId": sub_id}

    rev_strategy = override_strategy or derive_strategy(strat, pricing)

    cur.execute("""
        SELECT "id","weekNumber","launchStrategy","deliverableName","templateVariant","templatePattern"
        FROM week_criteria
        WHERE "weekNumber"=%s AND ("launchStrategy"=%s OR "launchStrategy" IS NULL)
        ORDER BY "launchStrategy" ASC, "templateVariant" ASC
    """, (week, rev_strategy))
    all_rows = cur.fetchall()
    if not all_rows:
        return {"outcome": "held_for_input", "holdReason": f"No week_criteria rows for week={week}", "submissionId": sub_id}

    # Apply label routing for weeks 3 and 6
    if week in (3, 6):
        route = route_by_label(week, title)
        if route["outcome"] == "hold":
            return {"outcome": "held_for_input", "holdReason": route["reason"], "submissionId": sub_id}
        dt = route["type"]
        if week == 3:
            rows = [r for r in all_rows if r[4] == ("ad_video" if dt == "ad_video" else "ad_copy")]
        else:
            rows = [r for r in all_rows if r[4] is None] if dt == "webinar" else [r for r in all_rows if r[4] is not None]
        rows = rows or all_rows
    else:
        rows = all_rows

    sys_p, user_m = build_prompt(rubric, week, niche, launch_info, rev_strategy, rows, text, ftype)

    try:
        api_resp = call_claude(sys_p, user_m)
    except Exception as e:
        return {"outcome": "api_error", "holdReason": str(e), "submissionId": sub_id}

    raw = api_resp.get("content", [{}])[0].get("text", "")
    usage = api_resp.get("usage", {})

    cleaned = re.sub(r'^```json\s*', '', raw, flags=re.IGNORECASE)
    cleaned = re.sub(r'^```\s*', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'```\s*$', '', cleaned).strip()
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        return {"outcome": "parse_error", "submissionId": sub_id, "raw": raw[:500]}

    return {
        "outcome": "reviewed",
        "submissionId": sub_id,
        "weekNumber": week,
        "fileType": ftype,
        "systemPromptLen": len(sys_p),
        "aiFeedback": parsed,
        "tokenUsage": {"inputTokens": usage.get("input_tokens", 0), "outputTokens": usage.get("output_tokens", 0)},
    }

def print_verdict(label: str, result: dict) -> None:
    print(f"\n{'─'*70}")
    print(f"  {label}")
    print(f"{'─'*70}")
    if result.get("outcome") != "reviewed":
        print(f"  outcome: {result.get('outcome')} — {result.get('holdReason', result.get('raw', '?'))}")
        return
    fb = result["aiFeedback"]
    tok = result["tokenUsage"]
    print(f"  systemPromptLen : {result['systemPromptLen']:,} chars")
    print(f"  tokens          : {tok['inputTokens']:,} in + {tok['outputTokens']:,} out")
    print(f"  triage_verdict  : {fb.get('triage_verdict', '?').upper()}")
    print(f"  launch_alignment: {fb.get('launch_alignment')}")
    print(f"  template_adheren: {fb.get('template_adherence')}")
    ps = fb.get("persuasive_strength", {})
    print(f"  persuasive_str  : pain={ps.get('specific_pain')} promise={ps.get('concrete_promise')} urgency={ps.get('reason_to_act_now')} trust={ps.get('trust_through_specificity')}")
    print(f"  human_voice     : {fb.get('human_voice')}")
    print(f"  triage_reason   : {fb.get('triage_reason')}")

def voice_checks(label: str, result: dict) -> None:
    """Four checks from the brief on a voice test result."""
    if result.get("outcome") != "reviewed":
        print(f"  [{FAIL}] {label}: review did not complete ({result.get('outcome')})")
        results.append(False)
        return
    fb = result["aiFeedback"]
    student_facing = [
        ("launch_alignment_explanation", fb.get("launch_alignment_explanation", "")),
        ("template_notes",               fb.get("template_notes", "")),
        ("persuasive_strength.notes",    (fb.get("persuasive_strength") or {}).get("notes", "")),
        ("cta_notes",                    fb.get("cta_notes", "")),
        ("human_voice_notes",            fb.get("human_voice_notes", "")),
        ("week_specific_findings",       fb.get("week_specific_findings", "")),
        ("top_3_fixes",                  " ".join(fb.get("top_3_fixes") or [])),
        ("specific_rewrites",            " ".join(fb.get("specific_rewrites") or [])),
    ]
    # Check 1: no "the student" in student-facing fields
    violations = [fn for fn, txt in student_facing if re.search(r'\bthe student\b', txt, re.IGNORECASE)]
    check(f"[{label}] No 'the student' in any student-facing field",
          len(violations) == 0,
          f"Violations in: {violations}")
    # Check 2: specific_rewrites don't contain full deliverables
    rewrites = fb.get("specific_rewrites") or []
    long_rewrites = [r[:80] + "…" for r in rewrites if len(r) > 600]
    check(f"[{label}] specific_rewrites are illustrative (no rewrite >600 chars)",
          len(long_rewrites) == 0,
          f"Suspiciously long: {long_rewrites}")
    # Check 3: triage_reason third-person neutral
    tr = fb.get("triage_reason", "")
    tr_violations = []
    if re.search(r'\byou\b|\byour\b', tr, re.IGNORECASE): tr_violations.append("contains 'you/your'")
    if re.search(r'\bmayowa\b', tr, re.IGNORECASE): tr_violations.append("addresses Mayowa")
    check(f"[{label}] triage_reason is third-person neutral",
          len(tr_violations) == 0,
          f"{tr_violations} — triage_reason: {tr[:100]}")
    # Check 4: substantive verdict present
    has_verdict = fb.get("triage_verdict") in ("proceed", "hold")
    check(f"[{label}] Substantive verdict present (proceed/hold)",
          has_verdict,
          f"triage_verdict: {fb.get('triage_verdict')}")

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 1: Routing unit tests
# ══════════════════════════════════════════════════════════════════════════════

def section1_routing():
    print("\n" + "═"*70)
    print("  SECTION 1 — Routing unit tests (no API key required)")
    print("═"*70)

    # Week 3 cases
    cases_w3 = [
        # (title, expected_type, description)
        ("Ad Video Script",                    "ad_video", "W3 exact 'Ad Video Script'"),
        ("Week 3 Video Script",                "ad_video", "W3 'Video Script'"),
        ("Ad Video",                           "ad_video", "W3 'Ad Video'"),
        ("My Ad Copy Scripts",                 "ad_copy",  "W3 'Ad Copy Scripts'"),
        ("Ad Captions Week 3",                 "ad_copy",  "W3 'Ad Captions'"),
        ("Week 3 script",                      "ad_copy",  "W3 bare 'script' → ad_copy"),
        ("Week 3 Workbook",                    "hold",     "W3 unrecognised → hold"),
        ("Ad video copy script",               "ad_video", "W3 'ad' and 'copy' not adjacent → video wins"),
        ("Ad Copy Video Script",               "hold",     "W3 'Ad Copy' + 'video' adjacent → hold"),
    ]
    print("\n  Week 3:")
    for title, expected_type, desc in cases_w3:
        r = route_by_label(3, title)
        if expected_type == "hold":
            ok = r["outcome"] == "hold"
            check(desc, ok, f"got {r}")
        else:
            ok = r["outcome"] == "matched" and r.get("type") == expected_type
            check(desc, ok, f"got {r}")

    # Week 6 cases
    cases_w6 = [
        ("Launch smart webinar presentation template",               "webinar",    "W6 audit label — webinar"),
        ("Mastering Research to Earn Free Webinar Template",         "webinar",    "W6 audit label — webinar (Free)"),
        ("lunch smart webinar presentation template week 6",         "webinar",    "W6 audit label — webinar (typo 'lunch')"),
        ("Webinar deck",                                             "webinar",    "W6 bare 'Webinar deck'"),
        ("3 Steps Sales Letter Formulae",                            "sales_copy", "W6 audit label — sales letter formulae"),
        ("Copy of Sales Copy Framework ",                            "sales_copy", "W6 audit label — framework"),
        ("Sales Copy Framework Template",                            "sales_copy", "W6 audit label — framework"),
        ("Sales copy Formulae for Program sales page",               "sales_copy", "W6 audit label — sales copy + formulae"),
        ("Week 6 Sales Page",                                        "sales_copy", "W6 'Sales Page'"),
        ("Core Offer Sales Letter",                                  "sales_copy", "W6 'Sales Letter'"),
        ("My Week 6 Workbook",                                       "hold",       "W6 unrecognised → hold"),
        ("funnel",                                                   "hold",       "W6 'funnel' alone → hold"),
        ("Webinar Sales Framework",                                  "hold",       "W6 ambiguous webinar+framework → hold"),
    ]
    print("\n  Week 6:")
    for title, expected_type, desc in cases_w6:
        r = route_by_label(6, title)
        if expected_type == "hold":
            ok = r["outcome"] == "hold"
            check(desc, ok, f"got {r}")
        else:
            ok = r["outcome"] == "matched" and r.get("type") == expected_type
            check(desc, ok, f"got {r}")

    # Verify hold messages are non-empty and correct
    print("\n  Hold message content:")
    r = route_by_label(3, "Week 3 Workbook")
    check("W3 hold message mentions 'Ad Copy Scripts' or 'Ad Video Script'",
          "Ad Copy Scripts" in r.get("reason", "") or "Ad Video Script" in r.get("reason", ""),
          r.get("reason", ""))
    r = route_by_label(6, "funnel")
    check("W6 hold message mentions 'Webinar Presentation' or 'Sales Copy Framework'",
          "Webinar Presentation" in r.get("reason", "") or "Sales Copy Framework" in r.get("reason", ""),
          r.get("reason", ""))
    r = route_by_label(6, "Webinar Sales Framework")
    check("Ambiguous hold message mentions 'more than one pattern'",
          "more than one" in r.get("reason", ""),
          r.get("reason", ""))

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 2: Fingerprint check
# ══════════════════════════════════════════════════════════════════════════════

def section2_fingerprint():
    print("\n" + "═"*70)
    print("  SECTION 2 — Fingerprint check (V4 wiring, no API key required)")
    print("═"*70)

    # Extract rubric versions from the TS source
    # ACTIVE_RUBRIC is a const reference (= MASTER_RUBRIC_V4), not a template literal,
    # so we verify it structurally rather than by content extraction.
    try:
        v1 = extract_rubric("MASTER_RUBRIC_V1")
        v3 = extract_rubric("MASTER_RUBRIC_V3")
        v4 = extract_rubric("MASTER_RUBRIC_V4")
        print(f"\n  Extracted from {TS_RUBRIC_PATH.name}:")
        print(f"    V1 length: {len(v1):,} chars")
        print(f"    V3 length: {len(v3):,} chars")
        print(f"    V4 length: {len(v4):,} chars")
    except Exception as e:
        print(f"  EXTRACTION FAILED: {e}")
        results.extend([False]*6)
        return

    # ACTIVE_RUBRIC must be assigned = MASTER_RUBRIC_V4 (reference check, not content extraction)
    src = TS_RUBRIC_PATH.read_text(encoding="utf-8")
    active_assignment = re.search(r'export const ACTIVE_RUBRIC\s*=\s*(\w+)', src)
    active_points_to = active_assignment.group(1) if active_assignment else "(not found)"
    check("ACTIVE_RUBRIC = MASTER_RUBRIC_V4 (reference check)",
          active_points_to == "MASTER_RUBRIC_V4",
          f"ACTIVE_RUBRIC points to: {active_points_to}")

    # V4 must contain Change A fingerprint
    fp_a = "you have violated the rule"
    check(f'V4 contains Change A fingerprint: "{fp_a}"',
          fp_a in v4,
          "Change A hard prohibition not found in V4")
    check(f'V1 does NOT contain Change A fingerprint (regression guard)',
          fp_a not in v1,
          "V1 unexpectedly contains the V4 fingerprint")

    # V4 must contain Change B fingerprint
    fp_b = "rewrites teach the move; the student does the work"
    check(f'V4 contains Change B fingerprint: "{fp_b}"',
          fp_b in v4,
          "Change B rewrite scope rule not found in V4")
    check(f'V3 does NOT contain Change B fingerprint (confirms V3→V4 diff)',
          fp_b not in v3,
          "V3 unexpectedly contains the V4 fingerprint")

    # V4 must contain Change C fingerprint
    fp_c = "Before returning the JSON, verify"
    check(f'V4 contains Change C fingerprint: "{fp_c}"',
          fp_c in v4,
          "Change C pre-output self-check not found in V4")

    # V4 must be strictly longer than V3 (we added, never removed)
    check("V4 is longer than V3 (additions only, no deletions)",
          len(v4) > len(v3),
          f"V4 len={len(v4)}, V3 len={len(v3)}")

    # RUBRIC_VERSION must be MASTER_RUBRIC_V4
    src = TS_RUBRIC_PATH.read_text(encoding="utf-8")
    version_line = re.search(r'export const RUBRIC_VERSION\s*=\s*"([^"]+)"', src)
    got_version = version_line.group(1) if version_line else "(not found)"
    check(f'RUBRIC_VERSION = "MASTER_RUBRIC_V4"',
          got_version == "MASTER_RUBRIC_V4",
          f"Got: {got_version}")

    # buildReviewPrompt.ts must import ACTIVE_RUBRIC, not MASTER_RUBRIC_V1
    prompt_path = pathlib.Path(__file__).parent.parent / "src" / "lib" / "ai" / "buildReviewPrompt.ts"
    prompt_src = prompt_path.read_text(encoding="utf-8")
    check("buildReviewPrompt.ts imports ACTIVE_RUBRIC (not MASTER_RUBRIC_V1)",
          "ACTIVE_RUBRIC" in prompt_src and "MASTER_RUBRIC_V1" not in prompt_src,
          f"imports: {re.findall(r'import.*masterRubric.*', prompt_src)}")
    check("buildReviewPrompt.ts uses ACTIVE_RUBRIC as systemPrompt",
          "systemPrompt: ACTIVE_RUBRIC" in prompt_src,
          "systemPrompt line not found")

    # labelRouter.ts must exist
    router_path = pathlib.Path(__file__).parent.parent / "src" / "lib" / "ai" / "labelRouter.ts"
    check("labelRouter.ts exists",
          router_path.exists(),
          f"Expected at {router_path}")

    # runAiReview.ts must NOT contain filterPatternsForSubmission
    run_path = pathlib.Path(__file__).parent.parent / "src" / "lib" / "ai" / "runAiReview.ts"
    run_src = run_path.read_text(encoding="utf-8")
    check("runAiReview.ts: filterPatternsForSubmission removed",
          "filterPatternsForSubmission" not in run_src,
          "Old file-type heuristic function still present")
    check("runAiReview.ts: imports routeByLabel",
          "routeByLabel" in run_src,
          "routeByLabel import not found")
    check("runAiReview.ts: isWeek6SalesCopy no longer derived from fileType",
          "fileType !== " not in run_src or "isWeek6SalesCopy" not in run_src.split("fileType !==")[0],
          "Old file-type-based isWeek6SalesCopy still present")

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 3: Voice tests (requires ANTHROPIC_API_KEY)
# ══════════════════════════════════════════════════════════════════════════════

CASE_B_NICHE = None  # set after DB lookup

CASE_B_CONTENT = None  # set in show_case_b() after DB lookup

def show_case_b(conn):
    """Look up a staging test student and print the constructed Case B submission."""
    global CASE_B_NICHE, CASE_B_CONTENT
    cur = conn.cursor()
    # Find a LAUNCH_CLASS student with niche + launch info that isn't Student Two
    cur.execute("""
        SELECT u.id, u.name, u.niche, u."launchStrategy", u."launchPricing",
               u."launchPrice", u."launchEventTopic", u."approvedEventTitle",
               s.id as sub_id
        FROM "User" u
        JOIN "Submission" s ON s."studentId" = u.id
        WHERE u.role = 'STUDENT'
          AND u.niche IS NOT NULL
          AND u."launchEventTopic" IS NOT NULL
          AND s."weekNumber" = 3
        ORDER BY u."createdAt" DESC
        LIMIT 10
    """)
    students = cur.fetchall()

    # Fall back: any student with niche
    if not students:
        cur.execute("""
            SELECT u.id, u.name, u.niche, u."launchStrategy", u."launchPricing",
                   u."launchPrice", u."launchEventTopic", u."approvedEventTitle",
                   NULL as sub_id
            FROM "User" u
            WHERE u.role = 'STUDENT' AND u.niche IS NOT NULL
            ORDER BY u."createdAt" DESC LIMIT 5
        """)
        students = cur.fetchall()

    if not students:
        print("  No suitable staging student found for Case B.")
        return None, None

    # Pick the first one
    student_id, name, niche, strat, pricing, price, topic, ev_title, sub_id = students[0]
    rev_strat = derive_strategy(strat, pricing)
    launch_info = assemble_launch_info(niche, strat, pricing, price, topic, ev_title)

    print(f"\n  Staging student selected for Case B:")
    print(f"    Name    : {name}")
    print(f"    Niche   : {niche}")
    print(f"    Strategy: {rev_strat}")
    print(f"    Launch  : {ev_title or topic or '(not set)'}")

    # Construct a deliberately problematic Week 3 ad video script
    # Failure conditions built in:
    #   1. OFF-NICHE DRIFT: audience shifted from approved niche to generic "entrepreneurs"
    #   2. MISSING one required script (only 2 of 3 required ad copy scripts present — but
    #      since this routes as ad_video, the video script is what matters)
    #   3. TEMPLATE ARTIFACTS: placeholder text left in
    #   4. WRONG FUNNEL STAGE: video pitches the paid program, not the free event
    #   5. HOOK FAILURE: opens with coach intro instead of prospect pain
    #   6. PLATFORM SAFETY: "guaranteed income" language

    problematic_script = f"""AD VIDEO SCRIPT — WEEK 3

[Template note: replace all [PLACEHOLDER] text before filming]

Hi everyone, my name is [YOUR NAME] and I'm a business coach and entrepreneur.

I've been in the coaching industry for many years and I've helped many clients achieve amazing results.

Are you an entrepreneur or business owner who wants to make more money and achieve success?

Do you want to learn the secret strategies that successful coaches use to build 6 and 7-figure businesses?

If you answered YES, then this video is for you!

I'm hosting a FREE webinar on [INSERT DATE] where I'll be sharing:
- How to build a successful coaching business
- The strategies to get more clients
- How to make guaranteed income from your coaching

You'll discover the proven system that transformed my business and helped me achieve financial freedom.

This webinar is perfect for anyone who wants to grow their business, whether you're just starting out or have years of experience.

[Insert testimonial here — "Many of my clients have tripled their income using these strategies!"]

The training is completely free and you'll receive a bonus gift just for showing up live.

Spots are limited so register now before they fill up.

Click the link below to secure your FREE spot today!

I can't wait to see you on the inside.

[Add urgency here — only X spots left]

See you there!
"""

    CASE_B_NICHE = niche
    CASE_B_CONTENT = problematic_script

    print(f"\n  ┌─ CASE B: Constructed test content (Week 3 Ad Video Script) ─────────")
    print(f"  │  workbookTitle: 'Week 3 Ad Video Script'")
    print(f"  │  Deliberate failure conditions:")
    print(f"  │    1. OFF-NICHE DRIFT — 'entrepreneurs/business owners' instead of: {(niche or '')[:70]}")
    print(f"  │    2. HOOK FAILURE — opens with coach intro ('Hi everyone, my name is')")
    print(f"  │    3. TEMPLATE ARTIFACTS — '[YOUR NAME]', '[INSERT DATE]', '[Insert testimonial]'")
    print(f"  │    4. WRONG FUNNEL STAGE — pitches the paid program not the free event")
    print(f"  │    5. PLATFORM SAFETY — 'guaranteed income' language")
    print(f"  │    6. GENERIC PROOF — 'many clients', unattributed, no numbers")
    print(f"  └────────────────────────────────────────────────────────────────────")
    print(f"\n  Full script:")
    for line in problematic_script.split('\n')[:30]:
        print(f"    {line}")
    print(f"    ... ({len(problematic_script)} chars total)")

    return student_id, sub_id

def section3_voice(conn):
    print("\n" + "═"*70)
    print("  SECTION 3 — Voice tests (ANTHROPIC_API_KEY required)")
    print("═"*70)

    if not ANTHROPIC_API_KEY:
        print("\n  ✗ ANTHROPIC_API_KEY not set — skipping voice tests.")
        print("    Set the environment variable and re-run.")
        return

    v1_rubric = extract_rubric("MASTER_RUBRIC_V1")
    v4_rubric = extract_rubric("MASTER_RUBRIC_V4")

    # ── Case A: Student Two webinar — V1 vs V4 ────────────────────────────────
    print(f"\n  Case A — Student Two webinar ({STUDENT_TWO_SUBMISSION})")
    print(f"  Running V1 (the baseline that was ACTUALLY in production)...")
    r_v1 = run_review(v1_rubric, conn, STUDENT_TWO_SUBMISSION)
    print_verdict("V1 on Student Two", r_v1)

    print(f"\n  Running V4 (the new active rubric)...")
    r_v4 = run_review(v4_rubric, conn, STUDENT_TWO_SUBMISSION)
    print_verdict("V4 on Student Two", r_v4)

    print(f"\n  Voice checks — V4 output:")
    voice_checks("Case A / V4", r_v4)

    # V1 vs V4 comparison
    print(f"\n  V1-active → V4-active DIFF on Student Two (key student-facing fields):")
    if r_v1.get("outcome") == "reviewed" and r_v4.get("outcome") == "reviewed":
        fb1 = r_v1["aiFeedback"]
        fb4 = r_v4["aiFeedback"]
        for field in ["launch_alignment_explanation", "template_notes", "triage_reason",
                      "human_voice_notes", "week_specific_findings"]:
            t1 = fb1.get(field, "(missing)")
            t4 = fb4.get(field, "(missing)")
            if isinstance(t1, list): t1 = " | ".join(t1)
            if isinstance(t4, list): t4 = " | ".join(t4)
            print(f"\n  {field}:")
            print(f"    [V1] {t1[:300]}...")
            print(f"    [V4] {t4[:300]}...")

        # Save V1 and V4 results
        cache_dir = pathlib.Path(__file__).parent / ".comparison_cache"
        cache_dir.mkdir(exist_ok=True)
        (cache_dir / "v4_case_a_v1.json").write_text(json.dumps(fb1, indent=2, ensure_ascii=False), encoding="utf-8")
        (cache_dir / "v4_case_a_v4.json").write_text(json.dumps(fb4, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"\n  Results saved to .comparison_cache/v4_case_a_v1.json and v4_case_a_v4.json")

    # ── Case B: Load test ─────────────────────────────────────────────────────
    print(f"\n  Case B — Load test (deliberately problematic Week 3 ad video script)")
    student_id, _ = show_case_b(conn)
    if not student_id or not CASE_B_CONTENT:
        print("  ✗ Could not construct Case B")
        return

    # Find a Week 3 submission from this student to use as the DB anchor,
    # or fall back to Student Two's submission ID with an override
    cur = conn.cursor()
    cur.execute("""
        SELECT id FROM "Submission"
        WHERE "studentId" = %s AND "weekNumber" = 3
        ORDER BY "submittedAt" DESC LIMIT 1
    """, (student_id,))
    w3_row = cur.fetchone()
    anchor_sub_id = w3_row[0] if w3_row else STUDENT_TWO_SUBMISSION

    # Look up the student's actual niche + launch info for the override
    cur.execute("""
        SELECT niche, "launchStrategy", "launchPricing", "launchPrice",
               "launchEventTopic", "approvedEventTitle"
        FROM "User" WHERE id = %s
    """, (student_id,))
    u = cur.fetchone()
    niche, strat, pricing, price, topic, ev_title = u
    override_launch_info = assemble_launch_info(niche, strat, pricing, price, topic, ev_title)
    override_strategy    = derive_strategy(strat, pricing)

    print(f"\n  Running V4 on Case B...")
    r_b = run_review(
        v4_rubric, conn, anchor_sub_id,
        override_text=CASE_B_CONTENT,
        override_week=3,
        override_niche=niche,
        override_launch_info=override_launch_info,
        override_strategy=override_strategy,
    )
    print_verdict("V4 on Case B (load test)", r_b)
    print(f"\n  Voice checks — Case B:")
    voice_checks("Case B / V4", r_b)

    if r_b.get("outcome") == "reviewed":
        fb_b = r_b["aiFeedback"]
        cache_dir = pathlib.Path(__file__).parent / ".comparison_cache"
        (cache_dir / "v4_case_b.json").write_text(json.dumps(fb_b, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"\n  V4 Case B output saved to .comparison_cache/v4_case_b.json")
        print(f"\n  Case B full aiFeedback:")
        print(json.dumps(fb_b, indent=2, ensure_ascii=False))

# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    voice_only = "--voice-only" in sys.argv
    show_b     = "--show-case-b" in sys.argv

    conn = get_conn()

    if show_b:
        show_case_b(conn)
        conn.close()
        return

    if not voice_only:
        section1_routing()
        section2_fingerprint()

    section3_voice(conn)

    conn.close()

    total  = len(results)
    passed = sum(results)
    failed = total - passed
    print(f"\n{'═'*70}")
    print(f"  TOTAL: {total}  |  PASSED: {passed}  |  FAILED: {failed}")
    print(f"{'═'*70}\n")

if __name__ == "__main__":
    main()

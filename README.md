# SIH26122 — Intelligent Data Capture & Schedule-Linking Layer

**Real-Time Actual Progress Tracking (Planning-to-Execution Bridge)**

**Organization:** Oil India Limited (OIL) &nbsp;•&nbsp; **Theme:** Smart Automation &nbsp;•&nbsp; **Category:** Software
**Event:** Smart India Hackathon 2026 &nbsp;•&nbsp; **PS ID:** SIH26122 &nbsp;•&nbsp; **Submission deadline:** 20 September 2026

---

## 1. Overview

Infrastructure projects run on a detailed baseline schedule (Primavera P6 / MS Project) that cascades from
high-level milestones (L1) down to executable field activities (L5/L6). But real progress on site is captured
through daily progress reports (DPRs), spreadsheets, site diaries, and supervisor messages — in language that
rarely matches the schedule's wording.

**This project builds the missing bridge:** it ingests messy field data, extracts structured progress events,
semantically matches them to the correct planned activity, scores confidence, routes uncertain cases to a
human reviewer, and updates the schedule — with a full audit trail.

> "We are not replacing Primavera. We are fixing the missing bridge between Primavera and the people actually
> doing the work."

### Core pipeline

```
INPUTS → INGESTION → NORMALIZATION/OCR → EVENT EXTRACTION → CANDIDATE RETRIEVAL
       → SEMANTIC MATCHING → RULE/CONSTRAINT CHECKS → CONFIDENCE
       → REVIEW / AUTO-UPDATE → GANTT & ANALYTICS → PROJECT MEMORY
```

| Step | Stage | What happens |
|---|---|---|
| 1 | Ingest | Read schedule + field reports (XLSX schedule, DPR PDF/TXT) |
| 2 | Extract | Turn messy text into structured events |
| 3 | Candidate search | Find likely planned activities via filters + keyword search |
| 4 | Semantic match | Handle different wording using embeddings |
| 5 | Confidence | Decide auto-link vs. review vs. unmatched |
| 6 | Update | Write actual start/finish/progress + variance |
| 7 | Audit | Preserve source text, decision, reviewer, timestamp |

---

## 2. Problem Statement Summary

**Official pain points:**
- Actual progress data is fragmented, delayed, and inconsistently structured.
- Manual reconciliation against the baseline schedule is slow and error-prone.
- Poor/late actuals weaken analytics, delay/risk analysis, and forecasting.
- Real durations, bottlenecks, and deviations aren't preserved as structured institutional memory.

**Official expected solution:**
- Ingest heterogeneous inputs (free-text DPRs, spreadsheets, scanned diaries, Primavera/MS Project exports).
- Extract activity-level actual start/end events.
- Offer an LLM-based conversational/voice **"Time Agent"** for low-friction supervisor updates.
- Fuzzy-match field descriptions to the correct L5/L6 activity, handling terminology/granularity differences.
- Flag unmatched/new activities for planner review instead of silently dropping them.
- Auto-update actual dates in near real time with a confidence score and audit trail.
- Produce a clean, discipline-tagged actual-progress dataset for analytics and future project learning.

A working prototype demonstrating **2–3 input formats** with solid extraction and schedule-linking logic is
the target — full production-grade OCR/ASR is **not** required.

> **Data note:** OIL's live project data is *not* available. Anonymized templates may be shared under NDA via
> an authorized institute contact. The project is built and evaluated on **synthetic/sample data** designed to
> mirror real structure.

---

## 3. Domain Glossary (Quick Reference)

| Term | Meaning |
|---|---|
| **WBS** | Work Breakdown Structure — tree from L1 (broad) to L5/L6 (executable field activity) |
| **Baseline** | The approved plan — what should happen and when |
| **Actual start/finish** | When work really started/finished |
| **Variance** | Difference between planned and actual dates/durations |
| **Data date** | The schedule's reporting/update cut-off date |
| **Critical path** | Chain of activities controlling the project finish date |
| **Float** | Schedule flexibility on non-critical activities |
| **Discipline** | Civil, piping, electrical, instrumentation, HSE, etc. |

Example WBS levels:

| Level | Meaning | Example |
|---|---|---|
| L1 | Major project/milestone | New Gas Processing Facility |
| L2 | Major area/package | Piping System |
| L3 | Subsystem/discipline | Process Piping |
| L4 | Work package | North Unit Piping |
| L5 | Executable activity | Erect Line 24A |
| L6 | Granular field activity | Install spool 24A-S03 |

---

## 4. Worked Example

**Schedule:**

| Activity ID | Planned activity | Discipline | Planned start | Planned finish |
|---|---|---|---|---|
| PIP-L5-024 | Erect Line 24A | Piping | 04 Sep | 06 Sep |
| PIP-L5-025 | Hydrotest Line 24A | Piping | 07 Sep | 08 Sep |
| CIV-L5-011 | Pour Foundation F-11 | Civil | 03 Sep | 05 Sep |

**Site report:** *"Piping crew completed erection of spool 24A-S03 on 5 Sep. Line 24A erection ongoing;
hydrotest not started."*

Keyword search fails here ("spool erected" ≠ "erect Line 24A"). The system instead:

1. Extracts an event → work=erection, object=Line 24A/spool 24A-S03, date=5 Sep, status=ongoing/partial.
2. Retrieves candidates using discipline, IDs, area, and semantic similarity.
3. Ranks `PIP-L5-024` above unrelated activities.
4. Shows the match + confidence to the planner.
5. Auto-proposes/updates if confident; sends to review queue if uncertain.
6. Logs the source sentence and decision in the audit trail.

---

## 5. Architecture

```
Frontend (React/TS)  ──►  API (FastAPI)  ──►  PostgreSQL + pgvector
        │                       │
        │                 AI/NLP Layer
        │            (LLM extraction, BGE-M3
        │             embeddings, reranker)
        │                       │
        └────── Gantt / Analytics / Review UI ──────┘
```

| Layer | Recommended choice | Why |
|---|---|---|
| Frontend | React + TypeScript + Vite + Tailwind | Fast to build, clean demo UI |
| API | Python FastAPI | Easy ML/data integration |
| Parsing | pandas, openpyxl | XLSX/CSV handling |
| PDF/text | PyMuPDF / pdfplumber / MarkItDown | Extract reports quickly |
| OCR (optional) | Tesseract | Scanned diaries only |
| LLM | OpenAI-compatible / local model | Structured event extraction |
| Embeddings | BAAI/bge-m3 (Sentence Transformers) | Semantic matching |
| Reranker (optional) | BAAI/bge-reranker-v2-m3 | Refine top candidates |
| Vector DB | PostgreSQL + pgvector | Unified relational + vector store |
| Charts | Recharts / ECharts | Progress, variance, analytics |
| Gantt | Custom React Gantt / library | Baseline vs. actual view |
| Voice (optional) | Whisper | Supervisor Time Agent |
| Deployment | Docker + Render/Railway/Vercel | Simple demo deployment |

**Design principle:** AI handles messy understanding and explanation; deterministic application logic owns
all critical database writes. **The LLM never invents or directly writes an Activity ID** — it proposes
candidates that the retrieval/matching layer found.

---

## 6. Data Model

| Entity | Key fields |
|---|---|
| `Project` | project_id, name, client, start_date, finish_date, data_date |
| `WBS` | wbs_id, parent_id, code, name, level |
| `Activity` | activity_id, wbs_id, name, discipline, planned_start/finish, actual_start/finish, percent_complete, status |
| `Relationship` | predecessor_id, successor_id, relationship_type, lag |
| `SourceDocument` | source_id, filename, type, discipline, uploaded_at |
| `ProgressEvent` | event_id, source_id, raw_text, normalized_activity_text, event_type, event_date, status, quantity, unit |
| `Match` | event_id, activity_id, semantic_score, rule_score, final_confidence, decision |
| `Review` | match_id, reviewer, decision, reason, reviewed_at |
| `AuditLog` | action, old_value, new_value, actor, timestamp, source_id |
| `DelayCause` | activity_id/event_id, category, note |

Example `ProgressEvent`:

```json
{
  "event_type": "ACTIVITY_PROGRESS",
  "discipline": "PIPING",
  "description": "Line 24A erection ongoing; spool S03 erected",
  "event_date": "2026-09-05",
  "status": "IN_PROGRESS",
  "quantity": null,
  "unit": null
}
```

Raw source text is always stored alongside the normalized event for explainability and auditability.

---

## 7. Schedule-Linking (Matching) Pipeline

1. **Hard filters** — project, discipline, area/unit, known activity IDs, date window, status.
2. **Candidate generation** — keyword/BM25 or Postgres full-text search → top 10–30 activities.
3. **Embedding similarity** — BGE-M3 embeddings, cosine similarity between event and candidates.
4. **Metadata score** — reward matching discipline, line/equipment/tag/area identifiers, compatible dates.
5. **Optional reranking** — LLM or BGE reranker compares only the top few candidates.
6. **Decision policy** — auto-accept only above threshold; else route to planner review.
7. **Audit** — store candidates, scores, final decision, and evidence.

**Prototype confidence formula:**

```
final_score = 0.65 × semantic_similarity + 0.20 × metadata_score + 0.15 × keyword/entity_score
```

| Score | Action | Reason |
|---|---|---|
| ≥ 0.85 | Auto-propose / optionally auto-update | High confidence |
| 0.65 – 0.84 | Planner review required | Ambiguous |
| < 0.65 | Unmatched queue | Avoid corrupting the schedule |

*(Formula and thresholds are prototype recommendations, not official OIL requirements — tune on your
validation set.)*

---

## 8. Where AI Should / Should Not Be Used

| Task | AI/LLM? | Approach |
|---|---|---|
| Extract dates/status/actions from free text | ✅ Yes | LLM → structured JSON + validation |
| OCR scanned diary | Optional | OCR engine / document AI |
| Speech → text | Optional | Whisper / API |
| Match to exact activity | ✅ Yes, not alone | Embeddings + metadata + review |
| Write actual date to DB | ❌ No direct authority | Validated application logic |
| Compute variance | ❌ No | Deterministic calculation |
| Explain why a match was chosen | ✅ Yes | LLM explanation from stored evidence |
| Forecast future delays | ⏳ Later | Historical model once enough data exists |

---

## 9. Dataset Strategy

Real OIL project data is **not available**; the PS explicitly expects synthetic/sample data of similar
structure. Anonymized sample formats may be obtainable via NDA through an authorized institute contact —
don't depend on this.

**Recommended approach:**

1. Create one realistic synthetic project (pipeline/plant construction, 150–500 activities).
2. Build WBS levels and activity IDs across piping, civil, electrical, instrumentation.
3. Write 20–50 synthetic daily reports in varied writing styles.
4. Deliberately include synonyms/abbreviations ("erect", "install", "fit-up", "spool erected", "HT", ...).
5. Include hard cases: partial progress, multi-activity sentences, missing dates, typos, wrong terminology,
   unmatched/new work.
6. Label ground truth: report event → correct activity ID, or `UNMATCHED`.
7. Hold out a hidden test subset while tuning.

Difficulty buckets to cover: **easy, paraphrased, noisy, ambiguous.**

---

## 10. MVP Scope (Priority Order)

| Priority | Feature | Must-have? |
|---|---|---|
| P0 | Upload/import schedule CSV/XLSX | Yes |
| P0 | Upload/import free-text DPR (TXT/PDF) | Yes |
| P0 | Normalize schedule into internal Activity model | Yes |
| P0 | Extract structured progress events | Yes |
| P0 | Semantic candidate matching | Yes |
| P0 | Confidence + reviewer queue | Yes |
| P0 | Update actual progress internally | Yes |
| P0 | Gantt: baseline vs. actual + variance | Yes |
| P0 | Audit trail / evidence | Yes |
| P1 | Excel/discipline spreadsheet ingestion | Strongly recommended |
| P1 | Voice Time Agent | Good wow feature |
| P1 | Scanned diary OCR | Good if stable |
| P1 | Delay cause analytics | Good |
| P2 | Historical project memory | Extension |
| P2 | Forecasting/predictive delay model | Only if time remains |
| P2 | Real Primavera write-back | Do **not** build into MVP |

**Guiding rule:** one flawless end-to-end matching demo beats a dashboard full of shallow features.

---

## 11. App Screens

| Screen | Purpose |
|---|---|
| Project Home | Health, data freshness, progress, late activities |
| Import Center | Upload schedule/report; parsing status |
| AI Extraction | Raw report → structured events |
| Match Review | Top candidate, confidence, evidence, alternatives |
| Gantt / Schedule | Baseline vs. actual; late/updated bars |
| Activity Detail | Plan, actuals, source evidence, audit history |
| Time Agent | Text/voice supervisor reporting |
| Analytics | Delay causes, discipline performance |
| Project Memory | Historical durations, recurring bottlenecks |

---

## 12. Team & Roles (6 People)

| # | Role | Main ownership | Deliverables |
|---|---|---|---|
| 1 | Product / Project Controls Lead | Domain, WBS/schedule model, requirements, demo story | Activity schema, sample project, acceptance criteria, pitch |
| 2 | Frontend Lead | React UI, Gantt, review queue | Import UI, dashboard, Gantt, activity detail |
| 3 | Backend/API Lead | FastAPI, DB, ingestion APIs | Project/activity/event APIs, DB schema, update workflow |
| 4 | AI/NLP Lead | LLM extraction + embeddings + matching | Extraction, candidate ranking, confidence, evaluation |
| 5 | Document/Voice + Data Engineer | PDF/XLSX/OCR/voice + synthetic data | Parsers, DPR generator, OCR/Whisper (optional), test corpus |
| 6 | Integration + QA + DevOps | Integration, testing, deployment, analytics | Docker, CI, API integration, test suite, deployment |

Recommended pairing: **2+6** (frontend integration), **3+5** (ingestion/backend), **4+1** (matching
evaluation/domain validation). Everyone should be able to run the system locally.

---

## 13. Repository Structure

```
/
├── frontend/          # React + TypeScript + Vite app
├── backend/           # FastAPI service (APIs, DB models, update workflow)
├── ai/                # LLM extraction, embeddings, matching pipeline
├── data/
│   ├── schedules/     # Synthetic schedule CSV/XLSX files
│   ├── dpr/            # Synthetic daily progress reports
│   └── ground_truth/  # Labeled event → activity_id mappings
├── docs/              # Architecture notes, demo script, evaluation reports
├── scripts/           # Setup, seeding, evaluation scripts
├── docker-compose.yml
└── README.md
```

**Branching:** `main` = stable demo · `dev` = integration · `feature/*` = individual work.
**Rule:** every feature must be demoable from a clean clone — don't wait until the last day to integrate.

---

## 14. Evaluation Metrics

| Metric | Meaning |
|---|---|
| Event extraction accuracy | Correct date/status/activity description extracted? |
| Top-1 match accuracy | Was the correct activity ranked first? |
| Top-3 recall | Was the correct activity among the top 3? |
| **Auto-link precision** | When auto-linked, how often correct? *(most important — false positives can corrupt the schedule)* |
| Unmatched detection | Did ambiguous/new activities correctly avoid a false update? |
| Latency | Time from upload/report to proposed update |
| Human review rate | Share of events requiring planner input |

Evaluate on a held-out synthetic test set that was *not* used for tuning. Report results honestly as
performance on a synthetic benchmark — don't claim unverifiable accuracy numbers.

---

## 15. Getting Started (Local Dev)

> Fill in exact commands once the stack is scaffolded. Suggested shape below.

```bash
# clone
git clone <repo-url>
cd sih26122

# backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# frontend
cd ../frontend
npm install
npm run dev

# database (Postgres + pgvector) via Docker
docker compose up -d db

# seed synthetic data
python scripts/seed_synthetic_data.py
```

Environment variables (`.env`, never committed):

```
DATABASE_URL=postgresql://user:pass@localhost:5432/sih26122
LLM_API_KEY=...
EMBEDDING_MODEL=BAAI/bge-m3
```

---

## 16. Security & Trust Notes

- Use synthetic/anonymized data unless authorized OIL data access is explicitly granted.
- Store source document IDs, timestamps, and raw extracted text alongside every event.
- Never silently overwrite schedule history — keep an audit record for every change.
- Validate dates, activity IDs, and allowed state transitions server-side (not in the LLM).
- Keep API keys in environment variables, never in Git.
- A production deployment would require an approved enterprise AI/data-governance setup.

---

## 17. Common Pitfalls to Avoid

| Mistake | Why it hurts | Fix |
|---|---|---|
| Building only a dashboard | Misses the core intelligence layer | Make schedule-linking the hero feature |
| Exact keyword matching only | Fails on terminology differences | Embeddings + metadata |
| LLM directly chooses Activity ID | Can hallucinate / wrongly update | Retriever proposes; rules validate |
| Auto-linking every match | Silent schedule corruption | Confidence thresholds + review queue |
| Supporting every file type | Scope explosion | Perfect 2–3 formats |
| Real Primavera write-back as MVP | Integration complexity | Simulate an internal PMIS update |
| Claiming fake high accuracy | Easy for judges to challenge | Transparent synthetic benchmark |
| Forecasting before data exists | Weak credibility | Build a clean actual dataset first |
| No ground truth | Can't prove matching works | Labeled synthetic test set |
| No source evidence | Hard to trust the AI | Show the exact sentence + scores |

---

## 18. Demo Script (3 Minutes)

| Time | Beat |
|---|---|
| 0:00–0:20 | Problem — show a Gantt with planned activities; explain site reports live elsewhere |
| 0:20–0:45 | Upload a synthetic DPR + discipline spreadsheet |
| 0:45–1:10 | AI extraction — show 2–3 extracted events with dates/status |
| 1:10–1:40 | Matching — top candidate, confidence, evidence; include one ambiguous case |
| 1:40–2:05 | Human approval — planner approves the ambiguous match |
| 2:05–2:30 | Update — actual date/progress changes; Gantt/variance updates live |
| 2:30–2:45 | Analytics — one delay-cause / discipline insight |
| 2:45–3:00 | Future — demo the Time Agent, or explain institutional memory over time |

---

## 19. References

- SIH26122 problem statement (public mirror of the official SIH 2026 statement, sih.gov.in)
- Oracle Primavera documentation — activity/WBS/relationship/actual-date fields
- Microsoft Project XML schema — `ActualStart`, `ActualFinish`, `ActualDuration`
- Sentence Transformers documentation — semantic textual similarity & embeddings
- pgvector — open-source vector similarity search for PostgreSQL
- Microsoft MarkItDown + OCR plugin documentation
- `Buildings.Historical.Data` — public, MIT-licensed construction schedule dataset (70+ buildings, converted from Primavera)

> The official SIH portal/statement is the authoritative source for PS requirements. The architecture,
> thresholds, synthetic-data design, and role split in this README are hackathon recommendations, not
> official OIL specifications — recheck the portal before final submission.

---

## 20. Bottom Line

1. This is a **linking problem**, not mainly a dashboard problem.
2. Real OIL data is **not** a dependency — build realistic, labeled synthetic data.
3. **LLM + embeddings + rules + human review** is safer than "ask an LLM which activity this is."
4. Show the **full loop**: report → extraction → match → confidence → approval → actual update → Gantt/variance.
5. Do less, but make the core believable — 2–3 excellent input formats beat ten half-working features.

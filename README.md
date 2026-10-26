# CareerCopilot

**Know exactly where your career stands.** A career platform for the Indian tech job market:

- **Resume score.** A transparent 0–100 score with the reason behind every point, skills found vs missing for a target role, role readiness, salary path, roadmap, AI feedback, bullet rewrites and likely interview questions.
- **Jobs board with real openings.** Every morning a scheduled import pulls live tech roles in India from the public careers feeds (Lever, Greenhouse, Ashby) of 20 companies such as CRED, Meesho, Groww, Sarvam AI, Rubrik and Databricks. Hiring managers can also post directly. Community votes, Hacker-News-style "hot" ranking, filters by function, seniority, work mode, source and tech stack, recruiter-spam rejection, and a "stack fit" score against your own resume. Closed roles disappear on their own.
- **Job match.** Paste any job description: ATS-style match score (skills, keywords, experience), missing keywords, a tailored cover letter and resume edits.
- **Tracker.** Applications from saved to offer, plus every resume report, stored on your own device.

Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Zod and any OpenAI-compatible LLM (Gemini free tier by default). Design inspired by CRED's NeoPOP: black canvas, Instrument Serif headlines, Manrope body, a gold-edged 3D button.

## Quick start

```bash
npm install
cp .env.example .env.local   # optional: add LLM_API_KEY for AI-written feedback and cover letters
npm run dev                  # http://localhost:3000
```

No API key? Everything still works. Feedback and cover letters fall back to rule-based templates and the UI says so.

Locally the jobs board uses `.data/jobs.json` (seeded with demo posts). To fill it with real openings run `npm run import:jobs`.

A sample resume for demos is in `tests/fixtures/sample-resume.pdf`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm test` | Unit + integration tests (Vitest) |
| `npm run eval` | Quality evals on labelled resumes (precision/recall, accuracy gate) |
| `npm run typecheck` / `npm run lint` | Static checks |
| `npm run check` | All of the above, what CI runs (`.github/workflows/ci.yml`) |
| `npm run build` | Production build |
| `npm run import:jobs` | Pull today's openings from all company feeds into the configured store |

## Architecture

```
app/                          Pages (Server Components by default) + API route handlers
  api/analyze, api/match      multipart: resume PDF/text  -> analysis / job match
  api/jobs, api/jobs/[id]/vote JSON: list (filters, sort), create, vote
components/                   UI. components/ui/kit.tsx is the design system
lib/
  http/handler.ts             apiHandler(): request id, rate limit, error mapping, logging (one place)
  config.ts                   env validated with Zod, llmOptions()
  errors.ts                   AppError(code, message, status) -> { error: { code, message, requestId } }
  resume/                     PDF -> text (magic-byte check), form parsing
  analysis/                   skills, experience, scoring, career projections, orchestrator
  match/                      resume <-> job description matching (ATS-style)
  jobs/                       jobs board: types, classify (stack, source, spam), ranking, service
    repository.ts             JobRepository interface + memory + JSON-file implementations
    postgres.ts               PostgresJobRepository (Neon in production, PGlite in tests)
    import/                   daily ETL: companies list, feed parsers, normalisation, importer
  ai/                         llmClient (timeout, retry, backoff), prompts (versioned), structured (Zod + self-correct),
                              insights, coverLetter (each with a rule-based fallback)
  storage/                    typed localStorage repository (+ React hook) for reports, applications, voter id
  data/                       skill taxonomy, role requirements, salary bands
```

**Hybrid AI design.** Numbers (scores, readiness, salary, match) come from deterministic code: reproducible, testable, free. The LLM only writes text (feedback, cover letters). Its output is validated against a schema, it gets one chance to self-correct, and the app degrades gracefully if the model is slow, wrong or missing.

**Layers.** Route handlers only do HTTP. Services hold business rules. Repositories hide storage. Swapping the JSON file for Postgres means one new `JobRepository` class.

## API

| Method | Path | Body / query | Success |
| --- | --- | --- | --- |
| POST | `/api/analyze` | multipart: `targetRole`, `resume` (PDF) or `resumeText` | `200 { data: AnalysisResult }` |
| POST | `/api/match` | multipart: `jobDescription`, `jobTitle?`, `company?`, resume | `200 { data: MatchResult }` |
| GET | `/api/jobs` | `sort=hot\|new\|top`, `function`, `seniority`, `workMode`, `source`, `stack`, `q`, `voter` | `200 { data: { jobs, stacks } }` |
| POST | `/api/jobs` | JSON `NewJobSchema` | `201 { data: JobView }` |
| POST | `/api/jobs/:id/vote` | JSON `{ voterId, value: 1 \| -1 \| 0 }` | `200 { data: JobView }` |
| GET | `/api/cron/import-jobs` | header `Authorization: Bearer $CRON_SECRET` | `200 { data: ImportReport }` |
| GET | `/api/health` | | `{ status: "ok", ai: { mode } }` |

Errors always look like `{ error: { code, message, requestId } }` with 400 / 404 / 413 / 422 / 429 / 500.

## Real job data

`lib/jobs/import` is a small ETL pipeline. **Extract:** fetch each company's public careers feed (the official job-board APIs of Lever, Greenhouse and Ashby, no scraping, no keys) with bounded concurrency and a timeout per company. **Transform:** validate the JSON with Zod, keep India-based tech roles, classify function, seniority and work mode, detect the stack with the same taxonomy as resumes, cap 40 roles per company. **Load:** one batched `INSERT ... ON CONFLICT DO UPDATE` keyed by `ats:company:postingId`, so re-running is idempotent. A role stays live while the company still lists it and expires 3 days after it disappears from the feed. One failing company never blocks the rest; the import returns a per-company report.

Add a company by adding one line to `lib/jobs/import/companies.ts`.

## Deploy (Vercel + Neon, free tiers)

1. Push the repo to GitHub.
2. On vercel.com: **Add New → Project**, import the repo (framework: Next.js, defaults are fine).
3. In the project: **Storage → Create Database → Neon (Postgres)** and connect it. This adds `DATABASE_URL`.
4. **Settings → Environment Variables:** add `CRON_SECRET` (a long random string) and, optionally, `LLM_API_KEY`.
5. **Deployments → Redeploy** so the new variables load.
6. Run the first import instead of waiting for tomorrow's cron:
   `curl -H "Authorization: Bearer <CRON_SECRET>" https://<your-app>.vercel.app/api/cron/import-jobs`

`vercel.json` schedules the import daily at 01:30 UTC (07:00 IST). On the Hobby plan crons run at most once a day.

## Privacy

Resumes are processed in memory and never written to disk or a database. Reports and the application tracker live in the user's browser (localStorage). Logs contain request ids, sizes and timings, never resume text. Voter ids are random and never returned by the API.

## Known limitations / next steps

- The in-memory cache, rate limiter and 30-second jobs list cache are per server instance. Use Redis (Upstash) when scaling out.
- Salary bands are hand-curated estimates, not live market data.
- Scanned (image-only) PDFs need OCR; users can paste text instead.
- Company feeds cover companies using Lever, Greenhouse or Ashby; others (Workday, own career sites) need their own adapter. LinkedIn and X posts are not imported: their terms forbid scraping.
- Next: accounts + server-side saved reports, more companies, LLM skill extraction for skills outside the taxonomy, embeddings-based job matching, email alerts for new roles that fit you.

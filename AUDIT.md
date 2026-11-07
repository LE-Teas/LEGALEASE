# LegalEase — Repository Audit (Phase A)

**Date:** 2026-11-07
**Branch audited:** `main` @ `131a148`
**Auditor:** engineering review pass (architecture, security, AI/RAG, database, product)

This document records what the code actually does, not what the README claims. Every
finding below was confirmed by reading the source or executing a command; the
"Evidence" line says which. Nothing here is inferred from file names alone.

---

## 1. Existing architecture (as-built)

```
Browser ──► Next.js 16 App Router (RSC + Server Actions + Route Handlers)
              │
              ├─ app/(marketing)   public pages, includes /ai-assistant preview
              ├─ app/citizen       citizen portal  (proxy.ts gates by role)
              ├─ app/lawyer        lawyer portal
              ├─ app/admin         15 governance modules
              ├─ app/api/*         REST-ish route handlers
              └─ app/actions/*     server actions ("use server")
              │
              ├─ lib/supabase/{server,client,admin,proxy}.ts   @supabase/ssr clients
              ├─ lib/services/*    domain logic (appointments, payments, filer, email…)
              ├─ lib/rag/*         chunking → embeddings → retrieval → citations → prompts
              └─ lib/ai/*          Gemini client, config, zod schemas
              │
              ▼
         Supabase (Postgres + pgvector + PostGIS + Storage + Auth), RLS-enforced
```

* **Auth**: Supabase Auth. Role lives in `public.profiles.role` (good — not in
  `user_metadata`). Route gating in `proxy.ts` (Next 16 renamed middleware).
* **DB access**: two clients. `createClient()` (anon key, RLS applies) and
  `createAdminClient()` (service role, **bypasses RLS**). Admin client usage is the
  single most important trust boundary in the app.
* **Migrations**: **none**. One monolithic `supabase/schema.sql` (2 067 lines) applied
  by hand in the SQL editor. There is no migration history, so there is no way to know
  which statements have actually run against the live database.

### Verified baselines (executed, not assumed)

| Check | Command | Result |
| :-- | :-- | :-- |
| TypeScript | `NODE_OPTIONS=--max-old-space-size=4096 npx tsc --noEmit` | **0 errors** (default heap OOMs → see P-3) |
| ESLint | `npx eslint` | **1 error**, 142 warnings |
| Tests | search for `*.test.ts` / `*.spec.ts` | **none exist** |
| Build | `next build` | not run at audit time (no env configured) |

---

## 2. Feature status

### Working as documented
* Role-based route gating (`proxy.ts`) and re-check in dashboards.
* Conversation/message persistence with RLS scoped to `user_id`.
* Legal-aware chunking (`lib/rag/chunking.ts`) — genuinely detects
  `Section N.`, `Article N.`, `CHAPTER`, `PART`, `SCHEDULE`, and preserves
  `section_number` / `article_number` / `page_number` per chunk. **This is good and
  is preserved.**
* Citation *validation* (`lib/rag/citations.ts`) — drops any citation whose document
  was not retrieved, and drops section/article refs not present in the retrieved
  chunk. Good design; extended below rather than replaced.
* Filer lookup is a **structured exact match**, never RAG/LLM. Correct architecture.
* Appointment booking uses an atomic RPC with an advisory lock.

### Partially implemented / broken
| Feature | State |
| :-- | :-- |
| Semantic RAG retrieval | **Broken** — no semantic embeddings exist (F-1) |
| Urdu / Roman Urdu support | **Broken** — Urdu embeds to a zero vector (F-1), classifier is English-only (F-6) |
| Lawyer recommendation | **Broken** — queries a column that does not exist, always returns `[]` (F-8) |
| Admin "debug" retrieval | **Broken** — calls RPC `match_legal_chunks_debug` that is never created (F-11) |
| Legal document verification workflow | **Contradicted** — upload auto-sets `verified` (F-7) |
| Filer lookup for citizens | **Broken by RLS** — session-client fallback cannot read `filer_records` (F-4b) |
| Citizen PDF text extraction | **Placeholder** — regex over raw PDF bytes, not a PDF parser (F-15) |
| "HMAC CNIC lookup" required by prompt | **Absent** — raw CNIC stored and queried plaintext (F-4) |

---

## 3. Security findings

Severity: **S1** = exploitable now, data/credential disclosure · **S2** = privilege
escalation or abuse · **S3** = hardening.

### F-1 · S1 · Embeddings are word-hash vectors, not semantic (AI integrity)
`lib/ai/embeddings.ts:26-58`. `generateLocalFallbackEmbedding()` SHA-256s each token,
places it in one of 1536 buckets, and returns it. `generateEmbeddings()` calls it
unconditionally — the configured `embeddingModel: "text-embedding-004"` is never used.
*Why it matters:* retrieval has no semantic recall; paraphrases return nothing; and
`normalize()` strips every non-ASCII char, so **Urdu input produces a zero vector**.
Measured: `'کرایہ دار کیخلاف بے دخلی کا کیس'` → **0 tokens**. The product's core claim
is false.
*Status:* **fixed in Phase C.**

### F-2 · S1 · SMTP/IMAP passwords readable by anonymous users
`supabase/schema.sql:1084` `create policy "platform_settings_read" … using (true)`
plus `:1309` `grant select on public.platform_settings to anon, authenticated`.
`:1798` and `:1805` seed `smtp_pass` and `imap_pass` into that same table, and
`app/admin/settings/page.tsx:64-70` writes live secrets there.
*Why it matters:* `NEXT_PUBLIC_SUPABASE_ANON_KEY` is public by design. Anyone can
`GET /rest/v1/platform_settings?select=key,value` and read the mail credentials, then
impersonate `notifications@legalease.pk`.
*Status:* **fixed in Phase B** (secrets moved behind a `security definer` accessor
that requires admin; anon loses SELECT).

### F-3 · S1 · Lawyers can self-verify (RLS missing `WITH CHECK`)
`supabase/schema.sql:1051-1053`:
```sql
create policy "lawyer_profiles_update" on public.lawyer_profiles
  for update using (id = auth.uid() or public.is_admin());
```
No `WITH CHECK`. In PostgreSQL an UPDATE policy without `WITH CHECK` falls back to the
`USING` expression, so a lawyer passes `USING` (their own row) and may then write **any**
column value. `verification_status` and `is_published` are plain columns, and the
"lawyers can't self-verify" comment at `:204` refers only to the *sync trigger*, which
does not block direct writes.
*Attack:* `PATCH /rest/v1/lawyer_profiles?id=eq.<self>` body
`{"verification_status":"verified","is_published":true}` → appears in the public
directory and in AI lawyer recommendations.
*Status:* **fixed in Phase B** (column-level guard trigger + `WITH CHECK`).

### F-4 · S1 · Anonymous, unlimited CNIC enumeration
`app/actions/filer.ts:35-51` `lookupCnicStatusAction`:
* **no** `getAuthState()` call → callable with no account at all;
* **no** rate limit (the only limiter, `lib/rag/rate-limit.ts`, is wired to chat only);
* returns `status` for any 13-digit CNIC against the live ATL.
*Why it matters:* CNIC is personally identifying. The ATL is a bulk dataset; walking
`42101-0000000-000` … `42101-9999999-9` discloses the taxpayer status of millions of
named citizens. `filer_records.cnic_normalized` is also stored and indexed in plaintext
(`schema.sql:707-712`), so a single DB read is a full PII dump.
*Status:* **fixed in Phase B** (auth required + per-user/global rate limit +
keyed HMAC blind-index column + audit logging without raw CNIC).

### F-5 · S2 · IDOR on private documents
`app/api/documents/[...path]/route.ts`. Any authenticated user of **any** role supplies
an arbitrary storage path; the handler signs it with the **service-role** client across
`verifications`, `documents`, `legal-documents`, and redirects. There is no ownership or
role check. A citizen can read another lawyer's Bar Council card and CNIC scans
(`verifications/` bucket is `public: false` — this route is the only thing protecting it).
*Status:* **fixed in Phase B** (path ownership mapping + role check).

### F-6 · S3 · Urdu/Roman-Urdu not handled anywhere in the AI path
`lib/rag/classifier.ts` matches English keywords only; `lib/rag/prompts.ts` says
"respond in English" implicitly via an English-only schema; there is no language
detection. A Roman-Urdu question ("kirayadar makan khali nahi kar raha") matches nothing.
*Status:* **fixed in Phase C.**

### F-7 · S3 · Admin bulk ingest marks documents `verified` with no review step
`app/actions/auto-bulk-ingest.ts:200` sets `verification_status: "verified"`,
`requires_review: false` at insert time, and the comment at `:40` states this
intentionally ("so it's immediately active in RAG").

**Correction to an earlier draft of this audit:** this is **not** a privilege
escalation. `autoBulkIngestAction` calls `requireAdmin()` at `:49`, and the
ordinary upload path (`knowledge-base.ts:463`) correctly uses
`requiresReview ? "needs_review" : "pending"`. `verifyDocument()` is admin-guarded
too. So no unauthorized actor can reach this.

The residual problem is procedural: a single admin click pushes unreviewed
statutes straight into the citable corpus, and `match_legal_chunks` only serves
`verification_status = 'verified'`. The prompt's requirement is that authorized
review precede verification. `verified_by` is also never recorded.
*Why it matters:* a mis-uploaded or superseded statute becomes citable AI
authority instantly, with no audit trail of who approved it.
*Status:* **fixed in Phase B** — auto-verify becomes an explicit opt-in
(`autoVerify` flag), `verified_by`/`verified_at` are recorded, and the default is
`needs_review`. The zero-config convenience is preserved; it just requires one
deliberate confirmation.

### F-8 · S2 · Forged notifications and agreements (RLS `with check (true)`)
`schema.sql:1143` `notifications_insert_system … with check (true)` and
`schema.sql:1105` `appointment_agreements_insert … with check (true)`. Any authenticated
user can insert a notification addressed to any `user_id` (phishing inside the app) or
attach an agreement to any appointment.
*Status:* **fixed in Phase B.**

---

## 4. Correctness bugs

### F-9 · Recommendation engine queries a non-existent column → always empty
`lib/lawyers/recommend-lawyers.ts:240` selects `total_reviews`.
`supabase/schema.sql:149` defines `review_count`. The trigger at `:388` maintains
`review_count`. PostgREST returns `42703`, the code does `if (error || …) return []`, so
**AI lawyer recommendations have never returned a result** and the failure is silent.
*Status:* **fixed in Phase D.**

### F-10 · Unrated lawyers get a perfect 5.0 rating
`recommend-lawyers.ts:300` `rating: Number((item.rating || 5.0).toFixed(1))`. A new
lawyer with 0 reviews displays 5.0 stars. (The composite *score* correctly uses a
Bayesian prior, but the displayed value does not.)
*Status:* **fixed in Phase D.**

### F-11 · Silent city assumption `"Karachi"`
`recommend-lawyers.ts:266` `intent.jurisdiction?.city || "Karachi"` — every user with no
stated city is scored as if in Karachi. Also `city: item.city || "Karachi"` fabricates a
lawyer's city.
*Status:* **fixed in Phase D.**

### F-12 · Dead RPC `match_legal_chunks_debug`
`lib/rag/retrieval.ts:74` calls it when `debug: true`; it is defined nowhere in
`schema.sql`. The fallback catches it, so it is dead weight rather than a crash.
*Status:* **fixed in Phase C** (real debug RPC added in the migration).

### F-13 · `prefer-const` lint error + 142 warnings
`lib/rag/legal-rag.ts:228`. Warnings are almost all unused imports/vars.
*Status:* **fixed in Phase F.**

### F-14 · `.gitignore` ignores `*.sql`, which would silently drop migrations
`.gitignore:51`. `supabase/schema.sql` is tracked only because it predates the rule. Any
new migration file would be invisible to git. Must be narrowed before adding migrations.
*Status:* **fixed in Phase E.**

### F-15 · Citizen PDF "extraction" is a byte regex, not a parser
`app/api/citizen/files/route.ts:7-46` scans the raw PDF for `BT … ET` and paren strings.
It fails on compressed streams (the default for every real PDF produced by Word/Chrome),
and it is served to the model as if it were the document. The correct helper
(`extractPdfFromBuffer`, pdfjs) already exists at `lib/rag/pdf.ts` and is unused here.
*Status:* **fixed in Phase D.**

### F-16 · Chat route leaks provider error text to the client
`app/api/legal/chat/route.ts:143` returns `` `The AI service returned an error: ${err.message}` ``,
which can contain upstream URLs/model names. Minor info leak.
*Status:* **fixed in Phase E.**

---

## 5. Database findings

| # | Finding | Severity |
| :-- | :-- | :-- |
| D-1 | No migration history; one 2 067-line `schema.sql`. Cannot tell what is applied. | S2 |
| D-2 | `filer_records.cnic_normalized` plaintext + btree index = full PII disclosure surface | S1 |
| D-3 | `platform_settings` mixes operational config and secrets in one anon-readable table | S1 |
| D-4 | `lawyer_profiles` UPDATE lacks `WITH CHECK` | S1 |
| D-5 | `notifications` / `appointment_agreements` INSERT `with check (true)` | S2 |
| D-6 | No `tsvector` column or GIN index on `legal_chunks.content` → no keyword/FTS arm for hybrid retrieval | S2 |
| D-7 | `legal_chunks` has no `embedding_model` column → cannot detect mixed-vendor vectors | S2 |
| D-8 | `reviews_insert_citizen` correctly requires a `completed` appointment — **good, preserved** | — |
| D-9 | `conversation_belongs_to_user` is `security definer` + `stable` — **good, preserved** | — |
| D-10 | Storage: no policy for the `documents` bucket at all; `/api/documents` compensates with service role (F-5) | S2 |

---

## 6. AI/RAG findings — summary

1. No semantic embeddings (F-1). Everything downstream is affected.
2. Retrieval is vector-only, single arm, `category` hard-coded to `null`
   (`legal-rag.ts:232`) so the classifier is computed and then **discarded**.
3. Context is `chunks.slice(0, maxContextChunks)` after `dedupeChunks` — no reranking.
4. Prompt is English-only, tells the model it "may ground explanations in Pakistani legal
   principles" (`prompts.ts:28`) which invites un-retrieved legal claims.
5. `insufficient_context` is decided by the LLM alone; if the model is confident and
   wrong, there is no second guard.
6. Citation `page` is accepted from the LLM (`citations.ts:66`) although the DB knows the
   real page — a fabrication channel.

Guarantee that **does** hold today and must be preserved: citations must reference a
retrieved document, and section/article numbers must appear in a retrieved chunk of that
document.

---

## 7. Recommended approach

Phases, in order, because B unblocks everything else and C is the product thesis:

* **B — Critical fixes**: RLS/privilege escalation, secret exposure, CNIC privacy,
  document IDOR, verification workflow.
* **C — AI correctness**: real multilingual embeddings with model metadata + mismatch
  detection; hybrid retrieval (vector + FTS, RRF) with metadata filters and reranking;
  language detection; hardened citations; grounded, multilingual prompt.
* **D — Product correctness**: recommendation engine repair, document analysis via real
  PDF parsing + magic-byte validation.
* **E — Ops**: migration folder, env validation, error hygiene, `.gitignore`.
* **F — Verification**: unit tests, typecheck, lint, build.

### Environment blockers (cannot be executed here)
`GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` are **all unset** in this sandbox, and no Postgres is
reachable. Therefore: live embedding calls, live SQL DDL, RLS execution, and end-to-end
RAG scoring **cannot** be run here. Everything testable without them (chunking, citation
validation, ranking maths, language detection, schema validation, input guards) **is**
tested and the results are reported in `TESTING.md`. No result in this repo is fabricated.

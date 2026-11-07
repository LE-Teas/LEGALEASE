/**
 * Unit tests for security/AI logic that can be verified WITHOUT credentials.
 *
 * Run: npm test
 *
 * These deliberately avoid anything requiring a network call or a database, so
 * they are meaningful in CI and in this sandbox (no keys are configured here).
 * Live-provider behaviour is covered by scripts/check-embeddings.ts, which
 * requires GEMINI_API_KEY.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeCnicDigits,
  formatCnicForDisplay,
  maskCnic,
  hashCnicDigits,
  hashCnic,
  isCnicLookupConfigured,
  CnicConfigError,
} from "../lib/privacy/cnic";

import {
  normalizeForEmbedding,
  l2Normalize,
  cosineSimilarity,
  EMBEDDING_DIMENSIONS,
  EmbeddingError,
} from "../lib/ai/embeddings";

import { rateLimit, __resetRateLimitsForTests } from "../lib/security/rate-limit";

import { chunkLegalText } from "../lib/rag/chunking";
import { buildCitationLookup, validateCitations } from "../lib/rag/citations";
import type { RetrievedChunk } from "../lib/rag/retrieval";

// ---------------------------------------------------------------------------
// CNIC privacy (audit F-4)
// ---------------------------------------------------------------------------

test("CNIC: normalises every common input form to 13 digits", () => {
  const expected = "4210112345671";
  assert.equal(normalizeCnicDigits("42101-1234567-1"), expected);
  assert.equal(normalizeCnicDigits("42101 1234567 1"), expected);
  assert.equal(normalizeCnicDigits("4210112345671"), expected);
  assert.equal(normalizeCnicDigits(4210112345671), expected);
});

test("CNIC: rejects anything that is not exactly 13 digits", () => {
  for (const bad of ["", "123", "42101-1234567-12", "abcdefghijklm", null, undefined]) {
    assert.equal(normalizeCnicDigits(bad as string | null), null, `expected null for ${String(bad)}`);
  }
});

test("CNIC: display formatting and masking never reveal the middle digits", () => {
  assert.equal(formatCnicForDisplay("4210112345671"), "42101-1234567-1");
  const masked = maskCnic("4210112345671");
  assert.equal(masked, "42101-*******-1");
  assert.ok(!masked.includes("1234567"), "middle digits must not survive masking");
});

test("CNIC: blind index is deterministic when a key is set", () => {
  const original = process.env.CNIC_HMAC_KEY;
  process.env.CNIC_HMAC_KEY = "a".repeat(32);
  try {
    assert.equal(isCnicLookupConfigured(), true);
    const a = hashCnicDigits("4210112345671");
    const b = hashCnic("42101-1234567-1"); // same CNIC, different formatting
    assert.equal(a, b, "formatting must not change the blind index");
    assert.equal(a.length, 64, "HMAC-SHA256 hex digest is 64 chars");
  } finally {
    if (original === undefined) delete process.env.CNIC_HMAC_KEY;
    else process.env.CNIC_HMAC_KEY = original;
  }
});

test("CNIC: different CNICs produce different blind indexes (no collisions here)", () => {
  const original = process.env.CNIC_HMAC_KEY;
  process.env.CNIC_HMAC_KEY = "b".repeat(32);
  try {
    assert.notEqual(hashCnicDigits("4210112345671"), hashCnicDigits("4210112345672"));
  } finally {
    if (original === undefined) delete process.env.CNIC_HMAC_KEY;
    else process.env.CNIC_HMAC_KEY = original;
  }
});

test("CNIC: fails closed (throws) when the key is missing or weak", () => {
  const original = process.env.CNIC_HMAC_KEY;
  delete process.env.CNIC_HMAC_KEY;
  try {
    assert.equal(isCnicLookupConfigured(), false);
    assert.throws(() => hashCnicDigits("4210112345671"), CnicConfigError);
    process.env.CNIC_HMAC_KEY = "short";
    assert.throws(() => hashCnicDigits("4210112345671"), CnicConfigError);
  } finally {
    if (original === undefined) delete process.env.CNIC_HMAC_KEY;
    else process.env.CNIC_HMAC_KEY = original;
  }
});

// ---------------------------------------------------------------------------
// Embeddings (audit F-1)
// ---------------------------------------------------------------------------

test("embeddings: Urdu/Arabic text survives normalisation (regression for F-1)", () => {
  const urdu = "کرایہ دار کیخلاف بے دخلی کا کیس";
  const out = normalizeForEmbedding(urdu);
  assert.ok(out.length > 0, "Urdu text must not be stripped to nothing");
  assert.ok(out.includes("کرایہ"), "Urdu characters must be preserved");
});

test("embeddings: Roman Urdu and mixed scripts are preserved", () => {
  const out = normalizeForEmbedding("Kirayadar makan khali nahi kar raha کرایہ");
  assert.ok(out.includes("Kirayadar"));
  assert.ok(out.includes("کرایہ"));
});

test("embeddings: whitespace and control characters are collapsed", () => {
  assert.equal(normalizeForEmbedding("a \t\n  b\u0000c"), "a b c");
});

test("embeddings: L2 normalisation yields unit magnitude", () => {
  const v = l2Normalize([3, 4]);
  assert.ok(Math.abs(Math.hypot(v[0], v[1]) - 1) < 1e-12);
});

test("embeddings: a zero vector is rejected instead of silently stored", () => {
  assert.throws(() => l2Normalize([0, 0, 0]), EmbeddingError);
});

test("embeddings: cosine similarity behaves correctly", () => {
  assert.ok(Math.abs(cosineSimilarity([1, 0], [1, 0]) - 1) < 1e-12);
  assert.ok(Math.abs(cosineSimilarity([1, 0], [0, 1])) < 1e-12);
  assert.ok(Math.abs(cosineSimilarity([1, 0], [-1, 0]) + 1) < 1e-12);
});

test("embeddings: dimension mismatch is an explicit error, not a silent truncation", () => {
  assert.throws(() => cosineSimilarity([1, 2], [1, 2, 3]), EmbeddingError);
  assert.equal(EMBEDDING_DIMENSIONS, 1536, "must match legal_chunks.embedding vector(1536)");
});

// ---------------------------------------------------------------------------
// Rate limiting (audit F-4)
// ---------------------------------------------------------------------------

test("rate limit: allows up to the budget, then denies with a retry hint", () => {
  __resetRateLimitsForTests();
  const cfg = { max: 3, windowMs: 60_000 };
  assert.equal(rateLimit("t1", cfg).allowed, true);
  assert.equal(rateLimit("t1", cfg).allowed, true);
  assert.equal(rateLimit("t1", cfg).allowed, true);
  const denied = rateLimit("t1", cfg);
  assert.equal(denied.allowed, false);
  assert.ok(denied.retryAfterMs > 0);
});

test("rate limit: budgets are isolated per key", () => {
  __resetRateLimitsForTests();
  const cfg = { max: 1, windowMs: 60_000 };
  assert.equal(rateLimit("user-a", cfg).allowed, true);
  assert.equal(rateLimit("user-a", cfg).allowed, false);
  assert.equal(rateLimit("user-b", cfg).allowed, true, "b must not inherit a's usage");
});

// ---------------------------------------------------------------------------
// Chunking + citations — the legal-integrity guarantees
// ---------------------------------------------------------------------------

test("chunking preserves section number, heading and page", () => {
  const pages = [
    {
      page: 7,
      text: [
        "Section 378. Theft.",
        "Whoever intending to take dishonestly any movable property out of the",
        "possession of any person without that person's consent, moves that property.",
      ].join("\n"),
    },
  ];
  const chunks = chunkLegalText(pages);
  assert.ok(chunks.length >= 1);
  const first = chunks[0];
  assert.equal(first.sectionNumber, "378");
  assert.ok(first.text.length > 0);
  assert.equal(first.startPage, 7);
});

test("citations: a document that was never retrieved is rejected", () => {
  const chunks: RetrievedChunk[] = [
    {
      chunkId: "c1",
      documentId: "doc-1",
      documentTitle: "Pakistan Penal Code",
      content: "Section 378 defines theft.",
      sectionNumber: "378",
      articleNumber: null,
      sectionTitle: "Theft",
      pageNumber: 10,
      category: "criminal",
      jurisdictionLevel: "Federal",
      province: null,
      officialSourceUrl: "https://example.gov.pk/ppc",
      versionLabel: "1860",
      similarity: 0.82,
    },
  ];
  const lookup = buildCitationLookup(chunks);

  const result = validateCitations(
    [
      // valid: retrieved doc + retrieved section
      { document_id: "doc-1", title: "PPC", section: "378", article: null, page: 10 },
      // invalid: fabricated document
      { document_id: "doc-999", title: "Fake Act", section: "1", article: null, page: 1 },
      // invalid section on a real doc -> kept doc, dropped section
      { document_id: "doc-1", title: "PPC", section: "9999", article: null, page: 10 },
    ],
    lookup
  );

  assert.equal(result.length, 2, "fabricated document must be dropped entirely");
  assert.equal(result[0].section, "378");
  assert.equal(result[1].document_id, "doc-1");
  assert.equal(result[1].section, null, "unretrieved section must be nulled, not trusted");
});

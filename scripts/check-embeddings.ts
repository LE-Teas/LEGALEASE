/**
 * Live embedding sanity check (requires GEMINI_API_KEY).
 *
 *   npm run test:embed
 *
 * Verifies the properties that unit tests cannot: that the provider is
 * reachable, that dimensions match the database column, and — critically —
 * that Urdu and English representations of the SAME legal concept land close
 * together in vector space. That is the property audit finding F-1 showed was
 * impossible with the old hash-based "embeddings".
 *
 * Exits non-zero on failure so it can gate CI.
 */

import { loadEnv } from "@/scripts/lib/load-env";
import {
  embedText,
  isEmbeddingConfigured,
  cosineSimilarity,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL_ID,
} from "@/lib/ai/embeddings";

loadEnv();

async function main(): Promise<void> {
  if (!isEmbeddingConfigured()) {
    console.error("✗ GEMINI_API_KEY is not set — cannot run live embedding checks.");
    process.exit(1);
  }

  console.log(`Model: ${EMBEDDING_MODEL_ID}`);
  console.log(`Expected dimensions: ${EMBEDDING_DIMENSIONS}\n`);

  // 1. Dimension check against the pgvector column.
  const base = await embedText("Section 378 of the Pakistan Penal Code defines theft.");
  if (base.vector.length !== EMBEDDING_DIMENSIONS) {
    console.error(
      `✗ Dimension mismatch: got ${base.vector.length}, database expects ${EMBEDDING_DIMENSIONS}.`
    );
    process.exit(1);
  }
  console.log(`✓ Dimensions correct (${base.vector.length})`);

  // 2. Multilingual semantic check.
  //    These are the same legal concept expressed in three languages/scripts.
  const english = await embedText("My landlord is refusing to return my security deposit.");
  const urdu = await embedText("میرا مالک مکان سیکیورٹی ڈپازٹ واپس نہیں کر رہا");
  const roman = await embedText("Mera malik makan security deposit wapas nahi kar raha");

  const unrelated = await embedText("The weather in Murree is pleasant in summer.");

  const enUrdu = cosineSimilarity(english.vector, urdu.vector);
  const enRoman = cosineSimilarity(english.vector, roman.vector);
  const enUnrelated = cosineSimilarity(english.vector, unrelated.vector);

  console.log(`\nCross-lingual similarity (same legal concept):`);
  console.log(`  English ↔ Urdu        : ${enUrdu.toFixed(4)}`);
  console.log(`  English ↔ Roman Urdu  : ${enRoman.toFixed(4)}`);
  console.log(`  English ↔ unrelated   : ${enUnrelated.toFixed(4)}`);

  let failed = false;
  if (enUrdu <= enUnrelated) {
    console.error("✗ Urdu is NOT closer to the English concept than an unrelated sentence.");
    failed = true;
  }
  if (enRoman <= enUnrelated) {
    console.error("✗ Roman Urdu is NOT closer to the English concept than an unrelated sentence.");
    failed = true;
  }
  if (!failed) console.log("\n✓ Multilingual semantic retrieval is working.");

  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error("✗ Embedding check crashed:", err instanceof Error ? err.message : err);
  process.exit(1);
});

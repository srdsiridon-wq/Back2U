import type { MatchSubject } from "./types";

/**
 * Optional semantic similarity layer.
 *
 * Embeddings are generated through the Lovable AI gateway and cached per item
 * (keyed by a hash of the source text) so they are only regenerated when the
 * item text actually changes. Every failure path returns null so the
 * deterministic engine keeps working on its own.
 */

const MODEL = "google/gemini-embedding-001";
const TIMEOUT_MS = 6000;

export function subjectText(subject: MatchSubject): string {
  return [subject.title, subject.description, subject.category, subject.color]
    .filter(Boolean)
    .join(" ")
    .trim();
}

/** Small, stable, non-cryptographic hash — enough to detect text changes. */
export function textHash(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 16777619) >>> 0;
    h2 = Math.imul(h2 + code, 2246822519) >>> 0;
  }
  return `${h1.toString(36)}${h2.toString(36)}`;
}

async function embed(texts: string[]): Promise<number[][] | null> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey || !texts.length) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, input: texts }),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.warn("[back2u] embeddings unavailable", response.status);
      return null;
    }
    const payload = (await response.json()) as {
      data?: { embedding?: number[] }[];
    };
    const vectors = (payload.data ?? []).map((entry) => entry.embedding ?? []);
    return vectors.length === texts.length && vectors.every((v) => v.length) ? vectors : null;
  } catch (error) {
    console.warn("[back2u] embedding request failed", error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function cosine(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < length; i += 1) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  if (!na || !nb) return 0;
  // Map cosine [-1,1] to [0,1] and clamp.
  return Math.max(0, Math.min(1, dot / Math.sqrt(na * nb)));
}

/**
 * Returns a 0–1 semantic similarity per candidate, or null when the semantic
 * layer is unavailable (missing key, timeout, rate limit, provider error).
 */
export async function semanticSimilarities(
  source: MatchSubject,
  candidates: MatchSubject[],
): Promise<(number | null)[] | null> {
  if (!candidates.length) return null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const subjects = [source, ...candidates];
    const wanted = new Map(subjects.map((s) => [s.id, { text: subjectText(s), hash: "" }]));
    for (const [, value] of wanted) value.hash = textHash(value.text);

    const { data: cached } = await supabaseAdmin
      .from("item_embeddings")
      .select("item_id, source_hash, embedding")
      .in("item_id", [...wanted.keys()]);

    const vectors = new Map<string, number[]>();
    for (const row of cached ?? []) {
      const want = wanted.get(row.item_id);
      if (want && want.hash === row.source_hash && Array.isArray(row.embedding)) {
        vectors.set(row.item_id, row.embedding as number[]);
      }
    }

    const missing = subjects.filter((s) => !vectors.has(s.id));
    if (missing.length) {
      const fresh = await embed(missing.map((s) => wanted.get(s.id)!.text));
      if (!fresh) return null;
      missing.forEach((subject, index) => vectors.set(subject.id, fresh[index]!));
      await supabaseAdmin.from("item_embeddings").upsert(
        missing.map((subject, index) => ({
          item_id: subject.id,
          source_hash: wanted.get(subject.id)!.hash,
          model: MODEL,
          embedding: fresh[index] as unknown as never,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "item_id" },
      );
    }

    const sourceVector = vectors.get(source.id);
    if (!sourceVector) return null;
    return candidates.map((candidate) => {
      const vector = vectors.get(candidate.id);
      return vector ? cosine(sourceVector, vector) : null;
    });
  } catch (error) {
    console.warn("[back2u] semantic layer skipped", error);
    return null;
  }
}

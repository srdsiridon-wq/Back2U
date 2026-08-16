import type { ItemRow } from "../items.server";
import { scorePair } from "./deterministic";
import { semanticSimilarities } from "./semantic.server";
import type { MatchOutcome, MatchSubject } from "./types";

/**
 * Matching service.
 *
 * Callers hand over a source item and a candidate set; the engine decides
 * which providers to combine. Frontends request results from here — they
 * never compute the authoritative score themselves.
 */

export function toSubject(row: ItemRow): MatchSubject {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    color: row.color,
    building: row.building_code,
    floor: row.floor,
    room: row.room,
    occurredAt: row.occurred_at,
  };
}

export interface RankedMatch {
  row: ItemRow;
  outcome: MatchOutcome;
}

export interface RankOptions {
  /** Skip the semantic provider entirely (used by fast paths). */
  semantic?: boolean;
  minScore?: number;
  limit?: number;
}

export async function rankCandidates(
  source: ItemRow,
  candidates: ItemRow[],
  options: RankOptions = {},
): Promise<RankedMatch[]> {
  const { semantic = true, minScore = 55, limit = 10 } = options;
  if (!candidates.length) return [];

  const sourceSubject = toSubject(source);
  const subjects = candidates.map(toSubject);

  // Cheap deterministic pass first, so the semantic provider only ever sees a
  // short list instead of the whole school's catalogue.
  const prelim = subjects
    .map((subject, index) => ({ index, outcome: scorePair(sourceSubject, subject) }))
    .sort((a, b) => b.outcome.score - a.outcome.score)
    .slice(0, Math.max(limit * 3, 15));

  let similarities: (number | null)[] | null = null;
  if (semantic) {
    similarities = await semanticSimilarities(
      sourceSubject,
      prelim.map((entry) => subjects[entry.index]!),
    );
  }

  return prelim
    .map((entry, position) => ({
      row: candidates[entry.index]!,
      outcome: similarities
        ? scorePair(sourceSubject, subjects[entry.index]!, {
            semantic: similarities[position] ?? null,
          })
        : entry.outcome,
    }))
    .filter((entry) => entry.outcome.score >= minScore)
    .sort((a, b) => b.outcome.score - a.outcome.score)
    .slice(0, limit);
}

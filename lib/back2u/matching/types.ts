/**
 * Shared contract for every Back2U matching provider.
 *
 * A match is a *recommendation*: it never proves ownership. Ownership is
 * decided by the claim → verification → moderator → return workflow.
 */

export type MatchConfidence = "LOW" | "POSSIBLE" | "STRONG";

export interface MatchSignal {
  /** Stable key so the UI can style/i18n a signal without parsing text. */
  key: "category" | "color" | "description" | "location" | "time" | "semantic" | "image";
  /** Human-readable Thai label shown to students. */
  label: string;
  hit: boolean;
  /** 0–1 contribution before weighting. */
  score: number;
  /** Share of the final score this signal can contribute. */
  weight: number;
}

export interface MatchOutcome {
  /** Normalised 0–100 recommendation score. */
  score: number;
  confidence: MatchConfidence;
  /** One-sentence plain-language summary. */
  explanation: string;
  signals: MatchSignal[];
  /** Which engine produced the score, e.g. "rule-v1" or "rule-v1+semantic". */
  engine: string;
}

/** Normalised view of an item that any provider can score. */
export interface MatchSubject {
  id: string;
  title: string;
  description: string;
  category: string;
  color: string;
  building: string | null;
  floor: string | null;
  room: string | null;
  occurredAt: string;
  imageUrls?: string[];
}

export interface MatchProvider {
  name: string;
  /** Returns an extra 0–1 similarity signal, or null when unavailable. */
  similarity(
    source: MatchSubject,
    candidates: MatchSubject[],
  ): Promise<(number | null)[] | null>;
}

export function confidenceOf(score: number): MatchConfidence {
  if (score >= 80) return "STRONG";
  if (score >= 55) return "POSSIBLE";
  return "LOW";
}

export const CONFIDENCE_LABEL: Record<MatchConfidence, string> = {
  STRONG: "น่าจะใช่มาก",
  POSSIBLE: "อาจจะใช่",
  LOW: "ใกล้เคียงเล็กน้อย",
};

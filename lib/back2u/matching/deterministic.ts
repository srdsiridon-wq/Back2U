import { buildingName } from "../data";
import { categoryTh, colorTh } from "../i18n";
import { normalize } from "../match";
import type { Category, ItemColor } from "../types";
import { confidenceOf, type MatchOutcome, type MatchSignal, type MatchSubject } from "./types";

/**
 * Rule-based matching engine (v1).
 *
 * Deterministic and explainable: the same two items always produce the same
 * score, and every point is attributable to a visible signal. This is the
 * fallback path whenever the semantic provider is unavailable.
 */

export const WEIGHTS = {
  category: 0.25,
  color: 0.2,
  description: 0.3,
  location: 0.15,
  time: 0.1,
} as const;

function bigrams(text: string): Set<string> {
  const clean = normalize(text);
  const grams = new Set<string>();
  if (clean.length < 2) {
    if (clean) grams.add(clean);
    return grams;
  }
  for (let i = 0; i < clean.length - 1; i += 1) grams.add(clean.slice(i, i + 2));
  return grams;
}

/** Symmetric character-bigram similarity (Thai has no word spaces). */
export function textSimilarity(a: string, b: string): number {
  const ga = bigrams(a);
  const gb = bigrams(b);
  if (!ga.size || !gb.size) return 0;
  let shared = 0;
  for (const gram of ga) if (gb.has(gram)) shared += 1;
  return (2 * shared) / (ga.size + gb.size);
}

function daysApart(a: string, b: string): number {
  const diff = Math.abs(new Date(a).getTime() - new Date(b).getTime());
  return Number.isFinite(diff) ? diff / 86_400_000 : 30;
}

export interface DeterministicOptions {
  /** Optional 0–1 semantic similarity blended into the description signal. */
  semantic?: number | null;
}

export function scorePair(
  source: MatchSubject,
  candidate: MatchSubject,
  options: DeterministicOptions = {},
): MatchOutcome {
  const categoryScore = source.category === candidate.category ? 1 : 0;
  const colorScore = source.color === candidate.color ? 1 : 0;

  const lexical = textSimilarity(
    `${source.title} ${source.description}`,
    `${candidate.title} ${candidate.description}`,
  );
  const semantic = options.semantic ?? null;
  const descriptionScore =
    semantic === null ? lexical : Math.max(lexical, 0.4 * lexical + 0.6 * semantic);

  let locationScore = 0.3;
  if (source.building && candidate.building) {
    if (source.building === candidate.building) {
      locationScore = 1;
      if (source.floor && candidate.floor && source.floor !== candidate.floor) locationScore = 0.8;
    } else {
      locationScore = 0.1;
    }
  }

  const gap = daysApart(source.occurredAt, candidate.occurredAt);
  const timeScore = Math.max(0, 1 - gap / 14);

  const signals: MatchSignal[] = [
    {
      key: "category",
      label: categoryScore
        ? `ประเภทของตรงกัน — ${categoryTh(candidate.category as Category)}`
        : `คนละประเภท — ชิ้นนี้คือ${categoryTh(candidate.category as Category)}`,
      hit: categoryScore === 1,
      score: categoryScore,
      weight: WEIGHTS.category,
    },
    {
      key: "color",
      label: colorScore
        ? `สีตรงกัน — ${colorTh(candidate.color as ItemColor)}`
        : `สีไม่ตรงกัน — ชิ้นนี้เป็น${colorTh(candidate.color as ItemColor)}`,
      hit: colorScore === 1,
      score: colorScore,
      weight: WEIGHTS.color,
    },
    {
      key: "description",
      label:
        descriptionScore >= 0.45
          ? "รายละเอียดใกล้เคียงกัน"
          : "รายละเอียดตรงกันบางส่วน",
      hit: descriptionScore >= 0.45,
      score: descriptionScore,
      weight: WEIGHTS.description,
    },
    {
      key: "location",
      label:
        locationScore >= 0.8
          ? `อาคารเดียวกัน — ${buildingName((candidate.building ?? "main") as never)}`
          : candidate.building
            ? `คนละอาคาร — พบที่${buildingName(candidate.building as never)}`
            : "ไม่ได้ระบุสถานที่",
      hit: locationScore >= 0.8,
      score: locationScore,
      weight: WEIGHTS.location,
    },
    {
      key: "time",
      label:
        timeScore >= 0.5
          ? "ช่วงเวลาใกล้เคียงกัน"
          : `ห่างกันประมาณ ${Math.round(gap)} วัน`,
      hit: timeScore >= 0.5,
      score: timeScore,
      weight: WEIGHTS.time,
    },
  ];

  if (semantic !== null) {
    signals.push({
      key: "semantic",
      label: semantic >= 0.6 ? "คำบรรยายสื่อความหมายคล้ายกัน" : "ความหมายต่างกันพอสมควร",
      hit: semantic >= 0.6,
      score: semantic,
      weight: 0,
    });
  }

  const raw = signals.reduce((total, signal) => total + signal.score * signal.weight, 0);
  const score = Math.round(Math.min(1, raw) * 100);
  const hits = signals.filter((signal) => signal.hit && signal.weight > 0).length;

  return {
    score,
    confidence: confidenceOf(score),
    explanation:
      hits >= 3
        ? "ตรงกันหลายอย่าง จึงน่าจะเป็นชิ้นเดียวกัน — แต่ยังต้องให้เจ้าหน้าที่ยืนยันก่อนรับคืน"
        : "ตรงกันบางส่วนเท่านั้น ลองดูรูปและรายละเอียดประกอบอีกครั้ง",
    signals,
    engine: semantic === null ? "rule-v1" : "rule-v1+semantic",
  };
}

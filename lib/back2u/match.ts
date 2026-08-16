import { BUILDINGS, buildingName } from "./data";
import { categoryTh, colorTh } from "./i18n";
import {
  CATEGORIES,
  COLORS,
  type BuildingId,
  type Category,
  type Item,
  type ItemColor,
} from "./types";

/**
 * Prototype match scoring (Thai).
 *
 * A simple, deterministic keyword-and-attribute comparison — NOT a trained
 * machine-learning model. Thai has no spaces, so description similarity uses
 * character bigram overlap instead of word tokens.
 */

export interface MatchReason {
  label: string;
  hit: boolean;
}

export interface MatchResult {
  score: number;
  reasons: MatchReason[];
}

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  Stationery: ["กระเป๋าดินสอ", "ดินสอ", "ปากกา", "ยางลบ", "ไม้บรรทัด", "เครื่องเขียน", "กบเหลา"],
  Electronics: [
    "หูฟัง", "โทรศัพท์", "มือถือ", "สายชาร์จ", "ที่ชาร์จ", "โน้ตบุ๊ก", "แล็ปท็อป",
    "เครื่องคิดเลข", "แท็บเล็ต", "พาวเวอร์แบงก์",
  ],
  Clothing: ["เสื้อ", "ฮู้ด", "แจ็คเก็ต", "เสื้อกันหนาว", "เนกไท", "ผ้าพันคอ", "หมวก", "ไหมพรม"],
  Bags: ["กระเป๋าเป้", "เป้", "กระเป๋าสะพาย", "กระเป๋านักเรียน", "ถุงผ้า"],
  Bottles: ["ขวดน้ำ", "ขวด", "กระติก", "แก้วน้ำ"],
  "Keys & Cards": ["กุญแจ", "บัตร", "บัตรนักเรียน", "สายคล้อง", "กระเป๋าสตางค์", "พวงกุญแจ"],
  Books: ["หนังสือ", "สมุด", "แฟ้ม", "ตำรา", "ไดอารี่", "โน้ต"],
  Sports: ["ลูกบอล", "ไม้แบด", "รองเท้ากีฬา", "ชุดกีฬา", "รองเท้าผ้าใบ", "อุปกรณ์กีฬา"],
  Other: ["ร่ม", "แว่นตา", "แว่น", "นาฬิกา", "กล่องข้าว"],
};

const COLOR_KEYWORDS: Record<ItemColor, string[]> = {
  Blue: ["น้ำเงิน", "ฟ้า", "กรมท่า"],
  Black: ["ดำ"],
  White: ["ขาว"],
  Grey: ["เทา"],
  Red: ["แดง"],
  Green: ["เขียว"],
  Yellow: ["เหลือง"],
  Pink: ["ชมพู"],
  Purple: ["ม่วง"],
  Orange: ["ส้ม"],
  Silver: ["เงิน", "สเตนเลส"],
  Multicolour: ["หลากสี", "หลายสี"],
};

/** Normalises spacing/punctuation so substring checks behave predictably. */
export function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

export function detectColor(query: string): ItemColor | null {
  const text = normalize(query);
  for (const color of COLORS) {
    if (COLOR_KEYWORDS[color].some((word) => text.includes(normalize(word)))) return color;
  }
  return null;
}

export function detectCategory(query: string): Category | null {
  const text = normalize(query);
  let best: { category: Category; length: number } | null = null;
  for (const category of CATEGORIES) {
    for (const keyword of CATEGORY_KEYWORDS[category]) {
      const needle = normalize(keyword);
      if (text.includes(needle) && (!best || needle.length > best.length)) {
        best = { category, length: needle.length };
      }
    }
  }
  return best?.category ?? null;
}

export function detectBuilding(query: string): BuildingId | null {
  const text = normalize(query);
  const match = BUILDINGS.find((building) => text.includes(normalize(building.name)));
  return match?.id ?? null;
}

export interface ParsedQuery {
  category: Category | null;
  color: ItemColor | null;
  building: BuildingId | null;
  /** Remaining descriptive text, e.g. "สติกเกอร์แมว". */
  details: string[];
}

/** Pulls readable attributes out of a plain-language Thai search. */
export function parseQuery(query: string): ParsedQuery {
  const category = detectCategory(query);
  const color = detectColor(query);
  const building = detectBuilding(query);

  let rest = query;
  const strip = (word: string) => {
    const index = rest.toLowerCase().indexOf(word.toLowerCase());
    if (index >= 0) rest = rest.slice(0, index) + " " + rest.slice(index + word.length);
  };

  if (category) CATEGORY_KEYWORDS[category].forEach(strip);
  if (color) COLOR_KEYWORDS[color].forEach(strip);
  if (building) strip(buildingName(building));
  ["สี", "มี", "ที่", "ของ", "ครับ", "ค่ะ", "หาย", "เจอ", "แบบ", "และ"].forEach(strip);

  const details = rest
    .split(/[\s,.]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 1);

  return { category, color, building, details };
}

function bigrams(text: string): string[] {
  const clean = normalize(text);
  if (clean.length < 2) return clean ? [clean] : [];
  const grams: string[] = [];
  for (let i = 0; i < clean.length - 1; i += 1) grams.push(clean.slice(i, i + 2));
  return grams;
}

/** Share of the query's character bigrams that also appear in the item text. */
function bigramOverlap(query: string, itemText: string): number {
  const queryGrams = bigrams(query);
  if (!queryGrams.length) return 0;
  const itemGrams = new Set(bigrams(itemText));
  const hits = queryGrams.filter((gram) => itemGrams.has(gram)).length;
  return hits / queryGrams.length;
}

const WEIGHTS = { category: 0.25, color: 0.2, description: 0.35, location: 0.2 };
/** When the student does not say where, location can only be a partial signal. */
const UNKNOWN_LOCATION_CONFIDENCE = 0.6;

export function scoreItem(query: string, item: Item): MatchResult {
  const parsed = parseQuery(query);
  const { category: queryCategory, color: queryColor, building: queryBuilding } = parsed;

  const itemText = `${item.name} ${item.description} ${categoryTh(item.category)} ${colorTh(item.color)}`;

  const baseOverlap = bigramOverlap(query, itemText);
  const detailHit = parsed.details.some(
    (detail) => detail.length > 2 && normalize(itemText).includes(normalize(detail)),
  );
  const overlap = Math.min(1, detailHit ? baseOverlap + 0.15 : baseOverlap);

  const categoryScore = queryCategory ? (queryCategory === item.category ? 1 : 0) : overlap;
  const colorScore = queryColor ? (queryColor === item.color ? 1 : 0) : overlap;
  const locationScore = queryBuilding
    ? queryBuilding === item.location.building
      ? 1
      : 0.2
    : UNKNOWN_LOCATION_CONFIDENCE;

  const raw =
    categoryScore * WEIGHTS.category +
    colorScore * WEIGHTS.color +
    overlap * WEIGHTS.description +
    locationScore * WEIGHTS.location;

  const categoryHit = categoryScore >= 0.6;
  const colorHit = colorScore >= 0.6;
  const buildingHit = queryBuilding ? locationScore === 1 : false;

  const reasons: MatchReason[] = [
    {
      label: categoryHit
        ? `ประเภทของตรงกัน — ${categoryTh(item.category)}`
        : queryCategory
          ? "ประเภทของไม่ตรงกัน"
          : "คุณไม่ได้ระบุประเภทของ",
      hit: categoryHit,
    },
    {
      label: colorHit
        ? `สีตรงกัน — ${colorTh(item.color)}`
        : queryColor
          ? `สีไม่ตรงกัน — ชิ้นนี้เป็น${colorTh(item.color)}`
          : "คุณไม่ได้ระบุสี",
      hit: colorHit,
    },
    {
      label: overlap >= 0.5 ? "รายละเอียดใกล้เคียงกัน" : "รายละเอียดตรงกันบางส่วน",
      hit: overlap >= 0.5,
    },
    {
      label: buildingHit
        ? `อาคารเดียวกัน — ${buildingName(item.location.building)}`
        : queryBuilding
          ? `คนละอาคาร — พบที่${buildingName(item.location.building)}`
          : "คุณไม่ได้ระบุสถานที่",
      hit: buildingHit,
    },
  ];

  return { score: Math.round(raw * 100), reasons };
}

export const MATCH_THRESHOLD = 45;
export const STRONG_MATCH_THRESHOLD = 80;

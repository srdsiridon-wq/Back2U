import type { Category, ItemColor, ItemStatus } from "./types";

/** Thai display labels. Data keys stay in English so types stay stable. */

export const CATEGORY_TH: Record<Category, string> = {
  Stationery: "เครื่องเขียน",
  Electronics: "อุปกรณ์อิเล็กทรอนิกส์",
  Clothing: "เสื้อผ้า",
  Bags: "กระเป๋า",
  Bottles: "ขวดน้ำ",
  "Keys & Cards": "กุญแจ / บัตร",
  Books: "หนังสือ",
  Sports: "อุปกรณ์กีฬา",
  Other: "อื่น ๆ",
};

export const COLOR_TH: Record<ItemColor, string> = {
  Blue: "สีน้ำเงิน",
  Black: "สีดำ",
  White: "สีขาว",
  Grey: "สีเทา",
  Red: "สีแดง",
  Green: "สีเขียว",
  Yellow: "สีเหลือง",
  Pink: "สีชมพู",
  Purple: "สีม่วง",
  Orange: "สีส้ม",
  Silver: "สีเงิน",
  Multicolour: "หลากสี",
};

export const STATUS_TH: Record<ItemStatus, string> = {
  found: "เจอแล้ว",
  lost: "ของหาย",
};

export function categoryTh(category: Category): string {
  return CATEGORY_TH[category] ?? category;
}

export function colorTh(color: ItemColor): string {
  return COLOR_TH[color] ?? color;
}

export function statusTh(status: ItemStatus): string {
  return STATUS_TH[status] ?? status;
}

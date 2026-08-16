export type ItemStatus = "found" | "lost";

export const CATEGORIES = [
  "Stationery",
  "Electronics",
  "Clothing",
  "Bags",
  "Bottles",
  "Keys & Cards",
  "Books",
  "Sports",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const COLORS = [
  "Blue",
  "Black",
  "White",
  "Grey",
  "Red",
  "Green",
  "Yellow",
  "Pink",
  "Purple",
  "Orange",
  "Silver",
  "Multicolour",
] as const;

export type ItemColor = (typeof COLORS)[number];

export type BuildingId =
  | "science"
  | "main"
  | "library"
  | "gym"
  | "cafeteria"
  | "arts"
  | "field";

export interface Building {
  id: BuildingId;
  name: string;
  /** Percentage coordinates on the prototype campus map. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ItemLocation {
  building: BuildingId;
  floor?: string;
  room?: string;
}

/** Lifecycle of the physical item, distinct from lost/found kind. */
export type ItemLifecycle = "open" | "matched" | "claimed" | "returned" | "archived";

export interface Item {
  id: string;
  name: string;
  description: string;
  category: Category;
  color: ItemColor;
  status: ItemStatus;
  location: ItemLocation;
  /** ISO date-time string. */
  date: string;
  /** Primary image (signed URL or bundled fallback). */
  image: string;
  /** All images for the item; always contains at least the primary one. */
  images?: string[];
  lifecycle?: ItemLifecycle;
  handoverPoint?: string;
  reportedBy?: string;
}


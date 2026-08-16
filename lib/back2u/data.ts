import pencilCaseImg from "@/assets/items/pencil-case.jpg";
import waterBottleImg from "@/assets/items/water-bottle.jpg";
import backpackImg from "@/assets/items/backpack.jpg";
import earbudsImg from "@/assets/items/earbuds.jpg";
import hoodieImg from "@/assets/items/hoodie.jpg";
import keysImg from "@/assets/items/keys.jpg";
import stationeryImg from "@/assets/items/stationery.jpg";
import miscImg from "@/assets/items/misc.jpg";

import type { Building, BuildingId, Item } from "./types";

export const IMAGES = {
  pencilCase: pencilCaseImg,
  waterBottle: waterBottleImg,
  backpack: backpackImg,
  earbuds: earbudsImg,
  hoodie: hoodieImg,
  keys: keysImg,
  stationery: stationeryImg,
  misc: miscImg,
};

export const BUILDINGS: Building[] = [
  { id: "main", name: "อาคารเรียนรวม", x: 6, y: 6, w: 40, h: 24 },
  { id: "science", name: "อาคารวิทยาศาสตร์", x: 54, y: 6, w: 40, h: 24 },
  { id: "library", name: "ห้องสมุด", x: 6, y: 38, w: 28, h: 24 },
  { id: "cafeteria", name: "โรงอาหาร", x: 40, y: 38, w: 24, h: 24 },
  { id: "arts", name: "อาคารศิลปะและดนตรี", x: 70, y: 38, w: 24, h: 24 },
  { id: "gym", name: "โรงยิม", x: 6, y: 70, w: 32, h: 24 },
  { id: "field", name: "สนามกีฬา", x: 44, y: 70, w: 50, h: 24 },
];

export function buildingName(id: BuildingId): string {
  return BUILDINGS.find((b) => b.id === id)?.name ?? "ในโรงเรียน";
}

export function locationLabel(location: {
  building: BuildingId;
  floor?: string;
  room?: string;
}): string {
  return [buildingName(location.building), location.floor, location.room]
    .filter(Boolean)
    .join(" • ");
}

const MONTHS_TH = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

/** Deterministic formatting so server and client render identical markup. */
export function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  const date = new Date(iso);
  const day = match ? Number(match[3]) : date.getDate();
  const monthIndex = match ? Number(match[2]) - 1 : date.getMonth();
  const hour = match ? match[4] : String(date.getHours()).padStart(2, "0");
  const minute = match ? match[5] : String(date.getMinutes()).padStart(2, "0");
  return `${day} ${MONTHS_TH[monthIndex] ?? ""} เวลา ${hour}:${minute} น.`;
}

export const DEMO_ITEMS: Item[] = [
  {
    id: "blue-pencil-case",
    name: "กระเป๋าดินสอสีน้ำเงิน",
    description: "กระเป๋าดินสอสีน้ำเงิน มีสติกเกอร์รูปแมวเล็ก ๆ ติดอยู่ ปิดด้วยซิป ข้างในมีปากกาไม่กี่ด้าม",
    category: "Stationery",
    color: "Blue",
    status: "found",
    location: { building: "science", floor: "ชั้น 2", room: "ห้อง 204" },
    date: "2026-08-14T15:20:00",
    image: IMAGES.pencilCase,
    handoverPoint: "เคาน์เตอร์อาคารวิทยาศาสตร์",
    reportedBy: "ครูอลิสา (เคมี)",
  },
  {
    id: "lost-pencil-case",
    name: "กระเป๋าดินสอ",
    description: "กระเป๋าดินสอสีน้ำเงินของหนู มีสติกเกอร์แมวติดด้านหน้า หายหลังเรียนเคมี",
    category: "Stationery",
    color: "Blue",
    status: "lost",
    location: { building: "science", floor: "ชั้น 2" },
    date: "2026-08-14T14:05:00",
    image: IMAGES.pencilCase,
    reportedBy: "มินา ม.4",
  },
  {
    id: "white-earbuds",
    name: "หูฟังไร้สาย",
    description: "หูฟังไร้สายสีขาว อยู่ในเคสชาร์จอันเล็ก ฝาเคสมีรอยขีดข่วน",
    category: "Electronics",
    color: "White",
    status: "found",
    location: { building: "library", floor: "ชั้น 1", room: "โซนอ่านเงียบ" },
    date: "2026-08-14T11:40:00",
    image: IMAGES.earbuds,
    handoverPoint: "เคาน์เตอร์ห้องสมุด",
  },
  {
    id: "steel-bottle",
    name: "ขวดน้ำสเตนเลส",
    description: "ขวดน้ำเก็บอุณหภูมิสีเงิน มีรอยบุบใกล้ก้นขวด",
    category: "Bottles",
    color: "Silver",
    status: "found",
    location: { building: "gym", floor: "ชั้น 1", room: "สนาม A" },
    date: "2026-08-13T16:55:00",
    image: IMAGES.waterBottle,
    handoverPoint: "ห้องพักครูพลศึกษา",
  },
  {
    id: "black-backpack",
    name: "กระเป๋าเป้สีดำ",
    description: "กระเป๋าเป้สีดำเรียบ ๆ ซิปข้างเสีย ข้างในมีหนังสือคณิตศาสตร์",
    category: "Bags",
    color: "Black",
    status: "found",
    location: { building: "main", floor: "ชั้น 1", room: "ทางเดิน B" },
    date: "2026-08-13T08:30:00",
    image: IMAGES.backpack,
    handoverPoint: "ห้องธุรการ",
  },
  {
    id: "grey-hoodie",
    name: "เสื้อฮู้ดสีเทา",
    description: "เสื้อฮู้ดสวมหัวสีเทา ไซซ์ M ป้ายชื่อที่คอเสื้อจางแล้ว",
    category: "Clothing",
    color: "Grey",
    status: "found",
    location: { building: "field" },
    date: "2026-08-12T17:10:00",
    image: IMAGES.hoodie,
    handoverPoint: "ห้องพักครูพลศึกษา",
  },
  {
    id: "student-keys",
    name: "พวงกุญแจพร้อมบัตรนักเรียน",
    description: "กุญแจสองดอกคล้องสายคล้องสีดำ มีบัตรนักเรียนสีขาวติดอยู่",
    category: "Keys & Cards",
    color: "Black",
    status: "found",
    location: { building: "cafeteria", floor: "ชั้น 1" },
    date: "2026-08-14T12:25:00",
    image: IMAGES.keys,
    handoverPoint: "ห้องธุรการ",
  },
  {
    id: "orange-notebook",
    name: "สมุดสีส้ม",
    description: "สมุดสันห่วงสีส้ม ข้างในเต็มไปด้วยโน้ตและภาพวาดวิชาชีววิทยา",
    category: "Books",
    color: "Orange",
    status: "found",
    location: { building: "science", floor: "ชั้น 1", room: "ห้อง 108" },
    date: "2026-08-12T10:15:00",
    image: IMAGES.stationery,
    handoverPoint: "เคาน์เตอร์อาคารวิทยาศาสตร์",
  },
  {
    id: "black-calculator",
    name: "เครื่องคิดเลขวิทยาศาสตร์",
    description: "เครื่องคิดเลขวิทยาศาสตร์สีดำ เขียนชื่อย่อไว้ด้านหลังด้วยปากกาเมจิก",
    category: "Electronics",
    color: "Black",
    status: "found",
    location: { building: "main", floor: "ชั้น 2", room: "ห้อง 210" },
    date: "2026-08-11T13:45:00",
    image: IMAGES.stationery,
    handoverPoint: "ห้องธุรการ",
  },
  {
    id: "black-glasses",
    name: "แว่นตาสีดำ",
    description: "แว่นตากรอบเหลี่ยมสีดำ ไม่มีกล่อง วางลืมไว้บนโต๊ะอ่านหนังสือ",
    category: "Other",
    color: "Black",
    status: "found",
    location: { building: "library", floor: "ชั้น 2" },
    date: "2026-08-11T09:05:00",
    image: IMAGES.misc,
    handoverPoint: "เคาน์เตอร์ห้องสมุด",
  },
  {
    id: "compact-umbrella",
    name: "ร่มพับ",
    description: "ร่มพับขนาดเล็กสีดำ ก้านร่มงอเล็กน้อย",
    category: "Other",
    color: "Black",
    status: "found",
    location: { building: "main", floor: "ชั้น 1", room: "โถงทางเข้า" },
    date: "2026-08-10T08:20:00",
    image: IMAGES.misc,
    handoverPoint: "ห้องธุรการ",
  },
  {
    id: "pink-bottle",
    name: "ขวดน้ำสีชมพู",
    description: "ขวดน้ำพลาสติกสีชมพู ติดสติกเกอร์หลายอัน มีหลอดแบบเปิด-ปิด",
    category: "Bottles",
    color: "Pink",
    status: "found",
    location: { building: "cafeteria", floor: "ชั้น 1" },
    date: "2026-08-13T12:50:00",
    image: IMAGES.waterBottle,
    handoverPoint: "เคาน์เตอร์โรงอาหาร",
  },
  {
    id: "red-pe-bag",
    name: "ถุงผ้ากีฬาสีแดง",
    description: "ถุงผ้าหูรูดสีแดงสำหรับวิชาพลศึกษา ข้างในมีรองเท้าผ้าใบและผ้าเช็ดตัว",
    category: "Sports",
    color: "Red",
    status: "found",
    location: { building: "gym", floor: "ชั้น 1", room: "ห้องเปลี่ยนชุด 2" },
    date: "2026-08-12T15:30:00",
    image: IMAGES.backpack,
    handoverPoint: "ห้องพักครูพลศึกษา",
  },
  {
    id: "music-folder",
    name: "แฟ้มโน้ตเพลง",
    description: "แฟ้มห่วงสีดำ ข้างในมีโน้ตเพลงสำหรับคอนเสิร์ตของโรงเรียน",
    category: "Books",
    color: "Black",
    status: "found",
    location: { building: "arts", floor: "ชั้น 1", room: "ห้องซ้อม 3" },
    date: "2026-08-11T16:40:00",
    image: IMAGES.stationery,
    handoverPoint: "ห้องพักครูศิลปะ",
  },
  {
    id: "blue-jumper",
    name: "เสื้อไหมพรมโรงเรียนสีน้ำเงิน",
    description: "เสื้อไหมพรมโรงเรียนสีน้ำเงินเข้ม ไซซ์ S ลืมไว้บนม้านั่งหลังพักกลางวัน",
    category: "Clothing",
    color: "Blue",
    status: "found",
    location: { building: "cafeteria", floor: "ชั้น 1" },
    date: "2026-08-14T13:10:00",
    image: IMAGES.hoodie,
    handoverPoint: "เคาน์เตอร์โรงอาหาร",
  },
  {
    id: "silver-headphones",
    name: "หูฟังครอบหู",
    description: "หูฟังครอบหูสีเงิน พับได้ ไม่มีกล่องใส่",
    category: "Electronics",
    color: "Silver",
    status: "found",
    location: { building: "library", floor: "ชั้น 1" },
    date: "2026-08-10T14:00:00",
    image: IMAGES.earbuds,
    handoverPoint: "เคาน์เตอร์ห้องสมุด",
  },
  {
    id: "lost-green-bottle",
    name: "ขวดน้ำสีเขียว",
    description: "ขวดน้ำโลหะสีเขียว มีที่เกี่ยวแบบปีนเขา หายแถว ๆ สนาม",
    category: "Bottles",
    color: "Green",
    status: "lost",
    location: { building: "gym" },
    date: "2026-08-13T17:20:00",
    image: IMAGES.waterBottle,
    reportedBy: "โจนาห์ ม.3",
  },
  {
    id: "lost-black-earbuds",
    name: "หูฟังสีดำ",
    description: "หูฟังสีดำอยู่ในเคสเล็ก ๆ หายตอนพักเช้า",
    category: "Electronics",
    color: "Black",
    status: "lost",
    location: { building: "main", floor: "ชั้น 1" },
    date: "2026-08-12T10:45:00",
    image: IMAGES.earbuds,
    reportedBy: "ปรียา ม.5",
  },
  {
    id: "lost-yellow-folder",
    name: "แฟ้มสีเหลือง",
    description: "แฟ้มสีเหลือง ข้างในมีงานวิชาประวัติศาสตร์ หายหลังคาบสุดท้าย",
    category: "Books",
    color: "Yellow",
    status: "lost",
    location: { building: "main", floor: "ชั้น 2" },
    date: "2026-08-11T15:50:00",
    image: IMAGES.stationery,
    reportedBy: "แซม ม.6",
  },
  {
    id: "school-tie",
    name: "เนกไทโรงเรียน",
    description: "เนกไทโรงเรียนลายทาง พับวางไว้บนชั้นวางของ",
    category: "Clothing",
    color: "Multicolour",
    status: "found",
    location: { building: "arts", floor: "ชั้น 1" },
    date: "2026-08-10T11:25:00",
    image: IMAGES.misc,
    handoverPoint: "ห้องพักครูศิลปะ",
  },
];

/* ------------------------------------------------------------------ *
 * Indoor floor plans (illustrated prototype — not real GPS data).
 * ------------------------------------------------------------------ */

export type FloorSpaceKind = "room" | "corridor" | "stairs" | "special";

export interface FloorSpace {
  label: string;
  kind: FloorSpaceKind;
  /** Percentage coordinates within the floor plan box. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FloorPlan {
  building: BuildingId;
  floor: string;
  spaces: FloorSpace[];
}

const SCIENCE_FLOOR_2: FloorSpace[] = [
  { label: "บันได", kind: "stairs", x: 2, y: 4, w: 15, h: 34 },
  { label: "ห้อง 201", kind: "room", x: 19, y: 4, w: 25, h: 34 },
  { label: "ห้อง 202", kind: "room", x: 46, y: 4, w: 25, h: 34 },
  { label: "ห้อง 203", kind: "room", x: 73, y: 4, w: 25, h: 34 },
  { label: "ทางเดิน", kind: "corridor", x: 2, y: 40, w: 96, h: 14 },
  { label: "ห้อง 204", kind: "room", x: 2, y: 56, w: 26, h: 38 },
  { label: "ห้อง 205", kind: "room", x: 30, y: 56, w: 24, h: 38 },
  { label: "ห้อง 206", kind: "room", x: 56, y: 56, w: 20, h: 38 },
  { label: "แล็บ 2B", kind: "special", x: 78, y: 56, w: 20, h: 38 },
];

export const FLOOR_PLANS: FloorPlan[] = [
  { building: "science", floor: "ชั้น 2", spaces: SCIENCE_FLOOR_2 },
];

/** A neutral layout used for floors we haven't drawn in detail. */
export function genericFloorSpaces(roomLabel?: string): FloorSpace[] {
  return [
    { label: "บันได", kind: "stairs", x: 2, y: 4, w: 16, h: 34 },
    { label: "ห้องเรียน", kind: "room", x: 20, y: 4, w: 37, h: 34 },
    { label: "ห้องเรียน", kind: "room", x: 59, y: 4, w: 39, h: 34 },
    { label: "ทางเดิน", kind: "corridor", x: 2, y: 40, w: 96, h: 14 },
    { label: roomLabel ?? "ห้อง", kind: "room", x: 2, y: 56, w: 36, h: 38 },
    { label: "ห้องเรียน", kind: "room", x: 40, y: 56, w: 28, h: 38 },
    { label: "ห้องพักครู", kind: "special", x: 70, y: 56, w: 28, h: 38 },
  ];
}

export function findFloorPlan(location: {
  building: BuildingId;
  floor?: string;
  room?: string;
}): FloorPlan | null {
  if (!location.floor) return null;
  const exact = FLOOR_PLANS.find(
    (plan) => plan.building === location.building && plan.floor === location.floor,
  );
  if (exact) return exact;
  return {
    building: location.building,
    floor: location.floor,
    spaces: genericFloorSpaces(location.room),
  };
}

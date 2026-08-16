import { createFileRoute, Link } from "@tanstack/react-router";
import { Info as InfoIcon, MapPin, Search, ShieldCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/info")({
  head: () => ({
    meta: [
      { title: "Back2U ทำงานอย่างไร" },
      {
        name: "description",
        content:
          "วิธีที่ Back2U จับคู่ของหายกับของที่มีคนเก็บได้ จุดรับของคืน และสิ่งที่ต้นแบบนี้ยังไม่รองรับ",
      },
      { property: "og:title", content: "Back2U ทำงานอย่างไร" },
      {
        property: "og:description",
        content: "วิธีที่ Back2U จับคู่ของหายกับของที่เก็บได้ และจุดรับของคืน",
      },
    ],
  }),
  component: InfoPage,
});

const steps = [
  {
    icon: Search,
    title: "พิมพ์บรรยายด้วยภาษาง่าย ๆ",
    body: "“กระเป๋าดินสอสีน้ำเงินมีสติกเกอร์แมว” ใช้ได้ดีกว่าการเลือกหมวดหมู่",
  },
  {
    icon: Sparkles,
    title: "ดูคะแนนความตรงกัน",
    body: "Back2U เทียบประเภท สี คำบรรยาย และสถานที่ พร้อมบอกเหตุผลว่าทำไมถึงตรงกัน",
  },
  {
    icon: MapPin,
    title: "รู้ว่าของอยู่ตรงไหน",
    body: "ของที่มีคนเก็บได้ทุกชิ้นจะถูกปักหมุดไว้ที่อาคารและชั้นบนแผนที่โรงเรียน",
  },
  {
    icon: ShieldCheck,
    title: "กดขอรับคืนแล้วไปรับ",
    body: "กดขอรับคืนในแอป แล้วนำบัตรนักเรียนไปรับของที่ห้องธุรการ",
  },
];

function InfoPage() {
  return (
    <div className="px-5 pb-10 pt-8">
      <h1 className="text-2xl">Back2U ทำงานอย่างไร</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        ระบบของหายที่ช่วยให้ของกลับไปหาเจ้าของได้จริง
      </p>

      <ol className="mt-6 space-y-3">
        {steps.map(({ icon: Icon, title, body }, index) => (
          <li
            key={title}
            className="flex gap-4 rounded-2xl border border-border bg-card p-4 shadow-card"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">
                {index + 1}. {title}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="mt-8 rounded-2xl border border-border bg-secondary p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <InfoIcon className="h-4 w-4 text-primary" aria-hidden="true" />
          หมายเหตุ: นี่คือต้นแบบ
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          นี่เป็นต้นแบบสำหรับงานแฮกกาธอน ข้อมูลสิ่งของ บุคคล และอาคารทั้งหมดเป็นเรื่องสมมติ
          การจับคู่ทำงานบนเครื่องของคุณเท่านั้น และสิ่งที่คุณแจ้งจะเก็บไว้เฉพาะในรอบการใช้งานนี้ —
          ไม่มีการสมัครสมาชิก ไม่มีแชท และไม่มีเซิร์ฟเวอร์เก็บข้อมูลของคุณ
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold">จุดรับของคืน</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          ห้องธุรการ อาคารเรียนรวม — เปิดวันจันทร์–ศุกร์ 8:00–16:30 น. อย่าลืมนำบัตรนักเรียนมาด้วย
        </p>
        <Link
          to="/map"
          search={{ item: undefined }}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary"
        >
          <MapPin className="h-4 w-4" aria-hidden="true" />
          เปิดแผนที่โรงเรียน
        </Link>
      </section>
    </div>
  );
}

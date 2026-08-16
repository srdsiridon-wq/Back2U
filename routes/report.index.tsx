import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, HandHeart, PackageSearch } from "lucide-react";

export const Route = createFileRoute("/report/")({
  head: () => ({
    meta: [
      { title: "แจ้งเรื่องของ — Back2U" },
      {
        name: "description",
        content: "แจ้งของที่คุณทำหาย หรือส่งคืนของที่คุณเก็บได้ ใช้เวลาไม่ถึงหนึ่งนาที",
      },
      { property: "og:title", content: "แจ้งเรื่องของ — Back2U" },
      {
        property: "og:description",
        content: "แจ้งของที่คุณทำหาย หรือส่งคืนของที่คุณเก็บได้",
      },
    ],
  }),
  component: ReportIndexPage,
});

const options = [
  {
    to: "/report/lost",
    icon: PackageSearch,
    title: "ฉันทำของหาย",
    body: "บอกเราว่าอะไรหายไป แล้วเราจะเทียบกับของที่มีคนนำมาส่งคืน",
    tone: "border-warning/30 bg-warning-soft text-warning",
  },
  {
    to: "/report/found",
    icon: HandHeart,
    title: "ฉันเก็บของได้",
    body: "บันทึกไว้ที่นี่ แล้วนำไปฝากที่ห้องธุรการเพื่อให้เจ้าของมารับคืน",
    tone: "border-success/30 bg-success-soft text-success",
  },
] as const;

function ReportIndexPage() {
  return (
    <div className="px-5 pb-10 pt-8">
      <h1 className="text-2xl">แจ้งเรื่องของ</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        ใช้เวลาประมาณหนึ่งนาที ไม่ต้องสมัครสมาชิก
      </p>

      <div className="mt-6 space-y-3">
        {options.map(({ to, icon: Icon, title, body, tone }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card"
          >
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${tone}`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="flex-1">
              <span className="block text-base font-semibold">{title}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{body}</span>
            </span>
            <ArrowRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </div>
  );
}

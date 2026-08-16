import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { ReportForm } from "@/components/back2u/ReportForm";

export const Route = createFileRoute("/report/lost")({
  head: () => ({
    meta: [
      { title: "แจ้งของหาย — Back2U" },
      {
        name: "description",
        content: "บอกเราว่าคุณทำอะไรหายและหายที่ไหน แล้ว Back2U จะช่วยหารายการที่น่าจะใช่",
      },
      { property: "og:title", content: "แจ้งของหาย — Back2U" },
      {
        property: "og:description",
        content: "บอกเราว่าคุณทำอะไรหาย แล้ว Back2U จะช่วยหารายการที่น่าจะใช่",
      },
    ],
  }),
  component: ReportLostPage,
});

function ReportLostPage() {
  return (
    <div className="px-5 pb-6 pt-2">
      <Link to="/report" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        ย้อนกลับ
      </Link>
      <h1 className="mt-2 text-2xl leading-tight">แจ้งของหาย</h1>
      <p className="mt-0.5 text-sm text-muted-foreground">
        กรอกรายละเอียดสั้น ๆ แล้วเราจะเริ่มหาให้ทันที
      </p>
      <div className="mt-3">
        <ReportForm status="lost" />
      </div>
    </div>
  );
}

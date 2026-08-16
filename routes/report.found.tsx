import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { ReportForm } from "@/components/back2u/ReportForm";

export const Route = createFileRoute("/report/found")({
  head: () => ({
    meta: [
      { title: "แจ้งว่าเก็บของได้ — Back2U" },
      {
        name: "description",
        content: "เก็บของได้ในโรงเรียน? บันทึกไว้บน Back2U เพื่อให้เจ้าของตามหาเจอ",
      },
      { property: "og:title", content: "แจ้งว่าเก็บของได้ — Back2U" },
      {
        property: "og:description",
        content: "เก็บของได้ในโรงเรียน? บันทึกไว้เพื่อให้เจ้าของตามหาเจอ",
      },
    ],
  }),
  component: ReportFoundPage,
});

function ReportFoundPage() {
  return (
    <div className="px-5 pb-6 pt-2">
      <Link to="/report" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        ย้อนกลับ
      </Link>
      <h1 className="mt-2 text-2xl leading-tight">แจ้งว่าเก็บของได้</h1>
      <p className="mt-0.5 text-sm text-muted-foreground">
        บันทึกไว้ที่นี่ แล้วนำของไปฝากที่ห้องธุรการ
      </p>
      <div className="mt-3">
        <ReportForm status="found" />
      </div>
    </div>
  );
}

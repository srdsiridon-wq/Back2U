import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MapPin } from "lucide-react";

import { FloorPlan } from "@/components/back2u/FloorPlan";
import { SchoolMap } from "@/components/back2u/SchoolMap";
import { BUILDINGS, buildingName, locationLabel } from "@/lib/back2u/data";
import { useItems } from "@/lib/back2u/store";

export const Route = createFileRoute("/map")({
  validateSearch: (search: Record<string, unknown>) => ({
    item: typeof search["item"] === "string" ? (search["item"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "แผนที่โรงเรียน — Back2U" },
      {
        name: "description",
        content: "ดูว่าของถูกเก็บได้ที่จุดไหนบนแผนที่โรงเรียน และไปรับคืนได้ที่ไหน",
      },
      { property: "og:title", content: "แผนที่โรงเรียน — Back2U" },
      {
        property: "og:description",
        content: "ดูว่าของถูกเก็บได้ที่จุดไหนบนแผนที่โรงเรียน",
      },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  const { item: itemId } = Route.useSearch();
  const { items } = useItems();
  const item = itemId ? items.find((entry) => entry.id === itemId) : undefined;
  const highlight = item?.location.building;
  const foundLabel = item?.status === "found" ? "เจอที่นี่" : "เห็นครั้งสุดท้ายที่นี่";

  const locationParts = item
    ? [buildingName(item.location.building), item.location.floor, item.location.room].filter(
        Boolean,
      )
    : [];

  return (
    <div className="px-5 pb-10 pt-8">
      {item && (
        <Link
          to="/item/$itemId"
          params={{ itemId: item.id }}
          search={{ q: undefined }}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          กลับไปที่ของชิ้นนี้
        </Link>
      )}
      <h1 className="text-2xl">แผนที่โรงเรียน</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {item ? locationLabel(item.location) : "จุดที่มักมีคนเก็บของได้ในโรงเรียน"}
      </p>

      <div className="mt-5">
        <SchoolMap highlight={highlight} />
      </div>

      {item && item.location.floor && (
        <div className="mt-4">
          <FloorPlan location={item.location} label={foundLabel} />
        </div>
      )}

      {item && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary-soft p-4">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <MapPin className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-accent-foreground">{foundLabel}</p>
            <p className="mt-0.5 text-sm text-foreground">{locationParts.join(" • ")}</p>
            {item.handoverPoint && (
              <p className="mt-1 text-xs text-muted-foreground">
                รับของคืนได้ที่ {item.handoverPoint}
              </p>
            )}
          </div>
        </div>
      )}

      <ul className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" />
          ตำแหน่งของ
        </li>
        <li className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-border bg-card" aria-hidden="true" />
          อาคารและห้อง
        </li>
        <li className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full border border-dashed border-border bg-background"
            aria-hidden="true"
          />
          ทางเดินและทางเชื่อม
        </li>
      </ul>

      <div className="mt-6">
        <h2 className="text-base font-semibold">อาคารทั้งหมด</h2>
        <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {BUILDINGS.map((building) => {
            const count = items.filter((entry) => entry.location.building === building.id).length;
            return (
              <li
                key={building.id}
                className="rounded-xl border border-border bg-card px-3 py-2 shadow-card"
              >
                <span className="block font-medium">{building.name}</span>
                <span className="text-xs text-muted-foreground">{count} ชิ้น</span>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        แผนผังจำลองสำหรับเดโม Back2U — ไม่ใช่ตำแหน่ง GPS จริง
      </p>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ChevronRight, PackageSearch, Search, HandHeart } from "lucide-react";

import logoAsset from "@/assets/back2u-logo.png.asset.json";
import { ItemCard } from "@/components/back2u/ItemCard";
import { useItems } from "@/lib/back2u/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Back2U — ของหายได้คืน ในโรงเรียน" },
      {
        name: "description",
        content:
          "ทำของหายที่โรงเรียน? ค้นหาบน Back2U ดูรายการที่น่าจะใช่ รู้ว่าเจอที่ไหน แล้วรับของคืนได้เลย",
      },
      { property: "og:title", content: "Back2U — ของหายได้คืน ในโรงเรียน" },
      {
        property: "og:description",
        content: "ค้นหาของหายที่โรงเรียน ดูรายการที่น่าจะใช่ และรับของคืนได้ง่าย ๆ",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { items } = useItems();
  const recentFound = items.filter((item) => item.status === "found").slice(0, 3);

  return (
    <div className="pb-8">
      <header className="rounded-b-[2rem] bg-gradient-to-b from-primary-soft via-accent/40 to-background px-5 pb-8 pt-6 text-center">
        <img
          src={logoAsset.url}
          alt="Back2U"
          width={520}
          height={520}
          className="mx-auto h-44 w-auto object-contain"
        />
        <h1 className="mt-2 text-3xl leading-tight">
          ทำของหายอยู่ใช่ไหม?
          <br />
          <span className="text-primary">เดี๋ยวเราช่วยตามให้</span>
        </h1>
      </header>

      <div className="mt-6 space-y-3 px-5">
        <Link
          to="/search"
          search={{ q: undefined }}
          className="flex items-center gap-4 rounded-2xl bg-primary p-4 text-primary-foreground shadow-lift transition-transform active:scale-[0.98]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15">
            <Search className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="flex-1 text-left">
            <span className="block text-base font-semibold">ค้นหาของหาย</span>
            <span className="block text-xs opacity-90">เช่น “กระเป๋าดินสอสีน้ำเงินมีสติกเกอร์แมว”</span>
          </span>
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>

        <Link
          to="/report/lost"
          className="flex min-h-14 items-center gap-3 rounded-2xl bg-warning px-4 py-3 font-semibold text-warning-foreground shadow-lift transition-all hover:bg-warning/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning-foreground/15">
            <PackageSearch className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="flex-1 text-left text-base">แจ้งของหาย</span>
          <ChevronRight className="h-5 w-5 opacity-80" aria-hidden="true" />
        </Link>

        <Link
          to="/report/found"
          className="flex min-h-14 items-center gap-3 rounded-2xl border-2 border-success bg-card px-4 py-3 font-semibold text-foreground shadow-card transition-all hover:bg-success-soft active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
            <HandHeart className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="flex-1 text-left text-base">แจ้งว่าเก็บของได้</span>
          <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </Link>

      </div>

      <section className="mt-9 px-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg">เพิ่งเก็บได้ล่าสุด</h2>
          <Link to="/search" search={{ q: undefined }} className="text-sm font-medium text-primary">
            ดูทั้งหมด
          </Link>
        </div>
        <div className="mt-4 space-y-3">
          {recentFound.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}

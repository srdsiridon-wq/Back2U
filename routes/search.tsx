import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Search as SearchIcon, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";

import { ItemCard } from "@/components/back2u/ItemCard";
import { MatchExplainer } from "@/components/back2u/MatchExplainer";
import { BUILDINGS, buildingName } from "@/lib/back2u/data";
import { STRONG_MATCH_THRESHOLD, parseQuery } from "@/lib/back2u/match";
import { categoryTh, colorTh } from "@/lib/back2u/i18n";
import { searchItems } from "@/lib/back2u/items.functions";
import { CATEGORIES, type BuildingId, type Category } from "@/lib/back2u/types";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search["q"] === "string" && search["q"] ? (search["q"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "ค้นหาของหาย — Back2U" },
      {
        name: "description",
        content:
          "พิมพ์บรรยายของที่หายด้วยภาษาง่าย ๆ แล้ว Back2U จะแสดงรายการที่ใกล้เคียงที่สุดที่มีคนนำมาส่งคืน",
      },
      { property: "og:title", content: "ค้นหาของหาย — Back2U" },
      {
        property: "og:description",
        content: "พิมพ์บรรยายของที่หาย แล้ว Back2U จะแสดงรายการที่ใกล้เคียงที่สุด",
      },
    ],
  }),
  component: SearchPage,
});

const EXAMPLES = [
  "กระเป๋าดินสอสีน้ำเงินมีสติกเกอร์แมว",
  "หูฟังไร้สายสีดำ",
  "ขวดน้ำสเตนเลส",
];

const chip = (active: boolean) =>
  cn(
    "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-card text-muted-foreground",
  );

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const runSearch = useServerFn(searchItems);

  const [draft, setDraft] = useState(q ?? "");
  const [showFilters, setShowFilters] = useState(false);
  const [category, setCategory] = useState<string>("all");
  const [building, setBuilding] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const parsed = useMemo(() => (q ? parseQuery(q) : null), [q]);

  const query = useQuery({
    queryKey: ["back2u", "search", q ?? "", category, building, status],
    queryFn: () =>
      runSearch({
        data: {
          ...(q ? { q } : {}),
          ...(category !== "all" ? { category: category as Category } : {}),
          ...(building !== "all" ? { building: building as BuildingId } : {}),
          ...(status !== "all" ? { kind: status as "lost" | "found" } : {}),
        },
      }),
    placeholderData: (previous) => previous,
  });

  const isSearching = query.isPending || query.isFetching;
  const results = useMemo(
    () =>
      (query.data ?? []).map((hit) => ({
        item: hit.item,
        score: hit.score as number | undefined,
        reasons: hit.reasons,
      })),
    [query.data],
  );

  const strong = q ? results.filter((entry) => (entry.score ?? 0) >= STRONG_MATCH_THRESHOLD) : [];
  const best = strong[0];
  const rest = best ? results.filter((entry) => entry !== best) : results;

  function submit(value: string) {
    navigate({ to: "/search", search: { q: value.trim() || undefined } });
  }

  return (
    <div className="px-5 pb-8 pt-8">
      <h1 className="text-2xl">ค้นหาของหาย</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        เล่าลักษณะของแบบที่คุณจะเล่าให้เพื่อนฟังได้เลย
      </p>

      <form
        className="mt-5 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit(draft);
        }}
      >
        <div className="relative flex-1">
          <SearchIcon
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="กระเป๋าดินสอสีน้ำเงินมีสติกเกอร์แมว"
            aria-label="บรรยายลักษณะของ"
            className="h-12 rounded-xl pl-9 pr-9 text-base"
          />
          {draft && (
            <button
              type="button"
              aria-label="ล้างคำค้นหา"
              onClick={() => {
                setDraft("");
                submit("");
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <button
          type="button"
          aria-label="เปิด/ปิดตัวกรอง"
          onClick={() => setShowFilters((value) => !value)}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl border border-border",
            showFilters ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
          )}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>

      {!q && (
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"
              onClick={() => {
                setDraft(example);
                submit(example);
              }}
            >
              {example}
            </button>
          ))}
        </div>
      )}

      {parsed && <ParsedChips parsed={parsed} />}

      {showFilters && (
        <div className="mt-4 space-y-3 rounded-2xl border border-border bg-card p-4">
          <FilterRow label="สถานะ" value={status} onChange={setStatus} options={[
            { value: "all", label: "ทั้งหมด" },
            { value: "found", label: "เจอแล้ว" },
            { value: "lost", label: "ของหาย" },
          ]} />
          <FilterRow
            label="หมวดหมู่"
            value={category}
            onChange={setCategory}
            options={[
              { value: "all", label: "ทั้งหมด" },
              ...CATEGORIES.map((c) => ({ value: c, label: categoryTh(c) })),
            ]}
          />
          <FilterRow
            label="สถานที่"
            value={building}
            onChange={setBuilding}
            options={[
              { value: "all", label: "ทั้งหมด" },
              ...BUILDINGS.map((b) => ({ value: b.id, label: buildingName(b.id) })),
            ]}
          />
        </div>
      )}

      {isSearching ? (
        <LoadingState />
      ) : (
        <>
          {q && best && (
            <section className="mt-6">
              <h2 className="text-base font-semibold">
                {strong.length > 1 ? "มีหลายชิ้นที่ใกล้เคียง" : "น่าจะเป็นชิ้นนี้"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {strong.length > 1
                  ? "นี่คือรายการที่ใกล้เคียงกับที่คุณบรรยายมากที่สุด"
                  : "นี่คือรายการที่ใกล้เคียงกับที่คุณบรรยายมากที่สุด"}
              </p>
              <MatchExplainer score={best.score ?? 0} reasons={best.reasons} compact className="mt-3" />
              <div className="mt-3">
                <ItemCard item={best.item} score={best.score} query={q} />
              </div>
            </section>
          )}

          <div className="mt-6 flex items-baseline justify-between">
            <h2 className="text-base font-semibold">
              {q
                ? best
                  ? `รายการอื่นอีก ${rest.length} ชิ้น`
                  : `พบ ${results.length} รายการ`
                : "ของทั้งหมด"}
            </h2>
          </div>

          <div className="mt-3 space-y-3">
            {rest.map(({ item, score }) => (
              <ItemCard key={item.id} item={item} score={score} query={q} />
            ))}
            {rest.length === 0 && (best ? <NoOthers /> : <EmptyState onPick={(value) => {
              setDraft(value);
              submit(value);
            }} />)}
          </div>
        </>
      )}
    </div>
  );
}

function ParsedChips({ parsed }: { parsed: ReturnType<typeof parseQuery> }) {
  const chips = [
    parsed.category ? `ประเภท: ${categoryTh(parsed.category)}` : null,
    parsed.color ? `สี: ${colorTh(parsed.color)}` : null,
    parsed.details.length ? `รายละเอียด: ${parsed.details.join(" ")}` : null,
    parsed.building ? `สถานที่: ${buildingName(parsed.building)}` : null,
  ].filter(Boolean) as string[];

  if (!chips.length) return null;

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        เราค้นหาจากสิ่งเหล่านี้
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {chips.map((label) => (
          <span
            key={label}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mt-6 space-y-3" aria-live="polite" aria-busy="true">
      <p className="text-sm text-muted-foreground">กำลังค้นหาในรายการของที่ส่งคืนไว้…</p>
      {[0, 1, 2].map((key) => (
        <div key={key} className="flex gap-4 rounded-2xl border border-border bg-card p-3">
          <div className="h-24 w-24 shrink-0 animate-pulse rounded-xl bg-muted" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function NoOthers() {
  return (
    <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      ไม่มีรายการอื่นที่ใกล้เคียงกับที่คุณบรรยาย
    </p>
  );
}

const QUICK_SEARCHES = ["สีน้ำเงิน", "สีดำ", "เครื่องเขียน", "ขวดน้ำ", "อาคารวิทยาศาสตร์"];

function EmptyState({ onPick }: { onPick: (value: string) => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-6 text-center">
      <p className="text-sm font-semibold">ยังไม่เจอรายการที่ใกล้เคียงพอ</p>
      <p className="mt-1.5 text-sm text-muted-foreground">
        ลองค้นหาด้วยสี หมวดหมู่ หรือสถานที่ดู
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {QUICK_SEARCHES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onPick(value)}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"
          >
            {value}
          </button>
        ))}
      </div>
      <Link
        to="/report/lost"
        className="mt-4 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline"
      >
        แจ้งเป็นของหายแทน
      </Link>
    </div>
  );
}

function FilterRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={chip(value === option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

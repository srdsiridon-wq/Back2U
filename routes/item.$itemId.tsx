import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Clock, Flag, MapPin, MessageSquare, CheckCircle2, Package } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { MatchBadge, StatusBadge } from "@/components/back2u/ItemCard";
import { MatchExplainer } from "@/components/back2u/MatchExplainer";
import { formatDate, locationLabel } from "@/lib/back2u/data";
import { categoryTh, colorTh } from "@/lib/back2u/i18n";
import { scoreItem } from "@/lib/back2u/match";
import { useItems } from "@/lib/back2u/store";
import { useSession } from "@/hooks/use-session";
import { createClaim } from "@/lib/back2u/claims.functions";
import { flagItem } from "@/lib/back2u/moderation.functions";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listMyItems } from "@/lib/back2u/items.functions";
import { OwnerActions } from "@/components/back2u/OwnerActions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/item/$itemId")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search["q"] === "string" && search["q"] ? (search["q"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "รายละเอียดของ — Back2U" },
      {
        name: "description",
        content: "ดูรายละเอียดทั้งหมดของของหายหรือของที่เก็บได้ ว่าอยู่ตรงไหน และขอรับคืนอย่างไร",
      },
      { property: "og:title", content: "รายละเอียดของ — Back2U" },
      {
        property: "og:description",
        content: "ดูว่าของถูกเก็บได้ที่ไหน และขอรับคืนอย่างไร",
      },
    ],
  }),
  component: ItemDetailPage,
});

function ItemDetailPage() {
  const { itemId } = Route.useParams();
  const { q } = Route.useSearch();
  const { items, isLoading } = useItems();
  const router = useRouter();
  const { user } = useSession();
  const claim = useServerFn(createClaim);
  const flag = useServerFn(flagItem);
  const [claimed, setClaimed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const fetchMine = useServerFn(listMyItems);
  const mine = useQuery({
    queryKey: ["me", "items"],
    queryFn: () => fetchMine({}),
    enabled: Boolean(user),
  });
  const isMine = Boolean(mine.data?.some((entry) => entry.id === itemId));

  const item =
    items.find((entry) => entry.id === itemId) ??
    mine.data?.find((entry) => entry.id === itemId);
  if (!item && (isLoading || (Boolean(user) && mine.isLoading))) {
    return <p className="px-5 pt-10 text-sm text-muted-foreground">กำลังโหลด…</p>;
  }
  if (!item) throw notFound();

  const match = q ? scoreItem(q, item) : null;
  const isFound = item.status === "found";

  async function handleClaim() {
    if (!item || busy) return;
    if (!user) {
      router.navigate({ to: "/auth", search: { redirect: `/item/${item.id}` } });
      return;
    }
    setBusy(true);
    try {
      await claim({ data: { itemId: item.id } });
      setClaimed(true);
      toast.success(isFound ? "ส่งคำขอรับคืนแล้ว" : "ส่งข้อความถึงผู้แจ้งแล้ว");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ส่งคำขอไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function handleFlag() {
    if (!item || flagging) return;
    if (!user) {
      router.navigate({ to: "/auth", search: { redirect: `/item/${item.id}` } });
      return;
    }
    const reason = window.prompt("แจ้งปัญหาของรายการนี้ (เช่น ข้อมูลไม่ถูกต้อง หรือรูปไม่เหมาะสม)");
    if (!reason || reason.trim().length < 3) return;
    setFlagging(true);
    try {
      await flag({ data: { itemId: item.id, reason: reason.trim() } });
      toast.success("ส่งรายงานให้เจ้าหน้าที่แล้ว");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ส่งรายงานไม่สำเร็จ");
    } finally {
      setFlagging(false);
    }
  }

  return (
    <div className="pb-10">
      <div className="relative">
        <img
          src={item.image}
          alt={item.name}
          width={1024}
          height={1024}
          className="aspect-square w-full object-cover"
        />
        <button
          type="button"
          aria-label="ย้อนกลับ"
          onClick={() => router.history.back()}
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-card/90 shadow-card backdrop-blur"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="px-5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl leading-tight">{item.name}</h1>
          {match ? <MatchBadge score={match.score} /> : <StatusBadge status={item.status} />}
        </div>

        <p className="mt-2 text-sm text-muted-foreground">
          {categoryTh(item.category)} · {colorTh(item.color)} ·{" "}
          {isFound ? "มีคนนำมาส่งคืนแล้ว" : "แจ้งว่าหาย"}
        </p>

        <p className="mt-4 text-sm leading-relaxed">{item.description}</p>

        <dl className="mt-5 space-y-3 rounded-2xl border border-border bg-card p-4 text-sm shadow-card">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <dt className="font-medium">{isFound ? "เจอที่" : "เห็นครั้งสุดท้ายที่"}</dt>
              <dd className="text-muted-foreground">{locationLabel(item.location)}</dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <dt className="font-medium">วันเวลา</dt>
              <dd className="text-muted-foreground">{formatDate(item.date)}</dd>
            </div>
          </div>
          {item.handoverPoint && (
            <div className="flex items-start gap-3">
              <Package className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <dt className="font-medium">รับของคืนได้ที่</dt>
                <dd className="text-muted-foreground">{item.handoverPoint}</dd>
              </div>
            </div>
          )}
        </dl>

        {match && (
          <div className="mt-5">
            <MatchExplainer score={match.score} reasons={match.reasons} />
          </div>
        )}

        {isMine ? (
          <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-card">
            <p className="text-sm font-medium">คุณเป็นคนแจ้งรายการนี้</p>
            <p className="mt-1 text-xs text-muted-foreground">
              ถ้าได้ของคืนแล้ว กด “เจอแล้ว” เพื่อซ่อนออกจากรายการทั้งหมด
            </p>
            <OwnerActions
              itemId={item.id}
              {...(item.lifecycle ? { lifecycle: item.lifecycle } : {})}
              redirectAfterDelete="/me"
            />
          </div>
        ) : claimed ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-success/30 bg-success-soft p-4 text-sm">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            <p className="text-foreground">
              ส่งคำขอรับคืนแล้ว นำบัตรนักเรียนไปรับของได้ที่{" "}
              <strong>{item.handoverPoint ?? "ห้องธุรการ"}</strong>
            </p>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-2">
            <Button asChild size="lg" variant="outline" className="h-12 rounded-xl text-base">
              <Link to="/map" search={{ item: item.id }}>
                <MapPin className="h-4 w-4" aria-hidden="true" />
                ดูตำแหน่งบนแผนที่
              </Link>
            </Button>
            <Button
              size="lg"
              disabled={busy}
              className="h-12 rounded-xl text-base"
              onClick={handleClaim}
            >
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              {busy
                ? "กำลังส่ง…"
                : isFound
                  ? "ของชิ้นนี้ของฉัน — ขอรับคืน"
                  : "ฉันคิดว่าฉันเจอของชิ้นนี้"}
            </Button>
            {!user && (
              <p className="text-center text-xs text-muted-foreground">
                ต้องเข้าสู่ระบบก่อนจึงจะขอรับคืนได้
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleFlag}
          disabled={flagging}
          className="mt-6 flex w-full items-center justify-center gap-2 text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          <Flag className="h-3.5 w-3.5" aria-hidden="true" />
          {flagging ? "กำลังส่งรายงาน…" : "รายงานปัญหาของรายการนี้"}
        </button>
      </div>
    </div>
  );
}

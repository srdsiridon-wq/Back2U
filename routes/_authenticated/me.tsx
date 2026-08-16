import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";

import { ItemCard } from "@/components/back2u/ItemCard";
import { MatchSuggestions } from "@/components/back2u/MatchSuggestions";
import { OwnerActions } from "@/components/back2u/OwnerActions";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { listMyItems } from "@/lib/back2u/items.functions";
import { listMyClaims } from "@/lib/back2u/claims.functions";

export const Route = createFileRoute("/_authenticated/me")({
  head: () => ({
    meta: [
      { title: "รายการของฉัน — Back2U" },
      {
        name: "description",
        content: "ดูรายการของหายและของที่คุณเก็บได้ พร้อมสถานะคำขอรับคืนบน Back2U",
      },
      { property: "og:title", content: "รายการของฉัน — Back2U" },
      { property: "og:description", content: "ดูรายการที่คุณแจ้งไว้และคำขอรับคืนของคุณ" },
    ],
  }),
  component: MePage,
});

const CLAIM_STATE_TH: Record<string, string> = {
  pending: "รอตรวจสอบ",
  approved: "อนุมัติแล้ว",
  rejected: "ไม่อนุมัติ",
  collected: "รับของแล้ว",
};

function MePage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchItems = useServerFn(listMyItems);
  const fetchClaims = useServerFn(listMyClaims);

  const items = useQuery({ queryKey: ["me", "items"], queryFn: () => fetchItems({}) });
  const claims = useQuery({ queryKey: ["me", "claims"], queryFn: () => fetchClaims({}) });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { redirect: undefined }, replace: true });
  }

  return (
    <div className="px-5 pb-10 pt-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl">รายการของฉัน</h1>
          <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} className="shrink-0">
          <LogOut className="mr-1.5 h-4 w-4" aria-hidden="true" />
          ออกจากระบบ
        </Button>
      </div>

      <section className="mt-6">
        <h2 className="text-base font-semibold">ที่ฉันแจ้งไว้</h2>
        <div className="mt-3 space-y-3">
          {items.isLoading && <p className="text-sm text-muted-foreground">กำลังโหลด…</p>}
          {items.data?.map((item) => (
            <div key={item.id}>
              <ItemCard item={item} />
              {(item.lifecycle === "returned" || item.lifecycle === "archived") && (
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  ปิดเรื่องแล้ว — ซ่อนจากรายการสาธารณะ
                </p>
              )}
              <OwnerActions
                itemId={item.id}
                {...(item.lifecycle ? { lifecycle: item.lifecycle } : {})}
              />
              <MatchSuggestions itemId={item.id} />
            </div>
          ))}

          {items.data?.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              ยังไม่มีรายการที่แจ้งไว้{" "}
              <Link to="/report" className="text-primary">
                แจ้งของ
              </Link>
            </p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold">คำขอรับคืนของฉัน</h2>
        <div className="mt-3 space-y-3">
          {claims.data?.map((claim) => (
            <div key={claim.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{claim.items?.title ?? "รายการ"}</p>
                <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">
                  {CLAIM_STATE_TH[claim.state] ?? claim.state}
                </span>
              </div>
              {claim.items?.handover_point && (
                <p className="mt-1 text-xs text-muted-foreground">
                  รับของได้ที่ {claim.items.handover_point}
                </p>
              )}
            </div>
          ))}
          {claims.data?.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              ยังไม่มีคำขอรับคืน
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

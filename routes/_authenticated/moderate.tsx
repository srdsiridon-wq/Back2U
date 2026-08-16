import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CLAIM_STATE_TH } from "@/lib/back2u/claims.functions";
import {
  isModerator,
  listClaimQueue,
  listModerationQueue,
  listOpenReports,
  moderateItem,
  resolveReport,
  reviewClaim,
} from "@/lib/back2u/moderation.functions";

export const Route = createFileRoute("/_authenticated/moderate")({
  head: () => ({
    meta: [
      { title: "ศูนย์ดูแลรายการ — Back2U" },
      {
        name: "description",
        content: "เจ้าหน้าที่ตรวจสอบรายการของหายและอนุมัติคำขอรับคืนของโรงเรียน",
      },
      { property: "og:title", content: "ศูนย์ดูแลรายการ — Back2U" },
      { property: "og:description", content: "ตรวจสอบรายการและอนุมัติคำขอรับคืน" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ModeratePage,
});

function ModeratePage() {
  const queryClient = useQueryClient();
  const checkRole = useServerFn(isModerator);
  const fetchItems = useServerFn(listModerationQueue);
  const fetchClaims = useServerFn(listClaimQueue);
  const actOnItem = useServerFn(moderateItem);
  const actOnClaim = useServerFn(reviewClaim);
  const fetchReports = useServerFn(listOpenReports);
  const actOnReport = useServerFn(resolveReport);

  const role = useQuery({ queryKey: ["moderator"], queryFn: () => checkRole({}) });
  const enabled = role.data === true;

  const items = useQuery({
    queryKey: ["moderate", "items"],
    queryFn: () => fetchItems({}),
    enabled,
  });
  const claims = useQuery({
    queryKey: ["moderate", "claims"],
    queryFn: () => fetchClaims({}),
    enabled,
  });

  const reports = useQuery({
    queryKey: ["moderate", "reports"],
    queryFn: () => fetchReports({}),
    enabled,
  });

  const reportMutation = useMutation({
    mutationFn: actOnReport,
    onSuccess: () => {
      toast.success("จัดการรายงานแล้ว");
      queryClient.invalidateQueries({ queryKey: ["moderate"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const itemMutation = useMutation({
    mutationFn: actOnItem,
    onSuccess: () => {
      toast.success("อัปเดตรายการแล้ว");
      queryClient.invalidateQueries({ queryKey: ["moderate"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const claimMutation = useMutation({
    mutationFn: actOnClaim,
    onSuccess: () => {
      toast.success("อัปเดตคำขอแล้ว");
      queryClient.invalidateQueries({ queryKey: ["moderate"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (role.isLoading) {
    return <p className="px-5 pt-10 text-sm text-muted-foreground">กำลังโหลด…</p>;
  }

  if (!enabled) {
    return (
      <div className="px-5 pt-10">
        <h1 className="text-xl font-bold">เฉพาะเจ้าหน้าที่</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          หน้านี้สำหรับเจ้าหน้าที่ของโรงเรียนเท่านั้น หากคุณควรเข้าถึงได้ กรุณาติดต่อผู้ดูแลระบบ
        </p>
        <Button asChild className="mt-5">
          <Link to="/">กลับหน้าแรก</Link>
        </Button>
      </div>
    );
  }

  const pending = items.data?.pending ?? [];
  const flagged = items.data?.flagged ?? [];

  return (
    <div className="px-5 pt-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-5 text-primary" />
        <h1 className="text-xl font-bold">ศูนย์ดูแลรายการ</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        ตรวจสอบรายการใหม่และอนุมัติคำขอรับคืนของโรงเรียนคุณ
      </p>

      <section className="mt-6">
        <h2 className="text-base font-semibold">รอตรวจสอบ ({pending.length + flagged.length})</h2>
        <div className="mt-3 space-y-3">
          {[...pending, ...flagged].map((item) => (
            <div key={item.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <p className="font-medium">{item.name}</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={itemMutation.isPending}
                  onClick={() => itemMutation.mutate({ data: { itemId: item.id, action: "approve" } })}
                >
                  อนุมัติ
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={itemMutation.isPending}
                  onClick={() => itemMutation.mutate({ data: { itemId: item.id, action: "reject" } })}
                >
                  ซ่อน
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={itemMutation.isPending}
                  onClick={() => itemMutation.mutate({ data: { itemId: item.id, action: "archive" } })}
                >
                  เก็บเข้าคลัง
                </Button>
              </div>
            </div>
          ))}
          {pending.length + flagged.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              ไม่มีรายการรอตรวจสอบ
            </p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold">รายงานปัญหา ({reports.data?.length ?? 0})</h2>
        <div className="mt-3 space-y-3">
          {reports.data?.map((report) => (
            <div key={report.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <p className="font-medium">{report.itemTitle ?? "รายการ"}</p>
              <p className="mt-1 text-xs text-muted-foreground">“{report.reason}”</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {report.itemId && (
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/item/$itemId" params={{ itemId: report.itemId }} search={{ q: undefined }}>
                      ดูรายการ
                    </Link>
                  </Button>
                )}
                <Button
                  size="sm"
                  disabled={reportMutation.isPending}
                  onClick={() => reportMutation.mutate({ data: { reportId: report.id, status: "resolved" } })}
                >
                  จัดการแล้ว
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={reportMutation.isPending}
                  onClick={() => reportMutation.mutate({ data: { reportId: report.id, status: "dismissed" } })}
                >
                  ไม่มีปัญหา
                </Button>
              </div>
            </div>
          ))}
          {(reports.data?.length ?? 0) === 0 && (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              ไม่มีรายงานที่ต้องจัดการ
            </p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold">คำขอรับคืน ({claims.data?.length ?? 0})</h2>
        <div className="mt-3 space-y-3">
          {claims.data?.map((claim) => (
            <div key={claim.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{claim.items?.title ?? "รายการ"}</p>
                <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">
                  {CLAIM_STATE_TH[claim.state] ?? claim.state}
                </span>
              </div>
              {claim.message && (
                <p className="mt-1 text-xs text-muted-foreground">“{claim.message}”</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {claim.state === "pending" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={claimMutation.isPending}
                    onClick={() => claimMutation.mutate({ data: { claimId: claim.id, next: "reviewing" } })}
                  >
                    เริ่มตรวจสอบ
                  </Button>
                )}
                {claim.state !== "approved" && (
                  <Button
                    size="sm"
                    disabled={claimMutation.isPending}
                    onClick={() => claimMutation.mutate({ data: { claimId: claim.id, next: "approved" } })}
                  >
                    อนุมัติ
                  </Button>
                )}
                {claim.state === "approved" && (
                  <Button
                    size="sm"
                    disabled={claimMutation.isPending}
                    onClick={() => claimMutation.mutate({ data: { claimId: claim.id, next: "returned" } })}
                  >
                    ส่งคืนเจ้าของแล้ว
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={claimMutation.isPending}
                  onClick={() => claimMutation.mutate({ data: { claimId: claim.id, next: "rejected" } })}
                >
                  ไม่อนุมัติ
                </Button>
              </div>
            </div>
          ))}
          {claims.data?.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              ไม่มีคำขอรับคืนที่ต้องดำเนินการ
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

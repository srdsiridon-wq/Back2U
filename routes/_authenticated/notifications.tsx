import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BellOff, CheckCheck } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/back2u/data";
import {
  listNotifications,
  markNotificationsRead,
} from "@/lib/back2u/notifications.functions";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "การแจ้งเตือน — Back2U" },
      {
        name: "description",
        content: "ดูว่ามีใครเจอของของคุณ หรือมีของที่คล้ายกับที่คุณแจ้งหายไว้บน Back2U",
      },
      { property: "og:title", content: "การแจ้งเตือน — Back2U" },
      { property: "og:description", content: "อัปเดตเรื่องของหายและคำขอรับคืนของคุณ" },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const queryClient = useQueryClient();
  const fetchAll = useServerFn(listNotifications);
  const markRead = useServerFn(markNotificationsRead);
  const list = useQuery({ queryKey: ["notifications"], queryFn: () => fetchAll({}) });

  useEffect(() => {
    if (!list.data?.some((entry) => !entry.readAt)) return;
    void markRead({ data: {} }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] });
    });
  }, [list.data, markRead, queryClient]);

  return (
    <div className="px-5 pb-10 pt-8">
      <h1 className="text-2xl">การแจ้งเตือน</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        อัปเดตเมื่อมีคนเจอของของคุณ หรือมีของที่คล้ายกันถูกแจ้งเข้ามา
      </p>

      <div className="mt-6 space-y-3">
        {list.isLoading && <p className="text-sm text-muted-foreground">กำลังโหลด…</p>}

        {list.data?.map((entry) => {
          const card = (
            <div
              className={`rounded-2xl border p-4 shadow-card ${
                entry.readAt ? "border-border bg-card" : "border-primary/30 bg-primary/5"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium leading-snug">{entry.title}</p>
                {!entry.readAt && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
              </div>
              {entry.body && (
                <p className="mt-1 text-sm text-muted-foreground">{entry.body}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">{formatDate(entry.createdAt)}</p>
            </div>
          );
          return entry.itemId ? (
            <Link key={entry.id} to="/item/$itemId" params={{ itemId: entry.itemId }} search={{ q: undefined }} className="block">
              {card}
            </Link>
          ) : (
            <div key={entry.id}>{card}</div>
          );
        })}

        {list.data?.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <BellOff className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <p className="mt-2 text-sm text-muted-foreground">ยังไม่มีการแจ้งเตือน</p>
          </div>
        )}
      </div>

      {!!list.data?.length && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-4 w-full"
          onClick={async () => {
            await markRead({ data: {} });
            await queryClient.invalidateQueries({ queryKey: ["notifications"] });
          }}
        >
          <CheckCheck className="mr-1.5 h-4 w-4" aria-hidden="true" />
          อ่านทั้งหมดแล้ว
        </Button>
      )}
    </div>
  );
}

import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import { CheckCircle2, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { deleteItem, resolveItem } from "@/lib/back2u/items.functions";
import { ITEMS_QUERY_KEY } from "@/lib/back2u/store";
import type { ItemLifecycle } from "@/lib/back2u/types";

interface OwnerActionsProps {
  itemId: string;
  lifecycle?: ItemLifecycle;
  /** Where to go after the post is deleted. */
  redirectAfterDelete?: string;
}

/** Buttons only the person who reported an item sees. */
export function OwnerActions({ itemId, lifecycle, redirectAfterDelete }: OwnerActionsProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const resolve = useServerFn(resolveItem);
  const remove = useServerFn(deleteItem);
  const [busy, setBusy] = useState<"resolve" | "delete" | null>(null);

  const settled = lifecycle === "returned" || lifecycle === "archived";

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ITEMS_QUERY_KEY });
    await queryClient.invalidateQueries({ queryKey: ["me"] });
  }

  async function toggleResolved() {
    setBusy("resolve");
    try {
      await resolve({ data: { id: itemId, resolved: !settled } });
      await refresh();
      toast.success(settled ? "เปิดรายการนี้อีกครั้งแล้ว" : "ปิดเรื่องแล้ว รายการถูกซ่อนจากรายการทั้งหมด");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (!window.confirm("ลบโพสต์นี้ใช่ไหม การลบไม่สามารถย้อนกลับได้")) return;
    setBusy("delete");
    try {
      const result = await remove({ data: { id: itemId } });
      await refresh();
      toast.success(result.archived ? "เก็บโพสต์เข้าคลังแล้ว" : "ลบโพสต์แล้ว");
      if (redirectAfterDelete) router.navigate({ to: redirectAfterDelete });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ลบไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-3 flex gap-2">
      <Button
        type="button"
        variant={settled ? "outline" : "default"}
        className="h-11 flex-1 rounded-xl"
        disabled={busy !== null}
        onClick={toggleResolved}
      >
        {settled ? (
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        )}
        {settled ? "เปิดรายการอีกครั้ง" : "เจอแล้ว / ได้คืนแล้ว"}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-11 rounded-xl text-destructive"
        disabled={busy !== null}
        onClick={handleDelete}
        aria-label="ลบโพสต์"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        ลบ
      </Button>
    </div>
  );
}

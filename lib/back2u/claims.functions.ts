import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logEvent, rateGuard } from "./items.server";
import { notify } from "./notifications.server";

/**
 * Claim & return workflow.
 *
 * pending → reviewing → approved → collected, plus rejected / cancelled.
 * State transitions run inside the `review_claim` / `cancel_claim` database
 * functions so the claim, the item status and the return record always move
 * together.
 */

export const CLAIM_STATE_TH: Record<string, string> = {
  pending: "รอตรวจสอบ",
  reviewing: "กำลังตรวจสอบ",
  approved: "อนุมัติแล้ว",
  rejected: "ไม่อนุมัติ",
  cancelled: "ยกเลิกแล้ว",
  collected: "รับคืนแล้ว",
  returned: "คืนของแล้ว",
};

export const createClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        itemId: z.string().uuid(),
        message: z.string().trim().max(500).optional(),
        proof: z.string().trim().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ id: string; duplicate: boolean }> => {
    const { supabase, userId } = context;

    await rateGuard({
      bucket: "claim",
      subject: userId,
      limit: 15,
      message: "ส่งคำขอถี่เกินไป กรุณาลองใหม่ในภายหลัง",
    });

    const { data: existing } = await supabase
      .from("claims")
      .select("id, state")
      .eq("item_id", data.itemId)
      .eq("claimant_id", userId)
      .in("state", ["pending", "reviewing", "approved"])
      .maybeSingle();
    if (existing) return { id: existing.id, duplicate: true };

    const { data: row, error } = await supabase
      .from("claims")
      .insert({
        item_id: data.itemId,
        claimant_id: userId,
        message: data.message ?? "",
        proof: data.proof ?? null,
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "ส่งคำขอไม่สำเร็จ");

    // Notify the person who reported the item.
    const { data: item } = await supabase
      .from("items")
      .select("title, kind, reporter_id")
      .eq("id", data.itemId)
      .maybeSingle();
    if (item?.reporter_id && item.reporter_id !== userId) {
      await notify([
        {
          userId: item.reporter_id,
          type: "claim_created",
          title:
            item.kind === "lost"
              ? `มีคนบอกว่าเจอ "${item.title}" ของคุณ`
              : `มีคนขอรับคืน "${item.title}"`,
          body: data.message?.trim() || "เปิดดูรายละเอียดเพื่อติดต่อกัน",
          itemId: data.itemId,
          claimId: row.id,
        },
      ]);
    }

    await logEvent("claim_created", { itemId: data.itemId, claimId: row.id });
    return { id: row.id, duplicate: false };
  });

export const listMyClaims = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("claims")
      .select("id, state, message, created_at, item_id, items(title, handover_point, status)")
      .eq("claimant_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const cancelClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ claimId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.rpc("cancel_claim", { _claim_id: data.claimId });
    if (error) throw new Error(error.message);
    await logEvent("claim_cancelled", { claimId: data.claimId });
    return { ok: true };
  });

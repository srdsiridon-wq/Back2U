import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logEvent, mapRows } from "./items.server";
import type { Item } from "./types";
import { CLAIM_STATE_LABEL } from "./claim-labels";

/**
 * Moderator queue.
 *
 * Every query below runs through the caller's RLS-scoped client, so a
 * moderator can only ever see and act on items belonging to their own school.
 * The role itself is checked in the database (`moderates_item`), never here.
 */

export const isModerator = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<boolean> => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    return (data ?? []).some((row) => row.role === "moderator" || row.role === "school_admin");
  });

export const listModerationQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ pending: Item[]; flagged: Item[] }> => {
    const { supabase } = context;
    const [{ data: pending }, { data: reports }] = await Promise.all([
      supabase
        .from("items")
        .select("*")
        .eq("moderation_state", "pending")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("moderation_reports")
        .select("item_id")
        .eq("status", "open")
        .limit(50),
    ]);

    const flaggedIds = [...new Set((reports ?? []).map((row) => row.item_id).filter(Boolean))] as string[];
    const { data: flaggedRows } = flaggedIds.length
      ? await supabase.from("items").select("*").in("id", flaggedIds)
      : { data: [] };

    return {
      pending: await mapRows(supabase, pending ?? []),
      flagged: await mapRows(supabase, flaggedRows ?? []),
    };
  });

export const moderateItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        itemId: z.string().uuid(),
        action: z.enum(["approve", "reject", "archive"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const patch =
      data.action === "approve"
        ? { moderation_state: "approved" as const }
        : data.action === "reject"
          ? { moderation_state: "rejected" as const }
          : { status: "archived" as const };

    const { error } = await context.supabase.from("items").update(patch).eq("id", data.itemId);
    if (error) throw new Error(error.message);

    await logEvent(`item_${data.action}d`, { itemId: data.itemId });
    return { ok: true };
  });

export const listClaimQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("claims")
      .select("id, state, message, proof, created_at, item_id, items(title, handover_point)")
      .in("state", ["pending", "reviewing", "approved"])
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const reviewClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        claimId: z.string().uuid(),
        next: z.enum(["reviewing", "approved", "rejected", "collected", "returned"]),
        note: z.string().trim().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.rpc("review_claim", {
      _claim_id: data.claimId,
      _next: data.next,
      ...(data.note ? { _note: data.note } : {}),
    });
    if (error) throw new Error(error.message);

    const { data: claim } = await context.supabase
      .from("claims")
      .select("claimant_id, items(title)")
      .eq("id", data.claimId)
      .maybeSingle();
    if (claim?.claimant_id) {
      const { notify } = await import("./notifications.server");
      await notify([
        {
          userId: claim.claimant_id,
          type: `claim_${data.next}`,
          title: `คำขอรับคืน "${claim.items?.title ?? "รายการ"}" ${CLAIM_STATE_LABEL[data.next] ?? data.next}`,
          body: data.note ?? "",
          claimId: data.claimId,
        },
      ]);
    }

    await logEvent(data.next === "returned" ? "item_returned" : `claim_${data.next}`, {
      claimId: data.claimId,
    });
    return { ok: true };
  });

/** Anyone signed in can flag a listing or one of its images for review. */
export const flagItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        itemId: z.string().uuid(),
        reason: z.string().trim().min(3).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.from("moderation_reports").insert({
      item_id: data.itemId,
      reported_by: context.userId,
      reason: data.reason,
    });
    if (error) throw new Error(error.message);
    await logEvent("item_flagged", { itemId: data.itemId });
    return { ok: true };
  });

export interface FlaggedReport {
  id: string;
  reason: string;
  createdAt: string;
  itemId: string | null;
  itemTitle: string | null;
}

export const listOpenReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FlaggedReport[]> => {
    const { data, error } = await context.supabase
      .from("moderation_reports")
      .select("id, reason, created_at, item_id, items(title)")
      .eq("status", "open")
      .order("created_at", { ascending: true })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: row.id,
      reason: row.reason,
      createdAt: row.created_at,
      itemId: row.item_id,
      itemTitle: (row.items as { title: string } | null)?.title ?? null,
    }));
  });

/** Resolve or dismiss a flag. The database RPC enforces moderator rights. */
export const resolveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        reportId: z.string().uuid(),
        status: z.enum(["resolved", "dismissed"]),
        note: z.string().trim().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.rpc("resolve_moderation_report", {
      _report_id: data.reportId,
      _status: data.status,
      ...(data.note ? { _note: data.note } : {}),
    });
    if (error) throw new Error(error.message);
    await logEvent(`report_${data.status}`, {});
    return { ok: true };
  });


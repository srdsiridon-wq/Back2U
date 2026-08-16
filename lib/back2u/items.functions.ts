import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CATEGORIES, COLORS } from "./types";
import type { Item } from "./types";
import { MATCH_THRESHOLD, scoreItem } from "./match";
import {
  logEvent,
  mapRows,
  publicClient,
  rateGuard,
  schoolIdForUser,
  signImageSets,
  toItem,
} from "./items.server";
import type { MatchOutcome } from "./matching/types";
import { notify } from "./notifications.server";

const BUILDING_CODES = ["main", "science", "library", "cafeteria", "arts", "gym", "field"] as const;
const LIFECYCLE = ["open", "matched", "claimed", "returned"] as const;


const listSchema = z.object({
  kind: z.enum(["lost", "found"]).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  /** Demo rows stay visible by default; production callers can exclude them. */
  includeDemo: z.boolean().optional(),
});

export const listItems = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => listSchema.parse(input ?? {}))
  .handler(async ({ data }): Promise<Item[]> => {
    const client = publicClient();
    let query = client
      .from("items")
      .select("*")
      .eq("moderation_state", "approved")
      .in("status", ["open", "matched", "claimed"])
      .order("occurred_at", { ascending: false })
      .limit(data.limit ?? 50);
    if (data.kind) query = query.eq("kind", data.kind);
    if (data.includeDemo === false) query = query.eq("is_demo", false);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return mapRows(client, rows ?? []);
  });

export const getItem = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<Item | null> => {
    const client = publicClient();
    const { data: row } = await client
      .from("items")
      .select("*")
      .eq("id", data.id)
      .eq("moderation_state", "approved")
      .in("status", ["open", "matched", "claimed"])
      .maybeSingle();
    if (!row) return null;
    const [item] = await mapRows(client, [row]);
    await logEvent("item_view", { schoolId: row.school_id, itemId: row.id });
    return item ?? toItem(row);
  });

const searchSchema = z.object({
  q: z.string().max(200).optional(),
  kind: z.enum(["lost", "found"]).optional(),
  category: z.enum(CATEGORIES).optional(),
  color: z.enum(COLORS).optional(),
  building: z.enum(BUILDING_CODES).optional(),
  lifecycle: z.enum(LIFECYCLE).optional(),
  includeDemo: z.boolean().optional(),
});

export interface SearchHit {
  item: Item;
  score?: number;
  reasons: { label: string; hit: boolean }[];
}

function callerKey(): string {
  const forwarded = getRequestHeader("x-forwarded-for") ?? getRequestHeader("cf-connecting-ip");
  return (forwarded ?? "unknown").split(",")[0]!.trim() || "unknown";
}

export const searchItems = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => searchSchema.parse(input ?? {}))
  .handler(async ({ data }): Promise<SearchHit[]> => {
    const q = data.q?.trim();
    if (q) {
      await rateGuard({
        bucket: "search",
        subject: callerKey(),
        limit: 120,
        message: "ค้นหาถี่เกินไป กรุณารอสักครู่แล้วลองใหม่",
      });
    }

    const client = publicClient();
    let query = client
      .from("items")
      .select("*")
      .eq("moderation_state", "approved")
      .in("status", ["open", "matched", "claimed"])
      .order("occurred_at", { ascending: false })
      .limit(200);
    if (data.kind) query = query.eq("kind", data.kind);
    if (data.category) query = query.eq("category", data.category);
    if (data.color) query = query.eq("color", data.color);
    if (data.building) query = query.eq("building_code", data.building);
    if (data.lifecycle) query = query.eq("status", data.lifecycle);
    if (data.includeDemo === false) query = query.eq("is_demo", false);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const items = await mapRows(client, rows ?? []);

    if (q) await logEvent("search", { detail: { length: q.length } });
    if (!q) return items.map((item) => ({ item, reasons: [] }));

    return items
      .map((item) => {
        const { score, reasons } = scoreItem(q, item);
        return { item, score, reasons };
      })
      .filter((hit) => (hit.score ?? 0) >= MATCH_THRESHOLD)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  });


const reportSchema = z.object({
  kind: z.enum(["lost", "found"]),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(2).max(1000),
  category: z.enum(CATEGORIES),
  color: z.enum(COLORS),
  building: z.enum(BUILDING_CODES),
  floor: z.string().trim().max(40).optional(),
  room: z.string().trim().max(60).optional(),
  occurredAt: z.string().min(4).max(40),
  storagePaths: z.array(z.string().trim().max(300)).max(4).optional(),
});

export const createReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reportSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string; matches: number }> => {
    const { supabase, userId } = context;

    // Abuse guard: at most 10 reports per user per hour.
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("reporter_id", userId)
      .gte("created_at", since);
    if ((count ?? 0) >= 10) throw new Error("แจ้งรายการถี่เกินไป กรุณาลองใหม่ในภายหลัง");

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, school_id")
      .eq("id", userId)
      .maybeSingle();
    const schoolId = profile?.school_id ?? (await schoolIdForUser(supabase, userId));

    const occurredAt = new Date(data.occurredAt);
    const { data: row, error } = await supabase
      .from("items")
      .insert({
        school_id: schoolId,
        reporter_id: userId,
        kind: data.kind,
        title: data.title,
        description: data.description,
        category: data.category,
        color: data.color,
        building_code: data.building,
        floor: data.floor ?? null,
        room: data.room ?? null,
        occurred_at: Number.isNaN(occurredAt.getTime())
          ? new Date().toISOString()
          : occurredAt.toISOString(),
        handover_point: data.kind === "found" ? "ห้องธุรการ" : null,
        reporter_label: profile?.display_name || null,
        // Server-set: reports go live immediately; staff can hide them later.
        moderation_state: "approved",
        is_demo: false,
      })
      .select("*")
      .single();
    if (error || !row) throw new Error(error?.message ?? "บันทึกไม่สำเร็จ");

    const paths = data.storagePaths ?? [];
    if (paths.length) {
      await rateGuard({
        bucket: "image_upload",
        subject: userId,
        limit: 40,
        message: "อัปโหลดรูปถี่เกินไป กรุณาลองใหม่ในภายหลัง",
      });
      const { error: imageError } = await supabase.from("item_images").insert(
        paths.map((storagePath, index) => ({
          item_id: row.id,
          storage_path: storagePath,
          sort_order: index,
          is_approved: true,
        })),
      );
      if (imageError) console.warn("[back2u] image link failed", imageError.message);
    }


    // Suggest matches against opposite-kind reports in the same school only.
    const opposite = data.kind === "lost" ? "found" : "lost";
    const { data: candidates } = await supabase
      .from("items")
      .select("*")
      .eq("school_id", schoolId)
      .eq("kind", opposite)
      .eq("moderation_state", "approved")
      .in("status", ["open", "matched"])
      .limit(300);

    let matched = 0;
    try {
      const { rankCandidates } = await import("./matching/engine.server");
      const ranked = await rankCandidates(row, candidates ?? [], { minScore: 60, limit: 5 });
      matched = ranked.length;
      if (ranked.length) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("matches").upsert(
          ranked.map((entry) => ({
            lost_item_id: data.kind === "lost" ? row.id : entry.row.id,
            found_item_id: data.kind === "lost" ? entry.row.id : row.id,
            score: entry.outcome.score,
            reasons: entry.outcome as unknown as never,
          })),
          { onConflict: "lost_item_id,found_item_id" },
        );

        // Tell the people who reported the matching items that something close
        // to their report just showed up.
        await notify(
          ranked
            .filter((entry) => entry.row.reporter_id && entry.row.reporter_id !== userId)
            .map((entry) => ({
              userId: entry.row.reporter_id!,
              type: "match_suggested",
              title:
                data.kind === "found"
                  ? `มีคนเจอของที่คล้ายกับ "${entry.row.title}"`
                  : `มีคนแจ้งหาของที่คล้ายกับ "${entry.row.title}"`,
              body: `ความคล้าย ${entry.outcome.score}% — ${data.title}`,
              itemId: row.id,
            })),
        );
      }
    } catch (matchError) {
      console.warn("[back2u] matching skipped", matchError);
    }

    await logEvent("report_created", {
      schoolId,
      itemId: row.id,
      detail: { kind: data.kind, matches: matched },
    });

    return { id: row.id, matches: matched };

  });

export const listMyItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Item[]> => {
    const { data: rows, error } = await context.supabase
      .from("items")
      .select("*")
      .eq("reporter_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return mapRows(context.supabase, rows ?? []);
  });

export const updateItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().trim().min(2).max(120).optional(),
        description: z.string().trim().min(2).max(1000).optional(),
        category: z.enum(CATEGORIES).optional(),
        color: z.enum(COLORS).optional(),
        building: z.enum(BUILDING_CODES).optional(),
        floor: z.string().trim().max(40).nullable().optional(),
        room: z.string().trim().max(60).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { id, building, ...rest } = data;
    const { data: updated, error } = await context.supabase
      .from("items")
      .update({
        ...(rest.title !== undefined ? { title: rest.title } : {}),
        ...(rest.description !== undefined ? { description: rest.description } : {}),
        ...(rest.category !== undefined ? { category: rest.category } : {}),
        ...(rest.color !== undefined ? { color: rest.color } : {}),
        ...(building !== undefined ? { building_code: building } : {}),
        ...(rest.floor !== undefined ? { floor: rest.floor } : {}),
        ...(rest.room !== undefined ? { room: rest.room } : {}),
      })
      .eq("id", id)
      .eq("reporter_id", context.userId)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);

    // The database drops stale suggestions on edit; rebuild them once here so
    // the owner still sees up-to-date matches.
    if (updated && updated.status !== "returned" && updated.status !== "archived") {
      try {
        const opposite = updated.kind === "lost" ? "found" : "lost";
        const { data: candidates } = await context.supabase
          .from("items")
          .select("*")
          .eq("school_id", updated.school_id)
          .eq("kind", opposite)
          .eq("moderation_state", "approved")
          .in("status", ["open", "matched"])
          .limit(300);
        const { rankCandidates } = await import("./matching/engine.server");
        const ranked = await rankCandidates(updated, candidates ?? [], { minScore: 60, limit: 5 });
        if (ranked.length) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("matches").upsert(
            ranked.map((entry) => ({
              lost_item_id: updated.kind === "lost" ? updated.id : entry.row.id,
              found_item_id: updated.kind === "lost" ? entry.row.id : updated.id,
              score: entry.outcome.score,
              reasons: entry.outcome as unknown as never,
            })),
            { onConflict: "lost_item_id,found_item_id" },
          );
        }
      } catch (matchError) {
        console.warn("[back2u] match refresh skipped", matchError);
      }
    }
    return { ok: true };
  });

/**
 * Removes a report. Items that already carry claim or return history are
 * archived instead of deleted, so the record survives for the people involved.
 */
export const deleteItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true; archived: boolean }> => {
    const { supabase, userId } = context;

    const { count: claimCount } = await supabase
      .from("claims")
      .select("id", { count: "exact", head: true })
      .eq("item_id", data.id);
    const { count: returnCount } = await supabase
      .from("returns")
      .select("id", { count: "exact", head: true })
      .eq("item_id", data.id);

    if ((claimCount ?? 0) > 0 || (returnCount ?? 0) > 0) {
      const { error: archiveError } = await supabase
        .from("items")
        .update({ status: "archived" })
        .eq("id", data.id)
        .eq("reporter_id", userId);
      if (archiveError) throw new Error(archiveError.message);
      await logEvent("item_archived", { itemId: data.id });
      return { ok: true, archived: true };
    }

    const { data: images } = await supabase
      .from("item_images")
      .select("storage_path")
      .eq("item_id", data.id);

    const { error } = await supabase
      .from("items")
      .delete()
      .eq("id", data.id)
      .eq("reporter_id", userId);
    if (error) throw new Error(error.message);

    const paths = (images ?? []).map((image) => image.storage_path).filter(Boolean);
    if (paths.length) await supabase.storage.from("item-images").remove(paths);
    return { ok: true, archived: false };
  });


/** Images with signed URLs plus the storage path, for owner management. */
export const listItemImages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ itemId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sets = await signImageSets(context.supabase, [data.itemId]);
    return sets.get(data.itemId) ?? [];
  });

export const addItemImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ itemId: z.string().uuid(), storagePath: z.string().trim().min(3).max(300) })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await rateGuard({
      bucket: "image_upload",
      subject: context.userId,
      limit: 40,
      message: "อัปโหลดรูปถี่เกินไป กรุณาลองใหม่ในภายหลัง",
    });

    const { count } = await context.supabase
      .from("item_images")
      .select("id", { count: "exact", head: true })
      .eq("item_id", data.itemId);
    if ((count ?? 0) >= 4) throw new Error("เพิ่มรูปได้สูงสุด 4 รูป");

    const { error } = await context.supabase
      .from("item_images")
      .insert({
        item_id: data.itemId,
        storage_path: data.storagePath,
        sort_order: count ?? 0,
        is_approved: false,
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const deleteItemImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ imageId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { data: image } = await context.supabase
      .from("item_images")
      .select("storage_path")
      .eq("id", data.imageId)
      .maybeSingle();
    const { error } = await context.supabase.from("item_images").delete().eq("id", data.imageId);
    if (error) throw new Error(error.message);
    if (image?.storage_path) {
      await context.supabase.storage.from("item-images").remove([image.storage_path]);
    }
    return { ok: true };
  });

export interface SuggestedMatch {
  item: Item;
  outcome: MatchOutcome;
}

/** Suggested matches for an item the caller reported. */
export const listMatchesForItem = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ itemId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<SuggestedMatch[]> => {
    const { supabase } = context;
    const { data: rows } = await supabase
      .from("matches")
      .select("score, reasons, lost_item_id, found_item_id")
      .or(`lost_item_id.eq.${data.itemId},found_item_id.eq.${data.itemId}`)
      .order("score", { ascending: false })
      .limit(10);
    if (!rows?.length) return [];

    const otherIds = rows.map((row) =>
      row.lost_item_id === data.itemId ? row.found_item_id : row.lost_item_id,
    );
    const { data: items } = await supabase.from("items").select("*").in("id", otherIds);
    const mapped = await mapRows(supabase, items ?? []);
    const byId = new Map(mapped.map((item) => [item.id, item]));

    await logEvent("match_viewed", { itemId: data.itemId });

    return rows
      .map((row) => {
        const id = row.lost_item_id === data.itemId ? row.found_item_id : row.lost_item_id;
        const item = byId.get(id);
        if (!item) return null;
        const outcome = row.reasons as unknown as MatchOutcome;
        return {
          item,
          outcome:
            outcome && typeof outcome === "object" && "signals" in outcome
              ? outcome
              : {
                  score: row.score,
                  confidence: row.score >= 80 ? "STRONG" : row.score >= 55 ? "POSSIBLE" : "LOW",
                  explanation: "ระบบพบว่าใกล้เคียงกับรายการของคุณ",
                  signals: [],
                  engine: "rule-v1",
                },
        } as SuggestedMatch;
      })
      .filter((entry): entry is SuggestedMatch => entry !== null);
  });

/**
 * Owner marks their report as settled ("เจอแล้ว"). Resolved items drop out of
 * every public list so the feed stays clean; the owner can reopen if needed.
 */
export const resolveItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), resolved: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const { data: updated, error } = await supabase
      .from("items")
      .update({ status: data.resolved ? "returned" : "open" })
      .eq("id", data.id)
      .eq("reporter_id", userId)
      .select("id, title")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) throw new Error("ไม่พบรายการของคุณ");

    if (data.resolved) {
      // Close out any claims still waiting on this item and let claimants know.
      const { data: claims } = await supabase
        .from("claims")
        .select("id, claimant_id, state")
        .eq("item_id", data.id)
        .in("state", ["pending", "reviewing"]);
      if (claims?.length) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin
          .from("claims")
          .update({ state: "cancelled" })
          .in(
            "id",
            claims.map((claim) => claim.id),
          );
        await notify(
          claims.map((claim) => ({
            userId: claim.claimant_id,
            type: "item_resolved",
            title: `"${updated.title}" ปิดเรื่องแล้ว`,
            body: "เจ้าของแจ้งว่าได้ของคืนแล้ว คำขอของคุณจึงถูกปิด",
            itemId: data.id,
          })),
        );
      }
      await logEvent("item_resolved", { itemId: data.id });
    }
    return { ok: true };
  });

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { IMAGES } from "./data";
import type { BuildingId, Category, Item, ItemColor, ItemStatus } from "./types";

/** The single school this deployment serves. Never taken from the client. */
export const DEMO_SCHOOL_ID = "11111111-1111-4111-8111-111111111111";

export type ItemRow = Database["public"]["Tables"]["items"]["Row"];

/** Publishable-key client for public reads (RLS applies as anon). */
export function publicClient(): SupabaseClient<Database> {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

/** Resolves the caller's school server-side; clients never supply it. */
export async function schoolIdForUser(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<string> {
  const { data } = await client.from("profiles").select("school_id").eq("id", userId).maybeSingle();
  return data?.school_id ?? DEMO_SCHOOL_ID;
}

const LEGACY_IMAGES = IMAGES as Record<string, string>;

async function signPaths(paths: string[]): Promise<Map<string, string>> {
  const byPath = new Map<string, string>();
  if (!paths.length) return byPath;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: signed } = await supabaseAdmin.storage
    .from("item-images")
    .createSignedUrls(paths, 60 * 60);
  for (const entry of signed ?? []) {
    if (entry.path && entry.signedUrl) byPath.set(entry.path, entry.signedUrl);
  }
  return byPath;
}

/** All signed image URLs per item, ordered by sort_order. */
export async function signImageSets(
  client: SupabaseClient<Database>,
  itemIds: string[],
): Promise<Map<string, { id: string; path: string; url: string }[]>> {
  const result = new Map<string, { id: string; path: string; url: string }[]>();
  if (!itemIds.length) return result;

  const { data } = await client
    .from("item_images")
    .select("id, item_id, storage_path, sort_order")
    .in("item_id", itemIds)
    .order("sort_order", { ascending: true });

  const rows = data ?? [];
  const byPath = await signPaths([...new Set(rows.map((row) => row.storage_path))]);
  for (const row of rows) {
    const url = byPath.get(row.storage_path);
    if (!url) continue;
    const list = result.get(row.item_id) ?? [];
    list.push({ id: row.id, path: row.storage_path, url });
    result.set(row.item_id, list);
  }
  return result;
}

export function toItem(row: ItemRow, images: string[] = []): Item {
  const fallback = LEGACY_IMAGES[row.legacy_image_key ?? ""] ?? IMAGES.misc;
  return {
    id: row.id,
    name: row.title,
    description: row.description,
    category: row.category as Category,
    color: row.color as ItemColor,
    status: row.kind as ItemStatus,
    location: {
      building: (row.building_code ?? "main") as BuildingId,
      ...(row.floor ? { floor: row.floor } : {}),
      ...(row.room ? { room: row.room } : {}),
    },
    date: row.occurred_at,
    image: images[0] ?? fallback,
    images: images.length ? images : [fallback],
    lifecycle: row.status,
    ...(row.handover_point ? { handoverPoint: row.handover_point } : {}),
    ...(row.reporter_label ? { reportedBy: row.reporter_label } : {}),
  };
}

export async function mapRows(
  client: SupabaseClient<Database>,
  rows: ItemRow[],
): Promise<Item[]> {
  const sets = await signImageSets(
    client,
    rows.filter((row) => !row.legacy_image_key).map((row) => row.id),
  );
  return rows.map((row) => toItem(row, (sets.get(row.id) ?? []).map((entry) => entry.url)));
}

/**
 * Product analytics. Awaited so the serverless worker cannot exit before the
 * insert lands, but never allowed to break the user action it describes.
 */
export async function logEvent(
  event: string,
  payload: { schoolId?: string; itemId?: string; claimId?: string; detail?: Record<string, unknown> } = {},
): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("analytics_events").insert({
      school_id: payload.schoolId ?? DEMO_SCHOOL_ID,
      event,
      item_id: payload.itemId ?? null,
      claim_id: payload.claimId ?? null,
      detail: (payload.detail ?? {}) as never,
    });
    if (error) console.error("[back2u] analytics insert failed", event, error.message);
  } catch (error) {
    console.error("[back2u] analytics event dropped", event, error);
  }
}

/**
 * Minimal server-side abuse guard. Counts recent attempts per subject in
 * `rate_events` (service-role only) and throws once the limit is reached.
 */
export async function rateGuard(options: {
  bucket: string;
  subject: string;
  limit: number;
  windowMinutes?: number;
  message: string;
}): Promise<void> {
  const { bucket, subject, limit, windowMinutes = 60, message } = options;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
    const { count, error } = await supabaseAdmin
      .from("rate_events")
      .select("id", { count: "exact", head: true })
      .eq("bucket", bucket)
      .eq("subject", subject)
      .gte("created_at", since);
    if (error) {
      console.error("[back2u] rate guard read failed", bucket, error.message);
      return;
    }
    if ((count ?? 0) >= limit) throw new Error(message);
    await supabaseAdmin.from("rate_events").insert({ bucket, subject });
  } catch (error) {
    if (error instanceof Error && error.message === message) throw error;
    console.error("[back2u] rate guard skipped", bucket, error);
  }
}


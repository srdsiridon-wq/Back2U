/**
 * Notification writes. Always performed with the service-role client because
 * the recipient is somebody other than the caller.
 */
export interface NotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  itemId?: string | null;
  claimId?: string | null;
}

export async function notify(inputs: NotificationInput[]): Promise<void> {
  const rows = inputs.filter((input) => Boolean(input.userId));
  if (!rows.length) return;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("notifications").insert(
      rows.map((row) => ({
        user_id: row.userId,
        type: row.type,
        title: row.title,
        body: row.body ?? "",
        item_id: row.itemId ?? null,
        claim_id: row.claimId ?? null,
      })),
    );
    if (error) console.error("[back2u] notification insert failed", error.message);
  } catch (error) {
    console.error("[back2u] notification dropped", error);
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/cron/cleanup-stale
 * Vercel Cron: runs every 6 hours.
 *
 * 1. Marks sailing vessels as 'sailed' when sailing_date + sailing_time
 *    was more than 6 hours ago.
 * 2. Clears is_new flags on vessels that have been marked new for > 30 minutes.
 * 3. Cancels any remaining scheduled alerts for sailed vessels.
 *
 * Protected by CRON_SECRET header.
 */
export async function GET(request: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "Server misconfiguration: CRON_SECRET not set" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();

  let markedSailed = 0;
  let clearedNew = 0;

  // ── 1. Mark stale sailing vessels as 'sailed' ────────────────────────────────
  const { data: sailingVessels, error: sailingFetchError } = await supabase
    .from("vessels")
    .select("id, name, sailing_date, sailing_time")
    .eq("status", "sailing")
    .not("sailing_date", "is", null);

  if (sailingFetchError) {
    console.error(
      "[cleanup-stale] Failed to fetch sailing vessels:",
      sailingFetchError.message
    );
  } else if (sailingVessels && sailingVessels.length > 0) {
    const staleIds: string[] = [];

    for (const vessel of sailingVessels) {
      if (!vessel.sailing_date) continue;

      const sailingTime = vessel.sailing_time ?? "23:59";
      const timeStr = sailingTime.length === 5 ? `${sailingTime}:00` : sailingTime;
      const sailingDatetime = new Date(`${vessel.sailing_date}T${timeStr}`);

      // Stale if sailing_datetime + 6 hours is in the past
      if (sailingDatetime.getTime() + 6 * 60 * 60 * 1000 <= now.getTime()) {
        staleIds.push(vessel.id);
      }
    }

    if (staleIds.length > 0) {
      const { error: updateError } = await supabase
        .from("vessels")
        .update({
          status: "sailed",
          visit_end: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .in("id", staleIds);

      if (updateError) {
        console.error(
          "[cleanup-stale] Failed to mark vessels sailed:",
          updateError.message
        );
      } else {
        markedSailed = staleIds.length;

        // Record status history
        const historyRows = staleIds.map((vesselId) => ({
          vessel_id: vesselId,
          status: "sailed",
          source: "system",
          details: { reason: "auto_cleanup_stale" },
        }));
        await supabase.from("vessel_status_history").insert(historyRows);

        // Cancel any lingering scheduled alerts for these vessels
        await supabase
          .from("alerts")
          .update({
            status: "cancelled",
            cancelled_at: now.toISOString(),
            cancel_reason: "vessel_sailed",
            updated_at: now.toISOString(),
          })
          .eq("status", "scheduled")
          .in("vessel_id", staleIds);
      }
    }
  }

  // ── 2. Clear is_new flags older than 30 minutes ─────────────────────────────
  const { error: clearNewError } = await supabase
    .from("vessels")
    .update({ is_new: false, updated_at: now.toISOString() })
    .eq("is_new", true)
    .lte("new_since", thirtyMinutesAgo);

  if (clearNewError) {
    console.error(
      "[cleanup-stale] Failed to clear is_new flags:",
      clearNewError.message
    );
  } else {
    // We don't get a count from this update without a select, so approximate
    clearedNew = 0; // Non-critical stat
  }

  const result = { markedSailed, clearedNew };
  console.log("[cleanup-stale] Complete:", result);

  return NextResponse.json(result);
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/require-auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/alerts/[id]/dismiss
 *
 * Records that the user has dismissed the alert banner in the UI.
 * Does NOT cancel the alert or prevent SMS from being sent.
 * Does NOT mark the device as retrieved.
 *
 * Stores the dismissal in the alert's delivery_status JSONB field so that
 * the UI can filter it out on reload.
 *
 * 401 if not authenticated, 404 if alert not found.
 */
export async function POST(
  _req: Request,
  { params }: RouteContext
) {
  const { user, response: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const supabase = await createClient();

  // Fetch the alert to verify it exists and belongs to an active context
  const { data: alert, error: fetchError } = await supabase
    .from("alerts")
    .select("id, status, delivery_status")
    .eq("id", id)
    .single();

  if (fetchError || !alert) {
    if (fetchError?.code === "PGRST116") {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to fetch alert" },
      { status: 500 }
    );
  }

  // Merge the dismissed flag into delivery_status JSONB
  const existingDeliveryStatus =
    typeof alert.delivery_status === "object" &&
    alert.delivery_status !== null &&
    !Array.isArray(alert.delivery_status)
      ? (alert.delivery_status as Record<string, unknown>)
      : {};

  const updatedDeliveryStatus = {
    ...existingDeliveryStatus,
    dismissed_by: user.id,
    dismissed_at: new Date().toISOString(),
  };

  // RLS exposes only a SELECT policy on alerts (writes belong to the cron/service
  // layer). Recording a UI dismissal is a server-controlled write — restricted here
  // to the delivery_status/updated_at fields — so it uses the service-role client.
  const adminClient = createAdminClient();
  const { error: updateError } = await adminClient
    .from("alerts")
    .update({
      delivery_status: updatedDeliveryStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

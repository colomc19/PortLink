import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

interface PatchBody {
  enabled: boolean;
}

/**
 * PATCH /api/admin/alert-recipients/[id]
 * Upserts the SMS alert opt-in for a profile. Admin only.
 * [id] is the profile_id.
 * Validates that the user has a phone number if enabling.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id: profileId } = await params;

  if (!profileId) {
    return NextResponse.json({ error: "Profile ID is required" }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json(
      { error: "'enabled' must be a boolean" },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  // If enabling, verify the user has a phone number
  if (body.enabled) {
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("phone")
      .eq("id", profileId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (!profile.phone) {
      return NextResponse.json(
        { error: "Cannot enable SMS alerts: this user has no phone number." },
        { status: 422 }
      );
    }
  }

  // Upsert the alert_recipients row (on_conflict: profile_id + method)
  const { data: recipient, error: upsertError } = await adminClient
    .from("alert_recipients")
    .upsert(
      { profile_id: profileId, method: "sms", enabled: body.enabled },
      { onConflict: "profile_id,method", ignoreDuplicates: false }
    )
    .select("profile_id, method, enabled")
    .single();

  if (upsertError) {
    console.error("[admin/alert-recipients/[id]] upsert error:", upsertError);
    return NextResponse.json(
      { error: "Failed to update alert recipient." },
      { status: 500 }
    );
  }

  return NextResponse.json({ recipient });
}

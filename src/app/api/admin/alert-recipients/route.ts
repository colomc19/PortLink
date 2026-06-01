import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AlertRecipientSummary {
  profile_id: string;
  full_name: string;
  phone: string | null;
  sms_enabled: boolean;
  has_phone: boolean;
}

/**
 * GET /api/admin/alert-recipients
 * Lists all profiles with their SMS alert opt-in status. Admin only.
 */
export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const adminClient = createAdminClient();

  // Fetch all profiles
  const { data: profiles, error: profileError } = await adminClient
    .from("profiles")
    .select("id, full_name, phone, role")
    .order("role", { ascending: true })
    .order("full_name", { ascending: true });

  if (profileError) {
    console.error("[admin/alert-recipients] profiles error:", profileError);
    return NextResponse.json(
      { error: "Failed to fetch profiles" },
      { status: 500 }
    );
  }

  // Fetch all SMS alert_recipients rows
  const { data: recipients, error: recipientError } = await adminClient
    .from("alert_recipients")
    .select("profile_id, enabled, method")
    .eq("method", "sms");

  if (recipientError) {
    console.error("[admin/alert-recipients] recipients error:", recipientError);
    return NextResponse.json(
      { error: "Failed to fetch alert recipients" },
      { status: 500 }
    );
  }

  // Build lookup: profile_id -> enabled
  const smsEnabledByProfileId = new Map<string, boolean>();
  for (const r of recipients ?? []) {
    smsEnabledByProfileId.set(r.profile_id, r.enabled);
  }

  const result: AlertRecipientSummary[] = (profiles ?? [])
    .map((p) => ({
      profile_id: p.id,
      full_name: p.full_name,
      phone: p.phone,
      sms_enabled: smsEnabledByProfileId.get(p.id) ?? false,
      has_phone: !!p.phone,
    }))
    .sort((a, b) => {
      // Enabled first, then by name
      if (a.sms_enabled !== b.sms_enabled) return a.sms_enabled ? -1 : 1;
      return a.full_name.localeCompare(b.full_name);
    });

  return NextResponse.json({ recipients: result });
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export interface UserSummary {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  receives_alerts: boolean;
  created_at: string;
}

/**
 * GET /api/admin/users
 * Lists all profiles with email from auth.users. Admin only.
 * Sorted: admin first, then by full_name.
 */
export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const adminClient = createAdminClient();

  // Fetch all auth users (includes email)
  const { data: authData, error: authError } =
    await adminClient.auth.admin.listUsers({ perPage: 1000 });

  if (authError) {
    console.error("[admin/users] listUsers error:", authError);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }

  // Fetch all profiles
  const { data: profiles, error: profileError } = await adminClient
    .from("profiles")
    .select("id, full_name, phone, role, receives_alerts, created_at")
    .order("role", { ascending: true }) // admin < volunteer alphabetically
    .order("full_name", { ascending: true });

  if (profileError) {
    console.error("[admin/users] profiles error:", profileError);
    return NextResponse.json(
      { error: "Failed to fetch profiles" },
      { status: 500 }
    );
  }

  // Build email lookup from auth users
  const emailByUserId = new Map<string, string>();
  for (const authUser of authData.users) {
    emailByUserId.set(authUser.id, authUser.email ?? "");
  }

  // Join profiles with email, sort admins first
  const users: UserSummary[] = profiles
    .map((profile) => ({
      id: profile.id,
      full_name: profile.full_name,
      email: emailByUserId.get(profile.id) ?? "",
      phone: profile.phone,
      role: profile.role,
      receives_alerts: profile.receives_alerts,
      created_at: profile.created_at,
    }))
    .sort((a, b) => {
      if (a.role === b.role) return a.full_name.localeCompare(b.full_name);
      return a.role === "admin" ? -1 : 1;
    });

  return NextResponse.json({ users });
}

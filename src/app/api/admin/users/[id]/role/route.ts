import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

interface RoleBody {
  role: "admin" | "volunteer";
}

/**
 * PATCH /api/admin/users/[id]/role
 * Updates a user's role. Admin only. Cannot change your own role.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  // Prevent self-role-change
  if (user!.id === id) {
    return NextResponse.json(
      { error: "You cannot change your own role." },
      { status: 400 }
    );
  }

  let body: RoleBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { role } = body;

  if (role !== "admin" && role !== "volunteer") {
    return NextResponse.json(
      { error: "Role must be 'admin' or 'volunteer'" },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  const { data: profile, error } = await adminClient
    .from("profiles")
    .update({ role })
    .eq("id", id)
    .select("id, full_name, role, phone, receives_alerts")
    .single();

  if (error) {
    console.error("[admin/users/[id]/role] update error:", error);
    return NextResponse.json(
      { error: "Failed to update role." },
      { status: 500 }
    );
  }

  return NextResponse.json({ profile });
}

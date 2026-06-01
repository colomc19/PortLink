import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * DELETE /api/admin/users/[id]
 * Deletes a user from Supabase Auth. Admin only.
 * Cannot delete yourself. Profile cascades via FK.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  // Prevent self-deletion
  if (user!.id === id) {
    return NextResponse.json(
      { error: "You cannot remove your own account." },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient.auth.admin.deleteUser(id);

  if (error) {
    console.error("[admin/users/[id]] deleteUser error:", error);
    return NextResponse.json(
      { error: "Failed to delete user." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

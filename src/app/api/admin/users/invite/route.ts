import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

interface InviteBody {
  email: string;
  fullName: string;
  role?: "volunteer" | "admin";
}

/**
 * POST /api/admin/users/invite
 * Invites a new user by email. Admin only.
 * The handle_new_user trigger auto-creates the profile row.
 * If role is 'admin', we update the profile after invite.
 */
export async function POST(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  let body: InviteBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, fullName, role = "volunteer" } = body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
    return NextResponse.json({ error: "Full name is required" }, { status: 400 });
  }
  if (role !== "volunteer" && role !== "admin") {
    return NextResponse.json(
      { error: "Role must be 'volunteer' or 'admin'" },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(
    email.trim().toLowerCase(),
    {
      data: { full_name: fullName.trim() },
    }
  );

  if (error) {
    // Supabase returns a specific error when email is already registered
    const isDuplicate =
      error.message?.toLowerCase().includes("already registered") ||
      error.message?.toLowerCase().includes("already been invited") ||
      error.message?.toLowerCase().includes("user already exists");

    if (isDuplicate) {
      return NextResponse.json(
        { error: "A user with that email address already exists." },
        { status: 409 }
      );
    }

    console.error("[admin/users/invite] invite error:", error);
    return NextResponse.json(
      { error: "Failed to send invitation." },
      { status: 500 }
    );
  }

  const userId = data.user?.id;

  // If admin role requested, update the profile (trigger creates it as 'volunteer' by default)
  if (role === "admin" && userId) {
    const { error: roleError } = await adminClient
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", userId);

    if (roleError) {
      console.error("[admin/users/invite] role update error:", roleError);
      // Non-fatal: user was invited, role update can be done manually
    }
  }

  return NextResponse.json(
    {
      user: {
        id: userId,
        email: data.user?.email,
        full_name: fullName.trim(),
        role,
      },
    },
    { status: 201 }
  );
}

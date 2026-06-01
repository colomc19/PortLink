import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/require-auth";

/**
 * GET /api/auth/profile
 *
 * Returns the current user's profile row.
 * Fields: id, full_name, phone, role, receives_alerts, view_preference
 *
 * 401 if not authenticated.
 */
export async function GET() {
  const { user, response: authError } = await requireAuth();
  if (authError) return authError;

  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, receives_alerts, view_preference")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return NextResponse.json(
      { error: "Profile not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(profile);
}

/**
 * PATCH /api/auth/profile
 *
 * Updates the current user's mutable profile fields.
 * Accepted body fields: full_name, phone, view_preference
 * Ignored fields: id, role, receives_alerts (role is admin-only; alerts managed separately)
 *
 * 401 if not authenticated.
 * 400 if no valid update fields are provided.
 */
export async function PATCH(request: NextRequest) {
  const { user, response: authError } = await requireAuth();
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const input = body as Record<string, unknown>;

  // Only allow safe, user-editable fields
  type AllowedUpdate = {
    full_name?: string;
    phone?: string | null;
    view_preference?: string;
    updated_at?: string;
  };

  const updates: AllowedUpdate = {};

  if ("full_name" in input) {
    if (typeof input.full_name !== "string" || !input.full_name.trim()) {
      return NextResponse.json(
        { error: "full_name must be a non-empty string" },
        { status: 400 }
      );
    }
    updates.full_name = input.full_name.trim();
  }

  if ("phone" in input) {
    if (input.phone !== null && typeof input.phone !== "string") {
      return NextResponse.json(
        { error: "phone must be a string or null" },
        { status: 400 }
      );
    }
    updates.phone = input.phone as string | null;
  }

  if ("view_preference" in input) {
    const allowed = ["table", "card"];
    if (!allowed.includes(input.view_preference as string)) {
      return NextResponse.json(
        { error: `view_preference must be one of: ${allowed.join(", ")}` },
        { status: 400 }
      );
    }
    updates.view_preference = input.view_preference as string;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  updates.updated_at = new Date().toISOString();

  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select("id, full_name, phone, role, receives_alerts, view_preference")
    .single();

  if (error || !profile) {
    console.error("[PATCH /api/auth/profile]", error?.message);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }

  return NextResponse.json(profile);
}

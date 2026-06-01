import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/vessels/[id]/resolve-review
 *
 * Marks a vessel's needs_review flag as resolved (admin only).
 * Clears needs_review and review_reason.
 *
 * 401 if not authenticated, 403 if not admin, 404 if not found.
 */
export async function PATCH(_request: NextRequest, { params }: RouteContext) {
  const { user, response: adminError } = await requireAdmin();
  if (adminError) return adminError;

  const { id } = await params;
  const supabase = await createClient();

  const { data: updated, error } = await supabase
    .from("vessels")
    .update({
      needs_review: false,
      review_reason: null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !updated) {
    if (error?.code === "PGRST116") {
      return NextResponse.json({ error: "Vessel not found" }, { status: 404 });
    }
    console.error("[PATCH /api/vessels/[id]/resolve-review]", error?.message);
    return NextResponse.json(
      { error: "Failed to resolve review" },
      { status: 500 }
    );
  }

  return NextResponse.json(updated);
}

// Legacy POST kept for backward compat — delegates to PATCH
export async function POST(request: NextRequest, context: RouteContext) {
  return PATCH(request, context);
}

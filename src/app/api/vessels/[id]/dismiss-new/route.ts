import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/require-auth";

/**
 * POST /api/vessels/[id]/dismiss-new
 * Clears the `is_new` flag on a vessel after the team has reviewed it.
 * Any authenticated user can dismiss the "new" badge on a vessel.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAuth();
  if (response) return response;

  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase
    .from("vessels")
    .update({ is_new: false })
    .eq("id", id);

  if (error) {
    console.error("[dismiss-new]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

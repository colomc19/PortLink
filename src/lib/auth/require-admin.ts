import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import type { Tables } from "@/types/database";

type AdminResult =
  | { user: User; profile: Tables<"profiles">; response: null }
  | { user: null; profile: null; response: NextResponse };

/**
 * Checks that the incoming request has a valid session AND the user's role
 * is 'admin'. Returns 401 if not authenticated, 403 if not admin.
 *
 * Usage in Route Handlers:
 *   const { user, profile, response } = await requireAdmin();
 *   if (response) return response;   // 401 or 403
 *   // user and profile are now typed
 */
export async function requireAdmin(): Promise<AdminResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      user: null,
      profile: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return {
      user: null,
      profile: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (profile.role !== "admin") {
    return {
      user: null,
      profile: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { user, profile, response: null };
}

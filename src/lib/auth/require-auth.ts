import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

type AuthResult =
  | { user: User; response: null }
  | { user: null; response: NextResponse };

/**
 * Checks that the incoming request has a valid Supabase session.
 *
 * Usage in Route Handlers:
 *   const { user, response } = await requireAuth();
 *   if (response) return response;   // 401 — not authenticated
 *   // user is now typed as User
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  return { user, response: null };
}

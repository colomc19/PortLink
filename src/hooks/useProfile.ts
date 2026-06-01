"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

export type Profile = Tables<"profiles">;

type ProfileState =
  | { status: "loading"; profile: null; error: null }
  | { status: "loaded"; profile: Profile; error: null }
  | { status: "error"; profile: null; error: string }
  | { status: "unauthenticated"; profile: null; error: null };

/**
 * Returns the current authenticated user's profile from the `profiles` table.
 *
 * Usage:
 *   const { profile, status } = useProfile();
 *   if (status === "loading") return <Spinner />;
 *   if (!profile) return null;
 */
export function useProfile(): ProfileState {
  const [state, setState] = useState<ProfileState>({
    status: "loading",
    profile: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchProfile() {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        setState({ status: "unauthenticated", profile: null, error: null });
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (cancelled) return;

      if (profileError || !profile) {
        setState({
          status: "error",
          profile: null,
          error: profileError?.message ?? "Profile not found",
        });
        return;
      }

      setState({ status: "loaded", profile, error: null });
    }

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

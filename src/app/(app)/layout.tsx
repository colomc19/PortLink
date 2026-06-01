import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { AppShell } from "@/components/layout/AppShell";

/**
 * Authenticated app layout.
 *
 * Fetches the current user's profile server-side and passes it to the
 * ProfileContext so client components can access it without an extra fetch.
 * Middleware handles the primary redirect; this guard is defense-in-depth.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const fullName = profile?.full_name ?? user.email ?? "Volunteer";
  const role = profile?.role ?? null;
  const isAdmin = role === "admin";

  return (
    <ProfileProvider profile={{ fullName, role, isAdmin }}>
      <div className="flex min-h-screen flex-col">
        <AppShell>{children}</AppShell>
      </div>
    </ProfileProvider>
  );
}

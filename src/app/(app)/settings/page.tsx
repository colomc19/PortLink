import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { SettingsTabs } from '@/components/settings/SettingsTabs';
import type { UserSummary } from '@/app/api/admin/users/route';
import type { AlertRecipientSummary } from '@/app/api/admin/alert-recipients/route';
import type { IngestionStatusResponse } from '@/app/api/admin/ingestion-status/route';

export const metadata: Metadata = { title: 'Settings' };

/**
 * Settings page — admin only.
 * Server component: fetches all data, passes to tabbed client layout.
 */
export default async function SettingsPage() {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Admin role check
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/');
  }

  const adminClient = createAdminClient();

  // ── Fetch users ────────────────────────────────────────────────
  const [authListResult, profilesResult] = await Promise.all([
    adminClient.auth.admin.listUsers({ perPage: 1000 }),
    adminClient
      .from('profiles')
      .select('id, full_name, phone, role, receives_alerts, created_at')
      .order('full_name', { ascending: true }),
  ]);

  const emailByUserId = new Map<string, string>();
  for (const authUser of authListResult.data?.users ?? []) {
    emailByUserId.set(authUser.id, authUser.email ?? '');
  }

  const users: UserSummary[] = (profilesResult.data ?? [])
    .map((p) => ({
      id: p.id,
      full_name: p.full_name,
      email: emailByUserId.get(p.id) ?? '',
      phone: p.phone,
      role: p.role,
      receives_alerts: p.receives_alerts,
      created_at: p.created_at,
    }))
    .sort((a, b) => {
      if (a.role === b.role) return a.full_name.localeCompare(b.full_name);
      return a.role === 'admin' ? -1 : 1;
    });

  // ── Fetch alert recipients ─────────────────────────────────────
  const { data: smsRecipients } = await adminClient
    .from('alert_recipients')
    .select('profile_id, enabled, method')
    .eq('method', 'sms');

  const smsEnabledByProfileId = new Map<string, boolean>();
  for (const r of smsRecipients ?? []) {
    smsEnabledByProfileId.set(r.profile_id, r.enabled);
  }

  const alertRecipients: AlertRecipientSummary[] = (profilesResult.data ?? [])
    .map((p) => ({
      profile_id: p.id,
      full_name: p.full_name,
      phone: p.phone,
      sms_enabled: smsEnabledByProfileId.get(p.id) ?? false,
      has_phone: !!p.phone,
    }))
    .sort((a, b) => {
      if (a.sms_enabled !== b.sms_enabled) return a.sms_enabled ? -1 : 1;
      return a.full_name.localeCompare(b.full_name);
    });

  // ── Fetch ingestion status ─────────────────────────────────────
  const [latestReportResult, ingestionEventsResult] = await Promise.all([
    adminClient
      .from('pilot_reports')
      .select('id, received_at')
      .order('received_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    adminClient
      .from('ingestion_log')
      .select('id, event_type, created_at, details, pilot_report_id')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const now = new Date();
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)
  );

  const { count: reportsToday } = await adminClient
    .from('pilot_reports')
    .select('id', { count: 'exact', head: true })
    .gte('received_at', todayStart.toISOString());

  const lastReportAt = latestReportResult.data?.received_at ?? null;
  let ingestionStatus: IngestionStatusResponse['status'] = 'inactive';

  if (lastReportAt) {
    const ageMs = now.getTime() - new Date(lastReportAt).getTime();
    const ageHours = ageMs / (1000 * 60 * 60);
    if (ageHours <= 8) ingestionStatus = 'active';
    else if (ageHours <= 24) ingestionStatus = 'warning';
  }

  const ingestionData: IngestionStatusResponse = {
    status: ingestionStatus,
    lastReportAt,
    reportsToday: reportsToday ?? 0,
    recentEvents: (ingestionEventsResult.data ?? []).map((e) => ({
      id: e.id,
      event_type: e.event_type,
      created_at: e.created_at,
      details: (e.details as Record<string, unknown>) ?? null,
      pilot_report_id: e.pilot_report_id,
    })),
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-4xl">
      <PageHeader
        title="Settings"
        subtitle="Team management and system configuration."
      />

      <SettingsTabs
        users={users}
        currentUserId={user.id}
        alertRecipients={alertRecipients}
        ingestionData={ingestionData}
      />
    </div>
  );
}

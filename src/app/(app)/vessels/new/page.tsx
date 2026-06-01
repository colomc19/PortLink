import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { VesselEntryForm } from '@/components/vessels/VesselEntryForm';

export const metadata: Metadata = { title: 'New Vessel' };

export default async function NewVesselPage() {
  const supabase = await createClient();

  // Verify authentication and admin role
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/vessels');
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title="Add Vessel"
        subtitle="Manually record a vessel not yet in the system."
      />
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
        <VesselEntryForm />
      </div>
    </div>
  );
}

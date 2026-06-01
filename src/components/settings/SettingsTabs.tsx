'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { UserList } from './UserList';
import { InviteForm } from './InviteForm';
import { AlertRecipientList } from './AlertRecipientList';
import { IngestionStatus } from './IngestionStatus';
import {
  UsersIcon,
  BellIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import type { UserSummary } from '@/app/api/admin/users/route';
import type { AlertRecipientSummary } from '@/app/api/admin/alert-recipients/route';
import type { IngestionStatusResponse } from '@/app/api/admin/ingestion-status/route';

type Tab = 'team' | 'alerts' | 'system';

interface SettingsTabsProps {
  users: UserSummary[];
  currentUserId: string;
  alertRecipients: AlertRecipientSummary[];
  ingestionData: IngestionStatusResponse;
}

const TABS: { id: Tab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'team', label: 'Team', Icon: UsersIcon },
  { id: 'alerts', label: 'Alert Recipients', Icon: BellIcon },
  { id: 'system', label: 'System', Icon: CpuChipIcon },
];

export function SettingsTabs({
  users,
  currentUserId,
  alertRecipients,
  ingestionData,
}: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('team');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [userList, setUserList] = useState<UserSummary[]>(users);

  function handleInvited(newUser: UserSummary) {
    setUserList((prev) => {
      const updated = [...prev, newUser].sort((a, b) => {
        if (a.role === b.role) return a.full_name.localeCompare(b.full_name);
        return a.role === 'admin' ? -1 : 1;
      });
      return updated;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Tab bar */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-0 -mb-px" aria-label="Settings sections">
          {TABS.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                aria-selected={isActive}
                role="tab"
                className={[
                  'flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors duration-150',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy',
                  isActive
                    ? 'border-navy text-navy'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
                ].join(' ')}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{label.split(' ')[0]}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab panels */}
      {activeTab === 'team' && (
        <section aria-label="Team management" className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Team Members</h2>
              <p className="text-sm text-slate-500">
                {userList.length} member{userList.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button
              variant="primary"
              className="h-10 px-4 text-sm"
              onClick={() => setInviteOpen(true)}
            >
              Invite Volunteer
            </Button>
          </div>

          <UserList initialUsers={userList} currentUserId={currentUserId} />

          <InviteForm
            open={inviteOpen}
            onClose={() => setInviteOpen(false)}
            onInvited={handleInvited}
          />
        </section>
      )}

      {activeTab === 'alerts' && (
        <section aria-label="Alert recipients" className="flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">SMS Alert Recipients</h2>
            <p className="text-sm text-slate-500">
              Toggle who receives SMS notifications before a vessel with a loaned device sails.
              Team members must have a phone number on file to receive alerts.
            </p>
          </div>

          <AlertRecipientList initialRecipients={alertRecipients} />
        </section>
      )}

      {activeTab === 'system' && (
        <section aria-label="System status" className="flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Ingestion Pipeline</h2>
            <p className="text-sm text-slate-500">
              Monitor the automated Pilot Report email ingestion pipeline.
            </p>
          </div>

          <IngestionStatus initialData={ingestionData} />
        </section>
      )}
    </div>
  );
}

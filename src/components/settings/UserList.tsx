'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { UsersIcon } from '@heroicons/react/24/outline';
import type { UserSummary } from '@/app/api/admin/users/route';

interface UserListProps {
  initialUsers: UserSummary[];
  currentUserId: string;
}

function RolePill({ role }: { role: string }) {
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center rounded px-2.5 py-0.5 text-xs font-semibold bg-[#B7862B]/15 text-[#7A5620]">
        Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-600">
      Volunteer
    </span>
  );
}

export function UserList({ initialUsers, currentUserId }: UserListProps) {
  const [users, setUsers] = useState<UserSummary[]>(initialUsers);
  const [roleLoadingId, setRoleLoadingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserSummary | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleRoleChange(user: UserSummary) {
    const newRole = user.role === 'admin' ? 'volunteer' : 'admin';
    setRoleLoadingId(user.id);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/admin/users/${user.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Failed to update role.');
        return;
      }

      setUsers((prev) =>
        prev
          .map((u) =>
            u.id === user.id ? { ...u, role: data.profile.role } : u
          )
          .sort((a, b) => {
            if (a.role === b.role) return a.full_name.localeCompare(b.full_name);
            return a.role === 'admin' ? -1 : 1;
          })
      );
    } catch {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setRoleLoadingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Failed to remove user.');
        setDeleteTarget(null);
        return;
      }

      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  }

  if (users.length === 0) {
    return (
      <EmptyState
        icon={<UsersIcon />}
        title="No team members yet"
        description="Invite your first volunteer to get started."
      />
    );
  }

  return (
    <>
      {errorMsg && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-crimson">{errorMsg}</p>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-600">Name</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Email</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Phone</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Role</th>
              <th className="px-4 py-3 font-semibold text-slate-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => {
              const isSelf = user.id === currentUserId;
              const isRoleLoading = roleLoadingId === user.id;
              return (
                <tr key={user.id} className="bg-white hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {user.full_name}
                    {isSelf && (
                      <span className="ml-2 text-xs text-slate-400">(you)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {user.phone ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <RolePill role={user.role} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleRoleChange(user)}
                        disabled={isSelf || isRoleLoading}
                        className="text-xs font-medium text-bay-blue hover:underline disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
                        aria-label={`Change ${user.full_name} to ${user.role === 'admin' ? 'volunteer' : 'admin'}`}
                      >
                        {isRoleLoading
                          ? 'Saving…'
                          : user.role === 'admin'
                          ? 'Make Volunteer'
                          : 'Make Admin'}
                      </button>
                      <span className="text-slate-200" aria-hidden="true">|</span>
                      <button
                        onClick={() => setDeleteTarget(user)}
                        disabled={isSelf}
                        className="text-xs font-medium text-crimson hover:underline disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
                        aria-label={`Remove ${user.full_name}`}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden flex flex-col divide-y divide-slate-100 border border-slate-200 rounded-md overflow-hidden">
        {users.map((user) => {
          const isSelf = user.id === currentUserId;
          const isRoleLoading = roleLoadingId === user.id;
          return (
            <div key={user.id} className="bg-white px-4 py-3 flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">
                  {user.full_name}
                  {isSelf && (
                    <span className="ml-1.5 text-xs text-slate-400">(you)</span>
                  )}
                </span>
                <RolePill role={user.role} />
              </div>
              <p className="text-sm text-slate-500">{user.email}</p>
              {user.phone && (
                <p className="text-sm text-slate-400">{user.phone}</p>
              )}
              {!isSelf && (
                <div className="flex gap-4 mt-1">
                  <button
                    onClick={() => handleRoleChange(user)}
                    disabled={isRoleLoading}
                    className="text-sm font-medium text-bay-blue hover:underline disabled:opacity-40"
                  >
                    {isRoleLoading
                      ? 'Saving…'
                      : user.role === 'admin'
                      ? 'Make Volunteer'
                      : 'Make Admin'}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(user)}
                    className="text-sm font-medium text-crimson hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remove team member"
        description={
          deleteTarget
            ? `Remove ${deleteTarget.full_name} (${deleteTarget.email})? This will revoke their access immediately.`
            : ''
        }
        confirmLabel="Remove"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        confirmLoading={deleteLoading}
      />
    </>
  );
}

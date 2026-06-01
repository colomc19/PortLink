'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import type { UserSummary } from '@/app/api/admin/users/route';

interface InviteFormProps {
  open: boolean;
  onClose: () => void;
  onInvited: (user: UserSummary) => void;
}

interface FormState {
  email: string;
  fullName: string;
  role: 'volunteer' | 'admin';
}

interface FormErrors {
  email?: string;
  fullName?: string;
  submit?: string;
}

export function InviteForm({ open, onClose, onInvited }: InviteFormProps) {
  const [form, setForm] = useState<FormState>({
    email: '',
    fullName: '',
    role: 'volunteer',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);

  function handleClose() {
    setForm({ email: '', fullName: '', role: 'volunteer' });
    setErrors({});
    setSuccessEmail(null);
    onClose();
  }

  function validate(): boolean {
    const next: FormErrors = {};
    if (!form.email.trim() || !form.email.includes('@')) {
      next.email = 'A valid email address is required.';
    }
    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      next.fullName = 'Full name must be at least 2 characters.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      const res = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          fullName: form.fullName.trim(),
          role: form.role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ submit: data.error ?? 'Failed to send invitation.' });
        return;
      }

      setSuccessEmail(form.email.trim().toLowerCase());
      onInvited({
        id: data.user.id ?? '',
        full_name: data.user.full_name,
        email: data.user.email ?? form.email.trim().toLowerCase(),
        phone: null,
        role: data.user.role,
        receives_alerts: false,
        created_at: new Date().toISOString(),
      });
    } catch {
      setErrors({ submit: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Invite Team Member"
      confirmLabel={successEmail ? 'Done' : 'Send Invitation'}
      cancelLabel={successEmail ? '' : 'Cancel'}
      onConfirm={successEmail ? handleClose : handleSubmit}
      confirmLoading={loading}
    >
      {successEmail ? (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3">
          <p className="text-base font-semibold text-green-800">Invitation sent</p>
          <p className="mt-1 text-sm text-green-700">
            An invitation email has been sent to <strong>{successEmail}</strong>.
            They will receive a link to set their password.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {errors.submit && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-crimson">{errors.submit}</p>
            </div>
          )}

          <Input
            label="Email address"
            type="email"
            autoComplete="off"
            placeholder="volunteer@example.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            error={errors.email}
          />

          <Input
            label="Full name"
            type="text"
            autoComplete="off"
            placeholder="Jane Smith"
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            error={errors.fullName}
          />

          <Select
            label="Role"
            value={form.role}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                role: e.target.value as 'volunteer' | 'admin',
              }))
            }
          >
            <option value="volunteer">Volunteer</option>
            <option value="admin">Admin</option>
          </Select>
        </div>
      )}
    </Modal>
  );
}

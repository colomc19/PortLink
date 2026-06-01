'use client';

import { createContext, useContext, type ReactNode } from 'react';

export interface ProfileData {
  fullName: string;
  role: string | null;
  isAdmin: boolean;
}

const ProfileContext = createContext<ProfileData | null>(null);

interface ProfileProviderProps {
  profile: ProfileData;
  children: ReactNode;
}

export function ProfileProvider({ profile, children }: ProfileProviderProps) {
  return (
    <ProfileContext.Provider value={profile}>
      {children}
    </ProfileContext.Provider>
  );
}

/**
 * Returns the current user's profile data from the nearest ProfileProvider.
 * Must be used inside the (app) layout.
 */
export function useProfileContext(): ProfileData {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useProfileContext must be used inside ProfileProvider (within the app layout)');
  }
  return ctx;
}

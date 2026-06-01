'use client';

import type { ReactNode } from 'react';
import {
  MapPinIcon,
  ArrowRightCircleIcon,
  ArrowUpRightIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  WifiIcon,
} from '@heroicons/react/24/solid';

// Vessel status variants
export type VesselBadgeVariant =
  | 'in_port'
  | 'arriving'
  | 'sailing'
  | 'sailing_urgent'
  | 'sailed'
  | 'needs_review'
  | 'manual';

// Device status variants
export type DeviceBadgeVariant = 'available' | 'assigned' | 'needs_retrieval';

export type BadgeVariant = VesselBadgeVariant | DeviceBadgeVariant;

interface BadgeConfig {
  bg: string;
  text: string;
  label: string;
  Icon: (props: { className?: string }) => ReactNode;
}

const BADGE_CONFIG: Record<BadgeVariant, BadgeConfig> = {
  // Vessel variants
  in_port: {
    bg: 'bg-[#DBEAFE]',
    text: 'text-[#1E3A5F]',
    label: 'IN PORT',
    Icon: ({ className }) => <MapPinIcon className={className} />,
  },
  arriving: {
    bg: 'bg-[#E0F2FE]',
    text: 'text-[#0C4A6E]',
    label: 'ARRIVING',
    Icon: ({ className }) => <ArrowRightCircleIcon className={className} />,
  },
  sailing: {
    bg: 'bg-[#F1F5F9]',
    text: 'text-[#334155]',
    label: 'SAILING',
    Icon: ({ className }) => <ArrowUpRightIcon className={className} />,
  },
  sailing_urgent: {
    bg: 'bg-[#FEE2E2]',
    text: 'text-[#7F1D1D]',
    label: 'SAILING — RETRIEVE DEVICE',
    Icon: ({ className }) => <ExclamationCircleIcon className={className} />,
  },
  sailed: {
    bg: 'bg-[#F8FAFC]',
    text: 'text-[#94A3B8]',
    label: 'SAILED',
    Icon: ({ className }) => <CheckCircleIcon className={className} />,
  },
  needs_review: {
    bg: 'bg-[#FFFBEB]',
    text: 'text-[#78350F]',
    label: 'NEEDS REVIEW',
    Icon: ({ className }) => <ExclamationTriangleIcon className={className} />,
  },
  manual: {
    bg: 'bg-[#FFF7ED]',
    text: 'text-[#431407]',
    label: 'MANUAL',
    Icon: ({ className }) => <PencilSquareIcon className={className} />,
  },
  // Device variants
  available: {
    bg: 'bg-[#F0FDF4]',
    text: 'text-[#14532D]',
    label: 'AVAILABLE',
    Icon: ({ className }) => <CheckCircleIcon className={className} />,
  },
  assigned: {
    bg: 'bg-[#EFF6FF]',
    text: 'text-[#1E3A5F]',
    label: 'ASSIGNED',
    Icon: ({ className }) => <WifiIcon className={className} />,
  },
  needs_retrieval: {
    bg: 'bg-[#FEF2F2]',
    text: 'text-[#7F1D1D]',
    label: 'RETRIEVE NOW',
    Icon: ({ className }) => <ExclamationCircleIcon className={className} />,
  },
};

interface BadgeProps {
  variant: BadgeVariant;
  className?: string;
}

export function Badge({ variant, className = '' }: BadgeProps) {
  const config = BADGE_CONFIG[variant];

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 h-7 px-3 py-1 rounded-sm',
        'text-sm font-semibold uppercase tracking-wider whitespace-nowrap',
        config.bg,
        config.text,
        className,
      ].join(' ')}
    >
      <config.Icon className="w-4 h-4 shrink-0" />
      {config.label}
    </span>
  );
}

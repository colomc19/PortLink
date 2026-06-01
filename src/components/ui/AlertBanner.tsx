'use client';

import type { ReactNode } from 'react';
import {
  InformationCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Button, type ButtonVariant } from './Button';

export type AlertTier = 'info' | 'warning' | 'urgent';

interface AlertAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: ButtonVariant;
}

interface AlertBannerProps {
  tier: AlertTier;
  title: string;
  description?: string;
  primaryAction?: AlertAction;
  secondaryAction?: AlertAction;
  onDismiss?: () => void;
  className?: string;
}

interface TierConfig {
  bg: string;
  border: string;
  iconColor: string;
  titleClass: string;
  Icon: (props: { className?: string }) => ReactNode;
}

const TIER_CONFIG: Record<AlertTier, TierConfig> = {
  info: {
    bg: 'bg-[#EFF6FF]',
    border: 'border-l-4 border-l-[#2C5282]',
    iconColor: 'text-[#2C5282]',
    titleClass: 'text-base font-semibold',
    Icon: ({ className }) => <InformationCircleIcon className={className} />,
  },
  warning: {
    bg: 'bg-[#FFFBEB]',
    border: 'border-l-4 border-l-[#D97706]',
    iconColor: 'text-[#D97706]',
    titleClass: 'text-base font-semibold',
    Icon: ({ className }) => <ExclamationTriangleIcon className={className} />,
  },
  urgent: {
    bg: 'bg-[#FEF2F2]',
    border: 'border-l-4 border-l-[#B91C1C]',
    iconColor: 'text-[#B91C1C]',
    titleClass: 'text-lg font-bold',
    Icon: ({ className }) => <ExclamationCircleIcon className={className} />,
  },
};

export function AlertBanner({
  tier,
  title,
  description,
  primaryAction,
  secondaryAction,
  onDismiss,
  className = '',
}: AlertBannerProps) {
  const config = TIER_CONFIG[tier];

  function renderAction(action: AlertAction, defaultVariant: ButtonVariant) {
    if (action.href) {
      return (
        <Button as="a" href={action.href} variant={action.variant ?? defaultVariant}>
          {action.label}
        </Button>
      );
    }
    return (
      <Button variant={action.variant ?? defaultVariant} onClick={action.onClick}>
        {action.label}
      </Button>
    );
  }

  return (
    <div
      role="alert"
      className={[
        'rounded-md p-4',
        config.bg,
        config.border,
        className,
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <config.Icon
          className={['h-5 w-5 mt-0.5 shrink-0', config.iconColor].join(' ')}
        />
        <div className="flex-1 min-w-0">
          <p className={config.titleClass}>{title}</p>
          {description && (
            <p className="mt-1 text-base text-slate-600">{description}</p>
          )}
          {(primaryAction || secondaryAction) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {primaryAction && renderAction(primaryAction, tier === 'urgent' ? 'urgent' : 'primary')}
              {secondaryAction && renderAction(secondaryAction, 'ghost')}
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss alert"
            className={[
              'shrink-0 rounded p-1 transition-colors',
              'hover:bg-black/10',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy',
              // Urgent: requires explicit tap — no accidental dismiss via large hit area
              tier === 'urgent' ? 'min-w-[44px] min-h-[44px] flex items-center justify-center' : '',
            ].join(' ')}
          >
            <XMarkIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

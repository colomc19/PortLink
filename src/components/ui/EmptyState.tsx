'use client';

import type { ReactNode } from 'react';
import { Button, type ButtonVariant } from './Button';

interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: ButtonVariant;
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center gap-3 py-16 px-6 text-center',
        className,
      ].join(' ')}
    >
      {icon && (
        <div className="text-slate-300 [&>svg]:h-12 [&>svg]:w-12" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-600">{title}</h3>
      {description && (
        <p className="text-base text-slate-400 max-w-sm">{description}</p>
      )}
      {action && (
        action.href ? (
          <Button as="a" href={action.href} variant={action.variant ?? 'primary'}>
            {action.label}
          </Button>
        ) : (
          <Button variant={action.variant ?? 'primary'} onClick={action.onClick}>
            {action.label}
          </Button>
        )
      )}
    </div>
  );
}

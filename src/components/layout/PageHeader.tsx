import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  lastUpdated?: string;
}

export function PageHeader({ title, subtitle, actions, lastUpdated }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-foreground truncate">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-base text-slate-500">{subtitle}</p>
        )}
        {lastUpdated && (
          <p className="mt-0.5 text-sm text-slate-400">
            Last updated {lastUpdated}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

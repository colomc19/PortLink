'use client';

import { useRef, type KeyboardEvent } from 'react';
import { TableCellsIcon, Squares2X2Icon } from '@heroicons/react/24/outline';

export type ViewMode = 'table' | 'card';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  className?: string;
}

const TABS: Array<{ value: ViewMode; label: string; Icon: typeof TableCellsIcon }> = [
  { value: 'table', label: 'Table', Icon: TableCellsIcon },
  { value: 'card', label: 'Cards', Icon: Squares2X2Icon },
];

export function ViewToggle({ value, onChange, className = '' }: ViewToggleProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;

    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % TABS.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + TABS.length) % TABS.length;
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange(TABS[index].value);
      return;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      tabRefs.current[nextIndex]?.focus();
      onChange(TABS[nextIndex].value);
    }
  }

  return (
    <div
      role="tablist"
      aria-label="View mode"
      className={[
        'inline-flex rounded-lg border border-slate-300 overflow-hidden',
        className,
      ].join(' ')}
    >
      {TABS.map((tab, index) => {
        const isActive = value === tab.value;
        return (
          <button
            key={tab.value}
            ref={(el) => { tabRefs.current[index] = el; }}
            role="tab"
            aria-selected={isActive}
            aria-label={`${tab.label} view`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={[
              'inline-flex items-center justify-center gap-1.5 px-4 min-h-[48px] text-sm font-semibold',
              'transition-colors duration-100 cursor-pointer',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy focus-visible:outline-offset-[-2px]',
              isActive
                ? 'bg-navy text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50',
            ].join(' ')}
          >
            <tab.Icon className="h-4 w-4" aria-hidden="true" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface DetailPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function DetailPanel({ open, onClose, title, children }: DetailPanelProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Focus close button when opened
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Overlay — shown on < lg, panel is inline on lg+ */}
      <div
        className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        aria-label={title}
        className={[
          'fixed inset-y-0 right-0 z-40 w-full max-w-[480px] bg-white shadow-xl',
          'flex flex-col overflow-y-auto',
          'motion-safe:animate-slide-in-right',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close panel"
            className="rounded p-1.5 text-slate-500 hover:text-foreground hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 py-4">{children}</div>
      </aside>

      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        @media (prefers-reduced-motion: no-preference) {
          .motion-safe\\:animate-slide-in-right {
            animation: slide-in-right 0.25s ease-out;
          }
        }
      `}</style>
    </>
  );
}

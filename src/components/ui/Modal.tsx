'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  confirmVariant?: 'primary' | 'destructive' | 'urgent';
  confirmLoading?: boolean;
  children?: ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  confirmVariant = 'primary',
  confirmLoading = false,
  children,
}: ModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus cancel button when opened
  useEffect(() => {
    if (open) {
      cancelRef.current?.focus();
    }
  }, [open]);

  // Escape key to close
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby={description ? 'modal-description' : undefined}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Card — slides up from bottom on mobile, centered on desktop */}
      <div
        ref={dialogRef}
        className={[
          'relative z-10 w-full max-w-[480px] bg-white rounded-t-xl md:rounded-xl shadow-lg',
          'p-6 flex flex-col gap-4',
          // Slide up on mobile
          'motion-safe:animate-slide-up md:motion-safe:animate-none',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <h2 id="modal-title" className="text-lg font-bold text-foreground">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:text-foreground hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Description */}
        {description && (
          <p id="modal-description" className="text-base text-slate-600">
            {description}
          </p>
        )}

        {/* Custom content */}
        {children}

        {/* Actions — tab order: Cancel first, Confirm second */}
        {(cancelLabel || confirmLabel) && (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              ref={cancelRef}
              variant="secondary"
              onClick={onClose}
              type="button"
            >
              {cancelLabel}
            </Button>
            {onConfirm && (
              <Button
                variant={confirmVariant}
                onClick={onConfirm}
                loading={confirmLoading}
                type="button"
              >
                {confirmLabel}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Slide-up animation */}
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .motion-safe\\:animate-slide-up {
          animation: slide-up 0.25s ease-out;
        }
        @media (min-width: 768px) {
          .motion-safe\\:animate-slide-up {
            animation: none;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .motion-safe\\:animate-slide-up {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

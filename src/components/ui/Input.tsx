'use client';

import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface FormFieldProps {
  label?: string;
  error?: string;
  id?: string;
}

// ------- Input -------

interface InputProps
  extends FormFieldProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, id, className = '', ...props },
  ref
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-semibold text-slate-700"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={[
          'h-[52px] w-full rounded-md border-2 bg-white px-3 text-base text-foreground',
          'transition-colors duration-150 placeholder:text-slate-400',
          error
            ? 'border-crimson focus:border-crimson focus:outline-none'
            : 'border-[#CBD5E1] focus:border-[#2C5282] focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-slate-50',
          className,
        ].join(' ')}
        {...props}
      />
      {error && <ErrorMessage id={`${inputId}-error`} message={error} />}
    </div>
  );
});

// ------- Select -------

interface SelectProps
  extends FormFieldProps,
    Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, id, children, className = '', ...props },
  ref
) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={selectId}
          className="text-sm font-semibold text-slate-700"
        >
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        aria-invalid={!!error}
        aria-describedby={error ? `${selectId}-error` : undefined}
        className={[
          'h-[52px] w-full rounded-md border-2 bg-white px-3 text-base text-foreground',
          'transition-colors duration-150 appearance-none cursor-pointer',
          error
            ? 'border-crimson focus:border-crimson focus:outline-none'
            : 'border-[#CBD5E1] focus:border-[#2C5282] focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-slate-50',
          className,
        ].join(' ')}
        {...props}
      >
        {children}
      </select>
      {error && <ErrorMessage id={`${selectId}-error`} message={error} />}
    </div>
  );
});

// ------- Textarea -------

interface TextareaProps
  extends FormFieldProps,
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, id, className = '', ...props },
  ref
) {
  const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={textareaId}
          className="text-sm font-semibold text-slate-700"
        >
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        aria-invalid={!!error}
        aria-describedby={error ? `${textareaId}-error` : undefined}
        className={[
          'w-full min-h-[120px] rounded-md border-2 bg-white px-3 py-3 text-base text-foreground',
          'transition-colors duration-150 placeholder:text-slate-400 resize-y',
          error
            ? 'border-crimson focus:border-crimson focus:outline-none'
            : 'border-[#CBD5E1] focus:border-[#2C5282] focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-slate-50',
          className,
        ].join(' ')}
        {...props}
      />
      {error && <ErrorMessage id={`${textareaId}-error`} message={error} />}
    </div>
  );
});

// ------- Shared error message -------

function ErrorMessage({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} role="alert" className="flex items-center gap-1 text-sm text-crimson">
      <ExclamationTriangleIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

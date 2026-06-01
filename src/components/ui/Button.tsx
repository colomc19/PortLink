'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'urgent';

interface ButtonBaseProps {
  variant?: ButtonVariant;
  loading?: boolean;
  children: ReactNode;
  className?: string;
}

// Overload: renders as <button>
interface ButtonAsButton
  extends ButtonBaseProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> {
  as?: 'button';
  href?: never;
}

// Overload: renders as <a>
interface ButtonAsAnchor extends ButtonBaseProps {
  as: 'a';
  href: string;
  type?: never;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  disabled?: boolean;
  className?: string;
}

type ButtonProps = ButtonAsButton | ButtonAsAnchor;

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-navy text-white hover:bg-bay-blue focus-visible:outline-navy disabled:opacity-60',
  secondary:
    'bg-white border-2 border-navy text-navy hover:bg-navy hover:text-white focus-visible:outline-navy disabled:opacity-60',
  destructive:
    'bg-crimson text-white hover:bg-crimson/80 focus-visible:outline-crimson disabled:opacity-60',
  ghost:
    'bg-transparent text-bay-blue hover:underline focus-visible:outline-navy disabled:opacity-60',
  urgent:
    'bg-crimson text-white font-bold border-l-4 border-l-[#7F1D1D] hover:bg-crimson/80 focus-visible:outline-crimson disabled:opacity-60',
};

const variantHeight: Record<ButtonVariant, string> = {
  primary: 'h-[52px]',
  secondary: 'h-[48px]',
  destructive: 'h-[52px]',
  ghost: 'min-h-[44px]',
  urgent: 'h-[56px]',
};

const Spinner = () => (
  <svg
    className="h-4 w-4 animate-spin"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  function Button(props, ref) {
    const { variant = 'primary', loading = false, children, className = '', ...rest } = props;

    const base =
      'inline-flex items-center justify-center gap-2 px-6 rounded font-semibold text-base cursor-pointer transition-colors duration-150 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 disabled:cursor-not-allowed select-none';

    const classes = [base, variantClasses[variant], variantHeight[variant], className]
      .filter(Boolean)
      .join(' ');

    if (props.as === 'a') {
      const { as: _as, loading: _loading, variant: _variant, href, onClick, disabled, ...anchorRest } = rest as ButtonAsAnchor;
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          onClick={onClick}
          aria-disabled={disabled}
          className={[classes, disabled ? 'pointer-events-none opacity-60' : ''].join(' ')}
          {...(anchorRest as object)}
        >
          {loading ? <Spinner /> : children}
        </a>
      );
    }

    const { as: _as, ...buttonRest } = rest as ButtonAsButton;
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        disabled={(rest as ButtonAsButton).disabled || loading}
        aria-busy={loading}
        className={classes}
        {...(buttonRest as ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {loading ? <Spinner /> : children}
      </button>
    );
  }
);

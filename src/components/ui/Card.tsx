'use client';

import { forwardRef, type ReactNode, type ButtonHTMLAttributes, type AnchorHTMLAttributes } from 'react';

interface CardBaseProps {
  children: ReactNode;
  borderColor?: string;
  urgent?: boolean;
  className?: string;
}

interface CardAsDiv extends CardBaseProps {
  as?: 'div';
  onClick?: never;
  href?: never;
}

interface CardAsButton
  extends CardBaseProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CardBaseProps | 'as'> {
  as: 'button';
  href?: never;
}

interface CardAsLink
  extends CardBaseProps,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CardBaseProps | 'as' | 'href'> {
  as: 'a';
  href: string;
}

type CardProps = CardAsDiv | CardAsButton | CardAsLink;

export const Card = forwardRef<HTMLDivElement | HTMLButtonElement | HTMLAnchorElement, CardProps>(
  function Card(props, ref) {
    const { children, borderColor, urgent = false, className = '', ...rest } = props;

    const base = [
      'relative bg-white border border-[#E2E8F0] rounded-lg min-h-[80px]',
      'p-4 md:p-6 transition-shadow duration-150',
      urgent
        ? 'bg-[#FEF2F2] shadow-md'
        : 'shadow-sm hover:shadow',
      borderColor ? 'border-l-4' : '',
      'focus-visible:outline focus-visible:outline-3 focus-visible:outline-navy focus-visible:outline-offset-2',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const borderStyle = borderColor ? { borderLeftColor: borderColor } : {};

    if (props.as === 'button') {
      const { as: _as, borderColor: _bc, urgent: _urg, ...btnRest } = rest as CardAsButton;
      return (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          className={[base, 'w-full text-left cursor-pointer'].join(' ')}
          style={borderStyle}
          {...(btnRest as ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          {children}
        </button>
      );
    }

    if (props.as === 'a') {
      const { as: _as, borderColor: _bc, urgent: _urg, href, ...anchorRest } = rest as CardAsLink;
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={[base, 'block cursor-pointer'].join(' ')}
          style={borderStyle}
          {...anchorRest}
        >
          {children}
        </a>
      );
    }

    const { as: _as, borderColor: _bc, urgent: _urg, ...divRest } = rest as CardAsDiv;
    return (
      <div
        ref={ref as React.Ref<HTMLDivElement>}
        className={base}
        style={borderStyle}
        {...(divRest as object)}
      >
        {children}
      </div>
    );
  }
);

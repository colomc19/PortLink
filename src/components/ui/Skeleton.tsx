'use client';

interface SkeletonProps {
  variant?: 'text' | 'card' | 'badge' | 'circle';
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
}: SkeletonProps) {
  const variantClasses: Record<NonNullable<SkeletonProps['variant']>, string> = {
    text: 'h-4 rounded',
    card: 'h-[80px] rounded-lg',
    badge: 'h-7 w-24 rounded-sm',
    circle: 'rounded-full',
  };

  const style: React.CSSProperties = {};
  if (width !== undefined) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height !== undefined) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <span
      role="status"
      aria-label="Loading…"
      className={[
        'block bg-[#E2E8F0] overflow-hidden relative',
        variantClasses[variant],
        className,
      ].join(' ')}
      style={style}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[#F1F5F9] to-transparent motion-safe:animate-shimmer"
      />
    </span>
  );
}

// ------- Shimmer keyframes injected once -------
// We use a <style> tag appended to the document from a layout component,
// but since Skeleton may appear anywhere we embed it inline via a singleton.

let shimmerInjected = false;

export function ShimmerStyle() {
  if (typeof document !== 'undefined' && !shimmerInjected) {
    shimmerInjected = true;
    const style = document.createElement('style');
    style.textContent = `
      @keyframes shimmer {
        100% { transform: translateX(100%); }
      }
      @media (prefers-reduced-motion: no-preference) {
        .motion-safe\\:animate-shimmer {
          animation: shimmer 1.5s infinite;
        }
      }
    `;
    document.head.appendChild(style);
  }
  return null;
}

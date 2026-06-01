/**
 * Auth layout — centered card on Off White background.
 * Wraps /login and any future auth pages.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-off-white px-4 py-12">
      {children}
    </div>
  );
}

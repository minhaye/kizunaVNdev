import type { ReactNode } from "react";

type ForgotPasswordShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function ForgotPasswordShell({ title, description, children }: ForgotPasswordShellProps) {
  return (
    <main className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-100 to-blue-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-slate-100">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold leading-tight text-slate-900">{title}</h1>
          <p className="text-sm leading-6 text-slate-500">{description}</p>
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
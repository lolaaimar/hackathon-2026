import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const controlBase =
  "w-full h-9 rounded-lg border border-line bg-white px-3 text-sm text-body placeholder:text-muted/80 " +
  "transition-colors duration-150 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 " +
  "disabled:cursor-not-allowed disabled:bg-panel";

export function Field({
  label,
  hint,
  error,
  children,
  className = "",
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[13px] font-medium text-body">{label}</span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-[12px] text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-[12px] text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${controlBase} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${controlBase} h-auto min-h-20 py-2 ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${controlBase} ${props.className ?? ""}`} />;
}

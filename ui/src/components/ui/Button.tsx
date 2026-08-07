import { forwardRef, type ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "success";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 disabled:bg-panel-strong disabled:text-muted",
  secondary:
    "bg-white text-body border border-line hover:bg-panel active:bg-panel-strong disabled:text-muted",
  danger:
    "bg-white text-danger border border-[var(--color-terminated)] hover:bg-[var(--color-terminated-soft)] active:bg-[color-mix(in_oklch,var(--color-terminated)_14%,white)] disabled:text-muted disabled:border-line",
  ghost:
    "bg-transparent text-primary-700 hover:bg-primary-100 active:bg-primary-200 disabled:text-muted",
  success:
    "bg-[var(--color-completed)] text-white hover:opacity-90 active:opacity-80 disabled:bg-panel-strong disabled:text-muted",
};

const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-[15px] gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, className, children, disabled, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          "inline-flex select-none items-center justify-center rounded-lg font-medium transition-colors duration-150",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700",
          "disabled:cursor-not-allowed disabled:opacity-60",
          variants[variant],
          sizes[size],
          className,
        ].join(" ")}
        {...rest}
      >
        {loading ? <Spinner /> : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

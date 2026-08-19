import { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}) {
  const variants = {
    primary: "bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)] shadow-[0_10px_28px_rgba(239,106,79,.18)]",
    secondary: "border border-[var(--line)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-hover)]",
    ghost: "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]",
    danger: "border border-rose-500/15 bg-rose-500/10 text-rose-500 hover:bg-rose-500/15",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-xl",
    md: "px-4 py-2.5 text-sm rounded-[14px]",
  };
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition duration-200 active:translate-y-px ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && <Loader2 size={size === "sm" ? 13 : 16} className="animate-spin" />}
      {children}
    </button>
  );
}


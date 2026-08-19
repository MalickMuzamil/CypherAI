import { InputHTMLAttributes } from "react";
export function Input({ label, error, className = "", ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return <div className="space-y-2">
    {label && <label className="label">{label}</label>}
    <input suppressHydrationWarning {...props} className={`field ${className}`} />
    {error && <p className="text-xs text-rose-300">{error}</p>}
  </div>;
}
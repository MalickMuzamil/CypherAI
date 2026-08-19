import { TextareaHTMLAttributes } from "react";
export function Textarea({ label, className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return <div className="space-y-2">
    {label && <label className="label">{label}</label>}
    <textarea suppressHydrationWarning {...props} className={`field min-h-28 resize-y ${className}`} />
  </div>;
}
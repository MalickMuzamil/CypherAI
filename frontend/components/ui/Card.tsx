import { ReactNode } from "react";
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`glass-soft rounded-[24px] p-5 ${className}`}>{children}</section>;
}

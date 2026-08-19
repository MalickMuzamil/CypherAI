import { AuthShell } from "@/components/layout/AuthShell";
import { MfaVerifyForm } from "@/components/auth/MfaVerifyForm";
export default function MfaPage() {
  return <AuthShell><MfaVerifyForm /></AuthShell>;
}

"use client";

import { useParams } from "next/navigation";
import { CredentialForm } from "@/components/vault/CredentialForm";

export default function Page() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";
  return <CredentialForm mode="edit" credentialId={id} />;
}

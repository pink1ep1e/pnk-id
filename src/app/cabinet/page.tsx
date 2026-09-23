"use client";

import PnkIdPage from "@/components/pnk-id-page";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CabinetInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const embed = sp.get("embed") === "1";
  const fromMail = sp.get("from") === "mail";

  return (
    <PnkIdPage
      embed={embed}
      fromMail={fromMail}
      onUnauthorized={() => {
        const q = new URLSearchParams();
        if (embed) q.set("embed", "1");
        if (fromMail) q.set("from", "mail");
        const s = q.toString();
        router.replace(s ? `/login?${s}` : "/login");
      }}
    />
  );
}

export default function CabinetPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] bg-[#0c0d10]" aria-hidden />
      }
    >
      <CabinetInner />
    </Suspense>
  );
}

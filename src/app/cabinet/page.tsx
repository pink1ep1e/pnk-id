"use client";

import PnkIdPage from "@/components/pnk-id-page";
import { useRouter } from "next/navigation";

export default function CabinetPage() {
  const router = useRouter();
  return <PnkIdPage onUnauthorized={() => router.replace("/login")} />;
}

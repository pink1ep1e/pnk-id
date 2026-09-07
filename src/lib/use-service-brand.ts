"use client";

import {
  formatFooterCopy,
  resolveServiceBrand,
  serviceKeyFromSearchParams,
  type ServiceBrand,
} from "@/lib/services";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

export function useServiceBrand(): {
  brand: ServiceBrand;
  serviceId: string | null;
  next: string | null;
  footerCopy: string;
} {
  const params = useSearchParams();
  return useMemo(() => {
    const key = serviceKeyFromSearchParams(params);
    const brand = resolveServiceBrand(key);
    return {
      brand,
      serviceId: brand.id === "id" ? null : brand.id,
      next: params.get("next"),
      footerCopy: formatFooterCopy(brand.footerCopy),
    };
  }, [params]);
}

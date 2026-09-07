"use client";

import { ServiceInstallBar } from "@/components/service-install-bar";
import type { ServiceBrand } from "@/lib/services";
import Image from "next/image";
import Link from "next/link";

export { ServiceInstallBar };

export function AuthBrandHeader({ brand }: { brand: ServiceBrand }) {
  const isTall = brand.logoHeight >= 80;
  return (
    <header className="pt-8 md:pt-10 pb-6 flex justify-center px-4">
      <Link
        href={brand.homeHref}
        className="inline-flex shrink-0 items-center"
        aria-label={brand.logoAlt}
      >
        <Image
          src={brand.logoSrc}
          alt={brand.logoAlt}
          width={brand.logoWidth}
          height={brand.logoHeight}
          priority
          className={
            isTall
              ? "select-none object-contain w-[140px] md:w-[180px] h-auto"
              : "select-none object-contain w-[96px] md:w-[110px] h-auto"
          }
        />
      </Link>
    </header>
  );
}

export function AuthBrandFooter({
  brand,
  footerCopy,
}: {
  brand: ServiceBrand;
  footerCopy: string;
  serviceId?: string | null;
  next?: string | null;
}) {
  return (
    <footer className="px-5 md:px-10 py-8 mt-auto">
      <div className="max-w-[900px] mx-auto flex flex-col md:flex-row justify-between gap-6 font-[family-name:var(--font-manrope)] text-[12px] md:text-[13px] text-white/35">
        <div>
          <p>{brand.footerLine}</p>
          <p className="mt-1">{footerCopy}</p>
        </div>
        <div className="md:text-right">
          <p className="text-[17px] font-semibold text-white/70">
            {brand.supportEmail}
          </p>
          <p className="mt-1">Круглосуточная поддержка</p>
        </div>
      </div>
      <div className="max-w-[900px] mx-auto mt-6">
        <Link
          href={brand.homeHref}
          className="text-[14px] font-[family-name:var(--font-manrope)] text-white/35 hover:text-white transition-colors"
        >
          ← На главную
        </Link>
      </div>
    </footer>
  );
}

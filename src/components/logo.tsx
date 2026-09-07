import React from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

interface Props {
  className?: string;
  href?: string;
  variant?: "text" | "bg" | "mark" | "id";
  width?: number;
  height?: number;
  priority?: boolean;
}

export function Logo({
  className,
  href = "/",
  variant = "id",
  width,
  height,
  priority = false,
}: Props) {
  const src =
    variant === "bg" || variant === "mark"
      ? "/logo-blue-bg.svg"
      : variant === "text"
        ? "/logo-blue-text.svg"
        : "/logo-id.svg";

  const defaultSize =
    variant === "id"
      ? { width: width ?? 160, height: height ?? 48 }
      : variant === "text"
        ? { width: width ?? 160, height: height ?? 85 }
        : { width: width ?? 48, height: height ?? 48 };

  const alt = variant === "id" ? "pnk ID" : "pnk";

  const image = (
    <Image
      src={src}
      alt={alt}
      width={defaultSize.width}
      height={defaultSize.height}
      priority={priority}
      className={cn(
        "select-none object-contain",
        variant === "id" && "h-auto w-[96px] md:w-[110px]",
        variant === "text" && "h-auto w-[120px] md:w-[160px]",
        variant === "mark" && "h-11 w-11 md:h-12 md:w-12 rounded-[14px]",
        variant === "bg" && "h-auto w-[140px] md:w-[180px]",
        className,
      )}
    />
  );

  if (!href) return image;

  return (
    <Link href={href} className="inline-flex shrink-0 items-center" aria-label={alt}>
      {image}
    </Link>
  );
}

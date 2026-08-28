import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  isTheme3Family = false,
  srcOverride,
}: {
  className?: string;
  isTheme3Family?: boolean;
  srcOverride?: string | null;
}) {
  const fallback = isTheme3Family ? "/brand/logo-ex.png" : "/brand/logo.png";
  const src = srcOverride ?? fallback;
  const width = isTheme3Family ? Math.round(381 * 1.15) : 381;
  const height = isTheme3Family ? Math.round(297 * 1.15) : 297;

  return (
    <Image
      src={src}
      alt="KKD PROPERTY"
      width={width}
      height={height}
      priority
      unoptimized={!!srcOverride}
      className={cn(
        "h-10 w-auto object-contain select-none",
        isTheme3Family && !srcOverride && "h-[46px]",
        className
      )}
    />
  );
}


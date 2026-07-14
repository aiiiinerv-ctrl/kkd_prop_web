import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  isTheme3Family = false,
}: {
  className?: string;
  isTheme3Family?: boolean;
}) {
  return (
    <Image
      src={isTheme3Family ? "/brand/logo-ex.png" : "/brand/logo.png"}
      alt="KKD PROPERTY"
      width={isTheme3Family ? Math.round(381 * 1.15) : 381}
      height={isTheme3Family ? Math.round(297 * 1.15) : 297}
      priority
      className={cn(
        "h-10 w-auto object-contain select-none",
        isTheme3Family && "h-[46px]",
        className
      )}
    />
  );
}


import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/logo.png"
      alt="KKD PROPERTY"
      width={381}
      height={297}
      priority
      className={cn("h-10 w-auto object-contain select-none", className)}
    />
  );
}

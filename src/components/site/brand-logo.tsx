import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline gap-1.5 select-none", className)}>
      <span className="font-heading text-2xl font-bold tracking-tight text-brand-gold">
        KKD
      </span>
      <span className="font-heading text-lg font-semibold tracking-wide text-primary">
        PROPERTY
      </span>
    </span>
  );
}

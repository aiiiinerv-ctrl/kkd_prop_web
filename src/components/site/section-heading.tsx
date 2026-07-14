import { Reveal } from "@/components/site/reveal";
import { cn } from "@/lib/utils";

export function SectionHeading({
  title,
  subtitle,
  caption,
  className,
  headingClassName,
  underline = false,
}: {
  title: string;
  subtitle?: string;
  caption?: string;
  className?: string;
  headingClassName?: string;
  /** Opt-in ref B accent — a short orange bar centered below the heading. */
  underline?: boolean;
}) {
  return (
    <Reveal className={cn("mb-10 text-center", className)}>
      <h2 className={cn("text-2xl font-bold text-primary sm:text-3xl", headingClassName)}>
        {title}
      </h2>
      {underline && (
        <span className="mx-auto mt-3 block h-[3px] w-[60px] rounded-full bg-brand-orange" />
      )}
      {subtitle && (
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          {subtitle}
        </p>
      )}
      {caption && (
        <p className="mx-auto mt-2 max-w-2xl text-xs text-muted-foreground/70 italic">
          {caption}
        </p>
      )}
    </Reveal>
  );
}

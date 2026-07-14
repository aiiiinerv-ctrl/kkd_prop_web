import { UserRound } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { prisma } from "@/lib/db";
import { pickLocale } from "@/lib/i18n-content";
import { storage } from "@/lib/storage";

/**
 * Public testimonials grid. Renders nothing when there are zero published
 * rows — no placeholder/empty-state UI (no fake data, per project rules).
 */
export async function TestimonialsSection() {
  const testimonials = await prisma.testimonial.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  if (testimonials.length === 0) return null;

  const locale = await getLocale();
  const t = await getTranslations("testimonials");

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <SectionHeading
        title={t("title")}
        subtitle={t("subtitle")}
        headingClassName="font-extrabold tracking-[-0.01em]"
      />
      <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((item, i) => {
          const quote = pickLocale(item, "quote", locale);
          const photoUrl = item.photoKey ? storage.publicUrl(item.photoKey) : null;
          return (
            <Reveal key={item.id} delay={(i % 3) * 100}>
              <div className="h-full rounded-xl border border-border/70 bg-card p-7 shadow-sm transition-all hover:-translate-y-1.5 hover:shadow-lg">
                <p className="text-sm text-muted-foreground">“{quote}”</p>
                <div className="mt-5 flex items-center gap-3">
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoUrl}
                      alt={item.customerName}
                      className="size-12 rounded-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex size-12 items-center justify-center rounded-full bg-brand-orange/10">
                      <UserRound className="size-6 text-brand-orange" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-primary">{item.customerName}</p>
                    {(item.role || item.province) && (
                      <p className="text-xs text-muted-foreground">
                        {[item.role, item.province].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

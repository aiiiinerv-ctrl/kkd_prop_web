import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CtaBanner } from "@/components/site/cta-banner";
import { TestimonialsSection } from "@/components/site/testimonials-section";
import { getPublishedTestimonials } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return pageMetadata(locale, "testimonials", "/testimonials");
}

export default async function TestimonialsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Same cached reader the section below uses, so deciding whether the page
  // exists and rendering it cost one query, not two — and the "is there
  // anything to show" rule can't drift between them.
  const testimonials = await getPublishedTestimonials(locale);
  if (testimonials.length === 0) {
    notFound();
  }

  return (
    <main>
      <TestimonialsSection />
      <CtaBanner />
    </main>
  );
}

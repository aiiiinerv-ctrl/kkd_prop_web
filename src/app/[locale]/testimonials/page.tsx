import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CtaBanner } from "@/components/site/cta-banner";
import { TestimonialsSection } from "@/components/site/testimonials-section";
import { prisma } from "@/lib/db";
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

  const publishedTestimonialCount = await prisma.testimonial.count({
    where: { isPublished: true },
  });
  if (publishedTestimonialCount === 0) {
    notFound();
  }

  return (
    <main>
      <TestimonialsSection />
      <CtaBanner />
    </main>
  );
}

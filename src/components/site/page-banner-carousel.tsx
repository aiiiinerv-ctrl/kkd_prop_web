"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { PageBannerSlideView } from "@/lib/content/page-banner";
import { isExternalBannerLink } from "@/lib/page-banners";
import { cn } from "@/lib/utils";

function BannerSlideImage({
  slide,
  priority,
  className,
}: {
  slide: PageBannerSlideView;
  priority?: boolean;
  className?: string;
}) {
  const img = (
    <Image
      src={slide.imageUrl}
      alt={slide.alt}
      fill
      priority={priority}
      sizes="100vw"
      className={cn("object-cover", className)}
    />
  );

  if (slide.linkPath) {
    if (isExternalBannerLink(slide.linkPath)) {
      const isHttp = /^https?:/i.test(slide.linkPath);
      return (
        <a
          href={slide.linkPath}
          className="relative block size-full"
          {...(isHttp ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {img}
        </a>
      );
    }
    return (
      <Link href={slide.linkPath} className="relative block size-full">
        {img}
      </Link>
    );
  }
  return <div className="relative size-full">{img}</div>;
}

export function PageBannerFixed({ slide }: { slide: PageBannerSlideView }) {
  return (
    <section className="page-banner relative w-full overflow-hidden bg-muted" aria-label="Banner">
      <div className="relative mx-auto aspect-[21/9] max-h-[240px] w-full">
        <BannerSlideImage slide={slide} priority />
      </div>
    </section>
  );
}

export function PageBannerCarousel({ slides }: { slides: PageBannerSlideView[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => (i + delta + slides.length) % slides.length);
    },
    [slides.length]
  );

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => go(1), 5000);
    return () => window.clearInterval(timer);
  }, [slides.length, paused, go]);

  const slide = slides[index]!;

  return (
    <section
      className="page-banner relative w-full overflow-hidden bg-muted"
      aria-label="Banner slideshow"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative mx-auto aspect-[21/9] max-h-[240px] w-full">
        <BannerSlideImage slide={slide} priority={index === 0} />
        <button
          type="button"
          aria-label="สไลด์ก่อนหน้า"
          className="absolute top-1/2 left-2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60"
          onClick={() => go(-1)}
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          aria-label="สไลด์ถัดไป"
          className="absolute top-1/2 right-2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60"
          onClick={() => go(1)}
        >
          <ChevronRight className="size-5" />
        </button>
        <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`ไปสไลด์ ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              className={cn(
                "size-2 rounded-full transition-colors",
                i === index ? "bg-brand-orange" : "bg-white/70 hover:bg-white"
              )}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

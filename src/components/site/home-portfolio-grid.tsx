"use client";

import { useTranslations } from "next-intl";
import type { PortfolioItem } from "@/app/[locale]/portfolio/portfolio-grid";

/** Home page latest-works grid, matching the owner's web2.html reference. */
export function HomePortfolioGrid({ items }: { items: PortfolioItem[] }) {
  const t = useTranslations("portfolio");
  const groupName = "home-work-lightbox";

  return (
    <>
      <div className="home-portfolio-grid grid gap-5 min-[769px]:grid-cols-2 min-[1201px]:grid-cols-4">
        <input
          id="home-work-none"
          type="radio"
          name={groupName}
          className="home-work-toggle"
          defaultChecked
        />
        {items.map((p, i) => (
          <div key={p.id} className="contents">
          <input
            id={`home-work-toggle-${i}`}
            type="radio"
            name={groupName}
            className="home-work-toggle"
          />
          <label
            key={p.id}
            htmlFor={`home-work-toggle-${i}`}
            role="button"
            tabIndex={0}
            className="home-portfolio-card card-in flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-card text-left shadow-[0_6px_20px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-[5px] hover:shadow-[0_12px_30px_rgba(0,0,0,0.15)]"
            style={{ animationDelay: `${(i % 4) * 100}ms` }}
          >
            {p.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.imageUrl}
                alt={p.title}
                className="home-portfolio-image h-[280px] w-full object-cover"
                loading="lazy"
              />
            )}
            <div className="home-portfolio-caption bg-card p-5 text-center">
              <div>
                <h3 className="m-0 text-lg font-semibold text-[#222]">{p.title}</h3>
                <p className="home-portfolio-meta mt-2 hidden text-sm text-muted-foreground">
                  {t("province")}: {p.province} · {t("systemSize")}: {p.systemSizeKw}KW
                </p>
              </div>
              <span className="home-portfolio-view hidden" aria-hidden="true">
                {t("viewProject")}
              </span>
            </div>
          </label>
          <div
            className="home-portfolio-lightbox fixed inset-0 z-[200] flex items-center justify-center bg-[#111] p-4"
            aria-label={p.title}
          >
            {items.length > 1 && (
              <label
                htmlFor={`home-work-toggle-${(i - 1 + items.length) % items.length}`}
                aria-label={t("lightboxPrev")}
                role="button"
                className="absolute top-1/2 left-2 z-10 -translate-y-1/2 select-none px-3 py-2 text-4xl font-light text-white/70 transition-colors hover:text-white sm:left-6 sm:text-5xl"
              >
                ❮
              </label>
            )}

            {items.length > 1 && (
              <label
                htmlFor={`home-work-toggle-${(i + 1) % items.length}`}
                aria-label={t("lightboxNext")}
                role="button"
                className="absolute top-1/2 right-2 z-10 -translate-y-1/2 select-none px-3 py-2 text-4xl font-light text-white/70 transition-colors hover:text-white sm:right-6 sm:text-5xl"
              >
                ❯
              </label>
            )}

            <div className="relative flex max-h-[75%] w-full max-w-[85%] flex-col items-center gap-5 px-10 sm:px-16">
              <label
                htmlFor="home-work-none"
                aria-label={t("lightboxClose")}
                role="button"
                className="absolute -top-12 right-0 select-none text-3xl font-light text-white/70 transition-colors hover:text-white sm:-top-14 sm:text-4xl"
              >
                ×
              </label>

              {p.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.imageUrl}
                  alt={p.title}
                  className="lightbox-zoom-in max-h-[75vh] w-auto rounded-lg object-contain shadow-2xl"
                />
              )}
              <div className="text-center text-white">
                <h3 className="text-xl font-medium sm:text-2xl">{p.title}</h3>
              </div>
            </div>
          </div>
          </div>
        ))}
      </div>
    </>
  );
}

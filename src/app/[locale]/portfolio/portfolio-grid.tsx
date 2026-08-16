"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { PortfolioLightbox } from "./portfolio-lightbox";

const FILTERS = [
  { value: "all", key: "filterAll" },
  { value: "RESIDENTIAL", key: "filterResidential" },
  { value: "COMMERCIAL", key: "filterCommercial" },
  { value: "INDUSTRIAL", key: "filterIndustrial" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

export type PortfolioItem = {
  id: string;
  title: string;
  description: string;
  province: string;
  systemSizeKw: number;
  category: string;
  imageUrl: string | null;
  imageUrls: string[];
};

export function PortfolioGrid({
  projects,
  initialCategory,
}: {
  projects: PortfolioItem[];
  initialCategory: string;
}) {
  const t = useTranslations("portfolio");
  const present = new Set(projects.map((p) => p.category));
  const availableFilters = FILTERS.filter(
    (f) => f.value === "all" || present.has(f.value)
  );
  const showFilters = availableFilters.length > 2;
  const [filter, setFilter] = useState<Filter>(
    availableFilters.find((f) => f.value === initialCategory)?.value ?? "all"
  );
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const visible =
    filter === "all" ? projects : projects.filter((p) => p.category === filter);

  return (
    <>
      {showFilters && (
        <div className="mb-9 flex flex-wrap justify-center gap-2">
          {availableFilters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full border px-5 py-2 text-sm font-medium transition-colors",
                filter === f.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground"
              )}
            >
              {t(f.key)}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="mt-9 py-16 text-center text-muted-foreground">{t("empty")}</p>
      ) : (
        <div
          key={filter}
          className={cn(
            "mx-auto mt-9 grid max-w-6xl gap-7 sm:grid-cols-2",
            visible.length >= 3 ? "lg:grid-cols-3" : "lg:max-w-[860px]"
          )}
        >
          {visible.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setOpenIndex(i)}
              className="card-in flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {p.imageUrl && (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.imageUrl}
                    alt={p.title}
                    className="h-64 w-full object-cover"
                    loading="lazy"
                  />
                  {p.imageUrls.length > 1 && (
                    <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
                      +{p.imageUrls.length - 1}
                    </span>
                  )}
                </div>
              )}
              <div className="p-5 text-center">
                <h3 className="font-semibold text-foreground">{p.title}</h3>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("province")}: {p.province} · {t("systemSize")}:{" "}
                  {p.systemSizeKw}KW
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <PortfolioLightbox
        items={visible}
        openIndex={openIndex}
        onOpenIndexChange={setOpenIndex}
      />
    </>
  );
}

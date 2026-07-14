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
};

export function PortfolioGrid({
  projects,
  initialCategory,
}: {
  projects: PortfolioItem[];
  initialCategory: string;
}) {
  const t = useTranslations("portfolio");
  const [filter, setFilter] = useState<Filter>(
    FILTERS.find((f) => f.value === initialCategory)?.value ?? "all"
  );
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const visible =
    filter === "all" ? projects : projects.filter((p) => p.category === filter);

  return (
    <>
      <div className="mb-9 flex flex-wrap justify-center gap-2">
        {FILTERS.map((f) => (
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

      {visible.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">{t("empty")}</p>
      ) : (
        <div key={filter} className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setOpenIndex(i)}
              className="card-in flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {p.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.imageUrl}
                  alt={p.title}
                  className="h-64 w-full object-cover"
                  loading="lazy"
                />
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

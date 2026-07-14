"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import type { PortfolioItem } from "./portfolio-grid";

export function PortfolioLightbox({
  items,
  openIndex,
  onOpenIndexChange,
  showMeta = true,
}: {
  items: PortfolioItem[];
  openIndex: number | null;
  onOpenIndexChange: (index: number | null) => void;
  showMeta?: boolean;
}) {
  const t = useTranslations("portfolio");
  const isOpen = openIndex !== null;
  const item = openIndex !== null ? items[openIndex] : null;

  const goPrev = () => {
    if (openIndex === null) return;
    onOpenIndexChange((openIndex - 1 + items.length) % items.length);
  };

  const goNext = () => {
    if (openIndex === null) return;
    onOpenIndexChange((openIndex + 1) % items.length);
  };

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenIndexChange(null);
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, openIndex, items.length]);

  if (!isOpen || !item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={() => onOpenIndexChange(null)}
    >
      {items.length > 1 && (
        <button
          type="button"
          aria-label={t("lightboxPrev")}
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          className="absolute top-1/2 left-2 z-10 -translate-y-1/2 select-none px-3 py-2 text-4xl font-light text-white/70 transition-colors hover:text-white sm:left-6 sm:text-5xl"
        >
          ❮
        </button>
      )}

      {items.length > 1 && (
        <button
          type="button"
          aria-label={t("lightboxNext")}
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          className="absolute top-1/2 right-2 z-10 -translate-y-1/2 select-none px-3 py-2 text-4xl font-light text-white/70 transition-colors hover:text-white sm:right-6 sm:text-5xl"
        >
          ❯
        </button>
      )}

      <div
        className="relative flex max-h-[75%] w-full max-w-[85%] flex-col items-center gap-5 px-10 sm:px-16"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label={t("lightboxClose")}
          onClick={() => onOpenIndexChange(null)}
          className="absolute -top-12 right-0 select-none text-3xl font-light text-white/70 transition-colors hover:text-white sm:-top-14 sm:text-4xl"
        >
          ×
        </button>

        {item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.title}
            className="lightbox-zoom-in max-h-[75vh] w-auto rounded-lg object-contain shadow-2xl"
          />
        )}
        <div className="text-center text-white">
          <h3 className="text-xl font-medium sm:text-2xl">{item.title}</h3>
          {showMeta && (
            <p className="mt-2 text-sm text-white/70">
              {t("province")}: {item.province} · {t("systemSize")}:{" "}
              {item.systemSizeKw}KW
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

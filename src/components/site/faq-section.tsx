"use client";

import { ChevronDown, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Reveal } from "@/components/site/reveal";
import { cn } from "@/lib/utils";

const QUESTION_KEYS = ["q1", "q2", "q3", "q4", "q5"] as const;

export function FaqSection() {
  const t = useTranslations("faq");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-14">
        <Reveal>
          <span className="inline-block rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-brand-orange-cta">
            {t("badge")}
          </span>
          <h2 className="mt-4 text-2xl font-extrabold tracking-[-0.01em] text-primary sm:text-3xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-sm text-muted-foreground sm:text-base">{t("intro")}</p>
          <a
            href="https://line.me/R/ti/p/@kkdsolar"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#06C755] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#05a648] hover:shadow-[0_4px_10px_rgba(6,199,85,0.3)]"
          >
            <MessageCircle className="size-4" />
            {t("lineButton")}
          </a>
        </Reveal>

        <div className="flex flex-col gap-3">
          {QUESTION_KEYS.map((key, i) => {
            const isOpen = openIndex === i;
            const answerKey = `a${i + 1}` as const;
            return (
              <Reveal key={key} delay={i * 60}>
                <div className="rounded-xl border border-border/70 bg-card shadow-sm">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 bg-muted/60 px-5 py-4 text-left"
                  >
                    <span className="text-sm font-semibold text-foreground sm:text-base">
                      {t(key)}
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className={cn(
                        "size-5 shrink-0 text-brand-orange transition-transform duration-300 motion-reduce:transition-none",
                        isOpen && "rotate-180"
                      )}
                    />
                  </button>
                  <div
                    className={cn(
                      "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-4 text-sm text-muted-foreground">{t(answerKey)}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

"use client";

import { ChevronDown, MessageCircle } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Reveal } from "@/components/site/reveal";
import { cn } from "@/lib/utils";

/**
 * Overlay applied over an optional FAQ background image (#142). Locked by
 * S0 (ux-ui-expert, opus) at 88% white — 85% fails WCAG AA 4.5:1 for
 * `text-muted-foreground` against a worst-case black photo (4.44:1); 88%
 * clears it with margin (4.77:1) while still keeping the photo visible.
 * Exported so the admin preview card renders the exact same overlay the
 * public page uses.
 */
export const FAQ_BG_OVERLAY_CLASS = "absolute inset-0 bg-white/88";

export type FaqEntry = {
  /** Stable id for the React key — a `HomeFaqItem.id` or a static message key when there's no DB row. */
  id: string;
  question: string;
  answer: string;
};

/**
 * Presentation-only — all copy and the FAQ list itself come from the parent
 * (`home-content.tsx`), which resolves whole-record from either
 * `HomePageContent`/`HomeFaqItem` or `messages` (Home CMS slice H3). Text
 * renders as plain text nodes only (never `dangerouslySetInnerHTML`), which
 * is also the XSS control for admin-authored FAQ copy (security research
 * S11/S12) — React escapes these by default.
 */
export function FaqSection({
  badge,
  title,
  intro,
  lineButtonLabel,
  lineUrl,
  items,
  backgroundImageUrl,
}: {
  badge: string;
  title: string;
  intro: string;
  lineButtonLabel: string;
  lineUrl: string;
  items: FaqEntry[];
  /** Optional decorative background (#142) — `null`/`undefined` renders the original flat markup pixel-for-pixel. */
  backgroundImageUrl?: string | null;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(items.length > 0 ? 0 : null);

  const content = (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-14">
        <Reveal>
          <span className="inline-block rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-primary">
            {badge}
          </span>
          <h2 className="mt-4 text-2xl font-extrabold tracking-[-0.01em] text-primary sm:text-3xl">
            {title}
          </h2>
          <p className="mt-4 text-sm text-muted-foreground sm:text-base">{intro}</p>
          <a
            href={lineUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#06C755] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#05a648] hover:shadow-[0_4px_10px_rgba(6,199,85,0.3)]"
          >
            <MessageCircle className="size-4" />
            {lineButtonLabel}
          </a>
        </Reveal>

        {items.length > 0 && (
          <div className="flex flex-col gap-3">
            {items.map((item, i) => {
              const isOpen = openIndex === i;
              return (
                <Reveal key={item.id} delay={i * 60}>
                  <div className="rounded-xl border border-border/70 bg-card shadow-sm">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenIndex(isOpen ? null : i)}
                      className="flex w-full items-center justify-between gap-4 bg-muted/60 px-5 py-4 text-left"
                    >
                      <span className="text-sm font-semibold text-foreground sm:text-base">
                        {item.question}
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
                        <p className="px-5 pb-4 text-sm text-muted-foreground">{item.answer}</p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}
    </div>
  );

  if (!backgroundImageUrl) {
    return <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">{content}</section>;
  }

  return (
    // Below lg, [locale]/layout.tsx pads <main> with pb-[76px] for the fixed
    // Book/Quote bar; FAQ is the last section, so extend the band over that gap
    // instead of leaving a strip of page background above the footer.
    <section className="relative isolate py-16 max-lg:-mb-[76px] max-lg:pb-[calc(4rem+76px)]">
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <Image
          src={backgroundImageUrl}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className={FAQ_BG_OVERLAY_CLASS} />
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">{content}</div>
    </section>
  );
}

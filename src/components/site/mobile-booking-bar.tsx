"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { bookingHref } from "@/lib/booking-links";

/**
 * Persistent booking CTA for mobile only (issue #33). The header's booking
 * button lives in `hidden lg:flex` (site-header.tsx) — below `lg` there is
 * no persistent path to /booking at all once the mobile nav sheet is closed,
 * which is what left first-time mobile visitors with zero visible CTA during
 * the pre-consent window before the CookieYes banner is dismissed. This bar
 * is the code-side fix; the banner's own height/placement is a CookieYes
 * dashboard config change, out of scope here (see commit message).
 *
 * Hidden once /booking itself is open (the page has its own form, a second
 * "go to booking" CTA on top of it would be redundant) and hidden once the
 * footer scrolls into view, so it never sits on top of footer content/links
 * at the bottom of the page.
 */
export function MobileBookingBar() {
  const t = useTranslations("common");
  const pathname = usePathname();
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const footer = document.getElementById("site-footer");
    if (!footer) return;

    const observer = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting), {
      rootMargin: "0px",
      threshold: 0,
    });
    observer.observe(footer);

    return () => observer.disconnect();
  }, []);

  const onBookingPage = pathname === "/booking" || pathname.startsWith("/booking/");
  if (onBookingPage || footerVisible) return null;

  return (
    <div
      className="mobile-booking-bar fixed inset-x-0 bottom-0 z-40 flex items-center justify-center gap-3 border-t border-white/10 bg-[#061a33] px-4 py-3 lg:hidden"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <Link href={bookingHref({ tab: "survey" })} className="btn-pill-outline flex-1 px-4 py-2.5 text-center text-sm">
        {t("bookSurvey")}
      </Link>
      <Link href={bookingHref({ tab: "quote" })} className="btn-pill flex-1 px-4 py-2.5 text-center text-sm">
        {t("requestQuote")}
      </Link>
    </div>
  );
}

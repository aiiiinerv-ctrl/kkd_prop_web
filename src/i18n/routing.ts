import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["th", "en"],
  defaultLocale: "th",
  localePrefix: "always",
  // Always land on the default locale; ignore Accept-Language and NEXT_LOCALE.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];

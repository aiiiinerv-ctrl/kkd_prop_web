import { getTranslations, setRequestLocale } from "next-intl/server";
import { SectionHeading } from "@/components/site/section-heading";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const meta = await pageMetadata(locale, "cookiePolicy", "/cookie-policy");
  // A policy page has no business competing for search traffic — people reach
  // it from the footer or the consent banner. `follow` stays on so the links
  // out of it still count.
  return { ...meta, robots: { index: false, follow: true } };
}

export default async function CookiePolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cookiePolicy");

  // The four cookies this site actually sets, kept in sync with
  // src/lib/ref-cookie.ts, src/proxy.ts and the Auth.js session cookie. Adding
  // a cookie anywhere means adding a row here — the page claims to be the
  // complete list.
  const COOKIES = [
    {
      name: "NEXT_LOCALE",
      purpose: t("localePurpose"),
      duration: t("localeDuration"),
      category: t("categoryNecessary"),
    },
    {
      name: "authjs.session-token",
      purpose: t("sessionPurpose"),
      duration: t("sessionDuration"),
      category: t("categoryNecessary"),
    },
    {
      name: "cookieyes-consent",
      purpose: t("consentPurpose"),
      duration: t("consentDuration"),
      category: t("categoryNecessary"),
    },
    {
      name: "kkd_ref",
      purpose: t("refPurpose"),
      duration: t("refDuration"),
      category: t("categoryAdvertisement"),
    },
  ];

  return (
    <main>
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <SectionHeading title={t("title")} subtitle={t("intro")} />

        {/* Not SectionHeading's `caption`, which is faded italic 12px and
            measures ~3.1:1 — below AA. This line exists precisely to be read:
            a policy with no visible date can't be judged current, and the
            controller's identity is the other half of that. Left as its own
            element rather than lightening `caption` itself, which the
            portfolio page also uses.
            Keep `lastUpdated` in step with edits to this page's wording — a
            stale date is worse than no date. */}
        <p className="-mt-6 mb-10 text-center text-xs text-muted-foreground">
          {t("lastUpdated")} · {t("controller")}
        </p>

        <h2 className="text-lg font-semibold text-primary">{t("tableHeading")}</h2>

        {/* Below sm the same four fields become one card per cookie. A
            horizontally scrolling table at 375px shows barely one and a half
            columns, hides retention and category entirely, and reads as broken
            rather than scrollable — and most visitors here are on a phone. */}
        <ul className="mt-4 space-y-4 sm:hidden">
          {COOKIES.map((cookie) => (
            <li
              key={cookie.name}
              className="rounded-xl border border-border/70 p-4 shadow-sm"
            >
              <div className="font-mono text-xs break-all text-foreground">{cookie.name}</div>
              <p className="mt-2 text-sm text-muted-foreground">{cookie.purpose}</p>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                {/* Full-strength muted, not /70: at 12px the faded token
                    measures ~3.1:1, and these labels are the only thing
                    telling a phone reader which value is which. */}
                <dt className="text-muted-foreground">{t("colDuration")}</dt>
                <dd className="text-muted-foreground">{cookie.duration}</dd>
                <dt className="text-muted-foreground">{t("colCategory")}</dt>
                <dd className="text-muted-foreground">{cookie.category}</dd>
              </dl>
            </li>
          ))}
        </ul>

        <div
          // Scrollable regions need to be focusable, or a keyboard-only visitor
          // cannot reach the columns that are off-screen.
          tabIndex={0}
          role="region"
          aria-label={t("tableHeading")}
          className="mt-4 hidden overflow-x-auto rounded-xl border border-border/70 shadow-sm sm:block"
        >
          <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold text-primary">
                  {t("colName")}
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-primary">
                  {t("colPurpose")}
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-primary">
                  {t("colDuration")}
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-primary">
                  {t("colCategory")}
                </th>
              </tr>
            </thead>
            <tbody>
              {COOKIES.map((cookie) => (
                <tr key={cookie.name} className="border-t border-border/70 align-top">
                  <th
                    scope="row"
                    // Not text-primary: navy on white reads as a hyperlink, and
                    // these are cookie names, not somewhere to click.
                    className="px-4 py-3 font-mono text-xs font-normal whitespace-nowrap text-foreground"
                  >
                    {cookie.name}
                  </th>
                  <td className="px-4 py-3 text-muted-foreground">{cookie.purpose}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {cookie.duration}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {cookie.category}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mt-10 text-lg font-semibold text-primary">{t("thirdPartyHeading")}</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          {t.rich("thirdPartyBody", {
            link: (chunks) => (
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-brand-orange"
              >
                {chunks}
              </a>
            ),
          })}
        </p>

        <h2 className="mt-10 text-lg font-semibold text-primary">{t("manageHeading")}</h2>
        <p className="mt-3 text-sm text-muted-foreground">{t("manageBody")}</p>

        <h2 className="mt-10 text-lg font-semibold text-primary">{t("contactHeading")}</h2>
        <p className="mt-3 text-sm text-muted-foreground">{t("contactBody")}</p>
      </section>
    </main>
  );
}

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

        <h2 className="text-lg font-semibold text-primary">{t("tableHeading")}</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border/70 shadow-sm">
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
                    className="px-4 py-3 font-mono text-xs font-normal whitespace-nowrap text-primary"
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

        <h2 className="mt-10 text-lg font-semibold text-primary">{t("manageHeading")}</h2>
        <p className="mt-3 text-sm text-muted-foreground">{t("manageBody")}</p>

        <h2 className="mt-10 text-lg font-semibold text-primary">{t("contactHeading")}</h2>
        <p className="mt-3 text-sm text-muted-foreground">{t("contactBody")}</p>
      </section>
    </main>
  );
}

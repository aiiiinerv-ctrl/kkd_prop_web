import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 300;

const THEME_ROUTES = [
  {
    key: "theme1",
    href: "/theme-1",
    swatches: ["#004b87", "#ff7f00", "#ffffff"],
  },
  {
    key: "theme2",
    href: "/theme-2",
    swatches: ["#050505", "#c89d53", "#ffffff"],
  },
  {
    key: "theme3",
    href: "/theme-3",
    swatches: ["#0d47a1", "#ff9f00", "#f4f6f9"],
  },
  {
    key: "theme4",
    href: "/theme-4",
    swatches: ["#0d47a1", "#ff9f00", "#050505"],
  },
  {
    key: "theme5",
    href: "/theme-5",
    swatches: ["#0d47a1", "#c99700", "#faf3d9"],
  },
  {
    key: "theme6",
    href: "/theme-6",
    swatches: ["#0a1e3c", "#f0b429", "#ffffff"],
  },
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return pageMetadata(locale, "home", "/themes");
}

export default async function ThemeSelectorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("themeSelector");

  return (
    <main className="bg-[#fffaf5]">
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold text-brand-orange">{t("eyebrow")}</p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.01em] text-primary sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            {t("subtitle")}
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {THEME_ROUTES.map((theme) => (
            <Link
              key={theme.key}
              href={theme.href}
              className="group flex h-full flex-col rounded-2xl border border-[#ead9c5] bg-card p-6 shadow-sm transition-all hover:-translate-y-1.5 hover:shadow-lg"
            >
              <div className="flex gap-2">
                {theme.swatches.map((color) => (
                  <span
                    key={color}
                    className="h-10 flex-1 rounded-lg border border-black/10"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <h2 className="mt-6 text-xl font-bold text-primary">{t(`${theme.key}.title`)}</h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                {t(`${theme.key}.description`)}
              </p>
              <div className="mt-5 space-y-3 border-t border-border/70 pt-4 text-sm">
                <p className="leading-6 text-foreground">
                  <span className="font-semibold text-primary">{t("conceptLabel")}:</span>{" "}
                  {t(`${theme.key}.concept`)}
                </p>
                <p className="leading-6 text-muted-foreground">
                  <span className="font-semibold text-foreground">{t("bestForLabel")}:</span>{" "}
                  {t(`${theme.key}.bestFor`)}
                </p>
                <p className="leading-6 text-muted-foreground">
                  <span className="font-semibold text-foreground">{t("moodLabel")}:</span>{" "}
                  {t(`${theme.key}.mood`)}
                </p>
              </div>
              <span className="mt-6 inline-flex items-center font-semibold text-brand-orange transition-all group-hover:gap-2">
                {t("openPreview")} <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

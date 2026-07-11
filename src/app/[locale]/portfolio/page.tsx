import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { use } from "react";

export default function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("portfolio");

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-primary">{t("title")}</h1>
    </main>
  );
}

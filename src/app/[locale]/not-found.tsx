import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFoundPage() {
  const t = useTranslations("nav");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="text-6xl font-bold text-brand-gold">404</p>
      <Link
        href="/"
        className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
      >
        {t("home")}
      </Link>
    </main>
  );
}

import { HomeContent } from "@/app/[locale]/home-content";

export const revalidate = 300;

export default function Theme3Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return <HomeContent params={params} themeVariant="theme-3" />;
}

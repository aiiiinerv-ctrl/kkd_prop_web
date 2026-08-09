import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["@prisma/adapter-mariadb", "mariadb"],
  // Default server-action body limit is 1MB — too small once a form can
  // attach several photos at once (portfolio multi-image upload).
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Shared-hosting (DirectAdmin + CloudLinux Node.js Selector / Passenger)
  // deploy target has no SSH/git and only FTP/File Manager upload — a
  // minimal, output-traced node_modules keeps the upload small. See
  // docs/plans/kkd-shared-hosting-deploy-guide.md §4.
  output: "standalone",
};

export default withNextIntl(nextConfig);

/** Foreign-key-safe backup/restore order and the matching Prisma delegate. */
export const APPLICATION_TABLE_CONTRACTS = [
  { table: "PromoChannel", delegate: "promoChannel" },
  { table: "PromoLandingPath", delegate: "promoLandingPath" },
  { table: "ChannelExecutive", delegate: "channelExecutive" },
  { table: "AdminUser", delegate: "adminUser" },
  { table: "Lead", delegate: "lead" },
  { table: "SurveyBooking", delegate: "surveyBooking" },
  { table: "BookingCapacitySetting", delegate: "bookingCapacitySetting" },
  { table: "PaymentSettings", delegate: "paymentSettings" },
  { table: "SiteSettings", delegate: "siteSettings" },
  { table: "PageSeo", delegate: "pageSeo" },
  { table: "AboutContent", delegate: "aboutContent" },
  { table: "HomePageContent", delegate: "homePageContent" },
  { table: "Service", delegate: "service" },
  { table: "Package", delegate: "package" },
  { table: "PortfolioProject", delegate: "portfolioProject" },
  { table: "Testimonial", delegate: "testimonial" },
  { table: "HomeFaqItem", delegate: "homeFaqItem" },
  { table: "AboutFeaturedTestimonial", delegate: "aboutFeaturedTestimonial" },
  { table: "ServicesPageContent", delegate: "servicesPageContent" },
  { table: "PackagesPageContent", delegate: "packagesPageContent" },
  { table: "PortfolioPageContent", delegate: "portfolioPageContent" },
  { table: "CalculatorPageContent", delegate: "calculatorPageContent" },
  { table: "AuditLog", delegate: "auditLog" },
] as const;

export type ApplicationTable = (typeof APPLICATION_TABLE_CONTRACTS)[number]["table"];
export const APPLICATION_TABLES: readonly ApplicationTable[] = APPLICATION_TABLE_CONTRACTS.map(
  ({ table }) => table
);

/** Bounded CMS public storage namespaces included in backup/restore snapshots. */
export const CMS_PUBLIC_STORAGE_NAMESPACES = ["public/seo/og", "public/pages"] as const;

export const INFRASTRUCTURE_TABLES = ["_prisma_migrations"] as const;

export type ForeignKeyContract = {
  name: string;
  table: ApplicationTable;
  column: string;
  referencedTable: ApplicationTable;
  referencedColumn: string;
  deleteRule: "CASCADE" | "RESTRICT" | "SET NULL";
  updateRule: "CASCADE";
};

export const FOREIGN_KEY_CONTRACTS: readonly ForeignKeyContract[] = [
  {
    name: "AdminUser_linkedChannelExecutiveId_fkey",
    table: "AdminUser",
    column: "linkedChannelExecutiveId",
    referencedTable: "ChannelExecutive",
    referencedColumn: "id",
    deleteRule: "SET NULL",
    updateRule: "CASCADE",
  },
  {
    name: "ChannelExecutive_channelId_fkey",
    table: "ChannelExecutive",
    column: "channelId",
    referencedTable: "PromoChannel",
    referencedColumn: "id",
    deleteRule: "CASCADE",
    updateRule: "CASCADE",
  },
  {
    name: "Lead_sourceChannelId_fkey",
    table: "Lead",
    column: "sourceChannelId",
    referencedTable: "PromoChannel",
    referencedColumn: "id",
    deleteRule: "SET NULL",
    updateRule: "CASCADE",
  },
  {
    name: "Lead_autoSourceChannelId_fkey",
    table: "Lead",
    column: "autoSourceChannelId",
    referencedTable: "PromoChannel",
    referencedColumn: "id",
    deleteRule: "SET NULL",
    updateRule: "CASCADE",
  },
  {
    name: "Lead_autoSourceExecutiveId_fkey",
    table: "Lead",
    column: "autoSourceExecutiveId",
    referencedTable: "ChannelExecutive",
    referencedColumn: "id",
    deleteRule: "SET NULL",
    updateRule: "CASCADE",
  },
  {
    name: "Lead_assignedSalesId_fkey",
    table: "Lead",
    column: "assignedSalesId",
    referencedTable: "AdminUser",
    referencedColumn: "id",
    deleteRule: "SET NULL",
    updateRule: "CASCADE",
  },
  {
    name: "SurveyBooking_leadId_fkey",
    table: "SurveyBooking",
    column: "leadId",
    referencedTable: "Lead",
    referencedColumn: "id",
    deleteRule: "CASCADE",
    updateRule: "CASCADE",
  },
  {
    name: "SurveyBooking_assignedEngineerId_fkey",
    table: "SurveyBooking",
    column: "assignedEngineerId",
    referencedTable: "AdminUser",
    referencedColumn: "id",
    deleteRule: "SET NULL",
    updateRule: "CASCADE",
  },
  {
    name: "SurveyBooking_assignedSalesId_fkey",
    table: "SurveyBooking",
    column: "assignedSalesId",
    referencedTable: "AdminUser",
    referencedColumn: "id",
    deleteRule: "SET NULL",
    updateRule: "CASCADE",
  },
  {
    name: "Testimonial_projectId_fkey",
    table: "Testimonial",
    column: "projectId",
    referencedTable: "PortfolioProject",
    referencedColumn: "id",
    deleteRule: "SET NULL",
    updateRule: "CASCADE",
  },
  {
    name: "HomeFaqItem_homePageContentId_fkey",
    table: "HomeFaqItem",
    column: "homePageContentId",
    referencedTable: "HomePageContent",
    referencedColumn: "id",
    deleteRule: "CASCADE",
    updateRule: "CASCADE",
  },
  {
    name: "AboutFeaturedTestimonial_aboutContentId_fkey",
    table: "AboutFeaturedTestimonial",
    column: "aboutContentId",
    referencedTable: "AboutContent",
    referencedColumn: "id",
    deleteRule: "CASCADE",
    updateRule: "CASCADE",
  },
  {
    name: "AboutFeaturedTestimonial_testimonialId_fkey",
    table: "AboutFeaturedTestimonial",
    column: "testimonialId",
    referencedTable: "Testimonial",
    referencedColumn: "id",
    deleteRule: "RESTRICT",
    updateRule: "CASCADE",
  },
  {
    name: "AuditLog_actorId_fkey",
    table: "AuditLog",
    column: "actorId",
    referencedTable: "AdminUser",
    referencedColumn: "id",
    deleteRule: "RESTRICT",
    updateRule: "CASCADE",
  },
] as const;

export function quoteIdentifier(identifier: string): string {
  const allowed = new Set<string>([
    ...APPLICATION_TABLES,
    ...INFRASTRUCTURE_TABLES,
    ...FOREIGN_KEY_CONTRACTS.flatMap((fk) => [fk.name, fk.column, fk.referencedColumn]),
    "id",
  ]);
  if (!allowed.has(identifier)) {
    throw new Error(`refusing unchecked SQL identifier: ${identifier}`);
  }
  return `\`${identifier}\``;
}

export function isDisposableDatabaseName(name: string): boolean {
  return /^kkd_prop_[a-z0-9_]*(?:test|rehearsal)$/.test(name);
}

export function assertDisposableLocalDatabase(databaseUrl: string): URL {
  const parsed = new URL(databaseUrl);
  const databaseName = parsed.pathname.slice(1);
  if (parsed.protocol !== "mysql:") throw new Error("database URL must use mysql://");
  if (!["127.0.0.1", "localhost", "::1"].includes(parsed.hostname)) {
    throw new Error("rehearsal database must be on a loopback host");
  }
  if (!isDisposableDatabaseName(databaseName)) {
    throw new Error("rehearsal database name must start with kkd_prop_ and end in test or rehearsal");
  }
  return parsed;
}

import "dotenv/config";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
});

const STORAGE_ROOT = process.env.STORAGE_ROOT ?? "./storage";
const SEED_ASSET_ROOT = path.join(process.cwd(), "prisma", "seed-assets");

async function placeholderImage(key: string, color: string) {
  const filePath = path.join(STORAGE_ROOT, key);
  // Skip if the file already exists — this preserves manually placed real
  // photos (e.g. licensed stock images swapped in for some portfolio
  // projects) across reseeds instead of overwriting them with a placeholder.
  if (existsSync(filePath)) return;
  await mkdir(path.dirname(filePath), { recursive: true });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
    <rect width="800" height="600" fill="${color}"/>
    <rect x="80" y="120" width="640" height="360" rx="12" fill="#ffffff" opacity="0.15"/>
    <g fill="#ffffff" opacity="0.5">
      ${[0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4].map((c) => `<rect x="${110 + c * 124}" y="${150 + r * 78}" width="112" height="66" rx="4"/>`).join("")).join("")}
    </g>
  </svg>`;
  const jpeg = await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer();
  await writeFile(filePath, jpeg);
}

async function seedPortfolioImage(key: string, color: string, sourceFileName?: string) {
  const filePath = path.join(STORAGE_ROOT, key);
  if (existsSync(filePath)) return;

  if (sourceFileName) {
    const sourcePath = path.join(SEED_ASSET_ROOT, "portfolio", sourceFileName);
    if (existsSync(sourcePath)) {
      await mkdir(path.dirname(filePath), { recursive: true });
      await copyFile(sourcePath, filePath);
      return;
    }
  }

  await placeholderImage(key, color);
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn("ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin seed");
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      name: process.env.ADMIN_NAME ?? "Admin",
      role: "ADMIN",
    },
  });
  console.log(`Admin user ready: ${email}`);
}

// Generates the next sequential `<prefix>00N` code within that prefix that
// isn't already taken — existing channels (including leftover e2e test
// channels in dev.db) keep whatever refCode they already have; only
// genuinely new rows get a fresh one. Mirrors src/actions/channels.ts'
// nextChannelRefCode() — both must agree or seed and the admin UI would hand
// out codes on two different schemes. Legacy seed channels with no clean
// taxonomy match (see seedPromoChannels()) fall back to the pre-taxonomy
// "CH" prefix rather than being force-fit into a subType.
async function nextChannelRefCode(prefix: string): Promise<string> {
  const last = await prisma.promoChannel.findFirst({
    where: { refCode: { startsWith: prefix } },
    orderBy: { refCode: "desc" },
    select: { refCode: true },
  });
  const lastNum = last ? Number(last.refCode.slice(prefix.length)) || 0 : 0;
  return `${prefix}${String(lastNum + 1).padStart(3, "0")}`;
}

async function seedPromoChannels() {
  const channels = [
    {
      slug: "facebook",
      nameTh: "Facebook",
      nameEn: "Facebook",
      sortOrder: 1,
      type: "PLATFORM" as const,
      // Clean 1:1 taxonomy match.
      subType: "FB" as const,
      executive: { name: "ทีมการตลาด Facebook", phone: "0800000001" },
    },
    {
      slug: "line",
      nameTh: "LINE",
      nameEn: "LINE",
      sortOrder: 2,
      type: "PLATFORM" as const,
      subType: "LN" as const,
      executive: { name: "ทีมการตลาด LINE", phone: "0800000002" },
    },
    {
      slug: "google",
      nameTh: "Google ค้นหา",
      nameEn: "Google Search",
      sortOrder: 3,
      type: "PLATFORM" as const,
      // No subType in the 10-value taxonomy actually means "organic search" —
      // left unclassified rather than force-fit onto WS ("Website"), which is
      // a different concept (direct site visits, not search-driven ones).
      // Flag for the SA/admin to decide during the Sprint 5.6 manual pass.
      subType: null,
      executive: { name: "ทีมการตลาด Google", phone: "0800000003" },
    },
    {
      slug: "referral",
      nameTh: "เพื่อนแนะนำ",
      nameEn: "Referral",
      sortOrder: 4,
      type: "INDIVIDUAL" as const,
      subType: "RF" as const,
      executive: { name: "ผู้แนะนำทั่วไป", phone: "0800000004" },
    },
    {
      slug: "walkin",
      nameTh: "อื่น ๆ / Walk-in",
      nameEn: "Other / Walk-in",
      sortOrder: 5,
      type: "COMPANY" as const,
      // Same reasoning as google above — none of the 10 values means
      // "walk-in", and CP ("Corporate/B2B") would mislabel it just to match
      // the COMPANY type. Left unclassified for the same manual pass.
      subType: null,
      executive: { name: "หน้าร้าน Walk-in", phone: "0800000005" },
    },
  ];
  for (const c of channels) {
    const { executive, subType, ...channelData } = c;
    const existing = await prisma.promoChannel.findFirst({
      where: { slug: c.slug },
      orderBy: { createdAt: "asc" },
    });
    // update never touches subType — a pre-existing row (dev or production)
    // keeps whatever an admin has or hasn't set (default #10: no auto-migrate).
    const refCode = existing?.refCode ?? (await nextChannelRefCode(subType ?? "CH"));
    const channel = existing
      ? await prisma.promoChannel.update({
          where: { id: existing.id },
          data: { type: c.type },
        })
      : await prisma.promoChannel.create({
          data: { ...channelData, subType, refCode },
        });

    const existingExec = await prisma.channelExecutive.findFirst({
      where: { channelId: channel.id },
    });
    if (!existingExec) {
      // New scheme: running 2 digits appended directly (no "-EX01" — see
      // nextExecutiveRefCode() in src/actions/channels.ts).
      const execRefCode = `${channel.refCode}01`;
      await prisma.channelExecutive.upsert({
        where: { refCode: execRefCode },
        update: {},
        create: {
          channelId: channel.id,
          name: executive.name,
          phone: executive.phone,
          refCode: execRefCode,
        },
      });
    }
  }
  console.log(`Promo channels: ${channels.length}`);
}

async function seedPromoLandingPaths() {
  const paths = [
    "/th/packages",
    "/th",
    "/th/booking",
    "/th/calculator",
    "/th/about",
    "/th/contact",
    "/th/cookie-policy",
    "/th/portfolio",
    "/th/services",
    "/th/testimonials",
  ];

  for (const landingPath of paths) {
    await prisma.promoLandingPath.upsert({
      where: { path: landingPath },
      update: {},
      create: { path: landingPath },
    });
  }
  console.log(`Promo landing paths: ${paths.length}`);
}

// Sprint 2 (RBAC) test accounts — one per non-ADMIN role, so the access
// control matrix can be manually/scriptedly verified without touching real
// staff credentials. Idempotent: only created if missing, never overwrites
// an existing password.
async function seedTestRoleAccounts() {
  const passwordHash = await bcrypt.hash("Test1234!", 12);

  await prisma.adminUser.upsert({
    where: { email: "sales.test@kkdproperty.local" },
    update: {},
    create: {
      email: "sales.test@kkdproperty.local",
      passwordHash,
      name: "ทดสอบ ฝ่ายขาย",
      role: "SALES",
    },
  });

  await prisma.adminUser.upsert({
    where: { email: "finance.test@kkdproperty.local" },
    update: {},
    create: {
      email: "finance.test@kkdproperty.local",
      passwordHash,
      name: "ทดสอบ ฝ่ายการเงิน",
      role: "FINANCE",
    },
  });

  // Link to the Facebook channel's seeded executive (CH001-EX01) so the
  // CHANNEL_EXECUTIVE scope filter has a real row to resolve against.
  const facebookChannel = await prisma.promoChannel.findFirst({
    where: { slug: "facebook" },
    orderBy: { createdAt: "asc" },
  });
  const linkedExecutive = facebookChannel
    ? await prisma.channelExecutive.findFirst({
        where: { channelId: facebookChannel.id },
      })
    : null;

  await prisma.adminUser.upsert({
    where: { email: "channel.test@kkdproperty.local" },
    update: { linkedChannelExecutiveId: linkedExecutive?.id ?? null },
    create: {
      email: "channel.test@kkdproperty.local",
      passwordHash,
      name: "ทดสอบ ผู้ดำเนินการช่องทาง",
      role: "CHANNEL_EXECUTIVE",
      linkedChannelExecutiveId: linkedExecutive?.id ?? null,
    },
  });

  await prisma.adminUser.upsert({
    where: { email: "marketing.test@kkdproperty.local" },
    update: {},
    create: {
      email: "marketing.test@kkdproperty.local",
      passwordHash,
      name: "ทดสอบ ฝ่ายการตลาด",
      role: "MARKETING",
    },
  });

  await prisma.adminUser.upsert({
    where: { email: "editor.test@kkdproperty.local" },
    update: {},
    create: {
      email: "editor.test@kkdproperty.local",
      passwordHash,
      name: "ทดสอบ ผู้ดูแลเนื้อหา",
      role: "EDITOR",
    },
  });

  await prisma.adminUser.upsert({
    where: { email: "executive.test@kkdproperty.local" },
    update: {},
    create: {
      email: "executive.test@kkdproperty.local",
      passwordHash,
      name: "ทดสอบ ผู้บริหาร",
      role: "EXECUTIVE",
    },
  });

  console.log(
    "Test role accounts: sales/finance/channel_executive/marketing/editor/executive ready (password: Test1234!)"
  );
}

async function seedBookingCapacitySetting() {
  const existing = await prisma.bookingCapacitySetting.findFirst();
  if (existing) return;
  await prisma.bookingCapacitySetting.create({
    data: { maxPerDay: 4, maxPerSlot: 2 },
  });
  console.log("Booking capacity setting: ready");
}

// Placeholder values match the fake bank info previously hardcoded in
// booking.slipBankInfo (src/messages/{th,en}.json) so the customer-facing
// text doesn't change until an admin actually edits real payment info.
async function seedPaymentSettings() {
  const existing = await prisma.paymentSettings.findFirst();
  if (existing) return;
  await prisma.paymentSettings.create({
    data: {
      promptpayId: "0824731567",
      bankName: "ธนาคารกสิกรไทย",
      bankAccountNumber: "123-4-56789-0",
      bankAccountName: "บจก. เคเคดี พร็อพเพอร์ตี้",
    },
  });
  console.log("Payment settings: ready");
}

async function seedServices() {
  const services = [
    {
      slug: "on-grid",
      kind: "SYSTEM" as const,
      titleTh: "ระบบออนกริด (On-Grid)",
      titleEn: "On-Grid System",
      descriptionTh:
        "เหมาะกับพื้นที่มีไฟฟ้า ผลิตไฟใช้เองในเวลากลางวันหรือขายคืนการไฟฟ้า ลดค่าไฟได้มากที่สุด คุ้มค่าการลงทุนเร็วที่สุด",
      descriptionEn:
        "Ideal for grid-connected properties. Generate your own daytime electricity or sell surplus back to the utility — the fastest payback of all system types.",
      featuresTh: ["ลดค่าไฟสูงสุด", "ขายไฟคืนการไฟฟ้าได้", "คืนทุนเร็ว 4-6 ปี", "บำรุงรักษาน้อย"],
      featuresEn: ["Maximum bill savings", "Sell surplus power back", "4-6 year payback", "Low maintenance"],
      sortOrder: 1,
    },
    {
      slug: "hybrid",
      kind: "SYSTEM" as const,
      titleTh: "ระบบไฮบริด (Hybrid)",
      titleEn: "Hybrid System",
      descriptionTh:
        "มีแบตเตอรี่สำรอง ผลิตไฟกลางวัน เก็บไว้ใช้กลางคืน ไฟดับก็ยังมีไฟใช้ เหมาะกับบ้านที่ต้องการความมั่นคงของระบบไฟฟ้า",
      descriptionEn:
        "Solar with battery storage — generate by day, use at night, and keep the lights on during outages. Perfect for homes that need reliable power.",
      featuresTh: ["มีไฟใช้ตอนไฟดับ", "เก็บไฟกลางวันไว้ใช้กลางคืน", "ลดการพึ่งพาการไฟฟ้า", "รองรับขยายแบตเตอรี่"],
      featuresEn: ["Backup power during outages", "Store day, use at night", "Grid independence", "Expandable battery"],
      sortOrder: 2,
    },
    {
      slug: "off-grid",
      kind: "SYSTEM" as const,
      titleTh: "ระบบออฟกริด (Off-Grid)",
      titleEn: "Off-Grid System",
      descriptionTh:
        "เหมาะกับพื้นที่ไม่มีไฟฟ้าเข้าถึง เช่น สวน ไร่ บ้านพักต่างจังหวัด พึ่งพาตัวเองได้ 100% ไม่ต้องขอมิเตอร์",
      descriptionEn:
        "For locations without grid access — farms, orchards, remote homes. 100% energy independence with no utility connection required.",
      featuresTh: ["ไม่ต้องมีไฟฟ้าเข้าถึง", "อิสระจากการไฟฟ้า 100%", "ออกแบบตามการใช้งานจริง", "เหมาะกับพื้นที่ห่างไกล"],
      featuresEn: ["No grid required", "100% energy independence", "Sized to your real usage", "Ideal for remote sites"],
      sortOrder: 3,
    },
    {
      slug: "panel-cleaning",
      kind: "MAINTENANCE" as const,
      titleTh: "บริการล้างแผงโซลาร์เซลล์",
      titleEn: "Solar Panel Cleaning",
      descriptionTh:
        "ล้างแผงด้วยน้ำ DI และอุปกรณ์เฉพาะทาง คราบฝุ่น มูลนก คราบตะไคร่ ทำให้ผลิตไฟตกได้ถึง 15-20% ควรล้างตามรอบทุก 6 เดือน",
      descriptionEn:
        "Professional cleaning with DI water and specialized equipment. Dust, bird droppings and grime can cut production by 15-20% — clean every 6 months.",
      featuresTh: ["น้ำ DI ไม่ทิ้งคราบ", "ทีมงานปลอดภัยมาตรฐาน", "รายงานก่อน-หลังล้าง", "แพ็กเกจรายปี"],
      featuresEn: ["Spot-free DI water", "Safety-certified crew", "Before/after report", "Annual plans available"],
      sortOrder: 4,
    },
    {
      slug: "system-inspection",
      kind: "MAINTENANCE" as const,
      titleTh: "ตรวจเช็คระบบโซลาร์เซลล์",
      titleEn: "System Inspection",
      descriptionTh:
        "ตรวจสอบประสิทธิภาพการผลิตไฟ จุดต่อสายไฟ อินเวอร์เตอร์ และโครงสร้าง พร้อมรายงานสรุปโดยวิศวกรมีใบอนุญาต",
      descriptionEn:
        "Full health check of production performance, wiring, inverter and mounting structure, with a summary report by a licensed engineer.",
      featuresTh: ["ตรวจโดยวิศวกรมีใบอนุญาต", "เช็คจุดเสี่ยงไฟฟ้า", "วัดประสิทธิภาพจริง", "รายงานสรุปพร้อมคำแนะนำ"],
      featuresEn: ["Licensed engineer inspection", "Electrical risk check", "Real performance measurement", "Report with recommendations"],
      sortOrder: 5,
    },
  ];
  for (const s of services) {
    await prisma.service.upsert({ where: { slug: s.slug }, update: {}, create: s });
  }
  console.log(`Services: ${services.length}`);
}

// Seasonal production, PDF-verified ranges (5KW baseline units/day), scaled by size.
// Source: KKD_เอกสารความต้องการเว็บไซต์_V1.2.pdf §3.3 — "ต้องใช้ตัวเลขนี้เท่านั้น ห้ามแก้ไข"
// Summer uses min=max=20 to render as "~20"; the other three seasons are true ranges.
function seasonal(sizeKw: number) {
  const scale = sizeKw / 5;
  return {
    summer: {
      monthsTh: "มี.ค. - พ.ค.",
      monthsEn: "Mar - May",
      unitsPerDayMin: Math.round(20 * scale),
      unitsPerDayMax: Math.round(20 * scale),
    },
    earlyRainy: {
      monthsTh: "มิ.ย. - ก.ค.",
      monthsEn: "Jun - Jul",
      unitsPerDayMin: Math.round(16 * scale),
      unitsPerDayMax: Math.round(17 * scale),
    },
    rainy: {
      monthsTh: "ส.ค. - ต.ค.",
      monthsEn: "Aug - Oct",
      unitsPerDayMin: Math.round(12 * scale),
      unitsPerDayMax: Math.round(14 * scale),
    },
    winter: {
      monthsTh: "พ.ย. - ก.พ.",
      monthsEn: "Nov - Feb",
      unitsPerDayMin: Math.round(15 * scale),
      unitsPerDayMax: Math.round(17 * scale),
    },
  };
}

async function seedPackages() {
  const packages = [
    {
      slug: "3kw",
      nameTh: "ระบบ 3KW",
      nameEn: "3KW System",
      sizeKw: 3,
      priceThb: 99000,
      isPopular: false,
      suitableTh: "เหมาะกับบ้านค่าไฟ 1,000 - 1,500 บาท/เดือน",
      suitableEn: "For homes with bills of ฿1,000 - 1,500/month",
      featuresTh: ["แผงโซลาร์ LONGi / Trina / Jinko / JA Solar", "อินเวอร์เตอร์ Tier 1", "ประกันแผง 25 ปี", "ติดตั้งโดยวิศวกรมีใบอนุญาต"],
      featuresEn: ["LONGi / Trina / Jinko / JA Solar panels", "Tier 1 inverter", "25-year panel warranty", "Installed by licensed engineers"],
      seasonalProduction: seasonal(3),
      sortOrder: 1,
    },
    {
      slug: "5kw",
      nameTh: "ระบบ 5KW",
      nameEn: "5KW System",
      sizeKw: 5,
      priceThb: 155000,
      isPopular: true,
      suitableTh: "เหมาะกับบ้านค่าไฟ 1,500 - 3,000 บาท/เดือน",
      suitableEn: "For homes with bills of ฿1,500 - 3,000/month",
      featuresTh: ["แผงโซลาร์ LONGi / Trina / Jinko / JA Solar", "อินเวอร์เตอร์ Tier 1", "ประกันแผง 25 ปี", "Monitoring ผ่านแอป", "ติดตั้งโดยวิศวกรมีใบอนุญาต"],
      featuresEn: ["LONGi / Trina / Jinko / JA Solar panels", "Tier 1 inverter", "25-year panel warranty", "App monitoring", "Installed by licensed engineers"],
      seasonalProduction: seasonal(5),
      sortOrder: 2,
    },
    {
      slug: "10kw",
      nameTh: "ระบบ 10KW",
      nameEn: "10KW System",
      sizeKw: 10,
      priceThb: 285000,
      isPopular: false,
      suitableTh: "เหมาะกับบ้านใหญ่/โฮมออฟฟิศ ค่าไฟ 3,500+ บาท/เดือน",
      suitableEn: "For large homes / home offices with bills of ฿3,500+/month",
      featuresTh: ["แผงโซลาร์ LONGi / Trina / Jinko / JA Solar", "อินเวอร์เตอร์ 3 เฟสรองรับ", "ประกันแผง 25 ปี", "Monitoring ผ่านแอป", "ติดตั้งโดยวิศวกรมีใบอนุญาต"],
      featuresEn: ["LONGi / Trina / Jinko / JA Solar panels", "3-phase inverter support", "25-year panel warranty", "App monitoring", "Installed by licensed engineers"],
      seasonalProduction: seasonal(10),
      sortOrder: 3,
    },
  ];
  for (const p of packages) {
    // update (not `{}`) so re-running the seed applies content/number fixes to
    // already-seeded rows — packages have no admin edit UI yet, so seed.ts is
    // the source of truth for this content.
    await prisma.package.upsert({ where: { slug: p.slug }, update: p, create: p });
  }
  console.log(`Packages: ${packages.length}`);
}

async function seedPortfolio() {
  const projects = [
    // Real KKD projects. Photos are copied from the owner's reference set into
    // storage/public/portfolio. systemSizeKw values are provisional estimates.
    {
      slug: "eye-hospital-carport",
      imageKey: "public/portfolio/eye-hospital-carport.jpg",
      seedImage: "eye-hospital-carport.jpg",
      titleTh: "โรงพยาบาลจักษุ (Solar Carport)",
      titleEn: "Eye Hospital (Solar Carport)",
      descriptionTh: "ติดตั้งระบบโซลาร์คาร์พอร์ตสำหรับโรงพยาบาลจักษุ กรุงเทพมหานคร",
      descriptionEn: "Solar carport installation for an eye hospital in Bangkok.",
      category: "COMMERCIAL" as const,
      province: "กรุงเทพมหานคร",
      systemSizeKw: 30,
      color: "#004b87",
      completedAt: new Date("2026-06-15"),
    },
    {
      slug: "thonglor-pet-hospital",
      imageKey: "public/portfolio/thonglor-pet-hospital.jpg",
      seedImage: "thonglor-pet-hospital.jpg",
      titleTh: "โรงพยาบาลสัตว์ทองหล่อ",
      titleEn: "Thonglor Pet Hospital",
      descriptionTh: "ติดตั้งระบบโซลาร์บนหลังคาโรงพยาบาลสัตว์ทองหล่อ กรุงเทพมหานคร",
      descriptionEn: "Rooftop solar installation for Thonglor Pet Hospital, Bangkok.",
      category: "COMMERCIAL" as const,
      province: "กรุงเทพมหานคร",
      systemSizeKw: 25,
      color: "#1a6bb3",
      completedAt: new Date("2026-05-20"),
    },
    {
      slug: "ekachai-hospital",
      imageKey: "public/portfolio/ekachai-hospital.jpg",
      seedImage: "ekachai-hospital.jpg",
      titleTh: "โรงพยาบาลเอกชัย",
      titleEn: "Ekachai Hospital",
      descriptionTh: "ติดตั้งระบบโซลาร์บนหลังคาโรงพยาบาลเอกชัย จ.สมุทรสาคร",
      descriptionEn: "Rooftop solar installation for Ekachai Hospital, Samut Sakhon.",
      category: "COMMERCIAL" as const,
      province: "สมุทรสาคร",
      systemSizeKw: 50,
      color: "#ff7f00",
      completedAt: new Date("2026-04-10"),
    },
    {
      slug: "srithai-optical",
      imageKey: "public/portfolio/srithai-optical.jpg",
      seedImage: "srithai-optical.jpg",
      titleTh: "ศรีไทยการแว่น",
      titleEn: "Srithai Optical",
      descriptionTh: "ติดตั้งระบบโซลาร์สำหรับอาคารศรีไทยการแว่น",
      descriptionEn: "Solar installation for the Srithai Optical building.",
      category: "COMMERCIAL" as const,
      province: "กรุงเทพมหานคร",
      systemSizeKw: 20,
      color: "#e67300",
      completedAt: new Date("2026-03-05"),
    },
    {
      slug: "residence-nonthaburi-5kw",
      isPublished: false,
      titleTh: "บ้านพักอาศัย 5KW จ.นนทบุรี",
      titleEn: "5KW Residence, Nonthaburi",
      descriptionTh: "ติดตั้งระบบออนกริด 5KW บนหลังคา SCG ลดค่าไฟจาก 3,200 เหลือ 900 บาท/เดือน",
      descriptionEn: "5KW on-grid installation on an SCG roof, cutting the monthly bill from ฿3,200 to ฿900.",
      category: "RESIDENTIAL" as const,
      province: "นนทบุรี",
      systemSizeKw: 5,
      color: "#004b87",
    },
    {
      slug: "residence-bangkok-3kw",
      isPublished: false,
      titleTh: "บ้านพักอาศัย 3KW กรุงเทพฯ",
      titleEn: "3KW Residence, Bangkok",
      descriptionTh: "ระบบออนกริด 3KW สำหรับบ้านสองชั้น ย่านลาดพร้าว พร้อมระบบ monitoring",
      descriptionEn: "3KW on-grid system for a two-storey home in Lat Phrao with app monitoring.",
      category: "RESIDENTIAL" as const,
      province: "กรุงเทพมหานคร",
      systemSizeKw: 3,
      color: "#1a6bb3",
    },
    // The three entries below previously borrowed the real hospital photos as
    // stand-ins under generic names. Unpublished so the same photo never
    // appears twice under two different project names.
    {
      slug: "hotel-chiangmai-30kw",
      isPublished: false,
      titleTh: "โรงแรม 30KW จ.เชียงใหม่",
      titleEn: "30KW Hotel, Chiang Mai",
      descriptionTh: "ระบบออนกริด 30KW สำหรับโรงแรมขนาด 40 ห้อง ลดต้นทุนค่าไฟระยะยาว",
      descriptionEn: "30KW on-grid system for a 40-room hotel, reducing long-term energy costs.",
      category: "COMMERCIAL" as const,
      province: "เชียงใหม่",
      systemSizeKw: 30,
      color: "#ff7f00",
    },
    {
      slug: "office-samutprakan-10kw",
      isPublished: false,
      titleTh: "อาคารสำนักงาน 10KW จ.สมุทรปราการ",
      titleEn: "10KW Office Building, Samut Prakan",
      descriptionTh: "ระบบออนกริด 10KW สามเฟส สำหรับอาคารพาณิชย์ 4 ชั้น",
      descriptionEn: "10KW three-phase on-grid system for a four-storey commercial building.",
      category: "COMMERCIAL" as const,
      province: "สมุทรปราการ",
      systemSizeKw: 10,
      color: "#e67300",
    },
    {
      slug: "factory-rayong-100kw",
      isPublished: false,
      titleTh: "โรงงาน 100KW จ.ระยอง",
      titleEn: "100KW Factory, Rayong",
      descriptionTh: "ระบบออนกริด 100KW บนหลังคาโรงงาน พร้อมระบบ monitoring ระดับอุตสาหกรรม",
      descriptionEn: "100KW rooftop on-grid system with industrial-grade monitoring.",
      category: "INDUSTRIAL" as const,
      province: "ระยอง",
      systemSizeKw: 100,
      color: "#c89d53",
    },
    {
      slug: "warehouse-chonburi-30kw",
      isPublished: false,
      titleTh: "โกดังสินค้า 30KW จ.ชลบุรี",
      titleEn: "30KW Warehouse, Chonburi",
      descriptionTh: "ระบบออนกริด 30KW สำหรับโกดังกระจายสินค้า คืนทุนภายใน 5 ปี",
      descriptionEn: "30KW on-grid system for a distribution warehouse with a 5-year payback.",
      category: "INDUSTRIAL" as const,
      province: "ชลบุรี",
      systemSizeKw: 30,
      color: "#8a6d3b",
    },
  ];

  for (const project of projects) {
    const { color, imageKey, seedImage, ...p } = project;
    const resolvedImageKey = imageKey ?? `public/portfolio/${p.slug}.jpg`;
    await seedPortfolioImage(resolvedImageKey, color, seedImage);
    const data = {
      completedAt: new Date("2025-06-01"),
      ...p,
      imageKeys: [resolvedImageKey],
    };
    await prisma.portfolioProject.upsert({
      where: { slug: p.slug },
      update: data,
      create: data,
    });
  }
  console.log(`Portfolio projects: ${projects.length}`);
}

async function seedSiteSettings() {
  const existing = await prisma.siteSettings.findFirst();
  if (existing) return;
  await prisma.siteSettings.create({
    data: {
      phone: "0824731567",
      email: "contact@kkdproperty.com",
      addressTh: "สมุทรปราการ, ประเทศไทย",
      addressEn: "Samut Prakan, Thailand",
      hoursTh: "จันทร์ - เสาร์ 09:00 - 18:00 น.",
      hoursEn: "Mon - Sat 09:00 - 18:00",
      mapQuery: "สมุทรปราการ, ประเทศไทย",
      lineUrl: "https://line.me/R/ti/p/@kkdsolar",
      facebookUrl: "https://facebook.com/kkdsolar",
      // MOCK — replace with real URLs when client provides them
      instagramUrl: "https://instagram.com/kkdproperty",
      // MOCK — replace with real URLs when client provides them
      tiktokUrl: "https://tiktok.com/@kkdproperty",
      // MOCK — replace with real URLs when client provides them
      youtubeUrl: "https://youtube.com/@kkdproperty",
      footerDescriptionTh:
        "KKD PROPERTY CO., LTD. บริษัทวิศวกรรมที่เชี่ยวชาญด้านการติดตั้งระบบโซลาร์เซลล์ มีประสบการณ์งานวิศวกรรม บริการออกแบบและติดตั้งครบวงจร ด้วยวิศวกรมีใบอนุญาต จดทะเบียนถูกต้องในประเทศไทย",
      footerDescriptionEn:
        "KKD PROPERTY CO., LTD. is an engineering company specializing in solar power installation. We provide end-to-end design and installation services with licensed engineers, fully registered in Thailand.",
      contactTitleTh: "ติดต่อเรา",
      contactTitleEn: "Contact Us",
      contactSubtitleTh: "ยินดีให้คำปรึกษาฟรี ไม่มีข้อผูกมัด",
      contactSubtitleEn: "Free consultation, no obligation",
      headerCtaLabelTh: null,
      headerCtaLabelEn: null,
    },
  });
  console.log("Site settings: ready");
}

async function seedPageSeo() {
  const pages: Array<{
    key: string;
    titleTh: string;
    titleEn: string;
    descriptionTh: string;
    descriptionEn: string;
  }> = [
    {
      key: "home",
      titleTh: "KKD PROPERTY - ติดตั้งโซลาร์เซลล์ครบวงจร โดยวิศวกรมีใบอนุญาต",
      titleEn: "KKD PROPERTY - Complete Solar Installation by Licensed Engineers",
      descriptionTh:
        "บริการติดตั้งโซลาร์เซลล์ On-Grid, Hybrid, Off-Grid ครบวงจร พร้อมบริการล้างแผงและตรวจเช็คระบบ โดยทีมวิศวกรมีใบอนุญาต จดทะเบียนถูกต้องในไทย",
      descriptionEn:
        "On-Grid, Hybrid and Off-Grid solar installation, plus panel cleaning and system inspection, by licensed engineers. Fully registered in Thailand.",
    },
    {
      key: "about",
      titleTh: "เกี่ยวกับเรา | KKD PROPERTY",
      titleEn: "About Us | KKD PROPERTY",
      descriptionTh: "รู้จัก KKD PROPERTY CO., LTD. บริษัทวิศวกรรมผู้เชี่ยวชาญด้านโซลาร์เซลล์ จดทะเบียน DBD ถูกต้อง",
      descriptionEn: "Meet KKD PROPERTY CO., LTD., a solar engineering specialist with DBD registration.",
    },
    {
      key: "services",
      titleTh: "บริการของเรา | KKD PROPERTY",
      titleEn: "Our Services | KKD PROPERTY",
      descriptionTh:
        "บริการติดตั้งระบบโซลาร์เซลล์ On-Grid, Hybrid, Off-Grid พร้อมบริการล้างแผงโซลาร์เซลล์และตรวจเช็คระบบโดยวิศวกร",
      descriptionEn:
        "On-Grid, Hybrid and Off-Grid solar installation, plus professional panel cleaning and engineer system inspections.",
    },
    {
      key: "packages",
      titleTh: "แพ็กเกจโซลาร์เซลล์ | KKD PROPERTY",
      titleEn: "Solar Packages | KKD PROPERTY",
      descriptionTh:
        "แพ็กเกจติดตั้งโซลาร์เซลล์ 3KW 5KW 10KW พร้อมราคา เลือกตามค่าไฟบ้านคุณ แผง Tier 1 ประกัน 25 ปี",
      descriptionEn:
        "3KW, 5KW and 10KW solar packages with pricing. Tier 1 panels, 25-year warranty. Choose by your monthly bill.",
    },
    {
      key: "portfolio",
      titleTh: "ผลงานการติดตั้ง | KKD PROPERTY",
      titleEn: "Installation Portfolio | KKD PROPERTY",
      descriptionTh:
        "ผลงานติดตั้งโซลาร์เซลล์บ้านพักอาศัยจริงของ KKD PROPERTY พร้อมขนาดระบบและรายละเอียดหน้างานแต่ละหลัง",
      descriptionEn:
        "Real residential solar installations by KKD PROPERTY, with system size and site details for each home.",
    },
    {
      key: "booking",
      titleTh: "ขอใบเสนอราคา / นัดสำรวจหน้างาน | KKD PROPERTY",
      titleEn: "Request a Quote / Book Site Survey | KKD PROPERTY",
      descriptionTh:
        "ขอใบเสนอราคาโซลาร์เซลล์ฟรี หรือนัดวิศวกรสำรวจหน้างานเพียง 199 บาท ออกแบบระบบเฉพาะสำหรับคุณ",
      descriptionEn:
        "Get a free solar quote, or book an engineer site survey for only ฿199 with a custom system design.",
    },
    {
      key: "contact",
      titleTh: "ติดต่อเรา | KKD PROPERTY",
      titleEn: "Contact Us | KKD PROPERTY",
      descriptionTh: "ติดต่อ KKD PROPERTY โทร 082-473-1567 หรือ LINE @kkdsolar เปิดจันทร์-เสาร์ 9:00-18:00 น.",
      descriptionEn: "Contact KKD PROPERTY: call 082-473-1567 or LINE @kkdsolar. Open Mon-Sat 9:00-18:00.",
    },
    {
      key: "calculator",
      titleTh: "เครื่องคำนวณโซลาร์เซลล์ | KKD PROPERTY",
      titleEn: "Solar Calculator | KKD PROPERTY",
      descriptionTh:
        "คำนวณขนาดระบบโซลาร์เซลล์ที่เหมาะกับบ้านคุณจากค่าไฟรายเดือน พร้อมประมาณการเงินที่ประหยัดได้",
      descriptionEn: "Calculate the right solar system size from your monthly electricity bill, with estimated savings.",
    },
    {
      key: "testimonials",
      titleTh: "รีวิวจากลูกค้า | KKD PROPERTY",
      titleEn: "Customer Testimonials | KKD PROPERTY",
      descriptionTh: "อ่านความคิดเห็นจริงจากลูกค้าที่ใช้บริการติดตั้งโซลาร์เซลล์กับ KKD PROPERTY",
      descriptionEn: "Read what real customers say about their solar installation experience with KKD PROPERTY.",
    },
    {
      key: "cookiePolicy",
      titleTh: "นโยบายคุกกี้ | KKD PROPERTY",
      titleEn: "Cookie Policy | KKD PROPERTY",
      descriptionTh:
        "รายการคุกกี้ทั้งหมดที่เว็บไซต์ KKD PROPERTY จัดเก็บ วัตถุประสงค์ ระยะเวลา และวิธีเปลี่ยนความยินยอมของคุณ",
      descriptionEn:
        "Every cookie the KKD PROPERTY website stores, what each one is for, how long it lasts, and how to change your consent.",
    },
  ];

  for (const page of pages) {
    await prisma.pageSeo.upsert({
      where: { key: page.key },
      update: {},
      create: page,
    });
  }
  console.log(`Page SEO rows: ${pages.length}`);
}

async function seedAboutContent() {
  const existing = await prisma.aboutContent.findFirst();
  if (existing) return;
  await prisma.aboutContent.create({
    data: {
      titleTh: "เกี่ยวกับบริษัท KKD PROPERTY CO., LTD.",
      titleEn: "About KKD PROPERTY CO., LTD.",
      introTh:
        "บริษัทวิศวกรรมที่เชี่ยวชาญด้านการติดตั้งระบบโซลาร์เซลล์ งานก่อสร้าง และระบบครัวอุตสาหกรรม มุ่งมั่นให้บริการด้วยมาตรฐานสูงสุด",
      introEn:
        "An engineering company specializing in solar power installation, construction, and industrial kitchen systems, committed to the highest service standards.",
      credRegisteredTitleTh: "จดทะเบียนถูกต้องในประเทศไทย",
      credRegisteredTitleEn: "Registered in Thailand",
      credRegisteredDescTh: "เลขทะเบียน DBD: 0105566007521 ตรวจสอบได้ โปร่งใส เชื่อถือได้",
      credRegisteredDescEn: "DBD registration no. 0105566007521 — verifiable, transparent, and trustworthy.",
      credEngineerTitleTh: "ทีมวิศวกรมีใบอนุญาต",
      credEngineerTitleEn: "Licensed Engineering Team",
      credEngineerDescTh: "รับงานที่ต้องมีวิศวกรเซ็นรับรองอย่างถูกต้องตามกฎหมาย ปลอดภัยทุกขั้นตอน",
      credEngineerDescEn:
        "We handle projects requiring certified engineer sign-off, fully compliant with the law and safe at every step.",
      credExperienceTitleTh: "ผลงานที่ผ่านมา",
      credExperienceTitleEn: "Proven Track Record",
      credExperienceDescTh:
        "ทีมวิศวกรมืออาชีพ ติดตั้งระบบโซลาร์คุณภาพสูงให้ทั้งบ้านพักอาศัย อาคารพาณิชย์ และโรงงานอุตสาหกรรม",
      credExperienceDescEn:
        "A professional engineering team installing high-quality solar systems for homes, commercial buildings, and industrial factories.",
      teamTitleTh: "ทีมงานของเรา",
      teamTitleEn: "Our Team",
      teamDescTh:
        "ทีมวิศวกรและช่างติดตั้งมืออาชีพ ผ่านการอบรมมาตรฐานความปลอดภัย พร้อมดูแลโครงการของคุณตั้งแต่ออกแบบจนถึงบริการหลังการขาย",
      teamDescEn:
        "Professional engineers and installers, trained to safety standards, taking care of your project from design through after-sales service.",
      teamDesignTitleTh: "ทีมออกแบบและวิศวกรรม",
      teamDesignTitleEn: "Design & Engineering",
      teamDesignDescTh:
        "วิศวกรมีใบอนุญาตออกแบบระบบออนกริด ไฮบริด และออฟกริด ให้เหมาะกับหลังคาและพฤติกรรมการใช้ไฟของแต่ละโครงการ",
      teamDesignDescEn:
        "Licensed engineers design On-Grid, Hybrid, and Off-Grid systems tailored to each roof and electricity usage pattern.",
      teamInstallTitleTh: "ทีมติดตั้งหน้างาน",
      teamInstallTitleEn: "Site Installation",
      teamInstallDescTh:
        "ช่างติดตั้งผ่านการอบรมมาตรฐานความปลอดภัย ควบคุมคุณภาพงานทุกขั้นตอนตั้งแต่เริ่มจนจบโครงการ",
      teamInstallDescEn:
        "Installers trained to safety standards, controlling quality at every step from project start to finish.",
      teamSupportTitleTh: "ทีมบริการหลังการขาย",
      teamSupportTitleEn: "After-Sales Support",
      teamSupportDescTh:
        "ดูแลต่อเนื่องด้วยบริการล้างแผงโซลาร์เซลล์และตรวจเช็คระบบ ให้ระบบของคุณทำงานเต็มประสิทธิภาพอยู่เสมอ",
      teamSupportDescEn:
        "Ongoing care with panel cleaning and system inspection services, keeping your system running at full efficiency.",
    },
  });
  console.log("About content: ready");
}

async function main() {
  await seedAdmin();
  await seedPromoLandingPaths();
  await seedPromoChannels();
  await seedTestRoleAccounts();
  await seedBookingCapacitySetting();
  await seedPaymentSettings();
  await seedSiteSettings();
  await seedPageSeo();
  await seedAboutContent();
  await seedServices();
  await seedPackages();
  await seedPortfolio();
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

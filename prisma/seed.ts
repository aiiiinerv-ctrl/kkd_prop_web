import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  }),
});

const STORAGE_ROOT = process.env.STORAGE_ROOT ?? "./storage";

async function placeholderImage(key: string, color: string) {
  const filePath = path.join(STORAGE_ROOT, key);
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

async function seedPromoChannels() {
  const channels = [
    { slug: "facebook", nameTh: "Facebook", nameEn: "Facebook", sortOrder: 1 },
    { slug: "line", nameTh: "LINE", nameEn: "LINE", sortOrder: 2 },
    { slug: "google", nameTh: "Google ค้นหา", nameEn: "Google Search", sortOrder: 3 },
    { slug: "referral", nameTh: "เพื่อนแนะนำ", nameEn: "Referral", sortOrder: 4 },
    { slug: "walkin", nameTh: "อื่น ๆ / Walk-in", nameEn: "Other / Walk-in", sortOrder: 5 },
  ];
  for (const c of channels) {
    await prisma.promoChannel.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }
  console.log(`Promo channels: ${channels.length}`);
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

// Seasonal production per demo data (5KW baseline ~ units/day), scaled by size
function seasonal(sizeKw: number) {
  const scale = sizeKw / 5;
  return {
    summer: { monthsTh: "มี.ค. - พ.ค.", monthsEn: "Mar - May", unitsPerDay: Math.round(20 * scale) },
    earlyRainy: { monthsTh: "มิ.ย. - ก.ค.", monthsEn: "Jun - Jul", unitsPerDay: Math.round(16.5 * scale) },
    rainy: { monthsTh: "ส.ค. - ต.ค.", monthsEn: "Aug - Oct", unitsPerDay: Math.round(13 * scale) },
    winter: { monthsTh: "พ.ย. - ก.พ.", monthsEn: "Nov - Feb", unitsPerDay: Math.round(16 * scale) },
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
      featuresTh: ["แผงโซลาร์ LONGi / Jinko", "อินเวอร์เตอร์ Tier 1", "ประกันแผง 25 ปี", "ติดตั้งโดยวิศวกรมีใบอนุญาต"],
      featuresEn: ["LONGi / Jinko panels", "Tier 1 inverter", "25-year panel warranty", "Installed by licensed engineers"],
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
      featuresTh: ["แผงโซลาร์ Trina / JA Solar", "อินเวอร์เตอร์ Tier 1", "ประกันแผง 25 ปี", "Monitoring ผ่านแอป", "ติดตั้งโดยวิศวกรมีใบอนุญาต"],
      featuresEn: ["Trina / JA Solar panels", "Tier 1 inverter", "25-year panel warranty", "App monitoring", "Installed by licensed engineers"],
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
      featuresTh: ["แผงโซลาร์ Tier 1 Brands", "อินเวอร์เตอร์ 3 เฟสรองรับ", "ประกันแผง 25 ปี", "Monitoring ผ่านแอป", "ติดตั้งโดยวิศวกรมีใบอนุญาต"],
      featuresEn: ["Tier 1 brand panels", "3-phase inverter support", "25-year panel warranty", "App monitoring", "Installed by licensed engineers"],
      seasonalProduction: seasonal(10),
      sortOrder: 3,
    },
  ];
  for (const p of packages) {
    await prisma.package.upsert({ where: { slug: p.slug }, update: {}, create: p });
  }
  console.log(`Packages: ${packages.length}`);
}

async function seedPortfolio() {
  const projects = [
    {
      slug: "residence-nonthaburi-5kw",
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
      titleTh: "บ้านพักอาศัย 3KW กรุงเทพฯ",
      titleEn: "3KW Residence, Bangkok",
      descriptionTh: "ระบบออนกริด 3KW สำหรับบ้านสองชั้น ย่านลาดพร้าว พร้อมระบบ monitoring",
      descriptionEn: "3KW on-grid system for a two-storey home in Lat Phrao with app monitoring.",
      category: "RESIDENTIAL" as const,
      province: "กรุงเทพมหานคร",
      systemSizeKw: 3,
      color: "#1a6bb3",
    },
    {
      slug: "hotel-chiangmai-30kw",
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

  for (const { color, ...p } of projects) {
    const imageKey = `public/portfolio/${p.slug}.jpg`;
    await placeholderImage(imageKey, color);
    await prisma.portfolioProject.upsert({
      where: { slug: p.slug },
      update: {},
      create: { ...p, imageKeys: [imageKey], completedAt: new Date("2025-06-01") },
    });
  }
  console.log(`Portfolio projects: ${projects.length}`);
}

async function main() {
  await seedAdmin();
  await seedPromoChannels();
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

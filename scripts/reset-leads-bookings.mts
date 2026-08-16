/**
 * Wipe all Lead + SurveyBooking rows (local/dev) and seed a small demo set.
 *
 * Usage: npx tsx scripts/reset-leads-bookings.mts
 *
 * Destructive. Does not touch users, channels, content, or site settings.
 * Also deletes AuditLog rows for Lead / SurveyBooking so the audit page
 * does not keep orphan history from the wiped entities.
 */
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
});

function daysFromNow(offset: number): Date {
  const d = new Date();
  d.setHours(10, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}

// Mirrors nextBookingNumber(): the date part is the *creation* day (today),
// not the preferred survey date. Sequence numbers must stay contiguous from
// 001 within that day or the count-based generator in
// src/lib/bookings/booking-number.ts will re-issue a number that already exists.
function bookingNumber(seq: number): string {
  const d = daysFromNow(0);
  const datePart = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
  return `KKD-${datePart}-${String(seq).padStart(3, "0")}`;
}

async function main() {
  const before = {
    leads: await prisma.lead.count(),
    bookings: await prisma.surveyBooking.count(),
  };

  // Bookings cascade when leads are deleted, but delete bookings first so
  // the count log stays accurate if a later step fails mid-way.
  const deletedBookings = await prisma.surveyBooking.deleteMany();
  const deletedLeads = await prisma.lead.deleteMany();
  const deletedAudits = await prisma.auditLog.deleteMany({
    where: { entityType: { in: ["Lead", "SurveyBooking"] } },
  });

  console.log(
    `Cleared: leads ${deletedLeads.count} (was ${before.leads}), bookings ${deletedBookings.count} (was ${before.bookings}), audits ${deletedAudits.count}`
  );

  const sales = await prisma.adminUser.findMany({
    where: { role: "SALES", isActive: true },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  const salesA = sales[0]?.id ?? null;
  const salesB = sales[1]?.id ?? salesA;

  const channels = await prisma.promoChannel.findMany({
    where: { isActive: true },
    select: { id: true },
    orderBy: { sortOrder: "asc" },
    take: 4,
  });
  const ch = (i: number) => channels[i % Math.max(channels.length, 1)]?.id ?? null;

  const packages = await prisma.package.findMany({ select: { slug: true }, take: 3 });
  const services = await prisma.service.findMany({ select: { slug: true }, take: 3 });

  type DemoLead = {
    type: "QUOTE" | "SURVEY";
    status: "NEW" | "ASSIGNED" | "CONTACTED" | "QUOTED" | "SIGNED" | "INSTALLING" | "COMPLETED" | "DISQUALIFIED";
    name: string;
    phone: string;
    province: string;
    buildingType: "RESIDENTIAL" | "COMMERCIAL" | "INDUSTRIAL" | "OTHER";
    buildingTypeOtherText?: string;
    avgMonthlyBill?: number;
    interestedSystems?: string[];
    interestedPackageSlug?: string;
    interestedServiceSlug?: string;
    customerMessage?: string;
    referrerName?: string;
    lineId?: string;
    assignedSalesId?: string | null;
    channelIndex?: number;
    closedAt?: Date | null;
    booking?: {
      seq: number;
      address: string;
      dayOffset: number;
      timeSlot: "MORNING" | "AFTERNOON";
      paymentStatus: "PENDING_REVIEW" | "VERIFIED" | "REJECTED";
      status: "PENDING_CONFIRMATION" | "CONFIRMED" | "PREPARED" | "SURVEYED" | "DESIGNED" | "SIGNED" | "CANCELLED";
      amountThb?: number;
      giftSent?: boolean;
    };
  };

  const demos: DemoLead[] = [
    {
      type: "QUOTE",
      status: "NEW",
      name: "สมชาย ใจดี",
      phone: "0811110001",
      province: "สมุทรปราการ",
      buildingType: "RESIDENTIAL",
      avgMonthlyBill: 3500,
      interestedSystems: ["ON_GRID"],
      interestedPackageSlug: packages[0]?.slug,
      customerMessage: "อยากได้ใบเสนอราคาบ้าน 1 ชั้น",
      channelIndex: 0,
    },
    {
      type: "QUOTE",
      status: "ASSIGNED",
      name: "วิภา รัตนโกสินทร์",
      phone: "0811110002",
      province: "กรุงเทพมหานคร",
      buildingType: "RESIDENTIAL",
      avgMonthlyBill: 7500,
      interestedSystems: ["ON_GRID", "HYBRID"],
      interestedPackageSlug: packages[1]?.slug,
      assignedSalesId: salesA,
      channelIndex: 1,
      lineId: "wipa.solar",
    },
    {
      type: "QUOTE",
      status: "CONTACTED",
      name: "บริษัท แสงตะวัน จำกัด",
      phone: "0811110003",
      province: "ชลบุรี",
      buildingType: "COMMERCIAL",
      avgMonthlyBill: 25000,
      interestedSystems: ["HYBRID"],
      interestedServiceSlug: services[1]?.slug,
      assignedSalesId: salesA,
      channelIndex: 0,
      customerMessage: "โรงงานเล็ก หลังคากว้าง",
    },
    {
      type: "QUOTE",
      status: "QUOTED",
      name: "อนุชา พรหมมา",
      phone: "0811110004",
      province: "นนทบุรี",
      buildingType: "RESIDENTIAL",
      avgMonthlyBill: 5500,
      interestedSystems: ["ON_GRID"],
      interestedPackageSlug: packages[1]?.slug,
      assignedSalesId: salesB,
      channelIndex: 2,
      referrerName: "คุณสมศักดิ์",
    },
    {
      type: "QUOTE",
      status: "SIGNED",
      name: "กานดา สุขใจ",
      phone: "0811110005",
      province: "ปทุมธานี",
      buildingType: "RESIDENTIAL",
      avgMonthlyBill: 4500,
      interestedSystems: ["HYBRID"],
      interestedPackageSlug: packages[0]?.slug,
      assignedSalesId: salesA,
      channelIndex: 1,
      closedAt: daysFromNow(-14),
    },
    {
      type: "QUOTE",
      status: "DISQUALIFIED",
      name: "ทดสอบ ไม่สนใจ",
      phone: "0811110006",
      province: "ระยอง",
      buildingType: "OTHER",
      buildingTypeOtherText: "บ้านเช่าชั่วคราว",
      avgMonthlyBill: 1500,
      interestedSystems: ["OFF_GRID"],
      assignedSalesId: salesB,
      channelIndex: 3,
      customerMessage: "งบไม่พอ",
    },
    {
      type: "SURVEY",
      status: "NEW",
      name: "ธีรพงษ์ แสงอรุณ",
      phone: "0822220001",
      province: "สมุทรปราการ",
      buildingType: "RESIDENTIAL",
      avgMonthlyBill: 6000,
      customerMessage: "นัดสำรวจบ้านเดี่ยว",
      channelIndex: 0,
      booking: {
        seq: 1,
        address: "123 หมู่บ้านแสงอรุณ ต.บางเมือง อ.เมือง จ.สมุทรปราการ 10270",
        dayOffset: 2,
        timeSlot: "MORNING",
        paymentStatus: "PENDING_REVIEW",
        status: "PENDING_CONFIRMATION",
      },
    },
    {
      type: "SURVEY",
      status: "ASSIGNED",
      name: "นิภาวรรณ ทองดี",
      phone: "0822220002",
      province: "กรุงเทพมหานคร",
      buildingType: "RESIDENTIAL",
      avgMonthlyBill: 8000,
      assignedSalesId: salesA,
      channelIndex: 1,
      lineId: "nipa.th",
      booking: {
        seq: 2,
        address: "45/8 ซอยลาดพร้าว 71 แขวงคลองจั่น เขตบางกะปิ กรุงเทพฯ 10240",
        dayOffset: 3,
        timeSlot: "AFTERNOON",
        paymentStatus: "VERIFIED",
        status: "CONFIRMED",
        giftSent: false,
      },
    },
    {
      type: "SURVEY",
      status: "CONTACTED",
      name: "บริษัท กรีนรูฟ จำกัด",
      phone: "0822220003",
      province: "สมุทรสาคร",
      buildingType: "INDUSTRIAL",
      avgMonthlyBill: 45000,
      assignedSalesId: salesB,
      channelIndex: 0,
      booking: {
        seq: 3,
        address: "88 นิคมอุตสาหกรรมบางปู ต.แพรกษา อ.เมือง จ.สมุทรปราการ",
        dayOffset: 5,
        timeSlot: "MORNING",
        paymentStatus: "VERIFIED",
        status: "PREPARED",
        amountThb: 199,
      },
    },
    {
      type: "SURVEY",
      status: "QUOTED",
      name: "ประเสริฐ มีสุข",
      phone: "0822220004",
      province: "นครปฐม",
      buildingType: "COMMERCIAL",
      avgMonthlyBill: 12000,
      assignedSalesId: salesA,
      channelIndex: 2,
      booking: {
        seq: 4,
        address: "9/2 ถ.เพชรเกษม อ.เมือง จ.นครปฐม 73000",
        dayOffset: -3,
        timeSlot: "AFTERNOON",
        paymentStatus: "VERIFIED",
        status: "SURVEYED",
      },
    },
    {
      type: "SURVEY",
      status: "SIGNED",
      name: "สุดา พิมพ์ใจ",
      phone: "0822220005",
      province: "ชลบุรี",
      buildingType: "RESIDENTIAL",
      avgMonthlyBill: 9000,
      interestedSystems: ["ON_GRID"],
      assignedSalesId: salesA,
      channelIndex: 1,
      closedAt: daysFromNow(-7),
      booking: {
        seq: 5,
        address: "201 หมู่บ้านทะเลทอง ต.เสม็ด อ.เมือง จ.ชลบุรี",
        dayOffset: -10,
        timeSlot: "MORNING",
        paymentStatus: "VERIFIED",
        status: "SIGNED",
        giftSent: true,
      },
    },
    {
      type: "SURVEY",
      status: "INSTALLING",
      name: "บริษัท เอเชีย พาวเวอร์",
      phone: "0822220006",
      province: "ระยอง",
      buildingType: "INDUSTRIAL",
      avgMonthlyBill: 80000,
      assignedSalesId: salesB,
      channelIndex: 0,
      closedAt: daysFromNow(-30),
      booking: {
        seq: 6,
        address: "15 นิคมมาบตาพุด จ.ระยอง",
        dayOffset: -20,
        timeSlot: "MORNING",
        paymentStatus: "VERIFIED",
        status: "SIGNED",
        giftSent: true,
      },
    },
    {
      type: "SURVEY",
      status: "COMPLETED",
      name: "วรพล จันทร์เพ็ญ",
      phone: "0822220007",
      province: "ปทุมธานี",
      buildingType: "RESIDENTIAL",
      avgMonthlyBill: 5000,
      assignedSalesId: salesA,
      channelIndex: 2,
      closedAt: daysFromNow(-60),
      booking: {
        seq: 7,
        address: "77/1 คลองหลวง ปทุมธานี",
        dayOffset: -45,
        timeSlot: "AFTERNOON",
        paymentStatus: "VERIFIED",
        status: "SIGNED",
        giftSent: true,
      },
    },
    {
      type: "SURVEY",
      status: "DISQUALIFIED",
      name: "ยกเลิกการจอง",
      phone: "0822220008",
      province: "กรุงเทพมหานคร",
      buildingType: "RESIDENTIAL",
      avgMonthlyBill: 3000,
      assignedSalesId: salesB,
      channelIndex: 3,
      booking: {
        seq: 8,
        address: "12 ซอยสุขุมวิท 101",
        dayOffset: 1,
        timeSlot: "MORNING",
        paymentStatus: "REJECTED",
        status: "CANCELLED",
      },
    },
    {
      type: "QUOTE",
      status: "NEW",
      name: "English Demo Customer",
      phone: "0833330001",
      province: "Bangkok",
      buildingType: "RESIDENTIAL",
      avgMonthlyBill: 7500,
      interestedSystems: ["ON_GRID", "HYBRID"],
      interestedPackageSlug: packages[2]?.slug,
      customerMessage: "Looking for a 10kW quote",
      channelIndex: 0,
    },
  ];

  let createdLeads = 0;
  let createdBookings = 0;

  for (const demo of demos) {
    const channelId = ch(demo.channelIndex ?? 0);
    const lead = await prisma.lead.create({
      data: {
        type: demo.type,
        status: demo.status,
        name: demo.name,
        phone: demo.phone,
        lineId: demo.lineId ?? null,
        referrerName: demo.referrerName ?? null,
        province: demo.province,
        buildingType: demo.buildingType,
        buildingTypeOtherText: demo.buildingTypeOtherText ?? null,
        avgMonthlyBill: demo.avgMonthlyBill ?? null,
        interestedSystems: demo.interestedSystems ?? undefined,
        interestedPackageSlug: demo.interestedPackageSlug ?? null,
        interestedServiceSlug: demo.interestedServiceSlug ?? null,
        locale: demo.name.startsWith("English") ? "en" : "th",
        sourceChannelId: channelId,
        autoSourceChannelId: channelId,
        assignedSalesId: demo.assignedSalesId ?? null,
        customerMessage: demo.customerMessage ?? null,
        closedAt: demo.closedAt ?? null,
        lastFollowUpAt:
          demo.status === "NEW" || demo.status === "DISQUALIFIED" ? null : daysFromNow(-2),
      },
    });
    createdLeads += 1;

    if (demo.booking) {
      const b = demo.booking;
      await prisma.surveyBooking.create({
        data: {
          leadId: lead.id,
          bookingNumber: bookingNumber(b.seq),
          address: b.address,
          preferredDate: daysFromNow(b.dayOffset),
          timeSlot: b.timeSlot,
          amountThb: b.amountThb ?? 199,
          // Placeholder key — no real slip file; admin slip viewer will 404.
          paymentSlipKey: `private/slips/demo-${b.seq}.jpg`,
          paymentStatus: b.paymentStatus,
          status: b.status,
          giftSent: b.giftSent ?? false,
          assignedSalesId: demo.assignedSalesId ?? null,
        },
      });
      createdBookings += 1;
    }
  }

  const after = {
    leads: await prisma.lead.count(),
    bookings: await prisma.surveyBooking.count(),
  };

  console.log(`Seeded: ${createdLeads} leads, ${createdBookings} bookings`);
  console.log(`Now: ${after.leads} leads, ${after.bookings} bookings`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

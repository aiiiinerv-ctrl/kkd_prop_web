import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { LeadStatus, LeadType } from "@/generated/prisma/enums";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const type = params.get("type");
  const status = params.get("status");
  const channelId = params.get("channelId");
  const search = params.get("search")?.trim();

  const where = {
    ...(type === "QUOTE" || type === "SURVEY" ? { type: type as LeadType } : {}),
    ...(["NEW", "CONTACTED", "QUOTED", "WON", "LOST"].includes(status ?? "")
      ? { status: status as LeadStatus }
      : {}),
    ...(channelId ? { sourceChannelId: channelId } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
            { province: { contains: search } },
          ],
        }
      : {}),
  };

  const [total, leads] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        booking: { select: { paymentStatus: true, preferredDate: true } },
        sourceChannel: { select: { nameTh: true } },
      },
    }),
  ]);

  return NextResponse.json({
    leads,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}

import { NextResponse } from "next/server";

export async function GET() {
  const items = [
    { id: 1, name: "Next.js" },
    { id: 2, name: "TypeScript" },
    { id: 3, name: "Tailwind CSS" },
  ];

  return NextResponse.json({ items, fetchedAt: new Date().toISOString() });
}

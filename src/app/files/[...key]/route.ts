import { NextResponse, type NextRequest } from "next/server";
import { sanitizeKey, storage } from "@/lib/storage";

// Private files (payment slips) require an admin session. The auth check is
// wired in via a dynamic import so this route works before Phase 5 lands;
// until then private files are always denied.
async function isAuthorizedForPrivate(): Promise<boolean> {
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    return Boolean(session?.user);
  } catch {
    return false;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key: segments } = await params;
  const key = sanitizeKey(segments.join("/"));
  if (!key || !(key.startsWith("public/") || key.startsWith("private/"))) {
    return new NextResponse("Not found", { status: 404 });
  }

  const isPrivate = key.startsWith("private/");
  if (isPrivate && !(await isAuthorizedForPrivate())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const file = await storage.get(key);
  if (!file) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": isPrivate
        ? "no-store"
        : "public, max-age=31536000, immutable",
    },
  });
}

import type { DefaultSession } from "next-auth";
import type {} from "next-auth/jwt";
import type { Role } from "@/lib/auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      linkedChannelExecutiveId: string | null;
      linkedChannelId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    linkedChannelExecutiveId: string | null;
    linkedChannelId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    linkedChannelExecutiveId: string | null;
    linkedChannelId: string | null;
  }
}

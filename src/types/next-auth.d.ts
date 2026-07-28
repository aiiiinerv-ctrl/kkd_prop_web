import type { DefaultSession } from "next-auth";
import type {} from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "SALES" | "FINANCE" | "CHANNEL_EXECUTIVE";
    } & DefaultSession["user"];
  }

  interface User {
    role: "ADMIN" | "SALES" | "FINANCE" | "CHANNEL_EXECUTIVE";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "SALES" | "FINANCE" | "CHANNEL_EXECUTIVE";
  }
}

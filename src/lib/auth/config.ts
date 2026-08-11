import bcrypt from "bcryptjs";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { recordAuditEvent } from "@/lib/audit";
import { prisma } from "@/lib/db";

export const authConfig = {
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const user = await prisma.adminUser.findUnique({
          where: { email: email.toLowerCase().trim() },
          include: { linkedChannelExecutive: { select: { channelId: true } } },
        });
        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        // Through the same module as every entity mutation, so `auditLog`
        // has exactly one writer. Passes its actor explicitly because there
        // is no session yet at this point in the sign-in.
        await recordAuditEvent({
          actorId: user.id,
          action: "LOGIN",
          entityType: "AdminUser",
          entityId: user.id,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          linkedChannelExecutiveId: user.linkedChannelExecutiveId,
          linkedChannelId: user.linkedChannelExecutive?.channelId ?? null,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.linkedChannelExecutiveId = user.linkedChannelExecutiveId ?? null;
        token.linkedChannelId = user.linkedChannelId ?? null;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.linkedChannelExecutiveId = token.linkedChannelExecutiveId ?? null;
      session.user.linkedChannelId = token.linkedChannelId ?? null;
      return session;
    },
  },
} satisfies NextAuthConfig;

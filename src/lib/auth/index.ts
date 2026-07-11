import NextAuth from "next-auth";
import { redirect } from "next/navigation";
import { authConfig } from "./config";

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "EDITOR";
};

/** Redirects to the admin login page when there is no active session. */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    redirect("/admin/login");
  }
  return session;
}

/** Additionally requires a specific role; EDITORs are bounced to /admin. */
export async function requireRole(role: "ADMIN") {
  const session = await requireAdmin();
  if (session.user.role !== role) {
    redirect("/admin");
  }
  return session;
}

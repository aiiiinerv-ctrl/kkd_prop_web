"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";

export async function login(
  _prev: string | null,
  formData: FormData
): Promise<string | null> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/admin",
    });
    return null;
  } catch (error) {
    if (error instanceof AuthError) {
      return "invalid";
    }
    throw error; // NEXT_REDIRECT flows through here on success
  }
}

export async function logout() {
  await signOut({ redirectTo: "/admin/login" });
}

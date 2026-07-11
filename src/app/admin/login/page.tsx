import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/site/brand-logo";
import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/admin");
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-border/70 bg-card p-8 shadow-sm">
        <div className="mb-7 text-center">
          <BrandLogo />
          <p className="mt-2 text-sm text-muted-foreground">ระบบหลังบ้าน</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}

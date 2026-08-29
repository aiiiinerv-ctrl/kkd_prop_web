"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { updateBookingCapacitySetting } from "@/actions/bookings";
import { updatePaymentSettings } from "@/actions/payment-settings";
import { previewPromptPayQr } from "@/actions/promptpay-preview";
import { updateHeaderFooterSettings } from "@/actions/site-settings";
import { BilingualTabs } from "@/components/admin/crud-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Role } from "@/lib/auth";

// ── PROTOTYPE — wayfinder #121, throwaway, do not ship ──────────────────
// Three variants of the new "Google Analytics / Tracking Scripts" tab.
// Switch via ?variant=A|B|C. No real save — stubbed with a toast only.
const HEADER_HELP =
  'ให้ทุก <script> ที่วางมี attribute data-cookieyes="cookieyes-analytics" ไม่งั้น CookieYes จะไม่รอ consent ก่อนรัน';
const BODY_HELP =
  "โค้ดที่วางในนี้จะถูกแทรกทันทีหลัง <body> เปิด (ตำแหน่งเดียวกับที่ Google Tag Manager แนะนำ)";
const MAX_LEN = 10000;

function PrototypeSwitcher({ current }: { current: string }) {
  const router = useRouter();
  const variants = ["A", "B", "C"] as const;
  const labels = {
    A: "A — Two-column",
    B: "B — Stacked cards + banner",
    C: "C — Guided checklist",
  };
  const go = (v: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("variant", v);
    router.replace(url.pathname + url.search);
  };
  const idx = variants.indexOf(current as (typeof variants)[number]);
  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border-2 border-brand-orange bg-black px-4 py-2 text-white shadow-lg">
      <button
        type="button"
        onClick={() => go(variants[(idx - 1 + variants.length) % variants.length])}
        className="px-1 text-lg"
      >
        ←
      </button>
      <span className="text-xs font-semibold">{labels[current as keyof typeof labels] ?? current}</span>
      <button
        type="button"
        onClick={() => go(variants[(idx + 1) % variants.length])}
        className="px-1 text-lg"
      >
        →
      </button>
    </div>
  );
}

function stubSave(label: string) {
  toast.info(`[PROTOTYPE] ${label} — ยังไม่บันทึกจริง`);
}

// Variant A — dense two-column layout, minimal chrome, shared help footer.
function AnalyticsTabVariantA() {
  const [header, setHeader] = useState("");
  const [body, setBody] = useState("");
  return (
    <div className="rounded-xl border border-border/70 bg-card p-6">
      <h2 className="mb-1 font-semibold">Google Analytics / Tracking Scripts</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        วางโค้ด script ที่ต้องการแทรกในทุกหน้าเว็บสาธารณะ (ไม่รวมหลังบ้าน)
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="ga-header">Header tag area</Label>
            <CharCounter value={header} max={MAX_LEN} />
          </div>
          <Textarea
            id="ga-header"
            rows={10}
            className="font-mono text-xs"
            value={header}
            onChange={(e) => setHeader(e.target.value)}
            placeholder={`<script async data-cookieyes="cookieyes-analytics" src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"></script>`}
          />
          <p className="text-xs text-muted-foreground">{HEADER_HELP}</p>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="ga-body">Body tag area</Label>
            <CharCounter value={body} max={MAX_LEN} />
          </div>
          <Textarea
            id="ga-body"
            rows={10}
            className="font-mono text-xs"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`}
          />
          <p className="text-xs text-muted-foreground">{BODY_HELP}</p>
        </div>
      </div>
      <Button className="mt-4" onClick={() => stubSave("บันทึก Tracking Scripts")}>
        บันทึก
      </Button>
    </div>
  );
}

// Variant B — stacked full-width cards (matches HeaderFooterTab's own layout
// rhythm most closely) with one shared warning banner up top instead of
// repeating the consent/placement explanation per field.
function AnalyticsTabVariantB() {
  const [header, setHeader] = useState("");
  const [body, setBody] = useState("");
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-brand-orange/40 bg-accent px-4 py-3 text-sm text-accent-foreground">
        <p className="font-medium">ก่อนวาง script โปรดตรวจสอบ 2 เรื่อง:</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          <li>{HEADER_HELP}</li>
          <li>{BODY_HELP}</li>
        </ul>
      </div>
      <div className="rounded-xl border border-border/70 bg-card p-6">
        <h2 className="mb-1 font-semibold">Header tag area</h2>
        <p className="mb-4 text-sm text-muted-foreground">แทรกใน &lt;head&gt; ของทุกหน้าเว็บสาธารณะ</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="ga-b-header">โค้ด</Label>
            <CharCounter value={header} max={MAX_LEN} />
          </div>
          <Textarea
            id="ga-b-header"
            rows={8}
            className="font-mono text-xs"
            value={header}
            onChange={(e) => setHeader(e.target.value)}
          />
        </div>
      </div>
      <div className="rounded-xl border border-border/70 bg-card p-6">
        <h2 className="mb-1 font-semibold">Body tag area</h2>
        <p className="mb-4 text-sm text-muted-foreground">แทรกทันทีหลัง &lt;body&gt; เปิด ของทุกหน้าเว็บสาธารณะ</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="ga-b-body">โค้ด</Label>
            <CharCounter value={body} max={MAX_LEN} />
          </div>
          <Textarea
            id="ga-b-body"
            rows={8}
            className="font-mono text-xs"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
      </div>
      <Button onClick={() => stubSave("บันทึก Tracking Scripts")}>บันทึก</Button>
    </div>
  );
}

// Variant C — guided/checklist style: numbered steps, a copy-paste example
// with the required attribute already in it, and a live client-side hint
// that flags when a pasted <script> tag is missing data-cookieyes.
function checkMissingAttr(value: string): boolean {
  if (!value.trim()) return false;
  const hasScriptTag = /<script\b/i.test(value);
  const hasAttr = /data-cookieyes\s*=/i.test(value);
  return hasScriptTag && !hasAttr;
}

function ScriptField({
  id,
  label,
  value,
  onChange,
  placement,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placement: string;
}) {
  const missing = checkMissingAttr(value);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <CharCounter value={value} max={MAX_LEN} />
      </div>
      <Textarea
        id={id}
        rows={8}
        className="font-mono text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-xs text-muted-foreground">{placement}</p>
      {missing && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
          ⚠ ไม่พบ data-cookieyes ใน &lt;script&gt; ที่วาง — CookieYes จะไม่รอ consent ก่อนรันโค้ดนี้
        </p>
      )}
    </div>
  );
}

function AnalyticsTabVariantC() {
  const [header, setHeader] = useState("");
  const [body, setBody] = useState("");
  const [showExample, setShowExample] = useState(false);
  const example = `<script async data-cookieyes="cookieyes-analytics" src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"></script>\n<script data-cookieyes="cookieyes-analytics">\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag('js', new Date());\n  gtag('config', 'G-XXXXXXX');\n</script>`;
  return (
    <div className="rounded-xl border border-border/70 bg-card p-6">
      <h2 className="mb-1 font-semibold">Google Analytics / Tracking Scripts</h2>
      <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>เตรียมโค้ด script ให้มี attribute <code className="rounded bg-muted px-1">data-cookieyes=&quot;cookieyes-analytics&quot;</code> ในทุก &lt;script&gt; tag</li>
        <li>วางโค้ดที่จะแทรกใน &lt;head&gt; ลงช่อง Header และโค้ดที่จะแทรกหลัง &lt;body&gt; เปิด ลงช่อง Body</li>
        <li>กดบันทึก</li>
      </ol>
      <button
        type="button"
        onClick={() => setShowExample((s) => !s)}
        className="mb-4 text-xs font-medium text-primary underline underline-offset-2"
      >
        {showExample ? "ซ่อนตัวอย่างโค้ด" : "ดูตัวอย่างโค้ด (Google Analytics)"}
      </button>
      {showExample && (
        <pre className="mb-4 overflow-x-auto rounded-lg border border-border/70 bg-muted/30 p-3 text-[11px] leading-relaxed">
          {example}
        </pre>
      )}
      <div className="space-y-5">
        <ScriptField
          id="ga-c-header"
          label="Header tag area"
          value={header}
          onChange={setHeader}
          placement="แทรกใน <head> ของทุกหน้าเว็บสาธารณะ"
        />
        <ScriptField
          id="ga-c-body"
          label="Body tag area"
          value={body}
          onChange={setBody}
          placement="แทรกทันทีหลัง <body> เปิด ของทุกหน้าเว็บสาธารณะ"
        />
      </div>
      <Button className="mt-4" onClick={() => stubSave("บันทึก Tracking Scripts")}>
        บันทึก
      </Button>
    </div>
  );
}

function AnalyticsTabPrototype() {
  const searchParams = useSearchParams();
  const variant = searchParams.get("variant") ?? "A";
  return (
    <>
      {variant === "A" && <AnalyticsTabVariantA />}
      {variant === "B" && <AnalyticsTabVariantB />}
      {variant === "C" && <AnalyticsTabVariantC />}
      <PrototypeSwitcher current={variant} />
    </>
  );
}
// ── end prototype ─────────────────────────────────────────────────────

type PaymentSettingsForm = {
  promptpayId: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
};

type SiteSettingsForm = {
  headerCtaLabelTh: string;
  headerCtaLabelEn: string;
  footerDescriptionTh: string;
  footerDescriptionEn: string;
};

function CharCounter({ value, max }: { value: string; max: number }) {
  const over = value.length > max;
  return (
    <span className={over ? "text-accent-foreground" : "text-muted-foreground"}>
      {value.length}/{max}
    </span>
  );
}

function HeaderFooterTab({
  siteSettings,
  headerLogoUrl,
  footerLogoUrl,
}: {
  siteSettings: SiteSettingsForm | null;
  headerLogoUrl: string | null;
  footerLogoUrl: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [ctaTh, setCtaTh] = useState(siteSettings?.headerCtaLabelTh ?? "");
  const [ctaEn, setCtaEn] = useState(siteSettings?.headerCtaLabelEn ?? "");
  const [footerDescTh, setFooterDescTh] = useState(siteSettings?.footerDescriptionTh ?? "");
  const [footerDescEn, setFooterDescEn] = useState(siteSettings?.footerDescriptionEn ?? "");
  const [headerPreview, setHeaderPreview] = useState<string | null>(null);
  const [footerPreview, setFooterPreview] = useState<string | null>(null);
  const [removeHeaderLogo, setRemoveHeaderLogo] = useState(false);
  const [removeFooterLogo, setRemoveFooterLogo] = useState(false);

  const handleSubmit = (formData: FormData) => {
    if (removeHeaderLogo) formData.set("removeHeaderLogo", "1");
    if (removeFooterLogo) formData.set("removeFooterLogo", "1");
    startTransition(async () => {
      const result = await updateHeaderFooterSettings(formData);
      if (result.ok) {
        toast.success("บันทึก Header / Footer เรียบร้อย");
        setRemoveHeaderLogo(false);
        setRemoveFooterLogo(false);
        setHeaderPreview(null);
        setFooterPreview(null);
      } else {
        toast.error(result.error);
      }
    });
  };

  if (!siteSettings) {
    return (
      <p className="rounded-lg border border-border/70 bg-accent px-4 py-3 text-sm text-accent-foreground">
        ยังไม่มีข้อมูลในฐานข้อมูล — กรอกและกดบันทึกเพื่อเริ่มจัดการเอง
      </p>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4" noValidate encType="multipart/form-data">
      <div className="rounded-xl border border-border/70 bg-card p-6">
        <h2 className="mb-1 font-semibold">โลโก้ Header และ Footer</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          อัปโหลดโลโก้แยกกัน — ไม่อัปโหลดจะใช้โลโก้เริ่มต้นของเว็บ
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm font-medium">โลโก้ Header</p>
            <div className="flex h-16 items-center rounded-lg border border-border/70 bg-muted/30 px-4">
              {headerPreview || (headerLogoUrl && !removeHeaderLogo) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={headerPreview ?? headerLogoUrl ?? undefined}
                  alt=""
                  className="h-10 w-auto object-contain"
                />
              ) : (
                <span className="text-xs text-muted-foreground">ใช้โลโก้เริ่มต้น</span>
              )}
            </div>
            <Input
              id="hf-header-logo"
              name="headerLogo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setHeaderPreview(f ? URL.createObjectURL(f) : null);
                setRemoveHeaderLogo(false);
              }}
            />
            {headerLogoUrl && !removeHeaderLogo && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setRemoveHeaderLogo(true);
                  setHeaderPreview(null);
                }}
              >
                ลบโลโก้ Header (ใช้ค่าเริ่มต้น)
              </Button>
            )}
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium">โลโก้ Footer</p>
            <div className="flex h-16 items-center rounded-lg border border-border/70 bg-muted/30 px-4">
              {footerPreview || (footerLogoUrl && !removeFooterLogo) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={footerPreview ?? footerLogoUrl ?? undefined}
                  alt=""
                  className="h-10 w-auto object-contain"
                />
              ) : (
                <span className="text-xs text-muted-foreground">ใช้โลโก้เริ่มต้น</span>
              )}
            </div>
            <Input
              id="hf-footer-logo"
              name="footerLogo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setFooterPreview(f ? URL.createObjectURL(f) : null);
                setRemoveFooterLogo(false);
              }}
            />
            {footerLogoUrl && !removeFooterLogo && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setRemoveFooterLogo(true);
                  setFooterPreview(null);
                }}
              >
                ลบโลโก้ Footer (ใช้ค่าเริ่มต้น)
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-card p-6">
        <h2 className="mb-1 font-semibold">ข้อความบน Header และ Footer</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          แก้ได้เฉพาะข้อความ — เมนูและลิงก์ในเมนูผูกกับหน้าจริงของเว็บ จึงจัดเรียงจากที่นี่ไม่ได้
        </p>
        <BilingualTabs
          th={
            <>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="hf-cta-th">ข้อความปุ่ม CTA บน Header (ไทย)</Label>
                  <CharCounter value={ctaTh} max={28} />
                </div>
                <Input
                  id="hf-cta-th"
                  name="headerCtaLabelTh"
                  value={ctaTh}
                  onChange={(e) => setCtaTh(e.target.value)}
                  placeholder="สอบถาม/นัดสำรวจ"
                />
                <p className="text-xs text-muted-foreground">ปุ่มสีส้มมุมขวาบนของทุกหน้า — เว้นว่างเพื่อใช้ข้อความเริ่มต้น "สอบถาม/นัดสำรวจ"</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hf-desc-th">ข้อความแนะนำบริษัทใน Footer (ไทย)</Label>
                <Textarea
                  id="hf-desc-th"
                  name="footerDescriptionTh"
                  rows={4}
                  value={footerDescTh}
                  onChange={(e) => setFooterDescTh(e.target.value)}
                />
              </div>
            </>
          }
          en={
            <>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="hf-cta-en">Header CTA button label (EN)</Label>
                  <CharCounter value={ctaEn} max={28} />
                </div>
                <Input
                  id="hf-cta-en"
                  name="headerCtaLabelEn"
                  value={ctaEn}
                  onChange={(e) => setCtaEn(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">ปุ่มสีส้มมุมขวาบนของทุกหน้า — เว้นว่างเพื่อใช้ข้อความเริ่มต้น</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hf-desc-en">Footer company description (EN)</Label>
                <Textarea
                  id="hf-desc-en"
                  name="footerDescriptionEn"
                  rows={4}
                  value={footerDescEn}
                  onChange={(e) => setFooterDescEn(e.target.value)}
                />
              </div>
            </>
          }
        />
        <p className="mt-3 text-xs text-muted-foreground">เว้นภาษาอังกฤษว่างได้ — หน้า /en จะแสดงข้อความภาษาไทยแทน</p>
      </div>
      <Button type="submit" id="hf-submit" disabled={isPending}>
        {isPending ? "กำลังบันทึก..." : "บันทึก Header / Footer"}
      </Button>
    </form>
  );
}

export function SettingsClient({
  role,
  setting,
  paymentSettings,
  siteSettings,
  headerLogoUrl,
  footerLogoUrl,
}: {
  role: Role;
  setting: { maxPerDay: number; maxPerSlot: number } | null;
  paymentSettings: PaymentSettingsForm | null;
  siteSettings: SiteSettingsForm | null;
  headerLogoUrl: string | null;
  footerLogoUrl: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [isPaymentPending, startPaymentTransition] = useTransition();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [promptpayId, setPromptpayId] = useState(paymentSettings?.promptpayId ?? "");

  const showCapacity = role === "ADMIN";
  const defaultTab = showCapacity ? "capacity" : "headfoot";

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await updateBookingCapacitySetting(formData);
      if (result.ok) {
        toast.success("บันทึกการตั้งค่าเรียบร้อย");
      } else {
        toast.error(result.error);
      }
    });
  };

  const onSubmitPayment = (formData: FormData) => {
    startPaymentTransition(async () => {
      const result = await updatePaymentSettings(formData);
      if (result.ok) {
        toast.success("บันทึกข้อมูลการชำระเงินเรียบร้อย");
      } else {
        toast.error(result.error);
      }
    });
  };

  const onPreviewQr = () => {
    startPaymentTransition(async () => {
      if (!promptpayId.trim()) {
        setQrDataUrl(null);
        return;
      }
      const result = await previewPromptPayQr(promptpayId.trim());
      if (result.ok) {
        setQrDataUrl(result.dataUrl);
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="text-xl font-bold">ตั้งค่าระบบ</h1>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="w-full max-w-full overflow-x-auto">
          {showCapacity && (
            <TabsTrigger id="st-tab-capacity" value="capacity" className="shrink-0 px-3">
              นัดสำรวจ &amp; ชำระเงิน
            </TabsTrigger>
          )}
          <TabsTrigger id="st-tab-headfoot" value="headfoot" className="shrink-0 px-3">
            Header / Footer
          </TabsTrigger>
          {showCapacity && (
            <TabsTrigger id="st-tab-analytics" value="analytics" className="shrink-0 px-3">
              Google Analytics
            </TabsTrigger>
          )}
        </TabsList>

        {showCapacity && (
          <TabsContent value="capacity" className="space-y-5 pt-3">
            <div className="rounded-xl border border-border/70 bg-card p-6">
              <h2 className="mb-1 font-semibold">จำนวนนัดสำรวจสูงสุด</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                กำหนดจำนวนนัดสำรวจสูงสุดต่อวันและต่อช่วงเวลา — ลูกค้าจะไม่สามารถเลือกวัน/ช่วงเวลาที่เต็มแล้วในฟอร์มจองสำรวจได้
              </p>
              <form action={onSubmit} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="s-max-per-day">จำนวนนัดสำรวจสูงสุดต่อวัน</Label>
                  <Input
                    id="s-max-per-day"
                    name="maxPerDay"
                    type="number"
                    min={1}
                    max={100}
                    required
                    defaultValue={setting?.maxPerDay ?? 4}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-max-per-slot">จำนวนนัดสำรวจสูงสุดต่อช่วงเวลา</Label>
                  <Input
                    id="s-max-per-slot"
                    name="maxPerSlot"
                    type="number"
                    min={1}
                    max={100}
                    required
                    defaultValue={setting?.maxPerSlot ?? 2}
                  />
                </div>
                <Button id="s-capacity-submit" type="submit" disabled={isPending}>
                  {isPending ? "กำลังบันทึก..." : "บันทึก"}
                </Button>
              </form>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-6">
              <h2 className="mb-1 font-semibold">ข้อมูลการชำระเงิน</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                ข้อมูลบัญชีธนาคารและ PromptPay ที่แสดงในฟอร์มจองสำรวจหน้างานฝั่งลูกค้า
              </p>
              <form action={onSubmitPayment} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="p-promptpay-id">PromptPay ID (เบอร์โทร/เลขบัตรประชาชน)</Label>
                  <Input
                    id="p-promptpay-id"
                    name="promptpayId"
                    value={promptpayId}
                    onChange={(e) => setPromptpayId(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-bank-name">ชื่อธนาคาร</Label>
                  <Input id="p-bank-name" name="bankName" defaultValue={paymentSettings?.bankName ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-bank-account-number">เลขที่บัญชี</Label>
                  <Input
                    id="p-bank-account-number"
                    name="bankAccountNumber"
                    defaultValue={paymentSettings?.bankAccountNumber ?? ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-bank-account-name">ชื่อบัญชี</Label>
                  <Input
                    id="p-bank-account-name"
                    name="bankAccountName"
                    defaultValue={paymentSettings?.bankAccountName ?? ""}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button id="p-payment-submit" type="submit" disabled={isPaymentPending}>
                    {isPaymentPending ? "กำลังบันทึก..." : "บันทึก"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPaymentPending}
                    onClick={onPreviewQr}
                  >
                    พรีวิว QR PromptPay
                  </Button>
                </div>
              </form>
              {qrDataUrl && (
                <div className="mt-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrDataUrl} alt="พรีวิว QR PromptPay" className="size-48 rounded-lg border" />
                </div>
              )}
            </div>
          </TabsContent>
        )}

        <TabsContent value="headfoot" className="space-y-5 pt-3">
          <HeaderFooterTab
            siteSettings={siteSettings}
            headerLogoUrl={headerLogoUrl}
            footerLogoUrl={footerLogoUrl}
          />
        </TabsContent>

        {showCapacity && (
          <TabsContent value="analytics" className="space-y-5 pt-3">
            <AnalyticsTabPrototype />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

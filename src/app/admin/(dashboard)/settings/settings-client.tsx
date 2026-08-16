"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateBookingCapacitySetting } from "@/actions/bookings";
import { updatePaymentSettings } from "@/actions/payment-settings";
import { previewPromptPayQr } from "@/actions/promptpay-preview";
import { updateContactSettings, updateHeaderFooterSettings, updatePageSeo } from "@/actions/site-settings";
import { BilingualTabs } from "@/components/admin/crud-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Role } from "@/lib/auth";
import type { MetaKey } from "@/lib/seo";

type PaymentSettingsForm = {
  promptpayId: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
};

type SiteSettingsForm = {
  phone: string;
  email: string;
  addressTh: string;
  addressEn: string;
  hoursTh: string;
  hoursEn: string;
  mapQuery: string;
  lineUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  contactTitleTh: string;
  contactTitleEn: string;
  contactSubtitleTh: string;
  contactSubtitleEn: string;
  headerCtaLabelTh: string;
  headerCtaLabelEn: string;
  footerDescriptionTh: string;
  footerDescriptionEn: string;
};

type PageSeoEntry = {
  titleTh: string;
  titleEn: string;
  descriptionTh: string;
  descriptionEn: string;
};

// Labels for each META_KEY — hardcoded per ADR 0001 (admin is Thai-only, no message keys)
const SEO_PAGES: { key: MetaKey; label: string; path: string }[] = [
  { key: "home", label: "หน้าแรก", path: "/" },
  { key: "about", label: "เกี่ยวกับเรา", path: "/about" },
  { key: "services", label: "บริการ", path: "/services" },
  { key: "packages", label: "แพ็กเกจ", path: "/packages" },
  { key: "portfolio", label: "ผลงาน", path: "/portfolio" },
  { key: "booking", label: "สอบถาม/นัดสำรวจ", path: "/booking" },
  { key: "contact", label: "ติดต่อเรา", path: "/contact" },
  { key: "calculator", label: "เครื่องคำนวณ", path: "/calculator" },
  { key: "testimonials", label: "รีวิวลูกค้า", path: "/testimonials" },
  { key: "cookiePolicy", label: "นโยบายคุกกี้", path: "/cookie-policy" },
];

function CharCounter({ value, max }: { value: string; max: number }) {
  const over = value.length > max;
  return (
    <span className={over ? "text-accent-foreground" : "text-muted-foreground"}>
      {value.length}/{max}
    </span>
  );
}

function SeoPageForm({
  page,
  data,
  onDirty,
  onSaved,
  isDirty,
}: {
  page: (typeof SEO_PAGES)[number];
  data: PageSeoEntry;
  onDirty: () => void;
  onSaved: () => void;
  isDirty: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [titleTh, setTitleTh] = useState(data.titleTh);
  const [titleEn, setTitleEn] = useState(data.titleEn);
  const [descTh, setDescTh] = useState(data.descriptionTh);
  const [descEn, setDescEn] = useState(data.descriptionEn);

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await updatePageSeo(page.key, formData);
      if (result.ok) {
        toast.success(`บันทึก SEO ของหน้า "${page.label}" เรียบร้อย`);
        onSaved();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="min-w-0 space-y-4">
      <div>
        <h2 className="font-semibold">SEO ของ: {page.label}</h2>
        <p className="text-sm text-muted-foreground">
          /th{page.path} · /en{page.path}
        </p>
      </div>
      <form action={handleSubmit} className="space-y-4" noValidate onInput={onDirty}>
        <BilingualTabs
          th={
            <>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`seo-${page.key}-title-th`}>ชื่อหน้า (Title) — ภาษาไทย</Label>
                  <CharCounter value={titleTh} max={60} />
                </div>
                <Input
                  id={`seo-${page.key}-title-th`}
                  name="titleTh"
                  value={titleTh}
                  onChange={(e) => setTitleTh(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`seo-${page.key}-desc-th`}>คำอธิบาย (Description) — ภาษาไทย</Label>
                  <CharCounter value={descTh} max={155} />
                </div>
                <Textarea
                  id={`seo-${page.key}-desc-th`}
                  name="descriptionTh"
                  rows={3}
                  value={descTh}
                  onChange={(e) => setDescTh(e.target.value)}
                />
              </div>
            </>
          }
          en={
            <>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`seo-${page.key}-title-en`}>Title (EN)</Label>
                  <CharCounter value={titleEn} max={60} />
                </div>
                <Input
                  id={`seo-${page.key}-title-en`}
                  name="titleEn"
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`seo-${page.key}-desc-en`}>Description (EN)</Label>
                  <CharCounter value={descEn} max={155} />
                </div>
                <Textarea
                  id={`seo-${page.key}-desc-en`}
                  name="descriptionEn"
                  rows={3}
                  value={descEn}
                  onChange={(e) => setDescEn(e.target.value)}
                />
              </div>
            </>
          }
        />
        <Button
          type="submit"
          id={`seo-${page.key}-submit`}
          disabled={isPending}
        >
          {isPending ? "กำลังบันทึก..." : "บันทึก SEO ของหน้านี้"}
        </Button>
      </form>
    </div>
  );
}

function SeoTab({ pageSeoMap }: { pageSeoMap: Record<string, PageSeoEntry> }) {
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());

  const markDirty = (key: string) =>
    setDirtyKeys((prev) => new Set([...prev, key]));
  const markClean = (key: string) =>
    setDirtyKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });

  return (
    <div className="space-y-2">
      {dirtyKeys.size > 0 && (
        <p className="text-xs text-accent-foreground">มีหน้าที่แก้ไขแล้วยังไม่ได้บันทึก</p>
      )}
      <Tabs
        orientation="vertical"
        defaultValue="home"
        className="flex flex-col gap-2 md:flex-row"
      >
        <TabsList className="w-full max-h-56 overflow-y-auto md:max-h-none md:w-44 md:shrink-0">
          {SEO_PAGES.map((p) => {
            const data = pageSeoMap[p.key] ?? { titleTh: "", titleEn: "", descriptionTh: "", descriptionEn: "" };
            const isFallback = !data.titleTh || !data.descriptionTh;
            const isDirty = dirtyKeys.has(p.key);
            return (
              <TabsTrigger
                key={p.key}
                id={`seo-tab-${p.key}`}
                value={p.key}
                className="shrink-0 px-3 text-xs"
              >
                {p.label}
                {isDirty && (
                  <span
                    className="ml-auto size-1.5 rounded-full bg-brand-orange"
                    aria-label="ยังไม่ได้บันทึก"
                  />
                )}
                {!isDirty && isFallback && (
                  <span className="ml-auto text-[10px] text-accent-foreground">ค่าสำรอง</span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {SEO_PAGES.map((p) => (
          <TabsContent key={p.key} value={p.key} className="min-w-0 space-y-4">
            <SeoPageForm
              page={p}
              data={pageSeoMap[p.key] ?? { titleTh: "", titleEn: "", descriptionTh: "", descriptionEn: "" }}
              onDirty={() => markDirty(p.key)}
              onSaved={() => markClean(p.key)}
              isDirty={dirtyKeys.has(p.key)}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ContactTab({ siteSettings }: { siteSettings: SiteSettingsForm | null }) {
  const [isPending, startTransition] = useTransition();
  const [fields, setFields] = useState({
    phone: siteSettings?.phone ?? "",
    email: siteSettings?.email ?? "",
    mapQuery: siteSettings?.mapQuery ?? "",
    addressTh: siteSettings?.addressTh ?? "",
    addressEn: siteSettings?.addressEn ?? "",
    hoursTh: siteSettings?.hoursTh ?? "",
    hoursEn: siteSettings?.hoursEn ?? "",
    contactTitleTh: siteSettings?.contactTitleTh ?? "",
    contactTitleEn: siteSettings?.contactTitleEn ?? "",
    contactSubtitleTh: siteSettings?.contactSubtitleTh ?? "",
    contactSubtitleEn: siteSettings?.contactSubtitleEn ?? "",
    lineUrl: siteSettings?.lineUrl ?? "",
    facebookUrl: siteSettings?.facebookUrl ?? "",
    instagramUrl: siteSettings?.instagramUrl ?? "",
    tiktokUrl: siteSettings?.tiktokUrl ?? "",
    youtubeUrl: siteSettings?.youtubeUrl ?? "",
  });

  const set = (key: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFields((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await updateContactSettings(formData);
      if (result.ok) {
        toast.success("บันทึกข้อมูลติดต่อเรียบร้อย");
      } else {
        toast.error(result.error);
      }
    });
  };

  if (!siteSettings) {
    return (
      <p className="rounded-lg border border-border/70 bg-accent px-4 py-3 text-sm text-accent-foreground">
        ยังไม่มีข้อมูลในฐานข้อมูล — ตอนนี้หน้าเว็บกำลังใช้ข้อความเริ่มต้น กรอกและกดบันทึกเพื่อเริ่มจัดการเอง
      </p>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4" noValidate>
      <div className="rounded-xl border border-border/70 bg-card p-6">
        <h2 className="mb-1 font-semibold">ข้อมูลติดต่อ</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          ข้อมูลชุดนี้ใช้ร่วมกันทั้ง footer, หน้าติดต่อเรา, ฟอร์มนัดสำรวจ และข้อมูลธุรกิจสำหรับ Google — แก้ที่นี่ที่เดียวเปลี่ยนทั้งเว็บ
        </p>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="c-phone">เบอร์โทรศัพท์</Label>
            <Input
              id="c-phone"
              name="phone"
              type="tel"
              value={fields.phone}
              onChange={set("phone")}
              placeholder="082-473-1567"
            />
            <p className="text-xs text-muted-foreground">ใช้เป็นทั้งข้อความที่แสดงและลิงก์โทรออก</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-email">อีเมล</Label>
            <Input
              id="c-email"
              name="email"
              type="email"
              value={fields.email}
              onChange={set("email")}
              placeholder="contact@kkdproperty.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-map-query">คำค้นสำหรับแผนที่ Google</Label>
            <Input
              id="c-map-query"
              name="mapQuery"
              value={fields.mapQuery}
              onChange={set("mapQuery")}
            />
            <p className="text-xs text-muted-foreground">ข้อความที่ใช้ค้นใน Google Maps ของหน้าติดต่อเรา — ใส่ชื่อบริษัทหรือที่อยู่เต็ม</p>
          </div>
          <BilingualTabs
            th={
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="c-address-th">ที่อยู่ (ไทย)</Label>
                  <Textarea id="c-address-th" name="addressTh" rows={2} value={fields.addressTh} onChange={set("addressTh")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-hours-th">เวลาทำการ (ไทย)</Label>
                  <Input id="c-hours-th" name="hoursTh" value={fields.hoursTh} onChange={set("hoursTh")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-title-th">หัวข้อหน้าติดต่อเรา (ไทย)</Label>
                  <Input id="c-title-th" name="contactTitleTh" value={fields.contactTitleTh} onChange={set("contactTitleTh")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-subtitle-th">ข้อความรองหน้าติดต่อเรา (ไทย)</Label>
                  <Input id="c-subtitle-th" name="contactSubtitleTh" value={fields.contactSubtitleTh} onChange={set("contactSubtitleTh")} />
                </div>
              </>
            }
            en={
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="c-address-en">Address (EN)</Label>
                  <Textarea id="c-address-en" name="addressEn" rows={2} value={fields.addressEn} onChange={set("addressEn")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-hours-en">Business hours (EN)</Label>
                  <Input id="c-hours-en" name="hoursEn" value={fields.hoursEn} onChange={set("hoursEn")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-title-en">Contact page title (EN)</Label>
                  <Input id="c-title-en" name="contactTitleEn" value={fields.contactTitleEn} onChange={set("contactTitleEn")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-subtitle-en">Contact page subtitle (EN)</Label>
                  <Input id="c-subtitle-en" name="contactSubtitleEn" value={fields.contactSubtitleEn} onChange={set("contactSubtitleEn")} />
                </div>
              </>
            }
          />
          <p className="text-xs text-muted-foreground">เว้นภาษาอังกฤษว่างได้ — หน้า /en จะแสดงข้อความภาษาไทยแทน</p>
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-card p-6">
        <h2 className="mb-1 font-semibold">Social Media</h2>
        <p className="mb-4 text-sm text-muted-foreground">เว้นว่างช่องไหน ไอคอนของช่องทางนั้นจะไม่แสดงบนหน้าเว็บ</p>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="c-line-url">LINE (URL)</Label>
            <Input id="c-line-url" name="lineUrl" type="url" value={fields.lineUrl} onChange={set("lineUrl")} placeholder="https://line.me/R/ti/p/@kkdsolar" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-facebook-url">Facebook (URL)</Label>
            <Input id="c-facebook-url" name="facebookUrl" type="url" value={fields.facebookUrl} onChange={set("facebookUrl")} placeholder="https://facebook.com/kkdsolar" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-instagram-url">Instagram (URL)</Label>
            <Input id="c-instagram-url" name="instagramUrl" type="url" value={fields.instagramUrl} onChange={set("instagramUrl")} placeholder="https://instagram.com/kkdproperty" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-tiktok-url">TikTok (URL)</Label>
            <Input id="c-tiktok-url" name="tiktokUrl" type="url" value={fields.tiktokUrl} onChange={set("tiktokUrl")} placeholder="https://tiktok.com/@kkdproperty" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-youtube-url">YouTube (URL)</Label>
            <Input id="c-youtube-url" name="youtubeUrl" type="url" value={fields.youtubeUrl} onChange={set("youtubeUrl")} placeholder="https://youtube.com/@kkdproperty" />
          </div>
        </div>
      </div>

      <Button type="submit" id="c-contact-submit" disabled={isPending}>
        {isPending ? "กำลังบันทึก..." : "บันทึกข้อมูลติดต่อ"}
      </Button>
    </form>
  );
}

function HeaderFooterTab({ siteSettings }: { siteSettings: SiteSettingsForm | null }) {
  const [isPending, startTransition] = useTransition();
  const [ctaTh, setCtaTh] = useState(siteSettings?.headerCtaLabelTh ?? "");
  const [ctaEn, setCtaEn] = useState(siteSettings?.headerCtaLabelEn ?? "");
  const [footerDescTh, setFooterDescTh] = useState(siteSettings?.footerDescriptionTh ?? "");
  const [footerDescEn, setFooterDescEn] = useState(siteSettings?.footerDescriptionEn ?? "");

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await updateHeaderFooterSettings(formData);
      if (result.ok) {
        toast.success("บันทึกข้อความ Header / Footer เรียบร้อย");
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
    <form action={handleSubmit} className="space-y-4" noValidate>
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
  pageSeoMap,
}: {
  role: Role;
  setting: { maxPerDay: number; maxPerSlot: number } | null;
  paymentSettings: PaymentSettingsForm | null;
  siteSettings: SiteSettingsForm | null;
  pageSeoMap: Record<string, PageSeoEntry>;
}) {
  const [isPending, startTransition] = useTransition();
  const [isPaymentPending, startPaymentTransition] = useTransition();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [promptpayId, setPromptpayId] = useState(paymentSettings?.promptpayId ?? "");

  const showCapacity = role === "ADMIN";
  const defaultTab = showCapacity ? "capacity" : "seo";

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
          <TabsTrigger id="st-tab-seo" value="seo" className="shrink-0 px-3">
            SEO / Meta
          </TabsTrigger>
          <TabsTrigger id="st-tab-contact" value="contact" className="shrink-0 px-3">
            ติดต่อ &amp; Social
          </TabsTrigger>
          <TabsTrigger id="st-tab-headfoot" value="headfoot" className="shrink-0 px-3">
            Header / Footer
          </TabsTrigger>
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

        <TabsContent value="seo" className="space-y-5 pt-3">
          <SeoTab pageSeoMap={pageSeoMap} />
        </TabsContent>

        <TabsContent value="contact" className="space-y-5 pt-3">
          <ContactTab siteSettings={siteSettings} />
        </TabsContent>

        <TabsContent value="headfoot" className="space-y-5 pt-3">
          <HeaderFooterTab siteSettings={siteSettings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

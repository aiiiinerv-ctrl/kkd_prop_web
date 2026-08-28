"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateContactSettings } from "@/actions/site-settings";
import { BilingualTabs } from "@/components/admin/crud-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ContactSiteSettingsForm = {
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
};

export function ContactContentClient({
  siteSettings,
}: {
  siteSettings: ContactSiteSettingsForm | null;
}) {
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

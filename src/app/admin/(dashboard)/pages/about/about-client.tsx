"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { updateAboutContent } from "@/actions/about-content";
import {
  ABOUT_ICON_SLOT_DEFAULTS,
  ABOUT_LUCIDE_ICON_NAMES,
  type AboutIconSlot,
} from "@/lib/about/lucide-icons";
import { ABOUT_FEATURED_MAX } from "@/lib/validations/about-content";
import { BilingualTabs } from "@/components/admin/crud-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type AboutData = {
  version: number;
  titleTh: string; titleEn: string;
  introTh: string; introEn: string;
  credRegisteredTitleTh: string; credRegisteredTitleEn: string;
  credRegisteredDescTh: string; credRegisteredDescEn: string;
  credEngineerTitleTh: string; credEngineerTitleEn: string;
  credEngineerDescTh: string; credEngineerDescEn: string;
  credExperienceTitleTh: string; credExperienceTitleEn: string;
  credExperienceDescTh: string; credExperienceDescEn: string;
  credSectionTitleTh: string; credSectionTitleEn: string;
  credSectionDescTh: string; credSectionDescEn: string;
  credRegisteredIcon: string; credEngineerIcon: string; credExperienceIcon: string;
  teamDesignIcon: string; teamInstallIcon: string; teamSupportIcon: string;
  teamTitleTh: string; teamTitleEn: string;
  teamDescTh: string; teamDescEn: string;
  teamDesignTitleTh: string; teamDesignTitleEn: string;
  teamDesignDescTh: string; teamDesignDescEn: string;
  teamInstallTitleTh: string; teamInstallTitleEn: string;
  teamInstallDescTh: string; teamInstallDescEn: string;
  teamSupportTitleTh: string; teamSupportTitleEn: string;
  teamSupportDescTh: string; teamSupportDescEn: string;
  statsProjectsLabelTh: string; statsProjectsLabelEn: string;
  statsYearsLabelTh: string; statsYearsLabelEn: string;
  statsEngineersLabelTh: string; statsEngineersLabelEn: string;
  statsCustomersLabelTh: string; statsCustomersLabelEn: string;
  testimonialsTitleTh: string; testimonialsTitleEn: string;
  testimonialsSubtitleTh: string; testimonialsSubtitleEn: string;
  showCredentials: boolean;
  showTeam: boolean;
  showStats: boolean;
  showTestimonials: boolean;
  showGlobalCta: boolean;
  featuredTestimonialIds: string[];
};

type TestimonialOption = { id: string; label: string; published: boolean };

const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";

const ICON_SLOT_LABELS: Record<AboutIconSlot, { th: string; en: string }> = {
  credRegisteredIcon: {
    th: "กล่อง 1 · จดทะเบียนบริษัท",
    en: "Box 1 · Company registration",
  },
  credEngineerIcon: {
    th: "กล่อง 2 · วิศวกรมีใบอนุญาต",
    en: "Box 2 · Licensed engineers",
  },
  credExperienceIcon: {
    th: "กล่อง 3 · ประสบการณ์และผลงาน",
    en: "Box 3 · Track record",
  },
  teamDesignIcon: {
    th: "การ์ดทีม 1 · ออกแบบและวิศวกรรม",
    en: "Team card 1 · Design & engineering",
  },
  teamInstallIcon: {
    th: "การ์ดทีม 2 · ติดตั้งหน้างาน",
    en: "Team card 2 · On-site installation",
  },
  teamSupportIcon: {
    th: "การ์ดทีม 3 · บริการหลังการขาย",
    en: "Team card 3 · After-sales support",
  },
};

const ICON_SLOTS: AboutIconSlot[] = [
  "credRegisteredIcon",
  "credEngineerIcon",
  "credExperienceIcon",
  "teamDesignIcon",
  "teamInstallIcon",
  "teamSupportIcon",
];

function IconSelect({ slot, value }: { slot: AboutIconSlot; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`ab-icon-${slot}`}>{ICON_SLOT_LABELS[slot].th}</Label>
      <select id={`ab-icon-${slot}`} name={slot} defaultValue={value} className={inputCls}>
        <option value="">
          ค่าเริ่มต้น ({ABOUT_ICON_SLOT_DEFAULTS[slot]})
        </option>
        {ABOUT_LUCIDE_ICON_NAMES.map((iconName) => (
          <option key={iconName} value={iconName}>
            {iconName}
          </option>
        ))}
      </select>
    </div>
  );
}

const EMPTY: AboutData = {
  version: 1,
  titleTh: "", titleEn: "", introTh: "", introEn: "",
  credRegisteredTitleTh: "", credRegisteredTitleEn: "", credRegisteredDescTh: "", credRegisteredDescEn: "",
  credEngineerTitleTh: "", credEngineerTitleEn: "", credEngineerDescTh: "", credEngineerDescEn: "",
  credExperienceTitleTh: "", credExperienceTitleEn: "", credExperienceDescTh: "", credExperienceDescEn: "",
  credSectionTitleTh: "", credSectionTitleEn: "", credSectionDescTh: "", credSectionDescEn: "",
  credRegisteredIcon: "", credEngineerIcon: "", credExperienceIcon: "",
  teamDesignIcon: "", teamInstallIcon: "", teamSupportIcon: "",
  teamTitleTh: "", teamTitleEn: "", teamDescTh: "", teamDescEn: "",
  teamDesignTitleTh: "", teamDesignTitleEn: "", teamDesignDescTh: "", teamDesignDescEn: "",
  teamInstallTitleTh: "", teamInstallTitleEn: "", teamInstallDescTh: "", teamInstallDescEn: "",
  teamSupportTitleTh: "", teamSupportTitleEn: "", teamSupportDescTh: "", teamSupportDescEn: "",
  statsProjectsLabelTh: "", statsProjectsLabelEn: "",
  statsYearsLabelTh: "", statsYearsLabelEn: "",
  statsEngineersLabelTh: "", statsEngineersLabelEn: "",
  statsCustomersLabelTh: "", statsCustomersLabelEn: "",
  testimonialsTitleTh: "", testimonialsTitleEn: "",
  testimonialsSubtitleTh: "", testimonialsSubtitleEn: "",
  showCredentials: true,
  showTeam: true,
  showStats: true,
  showTestimonials: true,
  showGlobalCta: true,
  featuredTestimonialIds: [],
};

export function AboutClient({
  data,
  testimonials = [],
}: {
  data: AboutData | null;
  testimonials?: TestimonialOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const d = data ?? EMPTY;
  const [featuredIds, setFeaturedIds] = useState<string[]>(d.featuredTestimonialIds);
  const [showCredentials, setShowCredentials] = useState(d.showCredentials);
  const [showTeam, setShowTeam] = useState(d.showTeam);
  const [showStats, setShowStats] = useState(d.showStats);
  const [showTestimonials, setShowTestimonials] = useState(d.showTestimonials);
  const [showGlobalCta, setShowGlobalCta] = useState(d.showGlobalCta);

  const toggleFeatured = (id: string) => {
    setFeaturedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= ABOUT_FEATURED_MAX) {
        toast.error(`เลือกได้สูงสุด ${ABOUT_FEATURED_MAX} รีวิว`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleSubmit = (formData: FormData) => {
    formData.set("version", String(d.version));
    formData.set("featuredTestimonialIdsJson", JSON.stringify(featuredIds));
    formData.set("showCredentials", showCredentials ? "true" : "false");
    formData.set("showTeam", showTeam ? "true" : "false");
    formData.set("showStats", showStats ? "true" : "false");
    formData.set("showTestimonials", showTestimonials ? "true" : "false");
    formData.set("showGlobalCta", showGlobalCta ? "true" : "false");
    startTransition(async () => {
      const result = await updateAboutContent(formData);
      if (result.ok) {
        toast.success("บันทึกเนื้อหาหน้าเกี่ยวกับเราเรียบร้อย");
        router.refresh();
      } else if ("conflict" in result && result.conflict) {
        toast.error("มีการแก้ไขจากคนอื่น — โหลดหน้าใหม่แล้วลองอีกครั้ง");
        router.refresh();
      } else {
        toast.error("error" in result ? result.error : "บันทึกไม่สำเร็จ");
      }
    });
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold">เนื้อหาหน้าเกี่ยวกับเรา</h1>
          <a
            href="/th/about"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            เปิดหน้าจริง /th/about
            <ExternalLink className="size-3.5" />
          </a>
        </div>
        <Button type="submit" form="about-form" id="ab-submit-top" disabled={isPending}>
          {isPending ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
      </div>

      {!data && (
        <p className="rounded-lg border border-border/70 bg-accent px-4 py-3 text-sm text-accent-foreground">
          ยังไม่มีข้อมูลในฐานข้อมูล — ตอนนี้หน้าเว็บกำลังใช้ข้อความเริ่มต้นที่ฝังมากับระบบ กรอกและกดบันทึกเพื่อเริ่มจัดการเอง
        </p>
      )}

      <form id="about-form" action={handleSubmit} className="space-y-5" noValidate>
        <BilingualTabs
          th={
            <div className="space-y-5">
              <p className="rounded-md border border-border/70 bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                เว้นภาษาอังกฤษว่างได้ — แท็บ English ที่ยังว่าง หน้า /en จะแสดงข้อความภาษาไทยแทน
              </p>

              <h3 className="text-base font-bold text-foreground border-b border-border/70 pb-1.5">ส่วนหัวของหน้า</h3>
              <p className="text-xs text-muted-foreground">
                แถบบนสุดของหน้า — 2 บรรทัดแรกที่ลูกค้าเห็นทันทีเมื่อเปิดหน้า
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="ab-titleTh">หัวข้อหลัก — บรรทัดใหญ่บนสุดของหน้า</Label>
                <Input id="ab-titleTh" name="titleTh" defaultValue={d.titleTh} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-introTh">ย่อหน้าเปิด — ข้อความใต้หัวข้อหลัก</Label>
                <Textarea id="ab-introTh" name="introTh" rows={3} defaultValue={d.introTh} />
                <p className="text-xs text-muted-foreground">
                  ยาวได้ 2–3 บรรทัด ถ้ายาวกว่านี้ส่วนหัวจะดูอึดอัด
                </p>
              </div>

              <h3 className="text-base font-bold text-foreground border-b border-border/70 pb-1.5">
                หัวข้อก่อนกล่องจดทะเบียน (ไม่บังคับ)
              </h3>
              <p className="text-xs text-muted-foreground">
                แสดงเหนือ 3 กล่องจุดน่าเชื่อถือ — ว่างไว้ได้ หน้าเว็บจะแสดงเฉพาะ 3 กล่องเหมือนเดิม
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="ab-credSectionTitleTh">หัวข้อ section</Label>
                <Input id="ab-credSectionTitleTh" name="credSectionTitleTh" defaultValue={d.credSectionTitleTh} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-credSectionDescTh">คำอธิบาย section</Label>
                <Textarea id="ab-credSectionDescTh" name="credSectionDescTh" rows={2} defaultValue={d.credSectionDescTh} />
              </div>

              <h3 className="text-base font-bold text-foreground border-b border-border/70 pb-1.5">
                จุดที่ทำให้ลูกค้าเชื่อถือ (3 กล่อง)
              </h3>
              <p className="text-xs text-muted-foreground">
                3 กล่องถัดจากส่วนหัว เรียงซ้าย→ขวาบนจอคอม (บนมือถือเรียงบนลงล่าง) เลือกไอคอนได้ในส่วน &quot;ไอคอนการ์ด&quot; ด้านล่าง
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="ab-credRegisteredTitleTh">กล่อง 1 · จดทะเบียนบริษัท (ซ้าย, ไอคอนรูปตึก) — หัวข้อ</Label>
                <Input id="ab-credRegisteredTitleTh" name="credRegisteredTitleTh" defaultValue={d.credRegisteredTitleTh} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-credRegisteredDescTh">กล่อง 1 · จดทะเบียนบริษัท (ซ้าย, ไอคอนรูปตึก) — คำอธิบาย</Label>
                <Textarea id="ab-credRegisteredDescTh" name="credRegisteredDescTh" rows={2} defaultValue={d.credRegisteredDescTh} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-credEngineerTitleTh">กล่อง 2 · วิศวกรมีใบอนุญาต (กลาง, ไอคอนตราประทับติ๊กถูก) — หัวข้อ</Label>
                <Input id="ab-credEngineerTitleTh" name="credEngineerTitleTh" defaultValue={d.credEngineerTitleTh} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-credEngineerDescTh">กล่อง 2 · วิศวกรมีใบอนุญาต (กลาง, ไอคอนตราประทับติ๊กถูก) — คำอธิบาย</Label>
                <Textarea id="ab-credEngineerDescTh" name="credEngineerDescTh" rows={2} defaultValue={d.credEngineerDescTh} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-credExperienceTitleTh">กล่อง 3 · ประสบการณ์และผลงาน (ขวา, ไอคอนเหรียญรางวัล) — หัวข้อ</Label>
                <Input id="ab-credExperienceTitleTh" name="credExperienceTitleTh" defaultValue={d.credExperienceTitleTh} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-credExperienceDescTh">กล่อง 3 · ประสบการณ์และผลงาน (ขวา, ไอคอนเหรียญรางวัล) — คำอธิบาย</Label>
                <Textarea id="ab-credExperienceDescTh" name="credExperienceDescTh" rows={2} defaultValue={d.credExperienceDescTh} />
                <p className="text-xs text-muted-foreground">
                  คำอธิบายทั้ง 3 กล่องควรยาวใกล้เคียงกัน 1–2 บรรทัด กล่องจะได้สูงเท่ากัน
                </p>
              </div>

              <h3 className="text-base font-bold text-foreground border-b border-border/70 pb-1.5">ทีมงาน</h3>
              <p className="text-xs text-muted-foreground">
                หัวข้อส่วน + การ์ด 3 ใบถัดจากกล่องความน่าเชื่อถือ เรียงซ้าย→ขวาบนจอคอม (บนมือถือเรียงบนลงล่าง)
                เลือกไอคอนการ์ดได้ในส่วน &quot;ไอคอนการ์ด&quot; ด้านล่าง
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamTitleTh">หัวข้อส่วนทีมงาน — บรรทัดใหญ่เหนือการ์ด 3 ใบ</Label>
                <Input id="ab-teamTitleTh" name="teamTitleTh" defaultValue={d.teamTitleTh} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamDescTh">คำอธิบายส่วนทีมงาน — ข้อความใต้หัวข้อส่วน</Label>
                <Textarea id="ab-teamDescTh" name="teamDescTh" rows={3} defaultValue={d.teamDescTh} />
                <p className="text-xs text-muted-foreground">ยาวได้ 2–3 บรรทัด</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamDesignTitleTh">การ์ดทีม 1 · ทีมออกแบบและวิศวกรรม (ซ้าย, ไอคอนดินสอกับไม้บรรทัด) — หัวข้อ</Label>
                <Input id="ab-teamDesignTitleTh" name="teamDesignTitleTh" defaultValue={d.teamDesignTitleTh} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamDesignDescTh">การ์ดทีม 1 · ทีมออกแบบและวิศวกรรม (ซ้าย, ไอคอนดินสอกับไม้บรรทัด) — คำอธิบาย</Label>
                <Textarea id="ab-teamDesignDescTh" name="teamDesignDescTh" rows={2} defaultValue={d.teamDesignDescTh} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamInstallTitleTh">การ์ดทีม 2 · ทีมติดตั้งหน้างาน (กลาง, ไอคอนประแจ) — หัวข้อ</Label>
                <Input id="ab-teamInstallTitleTh" name="teamInstallTitleTh" defaultValue={d.teamInstallTitleTh} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamInstallDescTh">การ์ดทีม 2 · ทีมติดตั้งหน้างาน (กลาง, ไอคอนประแจ) — คำอธิบาย</Label>
                <Textarea id="ab-teamInstallDescTh" name="teamInstallDescTh" rows={2} defaultValue={d.teamInstallDescTh} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamSupportTitleTh">การ์ดทีม 3 · ทีมบริการหลังการขาย (ขวา, ไอคอนหูฟัง) — หัวข้อ</Label>
                <Input id="ab-teamSupportTitleTh" name="teamSupportTitleTh" defaultValue={d.teamSupportTitleTh} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamSupportDescTh">การ์ดทีม 3 · ทีมบริการหลังการขาย (ขวา, ไอคอนหูฟัง) — คำอธิบาย</Label>
                <Textarea id="ab-teamSupportDescTh" name="teamSupportDescTh" rows={2} defaultValue={d.teamSupportDescTh} />
                <p className="text-xs text-muted-foreground">
                  คำอธิบายทั้ง 3 การ์ดควรยาวใกล้เคียงกัน 1–2 บรรทัด
                </p>
              </div>

              <h3 className="text-base font-bold text-foreground border-b border-border/70 pb-1.5">ตัวเลขสถิติ</h3>
              <p className="text-xs text-muted-foreground">
                ป้ายชื่อ 4 ช่อง — ตัวเลขดึงจากระบบอัตโนมัติ ว่างไว้ใช้ข้อความเริ่มต้น
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="ab-statsProjectsLabelTh">ป้าย · โครงการ</Label>
                <Input id="ab-statsProjectsLabelTh" name="statsProjectsLabelTh" defaultValue={d.statsProjectsLabelTh} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-statsYearsLabelTh">ป้าย · ปีประสบการณ์</Label>
                <Input id="ab-statsYearsLabelTh" name="statsYearsLabelTh" defaultValue={d.statsYearsLabelTh} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-statsEngineersLabelTh">ป้าย · วิศวกร</Label>
                <Input id="ab-statsEngineersLabelTh" name="statsEngineersLabelTh" defaultValue={d.statsEngineersLabelTh} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-statsCustomersLabelTh">ป้าย · ลูกค้า</Label>
                <Input id="ab-statsCustomersLabelTh" name="statsCustomersLabelTh" defaultValue={d.statsCustomersLabelTh} />
              </div>

              <h3 className="text-base font-bold text-foreground border-b border-border/70 pb-1.5">ส่วนรีวิว</h3>
              <div className="space-y-1.5">
                <Label htmlFor="ab-testimonialsTitleTh">หัวข้อรีวิว</Label>
                <Input id="ab-testimonialsTitleTh" name="testimonialsTitleTh" defaultValue={d.testimonialsTitleTh} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-testimonialsSubtitleTh">คำอธิบายใต้หัวข้อรีวิว</Label>
                <Textarea id="ab-testimonialsSubtitleTh" name="testimonialsSubtitleTh" rows={2} defaultValue={d.testimonialsSubtitleTh} />
              </div>
            </div>
          }
          en={
            <div className="space-y-5">
              <p className="rounded-md border border-border/70 bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Leaving English blank is fine — /en falls back to the Thai text for any empty field.
              </p>

              <h3 className="text-base font-bold text-foreground border-b border-border/70 pb-1.5">Page header</h3>
              <p className="text-xs text-muted-foreground">
                The very top of the page — the first two lines a visitor reads.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="ab-titleEn">Main heading — the big line at the top of the page</Label>
                <Input id="ab-titleEn" name="titleEn" defaultValue={d.titleEn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-introEn">Opening paragraph — the text under the main heading</Label>
                <Textarea id="ab-introEn" name="introEn" rows={3} defaultValue={d.introEn} />
                <p className="text-xs text-muted-foreground">
                  2–3 lines works best; longer crowds the header band.
                </p>
              </div>

              <h3 className="text-base font-bold text-foreground border-b border-border/70 pb-1.5">
                Heading before registration boxes (optional)
              </h3>
              <p className="text-xs text-muted-foreground">
                Shown above the three credential boxes. Leave blank to show boxes only (same as today).
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="ab-credSectionTitleEn">Section heading</Label>
                <Input id="ab-credSectionTitleEn" name="credSectionTitleEn" defaultValue={d.credSectionTitleEn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-credSectionDescEn">Section description</Label>
                <Textarea id="ab-credSectionDescEn" name="credSectionDescEn" rows={2} defaultValue={d.credSectionDescEn} />
              </div>

              <h3 className="text-base font-bold text-foreground border-b border-border/70 pb-1.5">
                Trust credentials (3 boxes)
              </h3>
              <p className="text-xs text-muted-foreground">
                Three boxes below the header, left→right on desktop (stacked on mobile). Pick icons in the
                &quot;Card icons&quot; section below.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="ab-credRegisteredTitleEn">Box 1 · Company registration (left, building icon) — heading</Label>
                <Input id="ab-credRegisteredTitleEn" name="credRegisteredTitleEn" defaultValue={d.credRegisteredTitleEn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-credRegisteredDescEn">Box 1 · Company registration (left, building icon) — description</Label>
                <Textarea id="ab-credRegisteredDescEn" name="credRegisteredDescEn" rows={2} defaultValue={d.credRegisteredDescEn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-credEngineerTitleEn">Box 2 · Licensed engineers (middle, check-seal icon) — heading</Label>
                <Input id="ab-credEngineerTitleEn" name="credEngineerTitleEn" defaultValue={d.credEngineerTitleEn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-credEngineerDescEn">Box 2 · Licensed engineers (middle, check-seal icon) — description</Label>
                <Textarea id="ab-credEngineerDescEn" name="credEngineerDescEn" rows={2} defaultValue={d.credEngineerDescEn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-credExperienceTitleEn">Box 3 · Track record (right, award-medal icon) — heading</Label>
                <Input id="ab-credExperienceTitleEn" name="credExperienceTitleEn" defaultValue={d.credExperienceTitleEn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-credExperienceDescEn">Box 3 · Track record (right, award-medal icon) — description</Label>
                <Textarea id="ab-credExperienceDescEn" name="credExperienceDescEn" rows={2} defaultValue={d.credExperienceDescEn} />
                <p className="text-xs text-muted-foreground">
                  Keep all three descriptions a similar 1–2 lines so the boxes stay the same height.
                </p>
              </div>

              <h3 className="text-base font-bold text-foreground border-b border-border/70 pb-1.5">Team</h3>
              <p className="text-xs text-muted-foreground">
                Section heading plus three cards below the credential boxes, left→right on desktop (stacked on
                mobile). Pick card icons in the &quot;Card icons&quot; section below.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamTitleEn">Team section heading — the big line above the three cards</Label>
                <Input id="ab-teamTitleEn" name="teamTitleEn" defaultValue={d.teamTitleEn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamDescEn">Team section description — the text under that heading</Label>
                <Textarea id="ab-teamDescEn" name="teamDescEn" rows={3} defaultValue={d.teamDescEn} />
                <p className="text-xs text-muted-foreground">2–3 lines.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamDesignTitleEn">Team card 1 · Design &amp; engineering (left, pencil-and-ruler icon) — heading</Label>
                <Input id="ab-teamDesignTitleEn" name="teamDesignTitleEn" defaultValue={d.teamDesignTitleEn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamDesignDescEn">Team card 1 · Design &amp; engineering (left, pencil-and-ruler icon) — description</Label>
                <Textarea id="ab-teamDesignDescEn" name="teamDesignDescEn" rows={2} defaultValue={d.teamDesignDescEn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamInstallTitleEn">Team card 2 · On-site installation (middle, wrench icon) — heading</Label>
                <Input id="ab-teamInstallTitleEn" name="teamInstallTitleEn" defaultValue={d.teamInstallTitleEn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamInstallDescEn">Team card 2 · On-site installation (middle, wrench icon) — description</Label>
                <Textarea id="ab-teamInstallDescEn" name="teamInstallDescEn" rows={2} defaultValue={d.teamInstallDescEn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamSupportTitleEn">Team card 3 · After-sales support (right, headset icon) — heading</Label>
                <Input id="ab-teamSupportTitleEn" name="teamSupportTitleEn" defaultValue={d.teamSupportTitleEn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamSupportDescEn">Team card 3 · After-sales support (right, headset icon) — description</Label>
                <Textarea id="ab-teamSupportDescEn" name="teamSupportDescEn" rows={2} defaultValue={d.teamSupportDescEn} />
                <p className="text-xs text-muted-foreground">
                  Keep all three card descriptions a similar 1–2 lines.
                </p>
              </div>

              <h3 className="text-base font-bold text-foreground border-b border-border/70 pb-1.5">Stats labels</h3>
              <p className="text-xs text-muted-foreground">
                Four label fields — values come from the system automatically. Blank uses default copy.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="ab-statsProjectsLabelEn">Label · Projects</Label>
                <Input id="ab-statsProjectsLabelEn" name="statsProjectsLabelEn" defaultValue={d.statsProjectsLabelEn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-statsYearsLabelEn">Label · Years</Label>
                <Input id="ab-statsYearsLabelEn" name="statsYearsLabelEn" defaultValue={d.statsYearsLabelEn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-statsEngineersLabelEn">Label · Engineers</Label>
                <Input id="ab-statsEngineersLabelEn" name="statsEngineersLabelEn" defaultValue={d.statsEngineersLabelEn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-statsCustomersLabelEn">Label · Customers</Label>
                <Input id="ab-statsCustomersLabelEn" name="statsCustomersLabelEn" defaultValue={d.statsCustomersLabelEn} />
              </div>

              <h3 className="text-base font-bold text-foreground border-b border-border/70 pb-1.5">Testimonials</h3>
              <div className="space-y-1.5">
                <Label htmlFor="ab-testimonialsTitleEn">Testimonials heading</Label>
                <Input id="ab-testimonialsTitleEn" name="testimonialsTitleEn" defaultValue={d.testimonialsTitleEn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-testimonialsSubtitleEn">Testimonials subtitle</Label>
                <Textarea id="ab-testimonialsSubtitleEn" name="testimonialsSubtitleEn" rows={2} defaultValue={d.testimonialsSubtitleEn} />
              </div>
            </div>
          }
        />

        <div className="space-y-3 rounded-xl border border-border/70 bg-card p-4">
          <h3 className="font-semibold">ไอคอนการ์ด (Lucide)</h3>
          <p className="text-xs text-muted-foreground">
            เลือกไอคอนต่อช่อง — ค่าเริ่มต้นตรงกับหน้าเว็บปัจจุบัน ไม่เลือก = ใช้ค่าเริ่มต้น
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {ICON_SLOTS.map((slot) => (
              <IconSelect key={slot} slot={slot} value={d[slot]} />
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-border/70 bg-card p-4">
          <h3 className="font-semibold">การแสดงส่วนบนหน้าเว็บ</h3>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showCredentials} onChange={(e) => setShowCredentials(e.target.checked)} />
            แสดงจุดน่าเชื่อถือ
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showTeam} onChange={(e) => setShowTeam(e.target.checked)} />
            แสดงทีมงาน
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showStats} onChange={(e) => setShowStats(e.target.checked)} />
            แสดงตัวเลขสถิติ
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showTestimonials} onChange={(e) => setShowTestimonials(e.target.checked)} />
            แสดงรีวิว
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showGlobalCta} onChange={(e) => setShowGlobalCta(e.target.checked)} />
            แสดง CTA รวม
          </label>
        </div>

        <div className="space-y-3 rounded-xl border border-border/70 bg-card p-4">
          <h3 className="font-semibold">รีวิวแนะนำ (สูงสุด {ABOUT_FEATURED_MAX})</h3>
          <p className="text-xs text-muted-foreground">
            ว่างไว้ = หน้าเว็บยังแสดงรีวิวที่เผยแพร่ทั้งหมดแบบเดิม จนกว่าจะเลือกชุดแนะนำ
          </p>
          <ul className="space-y-2">
            {testimonials.map((item) => (
              <li key={item.id}>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={featuredIds.includes(item.id)}
                    onChange={() => toggleFeatured(item.id)}
                    disabled={!item.published && !featuredIds.includes(item.id)}
                  />
                  <span>
                    {item.label}
                    {!item.published && (
                      <span className="ml-2 text-xs text-accent-foreground">ยังไม่เผยแพร่</span>
                    )}
                  </span>
                </label>
              </li>
            ))}
            {testimonials.length === 0 && (
              <li className="text-sm text-muted-foreground">ยังไม่มีรีวิวในระบบ</li>
            )}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">เว้นภาษาอังกฤษว่างได้ — หน้า /en จะแสดงข้อความภาษาไทยแทน</p>
        <Button type="submit" id="ab-submit" className="w-full" disabled={isPending}>
          {isPending ? "กำลังบันทึก..." : "บันทึกเนื้อหาหน้าเกี่ยวกับเรา"}
        </Button>
      </form>
    </div>
  );
}

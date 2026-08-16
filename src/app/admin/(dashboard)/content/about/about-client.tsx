"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateAboutContent } from "@/actions/about-content";
import { BilingualTabs } from "@/components/admin/crud-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type AboutData = {
  titleTh: string; titleEn: string;
  introTh: string; introEn: string;
  credRegisteredTitleTh: string; credRegisteredTitleEn: string;
  credRegisteredDescTh: string; credRegisteredDescEn: string;
  credEngineerTitleTh: string; credEngineerTitleEn: string;
  credEngineerDescTh: string; credEngineerDescEn: string;
  credExperienceTitleTh: string; credExperienceTitleEn: string;
  credExperienceDescTh: string; credExperienceDescEn: string;
  teamTitleTh: string; teamTitleEn: string;
  teamDescTh: string; teamDescEn: string;
  teamDesignTitleTh: string; teamDesignTitleEn: string;
  teamDesignDescTh: string; teamDesignDescEn: string;
  teamInstallTitleTh: string; teamInstallTitleEn: string;
  teamInstallDescTh: string; teamInstallDescEn: string;
  teamSupportTitleTh: string; teamSupportTitleEn: string;
  teamSupportDescTh: string; teamSupportDescEn: string;
};

const EMPTY: AboutData = {
  titleTh: "", titleEn: "", introTh: "", introEn: "",
  credRegisteredTitleTh: "", credRegisteredTitleEn: "", credRegisteredDescTh: "", credRegisteredDescEn: "",
  credEngineerTitleTh: "", credEngineerTitleEn: "", credEngineerDescTh: "", credEngineerDescEn: "",
  credExperienceTitleTh: "", credExperienceTitleEn: "", credExperienceDescTh: "", credExperienceDescEn: "",
  teamTitleTh: "", teamTitleEn: "", teamDescTh: "", teamDescEn: "",
  teamDesignTitleTh: "", teamDesignTitleEn: "", teamDesignDescTh: "", teamDesignDescEn: "",
  teamInstallTitleTh: "", teamInstallTitleEn: "", teamInstallDescTh: "", teamInstallDescEn: "",
  teamSupportTitleTh: "", teamSupportTitleEn: "", teamSupportDescTh: "", teamSupportDescEn: "",
};

export function AboutClient({ data }: { data: AboutData | null }) {
  const [isPending, startTransition] = useTransition();
  const d = data ?? EMPTY;

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await updateAboutContent(formData);
      if (result.ok) {
        toast.success("บันทึกเนื้อหาหน้าเกี่ยวกับเราเรียบร้อย");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">เนื้อหาหน้าเกี่ยวกับเรา</h1>
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
              <h3 className="text-sm font-semibold text-muted-foreground">ส่วนหัวของหน้า</h3>
              <div className="space-y-1.5">
                <Label htmlFor="ab-titleTh">หัวข้อหลัก</Label>
                <Input id="ab-titleTh" name="titleTh" defaultValue={d.titleTh} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-introTh">ย่อหน้าเปิด</Label>
                <Textarea id="ab-introTh" name="introTh" rows={3} defaultValue={d.introTh} />
              </div>

              <h3 className="text-sm font-semibold text-muted-foreground">
                จุดที่ทำให้ลูกค้าเชื่อถือ (3 กล่อง)
              </h3>
              <p className="text-xs text-muted-foreground">
                ไอคอนของทั้ง 3 กล่องกำหนดไว้ในโค้ดตามลำดับ — สลับลำดับข้อความจะทำให้ไอคอนไม่ตรงความหมาย
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="ab-credRegisteredTitleTh">กล่อง 1 — หัวข้อ</Label>
                <Input id="ab-credRegisteredTitleTh" name="credRegisteredTitleTh" defaultValue={d.credRegisteredTitleTh} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-credRegisteredDescTh">กล่อง 1 — คำอธิบาย</Label>
                <Textarea id="ab-credRegisteredDescTh" name="credRegisteredDescTh" rows={2} defaultValue={d.credRegisteredDescTh} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-credEngineerTitleTh">กล่อง 2 — หัวข้อ</Label>
                <Input id="ab-credEngineerTitleTh" name="credEngineerTitleTh" defaultValue={d.credEngineerTitleTh} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-credEngineerDescTh">กล่อง 2 — คำอธิบาย</Label>
                <Textarea id="ab-credEngineerDescTh" name="credEngineerDescTh" rows={2} defaultValue={d.credEngineerDescTh} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-credExperienceTitleTh">กล่อง 3 — หัวข้อ</Label>
                <Input id="ab-credExperienceTitleTh" name="credExperienceTitleTh" defaultValue={d.credExperienceTitleTh} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-credExperienceDescTh">กล่อง 3 — คำอธิบาย</Label>
                <Textarea id="ab-credExperienceDescTh" name="credExperienceDescTh" rows={2} defaultValue={d.credExperienceDescTh} />
              </div>

              <h3 className="text-sm font-semibold text-muted-foreground">ทีมงาน</h3>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamTitleTh">หัวข้อส่วนทีมงาน</Label>
                <Input id="ab-teamTitleTh" name="teamTitleTh" defaultValue={d.teamTitleTh} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamDescTh">คำอธิบายส่วนทีมงาน</Label>
                <Textarea id="ab-teamDescTh" name="teamDescTh" rows={3} defaultValue={d.teamDescTh} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamDesignTitleTh">ทีมย่อย 1 — หัวข้อ</Label>
                <Input id="ab-teamDesignTitleTh" name="teamDesignTitleTh" defaultValue={d.teamDesignTitleTh} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamDesignDescTh">ทีมย่อย 1 — คำอธิบาย</Label>
                <Textarea id="ab-teamDesignDescTh" name="teamDesignDescTh" rows={2} defaultValue={d.teamDesignDescTh} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamInstallTitleTh">ทีมย่อย 2 — หัวข้อ</Label>
                <Input id="ab-teamInstallTitleTh" name="teamInstallTitleTh" defaultValue={d.teamInstallTitleTh} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamInstallDescTh">ทีมย่อย 2 — คำอธิบาย</Label>
                <Textarea id="ab-teamInstallDescTh" name="teamInstallDescTh" rows={2} defaultValue={d.teamInstallDescTh} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamSupportTitleTh">ทีมย่อย 3 — หัวข้อ</Label>
                <Input id="ab-teamSupportTitleTh" name="teamSupportTitleTh" defaultValue={d.teamSupportTitleTh} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamSupportDescTh">ทีมย่อย 3 — คำอธิบาย</Label>
                <Textarea id="ab-teamSupportDescTh" name="teamSupportDescTh" rows={2} defaultValue={d.teamSupportDescTh} />
              </div>
            </div>
          }
          en={
            <div className="space-y-5">
              <h3 className="text-sm font-semibold text-muted-foreground">Page header</h3>
              <div className="space-y-1.5">
                <Label htmlFor="ab-titleEn">Main heading</Label>
                <Input id="ab-titleEn" name="titleEn" defaultValue={d.titleEn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-introEn">Opening paragraph</Label>
                <Textarea id="ab-introEn" name="introEn" rows={3} defaultValue={d.introEn} />
              </div>

              <h3 className="text-sm font-semibold text-muted-foreground">
                Trust credentials (3 boxes)
              </h3>
              <p className="text-xs text-muted-foreground">
                Icons are fixed in code by position — swapping text order will mismatch icons.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="ab-credRegisteredTitleEn">Box 1 — heading</Label>
                <Input id="ab-credRegisteredTitleEn" name="credRegisteredTitleEn" defaultValue={d.credRegisteredTitleEn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-credRegisteredDescEn">Box 1 — description</Label>
                <Textarea id="ab-credRegisteredDescEn" name="credRegisteredDescEn" rows={2} defaultValue={d.credRegisteredDescEn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-credEngineerTitleEn">Box 2 — heading</Label>
                <Input id="ab-credEngineerTitleEn" name="credEngineerTitleEn" defaultValue={d.credEngineerTitleEn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-credEngineerDescEn">Box 2 — description</Label>
                <Textarea id="ab-credEngineerDescEn" name="credEngineerDescEn" rows={2} defaultValue={d.credEngineerDescEn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-credExperienceTitleEn">Box 3 — heading</Label>
                <Input id="ab-credExperienceTitleEn" name="credExperienceTitleEn" defaultValue={d.credExperienceTitleEn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-credExperienceDescEn">Box 3 — description</Label>
                <Textarea id="ab-credExperienceDescEn" name="credExperienceDescEn" rows={2} defaultValue={d.credExperienceDescEn} />
              </div>

              <h3 className="text-sm font-semibold text-muted-foreground">Team</h3>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamTitleEn">Team section heading</Label>
                <Input id="ab-teamTitleEn" name="teamTitleEn" defaultValue={d.teamTitleEn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamDescEn">Team section description</Label>
                <Textarea id="ab-teamDescEn" name="teamDescEn" rows={3} defaultValue={d.teamDescEn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamDesignTitleEn">Sub-team 1 — heading</Label>
                <Input id="ab-teamDesignTitleEn" name="teamDesignTitleEn" defaultValue={d.teamDesignTitleEn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamDesignDescEn">Sub-team 1 — description</Label>
                <Textarea id="ab-teamDesignDescEn" name="teamDesignDescEn" rows={2} defaultValue={d.teamDesignDescEn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamInstallTitleEn">Sub-team 2 — heading</Label>
                <Input id="ab-teamInstallTitleEn" name="teamInstallTitleEn" defaultValue={d.teamInstallTitleEn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamInstallDescEn">Sub-team 2 — description</Label>
                <Textarea id="ab-teamInstallDescEn" name="teamInstallDescEn" rows={2} defaultValue={d.teamInstallDescEn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamSupportTitleEn">Sub-team 3 — heading</Label>
                <Input id="ab-teamSupportTitleEn" name="teamSupportTitleEn" defaultValue={d.teamSupportTitleEn} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ab-teamSupportDescEn">Sub-team 3 — description</Label>
                <Textarea id="ab-teamSupportDescEn" name="teamSupportDescEn" rows={2} defaultValue={d.teamSupportDescEn} />
              </div>
            </div>
          }
        />
        <p className="text-xs text-muted-foreground">เว้นภาษาอังกฤษว่างได้ — หน้า /en จะแสดงข้อความภาษาไทยแทน</p>
        <Button type="submit" id="ab-submit" className="w-full" disabled={isPending}>
          {isPending ? "กำลังบันทึก..." : "บันทึกเนื้อหาหน้าเกี่ยวกับเรา"}
        </Button>
      </form>
    </div>
  );
}

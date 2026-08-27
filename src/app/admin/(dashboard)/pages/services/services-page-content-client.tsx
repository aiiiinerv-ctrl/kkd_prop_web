"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { updateServicesPageContent } from "@/actions/services-page-content";
import { BilingualTabs } from "@/components/admin/crud-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ServicesPageFormData = {
  version: number;
  titleTh: string;
  titleEn: string;
  subtitleTh: string;
  subtitleEn: string;
  systemsTitleTh: string;
  systemsTitleEn: string;
  maintenanceTitleTh: string;
  maintenanceTitleEn: string;
  showSystems: boolean;
  showMaintenance: boolean;
  showGlobalCta: boolean;
};

const empty: ServicesPageFormData = {
  version: 1,
  titleTh: "",
  titleEn: "",
  subtitleTh: "",
  subtitleEn: "",
  systemsTitleTh: "",
  systemsTitleEn: "",
  maintenanceTitleTh: "",
  maintenanceTitleEn: "",
  showSystems: true,
  showMaintenance: true,
  showGlobalCta: true,
};

export function ServicesPageContentClient({ data }: { data: ServicesPageFormData | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const d = data ?? empty;
  const [showSystems, setShowSystems] = useState(d.showSystems);
  const [showMaintenance, setShowMaintenance] = useState(d.showMaintenance);
  const [showGlobalCta, setShowGlobalCta] = useState(d.showGlobalCta);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("showSystems", showSystems ? "true" : "false");
    formData.set("showMaintenance", showMaintenance ? "true" : "false");
    formData.set("showGlobalCta", showGlobalCta ? "true" : "false");
    startTransition(async () => {
      const result = await updateServicesPageContent(formData);
      if ("ok" in result && result.ok) {
        toast.success("บันทึกเนื้อหาหน้าบริการแล้ว");
        router.refresh();
      } else if ("conflict" in result && result.conflict) {
        toast.error("มีคนแก้หน้านี้ก่อนคุณ — รีเฟรชแล้วลองใหม่");
        router.refresh();
      } else {
        toast.error("error" in result ? result.error : "บันทึกไม่สำเร็จ");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto max-w-3xl space-y-8">
      <input type="hidden" name="version" value={d.version} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">เนื้อหาหน้าบริการ</h2>
          <p className="text-sm text-muted-foreground">
            หัวข้อกลุ่มและสวิตช์แสดงผล — รายการบริการอยู่ด้านล่าง
          </p>
        </div>
        <a
          href="/th/services"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          เปิดหน้าจริง
          <ExternalLink className="size-3.5" />
        </a>
      </div>

      <div className="flex justify-end">
        <Button type="submit" id="svc-page-submit-top" disabled={pending}>
          {pending ? "กำลังบันทึก…" : "บันทึกเนื้อหาหน้า"}
        </Button>
      </div>

      <BilingualTabs
        th={
          <>
            <div className="space-y-1.5">
              <Label htmlFor="svc-titleTh">หัวข้อหลัก (TH)</Label>
              <Input id="svc-titleTh" name="svcTitleTh" defaultValue={d.titleTh} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svc-subtitleTh">คำโปรย (TH)</Label>
              <Textarea id="svc-subtitleTh" name="svcSubtitleTh" rows={3} defaultValue={d.subtitleTh} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svc-systemsTitleTh">หัวข้อกลุ่มระบบติดตั้ง (TH)</Label>
              <Input id="svc-systemsTitleTh" name="svcSystemsTitleTh" defaultValue={d.systemsTitleTh} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svc-maintenanceTitleTh">หัวข้อกลุ่มบำรุงรักษา (TH)</Label>
              <Input
                id="svc-maintenanceTitleTh"
                name="svcMaintenanceTitleTh"
                defaultValue={d.maintenanceTitleTh}
              />
            </div>
          </>
        }
        en={
          <>
            <div className="space-y-1.5">
              <Label htmlFor="svc-titleEn">หัวข้อหลัก (EN)</Label>
              <Input id="svc-titleEn" name="svcTitleEn" defaultValue={d.titleEn} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svc-subtitleEn">คำโปรย (EN)</Label>
              <Textarea id="svc-subtitleEn" name="svcSubtitleEn" rows={3} defaultValue={d.subtitleEn} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svc-systemsTitleEn">หัวข้อกลุ่มระบบติดตั้ง (EN)</Label>
              <Input id="svc-systemsTitleEn" name="svcSystemsTitleEn" defaultValue={d.systemsTitleEn} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svc-maintenanceTitleEn">หัวข้อกลุ่มบำรุงรักษา (EN)</Label>
              <Input
                id="svc-maintenanceTitleEn"
                name="svcMaintenanceTitleEn"
                defaultValue={d.maintenanceTitleEn}
              />
            </div>
          </>
        }
      />

      <fieldset className="space-y-3 rounded-lg border border-border p-4">
        <legend className="px-1 text-sm font-semibold">การแสดงผล</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showSystems}
            onChange={(e) => setShowSystems(e.target.checked)}
          />
          แสดงกลุ่มระบบติดตั้ง
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showMaintenance}
            onChange={(e) => setShowMaintenance(e.target.checked)}
          />
          แสดงกลุ่มบำรุงรักษา
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showGlobalCta}
            onChange={(e) => setShowGlobalCta(e.target.checked)}
          />
          แสดง CTA รวมด้านล่าง
        </label>
        <p className="text-xs text-muted-foreground">
          กลุ่มที่ไม่มีรายการเผยแพร่จะถูกซ่อนบนหน้าเว็บอัตโนมัติ แม้สวิตช์จะเปิดอยู่
        </p>
      </fieldset>

      <div className="flex justify-end">
        <Button type="submit" id="svc-page-submit" disabled={pending}>
          {pending ? "กำลังบันทึก…" : "บันทึกเนื้อหาหน้า"}
        </Button>
      </div>
    </form>
  );
}

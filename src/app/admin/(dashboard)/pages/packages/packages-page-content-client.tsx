"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { updatePackagesPageContent } from "@/actions/packages-page-content";
import { BilingualTabs } from "@/components/admin/crud-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type PackagesPageFormData = {
  version: number;
  titleTh: string;
  titleEn: string;
  subtitleTh: string;
  subtitleEn: string;
  emptyTh: string;
  emptyEn: string;
  seasonalTitleTh: string;
  seasonalTitleEn: string;
  seasonalSubtitleTh: string;
  seasonalSubtitleEn: string;
  paybackTitleTh: string;
  paybackTitleEn: string;
  paybackOnGridTh: string;
  paybackOnGridEn: string;
  paybackHybridTh: string;
  paybackHybridEn: string;
  paybackOffGridTh: string;
  paybackOffGridEn: string;
  showSeasonal: boolean;
  showPayback: boolean;
  showGlobalCta: boolean;
};

const empty: PackagesPageFormData = {
  version: 1,
  titleTh: "",
  titleEn: "",
  subtitleTh: "",
  subtitleEn: "",
  emptyTh: "",
  emptyEn: "",
  seasonalTitleTh: "",
  seasonalTitleEn: "",
  seasonalSubtitleTh: "",
  seasonalSubtitleEn: "",
  paybackTitleTh: "",
  paybackTitleEn: "",
  paybackOnGridTh: "",
  paybackOnGridEn: "",
  paybackHybridTh: "",
  paybackHybridEn: "",
  paybackOffGridTh: "",
  paybackOffGridEn: "",
  showSeasonal: true,
  showPayback: true,
  showGlobalCta: true,
};

export function PackagesPageContentClient({ data }: { data: PackagesPageFormData | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const d = data ?? empty;
  const [showSeasonal, setShowSeasonal] = useState(d.showSeasonal);
  const [showPayback, setShowPayback] = useState(d.showPayback);
  const [showGlobalCta, setShowGlobalCta] = useState(d.showGlobalCta);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("showSeasonal", showSeasonal ? "true" : "false");
    formData.set("showPayback", showPayback ? "true" : "false");
    formData.set("showGlobalCta", showGlobalCta ? "true" : "false");
    startTransition(async () => {
      const result = await updatePackagesPageContent(formData);
      if ("ok" in result && result.ok) {
        toast.success("บันทึกเนื้อหาหน้าแพ็กเกจแล้ว");
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
          <h2 className="text-lg font-semibold">เนื้อหาหน้าแพ็กเกจ</h2>
          <p className="text-sm text-muted-foreground">
            หัวข้อ / ว่าง / Seasonal / Payback — รายการแพ็กเกจอยู่ด้านล่าง
          </p>
        </div>
        <a
          href="/th/packages"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          เปิดหน้าจริง
          <ExternalLink className="size-3.5" />
        </a>
      </div>

      <div className="flex justify-end">
        <Button type="submit" id="pkg-page-submit-top" disabled={pending}>
          {pending ? "กำลังบันทึก…" : "บันทึกเนื้อหาหน้า"}
        </Button>
      </div>

      <BilingualTabs
        th={
          <>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-titleTh">หัวข้อหลัก (TH)</Label>
              <Input id="pkg-titleTh" name="pkgTitleTh" defaultValue={d.titleTh} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-subtitleTh">คำโปรย (TH)</Label>
              <Textarea id="pkg-subtitleTh" name="pkgSubtitleTh" rows={3} defaultValue={d.subtitleTh} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-emptyTh">ข้อความเมื่อไม่มีแพ็กเกจ (TH)</Label>
              <Textarea id="pkg-emptyTh" name="pkgEmptyTh" rows={2} defaultValue={d.emptyTh} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-seasonalTitleTh">หัวข้อ Seasonal (TH)</Label>
              <Input id="pkg-seasonalTitleTh" name="pkgSeasonalTitleTh" defaultValue={d.seasonalTitleTh} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-seasonalSubtitleTh">คำโปรย Seasonal (TH) — ใช้ {"{size}"} ได้</Label>
              <Textarea
                id="pkg-seasonalSubtitleTh"
                name="pkgSeasonalSubtitleTh"
                rows={2}
                defaultValue={d.seasonalSubtitleTh}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-paybackTitleTh">หัวข้อคืนทุน (TH)</Label>
              <Input id="pkg-paybackTitleTh" name="pkgPaybackTitleTh" defaultValue={d.paybackTitleTh} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-paybackOnGridTh">On-Grid (TH)</Label>
              <Input id="pkg-paybackOnGridTh" name="pkgPaybackOnGridTh" defaultValue={d.paybackOnGridTh} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-paybackHybridTh">Hybrid (TH)</Label>
              <Input id="pkg-paybackHybridTh" name="pkgPaybackHybridTh" defaultValue={d.paybackHybridTh} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-paybackOffGridTh">Off-Grid (TH)</Label>
              <Input id="pkg-paybackOffGridTh" name="pkgPaybackOffGridTh" defaultValue={d.paybackOffGridTh} />
            </div>
          </>
        }
        en={
          <>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-titleEn">หัวข้อหลัก (EN)</Label>
              <Input id="pkg-titleEn" name="pkgTitleEn" defaultValue={d.titleEn} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-subtitleEn">คำโปรย (EN)</Label>
              <Textarea id="pkg-subtitleEn" name="pkgSubtitleEn" rows={3} defaultValue={d.subtitleEn} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-emptyEn">ข้อความเมื่อไม่มีแพ็กเกจ (EN)</Label>
              <Textarea id="pkg-emptyEn" name="pkgEmptyEn" rows={2} defaultValue={d.emptyEn} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-seasonalTitleEn">หัวข้อ Seasonal (EN)</Label>
              <Input id="pkg-seasonalTitleEn" name="pkgSeasonalTitleEn" defaultValue={d.seasonalTitleEn} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-seasonalSubtitleEn">คำโปรย Seasonal (EN) — ใช้ {"{size}"} ได้</Label>
              <Textarea
                id="pkg-seasonalSubtitleEn"
                name="pkgSeasonalSubtitleEn"
                rows={2}
                defaultValue={d.seasonalSubtitleEn}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-paybackTitleEn">หัวข้อคืนทุน (EN)</Label>
              <Input id="pkg-paybackTitleEn" name="pkgPaybackTitleEn" defaultValue={d.paybackTitleEn} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-paybackOnGridEn">On-Grid (EN)</Label>
              <Input id="pkg-paybackOnGridEn" name="pkgPaybackOnGridEn" defaultValue={d.paybackOnGridEn} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-paybackHybridEn">Hybrid (EN)</Label>
              <Input id="pkg-paybackHybridEn" name="pkgPaybackHybridEn" defaultValue={d.paybackHybridEn} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-paybackOffGridEn">Off-Grid (EN)</Label>
              <Input id="pkg-paybackOffGridEn" name="pkgPaybackOffGridEn" defaultValue={d.paybackOffGridEn} />
            </div>
          </>
        }
      />

      <fieldset className="space-y-3 rounded-lg border border-border p-4">
        <legend className="px-1 text-sm font-semibold">การแสดงผล</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showSeasonal} onChange={(e) => setShowSeasonal(e.target.checked)} />
          แสดงตาราง Seasonal
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showPayback} onChange={(e) => setShowPayback(e.target.checked)} />
          แสดงระยะคืนทุน
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showGlobalCta} onChange={(e) => setShowGlobalCta(e.target.checked)} />
          แสดง CTA รวมด้านล่าง
        </label>
      </fieldset>

      <div className="flex justify-end">
        <Button type="submit" id="pkg-page-submit" disabled={pending}>
          {pending ? "กำลังบันทึก…" : "บันทึกเนื้อหาหน้า"}
        </Button>
      </div>
    </form>
  );
}

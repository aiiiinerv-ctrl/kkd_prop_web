"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { updateCalculatorPageContent } from "@/actions/calculator-page-content";
import { BilingualTabs } from "@/components/admin/crud-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type CalculatorPageFormData = {
  version: number;
  eyebrowTh: string;
  eyebrowEn: string;
  titleTh: string;
  titleEn: string;
  subtitleTh: string;
  subtitleEn: string;
  panelTitleTh: string;
  panelTitleEn: string;
  panelIntroTh: string;
  panelIntroEn: string;
  packagesEyebrowTh: string;
  packagesEyebrowEn: string;
  packagesTitleTh: string;
  packagesTitleEn: string;
  packagesSubtitleTh: string;
  packagesSubtitleEn: string;
  showPackages: boolean;
};

const empty: CalculatorPageFormData = {
  version: 1,
  eyebrowTh: "",
  eyebrowEn: "",
  titleTh: "",
  titleEn: "",
  subtitleTh: "",
  subtitleEn: "",
  panelTitleTh: "",
  panelTitleEn: "",
  panelIntroTh: "",
  panelIntroEn: "",
  packagesEyebrowTh: "",
  packagesEyebrowEn: "",
  packagesTitleTh: "",
  packagesTitleEn: "",
  packagesSubtitleTh: "",
  packagesSubtitleEn: "",
  showPackages: true,
};

export function CalculatorPageContentClient({ data }: { data: CalculatorPageFormData | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const d = data ?? empty;
  const [showPackages, setShowPackages] = useState(d.showPackages);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("showPackages", showPackages ? "true" : "false");
    startTransition(async () => {
      const result = await updateCalculatorPageContent(formData);
      if ("ok" in result && result.ok) {
        toast.success("บันทึกเนื้อหาหน้าเครื่องคำนวณแล้ว");
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
          <h2 className="text-lg font-semibold">เนื้อหาหน้าเครื่องคำนวณ</h2>
          <p className="text-sm text-muted-foreground">
            Hero / แผงคำนวณ / ส่วนแพ็กเกจ — สูตรและตัวเลขยังอยู่ในโค้ด
          </p>
        </div>
        <a
          href="/th/calculator"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          เปิดหน้าจริง
          <ExternalLink className="size-3.5" />
        </a>
      </div>

      <div className="flex justify-end">
        <Button type="submit" id="calc-page-submit-top" disabled={pending}>
          {pending ? "กำลังบันทึก…" : "บันทึกเนื้อหาหน้า"}
        </Button>
      </div>

      <BilingualTabs
        th={
          <>
            <div className="space-y-1.5">
              <Label htmlFor="calc-eyebrowTh">Eyebrow (TH)</Label>
              <Input id="calc-eyebrowTh" name="calcEyebrowTh" defaultValue={d.eyebrowTh} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="calc-titleTh">หัวข้อหลัก (TH)</Label>
              <Input id="calc-titleTh" name="calcTitleTh" defaultValue={d.titleTh} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="calc-subtitleTh">คำโปรย (TH)</Label>
              <Textarea id="calc-subtitleTh" name="calcSubtitleTh" rows={3} defaultValue={d.subtitleTh} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="calc-panelTitleTh">หัวข้อแผงคำนวณ (TH)</Label>
              <Input id="calc-panelTitleTh" name="calcPanelTitleTh" defaultValue={d.panelTitleTh} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="calc-panelIntroTh">คำนำแผงคำนวณ (TH)</Label>
              <Textarea id="calc-panelIntroTh" name="calcPanelIntroTh" rows={2} defaultValue={d.panelIntroTh} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="calc-packagesEyebrowTh">Eyebrow แพ็กเกจ (TH)</Label>
              <Input
                id="calc-packagesEyebrowTh"
                name="calcPackagesEyebrowTh"
                defaultValue={d.packagesEyebrowTh}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="calc-packagesTitleTh">หัวข้อแพ็กเกจ (TH)</Label>
              <Input id="calc-packagesTitleTh" name="calcPackagesTitleTh" defaultValue={d.packagesTitleTh} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="calc-packagesSubtitleTh">คำโปรยแพ็กเกจ (TH)</Label>
              <Textarea
                id="calc-packagesSubtitleTh"
                name="calcPackagesSubtitleTh"
                rows={2}
                defaultValue={d.packagesSubtitleTh}
              />
            </div>
          </>
        }
        en={
          <>
            <div className="space-y-1.5">
              <Label htmlFor="calc-eyebrowEn">Eyebrow (EN)</Label>
              <Input id="calc-eyebrowEn" name="calcEyebrowEn" defaultValue={d.eyebrowEn} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="calc-titleEn">หัวข้อหลัก (EN)</Label>
              <Input id="calc-titleEn" name="calcTitleEn" defaultValue={d.titleEn} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="calc-subtitleEn">คำโปรย (EN)</Label>
              <Textarea id="calc-subtitleEn" name="calcSubtitleEn" rows={3} defaultValue={d.subtitleEn} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="calc-panelTitleEn">หัวข้อแผงคำนวณ (EN)</Label>
              <Input id="calc-panelTitleEn" name="calcPanelTitleEn" defaultValue={d.panelTitleEn} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="calc-panelIntroEn">คำนำแผงคำนวณ (EN)</Label>
              <Textarea id="calc-panelIntroEn" name="calcPanelIntroEn" rows={2} defaultValue={d.panelIntroEn} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="calc-packagesEyebrowEn">Eyebrow แพ็กเกจ (EN)</Label>
              <Input
                id="calc-packagesEyebrowEn"
                name="calcPackagesEyebrowEn"
                defaultValue={d.packagesEyebrowEn}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="calc-packagesTitleEn">หัวข้อแพ็กเกจ (EN)</Label>
              <Input id="calc-packagesTitleEn" name="calcPackagesTitleEn" defaultValue={d.packagesTitleEn} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="calc-packagesSubtitleEn">คำโปรยแพ็กเกจ (EN)</Label>
              <Textarea
                id="calc-packagesSubtitleEn"
                name="calcPackagesSubtitleEn"
                rows={2}
                defaultValue={d.packagesSubtitleEn}
              />
            </div>
          </>
        }
      />

      <fieldset className="space-y-3 rounded-lg border border-border p-4">
        <legend className="px-1 text-sm font-semibold">การแสดงผล</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showPackages} onChange={(e) => setShowPackages(e.target.checked)} />
          แสดงส่วนแพ็กเกจ (ซ่อนอัตโนมัติเมื่อไม่มีแพ็กเกจที่เผยแพร่)
        </label>
      </fieldset>

      <div className="flex justify-end">
        <Button type="submit" id="calc-page-submit" disabled={pending}>
          {pending ? "กำลังบันทึก…" : "บันทึกเนื้อหาหน้า"}
        </Button>
      </div>
    </form>
  );
}

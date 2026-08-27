"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { updatePortfolioPageContent } from "@/actions/portfolio-page-content";
import { BilingualTabs } from "@/components/admin/crud-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type PortfolioPageFormData = {
  version: number;
  titleTh: string;
  titleEn: string;
  subtitleTh: string;
  subtitleEn: string;
  imageDisclaimerTh: string;
  imageDisclaimerEn: string;
  emptyTh: string;
  emptyEn: string;
  showGlobalCta: boolean;
};

const empty: PortfolioPageFormData = {
  version: 1,
  titleTh: "",
  titleEn: "",
  subtitleTh: "",
  subtitleEn: "",
  imageDisclaimerTh: "",
  imageDisclaimerEn: "",
  emptyTh: "",
  emptyEn: "",
  showGlobalCta: true,
};

export function PortfolioPageContentClient({ data }: { data: PortfolioPageFormData | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const d = data ?? empty;
  const [showGlobalCta, setShowGlobalCta] = useState(d.showGlobalCta);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("showGlobalCta", showGlobalCta ? "true" : "false");
    startTransition(async () => {
      const result = await updatePortfolioPageContent(formData);
      if ("ok" in result && result.ok) {
        toast.success("บันทึกเนื้อหาหน้าผลงานแล้ว");
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
          <h2 className="text-lg font-semibold">เนื้อหาหน้าผลงาน</h2>
          <p className="text-sm text-muted-foreground">
            หัวข้อ / คำโปรย / คำชี้แจงรูป / ว่าง — รายการผลงานอยู่ด้านล่าง
          </p>
        </div>
        <a
          href="/th/portfolio"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          เปิดหน้าจริง
          <ExternalLink className="size-3.5" />
        </a>
      </div>

      <div className="flex justify-end">
        <Button type="submit" id="pf-page-submit-top" disabled={pending}>
          {pending ? "กำลังบันทึก…" : "บันทึกเนื้อหาหน้า"}
        </Button>
      </div>

      <BilingualTabs
        th={
          <>
            <div className="space-y-1.5">
              <Label htmlFor="pf-titleTh">หัวข้อหลัก (TH)</Label>
              <Input id="pf-titleTh" name="pfTitleTh" defaultValue={d.titleTh} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-subtitleTh">คำโปรย (TH)</Label>
              <Textarea id="pf-subtitleTh" name="pfSubtitleTh" rows={3} defaultValue={d.subtitleTh} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-disclaimerTh">คำชี้แจงรูป (TH)</Label>
              <Textarea
                id="pf-disclaimerTh"
                name="pfImageDisclaimerTh"
                rows={2}
                defaultValue={d.imageDisclaimerTh}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-emptyTh">ข้อความเมื่อไม่มีผลงาน (TH)</Label>
              <Textarea id="pf-emptyTh" name="pfEmptyTh" rows={2} defaultValue={d.emptyTh} />
            </div>
          </>
        }
        en={
          <>
            <div className="space-y-1.5">
              <Label htmlFor="pf-titleEn">หัวข้อหลัก (EN)</Label>
              <Input id="pf-titleEn" name="pfTitleEn" defaultValue={d.titleEn} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-subtitleEn">คำโปรย (EN)</Label>
              <Textarea id="pf-subtitleEn" name="pfSubtitleEn" rows={3} defaultValue={d.subtitleEn} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-disclaimerEn">คำชี้แจงรูป (EN)</Label>
              <Textarea
                id="pf-disclaimerEn"
                name="pfImageDisclaimerEn"
                rows={2}
                defaultValue={d.imageDisclaimerEn}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-emptyEn">ข้อความเมื่อไม่มีผลงาน (EN)</Label>
              <Textarea id="pf-emptyEn" name="pfEmptyEn" rows={2} defaultValue={d.emptyEn} />
            </div>
          </>
        }
      />

      <fieldset className="space-y-3 rounded-lg border border-border p-4">
        <legend className="px-1 text-sm font-semibold">การแสดงผล</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showGlobalCta}
            onChange={(e) => setShowGlobalCta(e.target.checked)}
          />
          แสดง CTA รวมด้านล่าง
        </label>
      </fieldset>

      <div className="flex justify-end">
        <Button type="submit" id="pf-page-submit" disabled={pending}>
          {pending ? "กำลังบันทึก…" : "บันทึกเนื้อหาหน้า"}
        </Button>
      </div>
    </form>
  );
}

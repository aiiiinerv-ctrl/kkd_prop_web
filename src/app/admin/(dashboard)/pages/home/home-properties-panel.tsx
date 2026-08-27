"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updatePageProperties } from "@/actions/pages/update-page-properties";
import { BilingualTabs } from "@/components/admin/crud-page";
import { PageWarningPanel } from "@/components/admin/pages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type PageSeoFormData = {
  version: number;
  titleTh: string;
  titleEn: string;
  descriptionTh: string;
  descriptionEn: string;
  ogTitleTh: string;
  ogTitleEn: string;
  ogDescriptionTh: string;
  ogDescriptionEn: string;
  canonicalPathTh: string;
  canonicalPathEn: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  ogImageUrl: string | null;
};

/** @deprecated use PageSeoFormData */
export type HomePageSeoData = PageSeoFormData;

export function PagePropertiesPanel({
  pageKey,
  pageSeo,
  title = "Properties",
}: {
  pageKey: "home" | "about" | "services" | "packages" | "portfolio";
  pageSeo: PageSeoFormData;
  title?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [robotsIndex, setRobotsIndex] = useState(pageSeo.robotsIndex);
  const [robotsFollow, setRobotsFollow] = useState(pageSeo.robotsFollow);
  const [ackHighRisk, setAckHighRisk] = useState(false);
  const [ogOp, setOgOp] = useState<"keep" | "replace" | "remove">("keep");

  const highRisk =
    (pageSeo.robotsIndex && !robotsIndex) || (pageSeo.robotsFollow && !robotsFollow);

  const handleSubmit = (formData: FormData) => {
    formData.set("pageKey", pageKey);
    formData.set("expectedVersion", String(pageSeo.version));
    formData.set("robotsIndex", robotsIndex ? "true" : "false");
    formData.set("robotsFollow", robotsFollow ? "true" : "false");
    formData.set("highRiskAcknowledged", ackHighRisk ? "true" : "false");
    formData.set("ogImageOperation", ogOp);

    startTransition(async () => {
      const result = await updatePageProperties(formData);
      if ("conflict" in result && result.conflict) {
        toast.error("มีคนแก้ไข SEO นี้ก่อนหน้า — รีเฟรชแล้วลองใหม่");
        router.refresh();
        return;
      }
      if (!result.ok) {
        if ("error" in result && result.error === "high_risk_ack_required") {
          toast.error("ต้องยืนยันความเสี่ยงก่อนปิด robots index/follow");
          return;
        }
        const message =
          "error" in result && typeof result.error === "string"
            ? result.error
            : "บันทึกไม่สำเร็จ";
        toast.error(message);
        return;
      }
      toast.success("บันทึก Properties หน้าแรกแล้ว");
      setAckHighRisk(false);
      setOgOp("keep");
      router.refresh();
    });
  };

  return (
    <form action={handleSubmit} className="space-y-6" noValidate encType="multipart/form-data">
      <p className="text-sm text-muted-foreground">
        {title} — SEO / Open Graph / robots (ไม่แก้ที่ตั้งค่าระบบ)
      </p>

      <BilingualTabs
        th={
          <div className="space-y-3">
            <div className="space-y-1.5">
                <Label htmlFor={`${pageKey}-prop-title-th`}>Title (TH)</Label>
              <Input
                id={`${pageKey}-prop-title-th`}
                name="titleTh"
                defaultValue={pageSeo.titleTh}
                maxLength={120}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${pageKey}-prop-desc-th`}>Description (TH)</Label>
              <Textarea
                id={`${pageKey}-prop-desc-th`}
                name="descriptionTh"
                defaultValue={pageSeo.descriptionTh}
                rows={3}
                maxLength={500}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${pageKey}-prop-og-title-th`}>OG Title (TH)</Label>
              <Input id={`${pageKey}-prop-og-title-th`} name="ogTitleTh" defaultValue={pageSeo.ogTitleTh} maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${pageKey}-prop-og-desc-th`}>OG Description (TH)</Label>
              <Textarea id={`${pageKey}-prop-og-desc-th`} name="ogDescriptionTh" defaultValue={pageSeo.ogDescriptionTh} rows={2} maxLength={500} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${pageKey}-prop-canon-th`}>Canonical path (TH)</Label>
              <Input id={`${pageKey}-prop-canon-th`} name="canonicalPathTh" defaultValue={pageSeo.canonicalPathTh} placeholder="/th" />
            </div>
          </div>
        }
        en={
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${pageKey}-prop-title-en`}>Title (EN)</Label>
              <Input id={`${pageKey}-prop-title-en`} name="titleEn" defaultValue={pageSeo.titleEn} maxLength={120} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${pageKey}-prop-desc-en`}>Description (EN)</Label>
              <Textarea id={`${pageKey}-prop-desc-en`} name="descriptionEn" defaultValue={pageSeo.descriptionEn} rows={3} maxLength={500} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${pageKey}-prop-og-title-en`}>OG Title (EN)</Label>
              <Input id={`${pageKey}-prop-og-title-en`} name="ogTitleEn" defaultValue={pageSeo.ogTitleEn} maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${pageKey}-prop-og-desc-en`}>OG Description (EN)</Label>
              <Textarea id={`${pageKey}-prop-og-desc-en`} name="ogDescriptionEn" defaultValue={pageSeo.ogDescriptionEn} rows={2} maxLength={500} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${pageKey}-prop-canon-en`}>Canonical path (EN)</Label>
              <Input id={`${pageKey}-prop-canon-en`} name="canonicalPathEn" defaultValue={pageSeo.canonicalPathEn} placeholder="/en" />
            </div>
          </div>
        }
      />

      <div className="space-y-3 rounded-xl border border-border/70 bg-card p-6">
        <h2 className="font-semibold">Robots</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={robotsIndex} onChange={(e) => setRobotsIndex(e.target.checked)} />
          index
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={robotsFollow} onChange={(e) => setRobotsFollow(e.target.checked)} />
          follow
        </label>
        {highRisk && (
          <>
            <PageWarningPanel>
              การปิด index หรือ follow เป็นการเปลี่ยนแปลงที่มีความเสี่ยงสูง
            </PageWarningPanel>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={ackHighRisk}
                onChange={(e) => setAckHighRisk(e.target.checked)}
              />
              ยืนยันว่าต้องการปิด robots ตามที่เลือก
            </label>
          </>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-border/70 bg-card p-6">
        <h2 className="font-semibold">รูป Open Graph</h2>
        {pageSeo.ogImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pageSeo.ogImageUrl} alt="OG preview" className="max-h-40 rounded-md border object-cover" />
        ) : (
          <p className="text-sm text-muted-foreground">ยังไม่มีรูป OG</p>
        )}
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="ogOpUi" checked={ogOp === "keep"} onChange={() => setOgOp("keep")} />
            คงเดิม
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="ogOpUi" checked={ogOp === "replace"} onChange={() => setOgOp("replace")} />
            แทนที่
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="ogOpUi" checked={ogOp === "remove"} onChange={() => setOgOp("remove")} />
            ลบ
          </label>
        </div>
        {ogOp === "replace" && (
          <Input id="home-prop-og-file" name="ogImage" type="file" accept="image/jpeg,image/png,image/webp" />
        )}
      </div>

      <Button type="submit" disabled={isPending || (highRisk && !ackHighRisk)}>
        {isPending ? "กำลังบันทึก..." : "บันทึก Properties"}
      </Button>
    </form>
  );
}

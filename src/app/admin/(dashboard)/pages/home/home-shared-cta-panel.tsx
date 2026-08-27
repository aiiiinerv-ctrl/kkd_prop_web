"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { updateSharedCta } from "@/actions/pages/update-shared-cta";
import { BilingualTabs } from "@/components/admin/crud-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type SharedCtaData = {
  ctaVersion: number;
  ctaTitleTh: string;
  ctaTitleEn: string;
  ctaSubtitleTh: string;
  ctaSubtitleEn: string;
  ctaPrimaryLabelTh: string;
  ctaPrimaryLabelEn: string;
  ctaSecondaryLabelTh: string;
  ctaSecondaryLabelEn: string;
};

export function HomeSharedCtaPanel({ cta }: { cta: SharedCtaData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    formData.set("expectedVersion", String(cta.ctaVersion));
    startTransition(async () => {
      const result = await updateSharedCta(formData);
      if ("conflict" in result && result.conflict) {
        toast.error("มีคนแก้ไข CTA ก่อนหน้า — รีเฟรชแล้วลองใหม่");
        router.refresh();
        return;
      }
      if (!result.ok) {
        toast.error("error" in result ? result.error : "บันทึกไม่สำเร็จ");
        return;
      }
      toast.success("บันทึก CTA รวมแล้ว");
      router.refresh();
    });
  };

  return (
    <form action={handleSubmit} className="space-y-6" noValidate>
      <p className="text-sm text-muted-foreground">
        แบนเนอร์ CTA ที่ใช้ร่วมหลายหน้า — ปลายทางยังเป็นลิงก์จองในโค้ด (ไม่รับ URL อิสระ)
      </p>
      <BilingualTabs
        th={
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="shared-cta-title-th">หัวข้อ</Label>
              <Input id="shared-cta-title-th" name="ctaTitleTh" defaultValue={cta.ctaTitleTh} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shared-cta-sub-th">คำอธิบาย</Label>
              <Textarea id="shared-cta-sub-th" name="ctaSubtitleTh" defaultValue={cta.ctaSubtitleTh} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shared-cta-pri-th">ปุ่มหลัก</Label>
              <Input id="shared-cta-pri-th" name="ctaPrimaryLabelTh" defaultValue={cta.ctaPrimaryLabelTh} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shared-cta-sec-th">ปุ่มรอง</Label>
              <Input id="shared-cta-sec-th" name="ctaSecondaryLabelTh" defaultValue={cta.ctaSecondaryLabelTh} />
            </div>
          </div>
        }
        en={
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="shared-cta-title-en">Title</Label>
              <Input id="shared-cta-title-en" name="ctaTitleEn" defaultValue={cta.ctaTitleEn} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shared-cta-sub-en">Subtitle</Label>
              <Textarea id="shared-cta-sub-en" name="ctaSubtitleEn" defaultValue={cta.ctaSubtitleEn} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shared-cta-pri-en">Primary label</Label>
              <Input id="shared-cta-pri-en" name="ctaPrimaryLabelEn" defaultValue={cta.ctaPrimaryLabelEn} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shared-cta-sec-en">Secondary label</Label>
              <Input id="shared-cta-sec-en" name="ctaSecondaryLabelEn" defaultValue={cta.ctaSecondaryLabelEn} />
            </div>
          </div>
        }
      />
      <Button type="submit" disabled={isPending}>
        {isPending ? "กำลังบันทึก..." : "บันทึก CTA รวม"}
      </Button>
    </form>
  );
}

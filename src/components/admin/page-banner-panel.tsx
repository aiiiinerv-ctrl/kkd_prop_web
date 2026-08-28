"use client";

import { AlertTriangle, ChevronDown, ChevronUp, Eye, EyeOff, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updatePageBanner } from "@/actions/page-banners";
import { BilingualTabs, DeleteConfirm } from "@/components/admin/crud-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BANNER_SLIDE_MAX,
  BANNER_SLIDE_MIN,
  type BannerMode,
  type BannerPageSlug,
  bannerPageLabel,
} from "@/lib/page-banners";
import type { PageBannerAdminData } from "@/lib/admin/page-banner-admin";

export type { PageBannerAdminData };

type SlideDraft = {
  key: string;
  altTh: string;
  altEn: string;
  linkPath: string;
  imageKey?: string;
  imageUrl: string | null;
  blobMissing: boolean;
  preview: string | null;
  file: File | null;
  isActive: boolean;
};

const MODE_OPTIONS: { value: BannerMode; label: string }[] = [
  { value: "OFF", label: "ปิด (ไม่แสดงแบนเนอร์)" },
  { value: "FIXED", label: "รูปเดียว (Fixed)" },
  { value: "SLIDES", label: "สไลด์ (2–5 รูป)" },
];

function emptySlide(): SlideDraft {
  return {
    key: crypto.randomUUID(),
    altTh: "",
    altEn: "",
    linkPath: "",
    imageUrl: null,
    blobMissing: false,
    preview: null,
    file: null,
    isActive: true,
  };
}

function toDrafts(data: PageBannerAdminData): SlideDraft[] {
  if (data.slides.length === 0) return [emptySlide()];
  return data.slides.map((s) => ({
    key: s.id,
    altTh: s.altTh,
    altEn: s.altEn,
    linkPath: s.linkPath,
    imageKey: s.imageKey,
    imageUrl: s.imageUrl,
    blobMissing: s.blobMissing,
    preview: null,
    file: null,
    isActive: s.isActive,
  }));
}

export function PageBannerPanel({
  pageSlug,
  data,
}: {
  pageSlug: BannerPageSlug;
  data: PageBannerAdminData;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<BannerMode>(data.mode);
  const [version] = useState(data.version);
  const [slides, setSlides] = useState<SlideDraft[]>(() => toDrafts(data));

  const syncSlideCount = (nextMode: BannerMode, current: SlideDraft[]) => {
    if (nextMode === "OFF") return [];
    if (nextMode === "FIXED") return current.slice(0, 1).length ? current.slice(0, 1) : [emptySlide()];
    if (current.length < 2) {
      const next = [...current];
      while (next.length < 2) next.push(emptySlide());
      return next.slice(0, BANNER_SLIDE_MAX);
    }
    return current.slice(0, BANNER_SLIDE_MAX);
  };

  const handleModeChange = (next: BannerMode) => {
    setMode(next);
    setSlides((prev) => syncSlideCount(next, prev));
  };

  const updateSlide = (index: number, patch: Partial<SlideDraft>) => {
    setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const handleFile = (index: number, file: File | null) => {
    if (!file) {
      updateSlide(index, { file: null, preview: null });
      return;
    }
    updateSlide(index, { file, preview: URL.createObjectURL(file) });
  };

  const addSlide = () => {
    if (slides.length >= BANNER_SLIDE_MAX) return;
    setSlides((prev) => [...prev, emptySlide()]);
  };

  const removeSlide = (index: number) => {
    setSlides((prev) => prev.filter((_, i) => i !== index));
  };

  const moveSlide = (index: number, direction: -1 | 1) => {
    setSlides((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  };

  const handleSubmit = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("pageSlug", pageSlug);
      formData.set("expectedVersion", String(version));
      formData.set("mode", mode);

      const payload = slides.map((s) => ({
        altTh: s.altTh,
        altEn: s.altEn,
        linkPath: s.linkPath,
        imageKey: s.imageKey,
        isActive: s.isActive,
      }));
      formData.set("slidesJson", JSON.stringify(payload));

      slides.forEach((s, i) => {
        if (s.file) formData.set(`slideImage_${i}`, s.file);
      });

      const result = await updatePageBanner(formData);
      if (result.ok) {
        toast.success(`บันทึกแบนเนอร์หน้า${bannerPageLabel(pageSlug)}เรียบร้อย`);
        router.refresh();
      } else if ("conflict" in result && result.conflict) {
        toast.error("มีการแก้ไขจากที่อื่น — กรุณารีเฟรชแล้วลองใหม่");
      } else {
        toast.error("error" in result ? result.error : "บันทึกไม่สำเร็จ");
      }
    });
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/70 bg-card p-6">
      <div>
        <h2 className="font-semibold">แบนเนอร์หน้า {bannerPageLabel(pageSlug)}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          แบนเนอร์กว้างเต็มจอด้านบนเนื้อหา — ใส่หรือปิดได้ · รูปเดียวหรือสไลด์ 2–5 รูป
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`banner-mode-${pageSlug}`}>รูปแบบแบนเนอร์</Label>
        <select
          id={`banner-mode-${pageSlug}`}
          value={mode}
          onChange={(e) => handleModeChange(e.target.value as BannerMode)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        >
          {MODE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {mode !== "OFF" && (
        <div className="space-y-6">
          {slides.map((slide, index) => (
            <div
              key={slide.key}
              className={`space-y-3 rounded-lg border p-4 ${
                slide.isActive ? "border-border/60" : "border-dashed border-border/60 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-medium">
                  {mode === "FIXED" ? "รูปแบนเนอร์" : `สไลด์ ${index + 1}`}
                  {!slide.isActive && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                      ซ่อนอยู่
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-1">
                  {mode === "SLIDES" && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="p-1.5"
                        aria-label="เลื่อนขึ้น"
                        disabled={index === 0}
                        onClick={() => moveSlide(index, -1)}
                      >
                        <ChevronUp className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="p-1.5"
                        aria-label="เลื่อนลง"
                        disabled={index === slides.length - 1}
                        onClick={() => moveSlide(index, 1)}
                      >
                        <ChevronDown className="size-4" />
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="p-1.5"
                    aria-label={slide.isActive ? "ซ่อนสไลด์นี้" : "แสดงสไลด์นี้"}
                    onClick={() => updateSlide(index, { isActive: !slide.isActive })}
                  >
                    {slide.isActive ? (
                      <Eye className="size-4" />
                    ) : (
                      <EyeOff className="size-4 text-muted-foreground" />
                    )}
                  </Button>
                  {mode === "SLIDES" && (
                    <DeleteConfirm
                      title="ลบสไลด์นี้?"
                      description="สไลด์นี้จะถูกลบออกจากฟอร์ม — มีผลจริงเมื่อกดบันทึกแบนเนอร์"
                      disabled={slides.length <= BANNER_SLIDE_MIN}
                      onConfirm={() => removeSlide(index)}
                    />
                  )}
                </div>
              </div>

              {!slide.isActive && (
                <p className="text-xs text-muted-foreground">
                  สไลด์นี้จะไม่แสดงบนหน้าเว็บจริงจนกว่าจะกดแสดงอีกครั้ง — ข้อมูลยังอยู่ครบ
                </p>
              )}

              {mode === "SLIDES" && slides.length <= BANNER_SLIDE_MIN && (
                <p className="text-xs text-muted-foreground">
                  สไลด์ต้องมีอย่างน้อย 2 รูป — ถ้าต้องการรูปเดียว เปลี่ยนรูปแบบเป็น &quot;รูปเดียว (Fixed)&quot;
                </p>
              )}

              {slide.blobMissing && !slide.preview && (
                <p className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  ไม่พบไฟล์รูปในระบบ — อัปโหลดใหม่
                </p>
              )}

              <div
                className="overflow-hidden rounded-lg border border-border/70 bg-muted/40"
                style={{ aspectRatio: "21/9", maxHeight: 180 }}
              >
                {slide.preview || slide.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={slide.preview ?? slide.imageUrl ?? undefined}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                    ยังไม่มีรูป
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`banner-file-${pageSlug}-${index}`}>รูปภาพ (JPEG/PNG/WebP ≤5MB)</Label>
                <Input
                  id={`banner-file-${pageSlug}-${index}`}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleFile(index, e.target.files?.[0] ?? null)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`banner-link-${pageSlug}-${index}`}>ลิงก์เมื่อคลิก (ไม่บังคับ)</Label>
                <Input
                  id={`banner-link-${pageSlug}-${index}`}
                  value={slide.linkPath}
                  onChange={(e) => updateSlide(index, { linkPath: e.target.value })}
                  placeholder="/packages หรือ https://..."
                />
                <p className="text-xs text-muted-foreground">
                  เว้นว่าง = ไม่มีลิงก์ · ใส่ path ภายในเว็บ (เช่น /packages) หรือ URL เต็ม (https://…)
                </p>
              </div>

              <BilingualTabs
                th={
                  <div className="space-y-1.5">
                    <Label htmlFor={`banner-alt-th-${pageSlug}-${index}`}>Alt text (ไทย)</Label>
                    <Input
                      id={`banner-alt-th-${pageSlug}-${index}`}
                      value={slide.altTh}
                      onChange={(e) => updateSlide(index, { altTh: e.target.value })}
                    />
                  </div>
                }
                en={
                  <div className="space-y-1.5">
                    <Label htmlFor={`banner-alt-en-${pageSlug}-${index}`}>Alt text (EN)</Label>
                    <Input
                      id={`banner-alt-en-${pageSlug}-${index}`}
                      value={slide.altEn}
                      onChange={(e) => updateSlide(index, { altEn: e.target.value })}
                    />
                  </div>
                }
              />
            </div>
          ))}

          {mode === "SLIDES" && slides.length < BANNER_SLIDE_MAX && (
            <Button type="button" variant="outline" size="sm" onClick={addSlide}>
              <Plus className="mr-1 size-4" />
              เพิ่มสไลด์
            </Button>
          )}
        </div>
      )}

      <Button type="button" disabled={isPending} onClick={handleSubmit}>
        {isPending ? "กำลังบันทึก..." : "บันทึกแบนเนอร์"}
      </Button>
    </div>
  );
}

"use client";

import { ArrowDown, ArrowUp, ExternalLink, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateSitemapSettings, previewSitemapTree } from "@/actions/sitemap-settings";
import { PageSitemap } from "@/components/site/page-sitemap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_NAV_LABELS } from "@/lib/sitemap/defaults";
import type { SitemapConfig, SitemapConfigSection, SitemapGroup } from "@/lib/sitemap/types";
import { SECTION_META } from "@/lib/sitemap/types";

const SECTION_LABELS_TH: Record<SitemapConfigSection["id"], string> = DEFAULT_NAV_LABELS.th;

type Props = {
  initialConfig: SitemapConfig;
  initialPreviewGroups: SitemapGroup[];
  canMutate: boolean;
};

function moveSection(sections: SitemapConfigSection[], index: number, direction: -1 | 1) {
  const next = sections.slice();
  const target = index + direction;
  if (target < 0 || target >= next.length) return sections;
  const tmp = next[index];
  next[index] = next[target];
  next[target] = tmp;
  return next.map((s, i) => ({ ...s, sortOrder: i }));
}

export function SitemapAdminClient({ initialConfig, initialPreviewGroups, canMutate }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sections, setSections] = useState(initialConfig.sections);
  const [previewGroups, setPreviewGroups] = useState<SitemapGroup[] | null>(initialPreviewGroups);
  const [previewLoading, setPreviewLoading] = useState(false);

  async function refreshPreview() {
    setPreviewLoading(true);
    try {
      const result = await previewSitemapTree(
        JSON.stringify({
          version: 1,
          sections: sections.map((s, i) => ({ ...s, sortOrder: i })),
        })
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setPreviewGroups(result.groups);
    } finally {
      setPreviewLoading(false);
    }
  }

  function handleSave() {
    if (!canMutate) return;
    const formData = new FormData();
    formData.set(
      "configJson",
      JSON.stringify({
        version: 1,
        sections: sections.map((s, i) => ({ ...s, sortOrder: i })),
      })
    );
    startTransition(async () => {
      const result = await updateSitemapSettings(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("บันทึกแผนผังเว็บไซต์แล้ว");
      router.refresh();
      await refreshPreview();
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">แผนผังเว็บไซต์</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            จัดการหมวดที่แสดงบนหน้าแผนผังเว็บไซต์สาธารณะ และ override ชื่อ TH/EN ได้
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void refreshPreview()} disabled={previewLoading}>
            {previewLoading ? "กำลังโหลด..." : "อัปเดตตัวอย่าง"}
          </Button>
          <Link
            href="/th/sitemap"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            <ExternalLink className="size-4" />
            เปิดหน้าเว็บ
          </Link>
          {canMutate && (
            <Button type="button" onClick={handleSave} disabled={isPending}>
              <Save className="size-4" />
              {isPending ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold">หมวดหมู่</h2>
          {!canMutate && (
            <p className="mb-4 text-xs text-muted-foreground">
              บทบาทของคุณดูตัวอย่างได้อย่างเดียว — แก้ไขได้เฉพาะ ADMIN / MARKETING
            </p>
          )}
          <ul className="space-y-4">
            {sections.map((section, index) => (
              <li key={section.id} className="rounded-lg border border-border/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={section.enabled}
                      disabled={!canMutate}
                      onChange={(e) =>
                        setSections((prev) =>
                          prev.map((s) =>
                            s.id === section.id ? { ...s, enabled: e.target.checked } : s
                          )
                        )
                      }
                      aria-label={`แสดง ${SECTION_LABELS_TH[section.id]}`}
                    />
                    <div>
                      <div className="font-medium">{SECTION_LABELS_TH[section.id]}</div>
                      <div className="text-xs text-muted-foreground">{SECTION_META[section.id].path}</div>
                    </div>
                  </div>
                  {canMutate && (
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        disabled={index === 0}
                        onClick={() => setSections((prev) => moveSection(prev, index, -1))}
                        aria-label="เลื่อนขึ้น"
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        disabled={index === sections.length - 1}
                        onClick={() => setSections((prev) => moveSection(prev, index, 1))}
                        aria-label="เลื่อนลง"
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor={`labelTh-${section.id}`} className="text-xs">
                      ชื่อไทย (override)
                    </Label>
                    <Input
                      id={`labelTh-${section.id}`}
                      value={section.labelTh ?? ""}
                      disabled={!canMutate}
                      placeholder={DEFAULT_NAV_LABELS.th[section.id]}
                      onChange={(e) =>
                        setSections((prev) =>
                          prev.map((s) =>
                            s.id === section.id ? { ...s, labelTh: e.target.value } : s
                          )
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor={`labelEn-${section.id}`} className="text-xs">
                      ชื่อ EN (override)
                    </Label>
                    <Input
                      id={`labelEn-${section.id}`}
                      value={section.labelEn ?? ""}
                      disabled={!canMutate}
                      placeholder={DEFAULT_NAV_LABELS.en[section.id]}
                      onChange={(e) =>
                        setSections((prev) =>
                          prev.map((s) =>
                            s.id === section.id ? { ...s, labelEn: e.target.value } : s
                          )
                        )
                      }
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-5">
          <h2 className="mb-4 text-sm font-semibold">ตัวอย่าง (ภาษาไทย)</h2>
          {previewGroups ? (
            <PageSitemap groups={previewGroups} />
          ) : (
            <p className="text-sm text-muted-foreground">
              กด「อัปเดตตัวอย่าง」เพื่อดูแผนผังตามการตั้งค่าปัจจุบัน
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

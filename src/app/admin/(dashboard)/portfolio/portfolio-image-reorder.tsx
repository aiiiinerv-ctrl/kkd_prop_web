"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/** Reorder existing project images; first key becomes cover. */
export function PortfolioImageReorder({ initialKeys }: { initialKeys: string[] }) {
  const [keys, setKeys] = useState(initialKeys);

  function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= keys.length) return;
    setKeys((prev) => {
      const copy = [...prev];
      const tmp = copy[index]!;
      copy[index] = copy[next]!;
      copy[next] = tmp;
      return copy;
    });
  }

  if (keys.length === 0) return null;

  return (
    <div className="space-y-2">
      <Label>ลำดับรูป (รูปแรก = ปก) — ไม่ต้องอัปโหลดใหม่</Label>
      <input type="hidden" name="imageKeysOrderJson" value={JSON.stringify(keys)} />
      <ul className="space-y-2">
        {keys.map((key, i) => (
          <li key={key} className="flex items-center gap-3 rounded-lg border border-border p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/files/${key}`} alt="" className="h-12 w-16 rounded object-cover" />
            <span className="flex-1 truncate text-xs text-muted-foreground">{key}</span>
            <div className="flex gap-1">
              <Button type="button" variant="outline" size="sm" disabled={i === 0} onClick={() => move(i, -1)}>
                ↑
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={i === keys.length - 1}
                onClick={() => move(i, 1)}
              >
                ↓
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        ถ้าเลือกไฟล์ใหม่ในช่องอัปโหลด รูปชุดใหม่จะแทนที่ทั้งหมด (ลำดับด้านบนจะไม่ใช้)
      </p>
    </div>
  );
}

"use client";

import { AlertTriangle, ExternalLink, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateHomeContent } from "@/actions/home-content";
import { updateContactSettings } from "@/actions/site-settings";
import { BilingualTabs } from "@/components/admin/crud-page";
import { PageShell } from "@/components/admin/pages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HOME_FAQ_MAX } from "@/lib/validations/home-content";

type HomeContentData = {
  version: number;
  heroKickerTh: string; heroKickerEn: string;
  heroTitleWhiteTh: string; heroTitleWhiteEn: string;
  heroTitleGoldTh: string; heroTitleGoldEn: string;
  heroSubtitleTh: string; heroSubtitleEn: string;
  heroAltTh: string; heroAltEn: string;
  ctaPrimaryLabelTh: string; ctaPrimaryLabelEn: string;
  ctaSecondaryLabelTh: string; ctaSecondaryLabelEn: string;
  quickContactLabelTh: string; quickContactLabelEn: string;
  proofLabelTh: string; proofLabelEn: string;
  proofTitleTh: string; proofTitleEn: string;
  proofItem1Th: string; proofItem1En: string;
  proofItem2Th: string; proofItem2En: string;
  proofItem3Th: string; proofItem3En: string;
  feature1LabelTh: string; feature1LabelEn: string;
  feature2LabelTh: string; feature2LabelEn: string;
  feature3LabelTh: string; feature3LabelEn: string;
  feature4LabelTh: string; feature4LabelEn: string;
  showLatestWorks: boolean;
  latestWorksHeadingTh: string; latestWorksHeadingEn: string;
  metric1LabelTh: string; metric1LabelEn: string;
  metric1ValueTh: string; metric1ValueEn: string;
  metric2LabelTh: string; metric2LabelEn: string;
  metric2ValueTh: string; metric2ValueEn: string;
  metric3LabelTh: string; metric3LabelEn: string;
  metric3ValueTh: string; metric3ValueEn: string;
  viewAllLabelTh: string; viewAllLabelEn: string;
  showServicesCta: boolean;
  servicesCtaBadgeTh: string; servicesCtaBadgeEn: string;
  servicesCtaTitleTh: string; servicesCtaTitleEn: string;
  servicesCtaTextTh: string; servicesCtaTextEn: string;
  servicesCtaLinkLabelTh: string; servicesCtaLinkLabelEn: string;
  showFaq: boolean;
  faqBadgeTh: string; faqBadgeEn: string;
  faqTitleTh: string; faqTitleEn: string;
  faqIntroTh: string; faqIntroEn: string;
  faqLineButtonLabelTh: string; faqLineButtonLabelEn: string;
  faqItems: FaqItem[];
};

type FaqItem = {
  id?: string;
  questionTh: string;
  questionEn: string;
  answerTh: string;
  answerEn: string;
};

type ContactData = {
  phone: string;
  lineUrl: string;
  facebookUrl: string;
  email: string;
  addressTh: string; addressEn: string;
  hoursTh: string; hoursEn: string;
  mapQuery: string;
  instagramUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  contactTitleTh: string; contactTitleEn: string;
  contactSubtitleTh: string; contactSubtitleEn: string;
};

function emptyFaqItem(): FaqItem {
  return { questionTh: "", questionEn: "", answerTh: "", answerEn: "" };
}

function FaqEditor({
  items,
  onChange,
  showFaq,
}: {
  items: FaqItem[];
  onChange: (items: FaqItem[]) => void;
  showFaq: boolean;
}) {
  const update = (index: number, patch: Partial<FaqItem>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));
  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  const add = () => onChange([...items, emptyFaqItem()]);

  return (
    <div className="space-y-3">
      {showFaq && items.length === 0 && (
        <p className="rounded-md border border-accent bg-accent/60 px-3 py-2 text-xs text-accent-foreground">
          เมื่อเปิดแสดงส่วนนี้ ต้องมีคำถามอย่างน้อย 1 ข้อ
        </p>
      )}
      {items.map((item, index) => (
        <div key={item.id ?? `new-${index}`} className="space-y-3 rounded-lg border border-border/70 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">ข้อ {index + 1}</span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                className="p-1.5"
                aria-label="เลื่อนขึ้น"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ChevronUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="p-1.5"
                aria-label="เลื่อนลง"
                disabled={index === items.length - 1}
                onClick={() => move(index, 1)}
              >
                <ChevronDown className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="p-1.5"
                aria-label="ลบ"
                onClick={() => remove(index)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>คำถาม (ไทย)</Label>
              <Input
                value={item.questionTh}
                onChange={(e) => update(index, { questionTh: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Question (EN)</Label>
              <Input
                value={item.questionEn}
                onChange={(e) => update(index, { questionEn: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>คำตอบ (ไทย)</Label>
              <Textarea
                rows={2}
                value={item.answerTh}
                onChange={(e) => update(index, { answerTh: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Answer (EN)</Label>
              <Textarea
                rows={2}
                value={item.answerEn}
                onChange={(e) => update(index, { answerEn: e.target.value })}
              />
            </div>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" disabled={items.length >= HOME_FAQ_MAX} onClick={add}>
        <Plus className="size-4" /> เพิ่มคำถาม {items.length >= HOME_FAQ_MAX && `(สูงสุด ${HOME_FAQ_MAX} ข้อ)`}
      </Button>
    </div>
  );
}

const HERO_MAX_MB = 5;

/**
 * Hero image is not locale-specific (one blob for both `/th` and `/en`), so
 * it lives outside the bilingual tabs as its own card. The `heroImage` file
 * input submits alongside the rest of `home-content-form` — the server
 * action treats a missing/empty file as "keep the current image" (matrix
 * C1/C4/C5, security research "Image lifecycle (hero)").
 */
function HeroImageSection({
  heroImageUrl,
  heroBlobMissing,
}: {
  heroImageUrl: string | null;
  heroBlobMissing: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);
    if (!file) {
      setPreview(null);
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFileError("รองรับเฉพาะไฟล์ JPEG, PNG หรือ WebP");
      e.target.value = "";
      setPreview(null);
      return;
    }
    if (file.size > HERO_MAX_MB * 1024 * 1024) {
      setFileError(`ไฟล์ต้องมีขนาดไม่เกิน ${HERO_MAX_MB}MB`);
      e.target.value = "";
      setPreview(null);
      return;
    }
    setPreview(URL.createObjectURL(file));
  };

  return (
    <div className="rounded-xl border border-border/70 bg-card p-6">
      <h2 className="mb-1 font-semibold">รูปภาพหลัก (Hero Image)</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        ใช้ภาพเดียวกันทั้งเว็บไทยและอังกฤษ — แนะนำแนวนอน ไม่เกิน {HERO_MAX_MB}MB (JPEG/PNG/WebP)
      </p>

      {heroBlobMissing && (
        <p className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          ไม่พบไฟล์รูปภาพหลักที่บันทึกไว้ในระบบจัดเก็บ — หน้าเว็บจริงจะแสดงภาพสำรองของระบบแทนจนกว่าจะอัปโหลดรูปใหม่
        </p>
      )}

      <div className="mb-4 overflow-hidden rounded-lg border border-border/70 bg-muted/40" style={{ aspectRatio: "16/9" }}>
        {preview || heroImageUrl ? (
          // Preview uses a plain <img> (blob: URLs / arbitrary already-stored keys
          // aren't part of next/image's static config) — same trade-off other
          // admin image previews in this app make.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview ?? heroImageUrl ?? undefined}
            alt="ตัวอย่างรูปภาพหลัก"
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
            ยังไม่มีรูปภาพ
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="home-hero-image">แทนที่รูปภาพหลัก</Label>
        <Input
          id="home-hero-image"
          name="heroImage"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
        />
        {fileError && <p className="text-xs text-destructive">{fileError}</p>}
      </div>
    </div>
  );
}

function ContactSection({ contact }: { contact: ContactData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [phone, setPhone] = useState(contact.phone);
  const [lineUrl, setLineUrl] = useState(contact.lineUrl);
  const [facebookUrl, setFacebookUrl] = useState(contact.facebookUrl);

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await updateContactSettings(formData);
      if (result.ok) {
        toast.success("บันทึกข้อมูลติดต่อเรียบร้อย");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="rounded-xl border border-border/70 bg-card p-6">
      <h2 className="mb-1 font-semibold">ข้อมูลติดต่อ (ใช้ในไอคอนโทร/LINE/Facebook บนหน้าแรก)</h2>
      <p className="mb-4 text-sm text-accent-foreground">
        ข้อมูลชุดนี้เป็นชุดเดียวกับ “ตั้งค่าระบบ → ติดต่อ &amp; Social” — แก้ที่นี่จะเปลี่ยนทั้งเว็บ ไม่ใช่แค่หน้าแรก
      </p>
      <form action={handleSubmit} className="space-y-4" noValidate>
        {/* Fields Home doesn't surface for editing — carried through unchanged so this save never blanks them. */}
        <input type="hidden" name="email" value={contact.email} />
        <input type="hidden" name="addressTh" value={contact.addressTh} />
        <input type="hidden" name="addressEn" value={contact.addressEn} />
        <input type="hidden" name="hoursTh" value={contact.hoursTh} />
        <input type="hidden" name="hoursEn" value={contact.hoursEn} />
        <input type="hidden" name="mapQuery" value={contact.mapQuery} />
        <input type="hidden" name="instagramUrl" value={contact.instagramUrl} />
        <input type="hidden" name="tiktokUrl" value={contact.tiktokUrl} />
        <input type="hidden" name="youtubeUrl" value={contact.youtubeUrl} />
        <input type="hidden" name="contactTitleTh" value={contact.contactTitleTh} />
        <input type="hidden" name="contactTitleEn" value={contact.contactTitleEn} />
        <input type="hidden" name="contactSubtitleTh" value={contact.contactSubtitleTh} />
        <input type="hidden" name="contactSubtitleEn" value={contact.contactSubtitleEn} />

        <div className="space-y-1.5">
          <Label htmlFor="home-c-phone">เบอร์โทรศัพท์</Label>
          <Input id="home-c-phone" name="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="home-c-line">LINE (URL)</Label>
          <Input id="home-c-line" name="lineUrl" type="url" value={lineUrl} onChange={(e) => setLineUrl(e.target.value)} placeholder="https://line.me/R/ti/p/@kkdsolar" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="home-c-facebook">Facebook (URL)</Label>
          <Input id="home-c-facebook" name="facebookUrl" type="url" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/kkdsolar" />
        </div>
        <Button type="submit" id="home-c-submit" disabled={isPending}>
          {isPending ? "กำลังบันทึก..." : "บันทึกข้อมูลติดต่อ"}
        </Button>
      </form>
    </div>
  );
}

export function HomeClient({
  home,
  contact,
  canMutateContact,
  heroImageUrl,
  heroBlobMissing,
  embedded = false,
}: {
  home: HomeContentData;
  contact: ContactData | null;
  canMutateContact: boolean;
  heroImageUrl: string | null;
  heroBlobMissing: boolean;
  /** When true, skip outer PageShell (parent tabs already provide chrome). */
  embedded?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [faqItems, setFaqItems] = useState<FaqItem[]>(home.faqItems);
  const [showLatestWorks, setShowLatestWorks] = useState(home.showLatestWorks);
  const [showServicesCta, setShowServicesCta] = useState(home.showServicesCta);
  const [showFaq, setShowFaq] = useState(home.showFaq);

  const handleSubmit = (formData: FormData) => {
    formData.set("faqItemsJson", JSON.stringify(faqItems));
    startTransition(async () => {
      const result = await updateHomeContent(formData);
      if (result.ok) {
        toast.success("บันทึกเนื้อหาหน้าแรกเรียบร้อย");
        router.refresh();
      } else if ("conflict" in result) {
        toast.error("มีการแก้ไขจากคนอื่นระหว่างที่คุณแก้ไขอยู่ กรุณาโหลดหน้าใหม่แล้วทำอีกครั้ง", {
          action: { label: "โหลดใหม่", onClick: () => router.refresh() },
        });
      } else {
        toast.error(result.error);
      }
    });
  };

  const body = (
    <>
      <div className="flex items-start justify-between">
        <a
          href="/th"
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          เปิดหน้าจริง /th
          <ExternalLink className="size-3.5" />
        </a>
        <Button type="submit" form="home-content-form" disabled={isPending}>
          {isPending ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
      </div>

      <form id="home-content-form" action={handleSubmit} className="space-y-6" noValidate encType="multipart/form-data">
        <input type="hidden" name="version" value={home.version} />

        <HeroImageSection heroImageUrl={heroImageUrl} heroBlobMissing={heroBlobMissing} />

        <div className="rounded-xl border border-border/70 bg-card p-6">
          <BilingualTabs
            th={
              <div className="space-y-5">
                <p className="rounded-md border border-border/70 bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  เว้นภาษาอังกฤษว่างได้ — เมื่อเปิดใช้งานหน้าจริงจะแสดงข้อความภาษาไทยแทนช่องที่ว่าง
                </p>

                <h3 className="border-b border-border/70 pb-1.5 text-base font-bold text-foreground">Hero</h3>
                <div className="space-y-1.5">
                  <Label>คำนำสั้น (Kicker) เหนือหัวข้อใหญ่</Label>
                  <Input name="heroKickerTh" defaultValue={home.heroKickerTh} />
                </div>
                <div className="space-y-1.5">
                  <Label>หัวข้อใหญ่ — ส่วนสีขาว</Label>
                  <Input name="heroTitleWhiteTh" defaultValue={home.heroTitleWhiteTh} />
                </div>
                <div className="space-y-1.5">
                  <Label>หัวข้อใหญ่ — ส่วนสีทอง (เน้น)</Label>
                  <Input name="heroTitleGoldTh" defaultValue={home.heroTitleGoldTh} />
                </div>
                <div className="space-y-1.5">
                  <Label>ข้อความรองใต้หัวข้อใหญ่</Label>
                  <Textarea name="heroSubtitleTh" rows={2} defaultValue={home.heroSubtitleTh} />
                </div>
                <div className="space-y-1.5">
                  <Label>ข้อความ alt ของรูปภาพหลัก (เพื่อการเข้าถึง) — จำเป็นต้องกรอก</Label>
                  <Input name="heroAltTh" defaultValue={home.heroAltTh} />
                </div>
                <div className="space-y-1.5">
                  <Label>ปุ่มหลัก (ตัวอย่าง: ขอใบเสนอราคา)</Label>
                  <Input name="ctaPrimaryLabelTh" defaultValue={home.ctaPrimaryLabelTh} />
                </div>
                <div className="space-y-1.5">
                  <Label>ปุ่มรอง (ตัวอย่าง: นัดสำรวจหน้างาน)</Label>
                  <Input name="ctaSecondaryLabelTh" defaultValue={home.ctaSecondaryLabelTh} />
                </div>
                <div className="space-y-1.5">
                  <Label>ข้อความนำหน้าไอคอนติดต่อด่วน</Label>
                  <Input name="quickContactLabelTh" defaultValue={home.quickContactLabelTh} />
                </div>

                <h3 className="border-b border-border/70 pb-1.5 text-base font-bold text-foreground">
                  แผงความน่าเชื่อถือ (Proof panel)
                </h3>
                <div className="space-y-1.5">
                  <Label>ป้ายกำกับ</Label>
                  <Input name="proofLabelTh" defaultValue={home.proofLabelTh} />
                </div>
                <div className="space-y-1.5">
                  <Label>หัวข้อ</Label>
                  <Input name="proofTitleTh" defaultValue={home.proofTitleTh} />
                </div>
                <div className="space-y-1.5">
                  <Label>รายการที่ 1</Label>
                  <Input name="proofItem1Th" defaultValue={home.proofItem1Th} />
                </div>
                <div className="space-y-1.5">
                  <Label>รายการที่ 2</Label>
                  <Input name="proofItem2Th" defaultValue={home.proofItem2Th} />
                </div>
                <div className="space-y-1.5">
                  <Label>รายการที่ 3</Label>
                  <Input name="proofItem3Th" defaultValue={home.proofItem3Th} />
                </div>

                <h3 className="border-b border-border/70 pb-1.5 text-base font-bold text-foreground">
                  แถบจุดเด่น 4 ข้อ (ไอคอนกำหนดตายตัวตามตำแหน่งในโค้ด แก้ไม่ได้จากหน้านี้)
                </h3>
                <div className="space-y-1.5">
                  <Label>จุดเด่น 1</Label>
                  <Input name="feature1LabelTh" defaultValue={home.feature1LabelTh} />
                </div>
                <div className="space-y-1.5">
                  <Label>จุดเด่น 2</Label>
                  <Input name="feature2LabelTh" defaultValue={home.feature2LabelTh} />
                </div>
                <div className="space-y-1.5">
                  <Label>จุดเด่น 3</Label>
                  <Input name="feature3LabelTh" defaultValue={home.feature3LabelTh} />
                </div>
                <div className="space-y-1.5">
                  <Label>จุดเด่น 4</Label>
                  <Input name="feature4LabelTh" defaultValue={home.feature4LabelTh} />
                </div>

                <h3 className="border-b border-border/70 pb-1.5 text-base font-bold text-foreground">
                  ผลงานล่าสุด (Latest Works)
                </h3>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="showLatestWorks"
                    checked={showLatestWorks}
                    onChange={(e) => setShowLatestWorks(e.target.checked)}
                  />
                  แสดงส่วนนี้บนหน้าแรก
                </label>
                <div className="space-y-1.5">
                  <Label>หัวข้อส่วน</Label>
                  <Input name="latestWorksHeadingTh" defaultValue={home.latestWorksHeadingTh} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>ตัวเลขที่ 1 — ป้ายกำกับ</Label>
                    <Input name="metric1LabelTh" defaultValue={home.metric1LabelTh} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>ตัวเลขที่ 1 — ค่า</Label>
                    <Input name="metric1ValueTh" defaultValue={home.metric1ValueTh} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>ตัวเลขที่ 2 — ป้ายกำกับ</Label>
                    <Input name="metric2LabelTh" defaultValue={home.metric2LabelTh} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>ตัวเลขที่ 2 — ค่า</Label>
                    <Input name="metric2ValueTh" defaultValue={home.metric2ValueTh} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>ตัวเลขที่ 3 — ป้ายกำกับ</Label>
                    <Input name="metric3LabelTh" defaultValue={home.metric3LabelTh} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>ตัวเลขที่ 3 — ค่า</Label>
                    <Input name="metric3ValueTh" defaultValue={home.metric3ValueTh} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>ปุ่ม “ดูผลงานทั้งหมด”</Label>
                  <Input name="viewAllLabelTh" defaultValue={home.viewAllLabelTh} />
                </div>

                <h3 className="border-b border-border/70 pb-1.5 text-base font-bold text-foreground">
                  แถบ CTA บริการ (Our service)
                </h3>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="showServicesCta"
                    checked={showServicesCta}
                    onChange={(e) => setShowServicesCta(e.target.checked)}
                  />
                  แสดงส่วนนี้บนหน้าแรก
                </label>
                <div className="space-y-1.5">
                  <Label>ป้ายกำกับ (Badge)</Label>
                  <Input name="servicesCtaBadgeTh" defaultValue={home.servicesCtaBadgeTh} />
                </div>
                <div className="space-y-1.5">
                  <Label>หัวข้อ</Label>
                  <Input name="servicesCtaTitleTh" defaultValue={home.servicesCtaTitleTh} />
                </div>
                <div className="space-y-1.5">
                  <Label>ข้อความ</Label>
                  <Textarea name="servicesCtaTextTh" rows={2} defaultValue={home.servicesCtaTextTh} />
                </div>
                <div className="space-y-1.5">
                  <Label>ข้อความลิงก์ (ตัวอย่าง: ดูบริการทั้งหมด)</Label>
                  <Input name="servicesCtaLinkLabelTh" defaultValue={home.servicesCtaLinkLabelTh} />
                </div>

                <h3 className="border-b border-border/70 pb-1.5 text-base font-bold text-foreground">
                  หัวข้อส่วนคำถามที่พบบ่อย (FAQ)
                </h3>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="showFaq"
                    checked={showFaq}
                    onChange={(e) => setShowFaq(e.target.checked)}
                  />
                  แสดงส่วนนี้บนหน้าแรก
                </label>
                <div className="space-y-1.5">
                  <Label>ป้ายกำกับ (Badge)</Label>
                  <Input name="faqBadgeTh" defaultValue={home.faqBadgeTh} />
                </div>
                <div className="space-y-1.5">
                  <Label>หัวข้อ</Label>
                  <Input name="faqTitleTh" defaultValue={home.faqTitleTh} />
                </div>
                <div className="space-y-1.5">
                  <Label>ข้อความนำ</Label>
                  <Textarea name="faqIntroTh" rows={2} defaultValue={home.faqIntroTh} />
                </div>
                <div className="space-y-1.5">
                  <Label>ปุ่ม LINE ท้าย FAQ</Label>
                  <Input name="faqLineButtonLabelTh" defaultValue={home.faqLineButtonLabelTh} />
                </div>
              </div>
            }
            en={
              <div className="space-y-5">
                <p className="rounded-md border border-border/70 bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  Leaving English blank is fine — once enabled, /en falls back to the Thai text for any empty field.
                </p>

                <h3 className="border-b border-border/70 pb-1.5 text-base font-bold text-foreground">Hero</h3>
                <div className="space-y-1.5">
                  <Label>Kicker line above the main heading</Label>
                  <Input name="heroKickerEn" defaultValue={home.heroKickerEn} />
                </div>
                <div className="space-y-1.5">
                  <Label>Main heading — white part</Label>
                  <Input name="heroTitleWhiteEn" defaultValue={home.heroTitleWhiteEn} />
                </div>
                <div className="space-y-1.5">
                  <Label>Main heading — gold (emphasis) part</Label>
                  <Input name="heroTitleGoldEn" defaultValue={home.heroTitleGoldEn} />
                </div>
                <div className="space-y-1.5">
                  <Label>Subtitle under the main heading</Label>
                  <Textarea name="heroSubtitleEn" rows={2} defaultValue={home.heroSubtitleEn} />
                </div>
                <div className="space-y-1.5">
                  <Label>Hero image alt text (accessibility) — required</Label>
                  <Input name="heroAltEn" defaultValue={home.heroAltEn} />
                </div>
                <div className="space-y-1.5">
                  <Label>Primary button (e.g. Request a quote)</Label>
                  <Input name="ctaPrimaryLabelEn" defaultValue={home.ctaPrimaryLabelEn} />
                </div>
                <div className="space-y-1.5">
                  <Label>Secondary button (e.g. Book a site survey)</Label>
                  <Input name="ctaSecondaryLabelEn" defaultValue={home.ctaSecondaryLabelEn} />
                </div>
                <div className="space-y-1.5">
                  <Label>Label before the quick-contact icons</Label>
                  <Input name="quickContactLabelEn" defaultValue={home.quickContactLabelEn} />
                </div>

                <h3 className="border-b border-border/70 pb-1.5 text-base font-bold text-foreground">Proof panel</h3>
                <div className="space-y-1.5">
                  <Label>Label</Label>
                  <Input name="proofLabelEn" defaultValue={home.proofLabelEn} />
                </div>
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input name="proofTitleEn" defaultValue={home.proofTitleEn} />
                </div>
                <div className="space-y-1.5">
                  <Label>Item 1</Label>
                  <Input name="proofItem1En" defaultValue={home.proofItem1En} />
                </div>
                <div className="space-y-1.5">
                  <Label>Item 2</Label>
                  <Input name="proofItem2En" defaultValue={home.proofItem2En} />
                </div>
                <div className="space-y-1.5">
                  <Label>Item 3</Label>
                  <Input name="proofItem3En" defaultValue={home.proofItem3En} />
                </div>

                <h3 className="border-b border-border/70 pb-1.5 text-base font-bold text-foreground">
                  Feature row (4 items — icons are fixed in code by position, not editable here)
                </h3>
                <div className="space-y-1.5">
                  <Label>Feature 1</Label>
                  <Input name="feature1LabelEn" defaultValue={home.feature1LabelEn} />
                </div>
                <div className="space-y-1.5">
                  <Label>Feature 2</Label>
                  <Input name="feature2LabelEn" defaultValue={home.feature2LabelEn} />
                </div>
                <div className="space-y-1.5">
                  <Label>Feature 3</Label>
                  <Input name="feature3LabelEn" defaultValue={home.feature3LabelEn} />
                </div>
                <div className="space-y-1.5">
                  <Label>Feature 4</Label>
                  <Input name="feature4LabelEn" defaultValue={home.feature4LabelEn} />
                </div>

                <h3 className="border-b border-border/70 pb-1.5 text-base font-bold text-foreground">Latest Works</h3>
                <div className="space-y-1.5">
                  <Label>Section heading</Label>
                  <Input name="latestWorksHeadingEn" defaultValue={home.latestWorksHeadingEn} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Metric 1 — label</Label>
                    <Input name="metric1LabelEn" defaultValue={home.metric1LabelEn} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Metric 1 — value</Label>
                    <Input name="metric1ValueEn" defaultValue={home.metric1ValueEn} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Metric 2 — label</Label>
                    <Input name="metric2LabelEn" defaultValue={home.metric2LabelEn} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Metric 2 — value</Label>
                    <Input name="metric2ValueEn" defaultValue={home.metric2ValueEn} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Metric 3 — label</Label>
                    <Input name="metric3LabelEn" defaultValue={home.metric3LabelEn} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Metric 3 — value</Label>
                    <Input name="metric3ValueEn" defaultValue={home.metric3ValueEn} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>“View all portfolio” button</Label>
                  <Input name="viewAllLabelEn" defaultValue={home.viewAllLabelEn} />
                </div>

                <h3 className="border-b border-border/70 pb-1.5 text-base font-bold text-foreground">
                  Our service CTA
                </h3>
                <div className="space-y-1.5">
                  <Label>Badge</Label>
                  <Input name="servicesCtaBadgeEn" defaultValue={home.servicesCtaBadgeEn} />
                </div>
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input name="servicesCtaTitleEn" defaultValue={home.servicesCtaTitleEn} />
                </div>
                <div className="space-y-1.5">
                  <Label>Body text</Label>
                  <Textarea name="servicesCtaTextEn" rows={2} defaultValue={home.servicesCtaTextEn} />
                </div>
                <div className="space-y-1.5">
                  <Label>Link label (e.g. See all services)</Label>
                  <Input name="servicesCtaLinkLabelEn" defaultValue={home.servicesCtaLinkLabelEn} />
                </div>

                <h3 className="border-b border-border/70 pb-1.5 text-base font-bold text-foreground">FAQ chrome</h3>
                <div className="space-y-1.5">
                  <Label>Badge</Label>
                  <Input name="faqBadgeEn" defaultValue={home.faqBadgeEn} />
                </div>
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input name="faqTitleEn" defaultValue={home.faqTitleEn} />
                </div>
                <div className="space-y-1.5">
                  <Label>Intro text</Label>
                  <Textarea name="faqIntroEn" rows={2} defaultValue={home.faqIntroEn} />
                </div>
                <div className="space-y-1.5">
                  <Label>LINE button at the end of FAQ</Label>
                  <Input name="faqLineButtonLabelEn" defaultValue={home.faqLineButtonLabelEn} />
                </div>
              </div>
            }
          />
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-6">
          <h2 className="mb-1 font-semibold">คำถามที่พบบ่อย (FAQ) — {faqItems.length}/{HOME_FAQ_MAX} ข้อ</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            ต้องกรอกครบทั้งไทยและอังกฤษทุกข้อ ไม่มีการสำรองข้อความเหมือนช่องอื่น ๆ
          </p>
          <FaqEditor items={faqItems} onChange={setFaqItems} showFaq={showFaq} />
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "กำลังบันทึก..." : "บันทึกเนื้อหาหน้าแรก"}
        </Button>
      </form>

      {canMutateContact && contact && <ContactSection contact={contact} />}
      {!canMutateContact && (
        <p className="rounded-lg border border-border/70 bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
          ข้อมูลติดต่อ (เบอร์โทร/LINE/Facebook) แก้ไขได้เฉพาะบทบาท ผู้ดูแลระบบ และ การตลาด — ติดต่อผู้ดูแลระบบหากต้องการเปลี่ยน
        </p>
      )}
    </>
  );

  if (embedded) {
    return <div className="space-y-6">{body}</div>;
  }

  return (
    <PageShell
      pageKey="home"
      title="เนื้อหาหน้าแรก"
      description="หน้าเว็บจริง (/th และ /en) อ่านข้อมูลจากที่นี่โดยตรง — บันทึกแล้วมีผลทันทีทั้งสองภาษา"
    >
      {body}
    </PageShell>
  );
}

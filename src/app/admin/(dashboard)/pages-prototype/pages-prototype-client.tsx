"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  CircleCheck,
  ExternalLink,
  Eye,
  FileText,
  ImageIcon,
  LayoutGrid,
  ListChecks,
  Monitor,
  Save,
  Search,
  Settings2,
  ShieldAlert,
  Smartphone,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type VariantKey = "A" | "B" | "C";
type Locale = "th" | "en";
type EditorTab = "content" | "properties";

const VARIANTS: Array<{ key: VariantKey; name: string }> = [
  { key: "A", name: "Sidebar tree" },
  { key: "B", name: "Live studio" },
  { key: "C", name: "Pages hub" },
];

const PAGES = [
  { key: "home", th: "หน้าแรก", en: "Home", path: "/th", status: "พร้อมเผยแพร่" },
  { key: "about", th: "เกี่ยวกับเรา", en: "About", path: "/th/about", status: "มีฉบับร่าง" },
  { key: "services", th: "บริการ", en: "Services", path: "/th/services", status: "พร้อมเผยแพร่" },
  { key: "packages", th: "แพ็กเกจ", en: "Packages", path: "/th/packages", status: "พร้อมเผยแพร่" },
  { key: "portfolio", th: "ผลงาน", en: "Portfolio", path: "/th/portfolio", status: "พร้อมเผยแพร่" },
  { key: "calculator", th: "เครื่องคำนวณ", en: "Calculator", path: "/th/calculator", status: "SEO ไม่ครบ" },
] as const;

function usePrototypeState() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const pageKey = searchParams.get("page") ?? "home";
  const currentPage = PAGES.find((page) => page.key === pageKey) ?? PAGES[0];
  const [locale, setLocale] = useState<Locale>("th");
  const [tab, setTab] = useState<EditorTab>("content");
  const [dirty, setDirty] = useState(false);
  const [pendingPage, setPendingPage] = useState<(typeof PAGES)[number] | null>(null);
  const [dangerOpen, setDangerOpen] = useState(false);
  const [isNoIndex, setIsNoIndex] = useState(false);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const protectPrototypeLinks = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.pathname !== pathname) return;
      const nextPage = PAGES.find((page) => page.key === url.searchParams.get("page"));
      if (!nextPage || nextPage.key === currentPage.key) return;
      event.preventDefault();
      setPendingPage(nextPage);
    };
    document.addEventListener("click", protectPrototypeLinks, true);
    return () => document.removeEventListener("click", protectPrototypeLinks, true);
  }, [currentPage.key, dirty, pathname]);

  const navigateToPage = useCallback(
    (nextPage: (typeof PAGES)[number]) => {
      if (nextPage.key === currentPage.key) return;
      if (dirty) {
        setPendingPage(nextPage);
        return;
      }
      const query = new URLSearchParams(searchParams.toString());
      query.set("page", nextPage.key);
      router.replace(`${pathname}?${query.toString()}`);
    },
    [currentPage.key, dirty, pathname, router, searchParams]
  );

  const discardAndNavigate = () => {
    if (!pendingPage) return;
    const query = new URLSearchParams(searchParams.toString());
    query.set("page", pendingPage.key);
    setDirty(false);
    setPendingPage(null);
    router.replace(`${pathname}?${query.toString()}`);
  };

  const requestNoIndex = () => setDangerOpen(true);
  const confirmNoIndex = () => {
    setIsNoIndex((value) => !value);
    setDirty(true);
    setDangerOpen(false);
  };

  return {
    currentPage,
    locale,
    setLocale,
    tab,
    setTab,
    dirty,
    markDirty: () => setDirty(true),
    save: () => setDirty(false),
    navigateToPage,
    pendingPage,
    cancelNavigation: () => setPendingPage(null),
    discardAndNavigate,
    dangerOpen,
    setDangerOpen,
    requestNoIndex,
    confirmNoIndex,
    isNoIndex,
  };
}

type PrototypeState = ReturnType<typeof usePrototypeState>;

function LocaleToggle({ locale, setLocale }: Pick<PrototypeState, "locale" | "setLocale">) {
  return (
    <div className="inline-flex rounded-lg border bg-background p-1" aria-label="ภาษาที่กำลังแก้ไข">
      {(["th", "en"] as const).map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => setLocale(key)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
            locale === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          )}
          aria-pressed={locale === key}
        >
          {key === "th" ? "TH ไทย" : "EN English"}
        </button>
      ))}
    </div>
  );
}

function EditorTabs({ tab, setTab }: Pick<PrototypeState, "tab" | "setTab">) {
  return (
    <div className="flex gap-1 border-b" role="tablist" aria-label="ประเภทข้อมูลหน้าเว็บ">
      {([
        ["content", "เนื้อหา", FileText],
        ["properties", "คุณสมบัติหน้า (SEO)", Settings2],
      ] as const).map(([key, label, Icon]) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={tab === key}
          onClick={() => setTab(key)}
          className={cn(
            "relative flex items-center gap-2 px-4 py-3 text-sm font-medium",
            tab === key ? "text-primary after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="size-4" />
          {label}
        </button>
      ))}
    </div>
  );
}

function ContentFields({ state, compact = false }: { state: PrototypeState; compact?: boolean }) {
  const language = state.locale === "th" ? "ภาษาไทย" : "English";
  return (
    <div className="space-y-5">
      <div className={cn("rounded-xl border bg-card", compact ? "p-4" : "p-5")}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold">ส่วน Hero</h2>
            <p className="mt-1 text-xs text-muted-foreground">ข้อความสำคัญที่ผู้เข้าชมเห็นเป็นอันดับแรก · {language}</p>
          </div>
          <Badge variant="secondary">แสดงอยู่</Badge>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`headline-${compact}`}>หัวข้อหลัก</Label>
            <Input id={`headline-${compact}`} defaultValue={state.locale === "th" ? "ติดตั้งโซลาร์เซลล์ครบวงจร" : "Complete solar installation"} onChange={state.markDirty} />
            <p className="text-xs text-muted-foreground">แนะนำไม่เกิน 60 ตัวอักษร</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`summary-${compact}`}>คำอธิบาย</Label>
            <Textarea id={`summary-${compact}`} defaultValue={state.locale === "th" ? "ออกแบบ ติดตั้ง และดูแลโดยทีมวิศวกรมืออาชีพ" : "Designed, installed, and supported by professional engineers."} onChange={state.markDirty} rows={3} />
          </div>
        </div>
      </div>
      <div className={cn("rounded-xl border bg-card", compact ? "p-4" : "p-5")}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">ผลงานแนะนำ</h2>
            <p className="mt-1 text-xs text-muted-foreground">เลือกได้สูงสุด 4 รายการและเรียงลำดับได้</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={state.markDirty}>เลือกผลงาน</Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {["โรงงานผลิตอาหาร 120 kW", "บ้านพักอาศัย 10 kW"].map((item, index) => (
            <div key={item} className="flex items-center gap-3 rounded-lg border bg-muted/35 p-3">
              <div className="flex size-9 items-center justify-center rounded-md bg-secondary text-primary"><ImageIcon className="size-4" /></div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item}</p><p className="text-xs text-muted-foreground">ลำดับ {index + 1}</p></div>
              <span className="cursor-grab text-muted-foreground" aria-label="ลากเพื่อเรียงลำดับ">⋮⋮</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PropertiesFields({ state, condensed = false }: { state: PrototypeState; condensed?: boolean }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-card p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold">ผลการค้นหาและการแชร์</h2>
            <p className="mt-1 text-xs text-muted-foreground">แก้เฉพาะช่องที่ระบบรองรับ ไม่รับ HTML หรือ script</p>
          </div>
          <Badge variant="secondary"><ShieldAlert className="mr-1 size-3" /> สิทธิ์ Marketing+</Badge>
        </div>
        <div className={cn("grid gap-4", !condensed && "lg:grid-cols-2")}>
          <div className="space-y-1.5">
            <Label htmlFor={`seo-title-${condensed}`}>SEO title · {state.locale.toUpperCase()}</Label>
            <Input id={`seo-title-${condensed}`} defaultValue="ติดตั้งโซลาร์เซลล์ครบวงจร | KKD Property" onChange={state.markDirty} />
            <p className="text-right text-xs text-emerald-700">48 / 60</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`canonical-${condensed}`}>Canonical URL</Label>
            <Input id={`canonical-${condensed}`} defaultValue="https://kkdproperty.com/th" onChange={state.markDirty} />
            <p className="text-xs text-muted-foreground">ต้องเป็น HTTPS และอยู่ในโดเมนที่อนุญาต</p>
          </div>
          <div className={cn("space-y-1.5", !condensed && "lg:col-span-2")}>
            <Label htmlFor={`seo-description-${condensed}`}>Meta description · {state.locale.toUpperCase()}</Label>
            <Textarea id={`seo-description-${condensed}`} defaultValue="บริการออกแบบและติดตั้งโซลาร์เซลล์สำหรับบ้านและธุรกิจ พร้อมประเมินความคุ้มค่าโดยทีมวิศวกร" onChange={state.markDirty} rows={3} />
            <p className="text-right text-xs text-emerald-700">112 / 160</p>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-amber-950"><AlertTriangle className="size-4" /> การมองเห็นใน Search Engine</h3>
            <p className="mt-1 text-sm text-amber-900/75">การปิด index อาจทำให้หน้านี้หายจาก Google</p>
          </div>
          <Button type="button" variant={state.isNoIndex ? "destructive" : "outline"} onClick={state.requestNoIndex}>
            {state.isNoIndex ? "Noindex เปิดอยู่" : "อนุญาตให้ Index"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PreviewCard({ state, full = false }: { state: PrototypeState; full?: boolean }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-white shadow-sm", full && "min-h-[560px]")}>
      <div className="flex items-center justify-between border-b bg-slate-900 px-4 py-3 text-white">
        <div className="flex items-center gap-2 text-sm font-medium"><Monitor className="size-4" /> ตัวอย่างหน้าเว็บ</div>
        <LocaleToggle locale={state.locale} setLocale={state.setLocale} />
      </div>
      <div className="border-b bg-slate-100 px-3 py-2 text-center text-[10px] text-slate-500">kkdproperty.com/{state.locale}/{state.currentPage.key === "home" ? "" : state.currentPage.key}</div>
      <div className={cn("relative overflow-hidden bg-[#eef3f8]", full ? "min-h-[485px] p-7" : "min-h-[340px] p-5")}>
        <div className="absolute inset-x-0 top-0 h-12 bg-[#061a33]" />
        <div className="relative mt-14 rounded-xl bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b57f0e]">KKD Property</p>
          <h3 className={cn("mt-3 font-bold text-[#0d1b2a]", full ? "text-3xl" : "text-xl")}>{state.locale === "th" ? "ติดตั้งโซลาร์เซลล์ครบวงจร" : "Complete solar installation"}</h3>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">{state.locale === "th" ? "ออกแบบ ติดตั้ง และดูแลโดยทีมวิศวกรมืออาชีพ" : "Designed, installed, and supported by professional engineers."}</p>
          <button type="button" className="mt-5 rounded-lg bg-[#f0b429] px-4 py-2 text-xs font-semibold text-[#0a1e3c]">ขอใบเสนอราคา</button>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[1, 2, 3].map((item) => <div key={item} className="h-16 rounded-lg bg-white shadow-sm" />)}
        </div>
      </div>
    </div>
  );
}

function WorkspaceHeader({ state, title }: { state: PrototypeState; title?: string }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground"><span>Pages</span><ChevronRight className="size-3" /><span>{state.currentPage.th}</span></div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{title ?? state.currentPage.th}</h1>
          <Badge variant={state.dirty ? "secondary" : "outline"}>{state.dirty ? "ยังไม่ได้บันทึก" : state.currentPage.status}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">จัดการเนื้อหาและข้อมูล SEO ของหน้านี้</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="w-full md:hidden">
          <span className="sr-only">เลือกหน้า</span>
          <select
            value={state.currentPage.key}
            onChange={(event) => {
              const page = PAGES.find((item) => item.key === event.target.value);
              if (page) state.navigateToPage(page);
            }}
            className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
          >
            {PAGES.map((page) => <option key={page.key} value={page.key}>{page.th}</option>)}
          </select>
        </label>
        <LocaleToggle locale={state.locale} setLocale={state.setLocale} />
        <Button type="button" variant="outline"><Eye className="size-4" /> ดูตัวอย่าง</Button>
        <Button type="button" disabled={!state.dirty} onClick={state.save}><Save className="size-4" /> บันทึก</Button>
      </div>
    </div>
  );
}

function VariantA({ state }: { state: PrototypeState }) {
  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-24">
      <WorkspaceHeader state={state} />
      <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
        <EditorTabs tab={state.tab} setTab={state.setTab} />
        <div className="grid gap-6 p-5 xl:grid-cols-[minmax(0,1fr)_270px]">
          {state.tab === "content" ? <ContentFields state={state} /> : <PropertiesFields state={state} />}
          <aside className="space-y-4">
            <div className="rounded-xl border bg-card p-4">
              <h2 className="text-sm font-semibold">ความพร้อมของหน้า</h2>
              <div className="mt-3 space-y-3 text-sm">
                {["เนื้อหาภาษาไทยครบ", "English content complete", "SEO title และ description ครบ"].map((label) => (
                  <div key={label} className="flex items-start gap-2"><CircleCheck className="mt-0.5 size-4 text-emerald-600" /><span>{label}</span></div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <h2 className="text-sm font-semibold">ลิงก์หน้าเว็บ</h2>
              <a href={state.currentPage.path} target="_blank" className="mt-2 flex items-center gap-1 text-sm text-primary hover:underline">{state.currentPage.path}<ExternalLink className="size-3" /></a>
            </div>
          </aside>
        </div>
      </div>
      {state.dirty && <div className="fixed inset-x-4 bottom-20 z-30 mx-auto flex max-w-xl items-center justify-between gap-3 rounded-xl border bg-slate-950 px-4 py-3 text-white shadow-xl"><span className="text-sm">มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก</span><Button type="button" size="sm" onClick={state.save}>บันทึกตอนนี้</Button></div>}
    </div>
  );
}

function VariantB({ state }: { state: PrototypeState }) {
  return (
    <div className="-m-6 min-h-[calc(100vh-57px)] bg-slate-100 pb-20">
      <div className="border-b bg-white px-5 py-4">
        <WorkspaceHeader state={state} title={`${state.currentPage.th} · Live Studio`} />
      </div>
      <div className="grid min-h-[680px] lg:grid-cols-[minmax(380px,0.9fr)_minmax(430px,1.1fr)]">
        <section className="border-r bg-white">
          <div className="sticky top-0 z-10 bg-white px-5 pt-2"><EditorTabs tab={state.tab} setTab={state.setTab} /></div>
          <div className="space-y-4 p-5">
            <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900">แก้ไขด้านซ้าย แล้วตรวจผลลัพธ์ทั้ง TH/EN ทางด้านขวาก่อนบันทึก</div>
            {state.tab === "content" ? <ContentFields state={state} compact /> : <PropertiesFields state={state} condensed />}
          </div>
        </section>
        <aside className="p-5 lg:sticky lg:top-0 lg:h-[calc(100vh-57px)]">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Preview แบบ Responsive</p>
            <div className="flex rounded-lg border bg-white p-1"><button type="button" className="rounded-md bg-muted p-1.5" aria-label="Desktop"><Monitor className="size-4" /></button><button type="button" className="p-1.5 text-muted-foreground" aria-label="Mobile"><Smartphone className="size-4" /></button></div>
          </div>
          <PreviewCard state={state} full />
          <div className="mt-3 flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-xs"><span className="flex items-center gap-1 text-emerald-700"><Check className="size-3" /> Preview เป็นข้อมูลจำลอง ไม่เผยแพร่จริง</span><span>{state.dirty ? "มีฉบับร่าง" : "ตรงกับข้อมูลล่าสุด"}</span></div>
        </aside>
      </div>
    </div>
  );
}

function VariantC({ state }: { state: PrototypeState }) {
  const [step, setStep] = useState("hero");
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-24">
      <div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><h1 className="text-2xl font-bold">Pages</h1><p className="mt-1 text-sm text-muted-foreground">เลือกหน้า ตรวจสถานะ แล้วแก้เฉพาะส่วนที่ต้องการ</p></div>
          <div className="relative w-full max-w-sm"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="ค้นหาหน้า หรือหัวข้อที่ต้องการแก้" /></div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {PAGES.map((page) => (
            <button key={page.key} type="button" onClick={() => state.navigateToPage(page)} className={cn("rounded-xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md", page.key === state.currentPage.key && "border-primary ring-2 ring-primary/15")}>
              <LayoutGrid className={cn("size-5", page.key === state.currentPage.key ? "text-primary" : "text-muted-foreground")} />
              <p className="mt-3 text-sm font-semibold">{page.th}</p><p className="text-xs text-muted-foreground">{page.en}</p>
              <span className={cn("mt-3 block text-[10px]", page.status.includes("ไม่") || page.status.includes("ร่าง") ? "text-amber-700" : "text-emerald-700")}>{page.status}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b p-5 md:flex-row md:items-center">
          <div><h2 className="text-xl font-bold">{state.currentPage.th}</h2><p className="text-sm text-muted-foreground">{state.currentPage.path}</p></div>
          <div className="flex flex-wrap gap-2"><LocaleToggle locale={state.locale} setLocale={state.setLocale} /><Button variant="outline"><Eye className="size-4" /> Preview</Button><Button disabled={!state.dirty} onClick={state.save}><Save className="size-4" /> บันทึก</Button></div>
        </div>
        <div className="grid lg:grid-cols-[220px_minmax(0,1fr)_260px]">
          <nav className="border-b bg-muted/20 p-4 lg:border-b-0 lg:border-r" aria-label="ส่วนของหน้า">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">เนื้อหา</p>
            {["hero", "portfolio", "cta"].map((key) => <button key={key} type="button" onClick={() => { setStep(key); state.setTab("content"); }} className={cn("mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm", state.tab === "content" && step === key ? "bg-primary text-primary-foreground" : "hover:bg-muted")}><span>{key === "hero" ? "Hero" : key === "portfolio" ? "ผลงานแนะนำ" : "แถบ CTA"}</span><ChevronRight className="size-3" /></button>)}
            <p className="mb-2 mt-5 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Properties</p>
            <button type="button" onClick={() => state.setTab("properties")} className={cn("flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm", state.tab === "properties" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}><span>SEO & Social</span><ChevronRight className="size-3" /></button>
          </nav>
          <section className="min-w-0 p-5">
            <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-wide text-primary">{state.tab === "content" ? "Content section" : "Page properties"}</p><h3 className="mt-1 text-lg font-semibold">{state.tab === "properties" ? "SEO & Social sharing" : step === "hero" ? "Hero" : step === "portfolio" ? "ผลงานแนะนำ" : "แถบ CTA"}</h3></div>
            {state.tab === "properties" ? <PropertiesFields state={state} condensed /> : step === "hero" ? <ContentFields state={state} compact /> : <div className="rounded-xl border border-dashed p-10 text-center"><ListChecks className="mx-auto size-8 text-muted-foreground" /><h4 className="mt-3 font-semibold">{step === "portfolio" ? "เลือกและเรียงผลงานแนะนำ" : "ตั้งค่าข้อความและการแสดง CTA"}</h4><p className="mt-1 text-sm text-muted-foreground">พื้นที่แก้ไขเฉพาะงาน ช่วยลดแบบฟอร์มยาวในครั้งเดียว</p><Button className="mt-4" variant="outline" onClick={state.markDirty}>เริ่มแก้ส่วนนี้</Button></div>}
          </section>
          <aside className="border-t bg-muted/15 p-4 lg:border-l lg:border-t-0">
            <h3 className="text-sm font-semibold">สรุปก่อนเผยแพร่</h3>
            <div className="mt-4 space-y-3 text-xs">
              <div className="rounded-lg border bg-white p-3"><p className="font-medium">ภาษา</p><p className="mt-1 text-muted-foreground">TH และ EN ครบ</p></div>
              <div className="rounded-lg border bg-white p-3"><p className="font-medium">SEO</p><p className="mt-1 text-muted-foreground">Title 48/60 · Description 112/160</p></div>
              <div className="rounded-lg border bg-white p-3"><p className="font-medium">การเปลี่ยนแปลง</p><p className={cn("mt-1", state.dirty ? "text-amber-700" : "text-emerald-700")}>{state.dirty ? "มี 1 ส่วนยังไม่บันทึก" : "ไม่มีรายการค้าง"}</p></div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function PrototypeSwitcher({ current }: { current: VariantKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentIndex = VARIANTS.findIndex((variant) => variant.key === current);
  const select = useCallback((offset: number) => {
    const next = VARIANTS[(currentIndex + offset + VARIANTS.length) % VARIANTS.length];
    const query = new URLSearchParams(searchParams.toString());
    query.set("variant", next.key);
    router.replace(`${pathname}?${query.toString()}`);
  }, [currentIndex, pathname, router, searchParams]);

  useEffect(() => {
    const cycle = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, [contenteditable]")) return;
      if (event.key === "ArrowLeft") select(-1);
      if (event.key === "ArrowRight") select(1);
    };
    window.addEventListener("keydown", cycle);
    return () => window.removeEventListener("keydown", cycle);
  }, [select]);

  if (process.env.NODE_ENV === "production") return null;
  const variant = VARIANTS[currentIndex];
  return (
    <div className="fixed bottom-4 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/20 bg-slate-950 p-1.5 text-white shadow-2xl" aria-label="สลับแบบ prototype">
      <button type="button" onClick={() => select(-1)} className="rounded-full p-2 hover:bg-white/15" aria-label="แบบก่อนหน้า"><ArrowLeft className="size-4" /></button>
      <span className="min-w-40 px-2 text-center text-xs font-semibold">{variant.key} — {variant.name}</span>
      <button type="button" onClick={() => select(1)} className="rounded-full p-2 hover:bg-white/15" aria-label="แบบถัดไป"><ArrowRight className="size-4" /></button>
    </div>
  );
}

function SafetyDialogs({ state }: { state: PrototypeState }) {
  return (
    <>
      <AlertDialog open={Boolean(state.pendingPage)} onOpenChange={(open) => !open && state.cancelNavigation()}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogMedia><AlertTriangle /></AlertDialogMedia><AlertDialogTitle>ออกจากหน้านี้โดยไม่บันทึก?</AlertDialogTitle><AlertDialogDescription>การแก้ไขของ {state.currentPage.th} จะหายไป คุณสามารถกลับไปบันทึกก่อน หรือทิ้งการเปลี่ยนแปลงแล้วไปหน้าถัดไป</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>กลับไปบันทึก</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={state.discardAndNavigate}>ทิ้งการเปลี่ยนแปลง</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={state.dangerOpen} onOpenChange={state.setDangerOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogMedia className="bg-amber-100 text-amber-800"><ShieldAlert /></AlertDialogMedia><AlertDialogTitle>{state.isNoIndex ? "อนุญาตให้ Search Engine เก็บหน้า?" : "ยืนยันการปิด Index?"}</AlertDialogTitle><AlertDialogDescription>{state.isNoIndex ? "หน้านี้จะกลับมาถูกค้นพบได้หลัง Search Engine ประมวลผลอีกครั้ง" : "หน้านี้อาจหายจากผลการค้นหา การเปลี่ยนแปลงจะถูกบันทึกใน Audit Log พร้อมชื่อผู้แก้ไข"}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>ยกเลิก</AlertDialogCancel><AlertDialogAction variant={state.isNoIndex ? "default" : "destructive"} onClick={state.confirmNoIndex}>ยืนยันการเปลี่ยนแปลง</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function PagesPrototypeClient() {
  const searchParams = useSearchParams();
  const rawVariant = searchParams.get("variant")?.toUpperCase();
  const variant: VariantKey = rawVariant === "B" || rawVariant === "C" ? rawVariant : "A";
  const state = usePrototypeState();
  const rendered = useMemo(() => {
    if (variant === "B") return <VariantB state={state} />;
    if (variant === "C") return <VariantC state={state} />;
    return <VariantA state={state} />;
  }, [state, variant]);

  return (
    <>
      {rendered}
      <SafetyDialogs state={state} />
      <PrototypeSwitcher current={variant} />
    </>
  );
}

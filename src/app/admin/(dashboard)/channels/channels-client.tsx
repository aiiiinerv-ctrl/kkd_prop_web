"use client";

import { Check, Copy, Pencil, Plus, Users } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { CHANNEL_TYPE_LABELS } from "@/lib/enum-labels";
import {
  CHANNEL_DEFAULT_LANDING_PATH,
  CHANNEL_SUB_TYPES,
  CHANNEL_UTM_CAMPAIGNS,
  subTypeOf,
} from "@/lib/channel-taxonomy";
import { buildPromoLink } from "@/lib/promo-link";
import { toast } from "sonner";
import {
  createChannel,
  createChannelExecutive,
  createLandingPath,
  deleteChannel,
  deleteChannelExecutive,
  updateChannel,
  updateChannelExecutive,
} from "@/actions/channels";
import { DeleteConfirm } from "@/components/admin/crud-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ChannelType = "INDIVIDUAL" | "COMPANY" | "PLATFORM";

type ExecutiveRow = {
  id: string;
  name: string;
  phone: string;
  refCode: string;
  createdAt: string;
};

type ChannelRow = {
  id: string;
  nameTh: string;
  nameEn: string;
  type: ChannelType;
  subType: string | null;
  landingPath: string;
  utmCampaign: string | null;
  refCode: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  leadCount: number;
  executives: ExecutiveRow[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * The domain+protocol prefix is identical on every promo link and eats most
 * of the truncated width, hiding the part that actually differs
 * (landingPath / ?ref= / utm params). Show only that part; the full URL
 * stays available via the `title` attribute and the copy button.
 */
function stripSiteUrl(url: string, siteUrl: string) {
  return url.startsWith(siteUrl) ? url.slice(siteUrl.length) : url;
}

/**
 * The "ชื่อผู้ดำเนินการ" + "เบอร์โทร" fields on the create form: a dropdown
 * of active SALES/CHANNEL_EXECUTIVE admin users, plus a "พิมพ์ชื่อเอง" option
 * that swaps in the original free-text input (for people with no system
 * login, e.g. outsourced staff). Only used on create — editing an existing
 * executive stays plain free-text, matching updateChannelExecutive's
 * server-side behavior.
 *
 * Picking a system user also prefills the phone input from that user's
 * `phone` on file, as a convenience — not a hard sync. The admin can still
 * freely edit/clear it, and a manual edit is never overwritten by a later
 * pick (tracked via `autoFilledPhone`).
 */
function ExecutiveNameField({ adminUsers }: { adminUsers: AdminUserOption[] }) {
  const [pick, setPick] = useState<string>(
    adminUsers.length > 0 ? "" : MANUAL_ENTRY_VALUE
  );
  const [phone, setPhone] = useState("");
  const [autoFilledPhone, setAutoFilledPhone] = useState("");
  const manual = pick === MANUAL_ENTRY_VALUE || adminUsers.length === 0;

  function handlePickChange(value: string) {
    setPick(value);
    if (value === MANUAL_ENTRY_VALUE) {
      // Don't carry over a prefilled phone into manual entry mode — but
      // leave anything the admin typed themselves alone.
      setPhone((prev) => (prev === autoFilledPhone ? "" : prev));
      setAutoFilledPhone("");
      return;
    }
    const userPhone = adminUsers.find((u) => u.id === value)?.phone ?? "";
    if (!userPhone) return; // No phone on file — leave the field as-is.
    // Only overwrite if the current value is empty or itself a previous
    // auto-fill, never a value the admin typed in manually.
    setPhone((prev) => (prev === "" || prev === autoFilledPhone ? userPhone : prev));
    setAutoFilledPhone(userPhone);
  }

  return (
    <>
      <div className="space-y-1.5">
        <Label>ชื่อผู้ดำเนินการ</Label>
        {adminUsers.length > 0 && (
          <select
            required
            value={pick}
            onChange={(e) => handlePickChange(e.target.value)}
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
          >
            <option value="" disabled>
              - เลือกผู้ใช้ระบบ -
            </option>
            {adminUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
            <option value={MANUAL_ENTRY_VALUE}>พิมพ์ชื่อเอง</option>
          </select>
        )}
        {manual ? (
          <>
            <Input name="name" required placeholder="ชื่อผู้ดำเนินการ" />
            {/* formData.get() returns null (not undefined) when a field is
                absent entirely, which fails the optional-string zod schema —
                so this stays present, just empty, in manual mode. */}
            <input type="hidden" name="linkedAdminUserId" value="" />
          </>
        ) : (
          <>
            {/* Server looks up and uses the admin user's current name — this
                hidden value only satisfies the shared schema's required field. */}
            <input
              type="hidden"
              name="name"
              value={adminUsers.find((u) => u.id === pick)?.name ?? ""}
            />
            <input type="hidden" name="linkedAdminUserId" value={pick} />
          </>
        )}
      </div>
      <div className="space-y-1.5">
        <Label>เบอร์โทร</Label>
        <Input
          name="phone"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
    </>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      className="p-2"
      aria-label="คัดลอกลิงก์โปรโมท"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast.success("คัดลอกลิงก์แล้ว");
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("คัดลอกไม่สำเร็จ");
        }
      }}
    >
      {copied ? (
        <Check className="size-4 text-emerald-600" />
      ) : (
        <Copy className="size-4" />
      )}
    </Button>
  );
}

type AdminUserOption = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

/** Sentinel <select> value for the "พิมพ์ชื่อเอง" fallback — never a real AdminUser id. */
const MANUAL_ENTRY_VALUE = "__manual__";

export function ChannelsClient({
  channels,
  landingPaths,
  siteUrl,
  readOnly = false,
  adminUsers = [],
}: {
  channels: ChannelRow[];
  landingPaths: string[];
  siteUrl: string;
  /** CHANNEL_EXECUTIVE sessions get a read-only view of their own channel — no create/edit/delete. */
  readOnly?: boolean;
  /** Active SALES/CHANNEL_EXECUTIVE admin users, offered as a picker on the executive create form. */
  adminUsers?: AdminUserOption[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ChannelRow | null>(null);
  const [landingPathOptions, setLandingPathOptions] = useState(landingPaths);
  const [selectedLandingPath, setSelectedLandingPath] = useState(
    CHANNEL_DEFAULT_LANDING_PATH
  );
  const [addingLandingPath, setAddingLandingPath] = useState(false);
  const [landingPathDraft, setLandingPathDraft] = useState("");
  const typeSelectRef = useRef<HTMLSelectElement>(null);
  // Holds only the id, not a snapshot of the row — the executive list inside
  // this dialog must track the live `channels` prop (refreshed by
  // revalidatePath after create/update/delete) so a new executive shows up
  // immediately without closing the dialog. Storing the whole row here would
  // freeze its `executives` array at open-time.
  const [execDialogChannelId, setExecDialogChannelId] = useState<string | null>(
    null
  );
  const execDialogChannel =
    channels.find((c) => c.id === execDialogChannelId) ?? null;
  const [editingExec, setEditingExec] = useState<ExecutiveRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = editing
        ? await updateChannel(editing.id, formData)
        : await createChannel(formData);
      if (result.ok) {
        toast.success("บันทึกเรียบร้อย");
        setDialogOpen(false);
        setEditing(null);
      } else {
        toast.error(result.error);
      }
    });
  };

  const onLandingPathCreate = () => {
    const formData = new FormData();
    formData.set("path", landingPathDraft);
    startTransition(async () => {
      const result = await createLandingPath(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setLandingPathOptions((current) =>
        current.includes(result.path) ? current : [...current, result.path].sort()
      );
      setSelectedLandingPath(result.path);
      setLandingPathDraft("");
      setAddingLandingPath(false);
      toast.success("เพิ่มหน้า Landing แล้ว");
    });
  };

  const onDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteChannel(id);
      if (result.ok) toast.success("ลบเรียบร้อย");
      else toast.error(result.error);
    });
  };

  const onExecSubmit = (channelId: string, formData: FormData) => {
    startTransition(async () => {
      const result = editingExec
        ? await updateChannelExecutive(editingExec.id, formData)
        : await createChannelExecutive(channelId, formData);
      if (result.ok) {
        toast.success("บันทึกเรียบร้อย");
        setEditingExec(null);
      } else {
        toast.error(result.error);
      }
    });
  };

  const onExecDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteChannelExecutive(id);
      if (result.ok) toast.success("ลบเรียบร้อย");
      else toast.error(result.error);
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">ช่องทางโปรโมท</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ช่องทางที่เปิดใช้งานจะแสดงในแบบฟอร์ม &quot;รู้จักเราจากช่องทางไหน&quot; บนหน้าเว็บ
            และลิงก์โปรโมทด้านล่างจะบันทึกที่มาของลูกค้าอัตโนมัติเมื่อคลิกเข้ามา
          </p>
        </div>
        {!readOnly && (
          <Button
            onClick={() => {
              setEditing(null);
              setSelectedLandingPath(CHANNEL_DEFAULT_LANDING_PATH);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" /> เพิ่มช่องทาง
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        ลิงก์ในตารางนี้เป็นลิงก์ของ<strong className="font-medium">ช่องทาง</strong>
        {" — "}บันทึกว่า lead มาจากช่องทางไหน และเติม<strong className="font-medium">รหัสช่องทาง</strong>
        (เช่น &ldquo;CH015&rdquo;) ลงช่อง &ldquo;ผู้แนะนำ&rdquo; ให้ลูกค้าอัตโนมัติ
        ถ้าต้องการให้เติม<strong className="font-medium">ชื่อคน</strong>แทนรหัส
        ให้ใช้ลิงก์รายบุคคลในปุ่ม &ldquo;ผู้ดำเนินการ&rdquo; ของช่องทางนั้น
      </p>

      <div className="min-w-0 rounded-xl border border-border/70 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อ (TH)</TableHead>
              <TableHead>ชื่อ (EN)</TableHead>
              <TableHead>ประเภท</TableHead>
              <TableHead>ประเภทย่อย</TableHead>
              {/* The channel-level and executive-level links are both produced
                  by promoLink() and look identical once copied. The executive
                  one prefills the customer's "ผู้แนะนำ" field with a person's
                  name; the channel-level one falls back to prefilling the ref
                  code itself (see resolveRefReferrerName). Say which is which
                  here so the right link gets handed out on purpose. */}
              <TableHead>รหัส / ลิงก์โปรโมทระดับช่องทาง</TableHead>
              <TableHead>จำนวน Lead</TableHead>
              <TableHead>ลำดับ</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead>วันที่สร้าง</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {channels.map((c) => {
              const promoLink = buildPromoLink({
                siteUrl,
                refCode: c.refCode,
                landingPath: c.landingPath,
                subType: c.subType,
                utmCampaign: c.utmCampaign,
              });
              const promoLinkDisplay = stripSiteUrl(promoLink, siteUrl);
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nameTh}</TableCell>
                  <TableCell>{c.nameEn}</TableCell>
                  <TableCell>{CHANNEL_TYPE_LABELS[c.type]}</TableCell>
                  <TableCell>
                    {c.subType
                      ? `${subTypeOf(c.subType)?.nameTh ?? c.subType} (${c.subType})`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline">{c.refCode}</Badge>
                      <span
                        tabIndex={0}
                        className="max-w-56 truncate text-xs text-muted-foreground"
                        title={promoLink}
                      >
                        {promoLinkDisplay}
                      </span>
                      <CopyButton value={promoLink} />
                    </div>
                  </TableCell>
                  <TableCell>{c.leadCount}</TableCell>
                  <TableCell>{c.sortOrder}</TableCell>
                  <TableCell>
                    <Badge variant={c.isActive ? "secondary" : "destructive"}>
                      {c.isActive ? "เปิดใช้งาน" : "ปิด"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(c.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      className="p-2"
                      aria-label="ผู้ดำเนินการ"
                      onClick={() => {
                        setExecDialogChannelId(c.id);
                        setEditingExec(null);
                      }}
                    >
                      <Users className="size-4" />
                    </Button>
                    {!readOnly && (
                      <>
                        <Button
                          variant="ghost"
                          className="p-2"
                          aria-label="แก้ไข"
                        onClick={() => {
                          setEditing(c);
                          setSelectedLandingPath(c.landingPath);
                          setDialogOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <DeleteConfirm
                          title={`ลบช่องทาง "${c.nameTh}"?`}
                          description={
                            c.leadCount > 0
                              ? `มี lead อ้างอิงช่องทางนี้ ${c.leadCount} รายการ — ระบบจะไม่อนุญาตให้ลบ แนะนำให้ปิดการใช้งานแทน`
                              : "การลบจะถูกบันทึกในประวัติการแก้ไข"
                          }
                          disabled={isPending}
                          onConfirm={() => onDelete(c.id)}
                        />
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditing(null);
            setAddingLandingPath(false);
            setLandingPathDraft("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "แก้ไขช่องทาง" : "เพิ่มช่องทางใหม่"}</DialogTitle>
          </DialogHeader>
          <form action={onSubmit} className="space-y-4" key={editing?.id ?? "new"}>
            <div className="space-y-1.5">
              <Label>ชื่อช่องทาง (TH)</Label>
              <Input name="nameTh" required defaultValue={editing?.nameTh} />
            </div>
            <div className="space-y-1.5">
              <Label>Channel name (EN)</Label>
              <Input name="nameEn" required defaultValue={editing?.nameEn} />
            </div>
            <div className="space-y-1.5">
              <Label>ประเภทช่องทางย่อย</Label>
              <select
                name="subType"
                defaultValue={editing?.subType ?? ""}
                onChange={(e) => {
                  const sub = subTypeOf(e.target.value);
                  if (sub && typeSelectRef.current) {
                    typeSelectRef.current.value = sub.channelType;
                  }
                }}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
              >
                <option value="">- ไม่ระบุ (คงรหัสเดิม) -</option>
                {CHANNEL_SUB_TYPES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.nameTh} ({s.code})
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                ใช้เป็น prefix ของรหัสช่องทางตอนสร้างใหม่ (เช่น FB001) และกำหนด &quot;ประเภทช่องทาง&quot; ด้านล่างให้อัตโนมัติ
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>ประเภทช่องทาง</Label>
              <select
                name="type"
                ref={typeSelectRef}
                required
                defaultValue={editing?.type ?? "INDIVIDUAL"}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
              >
                {(Object.keys(CHANNEL_TYPE_LABELS) as ChannelType[]).map((type) => (
                  <option key={type} value={type}>
                    {CHANNEL_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <Label>หน้า Landing ของลิงก์โปรโมท</Label>
                {!addingLandingPath && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => setAddingLandingPath(true)}
                  >
                    <Plus className="size-3.5" /> เพิ่ม path
                  </Button>
                )}
              </div>
              <select
                name="landingPath"
                required
                value={selectedLandingPath}
                onChange={(event) => setSelectedLandingPath(event.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
              >
                {landingPathOptions.map((path) => (
                  <option key={path} value={path}>
                    {path}
                  </option>
                ))}
              </select>
              {addingLandingPath && (
                <div className="space-y-2 rounded-lg border border-border/70 bg-muted/30 p-3">
                  <Label htmlFor="new-landing-path">เพิ่ม path ที่มีอยู่จริง</Label>
                  <Input
                    id="new-landing-path"
                    value={landingPathDraft}
                    onChange={(event) => setLandingPathDraft(event.target.value)}
                    placeholder="/th/campaign"
                    maxLength={180}
                    disabled={isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    รับเฉพาะ path ภายในเว็บที่ขึ้นต้นด้วย /th หรือ /en ระบบจะตรวจว่าหน้ามีอยู่ก่อนบันทึก
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => {
                        setAddingLandingPath(false);
                        setLandingPathDraft("");
                      }}
                    >
                      ยกเลิก
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isPending || !landingPathDraft.trim()}
                      onClick={onLandingPathCreate}
                    >
                      {isPending ? "กำลังตรวจ..." : "เพิ่มและเลือก"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>utm_campaign</Label>
              <select
                name="utmCampaign"
                defaultValue={editing?.utmCampaign ?? ""}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
              >
                <option value="">- ไม่ระบุ -</option>
                {CHANNEL_UTM_CAMPAIGNS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>ลำดับการแสดง</Label>
              <Input
                name="sortOrder"
                type="number"
                min={0}
                defaultValue={editing?.sortOrder ?? 0}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={editing?.isActive ?? true}
              />
              เปิดใช้งาน (แสดงในแบบฟอร์มหน้าเว็บ)
            </label>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!execDialogChannel}
        onOpenChange={(open) => {
          if (!open) {
            setExecDialogChannelId(null);
            setEditingExec(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              ผู้ดำเนินการช่องทาง &quot;{execDialogChannel?.nameTh}&quot;
            </DialogTitle>
          </DialogHeader>
          {execDialogChannel && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                ลิงก์รายบุคคลเติมชื่อผู้ดำเนินการลงช่อง &ldquo;ผู้แนะนำ&rdquo;
                ในฟอร์มจองให้ลูกค้าอัตโนมัติ (ลูกค้าแก้ได้) — ใช้ลิงก์นี้เวลาแจกให้พนักงานไปโปรโมท
              </p>
              <div className="rounded-lg border border-border/70">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ชื่อ</TableHead>
                      <TableHead>เบอร์โทร</TableHead>
                      <TableHead>รหัส / ลิงก์โปรโมทรายบุคคล</TableHead>
                      <TableHead>วันที่สร้าง</TableHead>
                      {!readOnly && <TableHead className="text-right">จัดการ</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {execDialogChannel.executives.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={readOnly ? 4 : 5}
                          className="py-6 text-center text-sm text-muted-foreground"
                        >
                          ยังไม่มีผู้ดำเนินการ
                        </TableCell>
                      </TableRow>
                    )}
                    {execDialogChannel.executives.map((e) => {
                      const execPromoLink = buildPromoLink({
                        siteUrl,
                        refCode: e.refCode,
                        landingPath: execDialogChannel.landingPath,
                        subType: execDialogChannel.subType,
                        utmCampaign: execDialogChannel.utmCampaign,
                      });
                      const execPromoLinkDisplay = stripSiteUrl(
                        execPromoLink,
                        siteUrl
                      );
                      return (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.name}</TableCell>
                        <TableCell>{e.phone}</TableCell>
                        <TableCell>
                          {/* Inherits landingPath/subType/utmCampaign from the
                              parent channel — an executive isn't classified on
                              their own, they carry the channel's campaign
                              metadata with their own refCode swapped in. */}
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline">{e.refCode}</Badge>
                            <span
                              tabIndex={0}
                              className="max-w-56 truncate text-xs text-muted-foreground"
                              title={execPromoLink}
                            >
                              {execPromoLinkDisplay}
                            </span>
                            <CopyButton value={execPromoLink} />
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(e.createdAt)}
                        </TableCell>
                        {!readOnly && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              className="p-2"
                              aria-label="แก้ไข"
                              onClick={() => setEditingExec(e)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <DeleteConfirm
                              title={`ลบผู้ดำเนินการ "${e.name}"?`}
                              description="ลิงก์แนะนำของผู้ดำเนินการรายนี้จะใช้ไม่ได้อีก และการลบจะถูกบันทึกในประวัติการแก้ไข"
                              disabled={isPending}
                              onConfirm={() => onExecDelete(e.id)}
                            />
                          </TableCell>
                        )}
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {!readOnly && (
                <form
                  action={(fd) => onExecSubmit(execDialogChannel.id, fd)}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-dashed border-border p-4 sm:grid-cols-3"
                  key={editingExec?.id ?? "new-exec"}
                >
                  {editingExec ? (
                    <>
                      <div className="space-y-1.5">
                        <Label>ชื่อผู้ดำเนินการ</Label>
                        <Input name="name" required defaultValue={editingExec.name} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>เบอร์โทร</Label>
                        <Input name="phone" required defaultValue={editingExec.phone} />
                      </div>
                    </>
                  ) : (
                    <ExecutiveNameField adminUsers={adminUsers} />
                  )}
                  <div className="flex items-end gap-2">
                    <Button type="submit" disabled={isPending} className="flex-1">
                      {editingExec ? "บันทึก" : "เพิ่ม"}
                    </Button>
                    {editingExec && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditingExec(null)}
                      >
                        ยกเลิก
                      </Button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

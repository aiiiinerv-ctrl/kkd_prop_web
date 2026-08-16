"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ActionResult = { ok: true } | { ok: false; error: string };

type Row = { id: string };

/**
 * The shell every single-entity admin CRUD page shares: the heading and add
 * button, the table chrome and its edit/delete cell, the create-or-edit dialog
 * and which row it is editing, the delete confirmation, and the pending state
 * and toasts around both mutations.
 *
 * What it deliberately does not own is the content — columns and form fields
 * stay as ordinary JSX in each entity's own file, passed as `columns` and
 * `form`. Pushing those behind a config object would trade this small
 * interface for a field-description language wider than the markup it replaces,
 * and every entity has at least one field that language would have to special-
 * case (multi-image upload, a nested select, a kind picker).
 */
export function CrudPage<T extends Row>({
  title,
  addLabel,
  dialogTitle,
  rows,
  headers,
  columns,
  form,
  onCreate,
  onUpdate,
  onDelete,
  deleteTitle,
  deleteDescription = "การลบจะถูกบันทึกในประวัติการแก้ไข และหน้าเว็บจะไม่แสดงรายการนี้อีก",
  canDelete = true,
}: {
  title: string;
  addLabel: string;
  /** Dialog heading, given the row being edited (null when creating). */
  dialogTitle: (editing: T | null) => string;
  rows: T[];
  headers: ReactNode;
  /** The cells before the actions column, for one row. */
  columns: (row: T) => ReactNode;
  /** The form body — everything between the dialog heading and the save button. */
  form: (editing: T | null) => ReactNode;
  onCreate: (formData: FormData) => Promise<ActionResult>;
  onUpdate: (id: string, formData: FormData) => Promise<ActionResult>;
  onDelete: (id: string) => Promise<ActionResult>;
  deleteTitle: (row: T) => string;
  deleteDescription?: string;
  /** Hides the delete button entirely — for roles that can create/update but never delete (e.g. EDITOR). Defaults true so existing callers are unaffected. */
  canDelete?: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (formData: FormData) => {
    startTransition(async () => {
      const result = editing
        ? await onUpdate(editing.id, formData)
        : await onCreate(formData);
      if (result.ok) {
        toast.success("บันทึกเรียบร้อย");
        setDialogOpen(false);
        setEditing(null);
      } else {
        toast.error(result.error);
      }
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      const result = await onDelete(id);
      if (result.ok) toast.success("ลบเรียบร้อย");
      else toast.error(result.error);
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{title}</h1>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" /> {addLabel}
        </Button>
      </div>

      <div className="rounded-xl border border-border/70 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {headers}
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                {columns(row)}
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    className="p-2"
                    aria-label="แก้ไข"
                    onClick={() => {
                      setEditing(row);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  {canDelete && (
                    <DeleteConfirm
                      title={deleteTitle(row)}
                      description={deleteDescription}
                      disabled={isPending}
                      onConfirm={() => remove(row.id)}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogTitle(editing)}</DialogTitle>
          </DialogHeader>
          {/* keyed on the row so switching between rows resets defaultValues */}
          <form
            action={submit}
            className="space-y-4"
            noValidate
            key={editing?.id ?? "new"}
          >
            {form(editing)}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Trash button plus its confirmation, for use inside or outside CrudPage. */
export function DeleteConfirm({
  title,
  description = "การลบจะถูกบันทึกในประวัติการแก้ไข",
  disabled,
  onConfirm,
}: {
  title: string;
  description?: string;
  disabled?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" className="p-2" aria-label="ลบ">
            <Trash2 className="size-4 text-destructive" />
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={disabled}>
            ลบ
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * The TH/EN tab chrome for a bilingual form. Worth a component of its own
 * because of what it carries silently: TabsContent keeps inactive panels
 * mounted (see components/ui/tabs.tsx) so the hidden language's fields are
 * still submitted with the form. A page that rebuilt these tabs by hand and
 * missed that would drop half the content on every save.
 */
export function BilingualTabs({
  th,
  en,
}: {
  th: ReactNode;
  en: ReactNode;
}) {
  return (
    <Tabs defaultValue="th">
      <TabsList className="w-full">
        <TabsTrigger value="th" className="flex-1">
          ภาษาไทย
        </TabsTrigger>
        <TabsTrigger value="en" className="flex-1">
          English
        </TabsTrigger>
      </TabsList>
      <TabsContent value="th" className="space-y-4 pt-3">
        {th}
      </TabsContent>
      <TabsContent value="en" className="space-y-4 pt-3">
        {en}
      </TabsContent>
    </Tabs>
  );
}

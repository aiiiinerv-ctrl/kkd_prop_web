"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, CheckCircle2, Gift, Upload } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  useForm,
  type FieldError,
  type FieldErrors,
  type FieldPath,
  type UseFormRegister,
  type UseFormSetError,
  type UseFormSetValue,
  type UseFormWatch,
} from "react-hook-form";
import { submitQuote } from "@/actions/submit-quote";
import { submitSurveyBooking } from "@/actions/submit-survey-booking";
import { PROVINCES } from "@/lib/data/provinces";
import {
  clearDrafts,
  loadDraft,
  mergeDraftForForm,
  saveDraft,
} from "@/lib/form-draft";
import { cn } from "@/lib/utils";
import {
  quoteSchema,
  surveySchema,
  type BaseLeadFormInput,
  type QuoteFormInput,
  type QuoteInput,
  type SurveyFormInput,
  type SurveyInput,
} from "@/lib/validations/lead";

// #14 decision 3: base fields shared by both tabs live in one draft key so
// switching tabs doesn't lose them; each tab additionally keeps its own
// tab-only fields (avgMonthlyBill/interestedSystems, address/date/slip, ...)
// in a separate key. See mergeDraftForForm() in lib/form-draft.ts for how the
// three sources (base draft, tab draft, URL param) combine.
const BASE_DRAFT_KEY = "kkd-booking-draft-base";
const QUOTE_DRAFT_KEY = "kkd-booking-draft-quote";
const SURVEY_DRAFT_KEY = "kkd-booking-draft-survey";
const ALL_DRAFT_KEYS = [BASE_DRAFT_KEY, QUOTE_DRAFT_KEY, SURVEY_DRAFT_KEY];

// The fields that make up "kkd-booking-draft-base" per #14 decision 3: ชื่อ
// เบอร์ LINE จังหวัด ประเภทอาคาร ผู้แนะนำ ช่องทาง ข้อความ (+ the OTHER-detail
// text that travels with buildingType).
const BASE_DRAFT_FIELDS = [
  "name",
  "phone",
  "lineId",
  "province",
  "buildingType",
  "buildingTypeOtherText",
  "referrerName",
  "sourceChannelId",
  "notes",
] as const;
type BaseDraftValues = Pick<BaseLeadFormInput, (typeof BASE_DRAFT_FIELDS)[number]>;

function pickBaseDraftFields(values: Record<string, unknown>): Partial<BaseDraftValues> {
  const picked: Partial<BaseDraftValues> = {};
  for (const field of BASE_DRAFT_FIELDS) {
    if (field in values) {
      (picked as Record<string, unknown>)[field] = values[field];
    }
  }
  return picked;
}

type Channel = { id: string; name: string };
type Tab = "quote" | "survey";
type BankInfo = {
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
};

const inputCls =
  "w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/50";
const labelCls = "mb-1.5 block text-sm font-semibold";
const errorCls = "mt-1 text-xs text-destructive";

// Values are the middle of each range, not its edge — "1500" means "under
// 2,000", not "exactly 1,500" (see billBucketFor()). A raw bill that doesn't
// land on one of these exact values gets the "OTHER" bucket instead.
const BILL_BUCKETS = [
  { value: "1500", key: "billBucketUnder2k" },
  { value: "3500", key: "billBucketRange2to5k" },
  { value: "7500", key: "billBucketRange5to10k" },
  { value: "15000", key: "billBucketRange10to20k" },
  { value: "25000", key: "billBucketOver20k" },
] as const;

/** "bucket" when the raw value is one of BILL_BUCKETS' exact values, "other" otherwise. */
function billBucketMode(value: string | undefined | null): "" | "bucket" | "other" {
  if (!value) return "";
  return BILL_BUCKETS.some((b) => b.value === value) ? "bucket" : "other";
}

const INTERESTED_SYSTEMS = [
  { value: "ON_GRID", key: "systemOnGrid" },
  { value: "HYBRID", key: "systemHybrid" },
  { value: "OFF_GRID", key: "systemOffGrid" },
] as const;

type Translator = ReturnType<typeof useTranslations<"booking">>;

// Both validation directions speak in the machine codes set by the shared
// schemas in lib/validations/lead.ts — zodResolver puts them in
// `errors.<field>.message`, and a server-side failure arrives as
// `fieldErrors` with the same codes (fed back in via setError).
const ERR_MESSAGE_KEYS = {
  required: "required",
  too_short: "errTooShort",
  too_long: "errTooLong",
  invalid_phone: "errInvalidPhone",
  invalid_date: "errInvalidDate",
} as const;

function FieldErrorText({ error, t }: { error?: FieldError; t: Translator }) {
  if (!error) return null;
  const key =
    ERR_MESSAGE_KEYS[error.message as keyof typeof ERR_MESSAGE_KEYS] ?? "errInvalid";
  return <p className={errorCls}>{t(key)}</p>;
}

function applyServerFieldErrors<T extends BaseLeadFormInput>(
  fieldErrors: Record<string, string> | undefined,
  setError: UseFormSetError<T>
): boolean {
  const entries = Object.entries(fieldErrors ?? {});
  for (const [field, code] of entries) {
    setError(field as FieldPath<T>, { type: "server", message: code });
  }
  return entries.length > 0;
}

// The shared fieldsets only touch fields present on both forms, so they are
// typed against the base shape; each form casts its (superset-typed) form API
// down once when rendering them.
type BaseLeadFormApi = {
  register: UseFormRegister<BaseLeadFormInput>;
  errors: FieldErrors<BaseLeadFormInput>;
  watch: UseFormWatch<BaseLeadFormInput>;
  setValue: UseFormSetValue<BaseLeadFormInput>;
};

export function BookingForms({
  initialBill,
  initialPackageSlug,
  initialServiceSlug,
  initialReferrerName,
  channels,
  bankInfo,
  promptpayQrDataUrl,
}: {
  initialBill: string;
  initialPackageSlug: string;
  initialServiceSlug: string;
  initialReferrerName: string;
  channels: Channel[];
  bankInfo: BankInfo;
  promptpayQrDataUrl: string | null;
}) {
  const t = useTranslations("booking");
  // URL is the single source of truth for the active tab (#13 decision 1):
  // no `tab` param (or anything other than "survey") means "quote" — that
  // rule lives here, in exactly one place.
  const searchParams = useSearchParams();
  const tab: Tab = searchParams.get("tab") === "survey" ? "survey" : "quote";
  const [success, setSuccess] = useState<Tab | null>(null);

  // A tab switch always clears whatever success screen was showing for the
  // other tab (#13 decision 1 — the "success" state used to leak across tabs).
  useEffect(() => {
    setSuccess(null);
  }, [tab]);

  const setTab = (next: Tab) => {
    if (next === tab) return;
    const params = new URLSearchParams(searchParams);
    if (next === "quote") {
      params.delete("tab");
    } else {
      params.set("tab", next);
    }
    const query = params.toString();
    // Native history API, not next/navigation's router — updates the URL
    // (and anything reading useSearchParams) without adding a history entry
    // or hitting the server (#13 decision 2).
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  };

  if (success) {
    return (
      <div className="rounded-xl border border-border/70 bg-card p-10 text-center shadow-sm">
        <CheckCircle2 className="mx-auto size-14 text-green-600" />
        <h2 className="mt-4 text-xl font-bold text-primary">
          {success === "quote" ? t("successQuoteTitle") : t("successSurveyTitle")}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {success === "quote" ? t("successQuoteDesc") : t("successSurveyDesc")}
        </p>
        <a
          href="https://line.me/R/ti/p/@kkdsolar"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block rounded-full bg-[#06c755] px-6 py-2.5 text-sm font-semibold text-white"
        >
          LINE @kkdsolar
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/70 bg-card p-6 shadow-sm sm:p-9">
      <div className="mb-8 flex flex-col gap-1 sm:flex-row">
        {(
          [
            ["quote", t("tabQuoteTitle"), t("tabQuoteSubtitle")],
            ["survey", t("tabSurveyTitle"), t("tabSurveySubtitle")],
          ] as const
        ).map(([key, title, subtitle]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "flex-1 rounded-t-lg px-4 py-3.5 text-center transition-colors max-sm:rounded-lg",
              tab === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            )}
          >
            <span className="block font-semibold">{title}</span>
            {/* opacity only on the active tab: against bg-muted the inactive
                subtitle measured 3.89:1, under the 4.5:1 AA floor, and it was
                dimming the free "request a quote" path. The size and weight
                difference already carries the hierarchy. */}
            <span className={cn("block text-xs", tab === key && "opacity-85")}>
              {subtitle}
            </span>
          </button>
        ))}
      </div>

      {tab === "quote" ? (
        <QuoteForm
          channels={channels}
          initialBill={initialBill}
          initialPackageSlug={initialPackageSlug}
          initialServiceSlug={initialServiceSlug}
          initialReferrerName={initialReferrerName}
          onSuccess={() => setSuccess("quote")}
        />
      ) : (
        <SurveyForm
          channels={channels}
          initialBill={initialBill}
          initialPackageSlug={initialPackageSlug}
          initialServiceSlug={initialServiceSlug}
          initialReferrerName={initialReferrerName}
          onSuccess={() => setSuccess("survey")}
          bankInfo={bankInfo}
          promptpayQrDataUrl={promptpayQrDataUrl}
        />
      )}
    </div>
  );
}

function CommonFields({
  register,
  errors,
  watch,
  t,
}: BaseLeadFormApi & { t: Translator }) {
  const locale = useLocale();
  const buildingType = watch("buildingType");

  return (
    <>
      <div>
        <label className={labelCls}>
          {t("fieldName")} <span className="text-destructive">*</span>
        </label>
        <input
          className={inputCls}
          placeholder={t("fieldNamePlaceholder")}
          {...register("name")}
        />
        <FieldErrorText error={errors.name} t={t} />
      </div>
      <div>
        <label className={labelCls}>
          {t("fieldPhone")} <span className="text-destructive">*</span>
        </label>
        <input
          className={inputCls}
          type="tel"
          placeholder={t("fieldPhonePlaceholder")}
          {...register("phone")}
        />
        <FieldErrorText error={errors.phone} t={t} />
      </div>
      <div>
        <label className={labelCls}>{t("fieldLineId")}</label>
        <input
          className={inputCls}
          placeholder={t("fieldLineIdPlaceholder")}
          {...register("lineId")}
        />
      </div>
      <div>
        <label className={labelCls}>
          {t("fieldProvince")} <span className="text-destructive">*</span>
        </label>
        <select
          className={inputCls}
          {...register("province")}
          defaultValue=""
        >
          <option value="" disabled>
            {t("fieldProvincePlaceholder")}
          </option>
          {PROVINCES.map((p) => (
            <option key={p.value} value={p.value}>
              {locale === "en" ? p.en : p.th}
            </option>
          ))}
        </select>
        <FieldErrorText error={errors.province} t={t} />
      </div>
      <div>
        <label className={labelCls}>
          {t("fieldBuildingType")} <span className="text-destructive">*</span>
        </label>
        <select
          className={inputCls}
          {...register("buildingType")}
          defaultValue=""
        >
          <option value="" disabled>
            {t("fieldBuildingTypePlaceholder")}
          </option>
          <option value="RESIDENTIAL">{t("buildingResidential")}</option>
          <option value="COMMERCIAL">{t("buildingCommercial")}</option>
          <option value="INDUSTRIAL">{t("buildingIndustrial")}</option>
          <option value="OTHER">{t("buildingOther")}</option>
        </select>
        <FieldErrorText error={errors.buildingType} t={t} />
      </div>
      {buildingType === "OTHER" && (
        <div>
          {/* Conditionally required by requireBuildingTypeOtherText() in
              lib/validations/lead.ts. Now that the asterisk is the only
              required marker on this form, leaving it off here would make
              the convention lie — and the input had no label at all. */}
          <label className={labelCls}>
            {t("fieldBuildingTypeOther")} <span className="text-destructive">*</span>
          </label>
          <input
            className={inputCls}
            placeholder={t("fieldBuildingTypeOtherPlaceholder")}
            {...register("buildingTypeOtherText")}
          />
          <FieldErrorText error={errors.buildingTypeOtherText} t={t} />
        </div>
      )}
    </>
  );
}

/**
 * "หมายเหตุ" — deliberately kept as its own component (rather than folded
 * back into CommonFields) so it can be rendered at the tail of each form,
 * after the qualifying fields, instead of interrupting them (#18 chunk 6).
 */
function NotesField({
  register,
  t,
}: {
  register: UseFormRegister<BaseLeadFormInput>;
  t: Translator;
}) {
  return (
    <div>
      <label className={labelCls}>{t("fieldNotes")}</label>
      <textarea
        className={inputCls}
        rows={3}
        placeholder={t("fieldNotesPlaceholder")}
        {...register("notes")}
      />
    </div>
  );
}

/**
 * ค่าไฟเฉลี่ย + ระบบที่สนใจ — shared by both tabs since #14/#18 chunk 5
 * lifted them from quoteSchema into baseLeadSchema (gap G4). The bill select
 * gets an "OTHER" bucket with a free-number fallback (gap G3): a raw value
 * that doesn't land exactly on one of BILL_BUCKETS' values (e.g. from the
 * calculator slider) switches to OTHER and prefills the number instead of
 * silently falling back to an empty <select>.
 */
function BillAndSystemsFields({
  register,
  watch,
  setValue,
  t,
  billMode,
  setBillMode,
}: BaseLeadFormApi & {
  t: Translator;
  billMode: "" | "bucket" | "other";
  setBillMode: (mode: "" | "bucket" | "other") => void;
}) {
  const bill = watch("avgMonthlyBill");

  return (
    <>
      <div>
        <label className={labelCls}>{t("fieldBill")}</label>
        <select
          className={inputCls}
          name="avgMonthlyBillBucket"
          value={billMode === "bucket" ? String(bill ?? "") : billMode === "other" ? "OTHER" : ""}
          onChange={(e) => {
            const value = e.target.value;
            if (value === "OTHER") {
              setBillMode("other");
              setValue("avgMonthlyBill", "");
            } else if (value === "") {
              setBillMode("");
              setValue("avgMonthlyBill", "");
            } else {
              setBillMode("bucket");
              setValue("avgMonthlyBill", value);
            }
          }}
        >
          <option value="">{t("fieldBillPlaceholder")}</option>
          {BILL_BUCKETS.map((b) => (
            <option key={b.value} value={b.value}>
              {t(b.key)}
            </option>
          ))}
          <option value="OTHER">{t("billBucketOther")}</option>
        </select>
        {billMode === "other" && (
          <>
            <label htmlFor="avgMonthlyBillOther" className="sr-only">
              {t("fieldBillOtherLabel")}
            </label>
            <input
              id="avgMonthlyBillOther"
              className={cn(inputCls, "mt-2")}
              type="number"
              min={0}
              max={1_000_000}
              placeholder={t("billOtherPlaceholder")}
              {...register("avgMonthlyBill")}
            />
          </>
        )}
      </div>
      <div>
        <label className={labelCls}>{t("fieldInterestedSystems")}</label>
        <div className="flex flex-col gap-2">
          {INTERESTED_SYSTEMS.map((s) => (
            <label key={s.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                value={s.value}
                {...register("interestedSystems")}
                className="size-4 rounded border-input"
              />
              {t(s.key)}
            </label>
          ))}
        </div>
      </div>
    </>
  );
}

/**
 * The form marks required fields with an asterisk and says nothing about the
 * optional ones. Marking both poles is what made the labels inconsistent in
 * the first place — every required field already carries the asterisk, so the
 * optional marker was redundant coding that only some fields had. This line
 * is what makes the remaining pole legible.
 */
function RequiredLegend({ t }: { t: Translator }) {
  return <p className="text-xs text-muted-foreground">{t("requiredLegend")}</p>;
}

function SourceChannelField({
  register,
  channels,
  t,
}: {
  register: UseFormRegister<BaseLeadFormInput>;
  channels: Channel[];
  t: Translator;
}) {
  if (channels.length === 0) return null;
  return (
    <div>
      <label className={labelCls}>{t("fieldSource")}</label>
      <select className={inputCls} {...register("sourceChannelId")} defaultValue="">
        <option value="">{t("fieldSourcePlaceholder")}</option>
        {channels.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function ReferrerField({
  register,
  t,
}: {
  register: UseFormRegister<BaseLeadFormInput>;
  t: Translator;
}) {
  return (
    <div>
      <label className={labelCls}>{t("fieldReferrer")}</label>
      <input
        className={inputCls}
        placeholder={t("fieldReferrerPlaceholder")}
        {...register("referrerName")}
      />
    </div>
  );
}

/** Carries the source-package/service context from the booking link — never shown to the customer. */
function InterestSlugFields({ register }: { register: UseFormRegister<BaseLeadFormInput> }) {
  return (
    <>
      <input type="hidden" {...register("interestedPackageSlug")} />
      <input type="hidden" {...register("interestedServiceSlug")} />
    </>
  );
}

function QuoteForm({
  channels,
  initialBill,
  initialPackageSlug,
  initialServiceSlug,
  initialReferrerName,
  onSuccess,
}: {
  channels: Channel[];
  initialBill: string;
  initialPackageSlug: string;
  initialServiceSlug: string;
  initialReferrerName: string;
  onSuccess: () => void;
}) {
  const t = useTranslations("booking");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState(false);
  const [billMode, setBillMode] = useState<"" | "bucket" | "other">(() =>
    billBucketMode(initialBill)
  );
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<QuoteFormInput, undefined, QuoteInput>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      avgMonthlyBill: initialBill,
      interestedSystems: [],
      interestedPackageSlug: initialPackageSlug,
      interestedServiceSlug: initialServiceSlug,
      referrerName: initialReferrerName,
    },
  });
  const baseApi = { register, errors, watch, setValue } as unknown as BaseLeadFormApi;

  // Draft/URL hydration merges field-by-field (base -> tab draft -> URL
  // param, #14 decision 1) via setValue — never a whole-form reset(), which
  // used to clobber the URL-driven defaultValues above (gap G3).
  useEffect(() => {
    const base = loadDraft<Record<string, unknown>>(BASE_DRAFT_KEY);
    const tabDraft = loadDraft<Record<string, unknown>>(QUOTE_DRAFT_KEY);
    const urlParams: Partial<QuoteFormInput> = {
      avgMonthlyBill: initialBill || undefined,
      interestedPackageSlug: initialPackageSlug || undefined,
      interestedServiceSlug: initialServiceSlug || undefined,
    };
    const merged = mergeDraftForForm(base, tabDraft, urlParams);
    for (const [field, value] of Object.entries(merged)) {
      if (value !== undefined) {
        setValue(field as FieldPath<QuoteFormInput>, value as never, { shouldDirty: false });
      }
    }
    // A ref link's referrer name only fills in the blank the customer left —
    // anything they (or an earlier draft) already put in the field wins.
    if (initialReferrerName && !merged.referrerName) {
      setValue("referrerName", initialReferrerName, { shouldDirty: false });
    }
    if (typeof merged.avgMonthlyBill !== "undefined") {
      setBillMode(billBucketMode(String(merged.avgMonthlyBill ?? "")));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const subscription = watch((values) => {
      saveDraft(QUOTE_DRAFT_KEY, values);
      saveDraft(BASE_DRAFT_KEY, pickBaseDraftFields(values as Record<string, unknown>));
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const onSubmit = (values: QuoteInput) => {
    setServerError(false);
    startTransition(async () => {
      const result = await submitQuote({ ...values, locale });
      if (result.ok) {
        clearDrafts(ALL_DRAFT_KEYS);
        onSuccess();
      } else if (!applyServerFieldErrors(result.fieldErrors, setError)) {
        setServerError(true);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <RequiredLegend t={t} />
      <CommonFields {...baseApi} t={t} />
      <BillAndSystemsFields
        {...baseApi}
        t={t}
        billMode={billMode}
        setBillMode={setBillMode}
      />
      <InterestSlugFields register={baseApi.register} />
      <SourceChannelField register={baseApi.register} channels={channels} t={t} />
      <ReferrerField register={baseApi.register} t={t} />
      <NotesField register={baseApi.register} t={t} />
      {serverError && <p className={errorCls}>{t("errorGeneric")}</p>}
      <p className="text-center text-xs text-muted-foreground">
        {t("reassurance")}{" "}
        <a href="tel:0824731567" className="font-semibold text-primary hover:underline">
          {t("callUs")}
        </a>
      </p>
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-brand-orange-cta py-3.5 font-semibold text-[#0a1e3c] transition-colors hover:bg-brand-orange-cta-dark disabled:opacity-60"
      >
        {isPending ? t("submitting") : t("submitQuote")}
      </button>
    </form>
  );
}

function SurveyForm({
  channels,
  initialBill,
  initialPackageSlug,
  initialServiceSlug,
  initialReferrerName,
  onSuccess,
  bankInfo,
  promptpayQrDataUrl,
}: {
  channels: Channel[];
  initialBill: string;
  initialPackageSlug: string;
  initialServiceSlug: string;
  initialReferrerName: string;
  onSuccess: () => void;
  bankInfo: BankInfo;
  promptpayQrDataUrl: string | null;
}) {
  const t = useTranslations("booking");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState(false);
  const [slip, setSlip] = useState<File | null>(null);
  const [slipError, setSlipError] = useState(false);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Record<string, boolean> | null>(
    null
  );
  const [dateFullError, setDateFullError] = useState(false);
  const [billMode, setBillMode] = useState<"" | "bucket" | "other">(() =>
    billBucketMode(initialBill)
  );
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<SurveyFormInput, undefined, SurveyInput>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      avgMonthlyBill: initialBill,
      interestedSystems: [],
      interestedPackageSlug: initialPackageSlug,
      interestedServiceSlug: initialServiceSlug,
      referrerName: initialReferrerName,
    },
  });
  const baseApi = { register, errors, watch, setValue } as unknown as BaseLeadFormApi;

  // Object URLs are leaked memory until revoked, and re-picking a file makes a
  // new one every time — the cleanup is the point of doing this in an effect
  // rather than inline in the change handler.
  useEffect(() => {
    if (!slip) {
      setSlipPreview(null);
      return;
    }
    const url = URL.createObjectURL(slip);
    setSlipPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [slip]);

  useEffect(() => {
    const base = loadDraft<Record<string, unknown>>(BASE_DRAFT_KEY);
    const tabDraft = loadDraft<Record<string, unknown>>(SURVEY_DRAFT_KEY);
    const urlParams: Partial<SurveyFormInput> = {
      avgMonthlyBill: initialBill || undefined,
      interestedPackageSlug: initialPackageSlug || undefined,
      interestedServiceSlug: initialServiceSlug || undefined,
    };
    const merged = mergeDraftForForm(base, tabDraft, urlParams);
    for (const [field, value] of Object.entries(merged)) {
      if (value !== undefined) {
        setValue(field as FieldPath<SurveyFormInput>, value as never, { shouldDirty: false });
      }
    }
    // A ref link's referrer name only fills in the blank the customer left —
    // anything they (or an earlier draft) already put in the field wins.
    if (initialReferrerName && !merged.referrerName) {
      setValue("referrerName", initialReferrerName, { shouldDirty: false });
    }
    if (typeof merged.avgMonthlyBill !== "undefined") {
      setBillMode(billBucketMode(String(merged.avgMonthlyBill ?? "")));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const subscription = watch((values) => {
      saveDraft(SURVEY_DRAFT_KEY, values);
      saveDraft(BASE_DRAFT_KEY, pickBaseDraftFields(values as Record<string, unknown>));
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  // Inputs hold pre-coercion values (z.input), so these are the raw strings
  // from the date/select controls.
  const preferredDate = watch("preferredDate") as string | undefined;
  const timeSlot = watch("timeSlot") as string | undefined;

  useEffect(() => {
    if (!preferredDate) {
      setAvailability(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/bookings/availability?date=${preferredDate}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setAvailability(data?.slots ?? null);
      })
      .catch(() => {
        if (!cancelled) setAvailability(null);
      });
    return () => {
      cancelled = true;
    };
  }, [preferredDate]);

  const isSelectedSlotFull = Boolean(timeSlot && availability?.[timeSlot]);

  const onSubmit = (values: SurveyInput) => {
    if (!slip) {
      setSlipError(true);
      return;
    }
    if (isSelectedSlotFull) {
      return;
    }
    setSlipError(false);
    setServerError(false);
    setDateFullError(false);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("payload", JSON.stringify({ ...values, locale }));
      formData.set("paymentSlip", slip);
      const result = await submitSurveyBooking(formData);
      if (result.ok) {
        clearDrafts(ALL_DRAFT_KEYS);
        onSuccess();
      } else if (result.error === "date_full") {
        setDateFullError(true);
      } else if (!applyServerFieldErrors(result.fieldErrors, setError)) {
        setServerError(true);
      }
    });
  };

  const benefits = [
    { icon: Check, text: t("surveyBenefit1") },
    { icon: Check, text: t("surveyBenefit2") },
    { icon: Gift, text: t("surveyBenefit3") },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="rounded-r-lg border-l-4 border-brand-orange bg-accent p-4">
        <ul className="space-y-1.5">
          {benefits.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <b.icon className="mt-0.5 size-4 shrink-0 text-brand-orange" />
              {b.text}
            </li>
          ))}
        </ul>
      </div>

      <RequiredLegend t={t} />
      <CommonFields {...baseApi} t={t} />

      <div>
        <label className={labelCls}>
          {t("fieldAddress")} <span className="text-destructive">*</span>
        </label>
        <textarea
          className={inputCls}
          rows={3}
          {...register("address")}
        />
        <FieldErrorText error={errors.address} t={t} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelCls}>
            {t("fieldDate")} <span className="text-destructive">*</span>
          </label>
          <input
            className={inputCls}
            type="date"
            min={new Date().toISOString().split("T")[0]}
            {...register("preferredDate")}
          />
          <FieldErrorText error={errors.preferredDate as FieldError | undefined} t={t} />
        </div>
        <div>
          <label className={labelCls}>
            {t("fieldTimeSlot")} <span className="text-destructive">*</span>
          </label>
          <select
            className={inputCls}
            {...register("timeSlot")}
            defaultValue=""
          >
            <option value="" disabled>
              {t("timeSlotPlaceholder")}
            </option>
            <option value="MORNING" disabled={availability?.MORNING === true}>
              {t("timeMorning")}
              {availability?.MORNING === true ? ` (${t("slotFull")})` : ""}
            </option>
            <option value="AFTERNOON" disabled={availability?.AFTERNOON === true}>
              {t("timeAfternoon")}
              {availability?.AFTERNOON === true ? ` (${t("slotFull")})` : ""}
            </option>
          </select>
          <FieldErrorText error={errors.timeSlot} t={t} />
          {isSelectedSlotFull && <p className={errorCls}>{t("dateFull")}</p>}
        </div>
      </div>

      <InterestSlugFields register={baseApi.register} />

      <div>
        <label className={labelCls}>
          {t("fieldSlip")} <span className="text-destructive">*</span>
        </label>
        <div className="mb-3 flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/40 p-3 text-xs sm:flex-row sm:items-center">
          <div className="flex-1 space-y-1">
            {(bankInfo.bankName || bankInfo.bankAccountNumber || bankInfo.bankAccountName) && (
              <p className="font-semibold text-primary">
                {t("bankTransferLabel")}: {bankInfo.bankName}{" "}
                {bankInfo.bankAccountNumber &&
                  `${t("bankAccountNoLabel")} ${bankInfo.bankAccountNumber}`}{" "}
                {bankInfo.bankAccountName &&
                  `${t("bankAccountNameLabel")} ${bankInfo.bankAccountName}`}
              </p>
            )}
          </div>
          {promptpayQrDataUrl && (
            <div className="flex flex-col items-center gap-1">
              <span className="font-semibold text-primary">{t("promptpayLabel")}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={promptpayQrDataUrl}
                alt={t("promptpayLabel")}
                className="size-40 rounded-lg border border-border/70 bg-white p-1 sm:size-48"
              />
              <a
                href={promptpayQrDataUrl}
                download="promptpay-qr.png"
                className="text-xs font-medium text-primary underline underline-offset-2"
              >
                {t("downloadQrLabel")}
              </a>
            </div>
          )}
        </div>
        {/* A bare file input renders "Choose File / No file chosen" in
            English — the only English left in an otherwise Thai form, sitting
            on the required field at the payment step, where credibility is
            most expensive. The thumbnail matters as much as the button: phone
            galleries hand over names like IMG_0042.HEIC, which confirm
            nothing about whether the right slip was attached. */}
        <input
          id="paymentSlip"
          className="peer sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            setSlip(e.target.files?.[0] ?? null);
            setSlipError(false);
          }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor="paymentSlip"
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-primary/30 bg-muted px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-muted/70 peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50"
          >
            <Upload className="size-4" />
            {t("slipChooseFile")}
          </label>
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
            {slip ? slip.name : t("slipNoFile")}
          </span>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">{t("slipFormats")}</p>
        {slipPreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={slipPreview}
            alt={t("slipPreviewAlt")}
            className="mt-3 max-h-44 rounded-lg border border-border/70"
          />
        )}
        {slipError && <p className={errorCls}>{t("slipRequired")}</p>}
      </div>

      {/* The qualifying questions sit after the payment block so they can't
          delay anyone reaching the QR code. A heading earns them back: without
          it they read as an afterthought bolted on past the point of payment. */}
      <div className="border-t border-border/70 pt-5">
        <p className="text-sm font-semibold text-primary">{t("surveyQualifyHeading")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("surveyQualifyHint")}</p>
      </div>
      <BillAndSystemsFields
        {...baseApi}
        t={t}
        billMode={billMode}
        setBillMode={setBillMode}
      />
      <SourceChannelField register={baseApi.register} channels={channels} t={t} />
      <ReferrerField register={baseApi.register} t={t} />
      <NotesField register={baseApi.register} t={t} />
      {serverError && <p className={errorCls}>{t("errorGeneric")}</p>}
      {dateFullError && <p className={errorCls}>{t("dateFull")}</p>}
      <p className="text-center text-xs text-muted-foreground">
        {t("reassurance")}{" "}
        <a href="tel:0824731567" className="font-semibold text-primary hover:underline">
          {t("callUs")}
        </a>
      </p>
      <button
        type="submit"
        disabled={isPending || isSelectedSlotFull}
        className="w-full rounded-full bg-brand-orange-cta py-3.5 font-semibold text-[#0a1e3c] transition-colors hover:bg-brand-orange-cta-dark disabled:opacity-60"
      >
        {isPending ? t("submitting") : t("submitSurvey")}
      </button>
    </form>
  );
}

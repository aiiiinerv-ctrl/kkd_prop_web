"use client";

import { Check, CheckCircle2, Gift } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { submitQuote } from "@/actions/submit-quote";
import { submitSurveyBooking } from "@/actions/submit-survey-booking";
import { PROVINCES } from "@/lib/data/provinces";
import { cn } from "@/lib/utils";

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

const BILL_BUCKETS = [
  { value: "1500", key: "billBucketUnder2k" },
  { value: "3500", key: "billBucketRange2to5k" },
  { value: "7500", key: "billBucketRange5to10k" },
  { value: "15000", key: "billBucketRange10to20k" },
  { value: "25000", key: "billBucketOver20k" },
] as const;

const INTERESTED_SYSTEMS = [
  { value: "ON_GRID", key: "systemOnGrid" },
  { value: "HYBRID", key: "systemHybrid" },
  { value: "OFF_GRID", key: "systemOffGrid" },
] as const;

type QuoteFields = {
  name: string;
  phone: string;
  lineId: string;
  province: string;
  buildingType: string;
  buildingTypeOtherText: string;
  notes: string;
  avgMonthlyBill: string;
  interestedSystems: string[];
  sourceChannelId: string;
};

type SurveyFields = {
  name: string;
  phone: string;
  lineId: string;
  province: string;
  buildingType: string;
  buildingTypeOtherText: string;
  notes: string;
  address: string;
  preferredDate: string;
  timeSlot: string;
  sourceChannelId: string;
};

export function BookingForms({
  initialTab,
  initialBill,
  channels,
  bankInfo,
  promptpayQrDataUrl,
}: {
  initialTab: Tab;
  initialBill: string;
  channels: Channel[];
  bankInfo: BankInfo;
  promptpayQrDataUrl: string | null;
}) {
  const t = useTranslations("booking");
  const [tab, setTab] = useState<Tab>(initialTab);
  const [success, setSuccess] = useState<Tab | null>(null);

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
            <span className="block text-xs opacity-85">{subtitle}</span>
          </button>
        ))}
      </div>

      {tab === "quote" ? (
        <QuoteForm
          channels={channels}
          initialBill={initialBill}
          onSuccess={() => setSuccess("quote")}
        />
      ) : (
        <SurveyForm
          channels={channels}
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
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watch: any;
  t: ReturnType<typeof useTranslations<"booking">>;
}) {
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
          {...register("name", { required: true, minLength: 2 })}
        />
        {errors.name && <p className={errorCls}>{t("required")}</p>}
      </div>
      <div>
        <label className={labelCls}>
          {t("fieldPhone")} <span className="text-destructive">*</span>
        </label>
        <input
          className={inputCls}
          type="tel"
          placeholder={t("fieldPhonePlaceholder")}
          {...register("phone", {
            required: true,
            pattern: /^0[\d\s-]{8,12}$/,
          })}
        />
        {errors.phone && <p className={errorCls}>{t("required")}</p>}
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
          {...register("province", { required: true })}
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
        {errors.province && <p className={errorCls}>{t("required")}</p>}
      </div>
      <div>
        <label className={labelCls}>
          {t("fieldBuildingType")} <span className="text-destructive">*</span>
        </label>
        <select
          className={inputCls}
          {...register("buildingType", { required: true })}
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
        {errors.buildingType && <p className={errorCls}>{t("required")}</p>}
      </div>
      {buildingType === "OTHER" && (
        <div>
          <input
            className={inputCls}
            placeholder={t("fieldBuildingTypeOtherPlaceholder")}
            {...register("buildingTypeOtherText", { required: true })}
          />
          {errors.buildingTypeOtherText && <p className={errorCls}>{t("required")}</p>}
        </div>
      )}
      <div>
        <label className={labelCls}>{t("fieldNotes")}</label>
        <textarea
          className={inputCls}
          rows={3}
          placeholder={t("fieldNotesPlaceholder")}
          {...register("notes")}
        />
      </div>
    </>
  );
}

function SourceChannelField({
  register,
  channels,
  t,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any;
  channels: Channel[];
  t: ReturnType<typeof useTranslations<"booking">>;
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

function QuoteForm({
  channels,
  initialBill,
  onSuccess,
}: {
  channels: Channel[];
  initialBill: string;
  onSuccess: () => void;
}) {
  const t = useTranslations("booking");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<QuoteFields>({
    defaultValues: { avgMonthlyBill: initialBill, interestedSystems: [] },
  });

  const onSubmit = (values: QuoteFields) => {
    setServerError(false);
    startTransition(async () => {
      const formData = new FormData();
      Object.entries(values).forEach(([k, v]) => {
        if (k === "interestedSystems") {
          (v as string[]).forEach((system) => formData.append("interestedSystems", system));
        } else {
          formData.set(k, v as string);
        }
      });
      formData.set("locale", locale);
      const result = await submitQuote(formData);
      if (result.ok) onSuccess();
      else setServerError(true);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <CommonFields register={register} errors={errors} watch={watch} t={t} />
      <div>
        <label className={labelCls}>{t("fieldBill")}</label>
        <select className={inputCls} {...register("avgMonthlyBill")} defaultValue={initialBill}>
          <option value="">{t("fieldBillPlaceholder")}</option>
          {BILL_BUCKETS.map((b) => (
            <option key={b.value} value={b.value}>
              {t(b.key)}
            </option>
          ))}
        </select>
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
      <SourceChannelField register={register} channels={channels} t={t} />
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
  onSuccess,
  bankInfo,
  promptpayQrDataUrl,
}: {
  channels: Channel[];
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
  const [availability, setAvailability] = useState<Record<string, boolean> | null>(
    null
  );
  const [dateFullError, setDateFullError] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SurveyFields>();

  const preferredDate = watch("preferredDate");
  const timeSlot = watch("timeSlot");

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

  const onSubmit = (values: SurveyFields) => {
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
      Object.entries(values).forEach(([k, v]) => formData.set(k, v));
      formData.set("locale", locale);
      formData.set("paymentSlip", slip);
      const result = await submitSurveyBooking(formData);
      if (result.ok) onSuccess();
      else if (result.error === "date_full") setDateFullError(true);
      else setServerError(true);
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

      <CommonFields register={register} errors={errors} watch={watch} t={t} />

      <div>
        <label className={labelCls}>
          {t("fieldAddress")} <span className="text-destructive">*</span>
        </label>
        <textarea
          className={inputCls}
          rows={3}
          {...register("address", { required: true, minLength: 10 })}
        />
        {errors.address && <p className={errorCls}>{t("required")}</p>}
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
            {...register("preferredDate", { required: true })}
          />
          {errors.preferredDate && <p className={errorCls}>{t("required")}</p>}
        </div>
        <div>
          <label className={labelCls}>
            {t("fieldTimeSlot")} <span className="text-destructive">*</span>
          </label>
          <select
            className={inputCls}
            {...register("timeSlot", { required: true })}
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
          {errors.timeSlot && <p className={errorCls}>{t("required")}</p>}
          {isSelectedSlotFull && <p className={errorCls}>{t("dateFull")}</p>}
        </div>
      </div>

      <div>
        <label className={labelCls}>
          {t("fieldSlip")} <span className="text-destructive">*</span>
        </label>
        <div className="mb-3 flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/40 p-3 text-xs sm:flex-row sm:items-center">
          <div className="flex-1 space-y-1">
            {(bankInfo.bankName || bankInfo.bankAccountNumber || bankInfo.bankAccountName) && (
              <p className="font-semibold text-primary">
                {t("bankTransferLabel")}: {bankInfo.bankName}{" "}
                {bankInfo.bankAccountNumber && `เลขที่ ${bankInfo.bankAccountNumber}`}{" "}
                {bankInfo.bankAccountName && `ชื่อบัญชี ${bankInfo.bankAccountName}`}
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
                className="size-28 rounded-lg border border-border/70 bg-white p-1"
              />
            </div>
          )}
        </div>
        <input
          className={inputCls}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            setSlip(e.target.files?.[0] ?? null);
            setSlipError(false);
          }}
        />
        {slipError && <p className={errorCls}>{t("required")}</p>}
      </div>

      <SourceChannelField register={register} channels={channels} t={t} />
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

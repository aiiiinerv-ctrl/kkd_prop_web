import { z } from "zod";
import { optionalPageText } from "@/lib/validations/page-content";

const text = optionalPageText;

export const packagesPageContentSchema = z.object({
  titleTh: text,
  titleEn: text,
  subtitleTh: text,
  subtitleEn: text,
  emptyTh: text,
  emptyEn: text,
  seasonalTitleTh: text,
  seasonalTitleEn: text,
  seasonalSubtitleTh: text,
  seasonalSubtitleEn: text,
  paybackTitleTh: text,
  paybackTitleEn: text,
  paybackOnGridTh: text,
  paybackOnGridEn: text,
  paybackHybridTh: text,
  paybackHybridEn: text,
  paybackOffGridTh: text,
  paybackOffGridEn: text,
});

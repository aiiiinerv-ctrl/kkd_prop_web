import { z } from "zod";
import { optionalPageText } from "@/lib/validations/page-content";

const text = optionalPageText;

export const portfolioPageContentSchema = z.object({
  titleTh: text,
  titleEn: text,
  subtitleTh: text,
  subtitleEn: text,
  imageDisclaimerTh: text,
  imageDisclaimerEn: text,
  emptyTh: text,
  emptyEn: text,
});

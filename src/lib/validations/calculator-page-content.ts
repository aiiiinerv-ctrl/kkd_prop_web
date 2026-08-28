import { z } from "zod";
import { optionalPageText } from "@/lib/validations/page-content";

const text = optionalPageText;

/** Copy-only fields — no formula/input/result/threshold keys. */
export const calculatorPageContentSchema = z.object({
  eyebrowTh: text,
  eyebrowEn: text,
  titleTh: text,
  titleEn: text,
  subtitleTh: text,
  subtitleEn: text,
  panelTitleTh: text,
  panelTitleEn: text,
  panelIntroTh: text,
  panelIntroEn: text,
  packagesEyebrowTh: text,
  packagesEyebrowEn: text,
  packagesTitleTh: text,
  packagesTitleEn: text,
  packagesSubtitleTh: text,
  packagesSubtitleEn: text,
});

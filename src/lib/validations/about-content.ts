import { z } from "zod";
import { ABOUT_LUCIDE_ICON_NAMES } from "@/lib/about/lucide-icons";
import { optionalPageText, optionalPlainMetaText } from "@/lib/validations/page-content";

export const ABOUT_FEATURED_MAX = 3;

const optionalText = optionalPageText;
const credSectionTitle = optionalPlainMetaText(120);
const credSectionDesc = optionalPlainMetaText(500);

const optionalAboutIcon = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.enum(ABOUT_LUCIDE_ICON_NAMES).nullable(),
);

export const aboutContentSchema = z.object({
  titleTh: optionalText,
  titleEn: optionalText,
  introTh: optionalText,
  introEn: optionalText,
  credSectionTitleTh: credSectionTitle,
  credSectionTitleEn: credSectionTitle,
  credSectionDescTh: credSectionDesc,
  credSectionDescEn: credSectionDesc,
  credRegisteredTitleTh: optionalText,
  credRegisteredTitleEn: optionalText,
  credRegisteredDescTh: optionalText,
  credRegisteredDescEn: optionalText,
  credEngineerTitleTh: optionalText,
  credEngineerTitleEn: optionalText,
  credEngineerDescTh: optionalText,
  credEngineerDescEn: optionalText,
  credExperienceTitleTh: optionalText,
  credExperienceTitleEn: optionalText,
  credExperienceDescTh: optionalText,
  credExperienceDescEn: optionalText,
  credRegisteredIcon: optionalAboutIcon,
  credEngineerIcon: optionalAboutIcon,
  credExperienceIcon: optionalAboutIcon,
  teamDesignIcon: optionalAboutIcon,
  teamInstallIcon: optionalAboutIcon,
  teamSupportIcon: optionalAboutIcon,
  teamTitleTh: optionalText,
  teamTitleEn: optionalText,
  teamDescTh: optionalText,
  teamDescEn: optionalText,
  teamDesignTitleTh: optionalText,
  teamDesignTitleEn: optionalText,
  teamDesignDescTh: optionalText,
  teamDesignDescEn: optionalText,
  teamInstallTitleTh: optionalText,
  teamInstallTitleEn: optionalText,
  teamInstallDescTh: optionalText,
  teamInstallDescEn: optionalText,
  teamSupportTitleTh: optionalText,
  teamSupportTitleEn: optionalText,
  teamSupportDescTh: optionalText,
  teamSupportDescEn: optionalText,
  statsProjectsLabelTh: optionalText,
  statsProjectsLabelEn: optionalText,
  statsYearsLabelTh: optionalText,
  statsYearsLabelEn: optionalText,
  statsEngineersLabelTh: optionalText,
  statsEngineersLabelEn: optionalText,
  statsCustomersLabelTh: optionalText,
  statsCustomersLabelEn: optionalText,
  testimonialsTitleTh: optionalText,
  testimonialsTitleEn: optionalText,
  testimonialsSubtitleTh: optionalText,
  testimonialsSubtitleEn: optionalText,
});

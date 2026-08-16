import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((v) => v || null);

export const aboutContentSchema = z.object({
  titleTh: optionalText,
  titleEn: optionalText,
  introTh: optionalText,
  introEn: optionalText,
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
});

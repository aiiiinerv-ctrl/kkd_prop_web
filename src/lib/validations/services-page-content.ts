import { z } from "zod";
import { optionalPageText } from "@/lib/validations/page-content";

const text = optionalPageText;

export const servicesPageContentSchema = z.object({
  titleTh: text,
  titleEn: text,
  subtitleTh: text,
  subtitleEn: text,
  systemsTitleTh: text,
  systemsTitleEn: text,
  maintenanceTitleTh: text,
  maintenanceTitleEn: text,
});

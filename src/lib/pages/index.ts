export type {
  ContentRollout,
  PageContentRole,
  PageKey,
  PagePropertiesRole,
  PageRegistryEntry,
} from "./types";
export { PAGE_KEYS } from "./types";
export {
  PAGE_REGISTRY,
  adminEnabledPages,
  contentRevalidatePaths,
  getPage,
  isPageKey,
  propertiesRevalidatePaths,
  rolloutPartition,
} from "./registry";

/** Auth gates live in `./access` — import that path from server actions only. */

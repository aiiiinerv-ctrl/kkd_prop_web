import { PagesPrototypeClient } from "./pages-prototype-client";

// Three variants of the Pages CMS workspace, switchable via ?variant=,
// on the throwaway /admin/pages-prototype route.
export default function PagesPrototypePage() {
  return <PagesPrototypeClient />;
}

"use client";

import { useEffect } from "react";

// Full HTML strings already injected in this page load. Module scope survives
// React strict-mode effect re-runs and locale soft navigations, so a tracking
// snippet runs exactly once per full page load.
const injected = new Set<string>();

/**
 * Injects the admin-pasted header tracking snippet (whole <script>…</script>
 * tags) into document.head once, after hydration.
 *
 * Do NOT replace this with `<head dangerouslySetInnerHTML>` in the layout:
 * React then owns head's innerHTML, and on a client navigation that re-renders
 * the layout (e.g. the TH/EN switcher) it re-sets it, wiping the stylesheet
 * <link>s Next injected — leaving the page unstyled.
 *
 * createContextualFragment (unlike innerHTML) makes inserted <script> tags
 * execute, and appending leaves React/Next's own head nodes untouched.
 */
export function HeadHtmlInjector({ html }: { html: string }) {
  useEffect(() => {
    if (injected.has(html)) return;
    injected.add(html);
    document.head.appendChild(document.createRange().createContextualFragment(html));
  }, [html]);
  return null;
}

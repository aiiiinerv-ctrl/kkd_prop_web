"use client";

import { useEffect } from "react";

// The browser half of the attribution recovery described in
// src/app/api/ref/route.ts: a visitor who arrives on a promo link and only
// then agrees to advertisement cookies would otherwise never get `kkd_ref`,
// because the acceptance happens entirely in the browser and no further
// request carries `?ref=`.
//
// CookieYes announces every consent decision as a `cookieyes_consent_update`
// CustomEvent on `document`, including a rejection — the route re-checks the
// consent cookie server-side, so a rejection simply gets a 403 and nothing is
// stored.
//
// Deliberately reads nothing from `process.env`: NEXT_PUBLIC_* is inlined into
// the client bundle at build time, and freezing a value into the artifact is
// exactly what the "deploy first, configure later" setup avoids. This
// component is inert on its own — with no `?ref=` in the URL it never fires,
// and with no banner there is no event to hear.
export function RefConsentCapture() {
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref")?.trim();
    if (!ref) return;

    const capture = () => {
      void fetch(`/api/ref?ref=${encodeURIComponent(ref)}`, {
        credentials: "same-origin",
      }).catch(() => {
        // A lost attribution ping must never surface to the visitor.
      });
    };

    document.addEventListener("cookieyes_consent_update", capture);
    return () => document.removeEventListener("cookieyes_consent_update", capture);
  }, []);

  return null;
}

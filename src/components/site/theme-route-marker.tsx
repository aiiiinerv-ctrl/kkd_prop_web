"use client";

import { useEffect } from "react";

function variantForPath(pathname: string) {
  if (pathname.includes("/theme-2")) return "footer-black-gold";
  if (pathname.includes("/theme-3")) return "blue-orange";
  return "";
}

export function ThemeRouteMarker() {
  useEffect(() => {
    const applyVariant = () => {
      const variant = variantForPath(window.location.pathname);
      if (variant) {
        document.documentElement.dataset.themeVariant = variant;
      } else {
        delete document.documentElement.dataset.themeVariant;
      }
    };

    applyVariant();
    window.addEventListener("popstate", applyVariant);
    return () => {
      window.removeEventListener("popstate", applyVariant);
      delete document.documentElement.dataset.themeVariant;
    };
  }, []);

  return null;
}

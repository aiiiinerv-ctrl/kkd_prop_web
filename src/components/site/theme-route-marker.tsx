"use client";

import { useEffect } from "react";

function variantForPath(pathname: string): { variant: string; skin: string } {
  if (pathname.includes("/theme-2")) return { variant: "footer-black-gold", skin: "" };
  if (pathname.includes("/theme-3")) return { variant: "blue-orange", skin: "" };
  if (pathname.includes("/theme-4")) return { variant: "blue-orange", skin: "theme-4" };
  if (pathname.includes("/theme-5")) return { variant: "blue-orange", skin: "theme-5" };
  if (pathname.includes("/theme-6")) return { variant: "blue-orange", skin: "theme-6" };
  return { variant: "", skin: "" };
}

export function ThemeRouteMarker() {
  useEffect(() => {
    const applyVariant = () => {
      const { variant, skin } = variantForPath(window.location.pathname);
      if (variant) {
        document.documentElement.dataset.themeVariant = variant;
      } else {
        delete document.documentElement.dataset.themeVariant;
      }
      if (skin) {
        document.documentElement.dataset.themeSkin = skin;
      } else {
        delete document.documentElement.dataset.themeSkin;
      }
    };

    applyVariant();
    window.addEventListener("popstate", applyVariant);
    return () => {
      window.removeEventListener("popstate", applyVariant);
      delete document.documentElement.dataset.themeVariant;
      delete document.documentElement.dataset.themeSkin;
    };
  }, []);

  return null;
}

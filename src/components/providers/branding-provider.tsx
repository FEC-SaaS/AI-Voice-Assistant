"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { hexToCssHsl, generateForegroundColor } from "@/lib/color-utils";

interface BrandingContextValue {
  brandName: string;
  brandLogoUrl: string | null;
  brandFaviconUrl: string | null;
  brandPrimaryColor: string | null;
  brandAccentColor: string | null;
  poweredByHidden: boolean;
  isLoading: boolean;
}

const BrandingContext = createContext<BrandingContextValue>({
  brandName: "VoxForge",
  brandLogoUrl: null,
  brandFaviconUrl: null,
  brandPrimaryColor: null,
  brandAccentColor: null,
  poweredByHidden: false,
  isLoading: true,
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = trpc.organization.getBranding.useQuery(
    undefined,
    { staleTime: 60_000 }
  );

  // Inject CSS custom properties when branding colors change
  useEffect(() => {
    if (!data?.brandPrimaryColor) return;

    const root = document.documentElement.style;
    const primaryHsl = hexToCssHsl(data.brandPrimaryColor);
    const foregroundHsl = generateForegroundColor(data.brandPrimaryColor);

    root.setProperty("--primary", primaryHsl);
    root.setProperty("--primary-foreground", foregroundHsl);
    root.setProperty("--ring", primaryHsl);

    if (data.brandAccentColor) {
      const accentHsl = hexToCssHsl(data.brandAccentColor);
      const accentFg = generateForegroundColor(data.brandAccentColor);
      root.setProperty("--accent", accentHsl);
      root.setProperty("--accent-foreground", accentFg);
    }

    return () => {
      root.removeProperty("--primary");
      root.removeProperty("--primary-foreground");
      root.removeProperty("--ring");
      root.removeProperty("--accent");
      root.removeProperty("--accent-foreground");
    };
  }, [data?.brandPrimaryColor, data?.brandAccentColor]);

  // Update document title
  useEffect(() => {
    if (data?.brandName) {
      document.title = `${data.brandName} - Dashboard`;
    }
  }, [data?.brandName]);

  // Update favicon
  useEffect(() => {
    if (!data?.brandFaviconUrl) return;

    let link = document.querySelector(
      "link[rel~='icon']"
    ) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = data.brandFaviconUrl;
  }, [data?.brandFaviconUrl]);

  const value: BrandingContextValue = {
    brandName: data?.brandName || "VoxForge",
    brandLogoUrl: data?.brandLogoUrl || null,
    brandFaviconUrl: data?.brandFaviconUrl || null,
    brandPrimaryColor: data?.brandPrimaryColor || null,
    brandAccentColor: data?.brandAccentColor || null,
    poweredByHidden: data?.poweredByHidden || false,
    isLoading,
  };

  return (
    <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}

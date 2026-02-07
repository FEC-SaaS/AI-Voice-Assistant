"use client";

import { type ReactNode } from "react";
import { hexToCssHsl } from "@/lib/color-utils";

export interface AppointmentBranding {
  logoUrl: string | null;
  primaryColor: string | null;
  brandName: string;
  poweredByHidden: boolean;
}

interface BrandedAppointmentLayoutProps {
  branding: AppointmentBranding | null;
  children: ReactNode;
}

export function BrandedAppointmentLayout({
  branding,
  children,
}: BrandedAppointmentLayoutProps) {
  // Build inline style for CSS var overrides when custom primary color is set
  const style: React.CSSProperties = {};
  if (branding?.primaryColor) {
    const hsl = hexToCssHsl(branding.primaryColor);
    (style as Record<string, string>)["--primary"] = hsl;
  }

  return (
    <div style={style} className="min-h-screen flex flex-col bg-gray-50">
      {/* Header with logo */}
      {branding?.logoUrl && (
        <div className="flex justify-center pt-6 pb-2">
          <img
            src={branding.logoUrl}
            alt={branding?.brandName || ""}
            className="h-10 max-w-[200px] object-contain"
          />
        </div>
      )}

      {/* Page content */}
      <div className="flex-1 flex items-center justify-center p-4">
        {children}
      </div>

      {/* Footer */}
      {branding && !branding.poweredByHidden && (
        <div className="pb-4 text-center">
          <p className="text-xs text-gray-400">
            Powered by CallTone AI
          </p>
        </div>
      )}
    </div>
  );
}

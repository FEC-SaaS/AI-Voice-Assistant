"use client";

import { StarrySky } from "./starry-sky";
import { RotatingValueMessages } from "./rotating-value-messages";
import { AudioWave } from "@/components/marketing/audio-wave";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex">
      {/* Background layers */}
      <StarrySky />
      <AudioWave className="opacity-15" />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/90 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col lg:flex-row w-full min-h-screen">
        {/* LEFT: Brand + rotating value messages */}
        <div className="lg:w-1/2 flex flex-col items-center justify-center p-8 lg:p-12">
          <div className="flex flex-col items-center gap-6 max-w-md">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold gradient-text">
              CallTone
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground text-center">
              Voice Agents for Modern Business
            </p>
            <div className="mt-4 hidden sm:block">
              <RotatingValueMessages />
            </div>
          </div>
        </div>

        {/* RIGHT: Auth form */}
        <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-12">
          {children}
        </div>
      </div>
    </div>
  );
}

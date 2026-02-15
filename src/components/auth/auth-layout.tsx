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

      {/* Colorful floating orbs */}
      <div className="absolute top-[10%] left-[10%] w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-3xl animate-orb-1 pointer-events-none" />
      <div className="absolute top-[60%] right-[5%] w-[250px] h-[250px] bg-cyan-400/10 rounded-full blur-3xl animate-orb-2 pointer-events-none" />
      <div className="absolute bottom-[15%] left-[20%] w-[350px] h-[350px] bg-purple-500/8 rounded-full blur-3xl animate-orb-3 pointer-events-none" />
      <div className="absolute top-[30%] right-[15%] w-[200px] h-[200px] bg-pink-500/8 rounded-full blur-3xl animate-orb-1 pointer-events-none" style={{ animationDelay: "2s" }} />
      <div className="absolute bottom-[40%] left-[5%] w-[280px] h-[280px] bg-emerald-400/6 rounded-full blur-3xl animate-orb-2 pointer-events-none" style={{ animationDelay: "3s" }} />
      <div className="absolute top-[5%] right-[30%] w-[220px] h-[220px] bg-amber-400/6 rounded-full blur-3xl animate-orb-3 pointer-events-none" style={{ animationDelay: "1s" }} />

      {/* Gradient animated line accents */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-400 via-emerald-400 via-amber-400 via-pink-500 to-purple-500 animate-gradient-shift pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 via-amber-400 via-emerald-400 via-cyan-400 to-indigo-500 animate-gradient-shift pointer-events-none" />

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
            {/* Show on all screen sizes now (was hidden on mobile before) */}
            <div className="mt-4">
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

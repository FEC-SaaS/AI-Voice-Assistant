"use client";

import { useState, useEffect } from "react";

const MESSAGES = [
  "Your receptionist never takes a day off",
  "Turn every missed call into revenue",
  "Handle 100 calls at once — zero hold time",
  "Technology that sounds like your best employee",
  "Book appointments while you sleep",
  "Never put a caller on hold again",
  "Your phones answered in under one second",
  "Scale your team without hiring",
];

export function RotatingValueMessages() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % MESSAGES.length);
        setVisible(true);
      }, 500);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="h-16 flex items-center justify-center overflow-hidden">
        <p
          className={`text-lg sm:text-xl lg:text-2xl text-center font-medium text-white/80 transition-all duration-500 ${
            visible
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-3"
          }`}
        >
          &ldquo;{MESSAGES[index]}&rdquo;
        </p>
      </div>

      {/* Dot indicators */}
      <div className="flex gap-2">
        {MESSAGES.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === index
                ? "w-6 bg-primary"
                : "w-1.5 bg-white/25"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

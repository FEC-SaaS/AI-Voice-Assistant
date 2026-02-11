"use client";

import { useEffect, useRef } from "react";

interface Wave {
  color: string;
  frequency: number;
  amplitude: number;
  speed: number;
  opacity: number;
}

const WAVES: Wave[] = [
  { color: "#818CF8", frequency: 0.02, amplitude: 40, speed: 0.03, opacity: 0.4 },
  { color: "#22D3EE", frequency: 0.015, amplitude: 50, speed: 0.02, opacity: 0.3 },
  { color: "#F472B6", frequency: 0.025, amplitude: 35, speed: 0.04, opacity: 0.35 },
  { color: "#34D399", frequency: 0.018, amplitude: 45, speed: 0.025, opacity: 0.3 },
  { color: "#A78BFA", frequency: 0.022, amplitude: 38, speed: 0.035, opacity: 0.6 },
];

export function AudioWave() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Use fewer waves on mobile/low-end devices
    const isMobile = window.innerWidth < 768;
    const activeWaves = isMobile ? WAVES.slice(0, 3) : WAVES;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    resizeObserver.observe(canvas);

    const draw = () => {
      const width = canvas.getBoundingClientRect().width;
      const height = canvas.getBoundingClientRect().height;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      for (const wave of activeWaves) {
        ctx.beginPath();
        ctx.strokeStyle = wave.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = wave.opacity;

        for (let x = 0; x <= width; x++) {
          const y =
            centerY +
            Math.sin(x * wave.frequency + time * wave.speed) * wave.amplitude +
            Math.sin(x * wave.frequency * 0.5 + time * wave.speed * 1.5) *
              (wave.amplitude * 0.3);

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.stroke();
      }

      ctx.globalAlpha = 1;

      if (!prefersReducedMotion) {
        time += 1;
        animationId = requestAnimationFrame(draw);
      }
    };

    draw();

    // If reduced motion, just draw once statically
    if (prefersReducedMotion) {
      return () => {
        resizeObserver.disconnect();
      };
    }

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 h-[300px] w-full opacity-30 pointer-events-none"
      aria-hidden="true"
    />
  );
}

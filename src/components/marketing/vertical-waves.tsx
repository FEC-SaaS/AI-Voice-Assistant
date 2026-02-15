"use client";

import { useEffect, useRef } from "react";

interface Wave {
  color: string;
  frequency: number;
  amplitude: number;
  speed: number;
  opacity: number;
  lineWidth: number;
}

const WAVES: Wave[] = [
  { color: "#818CF8", frequency: 0.012, amplitude: 18, speed: 0.025, opacity: 0.7, lineWidth: 3 },
  { color: "#22D3EE", frequency: 0.009, amplitude: 22, speed: 0.018, opacity: 0.6, lineWidth: 2.5 },
  { color: "#F472B6", frequency: 0.015, amplitude: 15, speed: 0.032, opacity: 0.65, lineWidth: 3 },
  { color: "#34D399", frequency: 0.011, amplitude: 20, speed: 0.022, opacity: 0.6, lineWidth: 2.5 },
  { color: "#A78BFA", frequency: 0.013, amplitude: 17, speed: 0.028, opacity: 0.7, lineWidth: 3 },
  { color: "#FBBF24", frequency: 0.008, amplitude: 24, speed: 0.015, opacity: 0.5, lineWidth: 2 },
  { color: "#FB7185", frequency: 0.017, amplitude: 14, speed: 0.035, opacity: 0.55, lineWidth: 2 },
  { color: "#38BDF8", frequency: 0.01, amplitude: 21, speed: 0.02, opacity: 0.6, lineWidth: 2.5 },
];

/**
 * Renders vertical waves on the left and right sides of the page.
 * Waves flow vertically (top to bottom) and oscillate horizontally.
 */
export function VerticalWaves({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const isMobile = window.innerWidth < 768;
    const activeWaves = isMobile ? WAVES.slice(0, 4) : WAVES;
    const sideWidth = isMobile ? 40 : 60;

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

      ctx.clearRect(0, 0, width, height);

      // Draw waves on left side
      for (let i = 0; i < activeWaves.length; i++) {
        const wave = activeWaves[i]!;
        const centerX = sideWidth / 2;

        ctx.beginPath();
        ctx.lineWidth = wave.lineWidth;
        ctx.globalAlpha = wave.opacity;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Gradient that fades at top and bottom
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, wave.color + "00");
        gradient.addColorStop(0.1, wave.color);
        gradient.addColorStop(0.9, wave.color);
        gradient.addColorStop(1, wave.color + "00");
        ctx.strokeStyle = gradient;

        for (let y = 0; y <= height; y++) {
          const x =
            centerX +
            Math.sin(y * wave.frequency + time * wave.speed) * wave.amplitude +
            Math.sin(y * wave.frequency * 0.5 + time * wave.speed * 1.3) *
              (wave.amplitude * 0.4);

          if (y === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      // Draw waves on right side (mirrored)
      for (let i = 0; i < activeWaves.length; i++) {
        const wave = activeWaves[i]!;
        const centerX = width - sideWidth / 2;

        ctx.beginPath();
        ctx.lineWidth = wave.lineWidth;
        ctx.globalAlpha = wave.opacity;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, wave.color + "00");
        gradient.addColorStop(0.1, wave.color);
        gradient.addColorStop(0.9, wave.color);
        gradient.addColorStop(1, wave.color + "00");
        ctx.strokeStyle = gradient;

        for (let y = 0; y <= height; y++) {
          const x =
            centerX +
            Math.sin(y * wave.frequency + time * wave.speed + Math.PI) * wave.amplitude +
            Math.sin(y * wave.frequency * 0.5 + time * wave.speed * 1.3 + Math.PI) *
              (wave.amplitude * 0.4);

          if (y === 0) {
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
      className={`absolute inset-0 w-full h-full pointer-events-none ${className ?? "z-[2] opacity-70"}`}
      aria-hidden="true"
    />
  );
}

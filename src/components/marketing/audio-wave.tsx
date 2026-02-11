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
  { color: "#818CF8", frequency: 0.02, amplitude: 50, speed: 0.03, opacity: 0.6, lineWidth: 3 },
  { color: "#22D3EE", frequency: 0.015, amplitude: 60, speed: 0.02, opacity: 0.5, lineWidth: 2.5 },
  { color: "#F472B6", frequency: 0.025, amplitude: 45, speed: 0.04, opacity: 0.55, lineWidth: 3 },
  { color: "#34D399", frequency: 0.018, amplitude: 55, speed: 0.025, opacity: 0.5, lineWidth: 2.5 },
  { color: "#A78BFA", frequency: 0.022, amplitude: 48, speed: 0.035, opacity: 0.65, lineWidth: 3 },
  { color: "#FBBF24", frequency: 0.012, amplitude: 65, speed: 0.015, opacity: 0.4, lineWidth: 2 },
  { color: "#FB7185", frequency: 0.028, amplitude: 40, speed: 0.045, opacity: 0.45, lineWidth: 2 },
  { color: "#38BDF8", frequency: 0.016, amplitude: 58, speed: 0.022, opacity: 0.5, lineWidth: 2.5 },
];

export function AudioWave({ className }: { className?: string }) {
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
        ctx.lineWidth = wave.lineWidth;
        ctx.globalAlpha = wave.opacity;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Create gradient stroke effect
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, wave.color + "00");
        gradient.addColorStop(0.15, wave.color);
        gradient.addColorStop(0.85, wave.color);
        gradient.addColorStop(1, wave.color + "00");
        ctx.strokeStyle = gradient;

        for (let x = 0; x <= width; x++) {
          const y =
            centerY +
            Math.sin(x * wave.frequency + time * wave.speed) * wave.amplitude +
            Math.sin(x * wave.frequency * 0.5 + time * wave.speed * 1.5) *
              (wave.amplitude * 0.4) +
            Math.cos(x * wave.frequency * 0.3 + time * wave.speed * 0.7) *
              (wave.amplitude * 0.2);

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
      className={`absolute inset-0 z-0 w-full h-full pointer-events-none ${className ?? "opacity-40"}`}
      aria-hidden="true"
    />
  );
}

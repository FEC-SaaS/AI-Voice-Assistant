"use client";

import { useEffect, useRef } from "react";

const BAR_COLORS = [
  "#818CF8", // indigo
  "#22D3EE", // cyan
  "#F472B6", // pink
  "#34D399", // green
  "#A78BFA", // purple
  "#FBBF24", // amber
  "#FB7185", // rose
  "#38BDF8", // sky blue
  "#E879F9", // fuchsia
  "#2DD4BF", // teal
];

interface Bar {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  color: string;
  opacity: number;
  glowSize: number;
}

function createBar(canvasWidth: number, canvasHeight: number, randomY = false): Bar {
  const width = 3 + Math.random() * 5;
  return {
    x: Math.random() * canvasWidth,
    y: randomY ? Math.random() * canvasHeight : -(20 + Math.random() * 80),
    width,
    height: 20 + Math.random() * 60,
    speed: 0.4 + Math.random() * 1.2,
    color: BAR_COLORS[Math.floor(Math.random() * BAR_COLORS.length)] ?? "#818CF8",
    opacity: 0.15 + Math.random() * 0.35,
    glowSize: 4 + Math.random() * 8,
  };
}

/**
 * Vapi-style colorful bar graphs falling from top to bottom.
 * Thin vertical bars of different colors drift downward with a soft glow.
 */
export function FallingBars({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) return;

    let animationId: number;
    const isMobile = window.innerWidth < 768;
    const barCount = isMobile ? 20 : 40;

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

    const width = () => canvas.getBoundingClientRect().width;
    const height = () => canvas.getBoundingClientRect().height;

    const bars: Bar[] = Array.from({ length: barCount }, () =>
      createBar(width(), height(), true)
    );

    const draw = () => {
      const w = width();
      const h = height();
      ctx.clearRect(0, 0, w, h);

      for (const bar of bars) {
        // Move downward
        bar.y += bar.speed;

        // Reset when below canvas
        if (bar.y > h + bar.height + 10) {
          bar.y = -(bar.height + 10);
          bar.x = Math.random() * w;
        }

        // Draw glow
        ctx.shadowColor = bar.color;
        ctx.shadowBlur = bar.glowSize;
        ctx.globalAlpha = bar.opacity * 0.5;
        ctx.fillStyle = bar.color;

        // Draw rounded bar
        const radius = bar.width / 2;
        ctx.beginPath();
        ctx.moveTo(bar.x + radius, bar.y);
        ctx.lineTo(bar.x + bar.width - radius, bar.y);
        ctx.quadraticCurveTo(bar.x + bar.width, bar.y, bar.x + bar.width, bar.y + radius);
        ctx.lineTo(bar.x + bar.width, bar.y + bar.height - radius);
        ctx.quadraticCurveTo(bar.x + bar.width, bar.y + bar.height, bar.x + bar.width - radius, bar.y + bar.height);
        ctx.lineTo(bar.x + radius, bar.y + bar.height);
        ctx.quadraticCurveTo(bar.x, bar.y + bar.height, bar.x, bar.y + bar.height - radius);
        ctx.lineTo(bar.x, bar.y + radius);
        ctx.quadraticCurveTo(bar.x, bar.y, bar.x + radius, bar.y);
        ctx.closePath();
        ctx.fill();

        // Draw solid bar on top (brighter core)
        ctx.shadowBlur = 0;
        ctx.globalAlpha = bar.opacity;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className ?? "z-[1] opacity-60"}`}
      aria-hidden="true"
    />
  );
}

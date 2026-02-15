"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  offset: number;
  color: string;
}

const STAR_COLORS = [
  "#FFFFFF",
  "#F8F8FF",
  "#FFFAF0",
  "#818CF8", // indigo
  "#06B6D4", // cyan
  "#A855F6", // purple
  "#EC4899", // pink
  "#10B981", // emerald
  "#F59E0B", // amber
  "#E8E8F0",
  "#D4D4E8",
];

function createStars(count: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random(),
    size: 0.5 + Math.random() * 2.5,
    speed: 0.3 + Math.random() * 1.2,
    offset: Math.random() * Math.PI * 2,
    color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)] as string,
  }));
}

export function StarrySky() {
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
    const stars = createStars(isMobile ? 120 : 250);

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

      for (const star of stars) {
        const opacity = prefersReducedMotion
          ? 0.6
          : 0.2 + 0.8 * ((Math.sin(time * star.speed + star.offset) + 1) / 2);

        ctx.beginPath();
        ctx.arc(star.x * width, star.y * height, star.size, 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.globalAlpha = opacity;
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      if (!prefersReducedMotion) {
        time += 0.016;
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
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
}

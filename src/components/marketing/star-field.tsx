"use client";

import { useEffect, useRef } from "react";

const COLORS = [
  "#818CF8", // indigo
  "#22D3EE", // cyan
  "#F472B6", // pink
  "#34D399", // green
  "#A78BFA", // purple
  "#FBBF24", // amber
  "#FB7185", // rose
  "#38BDF8", // sky blue
];

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  color: string;
  swayOffset: number;
  swaySpeed: number;
  swayAmount: number;
}

function createParticle(width: number, height: number, randomY = false): Particle {
  return {
    x: Math.random() * width,
    y: randomY ? Math.random() * height : -Math.random() * height * 0.3,
    size: 1 + Math.random() * 2,
    speed: 0.3 + Math.random() * 0.7,
    opacity: 0.3 + Math.random() * 0.5,
    color: COLORS[Math.floor(Math.random() * COLORS.length)] ?? "#818CF8",
    swayOffset: Math.random() * Math.PI * 2,
    swaySpeed: 0.005 + Math.random() * 0.01,
    swayAmount: 15 + Math.random() * 25,
  };
}

export function StarField() {
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
    const particleCount = isMobile ? 30 : 60;

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

    // Initialize particles scattered across the canvas
    const particles: Particle[] = Array.from({ length: particleCount }, () =>
      createParticle(width(), height(), true)
    );

    let time = 0;

    const draw = () => {
      const w = width();
      const h = height();
      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        // Update position
        p.y += p.speed;
        const swayX = Math.sin(time * p.swaySpeed + p.swayOffset) * p.swayAmount;

        // Wrap around when falling below canvas
        if (p.y > h + 10) {
          p.y = -10;
          p.x = Math.random() * w;
        }

        const drawX = p.x + swayX;

        // Draw glow for larger particles
        if (p.size > 2) {
          ctx.beginPath();
          ctx.arc(drawX, p.y, p.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.opacity * 0.15;
          ctx.fill();
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(drawX, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      time += 1;
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
      className="absolute inset-0 z-[1] w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
}

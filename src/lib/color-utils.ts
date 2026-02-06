/**
 * Hex/HSL color conversion utilities for white-label theming
 */

export interface HSL {
  h: number;
  s: number;
  l: number;
}

/**
 * Convert hex color to HSL
 */
export function hexToHsl(hex: string): HSL {
  // Remove # if present
  hex = hex.replace(/^#/, "");

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360 * 10) / 10,
    s: Math.round(s * 100 * 10) / 10,
    l: Math.round(l * 100 * 10) / 10,
  };
}

/**
 * Convert HSL to CSS custom property string format: "H S% L%"
 */
export function hslToCssString(hsl: HSL): string {
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

/**
 * Convert hex color directly to CSS HSL string
 */
export function hexToCssHsl(hex: string): string {
  return hslToCssString(hexToHsl(hex));
}

/**
 * Generate appropriate foreground color (white or dark) based on luminance
 */
export function generateForegroundColor(hex: string): string {
  const hsl = hexToHsl(hex);
  // If the color is light, use dark foreground; otherwise use light
  if (hsl.l > 55) {
    return "222.2 47.4% 11.2%"; // dark foreground
  }
  return "210 40% 98%"; // light foreground
}

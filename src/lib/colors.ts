
import type { CmykColor } from "./grid";

export function cmykToRgb(c: number, m: number, y: number, k: number): { r: number; g: number; b: number } {
  const c_ = c / 100;
  const m_ = m / 100;
  const y_ = y / 100;
  const k_ = k / 100;

  const r = 255 * (1 - c_) * (1 - k_);
  const g = 255 * (1 - m_) * (1 - k_);
  const b = 255 * (1 - y_) * (1 - k_);

  return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
}

export function rgbToCmyk(r: number, g: number, b: number): CmykColor {
    if (r === 0 && g === 0 && b === 0) {
        return { c: 0, m: 0, y: 0, k: 100 };
    }

    let c = 1 - (r / 255);
    let m = 1 - (g / 255);
    let y = 1 - (b / 255);

    const minCmy = Math.min(c, m, y);
    
    if (1 - minCmy === 0) {
      return { c: 0, m: 0, y: 0, k: 100 };
    }

    c = (c - minCmy) / (1 - minCmy);
    m = (m - minCmy) / (1 - minCmy);
    y = (y - minCmy) / (1 - minCmy);
    const k = minCmy;

    return {
        c: Math.round(c * 100),
        m: Math.round(m * 100),
        y: Math.round(y * 100),
        k: Math.round(k * 100),
    };
}

export function getTextColorForBackground(r: number, g: number, b: number): string {
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

function componentToHex(c: number): string {
    const hex = Math.round(c).toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

export function rgbToHex(r: number, g: number, b: number): string {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

// Simple euclidean distance, not perceptually uniform
export function rgbDistance(rgb1: { r: number; g: number; b: number }, rgb2: { r: number; g: number; b: number }): number {
    const rDiff = rgb1.r - rgb2.r;
    const gDiff = rgb1.g - rgb2.g;
    const bDiff = rgb1.b - rgb2.b;
    return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
}


// --- Advanced Color Difference Calculations ---

function rgbToXyz(r: number, g: number, b: number) {
    let r_ = r / 255;
    let g_ = g / 255;
    let b_ = b / 255;

    r_ = r_ > 0.04045 ? Math.pow((r_ + 0.055) / 1.055, 2.4) : r_ / 12.92;
    g_ = g_ > 0.04045 ? Math.pow((g_ + 0.055) / 1.055, 2.4) : g_ / 12.92;
    b_ = b_ > 0.04045 ? Math.pow((b_ + 0.055) / 1.055, 2.4) : b_ / 12.92;

    r_ *= 100;
    g_ *= 100;
    b_ *= 100;

    // Observer. = 2°, Illuminant = D65
    const x = r_ * 0.4124 + g_ * 0.3576 + b_ * 0.1805;
    const y = r_ * 0.2126 + g_ * 0.7152 + b_ * 0.0722;
    const z = r_ * 0.0193 + g_ * 0.1192 + b_ * 0.9505;

    return { x, y, z };
}

function xyzToLab(x: number, y: number, z: number) {
    // Observer= 2°, Illuminant= D65
    let x_ = x / 95.047;
    let y_ = y / 100.000;
    let z_ = z / 108.883;

    x_ = x_ > 0.008856 ? Math.pow(x_, 1/3) : (7.787 * x_) + (16 / 116);
    y_ = y_ > 0.008856 ? Math.pow(y_, 1/3) : (7.787 * y_) + (16 / 116);
    z_ = z_ > 0.008856 ? Math.pow(z_, 1/3) : (7.787 * z_) + (16 / 116);

    const l = (116 * y_) - 16;
    const a = 500 * (x_ - y_);
    const b = 200 * (y_ - z_);
    
    return { l, a, b };
}

export function cmykToLab(cmyk: CmykColor): {l: number, a: number, b: number} {
    const rgb = cmykToRgb(cmyk.c, cmyk.m, cmyk.y, cmyk.k);
    const xyz = rgbToXyz(rgb.r, rgb.g, rgb.b);
    return xyzToLab(xyz.x, xyz.y, xyz.z);
}

/**
 * Calculates the perceptual distance between two colors in LAB space.
 * Uses the CIE76 formula.
 * @returns {number} A value where < 1.0 is not perceptible, 1-2 is perceptible through close observation, 2-10 is perceptible at a glance.
 */
export function deltaE(lab1: {l: number, a: number, b: number}, lab2: {l: number, a: number, b: number}): number {
    const deltaL = lab1.l - lab2.l;
    const deltaA = lab1.a - lab2.a;
    const deltaB = lab1.b - lab2.b;
    return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
}

/**
 * DEPRECATED: Simple manhattan distance, not perceptually uniform. Use deltaE for better results.
 * @deprecated
 */
export function cmykDistance(color1: CmykColor, color2: CmykColor): number {
  return (
    Math.abs(color1.c - color2.c) +
    Math.abs(color1.m - color2.m) +
    Math.abs(color1.y - color2.y) +
    Math.abs(color1.k - color2.k)
  );
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) {
        r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
        r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
        r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
        r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
        r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
        r = c; g = 0; b = x;
    }
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return { r, g, b };
}

export function cmykToHsl(cmyk: CmykColor): { h: number; s: number; l: number } {
    const rgb = cmykToRgb(cmyk.c, cmyk.m, cmyk.y, cmyk.k);
    return rgbToHsl(rgb.r, rgb.g, rgb.b);
}


export function softProofCmyk(cmyk: CmykColor): CmykColor {
  // Step 1: Convert original CMYK to its ideal screen RGB
  const originalRgb = cmykToRgb(cmyk.c, cmyk.m, cmyk.y, cmyk.k);

  // Step 2: Convert RGB to HSL to check for out-of-gamut saturation
  let { h, s, l } = rgbToHsl(originalRgb.r, originalRgb.g, originalRgb.b);
  
  // Step 3: Simulate gamut compression by clamping saturation.
  // This is a simplified heuristic. Highly saturated colors are pulled back.
  const saturationThreshold = 90; // colors with >90% saturation
  const saturationClamp = 85; // will be clamped to 85%

  if (s > saturationThreshold) {
    s = saturationClamp;
  }
  
  // Step 4: Convert the potentially modified HSL back to RGB
  const clippedRgb = hslToRgb(h, s, l);

  // Step 5: Convert the gamut-clipped RGB value back to CMYK for the final simulation
  return rgbToCmyk(clippedRgb.r, clippedRgb.g, clippedRgb.b);
}

export function extractDominantColors(canvas: HTMLCanvasElement, maxColors: number = 6): { r: number, g: number, b: number, x: number, y: number }[] {
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];
    
    const scale = Math.min(1, 100 / Math.max(canvas.width, canvas.height));
    const width = Math.floor(canvas.width * scale);
    const height = Math.floor(canvas.height * scale);
    
    const offCanvas = document.createElement('canvas');
    offCanvas.width = width;
    offCanvas.height = height;
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) return [];
    
    offCtx.drawImage(canvas, 0, 0, width, height);
    const imageData = offCtx.getImageData(0, 0, width, height).data;
    
    const colorCounts = new Map<string, { r: number, g: number, b: number, x: number, y: number, count: number }>();
    const binSize = 16;
    
    for (let i = 0; i < imageData.length; i += 4) {
        const r = imageData[i];
        const g = imageData[i+1];
        const b = imageData[i+2];
        const a = imageData[i+3];
        
        if (a < 128) continue;
        
        const isWhite = r > 250 && g > 250 && b > 250;
        const isBlack = r < 5 && g < 5 && b < 5;
        if (isWhite || isBlack) continue;
        
        const rBin = Math.floor(r / binSize) * binSize + Math.floor(binSize / 2);
        const gBin = Math.floor(g / binSize) * binSize + Math.floor(binSize / 2);
        const bBin = Math.floor(b / binSize) * binSize + Math.floor(binSize / 2);
        
        const key = `${rBin},${gBin},${bBin}`;
        if (colorCounts.has(key)) {
            colorCounts.get(key)!.count++;
        } else {
            const pixelIndex = i / 4;
            const x = (pixelIndex % width) / width;
            const y = Math.floor(pixelIndex / width) / height;
            colorCounts.set(key, { r: rBin, g: gBin, b: bBin, x, y, count: 1 });
        }
    }
    
    const totalPixels = imageData.length / 4;
    const threshold = Math.max(2, Math.floor(totalPixels * 0.001)); // 0.1% threshold, min 2 pixels
    
    const sortedColors = Array.from(colorCounts.values())
        .filter(c => c.count >= threshold)
        .sort((a, b) => b.count - a.count);
    
    const distinctColors: { r: number, g: number, b: number, x: number, y: number }[] = [];
    for (const color of sortedColors) {
        if (distinctColors.length >= maxColors) break;
        
        let isDistinct = true;
        for (const selected of distinctColors) {
            const dist = rgbDistance(color, selected);
            if (dist < 50) {
                isDistinct = false;
                break;
            }
        }
        if (isDistinct) {
            distinctColors.push({ r: color.r, g: color.g, b: color.b, x: color.x, y: color.y });
        }
    }
    
    return distinctColors;
}

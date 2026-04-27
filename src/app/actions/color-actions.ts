
'use server';

import type { PantoneColor } from '@/lib/pantone';
import { pantoneColors } from '@/lib/pantone';
import type { VinylColor } from '@/lib/vinyl';
import { vinylColors } from '@/lib/vinyl';
import { cmykToLab, rgbToCmyk, deltaE } from '@/lib/colors';

export async function searchCMPToneColors(searchTerm: string): Promise<PantoneColor[]> {
  if (!searchTerm) {
    return [];
  }
  const normalizedSearchTerm = searchTerm.toLowerCase().replace("pantone", "cmptone");
  return pantoneColors.filter(color =>
    `${color.name} ${color.number}`.toLowerCase().includes(normalizedSearchTerm)
  ).slice(0, 50);
}

export async function findClosestCMPTone(rgb: {r: number, g: number, b: number}): Promise<PantoneColor | null> {
    if (!rgb) return null;
    let bestMatch: PantoneColor | null = null;
    let minDistance = Infinity;

    const lab1 = cmykToLab(rgbToCmyk(rgb.r, rgb.g, rgb.b));

    for (const pantone of pantoneColors) {
        const lab2 = cmykToLab(pantone.cmyk);
        const distance = deltaE(lab1, lab2);

        if (distance < minDistance) {
            minDistance = distance;
            bestMatch = pantone;
        }
    }
    return bestMatch;
}

export async function searchVinylColors(searchTerm: string): Promise<VinylColor[]> {
  if (!searchTerm) {
    return [];
  }
  const lowercasedTerm = searchTerm.toLowerCase();
  return vinylColors.filter(color =>
    `${color.manufacturer} ${color.name} ${color.number}`.toLowerCase().includes(lowercasedTerm)
  ).slice(0, 50);
}

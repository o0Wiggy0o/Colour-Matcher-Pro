
'use server';
/**
 * @fileOverview An AI flow to generate a grid of subtle color variations.
 *
 * - generateSimilarColors - A function that creates a grid of colors similar to a base color.
 * - GenerateSimilarColorsInput - The input type for the function.
 * - GenerateSimilarColorsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import type {GenerateSimilarColorsInput, GenerateSimilarColorsOutput} from '@/lib/types';

const CmykColorSchema = z.object({
  c: z.number().min(0).max(100),
  m: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  k: z.number().min(0).max(100),
});

const GenerateSimilarColorsInputSchema = z.object({
  baseColor: CmykColorSchema.describe('The base CMYK color to generate variations from.'),
  gridSize: z.number().min(3).max(15).describe('The size of the grid (e.g., 9 for a 9x9 grid).'),
  variationLevel: z.number().min(1).max(10).describe('How much the colors should vary from the base color. 1 is very subtle, 10 is more noticeable.'),
});

const GenerateSimilarColorsOutputSchema = z.object({
    grid: z.array(z.array(CmykColorSchema)).describe('A 2D array representing the color grid.'),
});

export async function generateSimilarColors(input: GenerateSimilarColorsInput): Promise<GenerateSimilarColorsOutput> {
  return generateSimilarColorsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSimilarColorsPrompt',
  input: {schema: GenerateSimilarColorsInputSchema},
  output: {schema: GenerateSimilarColorsOutputSchema},
  prompt: `You are a meticulous print color expert AI. Your task is to generate a {{gridSize}}x{{gridSize}} grid of unique CMYK color variations based on a central color.

The user has provided a base color: C{{baseColor.c}} M{{baseColor.m}} Y{{baseColor.y}} K{{baseColor.k}}. This base color MUST be the exact center of the generated grid.

The user has specified a variation level of {{variationLevel}} on a scale of 1 to 10.
- A variation level of 1 means changes between adjacent colors are extremely subtle (e.g., changing a single CMYK value by just 1).
- A variation level of 10 means changes are more pronounced, creating a wider range of colors.

Generate a grid of colors where each cell is a subtle variation of the base color. You must intelligently adjust all four CMYK values (C, M, Y, and K) for each cell to create a smooth and visually coherent gradient of colors expanding outwards from the center.

**CRITICAL INSTRUCTIONS:**
1.  **Unique Colors:** Every single color swatch in the grid must be unique. Do not repeat CMYK value combinations.
2.  **JSON Output:** The output MUST be a JSON object with a single key 'grid'.
3.  **Grid Dimensions:** The 'grid' value must be a 2D array of exactly {{gridSize}} rows and {{gridSize}} columns.
4.  **Complete Color Objects:** EVERY single color object within the grid MUST contain all four integer keys: "c", "m", "y", and "k".
5.  **Valid CMYK Values:** All CMYK values must be integers between 0 and 100 inclusive. Do not generate incomplete objects or out-of-range values.

For example, for a 3x3 grid, the base color is at \`grid[1][1]\`. The surrounding colors should be distinct variations.

Now, generate the full {{gridSize}}x{{gridSize}} grid based on the user's request, ensuring a diverse yet coherent set of unique colors.`,
});

const generateSimilarColorsFlow = ai.defineFlow(
  {
    name: 'generateSimilarColorsFlow',
    inputSchema: GenerateSimilarColorsInputSchema,
    outputSchema: GenerateSimilarColorsOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);

    
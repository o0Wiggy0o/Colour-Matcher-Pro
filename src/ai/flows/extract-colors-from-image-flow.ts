
'use server';
/**
 * @fileOverview An AI flow to extract a color palette from a raster image.
 *
 * - extractColorsFromImage - A function that analyzes an image and returns a palette.
 * - ExtractColorsFromImageInput - The input type for the function.
 * - ExtractColorsFromImageOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import type { ExtractColorsFromImageInput, ExtractColorsFromImageOutput } from '@/lib/types';

const CmykColorSchema = z.object({
  c: z.number().min(0).max(100).describe('Cyan value (0-100)'),
  m: z.number().min(0).max(100).describe('Magenta value (0-100)'),
  y: z.number().min(0).max(100).describe('Yellow value (0-100)'),
  k: z.number().min(0).max(100).describe('Key (black) value (0-100)'),
});

const ExtractColorsFromImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
  paletteSize: z.number().min(3).max(12).optional().default(8),
});

const ExtractColorsFromImageOutputSchema = z.object({
  palette: z.array(CmykColorSchema).describe('An array of the most prominent and representative CMYK colors found in the image. If no clear colors are found, return an empty array.'),
});

export async function extractColorsFromImage(input: ExtractColorsFromImageInput): Promise<ExtractColorsFromImageOutput> {
  return extractColorsFromImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractColorsFromImagePrompt',
  input: {schema: ExtractColorsFromImageInputSchema},
  output: {schema: ExtractColorsFromImageOutputSchema},
  prompt: `You are an expert color palette generator for print and digital design. Your task is to analyze the provided image and extract a harmonious and representative color palette.

**CRITICAL INSTRUCTIONS:**
1.  **Analyze the Image:** Identify the most dominant and complementary colors in the image. Do not just pick random pixels; find colors that define the image's mood and subject.
2.  **Palette Size:** Generate a palette of exactly {{{paletteSize}}} unique colors.
3.  **Convert to CMYK:** Convert every color into its CMYK equivalent. All CMYK values must be integers between 0 and 100.
4.  **JSON Output:** The output MUST be a valid JSON object with a single key 'palette'.
5.  **Palette Array:** The 'palette' value must be an array of CMYK color objects.
6.  **Complete Color Objects:** EVERY color object within the 'palette' array MUST contain all four integer keys: "c", "m", "y", and "k".
7.  **No Empty Palettes:** You must always return a palette of the requested size.

Photo to analyze: {{media url=photoDataUri}}

Now, generate the JSON output based on your analysis.`,
});

const extractColorsFromImageFlow = ai.defineFlow(
  {
    name: 'extractColorsFromImageFlow',
    inputSchema: ExtractColorsFromImageInputSchema,
    outputSchema: ExtractColorsFromImageOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);

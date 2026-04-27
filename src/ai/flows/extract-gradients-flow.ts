
'use server';
/**
 * @fileOverview An AI flow to detect prominent gradients in an image.
 *
 * - extractGradients - A function that analyzes an image and returns a list of gradients.
 * - ExtractGradientsInput - The input type for the function.
 * - ExtractGradientsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import type { ExtractGradientsInput, ExtractGradientsOutput } from '@/lib/types';

const CmykColorSchema = z.object({
  c: z.number().min(0).max(100).describe('Cyan value (0-100)'),
  m: z.number().min(0).max(100).describe('Magenta value (0-100)'),
  y: z.number().min(0).max(100).describe('Yellow value (0-100)'),
  k: z.number().min(0).max(100).describe('Key (black) value (0-100)'),
});

const GradientSchema = z.object({
    stops: z.array(CmykColorSchema).min(2).describe('An array of at least two CMYK color stops that form the linear gradient in order.'),
    description: z.string().describe('A brief, one-sentence description of where the gradient is located in the image (e.g., "Sky transition from light blue to pale yellow at the horizon.").'),
});

const ExtractGradientsInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});

const ExtractGradientsOutputSchema = z.object({
  gradients: z.array(GradientSchema).describe('An array of the most prominent linear gradients found in the image. Return up to 5 of the most distinct gradients. If no clear gradients are found, return an empty array.'),
});

export async function extractGradients(input: ExtractGradientsInput): Promise<ExtractGradientsOutput> {
  return extractGradientsFlow(input);
}


const prompt = ai.definePrompt({
  name: 'extractGradientsPrompt',
  input: {schema: ExtractGradientsInputSchema},
  output: {schema: ExtractGradientsOutputSchema},
  prompt: `You are an expert in print design and color theory. Analyze the provided image to identify the most prominent linear gradients. Gradients can be simple two-color transitions or complex multi-step color fades.

Your task is to identify up to 5 of the most distinct and significant gradients. For each gradient, you must determine its series of color stops as an array of CMYK values. Also provide a short, descriptive sentence about where the gradient appears in the image.

**CRITICAL INSTRUCTIONS:**
1.  **Analyze the Image:** Look for smooth transitions between colors across significant areas. A single gradient may involve multiple distinct colors (e.g., a sunset fading from orange to purple to deep blue).
2.  **Identify Color Stops:** For each gradient, provide an ordered array of CMYK color values in the 'stops' field. Each array must contain at least two colors.
3.  **JSON Output:** The output MUST be a valid JSON object with a single key 'gradients'.
4.  **Gradient Array:** The 'gradients' value must be an array of gradient objects.
5.  **Complete Color Objects:** EVERY color object within the 'stops' array MUST contain all four integer keys: "c", "m", "y", and "k", with values between 0 and 100.
6.  **Description:** Each gradient object must include a 'description' string.
7.  **Limit Results:** Return a maximum of 5 gradients. If you find fewer, that is acceptable. If no significant linear gradients are found, return an empty 'gradients' array.

Photo to analyze: {{media url=photoDataUri}}

Now, generate the JSON output based on your analysis.`,
});

const extractGradientsFlow = ai.defineFlow(
  {
    name: 'extractGradientsFlow',
    inputSchema: ExtractGradientsInputSchema,
    outputSchema: ExtractGradientsOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);

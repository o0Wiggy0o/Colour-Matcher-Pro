
'use server';
/**
 * @fileOverview An AI flow to extract all unique colors from an SVG file.
 *
 * - extractSvgColors - A function that analyzes SVG text and returns a list of colors.
 * - ExtractSvgColorsInput - The input type for the function.
 * - ExtractSvgColorsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import type { ExtractSvgColorsInput, ExtractSvgColorsOutput } from '@/lib/types';

const CmykColorSchema = z.object({
  c: z.number().min(0).max(100).describe('Cyan value (0-100)'),
  m: z.number().min(0).max(100).describe('Magenta value (0-100)'),
  y: z.number().min(0).max(100).describe('Yellow value (0-100)'),
  k: z.number().min(0).max(100).describe('Key (black) value (0-100)'),
});

const ExtractSvgColorsInputSchema = z.object({
  svgContent: z.string().describe("The full text content of an SVG file."),
});

const ExtractSvgColorsOutputSchema = z.object({
  palette: z.array(CmykColorSchema).describe('An array of all the unique CMYK colors found in the SVG. If no valid colors are found, return an empty array.'),
});


export async function extractSvgColors(input: ExtractSvgColorsInput): Promise<ExtractSvgColorsOutput> {
  return extractSvgColorsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractSvgColorsPrompt',
  input: {schema: ExtractSvgColorsInputSchema},
  output: {schema: ExtractSvgColorsOutputSchema},
  prompt: `You are an expert utility for parsing SVG file content to extract color information for sign-making and graphic design.

Your task is to thoroughly analyze the provided SVG file content. You must identify every unique color specified in any 'fill' or 'stroke' attributes within the SVG code.

**CRITICAL INSTRUCTIONS:**
1.  **Parse SVG:** Scan the entire SVG content for 'fill="..."' and 'stroke="..."' attributes.
2.  **Extract Colors:** Extract the color value from these attributes. The value can be a named color (e.g., "red", "blue"), a hex code (e.g., "#FF0000", "#f00"), or an rgb value (e.g., "rgb(255,0,0)").
3.  **Ignore Non-Colors:** You MUST ignore any values that are not actual colors, such as "none", "transparent", "currentColor", or URL references like "url(#gradient)".
4.  **Convert to CMYK:** Convert every valid color you find into its CMYK equivalent. All CMYK values must be integers between 0 and 100.
5.  **Ensure Uniqueness:** The final output must only contain unique colors. If the same color (e.g., "#FF0000" and "red") appears multiple times, it should only be included once in the output.
6.  **JSON Output:** The output MUST be a valid JSON object with a single key 'palette'.
7.  **Palette Array:** The 'palette' value must be an array of CMYK color objects.
8.  **Complete Color Objects:** EVERY color object within the 'palette' array MUST contain all four integer keys: "c", "m", "y", and "k".
9.  **Handle Empty Cases:** If no valid, solid colors are found in the SVG, return an empty 'palette' array.

SVG Content to analyze:
\`\`\`xml
{{{svgContent}}}
\`\`\`

Now, generate the JSON output based on your analysis.`,
});

const extractSvgColorsFlow = ai.defineFlow(
  {
    name: 'extractSvgColorsFlow',
    inputSchema: ExtractSvgColorsInputSchema,
    outputSchema: ExtractSvgColorsOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);

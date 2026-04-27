
'use server';
/**
 * @fileOverview An AI flow to suggest proportional color updates across different jobs.
 *
 * - suggestColorUpdate - A function that analyzes a color change and suggests updates for similar colors.
 * - SuggestColorUpdateInput - The input type for the function.
 * - SuggestColorUpdateOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { SuggestColorUpdateInput, SuggestColorUpdateOutput } from '@/lib/types';

const CmykColorSchema = z.object({
  c: z.number().min(0).max(100),
  m: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  k: z.number().min(0).max(100),
});

const JobColorSchema = z.object({
    id: z.string(),
    cmyk: CmykColorSchema,
    timestamp: z.string(),
    notes: z.string().optional(),
    printerId: z.string().optional(),
    media: z.string().optional(),
    gracol: z.boolean().optional(),
    fogra: z.boolean().optional(),
});

const JobSchema = z.object({
    id: z.string(),
    name: z.string(),
    colors: z.array(JobColorSchema)
});

const SuggestColorUpdateInputSchema = z.object({
  sourceJobId: z.string(),
  sourceJobName: z.string(),
  colorBefore: JobColorSchema,
  colorAfter: JobColorSchema,
  allJobs: z.array(JobSchema),
});

const SuggestedChangeSchema = z.object({
    jobId: z.string().describe("The ID of the job where the similar color was found."),
    jobName: z.string().describe("The name of the job where the similar color was found."),
    originalColor: JobColorSchema.describe("The original color object that was found to be similar."),
    suggestedCmyk: CmykColorSchema.describe("The new CMYK values suggested for this color."),
});

const SuggestColorUpdateOutputSchema = z.object({
  suggestions: z.array(SuggestedChangeSchema).describe("An array of suggested updates for visually similar colors in other jobs."),
});


export async function suggestColorUpdate(input: SuggestColorUpdateInput): Promise<SuggestColorUpdateOutput> {
  return suggestColorUpdateFlow(input);
}


const prompt = ai.definePrompt({
  name: 'suggestColorUpdatePrompt',
  input: { schema: SuggestColorUpdateInputSchema },
  output: { schema: SuggestColorUpdateOutputSchema },
  prompt: `You are a color expert AI for a professional print application. A user has just updated a color in one of their jobs, and your task is to suggest proportional updates for similar colors in OTHER jobs.

**Context:**
- The user is working in a job named "{{sourceJobName}}" (ID: {{sourceJobId}}).
- They changed a color from CMYK({{{colorBefore.cmyk.c}}}, {{{colorBefore.cmyk.m}}}, {{{colorBefore.cmyk.y}}}, {{{colorBefore.cmyk.k}}}) to CMYK({{{colorAfter.cmyk.c}}}, {{{colorAfter.cmyk.m}}}, {{{colorAfter.cmyk.y}}}, {{{colorAfter.cmyk.k}}}).
- This change was made on a printer identified as: "{{{colorAfter.printerId}}}".

**Your Task:**
1.  **Iterate through all jobs provided in \`allJobs\`**. You MUST IGNORE the source job ("{{sourceJobName}}").
2.  Within each other job, iterate through its 'colors' array.
3.  **Printer Matching Logic:**
    - If the updated color has a specific \`printerId\` (i.e., "{{{colorAfter.printerId}}}" is not empty), you MUST only consider colors in other jobs that have the **exact same \`printerId\`**.
    - If the updated color's \`printerId\` is empty, you should consider ALL colors in other jobs, regardless of their \`printerId\`.
4.  If the printer context matches (or is not applicable), determine if the color is **visually similar** to the user's *original* color (CMYK({{{colorBefore.cmyk.c}}}, {{{colorBefore.cmyk.m}}}, {{{colorBefore.cmyk.y}}}, {{{colorBefore.cmyk.k}}})). Use a perceptual color difference (like Delta E) in your reasoning. A small difference (e.g., < 10) indicates a similar color.
5.  If a color is similar, calculate a **proportional update**. Apply a similar *delta* (change) to its CMYK values as the user applied to the source color. For example, if the user added +5 Cyan and -3 Black, apply a similar change to the target color's C and K values.
6.  The new suggested CMYK values MUST be integers between 0 and 100.

**JSON Output:**
- Your final output must be a valid JSON object with a single key, "suggestions".
- "suggestions" must be an array of suggestion objects.
- Each suggestion object must contain the \`jobId\`, \`jobName\`, the full \`originalColor\` object you found, and the new \`suggestedCmyk\` values.
- If no similar colors are found in other jobs, return an empty "suggestions" array.

**Full Job Data:**
\`\`\`json
{{{json allJobs}}}
\`\`\`

Now, generate the JSON output with your suggestions.`,
});

const suggestColorUpdateFlow = ai.defineFlow(
  {
    name: 'suggestColorUpdateFlow',
    inputSchema: SuggestColorUpdateInputSchema,
    outputSchema: SuggestColorUpdateOutputSchema,
  },
  async (input) => {
    // The prompt is now responsible for ignoring the source job.
    // We send all jobs to give the AI full context.
    const { output } = await prompt(input);
    
    // The output from the AI is already in the correct format.
    // Return it directly or an empty array if it's null/undefined.
    return output || { suggestions: [] };
  }
);
    

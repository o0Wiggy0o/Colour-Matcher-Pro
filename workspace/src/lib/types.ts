
import type { CmykColor } from './grid';
import type { GridFormValues } from '@/components/grid-generator';

// Data Structures for the Colour Tracker
export interface JobColor {
  id: string;
  cmyk: CmykColor;
  timestamp: string;
  notes?: string;
  printerId?: string;
  media?: string;
  gracol?: boolean;
  fogra?: boolean;
}
export interface Job {
  id: string;
  name: string;
  // colors will be a subcollection, so we don't store it on the job document
}

export interface ColorSuggestion {
  jobId: string;
  jobName: string;
  originalColor: JobColor;
  suggestedCmyk: CmykColor;
  // Details for context
  sourceJobName: string;
  sourceColorBefore: JobColor;
  sourceColorAfter: JobColor;
}

// AI Flow Types

// generate-similar-colors-flow
export interface GenerateSimilarColorsInput {
  baseColor: CmykColor;
  gridSize: number;
  variationLevel: number;
}
export interface GenerateSimilarColorsOutput {
  grid: CmykColor[][];
}

// extract-colors-from-image-flow
export interface ExtractColorsFromImageInput {
    photoDataUri: string;
    paletteSize?: number;
}
export interface ExtractColorsFromImageOutput {
    palette: CmykColor[];
}

// extract-gradients-flow
export interface Gradient {
    stops: CmykColor[];
    description: string;
}
export interface ExtractGradientsInput {
    photoDataUri: string;
}
export interface ExtractGradientsOutput {
    gradients: Gradient[];
}

// extract-svg-colors-flow
export interface ExtractSvgColorsInput {
    svgContent: string;
}
export interface ExtractSvgColorsOutput {
    palette: CmykColor[];
}

// suggest-color-update-flow
export interface SuggestColorUpdateInput {
    sourceJobId: string;
    sourceJobName: string;
    colorBefore: JobColor;
    colorAfter: JobColor;
    allJobs: (Job & { colors: JobColor[] })[];
}
export interface Suggestion {
    jobId: string;
    jobName: string;
    originalColor: JobColor;
    suggestedCmyk: CmykColor;
}
export interface SuggestColorUpdateOutput {
    suggestions: Suggestion[];
}

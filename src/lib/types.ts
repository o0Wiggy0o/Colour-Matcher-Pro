
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

export interface PantoneColor {
  name: string;
  cmyk: CmykColor;
}

export interface ColorHistoryItem {
  id: string;
  cmyk: CmykColor;
  timestamp: number;
}

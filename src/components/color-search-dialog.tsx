
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cmykToRgb, rgbToHex, cmykToLab, deltaE } from "@/lib/colors";
import type { Job, JobColor } from '@/lib/types';
import { useFirestore } from "@/firebase";
import { collection, query, getDocs } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ColorSearchResult {
  jobName: string;
  color: JobColor;
  distance: number;
}

interface ColorSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceColor: JobColor | null;
  jobs: Job[];
}

const SourceColorDisplay = ({ color }: { color: JobColor }) => {
    const { r, g, b } = cmykToRgb(color.cmyk.c, color.cmyk.m, color.cmyk.y, color.cmyk.k);
    const hex = rgbToHex(r, g, b);
    return (
        <div className="flex gap-4 items-center p-4 rounded-lg bg-muted">
            <div className="w-16 h-16 rounded-md border shrink-0" style={{ backgroundColor: hex }} />
            <div className="text-sm font-mono">
                <p className="font-bold text-base">Source Color</p>
                <p>C{color.cmyk.c} M{color.cmyk.m} Y{color.cmyk.y} K{color.cmyk.k}</p>
                <p>{hex.toUpperCase()}</p>
            </div>
        </div>
    );
};

const ResultEntry = ({ result }: { result: ColorSearchResult }) => {
    const { color, jobName, distance } = result;
    const { r, g, b } = cmykToRgb(color.cmyk.c, color.cmyk.m, color.cmyk.y, color.cmyk.k);
    const hex = rgbToHex(r, g, b);

    return (
        <div className="p-3 border rounded-lg flex gap-4 items-start">
            <div className="w-12 h-12 rounded-md border shrink-0" style={{ backgroundColor: hex }} />
            <div className="flex-grow space-y-1 text-xs">
                <p className="font-bold">{jobName}</p>
                <p className="font-mono text-muted-foreground">CMYK: C{color.cmyk.c} M{color.cmyk.m} Y{color.cmyk.y} K{color.cmyk.k}</p>
                <p className="text-muted-foreground">ΔE: {distance.toFixed(2)}</p>
            </div>
        </div>
    )
}

export function ColorSearchDialog({ open, onOpenChange, sourceColor, jobs }: ColorSearchDialogProps) {
  const [results, setResults] = useState<ColorSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const firestore = useFirestore();

  useEffect(() => {
    if (!open || !sourceColor || !user || !firestore) {
      setResults([]);
      return;
    }

    const findSimilarColors = async () => {
        setIsLoading(true);
        const allColors: { jobName: string; color: JobColor }[] = [];

        for (const job of jobs) {
            const colorsCollectionRef = collection(firestore, 'users', user.uid, 'jobs', job.id, 'colors');
            const colorsSnapshot = await getDocs(colorsCollectionRef);
            colorsSnapshot.forEach(doc => {
                const colorData = { id: doc.id, ...doc.data() } as JobColor;
                if (colorData.id !== sourceColor.id) {
                    allColors.push({ jobName: job.name, color: colorData });
                }
            });
        }
        
        const sourceLab = cmykToLab(sourceColor.cmyk);

        const calculatedResults = allColors
        .map(item => ({
            ...item,
            distance: deltaE(sourceLab, cmykToLab(item.color.cmyk)),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10); // Limit to top 10 results

        setResults(calculatedResults);
        setIsLoading(false);
    }
    
    findSimilarColors();

  }, [open, sourceColor, jobs, user, firestore]);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Similar Colors</DialogTitle>
          <DialogDescription>
            Showing colors from all jobs that are visually similar to your selection. (ΔE is the perceptual color difference).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
            {sourceColor && <SourceColorDisplay color={sourceColor} />}
            
            <ScrollArea className="h-72">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground pt-10">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Searching all jobs...
                    </div>
                ) : (
                    <div className="space-y-3 pr-4">
                        {results.length > 0 ? (
                            results.map(result => (
                                <ResultEntry key={result.color.id} result={result} />
                            ))
                        ) : (
                            <div className="flex items-center justify-center h-full text-sm text-muted-foreground pt-10">
                                No similar colors found in other jobs.
                            </div>
                        )}
                    </div>
                )}
            </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

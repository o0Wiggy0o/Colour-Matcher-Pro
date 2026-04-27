
"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Droplets, Palette, Loader2, Lock, Sun, Moon, FileJson, Table, FileText, AlertCircle, Printer, HelpCircle, FileDown, Info, SlidersHorizontal, Settings, Grid, History, Plus, RotateCcw } from "lucide-react";
import React from "react";
import { collection, addDoc, doc, setDoc, writeBatch } from 'firebase/firestore';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ColorGrid } from "@/components/color-grid";
import { generateGridData, type GridData, type CmykColor } from "@/lib/grid";
import { cmykToRgb, softProofCmyk, rgbToHex } from "@/lib/colors";
import { type PantoneColor } from "@/lib/pantone";
import { exportToJson, exportToCsv, exportToTxt, triggerDownload, base64ToBlob } from "@/lib/export";
import { ColorHistory, type ColorHistoryEntry } from "@/components/color-history";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { generateSimilarColors } from "@/ai/flows/generate-similar-colors-flow";
import type { GenerateSimilarColorsInput } from "@/lib/types";
import { CMPToneCombobox } from "@/components/pantone-combobox";
import { ProFeatureLock } from "./pro-feature-lock";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { generateCmykPdf, generateCMPToneBookPdf } from "@/app/actions/pdf-actions";
import { findClosestCMPTone } from "@/app/actions/color-actions";
import { PdfOptionsDialog, type PdfOptionsFormValues } from "./pdf-options-dialog";
import { CMPToneBookOptionsDialog, type CMPToneBookActionOptions } from "./pantone-book-options-dialog";
import { trackEvent, reportError } from "@/lib/monitoring";
import { SectionHelpDialog, HelpTrigger } from "./section-help-dialog";
import type { Job, JobColor } from '@/lib/types';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ScrollArea } from "./ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { useFirestore } from "@/firebase";
import useLocalStorage from "@/hooks/use-local-storage";

const formSchema = z.object({
  c: z.coerce.number().min(0, "Must be >= 0").max(100, "Must be <= 100"),
  m: z.coerce.number().min(0, "Must be >= 0").max(100, "Must be <= 100"),
  y: z.coerce.number().min(0, "Must be >= 0").max(100, "Must be <= 100"),
  k: z.coerce.number().min(0, "Must be >= 0").max(100, "Must be <= 100"),
  gridSize: z.coerce.number().min(3, "Must be >= 3").max(51, "Must be <= 51").refine(n => n % 2 !== 0, { message: "Must be an odd number." }),
  step: z.coerce.number().min(1).max(50),
  xAxis: z.enum(['c', 'm', 'y', 'k']),
  yAxis: z.enum(['c', 'm', 'y', 'k']),
}).refine(data => data.xAxis !== data.yAxis, {
  message: "Axes must be different",
  path: ["yAxis"],
});

export type GridFormValues = z.infer<typeof formSchema>;

export const defaultFormValues: GridFormValues = {
  c: 75,
  m: 50,
  y: 25,
  k: 10,
  gridSize: 9,
  step: 5,
  xAxis: 'c',
  yAxis: 'm',
};

const axisOptions: {value: keyof CmykColor, label: string}[] = [
    { value: 'c', label: 'Cyan (C)' },
    { value: 'm', label: 'Magenta (M)' },
    { value: 'y', label: 'Yellow (Y)' },
    { value: 'k', label: 'Black (K)' },
];

const ColorPreview = ({ control, hoveredColor, hoveredPantone, isFindingHoveredPantone, isPro, isSoftProof }: {
    control: Control<GridFormValues>,
    hoveredColor: CmykColor | null,
    hoveredPantone: PantoneColor | null,
    isFindingHoveredPantone: boolean,
    isPro: boolean,
    isSoftProof: boolean,
}) => {
    const cmyk = useWatch({
        control,
        name: ["c", "m", "y", "k"],
        defaultValue: [defaultFormValues.c, defaultFormValues.m, defaultFormValues.y, defaultFormValues.k]
    });
    const baseColor = { c: cmyk[0], m: cmyk[1], y: cmyk[2], k: cmyk[3] };

    const sourceColor = hoveredColor || baseColor;
    const pantoneToShow = hoveredColor ? hoveredPantone : null;
    const isFinding = hoveredColor ? isFindingHoveredPantone : false;

    const displayCmyk = (isPro && isSoftProof) ? softProofCmyk(sourceColor) : sourceColor;
    const displayRgb = cmykToRgb(displayCmyk.c, displayCmyk.m, displayCmyk.y, displayCmyk.k);
    const hex = rgbToHex(displayRgb.r, displayRgb.g, displayRgb.b);

    return (
        <div className="bg-muted/50 p-2 px-3 rounded-lg grid md:grid-cols-2 gap-x-4 gap-y-2 items-start">
            {/* Column 1: Base/Hovered Color */}
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-md border shadow-inner shrink-0" style={{ backgroundColor: hex }}></div>
                <div>
                    <h3 className="text-sm font-semibold mb-1">{hoveredColor ? "Hovered Color" : "Base Color"}</h3>
                    <div className="space-y-1 font-mono text-xs">
                        <p>CMYK: {sourceColor.c}, {sourceColor.m}, {sourceColor.y}, {sourceColor.k}</p>
                        <p>RGB: {displayRgb.r}, {displayRgb.g}, {displayRgb.b}</p>
                        <p>HEX: {hex.toUpperCase()}</p>
                    </div>
                </div>
            </div>

            {/* Column 2: CMPTone® Match */}
            <div className="min-h-[48px]">
                {isPro && (
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 shrink-0 flex items-center justify-center">
                            {hoveredColor ? (
                                isFinding ? (
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                ) : pantoneToShow ? (
                                    <div className="w-12 h-12 rounded-md border shadow-inner" style={{ backgroundColor: `rgb(${cmykToRgb(pantoneToShow.cmyk.c, pantoneToShow.cmyk.m, pantoneToShow.cmyk.y, pantoneToShow.cmyk.k).r},${cmykToRgb(pantoneToShow.cmyk.c, pantoneToShow.cmyk.m, pantoneToShow.cmyk.y, pantoneToShow.cmyk.k).g},${cmykToRgb(pantoneToShow.cmyk.c, pantoneToShow.cmyk.m, pantoneToShow.cmyk.y, pantoneToShow.cmyk.k).b})` }} />
                                ) : (
                                    <div className="w-12 h-12 rounded-md border border-dashed bg-background/50 flex items-center justify-center text-center text-[10px] leading-tight text-muted-foreground p-1">No Match</div>
                                )
                            ) : (
                                 <div className="w-12 h-12 rounded-md border border-dashed bg-background/50" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold mb-1">Closest CMPTone® Match</h3>
                             <div className="space-y-1 text-xs">
                                {isFinding ? (
                                    <p className="font-sans text-muted-foreground">Finding...</p>
                                ) : pantoneToShow ? (
                                    <>
                                        <p className="font-sans font-bold text-sm">{pantoneToShow.name}</p>
                                        <p className="text-muted-foreground font-mono">C:{pantoneToShow.cmyk.c} M:{pantoneToShow.cmyk.m} Y:{pantoneToShow.cmyk.y} K:{pantoneToShow.cmyk.k}</p>
                                    </>
                                ) : (
                                     <p className="font-sans text-muted-foreground">Hover grid for match</p>
                                )}
                             </div>
                        </div>
                     </div>
                )}
            </div>
        </div>
    );
};

const IssueAlert = ({ errors }: { errors: any }) => {
    const errorCount = Object.keys(errors).length;
    if (errorCount === 0) return null;

    return (
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{errorCount} Issue{errorCount > 1 ? 's' : ''}</AlertTitle>
            <AlertDescription>
                Configuration problem detected.
            </AlertDescription>
        </Alert>
    );
};

export function GridGenerator({ isPro, gridData, setGridData, colorHistory, setColorHistory }: { 
  isPro: boolean,
  gridData: GridData | null,
  setGridData: React.Dispatch<React.SetStateAction<GridData | null>>,
  colorHistory: ColorHistoryEntry[],
  setColorHistory: (history: ColorHistoryEntry[]) => void,
}) {
  const [history, setHistory] = useLocalStorage<ColorHistoryEntry[]>('color-matcher-pro-history', []);
  const [selectedPantone, setSelectedPantone] = useState<PantoneColor | null>(null);
  const [generationMode, setGenerationMode] = useState<'manual' | 'ai'>('manual');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hoveredColor, setHoveredColor] = useState<CmykColor | null>(null);
  const [isPdfOptionsOpen, setPdfOptionsOpen] = useState(false);
  const [isCMPToneBookDialogOpen, setCMPToneBookDialogOpen] = useState(false);
  const [isHelpOpen, setHelpOpen] = useState(false);
  const [isSoftProof, setIsSoftProof] = useState(false);
  
  const [hoveredPantone, setHoveredPantone] = useState<PantoneColor | null>(null);
  const [isFindingHoveredPantone, setIsFindingHoveredPantone] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();
  const firestore = useFirestore();

  const cInputRef = useRef<HTMLInputElement>(null);
  const mInputRef = useRef<HTMLInputElement>(null);
  const yInputRef = useRef<HTMLInputElement>(null);
  const kInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<GridFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        ...defaultFormValues,
        c: '' as any,
        m: '' as any,
        y: '' as any,
        k: '' as any,
    },
    mode: 'onChange'
  });
  
  const { toast } = useToast();

  useEffect(() => {
    if (!isPro) {
      setGenerationMode('manual');
      setIsSoftProof(false);
    }
  }, [isPro]);

  useEffect(() => {
    if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
    }

    if (hoveredColor && isPro) {
        setHoveredPantone(null); // clear old result
        setIsFindingHoveredPantone(true); // show loader immediately
        
        debounceTimeout.current = setTimeout(async () => {
            const rgb = cmykToRgb(hoveredColor.c, hoveredColor.m, hoveredColor.y, hoveredColor.k);
            const match = await findClosestCMPTone(rgb);
            setHoveredPantone(match);
            setIsFindingHoveredPantone(false);
        }, 300); // 300ms debounce
    } else {
        setHoveredPantone(null);
        setIsFindingHoveredPantone(false);
    }

    return () => {
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }
    };
  }, [hoveredColor, isPro]);

  const onGenerateGrid = useCallback(async (values: GridFormValues) => {
      if (generationMode === 'manual') {
          const { c, m, y, k, gridSize, step, xAxis, yAxis } = values;
          const baseColor = { c, m, y, k };
          const data = generateGridData(baseColor, gridSize, step, xAxis, yAxis);
          setGridData(data);
          trackEvent('Grid Generated', { mode: 'manual', gridSize, step });
          toast({title: "Grid Generated", description: "The color grid has been updated."});
      } else {
          setIsGenerating(true);
          trackEvent('Grid Generation Started', { mode: 'ai', gridSize: values.gridSize });
          try {
              const { c, m, y, k, gridSize, step } = values;
              const input: GenerateSimilarColorsInput = {
                  baseColor: { c, m, y, k },
                  gridSize,
                  variationLevel: Math.max(1, Math.min(10, Math.round(step / 5))),
              };
              const result = await generateSimilarColors(input);
              if (result.grid) {
                  setGridData(result.grid);
                  trackEvent('Grid Generated', { mode: 'ai', gridSize: input.gridSize, variation: input.variationLevel });
                  toast({title: "AI Grid Generated", description: "The AI has created a new color grid."});
              } else {
                  throw new Error("AI did not return a valid grid.");
              }
          } catch (error) {
              reportError(error as Error, { context: 'AI Grid Generation', generationMode });
              console.error("AI generation failed", error);
              toast({variant: "destructive", title: "AI Generation Failed", description: `Could not generate grid. Please try again. Error: ${error instanceof Error ? error.message : String(error)}`});
          } finally {
              setIsGenerating(false);
          }
      }
  }, [toast, generationMode, setGridData]);
  
  const handleGridClick = useCallback(async (coords: { rowIndex: number, colIndex: number }) => {
    if (!gridData) return;
    const originalColor = gridData[coords.rowIndex][coords.colIndex];
    const { r, g, b } = cmykToRgb(originalColor.c, originalColor.m, originalColor.y, originalColor.k);
    const hex = rgbToHex(r, g, b);

    let closestMatch: PantoneColor | null = null;
    if (isPro) {
      closestMatch = await findClosestCMPTone({ r, g, b });
    }

    const newEntry: ColorHistoryEntry = {
      cmyk: originalColor,
      rgb: { r, g, b },
      hex,
      timestamp: new Date().toLocaleString(),
      cmptone: closestMatch,
    };
    setColorHistory(prev => [newEntry, ...prev]);
  }, [gridData, isPro, setColorHistory]);
  
  const handleExport = useCallback((format: "csv" | "json" | "txt") => {
    if (history.length === 0) return;
    trackEvent('History Exported', { format, count: history.length });
    switch (format) {
      case "csv": exportToCsv(history); break;
      case "json": exportToJson(history); break;
      case "txt": exportToTxt(history); break;
    }
  }, [history]);

  const handlePrint = () => {
    const params = new URLSearchParams();
    const formValues = form.getValues();
    Object.entries(formValues).forEach(([key, value]) => {
      params.append(key, String(value));
    });
    trackEvent('Print Preview Opened');
    window.open(`/print?${params.toString()}`, '_blank');
  };

  const handleGeneratePdfWithOptions = async (pdfOptions: PdfOptionsFormValues) => {
    if (!gridData) return;
    toast({ title: 'Generating PDF...', description: 'Please wait while we create your CMYK PDF.' });
    trackEvent('PDF Export Started', { type: 'grid', customerSample: pdfOptions.customerSample });
    try {
        const base64 = await generateCmykPdf(gridData, form.getValues(), pdfOptions);
        const blob = base64ToBlob(base64, 'application/pdf');
        
        const safeTitle = pdfOptions.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || '';
        const fileName = safeTitle
            ? `${safeTitle}.pdf`
            : `cmyk-grid-${new Date().toISOString().split('T')[0]}.pdf`;
            
        triggerDownload(blob, fileName);
        trackEvent('PDF Export Success', { type: 'grid', paperFormat: pdfOptions.paperFormat });
    } catch (error) {
        reportError(error as Error, { context: 'Grid PDF Generation' });
        console.error("PDF generation failed", error);
        toast({ variant: 'destructive', title: 'PDF Generation Failed', description: 'Could not create the PDF file.' });
    }
  };
  
  const handleGenerateCMPToneBook = async (options: CMPToneBookActionOptions) => {
    toast({ title: 'Generating Swatch Book...', description: 'This may take a moment. Please wait.' });
    trackEvent('PDF Export Started', { type: 'cmptone_book' });
    try {
        const base64 = await generateCMPToneBookPdf(options);
        const blob = base64ToBlob(base64, 'application/pdf');
        triggerDownload(blob, `cmptone-swatch-book-${new Date().toISOString().split('T')[0]}.pdf`);
        trackEvent('PDF Export Success', { type: 'cmptone_book', columns: options.columns });
    } catch (error) {
        reportError(error as Error, { context: 'CMPTone Book PDF Generation' });
        console.error("Swatch book generation failed", error);
        toast({ variant: 'destructive', title: 'Generation Failed', description: 'Could not create the swatch book PDF.' });
    }
  };

  const handleAdjustK = useCallback((amount: number) => {
    const currentK = form.getValues('k');
    const newK = Math.max(0, Math.min(100, Number(currentK) + amount));
    form.setValue('k', newK, { shouldValidate: true, shouldDirty: true });
  }, [form]);

  const handleClearHistory = useCallback(() => {
    setColorHistory([]);
    trackEvent('History Cleared');
  }, [setColorHistory]);

  const handleUsePantoneAsBase = () => {
      if (selectedPantone) {
          form.setValue('c', selectedPantone.cmyk.c, { shouldValidate: true, shouldDirty: true });
          form.setValue('m', selectedPantone.cmyk.m, { shouldValidate: true, shouldDirty: true });
          form.setValue('y', selectedPantone.cmyk.y, { shouldValidate: true, shouldDirty: true });
          form.setValue('k', selectedPantone.cmyk.k, { shouldValidate: true, shouldDirty: true });
          trackEvent('Base Color Set', { source: 'cmptone', color: selectedPantone.name });
          toast({ title: "Base Color Updated", description: `Set to ${selectedPantone.name}.` });
      }
  };
  
  const handleQuickAddPantone = () => {
    if (selectedPantone) {
        const { r, g, b } = cmykToRgb(selectedPantone.cmyk.c, selectedPantone.cmyk.m, selectedPantone.cmyk.y, selectedPantone.cmyk.k);
        const hex = rgbToHex(r, g, b);

        const newEntry: ColorHistoryEntry = {
            cmyk: selectedPantone.cmyk,
            rgb: { r, g, b },
            hex,
            timestamp: new Date().toLocaleString(),
            cmptone: selectedPantone,
        };
        setColorHistory(prev => [newEntry, ...prev]);
        trackEvent('Quick Add to History', { source: 'cmptone' });
        toast({ title: "Color Added to History", description: `${selectedPantone.name} added.` });
    }
  };

  const handleGridHover = useCallback((coords: { rowIndex: number; colIndex: number } | null) => {
    if (coords && gridData) {
        setHoveredColor(gridData[coords.rowIndex][coords.colIndex]);
    } else {
        setHoveredColor(null);
    }
  }, [gridData]);

  const handleBulkAddToJob = async (jobId: string, colors: ColorHistoryEntry[]) => {
      if (!user || !firestore) return;
      trackEvent('Bulk Add To Job', { jobId, count: colors.length });

      try {
        const jobDocRef = doc(firestore, 'users', user.uid, 'jobs', jobId);
        const colorsCollectionRef = collection(jobDocRef, 'colors');
        const batch = writeBatch(firestore);

        for (const entry of colors) {
            const newColorDocRef = doc(colorsCollectionRef); // Create a new doc with a generated ID
            const newColorData: Omit<JobColor, 'id'> = {
                cmyk: entry.cmyk,
                timestamp: new Date().toISOString(),
                notes: entry.cmptone ? `Closest Match: ${entry.cmptone.name}` : 'From Grid History',
                printerId: '',
                media: '',
                gracol: false,
                fogra: false,
            };
            batch.set(newColorDocRef, newColorData);
        }

        await batch.commit();
        toast({ title: `${colors.length} Color(s) Added`, description: `Added to job.` });
      } catch (error) {
        reportError(error as Error, { context: "Bulk Add to Job from History" });
        toast({ variant: "destructive", title: "Error", description: "Could not add colors to the job." });
      }
  };

  const handleBulkCreateJob = async (jobName: string, colors: ColorHistoryEntry[]) => {
      if (!user || !firestore) return;
      trackEvent('Bulk Create Job', { jobName, count: colors.length });

      const newJobData = { name: jobName, createdAt: new Date().toISOString() };
      const colorsToAdd: Omit<JobColor, 'id'>[] = colors.map(entry => ({
          cmyk: entry.cmyk,
          timestamp: new Date().toISOString(),
          notes: entry.cmptone ? `Closest Match: ${entry.cmptone.name}` : 'From Grid History',
          printerId: '',
          media: '',
          gracol: false,
          fogra: false,
      })).reverse();

      try {
          // Create the new job document first
          const jobsCollectionRef = collection(firestore, 'users', user.uid, 'jobs');
          const newJobDoc = await addDoc(jobsCollectionRef, newJobData);
          
          // Then, add all the colors in a batch to its subcollection
          const colorsCollectionRef = collection(newJobDoc, 'colors');
          const batch = writeBatch(firestore);
          for (const colorData of colorsToAdd) {
              const newColorDocRef = doc(colorsCollectionRef);
              batch.set(newColorDocRef, colorData);
          }
          await batch.commit();

          toast({ title: "Job Created", description: `"${jobName}" created and ${colors.length} color(s) added.` });
      } catch (error) {
          reportError(error as Error, { context: "Bulk Create Job from History" });
          toast({ variant: "destructive", title: "Error", description: "Could not create new job." });
      }
  };

  const displayGridData = useMemo(() => {
    if (!gridData) return null;
    if (!isSoftProof || !isPro) {
        return gridData;
    }
    trackEvent('Soft Proof Toggled', { enabled: true });
    return gridData.map(row =>
        row.map(cmyk => softProofCmyk(cmyk))
    );
  }, [gridData, isSoftProof, isPro]);

  useEffect(() => {
    if (!isSoftProof && isPro) {
        trackEvent('Soft Proof Toggled', { enabled: false });
    }
  }, [isSoftProof, isPro]);
  
  const handleGenerateGridFromHistory = useCallback((entry: ColorHistoryEntry) => {
    form.setValue('c', entry.cmyk.c, { shouldValidate: true, shouldDirty: true });
    form.setValue('m', entry.cmyk.m, { shouldValidate: true, shouldDirty: true });
    form.setValue('y', entry.cmyk.y, { shouldValidate: true, shouldDirty: true });
    form.setValue('k', entry.cmyk.k, { shouldValidate: true, shouldDirty: true });
    form.setValue('gridSize', '9', { shouldValidate: true, shouldDirty: true });
    form.setValue('step', 1, { shouldValidate: true, shouldDirty: true });
    
    const newValues = {
        ...form.getValues(),
        c: entry.cmyk.c,
        m: entry.cmyk.m,
        y: entry.cmyk.y,
        k: entry.cmyk.k,
        gridSize: '9',
        step: 1
    } as GridFormValues;
    
    onGenerateGrid(newValues);
  }, [form, onGenerateGrid]);

  const handleCmykInputChange = (e: React.ChangeEvent<HTMLInputElement>, nextField?: keyof GridFormValues) => {
    const { value, maxLength } = e.target;
    if (value.length >= maxLength) {
        if (nextField === 'm' && mInputRef.current) mInputRef.current.focus();
        else if (nextField === 'y' && yInputRef.current) yInputRef.current.focus();
        else if (nextField === 'k' && kInputRef.current) kInputRef.current.focus();
    }
  };

  const handleResetCmyk = () => {
    form.reset({
      ...form.getValues(),
      c: '' as any,
      m: '' as any,
      y: '' as any,
      k: '' as any,
    });
    cInputRef.current?.focus();
    trackEvent('CMYK Reset');
  };


  return (
    <>
    <div className="h-full overflow-y-auto xl:overflow-hidden">
        <Form {...form}>
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 p-4 h-full min-h-0">
                {/* Left Column */}
                <div className="xl:col-span-3 flex flex-col gap-4 xl:overflow-y-auto xl:pr-2 min-h-0">
                    <Card id="tour-step-1-base-color">
                        <CardHeader className="p-4 pb-2">
                             <div className="flex items-center justify-between">
                                <CardTitle className="text-xl leading-tight flex items-center gap-2"><SlidersHorizontal className="text-primary h-5 w-5"/>Base CMYK Color</CardTitle>
                                <div className="flex items-center gap-1">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleResetCmyk}>
                                            <RotateCcw className="h-4 w-4 text-muted-foreground" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Reset CMYK values</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    <TooltipProvider delayDuration={100}>
                                        <Tooltip>
                                            <TooltipTrigger aria-label="Show base color tip">
                                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent side="top" align="end">
                                                <p className="max-w-xs">
                                                    Tip: If you know a CMYK value close to your target color, enter it here to generate a precise grid for matching.
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="grid grid-cols-4 gap-2">
                                <FormField control={form.control} name="c"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>C</FormLabel>
                                        <FormControl><Input type="number" {...field} maxLength={3} ref={cInputRef} onChange={(e) => { field.onChange(e); handleCmykInputChange(e, 'm'); }} /></FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                    )}
                                />
                                 <FormField control={form.control} name="m"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>M</FormLabel>
                                        <FormControl><Input type="number" {...field} maxLength={3} ref={mInputRef} onChange={(e) => { field.onChange(e); handleCmykInputChange(e, 'y'); }} /></FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                    )}
                                />
                                 <FormField control={form.control} name="y"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Y</FormLabel>
                                        <FormControl><Input type="number" {...field} maxLength={3} ref={yInputRef} onChange={(e) => { field.onChange(e); handleCmykInputChange(e, 'k'); }} /></FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                    )}
                                />
                                 <FormField control={form.control} name="k"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>K</FormLabel>
                                        <FormControl><Input type="number" {...field} maxLength={3} ref={kInputRef} onChange={(e) => { field.onChange(e); handleCmykInputChange(e); }} /></FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                    )}
                                />
                            </div>
                             <div className="flex justify-between gap-2 mt-2">
                                <Button variant="outline" type="button" onClick={() => handleAdjustK(-1)} className="flex-1"><Sun className="mr-2" /> Lighten</Button>
                                <Button variant="outline" type="button" onClick={() => handleAdjustK(1)} className="flex-1"><Moon className="mr-2" /> Darken</Button>
                             </div>
                        </CardContent>
                    </Card>

                    <Card id="tour-step-pro-converters">
                        <CardHeader className="p-4 pb-2"><CardTitle className="text-xl mb-1 flex items-center gap-2 leading-tight"><Droplets className="text-primary h-5 w-5" /> Find CMPTone® Color</CardTitle></CardHeader>
                        <CardContent className="p-4 pt-0">
                            {isPro ? (
                                <>
                                    <Alert className="mb-2 text-xs p-2">
                                        <Info className="h-4 w-4" />
                                        <AlertDescription>
                                        For best results, print the Swatch Book first. Use the printed book to find a visual match, then select that color here.
                                        </AlertDescription>
                                    </Alert>
                                    <CMPToneCombobox selectedColor={selectedPantone} onSelect={setSelectedPantone} />
                                    {selectedPantone && (
                                        <div className="p-2 border rounded-md bg-muted/50 space-y-2 mt-2">
                                            <p className="font-semibold text-sm">{selectedPantone.name} ({selectedPantone.number})</p>
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-md border shrink-0" style={{ backgroundColor: `rgb(${cmykToRgb(selectedPantone.cmyk.c, selectedPantone.cmyk.m, selectedPantone.cmyk.y, selectedPantone.cmyk.k).r}, ${cmykToRgb(selectedPantone.cmyk.c, selectedPantone.cmyk.m, selectedPantone.cmyk.y, selectedPantone.cmyk.k).g}, ${cmykToRgb(selectedPantone.cmyk.c, selectedPantone.cmyk.m, selectedPantone.cmyk.y, selectedPantone.cmyk.k).b})` }} />
                                                <div className="font-mono text-xs">
                                                    <p>C: {selectedPantone.cmyk.c} M: {selectedPantone.cmyk.m} Y: {selectedPantone.cmyk.y} K: {selectedPantone.cmyk.k}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button onClick={handleUsePantoneAsBase} disabled={!selectedPantone} className="flex-1" type="button" size="sm" variant="outline">
                                                    <Palette className="mr-2" /> Use as Base
                                                </Button>
                                                <Button onClick={handleQuickAddPantone} disabled={!selectedPantone} className="flex-1" type="button" size="sm">
                                                    <Plus className="mr-2" /> Quick Add
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </>
                             ) : (
                                <div className="p-2">
                                    <ProFeatureLock featureName="Find CMPTone® Color" />
                                </div>
                             )}
                        </CardContent>
                        {isPro && (
                            <CardFooter className="px-4 pb-4 flex flex-col gap-2">
                                <Button variant="outline" className="w-full" onClick={() => setCMPToneBookDialogOpen(true)} id="tour-step-swatch-book-pdf">
                                    <Printer className="mr-2" /> Download Swatch Book PDF
                                </Button>
                                <Button variant="outline" className="w-full" asChild>
                                  <a href="/CMPTone v2.ase" download>
                                      <FileDown className="mr-2" /> CMPTone v2 (Illustrator Swatch)
                                  </a>
                                </Button>
                            </CardFooter>
                        )}
                    </Card>

                     <Card id="tour-step-2-grid-config">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-xl mb-1 leading-tight flex items-center gap-2"><Settings className="text-primary h-5 w-5"/>Grid Configuration</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-2">

                            <div className="grid grid-cols-2 gap-2">
                                <FormField control={form.control} name="gridSize"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Grid Size</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select grid size" /></SelectTrigger></FormControl>
                                        <SelectContent>{[3, 5, 9, 15].map(size => (<SelectItem key={size} value={String(size)}>{size} &times; {size}</SelectItem>))}</SelectContent>
                                    </Select>
                                    </FormItem>
                                )}
                                />
                                <FormField control={form.control} name="step"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Step (%)</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                    </FormItem>
                                )}
                                />
                                <FormField control={form.control} name="xAxis" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>X-Axis</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select X-Axis" /></SelectTrigger></FormControl>
                                        <SelectContent>{axisOptions.map(option => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}</SelectContent>
                                        </Select>
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="yAxis" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Y-Axis</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select Y-Axis" /></SelectTrigger></FormControl>
                                            <SelectContent>{axisOptions.map(option => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}</SelectContent>
                                        </Select>
                                        <FormMessage/>
                                    </FormItem>
                                )} />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Center Column */}
                <div className="xl:col-span-6 flex flex-col h-full min-h-0">
                     <Card className="flex-grow flex flex-col min-h-0">
                        <CardHeader className="flex-shrink-0 border-b p-4">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <CardTitle className="text-xl leading-tight flex items-center gap-2"><Grid className="text-primary h-5 w-5"/>Interactive Color Grid</CardTitle>
                                    <CardDescription className="pt-1">Click a swatch to save it to your history.</CardDescription>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div id="tour-step-soft-proof" className="flex items-center gap-x-2">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="flex items-center gap-2">
                                              <Label htmlFor="soft-proof-switch" className={cn(!isPro && "text-muted-foreground/50")}>
                                                CMYK Soft Proof
                                              </Label>
                                              <Switch
                                                id="soft-proof-switch"
                                                checked={isSoftProof}
                                                onCheckedChange={setIsSoftProof}
                                                disabled={!isPro}
                                              />
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p className="max-w-xs">Simulates how screen colors may appear when printed in CMYK, which has a smaller color range.</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                      {!isPro && <Lock className="h-4 w-4" />}
                                    </div>
                                    <HelpTrigger onClick={() => setHelpOpen(true)} />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <ColorPreview
                                    control={form.control}
                                    hoveredColor={hoveredColor}
                                    hoveredPantone={hoveredPantone}
                                    isFindingHoveredPantone={isFindingHoveredPantone}
                                    isPro={isPro}
                                    isSoftProof={isSoftProof}
                                />
                                <IssueAlert errors={form.formState.errors} />
                                <Button type="submit" size="default" className="w-full" disabled={isGenerating} onClick={form.handleSubmit(onGenerateGrid)} id="tour-step-3-generate-button">
                                    {isGenerating ? <Loader2 className="mr-2 animate-spin" /> : <Palette className="mr-2"/>}
                                    Generate Grid
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow p-2 sm:p-4 md:p-6 min-h-0">
                             <div className="h-full w-full flex flex-col items-center justify-center" id="tour-step-4-color-grid">
                                {displayGridData && (
                                    <ColorGrid
                                        gridData={displayGridData}
                                        onCellClick={handleGridClick}
                                        onCellHover={handleGridHover}
                                    />
                                )}
                             </div>
                        </CardContent>
                        <CardFooter className="flex-shrink-0 pt-6 border-t flex gap-4 justify-end">
                            <Button variant="outline" className="flex-1 sm:flex-initial" onClick={handlePrint}>
                                <Printer className="mr-2"/> Quick Print
                            </Button>
                            <div id="tour-step-7-download-pdf">
                                {isPro ? (
                                    <Button className="flex-1 sm:flex-initial" onClick={() => setPdfOptionsOpen(true)}>
                                        <FileDown className="mr-2"/> Download PDF
                                    </Button>
                                ) : (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="flex-1 sm:flex-initial">
                                                    <Button className="w-full" disabled>
                                                        <Lock className="mr-2 h-4 w-4" /> Download PDF
                                                    </Button>
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>This is a Pro feature.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                        </CardFooter>
                    </Card>
                </div>
                
                {/* Right Column */}
                <div className="xl:col-span-3 flex flex-col h-full min-h-0 xl:overflow-y-auto">
                    <div id="tour-step-5-color-history" className="flex-grow min-h-0">
                        <ColorHistory 
                          history={colorHistory} 
                          onClear={handleClearHistory} 
                          isPro={isPro} 
                          onBulkAdd={handleBulkAddToJob}
                          onBulkCreateJob={handleBulkCreateJob}
                          onGenerateGridFromHistory={handleGenerateGridFromHistory}
                        />
                    </div>

                </div>
            </div>
        </Form>
    </div>
    <PdfOptionsDialog
        open={isPdfOptionsOpen}
        onOpenChange={setPdfOptionsOpen}
        onGenerate={handleGeneratePdfWithOptions}
    />
     <CMPToneBookOptionsDialog
        open={isCMPToneBookDialogOpen}
        onOpenChange={setCMPToneBookDialogOpen}
        onGenerate={handleGenerateCMPToneBook}
     />
      <SectionHelpDialog
        open={isHelpOpen}
        onOpenChange={setHelpOpen}
        title="Using the Grid Generator"
        description="This tool allows you to create and explore vast palettes of color variations."
      >
        <div className="space-y-4">
            <div>
                <h4 className="font-bold mb-1">1. Set Your Base Color</h4>
                <p className="text-muted-foreground">
                Use the CMYK sliders on the left to define your starting color. For Pro users, you can also use the "Find CMPTone® Color" to select a color and use it as your base.
                </p>
            </div>
            <div>
                <h4 className="font-bold mb-1">2. Configure and Generate</h4>
                <p className="text-muted-foreground">
                Choose a grid size and step/variation level. In <strong>Manual Mode</strong>, select which two CMYK values vary on the X and Y axes. In <strong>AI Variations Mode</strong> (Pro), just set the variation level and let the AI do the work. Click 'Generate Grid' to see the results.
                </p>
            </div>
            <div>
                <h4 className="font-bold mb-1">3. Interact and Save</h4>
                <p className="text-muted-foreground">
                Hover over any color swatch to see a live preview. Click on a swatch you like to save it to your Color History on the right.
                </p>
            </div>
             <div>
                <h4 className="font-bold mb-1">4. Soft Proofing (Pro)</h4>
                <p className="text-muted-foreground">
                Enable the "CMYK Soft Proof" toggle to simulate how your on-screen colors might appear when printed. This helps identify colors that may look less vibrant in print.
                </p>
            </div>
            <div>
                <h4 className="font-bold mb-1">5. Print and Export</h4>
                <p className="text-muted-foreground">
                Use the 'Quick Print' button for a simple browser-based printout. For professional workflows, use the 'Download PDF' button (Pro) to generate a true CMYK PDF. You can also export your saved history as a data file (CSV, JSON, TXT).
                </p>
            </div>
        </div>
      </SectionHelpDialog>
    </>
  );
}

    

    
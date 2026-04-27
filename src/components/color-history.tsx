"use client";

import { useState, useEffect, useMemo } from "react";
import { Trash2, PlusCircle, Lock, History, FileDown, Loader2, FileArchive, Grid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuGroup } from '@/components/ui/dropdown-menu';
import { useToast } from "@/hooks/use-toast";
import { SectionHelpDialog, HelpTrigger } from "./section-help-dialog";
import { NewJobDialog } from "./new-job-dialog";
import { Checkbox } from "./ui/checkbox";
import { PrintStripOptionsDialog, type PrintStripOptionsFormValues } from './print-strip-options-dialog';
import { generateCmykStripPdf, generateSampleSheetPdf } from "@/app/actions/pdf-actions";
import type { PrintStripEntry as PdfPrintStripEntry } from "@/app/actions/pdf-actions";
import { triggerDownload, base64ToBlob } from "@/lib/export";
import { trackEvent, reportError } from "@/lib/monitoring";
import { ReferenceSheetDialog, type ReferenceSheetFormValues } from "./reference-sheet-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query, orderBy } from 'firebase/firestore';
import type { Job, JobColor } from "@/lib/types";


export interface ColorHistoryEntry {
  cmyk: import("@/lib/grid").CmykColor;
  rgb: { r: number; g: number; b: number };
  hex: string;
  timestamp: string;
  cmptone?: import("@/lib/pantone").PantoneColor | null;
}

interface ColorHistoryProps {
  history: ColorHistoryEntry[];
  onClear: () => void;
  isPro: boolean;
  onBulkAdd: (jobId: string, colors: ColorHistoryEntry[]) => void;
  onBulkCreateJob: (jobName: string, colors: ColorHistoryEntry[]) => void;
  onGenerateGridFromHistory?: (color: ColorHistoryEntry) => void;
}

export function ColorHistory({ 
  history, 
  onClear,
  isPro,
  onBulkAdd,
  onBulkCreateJob,
  onGenerateGridFromHistory
}: ColorHistoryProps) {
  const { toast } = useToast();
  const [isHelpOpen, setHelpOpen] = useState(false);
  const [isNewJobDialogOpen, setNewJobDialogOpen] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isPrintOptionsOpen, setPrintOptionsOpen] = useState(false);
  const [isReferenceSheetDialogOpen, setReferenceSheetDialogOpen] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const { user } = useAuth();
  const firestore = useFirestore();

  const jobsQuery = useMemo(() => {
    if (!isPro || !user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'jobs'), orderBy('name'));
  }, [isPro, user, firestore]);

  const [jobsSnapshot, jobsLoading] = useCollection(jobsQuery);

  const jobs: Job[] = useMemo(() => {
    if (!jobsSnapshot) return [];
    return jobsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name as string, colors: [] }));
  }, [jobsSnapshot]);

  const handleToggleSelection = (index: number) => {
    setSelectedIndices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIndices.size === history.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(history.map((_, i) => i)));
    }
  };

  const handleBulkAddToJob = async (jobId: string) => {
      if (selectedIndices.size === 0) return;
      const colorsToAdd = history.filter((_, index) => selectedIndices.has(index));
      onBulkAdd(jobId, colorsToAdd);
      setSelectedIndices(new Set());
  };

  const handleBulkCreateJobLocal = (jobName: string) => {
      if (selectedIndices.size === 0) return;
      const colorsToAdd = history.filter((_, index) => selectedIndices.has(index));
      onBulkCreateJob(jobName, colorsToAdd);
      setSelectedIndices(new Set());
  };

  const handleDownloadStripPdf = async (options: PrintStripOptionsFormValues) => {
    if (selectedIndices.size === 0) {
      toast({ variant: 'destructive', title: 'Empty Selection', description: 'Select colors to include in the PDF.' });
      return;
    }
    setIsPdfLoading(true);
    trackEvent('PDF Export Started', { type: 'history_strip', colorCount: selectedIndices.size, ...options });

    const selectedColors = history.filter((_, index) => selectedIndices.has(index));
    const colorsForPdf: PdfPrintStripEntry[] = selectedColors.map(entry => ({
      cmyk: entry.cmyk,
      cmptone: entry.cmptone,
    }));
    
    const downloadPdf = async (isSample: boolean) => {
      try {
        const pdfBase64 = await generateCmykStripPdf({
          colors: colorsForPdf,
          title: options.title || "Color History Strip",
          includeVariations: options.includeVariations,
          customerSample: isSample,
        });
        const blob = base64ToBlob(pdfBase64, 'application/pdf');
        const safeTitle = (options.title || '').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const baseName = safeTitle || `history-strip-${new Date().toISOString().split('T')[0]}`;
        const fileName = isSample ? `${baseName}-customer-sample.pdf` : `${baseName}.pdf`;
        triggerDownload(blob, fileName);
      } catch (error) {
        reportError(error as Error, { context: `History Strip PDF (Sample: ${isSample})` });
        throw error;
      }
    };

    try {
      if (options.customerSample) {
        toast({ title: 'Generating PDFs...', description: 'Please wait, two files will be downloaded.' });
        await Promise.all([downloadPdf(false), downloadPdf(true)]);
        toast({ title: 'PDFs Downloaded', description: 'Your internal and customer sample PDFs are ready.' });
      } else {
        toast({ title: 'Generating PDF...', description: 'Please wait while we create your file.' });
        await downloadPdf(false);
        toast({ title: 'PDF Downloaded', description: 'Your Color History PDF is ready.' });
      }
      trackEvent('PDF Export Success', { type: 'history_strip' });
    } catch (error) {
      console.error("PDF generation failed", error);
      toast({ variant: 'destructive', title: 'PDF Failed', description: 'Could not generate the PDF.' });
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleDownloadReferenceSheet = async (options: ReferenceSheetFormValues) => {
    if (selectedIndices.size === 0) {
      toast({ variant: 'destructive', title: 'Empty Selection', description: 'Select colors to include in the PDF.' });
      return;
    }
    setIsPdfLoading(true);
    trackEvent('PDF Export Started', { type: 'reference_sheet', source: 'history', colorCount: selectedIndices.size });

    const selectedColors = history.filter((_, index) => selectedIndices.has(index));
    const colorsForPdf: PdfPrintStripEntry[] = selectedColors.map(entry => ({
      cmyk: entry.cmyk,
      cmptone: entry.cmptone,
    }));

    try {
      const pdfBase64 = await generateSampleSheetPdf({
        colors: colorsForPdf,
        title: options.title || 'Color Samples',
        details: options.details,
        logoDataUri: options.logoDataUri,
        paperFormat: options.paperFormat,
        customWidth: options.customWidth,
        customHeight: options.customHeight,
        includeVariations: options.includeVariations,
      });

      const blob = base64ToBlob(pdfBase64, 'application/pdf');
      const safeTitle = (options.title || 'color-reference-sheet').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      triggerDownload(blob, `${safeTitle}.pdf`);
      trackEvent('PDF Export Success', { type: 'reference_sheet' });
      toast({ title: 'PDF Downloaded', description: 'Your Physical Reference Sheet PDF is ready.' });
    } catch (error) {
      reportError(error as Error, { context: 'Reference Sheet PDF Generation' });
      console.error("Reference sheet PDF generation failed", error);
      toast({ variant: 'destructive', title: 'PDF Failed', description: 'Could not generate the PDF.' });
    } finally {
      setIsPdfLoading(false);
    }
  };

  return (
    <>
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle className="text-xl mb-2 flex items-center gap-2"><History className="text-primary h-5 w-5"/>Color History</CardTitle>
                <CardDescription>Colors you've selected.</CardDescription>
            </div>
            <div className="flex items-center -mr-2">
              <HelpTrigger onClick={() => setHelpOpen(true)} />
              <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => { onClear(); setSelectedIndices(new Set()); }} disabled={history.length === 0} aria-label="Clear History">
                              <Trash2 className="h-4 w-4" />
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                          <p>Clear History</p>
                      </TooltipContent>
                  </Tooltip>
              </TooltipProvider>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-grow min-h-0">
        <ScrollArea className="flex-grow border rounded-md min-h-0">
          {history.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              <p>Click on the grid to save colors.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-2 border-b sticky top-0 bg-card z-10">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all-history"
                    checked={history.length > 0 && selectedIndices.size === history.length}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all colors in history"
                  />
                  <label htmlFor="select-all-history" className="text-sm font-medium">
                    {selectedIndices.size > 0 ? `${selectedIndices.size} selected` : 'Select All'}
                  </label>
                </div>
                {isPro ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={selectedIndices.size === 0}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add to Job
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                       <DropdownMenuItem onSelect={() => setNewJobDialogOpen(true)}>
                        Create new job...
                      </DropdownMenuItem>
                       <DropdownMenuSeparator />
                       <DropdownMenuLabel>Add to existing job</DropdownMenuLabel>
                        <DropdownMenuGroup>
                          {jobsLoading ? (
                            <DropdownMenuItem disabled>Loading jobs...</DropdownMenuItem>
                          ) : jobs.length > 0 ? jobs.map(job => (
                            <DropdownMenuItem key={job.id} onSelect={() => handleBulkAddToJob(job.id)}>
                                {job.name}
                            </DropdownMenuItem>
                          )) : (
                            <DropdownMenuItem disabled>No jobs found</DropdownMenuItem>
                          )}
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button variant="ghost" size="sm" disabled>
                            <Lock className="mr-2 h-4 w-4" />
                            Add to Job
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add to Job is a Pro feature.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div className="p-4 space-y-4">
                {history.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                     <Checkbox
                      checked={selectedIndices.has(index)}
                      onCheckedChange={() => handleToggleSelection(index)}
                      aria-label={`Select color ${item.hex}`}
                    />
                    <div className="flex items-start gap-4 flex-grow">
                      <div
                        className="w-10 h-10 rounded-md border shrink-0"
                        style={{ backgroundColor: item.hex }}
                      />
                      <div className="flex-grow text-xs">
                          <div className="space-y-1">
                            <div className="font-mono">
                              <span className="font-semibold text-foreground w-12 inline-block">HEX:</span>
                              {item.hex.toUpperCase()}
                            </div>
                            <div className="font-mono text-muted-foreground">
                              <span className="font-semibold text-foreground w-12 inline-block">CMYK:</span>
                              {`${item.cmyk.c}, ${item.cmyk.m}, ${item.cmyk.y}, ${item.cmyk.k}`}
                            </div>
                            <div className="font-mono text-muted-foreground">
                              <span className="font-semibold text-foreground w-12 inline-block">RGB:</span>
                              {`${item.rgb.r}, ${item.rgb.g}, ${item.rgb.b}`}
                            </div>
                            {item.cmptone && (
                              <div className="font-mono text-muted-foreground">
                                <span className="font-semibold text-foreground w-12 inline-block">Match:</span>
                                {item.cmptone.name}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground/80 mt-2 flex justify-between items-center">
                              <span>{item.timestamp}</span>
                              {onGenerateGridFromHistory && (
                                <Button variant="outline" size="sm" onClick={() => onGenerateGridFromHistory(item)} className="h-7 text-xs">
                                  <Grid className="h-3 w-3 mr-1"/> Gen Grid
                                </Button>
                              )}
                          </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </ScrollArea>
        <div className="flex flex-wrap gap-2 pt-4 text-xs mt-auto">
            <Button variant="outline" size="sm" disabled={selectedIndices.size === 0 || isPdfLoading} onClick={() => setPrintOptionsOpen(true)} className="flex-1 min-w-[150px]">
                {isPdfLoading ? <Loader2 className="mr-2 animate-spin" /> : <FileDown className="mr-2" />}
                <span>Strip PDF ({selectedIndices.size})</span>
            </Button>
            <Button variant="outline" size="sm" disabled={selectedIndices.size === 0 || isPdfLoading} onClick={() => setReferenceSheetDialogOpen(true)} className="flex-1 min-w-[150px]">
                {isPdfLoading ? <Loader2 className="mr-2 animate-spin" /> : <FileArchive className="mr-2" />}
                <span>Reference Sheet ({selectedIndices.size})</span>
            </Button>
        </div>
      </CardContent>
    </Card>
    <NewJobDialog
        open={isNewJobDialogOpen}
        onOpenChange={setNewJobDialogOpen}
        onSave={handleBulkCreateJobLocal}
    />
    <PrintStripOptionsDialog
        open={isPrintOptionsOpen}
        onOpenChange={setPrintOptionsOpen}
        onGenerate={handleDownloadStripPdf}
    />
    <ReferenceSheetDialog
        open={isReferenceSheetDialogOpen}
        onOpenChange={setReferenceSheetDialogOpen}
        onGenerate={handleDownloadReferenceSheet}
    />
    <SectionHelpDialog
        open={isHelpOpen}
        onOpenChange={setHelpOpen}
        title="Using the Color History"
        description="This panel stores colors you've selected from the grid."
    >
        <div className="space-y-4">
            <div>
                <h4 className="font-bold mb-1">Add to Job (Pro Feature)</h4>
                <p className="text-muted-foreground">
                    Use the checkboxes to select one or more colors from the history. Then, use the "Add to Job" button in the header to add them to an existing project in the Colour Tracker or create a new job on the fly.
                </p>
            </div>
            <div>
                <h4 className="font-bold mb-1">Exporting Data</h4>
                <p className="text-muted-foreground">
                    Use the export buttons in the "Export History" card to save all your selected colors as a CSV, JSON, or TXT file for use in other applications.
                </p>
            </div>
        </div>
      </SectionHelpDialog>
    </>
  );
}



'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { collection, query, orderBy, addDoc, doc, deleteDoc, updateDoc, writeBatch, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PlusCircle, FilePlus, Droplet, Clock, Trash2, Pencil, Printer, Layers, Search, Loader2, Upload, Download, Grid as GridIcon, FileArchive, Settings, AlertTriangle } from 'lucide-react';
import { AddColorDialog } from './add-color-dialog';
import { cmykToRgb, rgbToHex } from '@/lib/colors';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from './ui/badge';
import { useToast } from '@/hooks/use-toast';
import { trackEvent, reportError } from '@/lib/monitoring';
import type { Job, JobColor, ColorSuggestion } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { useFirestore, useCollection, useDoc } from '@/firebase';
import { ColorSearchDialog } from './color-search-dialog';
import { generateCmykStripPdf, generateMultiGridPdf, generateSampleSheetPdf } from '@/app/actions/pdf-actions';
import type { PrintStripEntry as PdfPrintStripEntry, SampleSheetOptions } from '@/app/actions/pdf-actions';
import { base64ToBlob, triggerDownload } from '@/lib/export';
import { MultiGridOptionsDialog, type MultiGridFormValues } from "./multi-grid-options-dialog";
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';
import { ReferenceSheetDialog, type ReferenceSheetFormValues } from './reference-sheet-dialog';
import type { PantoneColor } from '@/lib/pantone';
import { findClosestCMPTone } from '@/app/actions/color-actions';
import { ManagePrintersDialog } from './manage-printers-dialog';
import useLocalStorage from '@/hooks/use-local-storage';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { suggestColorUpdate } from '@/ai/flows/suggest-color-update-flow';


const ColorEntry = ({
    color,
    onEdit,
    onDelete,
    onSearch,
    isSelected,
    onToggleSelect
  }: {
    color: JobColor;
    onEdit: (color: JobColor) => void;
    onDelete: (colorId: string) => void;
    onSearch: (color: JobColor) => void;
    isSelected: boolean;
    onToggleSelect: (colorId: string) => void;
  }) => {
    const { r, g, b } = cmykToRgb(color.cmyk.c, color.cmyk.m, color.cmyk.y, color.cmyk.k);
    const hex = rgbToHex(r, g, b);
    return (
      <div className="p-4 border rounded-lg flex gap-4 items-start group">
        <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(color.id)}
            aria-label={`Select color ${hex}`}
            className="mt-1"
        />
        <div className="w-20 h-20 rounded-md border shrink-0" style={{ backgroundColor: hex }} />
        <div className="flex-grow space-y-1 text-sm">
          <p className="font-bold text-base">{hex.toUpperCase()}</p>
          <p className="font-mono text-muted-foreground">CMYK: C{color.cmyk.c} M{color.cmyk.m} Y{color.cmyk.y} K{color.cmyk.k}</p>
          {color.notes && <p className="text-muted-foreground italic pt-1">"{color.notes}"</p>}
          <div className="flex gap-4 items-center flex-wrap pt-2">
            <p className="text-xs text-muted-foreground/80 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {new Date(color.timestamp).toLocaleString()}
            </p>
            {color.printerId && (
              <Badge variant="outline">
                  <Printer className="w-3 h-3 mr-1.5" />
                  {color.printerId}
              </Badge>
            )}
            {color.media && (
              <Badge variant="outline">
                  <Layers className="w-3 h-3 mr-1.5" />
                  {color.media}
              </Badge>
            )}
            {color.gracol && <Badge variant="secondary">GRACol</Badge>}
            {color.fogra && <Badge variant="secondary">FOGRA</Badge>}
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => onSearch(color)} aria-label={`Find similar colors to ${hex}`}>
                <Search className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => onEdit(color)} aria-label={`Edit color ${hex}`}>
                <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => onDelete(color.id)} aria-label={`Delete color ${hex}`}>
                <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
        </div>
      </div>
    );
};

export default function JobColorTracker() {
  const { user, isPro } = useAuth();
  const firestore = useFirestore();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [newJobName, setNewJobName] = useState('');
  const [isColorDialogOpen, setColorDialogOpen] = useState(false);
  const [editingColor, setEditingColor] = useState<JobColor | null>(null);
  const [colorToDeleteId, setColorToDeleteId] = useState<string | null>(null);
  const [searchColor, setSearchColor] = useState<JobColor | null>(null);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [isMultiGridDialogOpen, setMultiGridDialogOpen] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [selectedColorIds, setSelectedColorIds] = useState<Set<string>>(new Set());
  const [isReferenceSheetDialogOpen, setReferenceSheetDialogOpen] = useState(false);
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isPrintersDialogOpen, setPrintersDialogOpen] = useState(false);
  const [suggestions, setSuggestions] = useLocalStorage<ColorSuggestion[]>('color-matcher-suggestions', []);
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);

  // --- Data Fetching ---
  const userDocRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const [userDoc, userDocLoading] = useDoc(userDocRef);

  const printers: string[] = useMemo(() => {
    return userDoc?.data()?.printers || [];
  }, [userDoc]);

  const jobsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/jobs`), orderBy('name'));
  }, [user?.uid, firestore]);

  const [jobsSnapshot, jobsLoading] = useCollection(jobsQuery);

  const jobs: Job[] = useMemo(() => {
    if (!jobsSnapshot) return [];
    return jobsSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<Job, 'id'>) }));
  }, [jobsSnapshot]);

  // Effect to select the first job when data loads and none is selected
  useEffect(() => {
    if (!selectedJobId && jobs.length > 0) {
      setSelectedJobId(jobs[0].id);
    }
  }, [jobs, selectedJobId]);
  
  const selectedJob = useMemo(() => {
    return jobs.find(job => job.id === selectedJobId) || null;
  }, [jobs, selectedJobId]);

  const jobColorsQuery = useMemo(() => {
    if (!user?.uid || !selectedJobId || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'jobs', selectedJobId, 'colors'), orderBy('timestamp', 'desc'));
  }, [user?.uid, selectedJobId, firestore]);

  const [jobColorsSnapshot, jobColorsLoading] = useCollection(jobColorsQuery);
  
  const jobColors: JobColor[] = useMemo(() => {
    if (!jobColorsSnapshot) return [];
    return jobColorsSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<JobColor, 'id'>) }));
  }, [jobColorsSnapshot]);

  useEffect(() => {
    setSelectedColorIds(new Set());
  }, [selectedJobId]);

  const currentJobSuggestions = useMemo(() => {
    if (!selectedJobId) return [];
    return suggestions.filter(s => s.jobId === selectedJobId);
  }, [suggestions, selectedJobId]);
  
   // --- Handlers ---
  const handleAddJob = async () => {
    if (!newJobName.trim() || !user || !firestore) return;
    const newJobData = { name: newJobName.trim(), createdAt: new Date().toISOString() };
    try {
      const docRef = await addDoc(collection(firestore, 'users', user.uid, 'jobs'), newJobData);
      setNewJobName('');
      setSelectedJobId(docRef.id);
      trackEvent('Job Created', { jobName: newJobData.name });
    } catch(e) {
      reportError(e as Error, { context: "Add Job" });
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!user || !firestore || !jobs) return;
    trackEvent('Job Deleted', { jobId });
    try {
      const jobIndex = jobs.findIndex(j => j.id === jobId);
      
      const colorsSnapshot = await getDocs(collection(firestore, 'users', user.uid, 'jobs', jobId, 'colors'));
      const batch = writeBatch(firestore);
      colorsSnapshot.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      await deleteDoc(doc(firestore, 'users', user.uid, 'jobs', jobId));

      if (selectedJobId === jobId) {
        const newJobsList = jobs.filter(j => j.id !== jobId);
        if (newJobsList.length > 0) {
            const newIndex = Math.max(0, jobIndex - 1);
            setSelectedJobId(newJobsList[newIndex].id);
        } else {
            setSelectedJobId(null);
        }
      }
    } catch(e) {
      reportError(e as Error, { context: "Delete Job" });
    }
  };

  const handleSaveColor = async (colorData: Omit<JobColor, 'id' | 'cmyk' | 'timestamp'> & {id?: string, c:number, m:number, y:number, k:number}) => {
    if (!selectedJobId || !user || !firestore) return;
    
    trackEvent(colorData.id ? 'Color Edited' : 'Color Added', { jobId: selectedJobId });
    const jobDocRef = doc(firestore, 'users', user.uid, 'jobs', selectedJobId);

    const dataToSave = {
        cmyk: { c: colorData.c, m: colorData.m, y: colorData.y, k: colorData.k },
        notes: colorData.notes,
        printerId: colorData.printerId,
        media: colorData.media,
        gracol: colorData.gracol,
        fogra: colorData.fogra,
        timestamp: new Date().toISOString(),
    };

    try {
      if (colorData.id) {
        const colorDocRef = doc(jobDocRef, 'colors', colorData.id);
        
        // Find the original color from the current state before updating
        const originalColor = jobColors.find(c => c.id === colorData.id);
        
        await updateDoc(colorDocRef, dataToSave);

        // After successful update, trigger AI suggestion flow if color changed.
        if (originalColor && JSON.stringify(originalColor.cmyk) !== JSON.stringify(dataToSave.cmyk)) {
            handleAiSuggestions(originalColor, { ...originalColor, ...dataToSave, id: colorData.id });
        }

      } else {
        const colorsCollectionRef = collection(jobDocRef, 'colors');
        await addDoc(colorsCollectionRef, dataToSave);
      }
    } catch (e) {
      reportError(e as Error, { context: "Save Color" });
    }
  };

  const handleAiSuggestions = async (colorBefore: JobColor, colorAfter: JobColor) => {
    if (!isPro || !user || !firestore || !selectedJob) return;

    setIsSuggestionLoading(true);
    trackEvent('AI Suggestion Flow Started', { sourceJobId: selectedJob.id });

    try {
        // 1. Fetch all jobs and their colors
        const allJobsData = await Promise.all(
            jobs.map(async (job) => {
                const colors: JobColor[] = [];
                const colorsSnapshot = await getDocs(collection(firestore, `users/${user.uid}/jobs/${job.id}/colors`));
                colorsSnapshot.forEach(colorDoc => {
                    colors.push({ id: colorDoc.id, ...colorDoc.data() } as JobColor);
                });
                return { ...job, colors };
            })
        );
        
        // 2. Call the AI flow
        const result = await suggestColorUpdate({
            sourceJobId: selectedJob.id,
            sourceJobName: selectedJob.name,
            colorBefore,
            colorAfter,
            allJobs: allJobsData,
        });

        if (result.suggestions && result.suggestions.length > 0) {
            // Add new suggestions, replacing any old ones for the same target colors.
            setSuggestions(prev => {
                const newSuggestions = [...result.suggestions];
                const prevFiltered = prev.filter(p => 
                    !newSuggestions.some(n => n.originalColor.id === p.originalColor.id)
                );
                return [...prevFiltered, ...newSuggestions];
            });
            trackEvent('AI Suggestions Generated', { count: result.suggestions.length });
            toast({
                title: "AI Suggestions Ready",
                description: `Found ${result.suggestions.length} similar color(s) in other jobs to update.`
            });
        }
    } catch (error) {
        reportError(error as Error, { context: "AI Suggestion Flow" });
        toast({ variant: "destructive", title: "AI Suggestion Failed", description: "Could not generate color suggestions." });
    } finally {
        setIsSuggestionLoading(false);
    }
  };

  const handleApplySuggestion = async (suggestion: ColorSuggestion) => {
      if (!user || !firestore) return;
      trackEvent('AI Suggestion Applied', { jobId: suggestion.jobId, colorId: suggestion.originalColor.id });
      try {
          const colorRef = doc(firestore, 'users', user.uid, 'jobs', suggestion.jobId, 'colors', suggestion.originalColor.id);
          await updateDoc(colorRef, { cmyk: suggestion.suggestedCmyk });
          
          // Remove the applied suggestion
          setSuggestions(prev => prev.filter(s => s.originalColor.id !== suggestion.originalColor.id));
          toast({ title: "Color Updated", description: `Color in job "${suggestion.jobName}" was updated based on AI suggestion.` });
      } catch (error) {
          reportError(error as Error, { context: "Apply AI Suggestion" });
          toast({ variant: "destructive", title: "Update Failed", description: "Could not apply the suggested update." });
      }
  };

  const handleDismissSuggestion = (suggestion: ColorSuggestion) => {
      trackEvent('AI Suggestion Dismissed', { jobId: suggestion.jobId, colorId: suggestion.originalColor.id });
      setSuggestions(prev => prev.filter(s => s.originalColor.id !== suggestion.originalColor.id));
  };


  const handleDeleteColor = async () => {
    if (!selectedJobId || !colorToDeleteId || !user || !firestore) return;
    trackEvent('Color Deleted', { jobId: selectedJobId, colorId: colorToDeleteId });
    try {
      await deleteDoc(doc(firestore, 'users', user.uid, 'jobs', selectedJobId, 'colors', colorToDeleteId));
      setColorToDeleteId(null);
    } catch (e) {
      reportError(e as Error, { context: "Delete Color" });
    }
  };
  
  const handleOpenDeleteDialog = (colorId: string) => setColorToDeleteId(colorId);
  const handleEditColor = (color: JobColor) => { setEditingColor(color); setColorDialogOpen(true); };
  
  const handleSearchSimilar = (color: JobColor) => {
      setSearchColor(color);
      setIsSearchDialogOpen(true);
  };

  const handlePrintStrip = async () => {
    if (!selectedJob || jobColors.length === 0) return;
    setIsPdfLoading(true);
    trackEvent('PDF Export Started', {type: 'job_strip', jobId: selectedJob.id, count: jobColors.length });
    try {
        const colorsForPdf: PdfPrintStripEntry[] = await Promise.all(jobColors.map(async (c) => {
          let pantoneMatch: PantoneColor | null = null;
          if(isPro) {
            const rgb = cmykToRgb(c.cmyk.c, c.cmyk.m, c.cmyk.y, c.cmyk.k);
            pantoneMatch = await findClosestCMPTone(rgb);
          }
          return { cmyk: c.cmyk, cmptone: pantoneMatch };
        }));

        const pdfBase64 = await generateCmykStripPdf({
            colors: colorsForPdf,
            title: `Job Strip: ${selectedJob.name}`,
        });
        const blob = base64ToBlob(pdfBase64, 'application/pdf');
        triggerDownload(blob, `job-strip-${selectedJob.name.replace(/[^a-z0-9]/gi, '_')}.pdf`);
        toast({ title: "Print Strip Generated", description: `PDF for job "${selectedJob.name}" is downloading.` });
    } catch (error) {
        reportError(error as Error, { context: "Job Strip PDF Generation" });
        toast({ variant: 'destructive', title: "PDF Generation Failed" });
    } finally {
        setIsPdfLoading(false);
    }
  };

  const handleExportData = async () => {
      if (!user || !firestore) return;
      trackEvent('Full Data Export Started');
      const dataToExport: { [jobId: string]: { name: string, colors: JobColor[] } } = {};
      try {
          for (const job of jobs) {
              const colors: JobColor[] = [];
              const colorsSnapshot = await getDocs(collection(firestore, `users/${user.uid}/jobs/${job.id}/colors`));
              colorsSnapshot.forEach(doc => colors.push({ id: doc.id, ...doc.data() } as JobColor));
              dataToExport[job.id] = { name: job.name, colors };
          }
          const jsonContent = JSON.stringify(dataToExport, null, 2);
          const blob = new Blob([jsonContent], { type: 'application/json' });
          triggerDownload(blob, 'colour-tracker-backup.json');
          toast({ title: "Export Successful", description: "Your data has been exported." });
      } catch (error) {
          reportError(error as Error, { context: "Full Data Export" });
          toast({ variant: 'destructive', title: "Export Failed" });
      }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !user || !firestore) return;
      trackEvent('Full Data Import Started');

      const reader = new FileReader();
      reader.onload = async (e) => {
          try {
              const data = JSON.parse(e.target?.result as string);
              const batch = writeBatch(firestore);

              for (const jobId in data) {
                  const jobData = data[jobId];
                  const jobRef = doc(firestore, `users/${user.uid}/jobs`, jobId);
                  batch.set(jobRef, { name: jobData.name, createdAt: new Date().toISOString() });

                  for (const color of jobData.colors) {
                      const colorRef = doc(collection(jobRef, 'colors'), color.id);
                      const { id, ...colorDataToImport } = color;
                      batch.set(colorRef, colorDataToImport);
                  }
              }
              await batch.commit();
              toast({ title: "Import Successful", description: "Your data has been restored." });
          } catch (error) {
              reportError(error as Error, { context: "Full Data Import" });
              toast({ variant: 'destructive', title: "Import Failed", description: "The file might be corrupted." });
          }
      };
      reader.readAsText(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const handleToggleSelection = (colorId: string) => {
    setSelectedColorIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(colorId)) {
            newSet.delete(colorId);
        } else {
            newSet.add(colorId);
        }
        return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedColorIds.size === jobColors.length) {
        setSelectedColorIds(new Set());
    } else {
        setSelectedColorIds(new Set(jobColors.map(c => c.id)));
    }
  };

  const handleGenerateMultiGridPdf = async (gridConfig: MultiGridFormValues) => {
        if (selectedColorIds.size === 0) {
            toast({ variant: 'destructive', title: 'Empty Selection', description: 'Select colors to include in the PDF.' });
            return;
        }
        setIsPdfLoading(true);
        trackEvent('PDF Export Started', { type: 'multi_grid_job', count: selectedColorIds.size });
        const selectedColors = jobColors
            .filter(c => selectedColorIds.has(c.id))
            .map(c => c.cmyk);

        try {
            const pdfBase64 = await generateMultiGridPdf(selectedColors, gridConfig);
            const blob = base64ToBlob(pdfBase64, 'application/pdf');
            triggerDownload(blob, `multi-grid-export-${new Date().toISOString().split('T')[0]}.pdf`);
            trackEvent('PDF Export Success', { type: 'multi_grid_job' });
            toast({ title: 'PDF Downloaded', description: 'Your Multi-Grid PDF is ready.' });
        } catch (error) {
            reportError(error as Error, { context: 'Multi-Grid Job PDF Generation' });
            console.error("Multi-grid PDF generation failed", error);
            toast({ variant: 'destructive', title: 'PDF Failed', description: 'Could not generate the PDF.' });
        } finally {
            setIsPdfLoading(false);
        }
    };
    
    const handleGenerateReferenceSheet = async (options: ReferenceSheetFormValues) => {
        if (selectedColorIds.size === 0) {
          toast({ variant: 'destructive', title: 'Empty Selection', description: 'Select colors to include in the PDF.' });
          return;
        }
        setIsPdfLoading(true);
        trackEvent('PDF Export Started', { type: 'reference_sheet', source: 'job_tracker', colorCount: selectedColorIds.size });

        const selectedColors = jobColors.filter(c => selectedColorIds.has(c.id));
        
        const colorsForPdf: PdfPrintStripEntry[] = await Promise.all(selectedColors.map(async (color) => {
            let pantoneMatch: PantoneColor | null = null;
            if (isPro) {
                const rgb = cmykToRgb(color.cmyk.c, color.cmyk.m, color.cmyk.y, color.cmyk.k);
                pantoneMatch = await findClosestCMPTone(rgb);
            }
            return { cmyk: color.cmyk, cmptone: pantoneMatch };
        }));

        try {
          const pdfBase64 = await generateSampleSheetPdf({
            colors: colorsForPdf,
            title: options.title || 'Color Samples',
            details: options.details,
            logoDataUri: options.logoDataUri,
          });

          const blob = base64ToBlob(pdfBase64, 'application/pdf');
          const safeTitle = (options.title || 'color-reference-sheet').replace(/[^a-z0-9]/gi, '_').toLowerCase();
          triggerDownload(blob, `${safeTitle}.pdf`);
          trackEvent('PDF Export Success', { type: 'reference_sheet' });
          toast({ title: 'PDF Downloaded', description: 'Your Physical Reference Sheet PDF is ready.' });
        } catch (error) {
          reportError(error as Error, { context: 'Reference Sheet PDF Generation from Job' });
          console.error("Reference sheet PDF generation failed", error);
          toast({ variant: 'destructive', title: 'PDF Failed', description: 'Could not generate the PDF.' });
        } finally {
          setIsPdfLoading(false);
        }
    };


  return (
    <>
      <div className="p-4 lg:p-6 bg-background">
          <div className="flex flex-col lg:flex-row gap-6">
            <Card className="w-full lg:w-[350px] flex flex-col flex-shrink-0">
              <CardHeader>
                <CardTitle>All Jobs</CardTitle>
                <CardDescription>Select a job to see its colours.</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow overflow-auto">
                <div className="pr-4 space-y-2">
                    {jobsLoading ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => <div key={i} className="h-9 w-full bg-muted animate-pulse rounded-md" />)}
                      </div>
                    ) : jobs.length > 0 ? jobs.map(job => (
                      <div key={job.id} className="flex items-center gap-2 group">
                          <Button
                          variant={selectedJobId === job.id ? 'secondary' : 'ghost'}
                          className="flex-grow justify-start"
                          onClick={() => setSelectedJobId(job.id)}
                          >
                          {job.name}
                          {suggestions.some(s => s.jobId === job.id) && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className='ml-2 text-yellow-500'>*</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>This job has pending AI suggestions.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          </Button>
                          <Button variant="ghost" size="icon" className="w-8 h-8 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteJob(job.id)} aria-label={`Delete job: ${job.name}`}>
                              <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                      </div>
                    )) : (
                        <p className="text-sm text-muted-foreground p-4 text-center">No jobs yet. Add one below.</p>
                    )}
                </div>
              </CardContent>
              <CardFooter className="pt-6 border-t flex-col gap-2">
                  <div className="w-full flex items-center gap-2">
                      <Input
                          placeholder="New job name..."
                          value={newJobName}
                          onChange={e => setNewJobName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddJob()}
                      />
                      <Button onClick={handleAddJob}><FilePlus className="mr-2"/> Add</Button>
                  </div>
                  <div className="w-full flex items-center gap-2 pt-2">
                      <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportData} />
                      <Button variant="outline" className="flex-1" onClick={handleExportData}><Download className="mr-2"/> Export All</Button>
                      <Button variant="outline" className="flex-1" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2"/> Import All</Button>
                  </div>
                   <Button variant="outline" className="w-full mt-2" onClick={() => setPrintersDialogOpen(true)}><Settings className="mr-2"/> Manage Printers</Button>
              </CardFooter>
            </Card>

            <Card className="flex-grow flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <CardTitle>Colours for: {selectedJob?.name || '...'}</CardTitle>
                    <CardDescription>A collection of tracked colours for this job.</CardDescription>
                  </div>
                  <div className="flex items-center flex-wrap gap-2">
                     <Button onClick={() => setMultiGridDialogOpen(true)} disabled={selectedColorIds.size === 0 || isPdfLoading || !selectedJob}>
                        {isPdfLoading ? <Loader2 className="mr-2 animate-spin"/> : <GridIcon className="mr-2"/>} Print Grids ({selectedColorIds.size})
                     </Button>
                     <Button onClick={() => setReferenceSheetDialogOpen(true)} disabled={selectedColorIds.size === 0 || isPdfLoading || !selectedJob}>
                        {isPdfLoading ? <Loader2 className="mr-2 animate-spin"/> : <FileArchive className="mr-2"/>} Ref. Sheet ({selectedColorIds.size})
                     </Button>
                     <Button onClick={handlePrintStrip} disabled={!selectedJob || jobColors.length === 0 || isPdfLoading}>
                        {isPdfLoading ? <Loader2 className="mr-2 animate-spin"/> : <Printer className="mr-2"/>} Print Strip
                     </Button>
                     <Button onClick={() => { setEditingColor(null); setColorDialogOpen(true); }} disabled={!selectedJobId}><PlusCircle className="mr-2"/> Add Colour</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow min-h-0">
                {isSuggestionLoading && (
                     <div className="p-3 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30 flex items-center gap-3 mb-4">
                        <Loader2 className='h-4 w-4 animate-spin' />
                        <p className='text-sm font-semibold'>Searching for similar colors to suggest updates...</p>
                    </div>
                )}
                {currentJobSuggestions.map(suggestion => (
                    <div key={suggestion.originalColor.id} className="p-3 rounded-lg bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/30 flex items-start gap-3 mb-4">
                        <AlertTriangle className='h-4 w-4 mt-1 flex-shrink-0' />
                        <div className='text-sm flex-grow'>
                            <p className='font-semibold'>AI Suggestion</p>
                            <p>Because you updated a color in '{suggestion.sourceJobName}', we suggest updating a similar color in this job:
                            <br/>
                            From <span className="font-mono">C{suggestion.originalColor.cmyk.c} M{suggestion.originalColor.cmyk.m} Y{suggestion.originalColor.cmyk.y} K{suggestion.originalColor.cmyk.k}</span> to <span className="font-mono">C{suggestion.suggestedCmyk.c} M{suggestion.suggestedCmyk.m} Y{suggestion.suggestedCmyk.y} K{suggestion.suggestedCmyk.k}</span>
                            </p>
                            <div className="mt-2 space-x-2">
                                <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => handleApplySuggestion(suggestion)}>Apply Change</Button>
                                <Button variant="link" size="sm" className="p-0 h-auto text-muted-foreground" onClick={() => handleDismissSuggestion(suggestion)}>Dismiss</Button>
                            </div>
                        </div>
                    </div>
                ))}
                {jobColorsLoading ? (
                    <div className="flex items-center justify-center h-full min-h-[400px]">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : !selectedJob ? (
                     <div className="flex items-center justify-center h-full text-center text-muted-foreground min-h-[400px]">
                        <p>Select a job to view its colors, or create a new one.</p>
                    </div>
                ) : jobColors.length > 0 ? (
                    <>
                    <div className="flex items-center space-x-2 pb-2 pl-4">
                        <Checkbox
                            id="select-all-colors"
                            checked={jobColors.length > 0 && selectedColorIds.size === jobColors.length}
                            onCheckedChange={handleSelectAll}
                        />
                         <label htmlFor="select-all-colors" className="text-sm font-medium">
                            {selectedColorIds.size > 0 ? `${selectedColorIds.size} selected` : 'Select All'}
                         </label>
                    </div>
                    <ScrollArea className="h-[calc(100vh-20rem)]">
                        <div className="space-y-4 pr-4">
                            {jobColors.map(color => (
                                <ColorEntry
                                    key={color.id}
                                    color={color}
                                    onEdit={handleEditColor}
                                    onDelete={handleOpenDeleteDialog}
                                    onSearch={handleSearchSimilar}
                                    isSelected={selectedColorIds.has(color.id)}
                                    onToggleSelect={handleToggleSelection}
                                />
                            ))}
                        </div>
                    </ScrollArea>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-16">
                        <Droplet className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold">No colours tracked yet</h3>
                        <p className="text-muted-foreground">Click "Add Colour" to start tracking for this job.</p>
                    </div>
                )}
              </CardContent>
            </Card>
        </div>
      </div>
      <AddColorDialog 
        open={isColorDialogOpen} 
        onOpenChange={setColorDialogOpen} 
        onSave={handleSaveColor}
        initialData={editingColor}
        printers={printers}
      />
      <ColorSearchDialog
        open={isSearchDialogOpen}
        onOpenChange={setIsSearchDialogOpen}
        sourceColor={searchColor}
        jobs={jobs}
       />
       <MultiGridOptionsDialog
            open={isMultiGridDialogOpen}
            onOpenChange={setMultiGridDialogOpen}
            onGenerate={handleGenerateMultiGridPdf}
            selectedCount={selectedColorIds.size}
        />
        <ReferenceSheetDialog
            open={isReferenceSheetDialogOpen}
            onOpenChange={setReferenceSheetDialogOpen}
            onGenerate={handleGenerateReferenceSheet}
        />
      <AlertDialog open={!!colorToDeleteId} onOpenChange={(open) => !open && setColorToDeleteId(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this colour entry from the job's history.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setColorToDeleteId(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteColor}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ManagePrintersDialog 
        open={isPrintersDialogOpen} 
        onOpenChange={setPrintersDialogOpen} 
        printers={printers} 
        userDocRef={userDocRef}
      />
    </>
  );
}

    

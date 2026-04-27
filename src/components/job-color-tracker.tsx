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
import type { PrintStripEntry as PdfPrintStripEntry } from '@/app/actions/pdf-actions';
import { base64ToBlob, triggerDownload } from '@/lib/export';
import { MultiGridOptionsDialog, type MultiGridFormValues } from "./multi-grid-options-dialog";
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';
import { ReferenceSheetDialog, type ReferenceSheetFormValues } from './reference-sheet-dialog';
import type { PantoneColor } from '@/lib/pantone';
import { findClosestCMPTone } from '@/app/actions/color-actions';
import { ManagePrintersDialog } from './manage-printers-dialog';


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
      <div className="p-4 border rounded-lg flex gap-4 items-start group bg-card/50">
        <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(color.id)}
            aria-label={`Select color ${hex}`}
            className="mt-1"
        />
        <div className="w-20 h-20 rounded-md border shrink-0 shadow-sm" style={{ backgroundColor: hex }} />
        <div className="flex-grow space-y-1 text-sm">
          <p className="font-bold text-base">{hex.toUpperCase()}</p>
          <p className="font-mono text-muted-foreground">CMYK: C{color.cmyk.c} M{color.cmyk.m} Y{color.cmyk.y} K{color.cmyk.k}</p>
          {color.notes && <p className="text-muted-foreground italic pt-1 text-xs">"{color.notes}"</p>}
          <div className="flex gap-4 items-center flex-wrap pt-2">
            <p className="text-[10px] text-muted-foreground/80 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {new Date(color.timestamp).toLocaleString()}
            </p>
            {color.printerId && (
              <Badge variant="outline" className="text-[10px] h-5">
                  <Printer className="w-2.5 h-2.5 mr-1" />
                  {color.printerId}
              </Badge>
            )}
            {color.media && (
              <Badge variant="outline" className="text-[10px] h-5">
                  <Layers className="w-2.5 h-2.5 mr-1" />
                  {color.media}
              </Badge>
            )}
            {color.gracol && <Badge variant="secondary" className="text-[10px] h-5">GRACol</Badge>}
            {color.fogra && <Badge variant="secondary" className="text-[10px] h-5">FOGRA</Badge>}
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
  const { user } = useAuth();
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
  const [jobSearchTerm, setJobSearchTerm] = useState("");

  // --- Data Fetching ---
  const userDocRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const [userDoc] = useDoc(userDocRef);

  const printers: string[] = useMemo(() => {
    return userDoc?.data()?.printers || [];
  }, [userDoc]);

  const jobsQuery = useMemo(() => {
    if (!user?.uid || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/jobs`), orderBy('createdAt', 'desc'));
  }, [user?.uid, firestore]);

  const [jobsSnapshot, jobsLoading] = useCollection(jobsQuery);

  const jobs: Job[] = useMemo(() => {
    if (!jobsSnapshot) return [];
    return jobsSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<Job, 'id'>) }));
  }, [jobsSnapshot]);
  
  const filteredJobs = useMemo(() => {
    const lowercasedFilter = jobSearchTerm.toLowerCase();
    if (lowercasedFilter) {
      return jobs.filter(job => job.name.toLowerCase().includes(lowercasedFilter));
    }
    return jobs.slice(0, 10);
  }, [jobs, jobSearchTerm]);

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
        await updateDoc(colorDocRef, dataToSave);
      } else {
        const colorsCollectionRef = collection(jobDocRef, 'colors');
        await addDoc(colorsCollectionRef, dataToSave);
      }
    } catch (e) {
      reportError(e as Error, { context: "Save Color" });
    }
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
          const rgb = cmykToRgb(c.cmyk.c, c.cmyk.m, c.cmyk.y, c.cmyk.k);
          pantoneMatch = await findClosestCMPTone(rgb);
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
            const rgb = cmykToRgb(color.cmyk.c, color.cmyk.m, color.cmyk.y, color.cmyk.k);
            pantoneMatch = await findClosestCMPTone(rgb);
            return { cmyk: color.cmyk, cmptone: pantoneMatch };
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
          reportError(error as Error, { context: 'Reference Sheet PDF Generation from Job' });
          console.error("Reference sheet PDF generation failed", error);
          toast({ variant: 'destructive', title: 'PDF Failed', description: 'Could not generate the PDF.' });
        } finally {
          setIsPdfLoading(false);
        }
    };


  return (
    <>
      <div className="h-full w-full p-4 lg:p-6 bg-background flex flex-col min-h-0 overflow-hidden">
          <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0 overflow-hidden">
            <Card className="w-full lg:w-[350px] flex flex-col flex-shrink-0 min-h-0 overflow-hidden">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="text-xl">All Jobs</CardTitle>
                <CardDescription>Select a project to manage colours.</CardDescription>
                <div className="relative pt-2">
                    <Search className="absolute left-3 top-[1.4rem] h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search jobs..."
                        value={jobSearchTerm}
                        onChange={(e) => setJobSearchTerm(e.target.value)}
                        className="pl-9 h-9"
                    />
                </div>
              </CardHeader>
              <CardContent className="flex-grow min-h-0 overflow-hidden p-0">
                <ScrollArea className="h-full">
                  <div className="space-y-1 p-4">
                      {jobsLoading ? (
                        <div className="space-y-2">
                          {[...Array(5)].map((_, i) => <div key={i} className="h-10 w-full bg-muted animate-pulse rounded-md" />)}
                        </div>
                      ) : filteredJobs.length > 0 ? filteredJobs.map(job => (
                        <div key={job.id} className="flex items-center gap-1 group">
                            <Button
                            variant={selectedJobId === job.id ? 'secondary' : 'ghost'}
                            className="flex-grow justify-start h-10 truncate"
                            onClick={() => setSelectedJobId(job.id)}
                            >
                            <span className="truncate">{job.name}</span>
                            </Button>
                            <Button variant="ghost" size="icon" className="w-8 h-8 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => handleDeleteJob(job.id)} aria-label={`Delete job: ${job.name}`}>
                                <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                        </div>
                      )) : (
                          <p className="text-sm text-muted-foreground p-4 text-center">No jobs found.</p>
                      )}
                  </div>
                </ScrollArea>
              </CardContent>
              <CardFooter className="pt-4 border-t flex-col gap-2 flex-shrink-0">
                  <div className="w-full flex items-center gap-2">
                      <Input
                          placeholder="New job name..."
                          value={newJobName}
                          onChange={e => setNewJobName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddJob()}
                          className="h-9"
                      />
                      <Button size="sm" onClick={handleAddJob}><FilePlus className="mr-1.5 h-4 w-4"/> Add</Button>
                  </div>
                  <div className="w-full flex items-center gap-2 pt-1">
                      <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportData} />
                      <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={handleExportData}><Download className="mr-1 h-3.5 w-3.5"/> Export</Button>
                      <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => fileInputRef.current?.click()}><Upload className="mr-1 h-3.5 w-3.5"/> Import</Button>
                  </div>
                   <Button variant="ghost" size="sm" className="w-full h-8 text-xs mt-1" onClick={() => setPrintersDialogOpen(true)}><Settings className="mr-1.5 h-3.5 w-3.5"/> Manage Printers</Button>
              </CardFooter>
            </Card>

            <Card className="flex-grow flex flex-col min-h-0 overflow-hidden shadow-lg border-primary/10">
              <CardHeader className="flex-shrink-0 border-b bg-muted/10">
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <div>
                    <CardTitle className="text-xl">Colours: {selectedJob?.name || '...'}</CardTitle>
                    <CardDescription>Revision history and tracked swatches.</CardDescription>
                  </div>
                  <div className="flex items-center flex-wrap gap-2">
                     <Button size="sm" variant="outline" onClick={() => setMultiGridDialogOpen(true)} disabled={selectedColorIds.size === 0 || isPdfLoading || !selectedJob}>
                        {isPdfLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin"/> : <GridIcon className="mr-1.5 h-4 w-4"/>} Grids ({selectedColorIds.size})
                     </Button>
                     <Button size="sm" variant="outline" onClick={() => setReferenceSheetDialogOpen(true)} disabled={selectedColorIds.size === 0 || isPdfLoading || !selectedJob}>
                        {isPdfLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin"/> : <FileArchive className="mr-1.5 h-4 w-4"/>} Ref. Sheet
                     </Button>
                     <Button size="sm" variant="outline" onClick={handlePrintStrip} disabled={!selectedJob || jobColors.length === 0 || isPdfLoading}>
                        {isPdfLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin"/> : <Printer className="mr-1.5 h-4 w-4"/>} Strip
                     </Button>
                     <Button size="sm" onClick={() => { setEditingColor(null); setColorDialogOpen(true); }} disabled={!selectedJobId}><PlusCircle className="mr-1.5 h-4 w-4"/> Add Colour</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow min-h-0 flex flex-col p-0">
                <div className="flex-grow min-h-0 flex flex-col">
                  {jobColorsLoading ? (
                      <div className="flex-grow flex items-center justify-center">
                          <Loader2 className="h-12 w-12 animate-spin text-primary/40" />
                      </div>
                  ) : !selectedJob ? (
                       <div className="flex-grow flex items-center justify-center text-center text-muted-foreground p-8">
                          <div className="max-w-xs space-y-2">
                            <Layers className="mx-auto h-12 w-12 opacity-20 mb-4" />
                            <p className="font-medium">No Job Selected</p>
                            <p className="text-xs">Choose a project from the left panel to start tracking CMYK formulas.</p>
                          </div>
                      </div>
                  ) : jobColors.length > 0 ? (
                      <div className="flex-grow min-h-0 flex flex-col">
                        <div className="flex items-center space-x-2 py-3 px-6 border-b bg-muted/5 flex-shrink-0">
                            <Checkbox
                                id="select-all-colors"
                                checked={jobColors.length > 0 && selectedColorIds.size === jobColors.length}
                                onCheckedChange={handleSelectAll}
                            />
                            <label htmlFor="select-all-colors" className="text-xs font-semibold text-muted-foreground cursor-pointer select-none">
                                {selectedColorIds.size > 0 ? `${selectedColorIds.size} Selected` : 'Select All Colors'}
                            </label>
                        </div>
                        <ScrollArea className="flex-grow">
                            <div className="p-6 space-y-4">
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
                      </div>
                  ) : (
                      <div className="flex-grow flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                          <Droplet className="w-16 h-16 opacity-10 mb-4" />
                          <h3 className="text-lg font-semibold text-foreground/70">No formulas yet</h3>
                          <p className="text-sm max-w-xs mx-auto">Click "Add Colour" to begin tracking production CMYK data for this job.</p>
                      </div>
                  )}
                </div>
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
                <AlertDialogTitle>Delete Colour Entry?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This formula will be removed from your job history.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setColorToDeleteId(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteColor} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
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

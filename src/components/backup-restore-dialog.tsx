"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Download, Upload, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useFirestore } from "@/firebase";
import { collection, doc, getDocs, getDoc, writeBatch } from "firebase/firestore";
import type { Job, JobColor } from "@/lib/types";
import { triggerDownload } from "@/lib/export";
import type { ColorHistoryEntry } from "./color-history";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

interface FullBackupData {
    version: number;
    createdAt: string;
    colorHistory: ColorHistoryEntry[];
    printers: string[];
    jobs: { [jobId: string]: { name: string; colors: JobColor[] } };
}

interface BackupRestoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colorHistory: ColorHistoryEntry[];
  setColorHistory: (history: ColorHistoryEntry[]) => void;
}

export function BackupRestoreDialog({ open, onOpenChange, colorHistory, setColorHistory }: BackupRestoreDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const firestore = useFirestore();

  const handleCreateBackup = async () => {
    if (!user || !firestore) return;
    setIsLoading(true);
    toast({ title: "Creating Backup...", description: "Please wait while we gather your data." });

    try {
        // 1. Fetch user document for printers
        const userDocRef = doc(firestore, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        const printers = userDocSnap.data()?.printers || [];

        // 2. Fetch all jobs and their colors
        const jobsCollectionRef = collection(firestore, `users/${user.uid}/jobs`);
        const jobsSnapshot = await getDocs(jobsCollectionRef);
        const jobsData: FullBackupData['jobs'] = {};

        for (const jobDoc of jobsSnapshot.docs) {
            const job = { id: jobDoc.id, name: jobDoc.data().name as string };
            const colors: JobColor[] = [];
            const colorsSnapshot = await getDocs(collection(jobDoc.ref, 'colors'));
            colorsSnapshot.forEach(colorDoc => {
                colors.push({ id: colorDoc.id, ...colorDoc.data() } as JobColor);
            });
            jobsData[job.id] = { name: job.name, colors };
        }

        // 3. Combine all data
        const backupData: FullBackupData = {
            version: 1,
            createdAt: new Date().toISOString(),
            colorHistory, // From props
            printers,
            jobs: jobsData,
        };
        
        // 4. Create and download file
        const jsonContent = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const timestamp = new Date().toISOString().split('T')[0];
        triggerDownload(blob, `colour-matcher-pro_backup_${timestamp}.json`);
        
        toast({ title: "Backup Created", description: "Your data has been saved to your computer." });

    } catch (error) {
        console.error("Backup failed:", error);
        toast({ variant: "destructive", title: "Backup Failed", description: "Could not create the backup file." });
    } finally {
        setIsLoading(false);
    }
  };

  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !firestore) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        setIsLoading(true);
        toast({ title: "Restoring Data...", description: "This may take a moment. Do not close this window." });
        try {
            const backupData = JSON.parse(e.target?.result as string) as FullBackupData;
            
            // Basic validation
            if (backupData.version !== 1 || !backupData.jobs || !backupData.colorHistory) {
                throw new Error("Invalid or corrupted backup file.");
            }

            const batch = writeBatch(firestore);

            // 1. Restore Printers
            const userDocRef = doc(firestore, 'users', user.uid);
            batch.update(userDocRef, { printers: backupData.printers || [] });

            // 2. Clear existing jobs first (important!)
            const existingJobsSnapshot = await getDocs(collection(firestore, `users/${user.uid}/jobs`));
            for (const jobDoc of existingJobsSnapshot.docs) {
                // We also need to delete subcollections
                const colorsSnapshot = await getDocs(collection(jobDoc.ref, 'colors'));
                for(const colorDoc of colorsSnapshot.docs) {
                    batch.delete(colorDoc.ref);
                }
                batch.delete(jobDoc.ref);
            }
            
            // 3. Restore Jobs and Colors
            for (const jobId in backupData.jobs) {
                const jobData = backupData.jobs[jobId];
                const newJobRef = doc(firestore, `users/${user.uid}/jobs`, jobId);
                batch.set(newJobRef, { name: jobData.name, createdAt: new Date().toISOString() });
                
                for (const color of jobData.colors) {
                    const { id, ...colorDataToImport } = color;
                    const newColorRef = doc(collection(newJobRef, 'colors'), id);
                    batch.set(newColorRef, colorDataToImport);
                }
            }

            await batch.commit();
            
            // 4. Restore Color History to local state/storage
            setColorHistory(backupData.colorHistory);

            toast({ title: "Restore Successful", description: "Your application data has been fully restored." });
            onOpenChange(false); // Close dialog on success
        } catch (error) {
            console.error("Restore failed:", error);
            toast({ variant: "destructive", title: "Restore Failed", description: "The file might be invalid or corrupted." });
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };
    reader.readAsText(file);
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Backup & Restore</DialogTitle>
          <DialogDescription>
            Save a complete snapshot of all your data or restore from a previous backup.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
            <div>
                <h4 className="font-semibold mb-2">Create Backup</h4>
                <p className="text-sm text-muted-foreground mb-4">
                    This will download a single JSON file containing all your Jobs, Colors, Printers, and your Grid Generator Color History. Keep this file in a safe place.
                </p>
                <Button onClick={handleCreateBackup} disabled={isLoading} className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4" />}
                    Create and Download Backup File
                </Button>
            </div>

            <hr />

            <div>
                <h4 className="font-semibold mb-2">Restore from Backup</h4>
                <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Warning</AlertTitle>
                    <AlertDescription>
                        Restoring from a backup will **completely overwrite** all your current Colour Tracker data (Jobs, Colors, Printers). This action cannot be undone.
                    </AlertDescription>
                </Alert>
                <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleRestore} />
                <Button onClick={() => fileInputRef.current?.click()} disabled={isLoading} variant="outline" className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4" />}
                    Choose Backup File to Restore
                </Button>
            </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

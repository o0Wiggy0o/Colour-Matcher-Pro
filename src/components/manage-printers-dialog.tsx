
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2 } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { doc, getDoc, setDoc, DocumentReference } from 'firebase/firestore';
import { useAuth } from "@/hooks/useAuth";
import { useFirestore } from "@/firebase";

interface ManagePrintersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  printers: string[];
  userDocRef: DocumentReference | null;
}

export function ManagePrintersDialog({ open, onOpenChange, printers, userDocRef }: ManagePrintersDialogProps) {
  const [newPrinterName, setNewPrinterName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const firestore = useFirestore();

  const handleUpdatePrinters = async (updatedPrinters: string[]) => {
    if (!userDocRef || !user || !firestore) return;
    setIsSubmitting(true);
    try {
        const userSnap = await getDoc(userDocRef);
        
        let dataToWrite: any;

        if (userSnap.exists()) {
            // Document exists, just update the printers field
             dataToWrite = {
                ...userSnap.data(),
                printers: updatedPrinters,
            };
        } else {
            // Document does not exist, create it with all necessary fields
            dataToWrite = {
                id: user.uid,
                email: user.email,
                username: user.displayName || user.email,
                dateJoined: new Date().toISOString(),
                printers: updatedPrinters,
            };
        }

        // Use setDoc to either create or overwrite. This is safe because we're including all fields.
        await setDoc(userDocRef, dataToWrite);

    } catch (error: any) {
        console.error("Firestore Error:", error);
        toast({
          variant: "destructive",
          title: "Database Error",
          description: error.message.includes('permission-denied') 
            ? "Permission denied. Please check Firestore rules."
            : "Could not update printers. Please try again."
        });
        throw error; // Re-throw to prevent further actions in the calling function
    } finally {
        setIsSubmitting(false);
    }
  };


  const handleAddPrinter = async () => {
    const trimmedName = newPrinterName.trim();
    if (!trimmedName) return;

    if (printers.includes(trimmedName)) {
      toast({ variant: "destructive", title: "Printer Exists", description: "This printer name is already in your list." });
      return;
    }
    
    try {
      await handleUpdatePrinters([...printers, trimmedName]);
      setNewPrinterName("");
      toast({ title: "Printer Added", description: `"${trimmedName}" has been added.` });
    } catch(error) {
      console.error("Failed to add printer:", error);
      // The error toast is now handled inside handleUpdatePrinters
    }
  };

  const handleRemovePrinter = async (printerToRemove: string) => {
    try {
        const updatedPrinters = printers.filter(p => p !== printerToRemove);
        await handleUpdatePrinters(updatedPrinters);
        toast({ title: "Printer Removed", description: `"${printerToRemove}" has been removed.` });
    } catch(error) {
       console.error("Failed to remove printer:", error);
       // The error toast is now handled inside handleUpdatePrinters
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Printers</DialogTitle>
          <DialogDescription>
            Add or remove printers from your list. This list is saved to your account.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Input
                    placeholder="New printer name..."
                    value={newPrinterName}
                    onChange={(e) => setNewPrinterName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddPrinter()}
                />
                <Button onClick={handleAddPrinter} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Add
                </Button>
            </div>

            <ScrollArea className="h-48 border rounded-md p-2">
                {printers.length > 0 ? (
                    <div className="space-y-2">
                    {printers.map(printer => (
                        <div key={printer} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                            <span className="text-sm">{printer}</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleRemovePrinter(printer)} aria-label={`Remove printer ${printer}`} disabled={isSubmitting}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                        No printers added yet.
                    </div>
                )}
            </ScrollArea>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

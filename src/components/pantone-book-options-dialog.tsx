
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { SectionHelpDialog, HelpTrigger } from "./section-help-dialog";

const A4_LANDSCAPE_WIDTH_MM = 297;
const STORAGE_KEY = 'cmptone-book-options';

const formSchema = z.object({
  printer: z.string().optional(),
  profile: z.string().optional(),
  media: z.string().optional(),
  mediaWidth: z.coerce.number()
    .min(A4_LANDSCAPE_WIDTH_MM, { message: `Must be at least ${A4_LANDSCAPE_WIDTH_MM}mm (A4 landscape width).`})
    .optional(),
});

// These are the values from the form itself.
type CMPToneBookDialogFormValues = z.infer<typeof formSchema>;

// This is the shape of the data the server action expects.
export type CMPToneBookActionOptions = {
    printer?: string;
    profile?: string;
    media?: string;
    columns?: number;
};

interface CMPToneBookOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (values: CMPToneBookActionOptions) => void;
}

export function CMPToneBookOptionsDialog({ open, onOpenChange, onGenerate }: CMPToneBookOptionsDialogProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const form = useForm<CMPToneBookDialogFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        printer: '',
        profile: '',
        media: '',
        mediaWidth: undefined,
    }
  });

  // Load stored options when the dialog opens
  useEffect(() => {
    if (open) {
      try {
        const storedOptions = localStorage.getItem(STORAGE_KEY);
        if (storedOptions) {
          const parsedOptions = JSON.parse(storedOptions);
          form.reset(parsedOptions);
        }
      } catch (error) {
        console.error("Failed to load cmptone book options from localStorage", error);
      }
    }
  }, [open, form]);


  const onSubmit = (values: CMPToneBookDialogFormValues) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    } catch (error) {
        console.error("Failed to save cmptone book options to localStorage", error);
    }
    
    const columns = values.mediaWidth ? Math.floor(values.mediaWidth / A4_LANDSCAPE_WIDTH_MM) : 1;
    onGenerate({
        printer: values.printer,
        profile: values.profile,
        media: values.media,
        columns: Math.max(1, columns),
    });
    onOpenChange(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>Print CMPTone Swatch Book</DialogTitle>
            <HelpTrigger onClick={() => setIsHelpOpen(true)} />
          </div>
          <DialogDescription>
            Enter production details for your swatch book. This info will be on the cover page for future reference.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="printer" render={({ field }) => (
                <FormItem>
                    <FormLabel>Printer Name (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g., Epson SureColor P9000" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
            <FormField control={form.control} name="profile" render={({ field }) => (
                <FormItem>
                    <FormLabel>Color Profile (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g., GRACoL 2013" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
            <FormField control={form.control} name="media" render={({ field }) => (
                <FormItem>
                    <FormLabel>Media Used (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g., Premium Luster Photo Paper" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
            <FormField
              control={form.control}
              name="mediaWidth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Media Roll Width (mm)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder={`e.g., 610 for a 24" roll`}
                      {...field}
                      onChange={event => field.onChange(event.target.value === '' ? undefined : +event.target.value)}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional. The app will calculate how many A4 columns fit. Defaults to 1.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Generate & Download PDF</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
     <SectionHelpDialog
        open={isHelpOpen}
        onOpenChange={setIsHelpOpen}
        title="Creating a Reliable Reference Book"
        description="Follow these steps to ensure your printed swatch book is an accurate and useful tool."
      >
        <div className="space-y-4">
            <div>
                <h4 className="font-bold mb-1">1. Understand the Goal</h4>
                <p className="text-muted-foreground">
                The CMYK values for CMPTone® colors are standard simulations. The purpose of this printed book is to create your own physical reference, showing exactly how these CMYK values reproduce on <strong>your specific printer and media</strong>. This printed book becomes your "ground truth" for your unique production setup.
                </p>
            </div>
            <div>
                <h4 className="font-bold mb-1">2. Printer Setup is Key</h4>
                <p className="text-muted-foreground">
                Before printing, it's crucial to calibrate your printer to the media you are using. An uncalibrated system will not produce accurate colors. Also, ensure your printheads are clean by running a nozzle check.
                </p>
            </div>
            <div>
                <h4 className="font-bold mb-1">3. The Workflow</h4>
                <p className="text-muted-foreground">
                Print this swatch book. Then, when a client asks for a specific color, find the closest <em>visual match</em> in this custom book you've printed. The CMYK value of that matching swatch is the one you should use in your design file.
                </p>
            </div>
            <div>
                <h4 className="font-bold mb-1">4. Consistent Viewing</h4>
                <p className="text-muted-foreground">
                For best results, view the final printed swatches and compare them to your reference under controlled lighting, such as a D50 light booth. Standard office lighting can significantly alter how colors appear.
                </p>
            </div>
            <div>
                <h4 className="font-bold mb-1">5. Choosing a Rendering Intent</h4>
                <p className="text-muted-foreground">
                    When your RIP software asks for a rendering intent, <strong>Relative Colorimetric</strong> is almost always the best choice for this task. It ensures that any CMYK values from the swatch book that are within your printer's gamut (the range of colors it can produce) are reproduced as accurately as possible.
                </p>
            </div>
        </div>
      </SectionHelpDialog>
    </>
  );
}

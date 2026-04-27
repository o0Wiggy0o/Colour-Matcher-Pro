
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "./ui/checkbox";
import { FormDescription } from "./ui/form";

const formSchema = z.object({
  title: z.string().optional(),
  includeVariations: z.boolean().optional(),
  customerSample: z.boolean().optional(),
});

export type PrintStripOptionsFormValues = z.infer<typeof formSchema>;

interface PrintStripOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (values: PrintStripOptionsFormValues) => void;
}

export function PrintStripOptionsDialog({ open, onOpenChange, onGenerate }: PrintStripOptionsDialogProps) {
  const form = useForm<PrintStripOptionsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        title: '',
        includeVariations: false,
        customerSample: false,
    }
  });

  const onSubmit = (values: PrintStripOptionsFormValues) => {
    onGenerate(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
            form.reset();
        }
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Download Print Strip PDF</DialogTitle>
          <DialogDescription>
            Set options for the generated PDF file. The file name will be based on the title.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                    <FormLabel>Project Title (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g., Client X Banner" {...field} /></FormControl>
                    <FormDescription>This will be used as the file name.</FormDescription>
                </FormItem>
            )} />

             <FormField
              control={form.control}
              name="includeVariations"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Include Variations
                    </FormLabel>
                    <FormDescription>
                      Adds 6 subtle variations around each selected color on the PDF.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="customerSample"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Customer Sample
                    </FormLabel>
                    <FormDescription>
                      Downloads two PDFs: one with full CMYK values for you, and one with simple numbers for your client.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Generate PDF</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

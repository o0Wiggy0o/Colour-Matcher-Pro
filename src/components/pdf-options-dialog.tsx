
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "./ui/checkbox";
import { FormDescription } from "./ui/form";

const formSchema = z.object({
  title: z.string().optional(),
  client: z.string().optional(),
  notes: z.string().optional(),
  paperFormat: z.enum(['A4', 'A3', 'Custom']).default('A4'),
  customWidth: z.coerce.number().optional(),
  customHeight: z.coerce.number().optional(),
  customerSample: z.boolean().optional(),
}).refine(data => {
    if (data.paperFormat === 'Custom') {
        return !!data.customWidth && !!data.customHeight;
    }
    return true;
}, {
    message: "Custom dimensions are required.",
    path: ["customWidth"],
});

export type PdfOptionsFormValues = z.infer<typeof formSchema>;

interface PdfOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (values: PdfOptionsFormValues) => void;
}

export function PdfOptionsDialog({ open, onOpenChange, onGenerate }: PdfOptionsDialogProps) {
  const form = useForm<PdfOptionsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        title: '',
        client: '',
        notes: '',
        paperFormat: 'A4',
        customWidth: undefined,
        customHeight: undefined,
        customerSample: false,
    }
  });

  const paperFormat = form.watch('paperFormat');

  const onSubmit = (values: PdfOptionsFormValues) => {
    onGenerate(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Download CMYK PDF</DialogTitle>
          <DialogDescription>
            Set options for the generated PDF file. Annotations will be added to the top of the page.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Project Title (Optional)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="client" render={({ field }) => (
                <FormItem><FormLabel>Client Name (Optional)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
            )} />
            
            <FormField control={form.control} name="paperFormat" render={({ field }) => (
                <FormItem className="space-y-3">
                    <FormLabel>Paper Format</FormLabel>
                    <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                            <FormItem className="flex items-center space-x-2"><RadioGroupItem value="A4" id="a4" /><FormLabel htmlFor="a4" className="font-normal">A4</FormLabel></FormItem>
                            <FormItem className="flex items-center space-x-2"><RadioGroupItem value="A3" id="a3" /><FormLabel htmlFor="a3" className="font-normal">A3</FormLabel></FormItem>
                            <FormItem className="flex items-center space-x-2"><RadioGroupItem value="Custom" id="custom" /><FormLabel htmlFor="custom" className="font-normal">Custom</FormLabel></FormItem>
                        </RadioGroup>
                    </FormControl>
                </FormItem>
            )} />

            {paperFormat === 'Custom' && (
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="customWidth" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Width (mm)</FormLabel>
                            <FormControl>
                                <Input
                                type="number"
                                {...field}
                                value={field.value ?? ''}
                                onChange={event => field.onChange(event.target.value === '' ? undefined : +event.target.value)}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="customHeight" render={({ field }) => (
                         <FormItem>
                            <FormLabel>Height (mm)</FormLabel>
                            <FormControl>
                                <Input
                                type="number"
                                {...field}
                                value={field.value ?? ''}
                                onChange={event => field.onChange(event.target.value === '' ? undefined : +event.target.value)}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
            )}

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
                      This will replace CMYK values with numbers on each swatch, so you can share the PDF with clients without revealing color formulas.
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

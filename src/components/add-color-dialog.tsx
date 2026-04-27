
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { JobColor } from '@/lib/types';
import { useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";

const formSchema = z.object({
  c: z.coerce.number().min(0).max(100),
  m: z.coerce.number().min(0).max(100),
  y: z.coerce.number().min(0).max(100),
  k: z.coerce.number().min(0).max(100),
  notes: z.string().optional(),
  printerId: z.string().optional(),
  media: z.string().optional(),
  gracol: z.boolean().optional(),
  fogra: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddColorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: FormValues & { id?: string }) => void;
  initialData?: JobColor | null;
  printers: string[];
}

export function AddColorDialog({ open, onOpenChange, onSave, initialData, printers }: AddColorDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });
  
  const isEditing = !!initialData;

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset({
          ...initialData.cmyk,
          notes: initialData.notes || "",
          printerId: initialData.printerId || "",
          media: initialData.media || "",
          gracol: initialData.gracol || false,
          fogra: initialData.fogra || false,
        });
      } else {
        form.reset({ c: 0, m: 0, y: 0, k: 0, notes: "", printerId: "", media: "", gracol: false, fogra: false });
      }
    }
  }, [open, initialData, form]);

  const onSubmit = (values: FormValues) => {
    const submissionData = {
        ...values, // This now correctly includes the new c,m,y,k from the form
        id: initialData?.id,
    };
    onSave(submissionData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Colour' : 'Add New Colour'}</DialogTitle>
          <DialogDescription>
            {isEditing 
                ? "Update the CMYK values and notes for this colour entry."
                : "Enter the CMYK values and any relevant notes for this colour entry."
            }
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {(["c", "m", "y", "k"] as const).map((component) => (
                <FormField key={component} control={form.control} name={component} render={({ field }) => (
                  <FormItem>
                    <FormLabel>{component.toUpperCase()}</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              ))}
            </div>
             <FormField
              control={form.control}
              name="printerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Printer</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                    value={field.value || 'none'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a printer (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {printers.map((printer) => (
                        <SelectItem key={printer} value={printer}>
                          {printer}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="media"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Media Used (Optional)</FormLabel>
                  <FormControl><Input placeholder="e.g., Oracal 3651, Photo Luster Paper" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea placeholder="e.g., Initial colour for logo, client requested darker version..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="space-y-2">
              <FormLabel>Rendering Profiles</FormLabel>
              <div className="flex items-center space-x-4 pt-1">
                <FormField
                  control={form.control}
                  name="gracol"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">GRACol</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fogra"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">FOGRA</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">{isEditing ? 'Save Changes' : 'Save Colour'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

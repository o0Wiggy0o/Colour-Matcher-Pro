
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CmykColor } from "@/lib/grid";
import { defaultFormValues } from "./grid-generator";
import { Input } from "./ui/input";

const axisOptions: {value: keyof CmykColor, label: string}[] = [
    { value: 'c', label: 'Cyan (C)' },
    { value: 'm', label: 'Magenta (M)' },
    { value: 'y', label: 'Yellow (Y)' },
    { value: 'k', label: 'Black (K)' },
];

const formSchema = z.object({
  gridSize: z.coerce.number().min(3, "Must be >= 3").max(15, "Must be <= 15").refine(n => n % 2 !== 0, { message: "Must be an odd number." }),
  step: z.coerce.number().min(1).max(50),
  xAxis: z.enum(['c', 'm', 'y', 'k']),
  yAxis: z.enum(['c', 'm', 'y', 'k']),
}).refine(data => data.xAxis !== data.yAxis, {
  message: "Axes must be different",
  path: ["yAxis"],
});

export type MultiGridFormValues = z.infer<typeof formSchema>;

interface MultiGridOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (values: MultiGridFormValues) => void;
  selectedCount: number;
}

export function MultiGridOptionsDialog({ open, onOpenChange, onGenerate, selectedCount }: MultiGridOptionsDialogProps) {
  const form = useForm<MultiGridFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        gridSize: defaultFormValues.gridSize,
        step: defaultFormValues.step,
        xAxis: defaultFormValues.xAxis,
        yAxis: defaultFormValues.yAxis,
    }
  });

  const onSubmit = (values: MultiGridFormValues) => {
    onGenerate(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Print Selected Grids ({selectedCount})</DialogTitle>
          <DialogDescription>
            Set the grid parameters that will be applied to all selected colors. Each grid will be generated on a separate page in a single PDF file.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
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

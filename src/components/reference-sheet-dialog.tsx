"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef } from "react";
import { FormDescription } from "./ui/form";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Checkbox } from "./ui/checkbox";

const MAX_LOGO_SIZE_MB = 1;
const MAX_LOGO_SIZE_BYTES = MAX_LOGO_SIZE_MB * 1024 * 1024;

const formSchema = z.object({
  title: z.string().min(1, "A title is required."),
  details: z.string().optional(),
  logoFile: z.custom<FileList>().optional(),
  logoDataUri: z.string().optional(),
  paperFormat: z.enum(['A4', 'A3', 'Custom']).default('A4'),
  customWidth: z.coerce.number().optional(),
  customHeight: z.coerce.number().optional(),
  includeVariations: z.boolean().default(false),
}).refine(data => {
    if (data.paperFormat === 'Custom') {
        return !!data.customWidth && !!data.customHeight;
    }
    return true;
}, {
    message: "Custom dimensions are required.",
    path: ["customWidth"],
});

export type ReferenceSheetFormValues = z.infer<typeof formSchema>;

interface ReferenceSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (values: ReferenceSheetFormValues) => void;
}

export function ReferenceSheetDialog({ open, onOpenChange, onGenerate }: ReferenceSheetDialogProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<ReferenceSheetFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      details: "",
      paperFormat: "A4",
      includeVariations: false,
    },
  });

  const paperFormat = form.watch('paperFormat');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_LOGO_SIZE_BYTES) {
        toast({
            variant: "destructive",
            title: "File Too Large",
            description: `Logo image must be less than ${MAX_LOGO_SIZE_MB}MB.`,
        });
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        toast({
            variant: "destructive",
            title: "Invalid File Type",
            description: "Please upload a valid image file (e.g., PNG, JPG).",
        });
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const dataUri = event.target?.result as string;
        setLogoPreview(dataUri);
        form.setValue("logoDataUri", dataUri);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = (values: ReferenceSheetFormValues) => {
    onGenerate(values);
    onOpenChange(false);
  };
  
  const resetDialog = () => {
    form.reset();
    setLogoPreview(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };


  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) resetDialog();
    }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Generate Physical Reference Sheet</DialogTitle>
          <DialogDescription>
            Create a professional, printable physical reference sheet with your logo and job details.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                    <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Client ABC - Brand Colors" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="details"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Details (Optional)</FormLabel>
                        <FormControl>
                            <Textarea className="resize-none" rows={3} placeholder="Add any relevant notes..." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                <div className="space-y-4">
                    <FormField
                        control={form.control}
                        name="logoFile"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Logo (Optional)</FormLabel>
                                <FormControl>
                                    <Input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleFileChange}
                                        ref={fileInputRef}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Max {MAX_LOGO_SIZE_MB}MB. PNG/JPG.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {logoPreview && (
                        <div className="text-center p-2 border rounded-md bg-muted/50">
                            <img src={logoPreview} alt="Logo preview" className="max-h-16 mx-auto" />
                        </div>
                    )}
                </div>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
                <h4 className="text-sm font-semibold">Page Setup & Options</h4>
                
                <FormField control={form.control} name="paperFormat" render={({ field }) => (
                    <FormItem className="space-y-3">
                        <FormLabel>Paper Format</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                <FormItem className="flex items-center space-x-2"><RadioGroupItem value="A4" id="ref-a4" /><FormLabel htmlFor="ref-a4" className="font-normal">A4</FormLabel></FormItem>
                                <FormItem className="flex items-center space-x-2"><RadioGroupItem value="A3" id="ref-a3" /><FormLabel htmlFor="ref-a3" className="font-normal">A3</FormLabel></FormItem>
                                <FormItem className="flex items-center space-x-2"><RadioGroupItem value="Custom" id="ref-custom" /><FormLabel htmlFor="ref-custom" className="font-normal">Custom</FormLabel></FormItem>
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
                    name="includeVariations"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/30">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>Include Color Variations</FormLabel>
                                <FormDescription>
                                    Generates 6 subtle variations for each color to help find the perfect production match.
                                </FormDescription>
                            </div>
                        </FormItem>
                    )}
                />
            </div>
            
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Generate PDF</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

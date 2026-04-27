
"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { UploadCloud, Pipette, FileDown, Trash2, XCircle, Copy, Loader2, Palette, SlidersHorizontal, Printer, FileText, PlusCircle, Lock, Search, SquarePlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { CmykColor } from '@/lib/grid';
import { cmykToRgb, rgbToCmyk, rgbToHex, extractDominantColors } from '@/lib/colors';
import { generateCmykStripPdf } from '@/app/actions/pdf-actions';
import type { PrintStripEntry as PdfPrintStripEntry } from '@/app/actions/pdf-actions';
import { findClosestCMPTone } from '@/app/actions/color-actions';
import { triggerDownload, base64ToBlob } from '@/lib/export';
import type { PantoneColor } from '@/lib/pantone';

import { Skeleton } from './ui/skeleton';
import { ScrollArea } from './ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { ProFeatureLock } from './pro-feature-lock';
import { trackEvent, reportError } from '@/lib/monitoring';
import { SectionHelpDialog, HelpTrigger } from './section-help-dialog';
import { PrintStripOptionsDialog, type PrintStripOptionsFormValues } from './print-strip-options-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';


type ColorData = {
    hex: string;
    cmyk: CmykColor;
    rgb: { r: number; g: number; b: number };
};

type PrintStripEntry = {
  cmyk: CmykColor;
  cmptone: PantoneColor | null;
  coords?: { x: number, y: number };
};


type LoupeState = {
    visible: boolean;
    x: number;
    y: number;
    colorData: ColorData | null;
    pantone: PantoneColor | null;
};

const manualColorSchema = z.object({
  c: z.coerce.number().min(0).max(100),
  m: z.coerce.number().min(0).max(100),
  y: z.coerce.number().min(0).max(100),
  k: z.coerce.number().min(0).max(100),
});
type ManualColorFormValues = z.infer<typeof manualColorSchema>;


const Loupe = ({ data }: { data: LoupeState }) => {
  if (!data.visible || !data.colorData) return null;

  const { x, y, colorData, pantone } = data;
  const loupeStyle: React.CSSProperties = {
    position: 'fixed',
    left: `${x + 20}px`,
    top: `${y + 20}px`,
    pointerEvents: 'none', // Prevent the loupe from capturing mouse events
  };

  return (
    <div style={loupeStyle} className="z-50 flex items-center gap-4 rounded-lg border bg-background/80 p-3 shadow-lg backdrop-blur-sm transition-opacity">
      <div
        className="h-16 w-16 shrink-0 rounded-full border-2 border-white shadow-md"
        style={{ backgroundColor: colorData.hex }}
      />
      <div className="font-mono text-xs text-foreground">
        <p className="font-bold">CMYK:</p>
        <p>{colorData.cmyk.c}, {colorData.cmyk.m}, {colorData.cmyk.y}, {colorData.cmyk.k}</p>
        {pantone && (
          <>
            <p className="mt-2 font-bold">CMPTone®:</p>
            <p>{pantone.name}</p>
          </>
        )}
      </div>
    </div>
  );
};

const SelectedColorCard = ({ colorData, closestPantone, isFindingPantone, onCopy, isPro }: {
    colorData: ColorData | null,
    closestPantone: PantoneColor | null,
    isFindingPantone: boolean,
    onCopy: (value: string) => void,
    isPro: boolean,
}) => {
    if (!colorData) {
       return (
         <Card className="flex items-center justify-center h-full min-h-[160px]">
            <div className="text-center text-muted-foreground p-4">
                <Pipette className="mx-auto h-12 w-12 mb-2" />
                <p>Hover and click to pick a color.</p>
            </div>
         </Card>
       )
    }

    const { hex, cmyk, rgb } = colorData;

    return (
        <Card>
            <CardHeader><CardTitle>Selected Color</CardTitle></CardHeader>
            <CardContent>
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-20 h-20 rounded-lg border-2 shadow-inner" style={{ backgroundColor: hex }} />
                    <div className="space-y-1 font-mono text-sm">
                        <p className="flex items-center">CMYK: {cmyk.c}, {cmyk.m}, {cmyk.y}, {cmyk.k} <Button variant="ghost" size="icon" className="w-6 h-6 ml-2" onClick={() => onCopy(`cmyk(${cmyk.c},${cmyk.m},${cmyk.y},${cmyk.k})`)} aria-label="Copy CMYK value"><Copy className="w-3 h-3"/></Button></p>
                        <p className="flex items-center">RGB: {rgb.r}, {rgb.g}, {rgb.b} <Button variant="ghost" size="icon" className="w-6 h-6 ml-2" onClick={() => onCopy(`rgb(${rgb.r},${rgb.g},${rgb.b})`)} aria-label="Copy RGB value"><Copy className="w-3 h-3"/></Button></p>
                        <p className="flex items-center">HEX: {hex.toUpperCase()} <Button variant="ghost" size="icon" className="w-6 h-6 ml-2" onClick={() => onCopy(hex)} aria-label="Copy HEX value"><Copy className="w-3 h-3"/></Button></p>
                    </div>
                </div>
                {isPro && (
                    <div>
                        <h4 className="font-semibold text-sm mb-2">Closest CMPTone® Match</h4>
                        {isFindingPantone ? (
                            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <p className="text-xs text-muted-foreground">Finding best match...</p>
                            </div>
                        ) : closestPantone ? (
                            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                                <div className="w-10 h-10 rounded-md border shrink-0" style={{ backgroundColor: `rgb(${cmykToRgb(closestPantone.cmyk.c, closestPantone.cmyk.m, closestPantone.cmyk.y, closestPantone.cmyk.k).r},${cmykToRgb(closestPantone.cmyk.c, closestPantone.cmyk.m, closestPantone.cmyk.y, closestPantone.cmyk.k).g},${cmykToRgb(closestPantone.cmyk.c, closestPantone.cmyk.m, closestPantone.cmyk.y, closestPantone.cmyk.k).b})` }} />
                                <div className="text-xs">
                                    <p className="font-bold">{closestPantone.name}</p>
                                    <p className="font-mono text-muted-foreground">CMYK: {closestPantone.cmyk.c}, {closestPantone.cmyk.m}, {closestPantone.cmyk.y}, {closestPantone.cmyk.k}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="p-3 text-xs text-muted-foreground">No match found.</div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const ManualColorEntry = ({ onAddColor }: { onAddColor: (color: CmykColor) => void }) => {
    const form = useForm<ManualColorFormValues>({
        resolver: zodResolver(manualColorSchema),
        defaultValues: { c: 0, m: 0, y: 0, k: 0 },
    });

    const onSubmit = (values: ManualColorFormValues) => {
        onAddColor(values);
        form.reset();
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Manual Entry</CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            {(["c", "m", "y", "k"] as const).map(ch => (
                                <FormField
                                    key={ch}
                                    control={form.control}
                                    name={ch}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{ch.toUpperCase()}</FormLabel>
                                            <FormControl>
                                                <Input type="number" min="0" max="100" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ))}
                        </div>
                        <Button type="submit" className="w-full">
                            <SquarePlus className="mr-2" /> Add to Strip
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
};

const DominantColorsPanel = ({ title, icon: Icon, colors, isLoading, onAddToStrip, isPro, imageSrc }: {
    title: string,
    icon: React.ElementType,
    colors: PdfPrintStripEntry[],
    isLoading: boolean,
    onAddToStrip: (color: CmykColor, coords?: { x: number, y: number }) => void,
    isPro: boolean,
    imageSrc?: string | null,
}) => {
    const { toast } = useToast();
    const [isPrinting, setIsPrinting] = useState(false);

    const handlePrint = async (colorsToPrint: PdfPrintStripEntry[]) => {
        setIsPrinting(true);
        trackEvent('PDF Export Started', { type: 'dominant_colors', colorCount: colorsToPrint.length });
        try {
            const pdfBase64 = await generateCmykStripPdf({
                colors: colorsToPrint, 
                title: `${title}`,
                imageDataUri: imageSrc || undefined
            });
            const blob = base64ToBlob(pdfBase64, 'application/pdf');
            triggerDownload(blob, `dominant-colors-${new Date().toISOString().split('T')[0]}.pdf`);
            trackEvent('PDF Export Success', { type: 'dominant_colors' });
            toast({ title: 'PDF Downloaded', description: `Your ${title} PDF is ready.` });
        } catch (error) {
            reportError(error as Error, { context: 'Dominant Colors PDF Generation' });
            toast({ variant: 'destructive', title: 'PDF Failed', description: 'Could not generate the PDF.' });
        } finally {
            setIsPrinting(false);
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><Icon /> {title}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-48">
                     <Loader2 className="w-12 h-12 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }
    
    if (colors.length === 0) return null;

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center flex-wrap gap-2">
                    <CardTitle className="text-base flex items-center gap-2"><Icon /> {title} ({colors.length})</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => handlePrint(colors)} disabled={isPrinting}>
                        {isPrinting ? <Loader2 className="mr-2 animate-spin"/> : <Printer className="mr-2"/>} Print Palette
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-72">
                    <div className="space-y-2 pr-4">
                        {colors.map((entry, index) => {
                            const {r,g,b} = cmykToRgb(entry.cmyk.c, entry.cmyk.m, entry.cmyk.y, entry.cmyk.k);
                            const hex = rgbToHex(r,g,b);
                            return (
                            <div key={index} className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                                <div className="w-10 h-10 rounded-md border shrink-0" style={{backgroundColor: hex}} />
                                <div className="flex-grow text-xs font-mono space-y-1">
                                    <p>C{entry.cmyk.c} M{entry.cmyk.m} Y{entry.cmyk.y} K{entry.cmyk.k}</p>
                                    {entry.cmptone && (
                                        <p className="font-bold font-sans text-muted-foreground">{entry.cmptone.name}</p>
                                    )}
                                </div>
                                <Button size="icon" variant="ghost" onClick={() => onAddToStrip(entry.cmyk, entry.coords)} aria-label="Add to Print Strip">
                                    <PlusCircle className="w-5 h-5"/>
                                </Button>
                            </div>
                            )
                        })}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};


export function ImageColorExtractor({ isPro }: { isPro: boolean }) {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedColorData, setSelectedColorData] = useState<ColorData | null>(null);
    const [printStrip, setPrintStrip] = useState<PrintStripEntry[]>([]);
    const [isPdfLoading, setIsPdfLoading] = useState(false);
    const [closestPantone, setClosestPantone] = useState<PantoneColor | null>(null);
    const [isFindingPantone, setIsFindingPantone] = useState(false);
    const [loupeData, setLoupeData] = useState<LoupeState>({ visible: false, x: 0, y: 0, colorData: null, pantone: null });
    const [fileType, setFileType] = useState<'raster' | 'svg' | null>(null);
    
    const [dominantColors, setDominantColors] = useState<PdfPrintStripEntry[]>([]);
    const [isExtractingColors, setIsExtractingColors] = useState(false);
    const [isHelpOpen, setHelpOpen] = useState(false);
    const [isPrintOptionsOpen, setPrintOptionsOpen] = useState(false);


    const fileInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { toast } = useToast();

     const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || !imageSrc) return;
        
        const clientX = e.clientX;
        const clientY = e.clientY;
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
            setLoupeData(prev => prev.visible ? { ...prev, visible: false } : prev);
            return;
        }

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const imageX = Math.floor(x * scaleX);
        const imageY = Math.floor(y * scaleY);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        const pixel = ctx.getImageData(imageX, imageY, 1, 1).data;
        const rgb = { r: pixel[0], g: pixel[1], b: pixel[2] };
        const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        const colorData = { rgb, cmyk, hex };

        setLoupeData({
            visible: true,
            x: clientX,
            y: clientY,
            colorData,
            pantone: null,
        });
    }, [imageSrc]);
    
    const handleMouseLeave = () => {
        setLoupeData(prev => ({...prev, visible: false}));
    };

    const addColorToStrip = async (cmyk: CmykColor, coords?: { x: number, y: number }) => {
        let pantoneMatch: PantoneColor | null = null;
        if (isPro) {
            const rgb = cmykToRgb(cmyk.c, cmyk.m, cmyk.y, cmyk.k);
            pantoneMatch = await findClosestCMPTone(rgb);
        }
        setPrintStrip(prev => [...prev, { cmyk, cmptone: pantoneMatch, coords }]);
        toast({ title: "Color Added to Strip", description: `CMYK(${cmyk.c}, ${cmyk.m}, ${cmyk.y}, ${cmyk.k})` });
    };

    const handleCanvasClick = useCallback(async (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || !imageSrc) return;

        const rect = canvas.getBoundingClientRect();
        
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const imageX = Math.floor(x * scaleX);
        const imageY = Math.floor(y * scaleY);

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        const pixel = ctx.getImageData(imageX, imageY, 1, 1).data;
        const rgb = { r: pixel[0], g: pixel[1], b: pixel[2] };
        const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        
        const newColorData = { rgb, cmyk, hex };
        setSelectedColorData(newColorData);
        
        setClosestPantone(null);

        let pantoneMatch: PantoneColor | null = null;
        if (isPro) {
            setIsFindingPantone(true);
            pantoneMatch = await findClosestCMPTone(newColorData.rgb);
            setClosestPantone(pantoneMatch);
            setIsFindingPantone(false);
        }

        setPrintStrip(prev => [...prev, { cmyk, cmptone: pantoneMatch, coords: { x: imageX / canvas.width, y: imageY / canvas.height } }]);
        toast({ title: "Color Added to Strip", description: `CMYK(${cmyk.c}, ${cmyk.m}, ${cmyk.y}, ${cmyk.k})` });
    }, [imageSrc, toast, isPro]);


    const handleImageUpload = (file: File) => {
        if (!file) return;

        handleReset();

        if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
             if (!isPro) {
                toast({
                    variant: "default",
                    title: "Pro Feature",
                    description: "SVG palette extraction is a Pro feature. Please toggle Pro Mode to use it.",
                });
                return;
            }
            setFileType('svg');
            setIsExtractingColors(true);
            trackEvent('Image Uploaded', { type: 'svg' });
            const reader = new FileReader();
            reader.onload = async (event) => {
                const svgContent = event.target?.result as string;

                const svgDataUri = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgContent)))}`;
                setImageSrc(svgDataUri);
                
                trackEvent('Dominant Color Extraction Started');
                try {
                    const img = new Image();
                    img.onload = async () => {
                        const offCanvas = document.createElement('canvas');
                        offCanvas.width = img.width || 800;
                        offCanvas.height = img.height || 600;
                        const ctx = offCanvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(img, 0, 0);
                            const dominantRgb = extractDominantColors(offCanvas, 12);
                            const newColors: PdfPrintStripEntry[] = [];
                            for (const rgb of dominantRgb) {
                                const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
                                let pantoneMatch: PantoneColor | null = null;
                                if (isPro) {
                                    pantoneMatch = await findClosestCMPTone({ r: rgb.r, g: rgb.g, b: rgb.b });
                                }
                                newColors.push({ cmyk, cmptone: pantoneMatch, coords: { x: rgb.x, y: rgb.y } });
                            }
                            setDominantColors(newColors);
                            trackEvent('Dominant Colors Extracted', { colorCount: newColors.length });
                        }
                        setIsExtractingColors(false);
                    };
                    img.onerror = () => {
                        setIsExtractingColors(false);
                        toast({ variant: "destructive", title: "SVG Error", description: "Could not analyze the SVG file." });
                    };
                    img.src = svgDataUri;
                } catch (error) {
                    setIsExtractingColors(false);
                    console.error("SVG color extraction failed", error);
                    toast({ variant: "destructive", title: "SVG Extraction Failed", description: "Could not analyze the SVG file." });
                }
            };
            reader.readAsText(file);

        } else if (file.type.startsWith('image/')) {
            setFileType('raster');
            setIsLoading(true);
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = canvasRef.current;
                    if (canvas) {
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            canvas.width = img.naturalWidth;
                            canvas.height = img.naturalHeight;
                            ctx.drawImage(img, 0, 0);
                            setImageSrc(img.src);
                            trackEvent('Image Uploaded', { type: file.type, width: img.naturalWidth, height: img.naturalHeight });
                            
                            if (isPro) {
                                setIsExtractingColors(true);
                                trackEvent('Dominant Color Extraction Started');
                                setTimeout(async () => {
                                    try {
                                        const dominantRgb = extractDominantColors(canvas, 12);
                                        const newColors: PdfPrintStripEntry[] = [];
                                        for (const rgb of dominantRgb) {
                                            const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
                                            let pantoneMatch: PantoneColor | null = null;
                                            pantoneMatch = await findClosestCMPTone({ r: rgb.r, g: rgb.g, b: rgb.b });
                                            newColors.push({ cmyk, cmptone: pantoneMatch, coords: { x: rgb.x, y: rgb.y } });
                                        }
                                        setDominantColors(newColors);
                                        trackEvent('Dominant Colors Extracted', { colorCount: newColors.length });
                                    } catch (err) {
                                        console.error("Color Extraction failed", err);
                                    } finally {
                                        setIsExtractingColors(false);
                                    }
                                }, 0);
                            }
                        }
                    }
                    setIsLoading(false);
                };
                img.onerror = () => {
                    setIsLoading(false);
                    toast({ variant: 'destructive', title: 'Image Load Error', description: 'Could not load the selected image.' });
                }
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        } else {
            toast({ variant: 'destructive', title: 'Invalid File', description: 'Please upload a valid image or SVG file.' });
            return;
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleImageUpload(file);
        e.target.value = '';
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation();
        const file = e.dataTransfer.files?.[0];
        if (file) handleImageUpload(file);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation();
    };

    const handleReset = useCallback(() => {
        if (imageSrc || isLoading || dominantColors.length > 0) {
            trackEvent('Image Color Extractor Reset');
        }
        setImageSrc(null);
        setSelectedColorData(null);
        setPrintStrip([]);
        setDominantColors([]);
        setIsLoading(false);
        setIsExtractingColors(false);
        setFileType(null);
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [imageSrc, isLoading, dominantColors]);


    const handleRemoveFromStrip = (index: number) => {
        setPrintStrip(prev => prev.filter((_, i) => i !== index));
    };
    
    const handleCopy = (value: string) => {
        navigator.clipboard.writeText(value);
        toast({ title: "Copied to clipboard", description: value });
    };

    const handleDownloadStrip = async (options: PrintStripOptionsFormValues) => {
        if (printStrip.length === 0) {
            toast({ variant: 'destructive', title: 'Empty Strip', description: 'Add colors to the strip first.' });
            return;
        }
        setIsPdfLoading(true);
        trackEvent('PDF Export Started', { type: 'image_strip', colorCount: printStrip.length, variations: options.includeVariations, customerSample: options.customerSample });

        const downloadPdf = async (isSample: boolean) => {
            try {
                const pdfBase64 = await generateCmykStripPdf({
                    colors: printStrip,
                    title: options.title || "Color Strip",
                    includeVariations: options.includeVariations,
                    customerSample: isSample,
                    imageDataUri: imageSrc || undefined,
                });
                const blob = base64ToBlob(pdfBase64, 'application/pdf');
                
                const safeTitle = (options.title || '').replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const baseName = safeTitle || `color-strip-${new Date().toISOString().split('T')[0]}`;
                
                const fileName = isSample
                    ? `${baseName}-customer-sample.pdf`
                    : `${baseName}.pdf`;
                triggerDownload(blob, fileName);
            } catch (error) {
                reportError(error as Error, { context: `Image Color Strip PDF Generation (Sample: ${isSample})` });
                throw error; // Re-throw to be caught by the outer catch block
            }
        };

        try {
            if (options.customerSample) {
                // Download both versions
                toast({ title: 'Generating PDFs...', description: 'Please wait, two files will be downloaded.' });
                await Promise.all([downloadPdf(false), downloadPdf(true)]);
                toast({ title: 'PDFs Downloaded', description: 'Your internal and customer sample PDFs are ready.' });
            } else {
                // Download only the internal version
                toast({ title: 'Generating PDF...', description: 'Please wait while we create your file.' });
                await downloadPdf(false);
                toast({ title: 'PDF Downloaded', description: 'Your CMYK Color Strip PDF is ready.' });
            }
            trackEvent('PDF Export Success', { type: 'image_strip' });
        } catch (error) {
            console.error("PDF generation failed", error);
            toast({ variant: 'destructive', title: 'PDF Failed', description: 'Could not generate the PDF.' });
        } finally {
            setIsPdfLoading(false);
        }
    };

    return (
        <>
            <div className="flex flex-col lg:flex-row p-4 lg:p-6 gap-6 bg-background">
                <Loupe data={loupeData} />
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.svg" onChange={handleFileChange}/>
                
                <div className="w-full lg:w-2/3 flex flex-col gap-4">
                    <div className="flex-shrink-0 flex justify-between items-center flex-wrap gap-2">
                        <p className="text-sm text-muted-foreground">Upload an image or SVG and pick or extract dominant colors.</p>
                        <div className="flex items-center gap-2">
                            <Button onClick={handleReset} variant="outline" disabled={!imageSrc && !isLoading && dominantColors.length === 0} aria-label="Reset image and picked colors">
                                <XCircle className="mr-2" /> Reset
                            </Button>
                            <HelpTrigger onClick={() => setHelpOpen(true)} />
                        </div>
                    </div>
                    <Card 
                        id="tour-step-image-upload"
                        className="flex-grow flex items-center justify-center border-2 border-dashed relative overflow-hidden min-h-[300px] lg:min-h-0"
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                    >
                        {!imageSrc && !isLoading && !isExtractingColors && (
                            <div className="text-center text-muted-foreground p-8">
                                <UploadCloud className="mx-auto h-16 w-16 mb-4" />
                                <h3 className="text-xl font-semibold mb-2">Drop an image or SVG here</h3>
                                <p className="mb-4">or</p>
                                <Button onClick={() => fileInputRef.current?.click()}>Select File</Button>
                            </div>
                        )}
                        {(imageSrc || isLoading || isExtractingColors) && (
                            <div className="absolute inset-0 flex items-center justify-center w-full h-full p-2 bg-muted/20">
                                {fileType === 'svg' && imageSrc ? (
                                    <img
                                        src={imageSrc}
                                        alt="Uploaded SVG preview"
                                        className="max-w-full max-h-full object-contain"
                                    />
                                ) : (
                                    <canvas
                                        id="tour-step-image-canvas"
                                        ref={canvasRef}
                                        className={cn(
                                            'max-w-full max-h-full transition-opacity duration-300',
                                            isLoading ? 'opacity-30' : 'opacity-100',
                                            fileType === 'raster' && 'cursor-crosshair'
                                        )}
                                        onClick={fileType === 'raster' ? handleCanvasClick : undefined}
                                        onMouseMove={fileType === 'raster' ? handleMouseMove : undefined}
                                        onMouseLeave={fileType === 'raster' ? handleMouseLeave : undefined}
                                    />
                                )}
                                {(isLoading || isExtractingColors) && (
                                    <div className="absolute flex flex-col items-center text-center text-foreground">
                                        <Loader2 className="w-12 h-12 animate-spin mb-4" />
                                        <p className="font-semibold">Analyzing file...</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                    <div className="grid md:grid-cols-2 gap-4">
                        <SelectedColorCard colorData={selectedColorData} closestPantone={closestPantone} isFindingPantone={isFindingPantone} onCopy={handleCopy} isPro={isPro} />
                        <ManualColorEntry onAddColor={addColorToStrip} />
                    </div>
                </div>

                <div className="w-full lg:w-1/3 flex flex-col gap-6">
                    <Card id="tour-step-image-print-strip">
                        <Accordion type="single" collapsible defaultValue="item-1">
                            <AccordionItem value="item-1" className="border-b-0">
                                <AccordionTrigger className="p-6">
                                     <div className="flex justify-between items-center w-full">
                                        <CardTitle className="text-base">Print Strip ({printStrip.length})</CardTitle>
                                        {printStrip.length > 0 && 
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                onClick={(e) => { e.stopPropagation(); setPrintStrip([]); }}
                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setPrintStrip([]); } }}
                                                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-destructive hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-offset-2 rounded-md")}
                                                aria-label="Clear print strip"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" /> Clear
                                            </div>
                                        }
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-6 pb-0">
                                    <ScrollArea className="h-48">
                                        {printStrip.length === 0 ? (
                                            <div className="flex items-center justify-center h-full text-center text-muted-foreground pb-8">
                                                <div className="space-y-2">
                                                    <Palette className="mx-auto h-12 w-12" />
                                                    <p className="text-sm">Your picked colors will appear here.</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2 pr-4">
                                                {printStrip.map((entry, index) => {
                                                    const { cmyk } = entry;
                                                    return (
                                                        <div key={index} className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                                                            <div className="w-10 h-10 rounded-md border shrink-0" style={{backgroundColor: `rgb(${cmykToRgb(cmyk.c, cmyk.m, cmyk.y, cmyk.k).r},${cmykToRgb(cmyk.c, cmyk.m, cmyk.y, cmyk.k).g},${cmykToRgb(cmyk.c, cmyk.m, cmyk.y, cmyk.k).b})`}} />
                                                            <div className="flex-grow text-xs font-mono">
                                                                C{cmyk.c} M{cmyk.m} Y{cmyk.y} K{cmyk.k}
                                                            </div>
                                                            <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => handleRemoveFromStrip(index)} aria-label="Remove color from strip">
                                                                <Trash2 className="w-4 h-4 text-muted-foreground" />
                                                            </Button>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                        {printStrip.length > 0 && (
                            <CardFooter className="flex-shrink-0 border-t pt-6 flex-col gap-4">
                                <Button onClick={() => setPrintOptionsOpen(true)} className="w-full" disabled={isPdfLoading}>
                                    {isPdfLoading ? <Loader2 className="animate-spin mr-2"/> : <FileDown className="mr-2"/>}
                                    {isPdfLoading ? 'Generating...' : 'Download Strip PDF'}
                                </Button>
                            </CardFooter>
                        )}
                    </Card>

                    <div id="tour-step-image-pro-features" className="space-y-6">
                        {isPro ? (
                            <>
                                <DominantColorsPanel
                                    title="Dominant Colors"
                                    icon={Palette}
                                    colors={dominantColors}
                                    isLoading={isExtractingColors}
                                    onAddToStrip={addColorToStrip}
                                    isPro={isPro}
                                    imageSrc={imageSrc}
                                />
                            </>
                        ) : (
                            <>
                            <ProFeatureLock featureName="Automatic Color Extraction" />
                            </>
                        )}
                    </div>
                </div>
            </div>
            <SectionHelpDialog
                open={isHelpOpen}
                onOpenChange={setHelpOpen}
                title="Using the Image Color Extractor"
                description="Generate color palettes and gradients from images and vector files."
            >
                <div className="space-y-4">
                    <div>
                        <h4 className="font-bold mb-1">1. Upload a File</h4>
                        <p className="text-muted-foreground">
                        Drag-and-drop or select an image (JPG, PNG) or SVG file. The tool will automatically process the file.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-bold mb-1">2. Pick or Add Colors</h4>
                        <p className="text-muted-foreground">
                        For raster images, hover your mouse over the image to use the color "loupe". Click to add a color to the Print Strip. You can also add a color by typing its CMYK values into the "Manual Entry" card.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-bold mb-1">3. Extract Dominant Colors (Pro)</h4>
                        <p className="text-muted-foreground">
                        When you upload an image or SVG, its most dominant colors will be extracted instantly and matched to their closest CMPTone colors. These appear in a panel on the right.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-bold mb-1">4. Build and Download Strip</h4>
                        <p className="text-muted-foreground">
                        All colors you pick, manually add, or add from a palette are collected in the "Print Strip". Click 'Download Strip PDF' to get a CMYK-accurate PDF for test printing.
                        </p>
                    </div>
                </div>
            </SectionHelpDialog>
             <PrintStripOptionsDialog
                open={isPrintOptionsOpen}
                onOpenChange={setPrintOptionsOpen}
                onGenerate={handleDownloadStrip}
            />
        </>
    );
}

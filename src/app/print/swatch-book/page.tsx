"use client";

import { Suspense } from 'react';
import { pantoneColors } from '@/lib/pantone';
import { cmykToRgb } from '@/lib/colors';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const PrintClientComponent = () => {
  return (
    <div className="print-container p-4 md:p-8 flex flex-col items-center min-h-screen bg-muted/30 print:bg-white print:p-0">
      <div className="print-header w-full max-w-4xl p-6 mb-8 bg-card border rounded-lg shadow-sm text-center print:hidden">
        <h1 className="text-2xl font-bold mb-4">CMPTone<sup>®</sup> Swatch Book - Print View</h1>
        <p className="mb-2 text-muted-foreground">This page is optimized for printing. Use your browser's 'Print' function (Ctrl/Cmd + P) to print or save as a PDF.</p>
        <p className="mb-6 text-sm font-medium">For best results, enable <strong>"Background graphics"</strong> in your print settings.</p>
        <div className="flex gap-3 justify-center">
            <Button onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print Now
            </Button>
             <Button variant="outline" asChild>
                <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to App</Link>
            </Button>
        </div>
      </div>
      <div className="swatches-wrapper grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 w-full max-w-6xl p-4 bg-card border rounded-lg shadow-sm print:shadow-none print:border-none print:p-0 print:grid-cols-7 print:gap-2">
        {pantoneColors.map((color) => {
          const { r, g, b } = cmykToRgb(color.cmyk.c, color.cmyk.m, color.cmyk.y, color.cmyk.k);
          const nameText = color.number.replace(/CMPTone\®?\s*\+?\s*/, '').trim();

          return (
            <div key={color.number} className="swatch border rounded overflow-hidden flex flex-col break-inside-avoid bg-white">
              <div className="swatch-color h-16 print:h-12" style={{ backgroundColor: `rgb(${r}, ${g}, ${b})`, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }} />
              <div className="swatch-info p-2 text-[10px]">
                <p className="font-bold truncate" title={nameText}>{nameText}</p>
                <p className="font-mono text-muted-foreground whitespace-nowrap">C{color.cmyk.c} M{color.cmyk.m} Y{color.cmyk.y} K{color.cmyk.k}</p>
              </div>
            </div>
          );
        })}
      </div>
       <footer className="mt-8 text-xs text-muted-foreground print:fixed print:bottom-4 print:w-full print:text-center">
          <p>Generated with Colour Matcher Pro</p>
       </footer>
    </div>
  )
};

export default function SwatchBookPrintPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen font-sans">Loading swatches...</div>}>
      <PrintClientComponent />
    </Suspense>
  );
}

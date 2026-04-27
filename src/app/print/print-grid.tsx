"use client";

import React, { useMemo } from 'react';
import type { GridFormValues } from '@/components/grid-generator';
import { generateGridData, type CmykColor } from '@/lib/grid';
import { cmykToRgb, getTextColorForBackground } from '@/lib/colors';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface PrintGridProps {
  formValues: GridFormValues;
}

function PrintColorCell({ color }: { color: CmykColor }) {
    const { r, g, b } = cmykToRgb(color.c, color.m, color.y, color.k);
    const textColor = getTextColorForBackground(r, g, b);
    
    const style = {
      '--r': r,
      '--g': g,
      '--b': b,
      color: textColor,
      width: '100%',
      height: '100%',
    } as React.CSSProperties;
  
    return (
      <div
        className="color-cell"
        style={style}
      >
        <div className="cmyk-values">
            <span>C{color.c}</span>
            <span>M{color.m}</span>
            <span>Y{color.y}</span>
            <span>K{color.k}</span>
        </div>
      </div>
    );
}

export default function PrintGrid({ formValues }: PrintGridProps) {
  const { c, m, y, k, gridSize, step, xAxis, yAxis } = formValues;
  const gridData = useMemo(() => {
    const baseColor = { c, m, y, k };
    return generateGridData(baseColor, gridSize, step, xAxis, yAxis);
  }, [c, m, y, k, gridSize, step, xAxis, yAxis]);

  return (
    <div className="print-container">
        <div className="print-header">
            <h1 style={{fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem'}}>Print Preview</h1>
            <p style={{marginBottom: '0.5rem'}}>This page is optimized for printing. Use your browser's 'Print' function (Ctrl/Cmd + P) to print or save as a PDF.</p>
            <p style={{marginBottom: '1rem', color: '#333'}}>For best results, enable <strong>"Background graphics"</strong> in your print settings.</p>
            <Button onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Print Now
            </Button>
        </div>
        <div className="grid-wrapper">
          <div 
              style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                  gridTemplateRows: `repeat(${gridSize}, 1fr)`,
                  width: '100%',
                  height: '100%',
                  gap: '1px',
                  backgroundColor: '#ccc'
              }}
          >
              {gridData.map((row, rowIndex) => 
                row.map((color, colIndex) => (
                    <PrintColorCell key={`cell-${rowIndex}-${colIndex}`} color={color} />
                ))
              )}
          </div>
        </div>
        <footer className="print-footer">
            <p>Generated with Colour Matcher Pro</p>
            <p>Base: C{c} M{m} Y{y} K{k} | Grid: {gridSize}x{gridSize} | Step: {step}%</p>
        </footer>
    </div>
  );
}

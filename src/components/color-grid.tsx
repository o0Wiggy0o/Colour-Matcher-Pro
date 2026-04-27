
"use client";

import React from "react";
import type { GridData, CmykColor } from "@/lib/grid";
import { cmykToRgb } from "@/lib/colors";
import { cn } from "@/lib/utils";

interface ColorGridProps {
  gridData: GridData;
  onCellClick: (coords: { rowIndex: number, colIndex: number }) => void;
  onCellHover: (coords: { rowIndex: number, colIndex: number } | null) => void;
}

function ColorCell({ 
  color, 
  onClick,
  onMouseEnter,
  isBaseColor,
}: { 
  color: CmykColor; 
  onClick: () => void;
  onMouseEnter: () => void;
  isBaseColor: boolean;
}) {
  const { r, g, b } = cmykToRgb(color.c, color.m, color.y, color.k);
  
  return (
    <button
      className={cn(
        "w-full h-full focus:outline-none focus:ring-2 focus:ring-ring focus:z-20 rounded-sm",
        isBaseColor && "relative ring-2 ring-offset-1 ring-offset-background/10 ring-white"
      )}
      style={{ 
        backgroundColor: `rgb(${r}, ${g}, ${b})`,
      }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      aria-label={`Color C${color.c} M${color.m} Y${color.y} K${color.k}`}
    />
  );
}

const ColorGridComponent = ({ gridData, onCellClick, onCellHover }: ColorGridProps) => {
  const gridSize = gridData.length;
  const centerIndex = Math.floor(gridSize / 2);

  return (
    <div 
      className="grid gap-1 border bg-muted-foreground/10 shadow-inner rounded-md overflow-hidden w-full h-full"
      style={{ 
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gridTemplateRows: `repeat(${gridSize}, 1fr)`
      }}
      onMouseLeave={() => onCellHover(null)}
    >
      {gridData.map((row, rowIndex) => 
        row.map((color, colIndex) => {
          const isBaseColor = rowIndex === centerIndex && colIndex === centerIndex;
          return (
            <ColorCell 
              key={`${rowIndex}-${colIndex}`} 
              color={color} 
              onClick={() => onCellClick({ rowIndex, colIndex })}
              onMouseEnter={() => onCellHover({ rowIndex, colIndex })}
              isBaseColor={isBaseColor}
            />
          );
        })
      )}
    </div>
  );
}

export const ColorGrid = React.memo(ColorGridComponent);

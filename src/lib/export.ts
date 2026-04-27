
import type { CmykColor } from "./grid";
import type { PantoneColor } from "./pantone";

export interface ColorHistoryEntry {
  cmyk: CmykColor;
  rgb: { r: number; g: number; b: number };
  hex: string;
  timestamp: string;
  cmptone?: PantoneColor | null;
}

export const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  
  // Use a small timeout to ensure the browser has started the download 
  // process before we clean up the URL and element.
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 150);
};

export const base64ToBlob = (base64: string, type: string = 'application/octet-stream') => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type });
};

export const exportToCsv = (data: ColorHistoryEntry[]) => {
  if (data.length === 0) return;
  const headers = "Timestamp,C,M,Y,K,R,G,B,HEX,CMPTone_Name,CMPTone_Number\n";
  const rows = data.map(d => {
    const cmyk = `${d.cmyk.c},${d.cmyk.m},${d.cmyk.y},${d.cmyk.k}`;
    const rgb = `${d.rgb.r},${d.rgb.g},${d.rgb.b}`;
    const cmptoneName = d.cmptone ? `"${d.cmptone.name}"` : '';
    const cmptoneNumber = d.cmptone ? `"${d.cmptone.number}"` : '';
    return [d.timestamp, cmyk, rgb, d.hex, cmptoneName, cmptoneNumber].join(',');
  }).join('\n');

  const csvContent = headers + rows;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, "color_history.csv");
};

export const exportToJson = (data: ColorHistoryEntry[]) => {
  if (data.length === 0) return;
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  triggerDownload(blob, "color_history.json");
};

export const exportToTxt = (data: ColorHistoryEntry[]) => {
  if (data.length === 0) return;
  const txtContent = data.map(d => {
    const cmptoneLine = d.cmptone ? `CMPTone Match: ${d.cmptone.name} (${d.cmptone.number})` : null;
    
    return [
      `Timestamp: ${d.timestamp}`,
      `CMYK: C${d.cmyk.c} M${d.cmyk.m} Y${d.cmyk.y} K${d.cmyk.k}`,
      `RGB:  ${d.rgb.r}, ${d.rgb.g}, ${d.rgb.b}`,
      `HEX:  ${d.hex}`,
      cmptoneLine
    ].filter(Boolean).join('\n');
  }).join('\n--------------------\n');

  const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
  triggerDownload(blob, "color_history.txt");
};

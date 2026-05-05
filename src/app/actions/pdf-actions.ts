'use server';

import type { PantoneColor } from '@/lib/pantone';
import { pantoneColors } from '@/lib/pantone';
import type { GridData, CmykColor } from '@/lib/grid';
import { generateGridData } from '@/lib/grid';
import type { GridFormValues } from '@/components/grid-generator';
import type { MultiGridFormValues } from '@/components/multi-grid-options-dialog';


const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const A3_WIDTH_PT = 841.89;
const A3_HEIGHT_PT = 1190.55;
const MM_TO_PT = 2.83465;

interface PdfOptions {
    paperFormat: 'A4' | 'A3' | 'Custom';
    customWidth?: number;
    customHeight?: number;
    title?: string;
    client?: string;
    notes?: string;
    customerSample?: boolean;
}

export interface CMPToneBookActionOptions {
    printer?: string;
    profile?: string;
    media?: string;
    columns?: number;
}

function interpolateCmyk(color1: CmykColor, color2: CmykColor, factor: number): CmykColor {
    return {
        c: Math.round(color1.c + (color2.c - color1.c) * factor),
        m: Math.round(color1.m + (color2.m - color1.m) * factor),
        y: Math.round(color1.y + (color2.y - color1.y) * factor),
        k: Math.round(color1.k + (color2.k - color1.k) * factor),
    };
}

const generateVariations = (base: CmykColor, step: number = 10): CmykColor[] => {
    const clamp = (val: number) => Math.round(Math.max(0, Math.min(100, val)));
    const variations: CmykColor[] = [];
    
    // Generate 6 distinct variations
    variations.push({ ...base, c: clamp(base.c + step), m: clamp(base.m + step) });
    variations.push({ ...base, c: clamp(base.c - step), m: clamp(base.m - step) });
    variations.push({ ...base, c: clamp(base.c + step), y: clamp(base.y + step) });
    variations.push({ ...base, c: clamp(base.c - step), y: clamp(base.y - step) });
    variations.push({ ...base, m: clamp(base.m + step), y: clamp(base.y + step) });
    variations.push({ ...base, m: clamp(base.m - step), y: clamp(base.y - step) });
    
    return variations;
};

export async function generateCmykPdf(
    gridData: GridData,
    formValues: GridFormValues,
    options: PdfOptions
): Promise<string> {
    const { PDFDocument, StandardFonts, cmyk, rgb } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let pageWidth = A4_WIDTH_PT;
    let pageHeight = A4_HEIGHT_PT;

    if (options.paperFormat === 'A3') {
        pageWidth = A3_WIDTH_PT;
        pageHeight = A3_HEIGHT_PT;
    } else if (options.paperFormat === 'Custom' && options.customWidth && options.customHeight) {
        pageWidth = options.customWidth * MM_TO_PT;
        pageHeight = options.customHeight * MM_TO_PT;
    }

    // Always use landscape for grids
    if (pageHeight > pageWidth) {
        [pageWidth, pageHeight] = [pageHeight, pageWidth];
    }
    
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    
    const margin = 36;
    let currentY = pageHeight - margin;

    if (options.title) {
        page.drawText(options.title, {
            x: margin,
            y: currentY,
            font: boldFont,
            size: 14,
            color: rgb(0,0,0),
        });
        currentY -= 20;
    }
     if (options.client) {
        page.drawText(`Client: ${options.client}`, {
            x: margin,
            y: currentY,
            font,
            size: 10,
            color: rgb(0.2, 0.2, 0.2),
        });
        currentY -= 15;
    }
     if (options.notes) {
        page.drawText(options.notes, {
            x: margin,
            y: currentY,
            font,
            size: 10,
            lineHeight: 12,
            maxWidth: pageWidth - margin * 2,
            color: rgb(0.2, 0.2, 0.2),
        });
        currentY -= 30;
    }

    const drawAreaWidth = pageWidth - margin * 2;
    const drawAreaHeight = currentY - margin - 20;

    const gridSize = formValues.gridSize;
    const gap = 2 * MM_TO_PT;
    const cellWidth = (drawAreaWidth - (gridSize - 1) * gap) / gridSize;
    const cellHeight = (drawAreaHeight - (gridSize - 1) * gap) / gridSize;

    const gridStartY = currentY;

    for (let rowIndex = 0; rowIndex < gridData.length; rowIndex++) {
        for (let colIndex = 0; colIndex < gridData[rowIndex].length; colIndex++) {
            const color = gridData[rowIndex][colIndex];
            const { c, m, y, k } = color;

            const x = margin + colIndex * (cellWidth + gap);
            const yPos = gridStartY - (rowIndex * (cellHeight + gap) + cellHeight);
            
            page.drawRectangle({
                x,
                y: yPos,
                width: cellWidth,
                height: cellHeight,
                color: cmyk(c / 100, m / 100, y / 100, k / 100),
            });
            
            const isDark = k > 65 || (c > 65 && m > 65);
            const textColor = isDark ? rgb(1, 1, 1) : rgb(0, 0, 0);

            const textLine = options.customerSample 
                ? `${(rowIndex * gridSize) + colIndex + 1}`
                : `C${c} M${m} Y${y} K${k}`;
            
            let textSize = Math.max(3, Math.min(7, cellHeight / 4));
            
            if (cellHeight > 10 && cellWidth > 20) {
                 page.drawText(textLine, {
                    x: x + 2,
                    y: yPos + 2,
                    font: options.customerSample ? boldFont : font,
                    size: textSize,
                    color: textColor,
                 });
            }
        }
    }
    
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes).toString('base64');
}

export async function generateCMPToneBookPdf(options: CMPToneBookActionOptions): Promise<string> {
    const { PDFDocument, StandardFonts, cmyk, rgb } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const A4_LANDSCAPE_WIDTH = 841.89;
    const A4_LANDSCAPE_HEIGHT = 595.28;

    const coverPage = pdfDoc.addPage([A4_LANDSCAPE_WIDTH, A4_LANDSCAPE_HEIGHT]);
    const { height: coverHeight } = coverPage.getSize();
    
    coverPage.drawText('CMPTone® Swatch Book', {
        x: 36,
        y: coverHeight - 86,
        font: boldFont,
        size: 36,
        color: rgb(0, 0, 0),
    });

    coverPage.drawText(`Printer: ${options.printer || 'N/A'}\nProfile: ${options.profile || 'N/A'}\nMedia: ${options.media || 'N/A'}`, {
        x: 36,
        y: coverHeight - 190,
        font,
        size: 12,
        lineHeight: 18,
    });

    const swatchWidth = 60;
    const swatchHeight = 40;
    const textBlockHeight = 45;
    const xSpacing = 10;
    const ySpacing = 15;
    const swatchesPerRow = 11;
    const swatchesPerCol = 5;
    const swatchesPerPage = swatchesPerRow * swatchesPerCol;

    const totalSwatchPages = Math.ceil(pantoneColors.length / swatchesPerPage);
    const columns = options.columns || 1;
    
    let pageIndex = 0;
    while (pageIndex < totalSwatchPages) {
        const sheetWidth = A4_LANDSCAPE_WIDTH * columns;
        const sheet = pdfDoc.addPage([sheetWidth, A4_LANDSCAPE_HEIGHT]);

        for (let col = 0; col < columns; col++) {
            if (pageIndex >= totalSwatchPages) break;
            
            const xOffset = col * A4_LANDSCAPE_WIDTH;
            const startIndex = pageIndex * swatchesPerPage;
            const endIndex = Math.min(startIndex + swatchesPerPage, pantoneColors.length);
            const pageColors = pantoneColors.slice(startIndex, endIndex);

            pageColors.forEach((color, index) => {
                const rowIndex = Math.floor(index / swatchesPerRow);
                const colIndex = index % swatchesPerRow;

                const itemX = xOffset + 36 + colIndex * (swatchWidth + xSpacing);
                const itemTopY = A4_LANDSCAPE_HEIGHT - 36 - (rowIndex * (swatchHeight + textBlockHeight + ySpacing));
                const swatchBottomY = itemTopY - swatchHeight;

                sheet.drawRectangle({
                    x: itemX,
                    y: swatchBottomY,
                    width: swatchWidth,
                    height: swatchHeight,
                    color: cmyk(color.cmyk.c / 100, color.cmyk.m / 100, color.cmyk.y / 100, color.cmyk.k / 100),
                });
                
                const nameText = color.number.replace(/CMPTone\®?\s*\+?\s*/, '').trim();
                const cmykText = `C${color.cmyk.c} M${color.cmyk.m} Y${color.cmyk.y} K${color.cmyk.k}`;
                
                let nameSize = 7;
                let nameWidth = boldFont.widthOfTextAtSize(nameText, nameSize);
                if (nameWidth > swatchWidth) nameSize = Math.max(4, nameSize * (swatchWidth / nameWidth));
                sheet.drawText(nameText, { x: itemX, y: swatchBottomY - 12, font: boldFont, size: nameSize });

                let cmykSize = 6;
                let cmykWidth = font.widthOfTextAtSize(cmykText, cmykSize);
                if (cmykWidth > swatchWidth) cmykSize = Math.max(4, cmykSize * (swatchWidth / cmykWidth));
                sheet.drawText(cmykText, { x: itemX, y: swatchBottomY - 22, font, size: cmykSize });
            });
            pageIndex++;
        }
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes).toString('base64');
}

export interface PrintStripEntry {
  cmyk: CmykColor;
  cmptone?: PantoneColor | null;
  coords?: { x: number, y: number };
}

export interface CmykStripOptions {
    colors: PrintStripEntry[];
    title?: string;
    includeVariations?: boolean;
    customerSample?: boolean;
    imageDataUri?: string;
}

export async function generateCmykStripPdf(options: CmykStripOptions): Promise<string> {
    const { PDFDocument, StandardFonts, cmyk, rgb } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const margin = 36;
    const { colors, title = 'Color Strip', includeVariations = false, customerSample = false, imageDataUri } = options;

    if (imageDataUri) {
        // --- Annotated Image Mode ---
        const page = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
        const { width: pWidth, height: pHeight } = page.getSize();
        
        // 1. Draw Header Background
        page.drawRectangle({
            x: 0,
            y: pHeight - 60,
            width: pWidth,
            height: 60,
            color: rgb(0.1, 0.1, 0.1),
        });

        // 2. Draw Title and Branding
        page.drawText(title, { x: margin, y: pHeight - 35, font: boldFont, size: 20, color: rgb(1, 1, 1) });
        page.drawText('CMPTone Color Matcher Pro | Digital to Physical Palette', { 
            x: margin, 
            y: pHeight - 50, 
            font: font, 
            size: 8, 
            color: rgb(0.8, 0.8, 0.8) 
        });
        
        // 3. Draw Footer
        const dateStr = new Date().toLocaleDateString();
        page.drawText(`Generated on: ${dateStr} | Privacy-Focused Local Extraction`, {
            x: margin,
            y: 20,
            font: font,
            size: 7,
            color: rgb(0.6, 0.6, 0.6),
        });

        // 4. Embed and Draw Image
        let image;
        try {
            const base64Data = imageDataUri.split(',')[1];
            const imageBytes = Buffer.from(base64Data, 'base64');
            if (imageDataUri.includes('image/png')) {
                image = await pdfDoc.embedPng(imageBytes);
            } else if (imageDataUri.includes('image/svg+xml')) {
                // SVGs not supported directly
            } else {
                image = await pdfDoc.embedJpg(imageBytes);
            }
        } catch (e) {
            console.error("Failed to embed image in PDF", e);
        }

        let imgAreaHeight = pHeight - margin * 4 - 80; 
        let imgAreaWidth = pWidth - margin * 2.5;
        let imgX = margin * 1.25;
        let imgY = pHeight - margin - 80 - imgAreaHeight;

        if (image) {
            const dims = image.scaleToFit(imgAreaWidth, imgAreaHeight);
            imgX = (pWidth - dims.width) / 2;
            imgY = (pHeight - 80 - dims.height) - 40; 
            
            // Image Shadow/Border
            page.drawRectangle({
                x: imgX - 1,
                y: imgY - 1,
                width: dims.width + 2,
                height: dims.height + 2,
                color: rgb(0.9, 0.9, 0.9),
                borderWidth: 0.5,
                borderColor: rgb(0.8, 0.8, 0.8),
            });

            page.drawImage(image, {
                x: imgX,
                y: imgY,
                width: dims.width,
                height: dims.height,
            });

            imgAreaWidth = dims.width;
            imgAreaHeight = dims.height;
        }

        // 5. Draw Colors and Lines (Around the Image)
        const swatchSize = 40;
        const leftColors = colors.filter(c => (c.coords?.x || 0) < 0.5).sort((a, b) => (a.coords?.y || 0) - (b.coords?.y || 0));
        const rightColors = colors.filter(c => (c.coords?.x || 0) >= 0.5).sort((a, b) => (a.coords?.y || 0) - (b.coords?.y || 0));

        const drawSideColors = (sideColors: typeof colors, isLeft: boolean) => {
            const startY = imgY + imgAreaHeight;
            const availableHeight = imgAreaHeight + 40;
            const step = Math.min(70, availableHeight / Math.max(1, sideColors.length));

            sideColors.forEach((entry, idx) => {
                const targetY = imgY + (1 - (entry.coords?.y || 0)) * imgAreaHeight;
                const y = Math.max(imgY - 40, Math.min(startY - swatchSize, startY - (idx * step)));
                const x = isLeft ? 15 : pWidth - 15 - swatchSize;

                // Swatch Shadow
                page.drawRectangle({
                    x: x + 1,
                    y: y - 1,
                    width: swatchSize,
                    height: swatchSize,
                    color: rgb(0.8, 0.8, 0.8),
                });

                // Swatch
                page.drawRectangle({
                    x,
                    y,
                    width: swatchSize,
                    height: swatchSize,
                    color: cmyk(entry.cmyk.c/100, entry.cmyk.m/100, entry.cmyk.y/100, entry.cmyk.k/100),
                    borderWidth: 1.5,
                    borderColor: rgb(1, 1, 1),
                });

                // Label
                const cmykText = `C${entry.cmyk.c} M${entry.cmyk.m} Y${entry.cmyk.y} K${entry.cmyk.k}`;
                page.drawText(cmykText, {
                    x: isLeft ? x : x + swatchSize - font.widthOfTextAtSize(cmykText, 5),
                    y: y - 8,
                    font: font,
                    size: 5,
                });

                if (entry.cmptone) {
                    page.drawText(entry.cmptone.name, {
                        x: isLeft ? x : x + swatchSize - boldFont.widthOfTextAtSize(entry.cmptone.name, 6),
                        y: y - 16,
                        font: boldFont,
                        size: 6,
                        color: rgb(0.2, 0.2, 0.2),
                    });
                }

                // Connecting Line
                if (entry.coords && image) {
                    const targetX = imgX + entry.coords.x * imgAreaWidth;
                    const finalTargetY = imgY + (1 - entry.coords.y) * imgAreaHeight;

                    page.drawLine({
                        start: { x: isLeft ? x + swatchSize : x, y: y + swatchSize / 2 },
                        end: { x: targetX, y: finalTargetY },
                        thickness: 0.75,
                        color: rgb(0.4, 0.4, 0.4),
                        opacity: 0.3,
                    });

                    // Circle at target
                    page.drawCircle({
                        x: targetX,
                        y: finalTargetY,
                        size: 2,
                        color: rgb(0.9, 0, 0),
                    });
                }
            });
        };

        drawSideColors(leftColors, true);
        drawSideColors(rightColors, false);

    } else {
        // --- Original Strip Mode (One page per color) ---
        for(let i=0; i < colors.length; i++) {
            const page = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
            const entry = colors[i];
            
            page.drawText(title, { x: margin, y: A4_HEIGHT_PT - margin, font: boldFont, size: 18 });

            const swatches = [entry.cmyk];
            if (includeVariations) swatches.push(...generateVariations(entry.cmyk));

            swatches.forEach((color, idx) => {
                const yPos = A4_HEIGHT_PT - 100 - (idx * 80);
                page.drawRectangle({
                    x: margin,
                    y: yPos,
                    width: 100,
                    height: 60,
                    color: cmyk(color.c/100, color.m/100, color.y/100, color.k/100),
                });
                if (!customerSample) {
                    page.drawText(`C${color.c} M${color.m} Y${color.y} K${color.k}`, { x: margin + 110, y: yPos + 25, font, size: 10 });
                } else {
                    page.drawText(`#${idx + 1}`, { x: margin + 110, y: yPos + 25, font: boldFont, size: 12 });
                }
            });
        }
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes).toString('base64');
}

export async function generateMultiGridPdf(baseColors: CmykColor[], gridConfig: MultiGridFormValues): Promise<string> {
    const { PDFDocument, StandardFonts, cmyk, rgb } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    const pageWidth = A4_HEIGHT_PT;
    const pageHeight = A4_WIDTH_PT;

    for (const baseColor of baseColors) {
        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        const gridData = generateGridData(baseColor, gridConfig.gridSize, gridConfig.step, gridConfig.xAxis, gridConfig.yAxis);
        
        const margin = 36;
        const gap = 2 * MM_TO_PT;
        const cellWidth = (pageWidth - margin * 2 - (gridConfig.gridSize - 1) * gap) / gridConfig.gridSize;
        const cellHeight = (pageHeight - margin * 2 - 40 - (gridConfig.gridSize - 1) * gap) / gridConfig.gridSize;

        gridData.forEach((row, rIdx) => {
            row.forEach((color, cIdx) => {
                const x = margin + cIdx * (cellWidth + gap);
                const y = pageHeight - margin - 40 - (rIdx * (cellHeight + gap) + cellHeight);
                page.drawRectangle({
                    x, y, width: cellWidth, height: cellHeight,
                    color: cmyk(color.c/100, color.m/100, color.y/100, color.k/100),
                });
                // Draw CMYK label inside the cell
                const isDark = color.k > 50 || (color.c > 50 && color.m > 50);
                const textColor = isDark ? rgb(1, 1, 1) : rgb(0, 0, 0);
                const labelSize = Math.max(5, Math.min(8, Math.min(cellWidth, cellHeight) * 0.08));
                const line1 = `C${color.c} M${color.m}`;
                const line2 = `Y${color.y} K${color.k}`;
                const line1Width = font.widthOfTextAtSize(line1, labelSize);
                const line2Width = font.widthOfTextAtSize(line2, labelSize);
                // Center the first line vertically a bit above the center
                page.drawText(line1, {
                    x: x + (cellWidth - line1Width) / 2,
                    y: y + cellHeight / 2 + labelSize / 2,
                    font,
                    size: labelSize,
                    color: textColor,
                });
                // Second line slightly below the center
                page.drawText(line2, {
                    x: x + (cellWidth - line2Width) / 2,
                    y: y + cellHeight / 2 - labelSize * 1.5,
                    font,
                    size: labelSize,
                    color: textColor,
                });
            });
        });
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes).toString('base64');
}

export interface SampleSheetOptions {
    colors: PrintStripEntry[];
    title: string;
    details?: string;
    logoDataUri?: string;
    paperFormat?: 'A4' | 'A3' | 'Custom';
    customWidth?: number;
    customHeight?: number;
    includeVariations?: boolean;
}

export async function generateSampleSheetPdf(options: SampleSheetOptions): Promise<string> {
    const { PDFDocument, StandardFonts, cmyk, rgb } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const { colors, title, details, logoDataUri, paperFormat = 'A4', customWidth, customHeight, includeVariations = false } = options;

    let pageWidth = A4_WIDTH_PT;
    let pageHeight = A4_HEIGHT_PT;
    if (paperFormat === 'A3') { pageWidth = A3_WIDTH_PT; pageHeight = A3_HEIGHT_PT; }
    else if (paperFormat === 'Custom' && customWidth && customHeight) { pageWidth = customWidth * MM_TO_PT; pageHeight = customHeight * MM_TO_PT; }

    const margin = 40;
    const footerHeight = 40;
    const headerHeight = logoDataUri ? 110 : 70;
    
    // Grid Layout Constants
    const entriesPerRow = includeVariations ? 7 : 5;
    const hGap = 12;
    const vGap = 25;
    const labelZoneHeight = 35; // Space for the two CMYK lines BELOW the swatch
    
    const drawAreaWidth = pageWidth - margin * 2;
    let swatchSize = (drawAreaWidth - (entriesPerRow - 1) * hGap) / entriesPerRow;
    
    // Safety check: Don't let swatches be taller than the page itself
    const maxAvailableHeight = pageHeight - margin * 2 - headerHeight - footerHeight;
    if (swatchSize + labelZoneHeight + vGap > maxAvailableHeight) {
        swatchSize = maxAvailableHeight - labelZoneHeight - vGap;
    }

    const fullRowHeight = swatchSize + labelZoneHeight + vGap;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let currentY = pageHeight - margin;

    // Draw Header on first page
    if (logoDataUri) {
        try {
            const img = logoDataUri.includes('png') ? await pdfDoc.embedPng(logoDataUri) : await pdfDoc.embedJpg(logoDataUri);
            const scaled = img.scaleToFit(120, 50);
            page.drawImage(img, { x: pageWidth - margin - scaled.width, y: currentY - scaled.height, width: scaled.width, height: scaled.height });
        } catch (e) {}
    }
    page.drawText(title, { x: margin, y: currentY - 20, font: boldFont, size: 18 });
    if (details) page.drawText(details, { x: margin, y: currentY - 35, font, size: 9, color: rgb(0.3, 0.3, 0.3) });
    
    currentY -= headerHeight;

    for (const entry of colors) {
        // Precise overflow check including labels
        if (currentY - fullRowHeight < margin + footerHeight) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            currentY = pageHeight - margin - 20; 
        }

        const swatches = [entry.cmyk];
        if (includeVariations) swatches.push(...generateVariations(entry.cmyk, 10));

        swatches.forEach((color, idx) => {
            const colIdx = idx % entriesPerRow;
            const x = margin + colIdx * (swatchSize + hGap);
            const swatchBottomY = currentY - swatchSize;
            
            // 1. Draw Swatch Box
            page.drawRectangle({ 
                x, 
                y: swatchBottomY, 
                width: swatchSize, 
                height: swatchSize, 
                color: cmyk(color.c/100, color.m/100, color.y/100, color.k/100) 
            });
            
            // 2. Swatch Number (Inside Top-Left)
            const isDark = color.k > 50 || (color.c > 50 && color.m > 50);
            const contrastColor = isDark ? rgb(1, 1, 1) : rgb(0, 0, 0);
            const numberSize = Math.max(6, Math.min(10, swatchSize * 0.1));
            page.drawText(`${idx + 1}`, {
                x: x + 5,
                y: currentY - numberSize - 5,
                font: boldFont,
                size: numberSize,
                color: contrastColor,
            });

            // 3. CMYK Labels (Outside Below Swatch)
            // We use pure black for labels to ensure they stand out on the white page background
            const labelSize = Math.max(5, Math.min(8, swatchSize * 0.08));
            const line1 = `C${color.c} M${color.m}`;
            const line2 = `Y${color.y} K${color.k}`;
            
            const line1Width = font.widthOfTextAtSize(line1, labelSize);
            page.drawText(line1, { 
                x: x + (swatchSize - line1Width) / 2, 
                y: swatchBottomY - 12, // 12pt below swatch bottom
                font, 
                size: labelSize,
                color: rgb(0, 0, 0)
            });

            const line2Width = font.widthOfTextAtSize(line2, labelSize);
            page.drawText(line2, { 
                x: x + (swatchSize - line2Width) / 2, 
                y: swatchBottomY - 24, // 24pt below swatch bottom
                font, 
                size: labelSize,
                color: rgb(0, 0, 0)
            });
        });
        
        currentY -= fullRowHeight;
    }

    // Add Footers
    const pageCount = pdfDoc.getPageCount();
    pdfDoc.getPages().forEach((p, i) => {
        p.drawText(`Page ${i + 1} of ${pageCount} | Generated with Colour Matcher Pro`, { 
            x: margin, 
            y: 15, 
            font, 
            size: 7,
            color: rgb(0.5, 0.5, 0.5)
        });
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes).toString('base64');
}

import { Suspense } from 'react';
import PrintGrid from './print-grid';
import type { CmykColor } from '@/lib/grid';

/**
 * Print Page for generating a CMYK grid.
 * In Next.js 15, searchParams is a Promise and must be awaited.
 */
async function PrintPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const c = Number(params.c ?? 50);
  const m = Number(params.m ?? 50);
  const y = Number(params.y ?? 50);
  const k = Number(params.k ?? 10);
  const gridSize = Number(params.gridSize ?? 15);
  const step = Number(params.step ?? 5);
  const xAxis = (params.xAxis ?? 'c') as keyof CmykColor;
  const yAxis = (params.yAxis ?? 'm') as keyof CmykColor;

  const paperFormat = params.paperFormat as string | undefined;
  const width = params.width ? Number(params.width) : undefined;
  const height = params.height ? Number(params.height) : undefined;

  let pageSize = 'auto';
  if (paperFormat) {
    pageSize = `${paperFormat} landscape`;
  } else if (width && height) {
    pageSize = `${width}mm ${height}mm`;
  }

  const formValues = { c, m, y, k, gridSize, step, xAxis, yAxis };

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: ${pageSize};
            margin: 0.5in;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />
      <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading grid...</div>}>
        <PrintGrid formValues={formValues} />
      </Suspense>
    </div>
  );
}

export default PrintPage;

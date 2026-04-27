export type CmykColor = {
  c: number;
  m: number;
  y: number;
  k: number;
};

export type GridData = CmykColor[][];

export function generateGridData(
  baseColor: CmykColor,
  gridSize: number,
  step: number,
  xAxis: keyof CmykColor,
  yAxis: keyof CmykColor
): GridData {
  const grid: GridData = [];
  const halfGrid = Math.floor(gridSize / 2);

  for (let i = 0; i < gridSize; i++) {
    const row: CmykColor[] = [];
    for (let j = 0; j < gridSize; j++) {
      const newColor = { ...baseColor };

      const yDelta = (i - halfGrid) * step;
      const xDelta = (j - halfGrid) * step;
      
      const currentYValue = newColor[yAxis];
      const currentXValue = newColor[xAxis];

      newColor[yAxis] = currentYValue + yDelta;
      newColor[xAxis] = currentXValue + xDelta;

      // Clamp values between 0 and 100
      (Object.keys(newColor) as Array<keyof CmykColor>).forEach((key) => {
        newColor[key] = Math.round(Math.max(0, Math.min(100, newColor[key])));
      });

      row.push(newColor);
    }
    grid.push(row);
  }

  return grid;
}

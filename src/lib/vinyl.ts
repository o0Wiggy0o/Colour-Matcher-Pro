
export interface VinylColor {
  manufacturer: string;
  name: string;
  number: string;
  hex: string;
  cmyk: import('./grid').CmykColor;
}

export const vinylColors: VinylColor[] = [
    { manufacturer: "Oracal", name: "Brimstone Yellow", number: "651-025", hex: "#f9e500", cmyk: { c: 2, m: 5, y: 100, k: 0 } },
    { manufacturer: "Oracal", name: "Light Red", number: "651-032", hex: "#d9382f", cmyk: { c: 8, m: 89, y: 88, k: 1 } },
    { manufacturer: "Oracal", name: "Azure Blue", number: "651-052", hex: "#007dc2", cmyk: { c: 92, m: 47, y: 9, k: 0 } },
    { manufacturer: "3M", name: "Sunflower", number: "7125-15", hex: "#ffc72c", cmyk: { c: 0, m: 22, y: 91, k: 0 } },
    { manufacturer: "3M", name: "Tomato Red", number: "7125-47", hex: "#d8292f", cmyk: { c: 9, m: 96, y: 91, k: 1 } },
    { manufacturer: "Avery", name: "Intense Blue", number: "SC950-630", hex: "#005697", cmyk: { c: 98, m: 73, y: 20, k: 7 } },
];

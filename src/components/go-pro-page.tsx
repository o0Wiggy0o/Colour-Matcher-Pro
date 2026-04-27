
'use client';

import { Check, Star, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

const FeatureListItem = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-3">
    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
    <span className="text-muted-foreground">{children}</span>
  </li>
);

export default function GoProPage() {
  return (
    <div className="container mx-auto max-w-5xl py-8 px-4 sm:px-6 lg:px-8">
      <header className="text-center mb-12">
        <Zap className="mx-auto h-16 w-16 text-yellow-400 mb-4" />
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Unlock Your Full Potential</h1>
        <p className="text-xl text-muted-foreground mt-2">Go Pro to access powerful tools designed for professional workflows.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
        <Card>
          <CardHeader>
            <CardTitle>Supercharged Grid Generator</CardTitle>
            <CardDescription>Generate perfect palettes faster.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              <FeatureListItem>
                <strong>AI Variations Mode:</strong> Let AI create grids of unique, subtle variations by adjusting all four CMYK values simultaneously.
              </FeatureListItem>
              <FeatureListItem>
                <strong>Download True CMYK PDFs:</strong> Export production-ready PDFs that bypass browser color conversion issues, ready for professional RIP software.
              </FeatureListItem>
              <FeatureListItem>
                <strong>CMPTone® & Vinyl Converters:</strong> Instantly find colors from extensive libraries and use their CMYK values as your base.
              </FeatureListItem>
              <FeatureListItem>
                <strong>Printable Swatch Books:</strong> Create a personalized, multi-page swatch book PDF for a perfect physical color reference.
              </FeatureListItem>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Intelligent Image Extractor</CardTitle>
            <CardDescription>Pull color data from any source file.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              <FeatureListItem>
                <strong>SVG Palette Extraction:</strong> Upload an SVG logo and the AI will parse it to extract every unique color into a clean palette.
              </FeatureListItem>
              <FeatureListItem>
                <strong>AI Gradient Detection:</strong> The AI analyzes your image to find the most prominent color gradients, which you can then print as test strips.
              </FeatureListItem>
               <FeatureListItem>
                <strong>Closest CMPTone® Matching:</strong> Get the closest CMPTone® reference for any color you pick, right on your printable test strip.
              </FeatureListItem>
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>The Colour Tracker</CardTitle>
            <CardDescription>Manage color consistency across jobs.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
               <FeatureListItem>
                <strong>Job Management:</strong> Create different projects to keep color histories organized and persistent.
              </FeatureListItem>
              <FeatureListItem>
                <strong>Search Across Jobs:</strong> Select a color and instantly find visually similar colors across your entire job history.
              </FeatureListItem>
               <FeatureListItem>
                <strong>AI-Powered Suggestions:</strong> When you update a color, the AI suggests proportional updates for similar colors in other jobs.
              </FeatureListItem>
              <FeatureListItem>
                <strong>Full Data Portability:</strong> Export and import your entire job database for backup and migration.
              </FeatureListItem>
            </ul>
          </CardContent>
        </Card>
      </div>

      <footer className="text-center mt-12">
        <Button size="lg" className="shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
          <Star className="mr-2" />
          Upgrade to Pro
        </Button>
        <p className="text-xs text-muted-foreground mt-4">(This is a demo. In a real app, this would lead to a payment page.)</p>
      </footer>
    </div>
  );
}

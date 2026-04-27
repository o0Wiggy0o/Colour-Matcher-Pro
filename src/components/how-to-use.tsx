
"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const InstructionStep = ({ step, title, description, imgSrc, imgHint, isReversed = false }: {
  step: number;
  title: string;
  description: string;
  imgSrc: string;
  imgHint: string;
  isReversed?: boolean;
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 items-center mb-12">
    <div className={cn("flex-1", isReversed && "md:order-last")}>
      <h4 className="text-xl font-semibold mb-2 text-primary">{`Step ${step}: ${title}`}</h4>
      <p className="text-muted-foreground">{description}</p>
    </div>
    <div className="flex-1 flex justify-center">
      <Image
        src={imgSrc}
        alt={title}
        width={400}
        height={250}
        className="rounded-lg shadow-lg border"
        data-ai-hint={imgHint}
      />
    </div>
  </div>
);

export function HowToUse() {
  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">How to Use Colour Matcher Pro</h1>
        <p className="text-lg text-muted-foreground mt-2">A guide to getting the most out of your professional color tools.</p>
      </header>

      <div className="space-y-16">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">The Grid Generator</CardTitle>
            <CardDescription>Create and explore vast palettes of color variations from a single base color.</CardDescription>
          </CardHeader>
          <CardContent>
            <InstructionStep
              step={1}
              title="Set Your Base Color"
              description="Start by entering your precise CMYK values in the 'Base CMYK Color' panel. You can also use the Pro converters to select a color from Pantone® or vinyl libraries."
              imgSrc="https://placehold.co/400x250.png"
              imgHint="color sliders"
            />
            <InstructionStep
              step={2}
              title="Configure the Grid"
              description="In the 'Grid Configuration' panel, choose your grid size and the variation step. In Manual Mode, select which CMYK values will vary on the X and Y axes. In AI Mode (Pro), just set the variation level and let the AI do the work."
              imgSrc="https://placehold.co/400x250.png"
              imgHint="grid settings"
              isReversed
            />
            <InstructionStep
              step={3}
              title="Generate and Interact"
              description="Click 'Generate Grid'. Hover over any swatch to see a live preview of its CMYK, RGB, and HEX values. Click on a swatch you like to save it to your Color History on the right."
              imgSrc="https://placehold.co/400x250.png"
              imgHint="interactive grid"
            />
            <InstructionStep
              step={4}
              title="Export and Print"
              description="Your saved swatches in the 'Color History' can be exported to CSV, JSON, or TXT formats. Use the 'Print Preview' for a quick reference sheet, or download a production-ready CMYK PDF (Pro) for professional use."
              imgSrc="https://placehold.co/400x250.png"
              imgHint="color history export"
              isReversed
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">The Image Color Extractor</CardTitle>
            <CardDescription>Generate color palettes and gradients directly from images and vector files.</CardDescription>
          </CardHeader>
          <CardContent>
            <InstructionStep
              step={1}
              title="Upload Your File"
              description="Drag and drop or select an image (JPG, PNG) or vector file (SVG) into the upload area. The tool will automatically process the file."
              imgSrc="https://placehold.co/400x250.png"
              imgHint="image upload"
            />
            <InstructionStep
              step={2}
              title="Pick Colors or View Palette"
              description="For raster images, hover over the image to use the 'loupe' and click to pick a color. For SVGs (Pro), a full palette of every unique color will be extracted automatically."
              imgSrc="https://placehold.co/400x250.png"
              imgHint="color picker loupe"
              isReversed
            />
            <InstructionStep
              step={3}
              title="Use AI Detection (Pro)"
              description="For raster images, the AI will automatically detect prominent gradients and display them. You can print these gradients as a continuous-tone CMYK test strip."
              imgSrc="https://placehold.co/400x250.png"
              imgHint="gradient detection"
            />
             <InstructionStep
              step={4}
              title="Build Your Print Strip"
              description="Every color you pick or add from an SVG palette is added to the 'Print Strip' on the right. You can then download this strip as a CMYK PDF for test printing."
              imgSrc="https://placehold.co/400x250.png"
              imgHint="print strip"
              isReversed
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">The Colour Tracker (Pro)</CardTitle>
            <CardDescription>A project management tool for your colors, allowing you to track color evolution and maintain consistency.</CardDescription>
          </CardHeader>
          <CardContent>
            <InstructionStep
              step={1}
              title="Create a Job"
              description="In the left-hand panel, give your project a name (e.g., 'Client X Logo') and click 'Add' to create a new job."
              imgSrc="https://placehold.co/400x250.png"
              imgHint="job list"
            />
             <InstructionStep
              step={2}
              title="Track Color Entries"
              description="With a job selected, click 'Add Colour'. Enter the CMYK values and add any relevant notes, like the printer used or the client's feedback. Each entry is timestamped, creating a revision history."
              imgSrc="https://placehold.co/400x250.png"
              imgHint="color entry form"
              isReversed
            />
             <InstructionStep
              step={3}
              title="Find Similar Colors"
              description="Hover over a color entry and click the search icon to find visually similar colors across all of your other jobs, helping you maintain brand consistency or find suitable alternatives."
              imgSrc="https://placehold.co/400x250.png"
              imgHint="search results"
            />
              <InstructionStep
              step={4}
              title="Use AI Suggestions"
              description="When you edit a color, the AI may suggest proportional updates for similar colors in other jobs. These suggestions will appear at the top of the relevant job's color list, which you can apply or dismiss."
              imgSrc="https://placehold.co/400x250.png"
              imgHint="ai suggestion"
              isReversed
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Scenario = ({ title, problem, solution, isPro = false }: {
    title: string;
    problem: string;
    solution: React.ReactNode;
    isPro?: boolean;
}) => (
    <AccordionItem value={title}>
        <AccordionTrigger className="text-left hover:no-underline">
            <div className="flex items-center gap-4">
                <span className="text-lg font-semibold">{title}</span>
                {isPro && <Badge variant="outline">Pro</Badge>}
            </div>
        </AccordionTrigger>
        <AccordionContent className="pt-2">
            <div className="space-y-4">
                <div>
                    <h4 className="font-semibold text-foreground/90">The Problem:</h4>
                    <p className="text-muted-foreground">{problem}</p>
                </div>
                <div>
                    <h4 className="font-semibold text-foreground/90">The Solution with Colour Matcher Pro:</h4>
                    <div className="text-muted-foreground prose prose-sm dark:prose-invert">
                        {solution}
                    </div>
                </div>
            </div>
        </AccordionContent>
    </AccordionItem>
);

export function UseCases() {
    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
            <header className="text-center mb-12">
                <h1 className="text-4xl font-bold tracking-tight text-foreground">Practical Use Cases</h1>
                <p className="text-lg text-muted-foreground mt-2">Real-world scenarios where this tool saves you time and money.</p>
            </header>

            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle>Common Professional Scenarios</CardTitle>
                    <CardDescription>Click each scenario to see how Colour Matcher Pro provides a solution.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                        <Scenario
                            title="Matching a Client's Existing Brand Color"
                            problem="A client provides a physical sample (like a letterhead) of their brand color and wants a new sign to match it perfectly. You don't have the exact CMYK values."
                            solution={
                                <ol className="list-decimal pl-5 space-y-1">
                                    <li>
                                        Find your starting point. You can either:
                                        <ul className="list-disc pl-6 my-1">
                                            <li>Use the CMYK sliders in the <strong>Grid Generator</strong> to find a color that looks close to the sample on your calibrated screen.</li>
                                            <li><strong>(Pro)</strong> Download and print the full <strong>CMPTone® Swatch Book</strong> onto your media. Find the closest visual match in the book to get a precise starting CMYK value.</li>
                                        </ul>
                                    </li>
                                    <li>Generate a grid with small <kbd>Step</kbd> values (e.g., 2-3%) to create a range of close variations around your starting point.</li>
                                    <li>Print this grid directly onto your target media, using your <strong>standard printing workflow with color correction ON</strong>. This produces a swatch sheet that represents how your system normally interprets colors.</li>
                                    <li>Under proper lighting, compare the printed grid to the client's physical sample.</li>
                                    <li>Find the swatch that is the perfect visual match.</li>
                                    <li>Use the <strong>Coordinate Picker</strong> to enter the X/Y coordinates of that matching swatch back into the app. This instantly finds the <em>source CMYK values</em> for that perfect swatch.</li>
                                    <li>The exact CMYK value is now in your history, ready for production.</li>
                                    <li><strong>The Critical Final Step:</strong> In your design software, create a swatch with these <em>exact</em> CMYK values. When you send the final design to your RIP, you must configure it to <strong>ignore color correction profiles</strong> for this specific swatch (often called using 'Pure' or 'Native' values). This forces the printer to output the exact ink mixture you identified as a perfect match, bypassing the system's usual color adjustments.</li>
                                </ol>
                            }
                        />

                        <Scenario
                            title="Creating a Subtle Tonal Background"
                            problem="You need a background with very subtle variations of a single color to give it depth, but manually creating dozens of slightly different CMYK values is tedious and often looks uniform."
                            isPro
                            solution={
                                <ol className="list-decimal pl-5 space-y-1">
                                    <li>In the <strong>Grid Generator</strong>, select your base color.</li>
                                    <li>Switch to <strong>AI Variations Mode</strong>.</li>
                                    <li>Set a low <kbd>Variation</kbd> level (e.g., 2 or 3).</li>
                                    <li>Let the AI generate a grid of unique, nuanced variations around your base color.</li>
                                    <li>Download the <strong>CMYK PDF</strong> to see how these subtle colors print on your media before committing to the final design.</li>
                                </ol>
                            }
                        />

                        <Scenario
                            title="Recreating a Palette from a Low-Quality Image"
                            problem="A client sends you their logo as a fuzzy JPG and has no idea what the original color values are."
                            solution={
                                <ol className="list-decimal pl-5 space-y-1">
                                    <li>Go to the <strong>Image Extractor</strong> tab and upload the JPG.</li>
                                    <li>Use the color picker loupe to hover over the main colors of the logo. Click to add each distinct color to your <strong>Print Strip</strong>.</li>
                                    <li>For Pro users, the tool will also find the closest CMPTone® match for each color picked, giving you another professional reference point.</li>
                                    <li>Download the <strong>Strip PDF</strong> and print it to see the accurate CMYK colors and discuss them with the client for approval.</li>
                                </ol>
                            }
                        />
                         <Scenario
                            title="Extracting a Full Palette from a Client's Logo File"
                            problem="A client provides their logo as an SVG file. You need to extract every single color used in the logo to create a brand style guide."
                            isPro
                            solution={
                                <ol className="list-decimal pl-5 space-y-1">
                                    <li>Go to the <strong>Image Extractor</strong> tab.</li>
                                    <li>Upload the client's SVG file.</li>
                                    <li>The AI will automatically parse the file and display a complete palette of every unique color used for fills and strokes in the <strong>SVG Palette</strong> panel.</li>
                                    <li>You can add individual colors to your print strip or print the entire palette directly to a PDF for reference.</li>
                                </ol>
                            }
                        />
                        <Scenario
                            title="Replicating a Sunset Gradient from a Photograph"
                            problem="A client provides a beautiful photo of a sunset and wants you to use its colors to create a large-scale printed background. Manually picking colors to recreate the smooth gradient would be extremely time-consuming and likely inaccurate."
                            isPro
                            solution={
                                <ol className="list-decimal pl-5 space-y-1">
                                    <li>In the <strong>Image Extractor</strong>, upload the client's photograph.</li>
                                    <li>The app's <strong>AI Gradient Detection</strong> (Pro) will automatically analyze the image and identify the most prominent color fades.</li>
                                    <li>Each detected gradient (e.g., "Sky transition from orange to deep purple") is displayed with its CMYK color stops.</li>
                                    <li>You can print any of these gradients directly to a continuous-tone CMYK test strip PDF to see how it looks on your print media.</li>
                                </ol>
                            }
                        />
                        <Scenario
                            title="Finding a CMYK Equivalent for a Sign Vinyl"
                            problem="You're designing a partial wrap for a vehicle that is already partially covered in Oracal 651 'Brimstone Yellow'. You need to create printed graphics that match this vinyl color, but you only have the manufacturer's name and color, not the CMYK values."
                            isPro
                            solution={
                                <ol className="list-decimal pl-5 space-y-1">
                                    <li>In the <strong>Grid Generator</strong>, open the <strong>Vinyl Converter</strong> (Pro).</li>
                                    <li>Search for "Oracal Brimstone".</li>
                                    <li>Select the color from the list. The app instantly loads its closest CMYK equivalent as your new base color.</li>
                                    <li>You can now use this as the primary color in your design software or generate a grid around it to create perfectly matching gradients for the print.</li>
                                </ol>
                            }
                        />
                        <Scenario
                            title="Ensuring Color Consistency Across Multiple Jobs"
                            problem="You've worked with a client for years. They have a 'corporate blue,' but it has been printed slightly differently across various jobs. They now want a new banner that matches the 'original' blue."
                            isPro
                            solution={
                                <ol className="list-decimal pl-5 space-y-1">
                                    <li>In the <strong>Colour Tracker</strong>, you have a job for this client containing the color history.</li>
                                    <li>You can see the different CMYK values used over time, along with your notes, the printer used, and standard rendering profiles like GRACol or FOGRA.</li>
                                    <li>You select the entry that was noted as the 'perfect match' to use for the new job.</li>
                                    <li>Use the <strong>Similar Color Search</strong> to find where this blue (or close variations) has been used in other projects, ensuring brand consistency.</li>
                                </ol>
                            }
                        />
                        <Scenario
                            title="Creating a Reliable, In-House CMPTone® Reference"
                            problem="You know that CMPTone® swatch books are printed under ideal conditions that don't match your specific printer, ink, and media combination. You need a truly accurate physical reference for how CMPTone® colors will actually look when you produce them."
                            isPro
                            solution={
                                <ol className="list-decimal pl-5 space-y-1">
                                    <li>In the <strong>Grid Generator</strong>, click the <strong>Print Swatch Book</strong> button (Pro).</li>
                                    <li>In the dialog, enter your specific production details: the printer model, the color profile you use (e.g., GRACoL), and the exact media you're printing on.</li>
                                    <li>Generate the multi-page PDF. The app intelligently sorts all the colors by hue and lightness.</li>
                                    <li>Print this PDF on your production machine. The resulting book is a perfect, personalized reference guide that shows exactly how each CMPTone® color reproduces with your unique setup.</li>
                                </ol>
                            }
                        />
                    </Accordion>
                </CardContent>
            </Card>
        </div>
    );
}


# Colour Matcher Pro

## Overview

Colour Matcher Pro is a professional web-based tool designed for print designers, sign makers, prepress operators, and color professionals. It bridges the gap between on-screen color exploration and production-ready print work by providing a suite of powerful tools for generating, managing, and exporting CMYK color data.

The application is split into three main sections: the **Grid Generator** for color exploration, the **Colour Tracker** for project-based color management, and the **Image Color Extractor** for palette generation from raster and vector files.

## Core Features

### 1. Grid Generator

This is the primary workspace for creating and exploring vast palettes of color variations from a single base color.

#### Key Functions:

*   **Base Color Input:**
    *   **CMYK Sliders:** Directly input precise C, M, Y, and K values (0-100) to define your starting color.
    *   **Find CMPTone® Color:** A searchable combobox allows you to find any color from an extensive CMPTone® library and instantly get its closest CMYK equivalent to use as a base.
    *   **Fine-Tuning:** Quickly lighten or darken your base color by adjusting the Key (black) value with dedicated buttons.

*   **Grid Generation Modes:**
    *   **Manual Axis Mode:** A traditional method where you control which two CMYK values vary across the X and Y axes of the grid. You also control the `Grid Size` and `Step` percentage between each swatch.
    *   **AI Variations Mode:** A powerful, intelligent mode that uses a generative AI model. You provide the base color, grid size, and a general "variation" level (1-10). The AI then generates a grid of unique, subtle variations by adjusting all four CMYK values simultaneously, creating a more organic and nuanced set of colors around the base.

*   **Interactive Grid & Previews:**
    *   The generated grid is fully interactive. Hovering over any color swatch displays a real-time preview card with its exact CMYK, RGB, and HEX values.
    *   Clicking a swatch saves it to the Color History for later use or export.

*   **Coordinate Picker:**
    *   After printing a grid, you can identify a desired color on the paper and enter its X/Y coordinates into the app. The picker instantly finds the corresponding color and adds it to your history.

*   **Color History & Export:**
    *   All selected colors are saved in the "Color History" panel.
    *   This history can be exported in multiple formats for use in other applications: **CSV**, **JSON**, or a plain **TXT** file.

*   **Print & Production:**
    *   **Print Preview:** Generates a quick, printer-friendly HTML view of the grid with CMYK values overlaid on each swatch for easy reference.
    *   **Download CMYK PDF:** This is a key feature for professional workflows. It generates a **true CMYK PDF** on the server, ensuring the color values are not converted to RGB by the browser. This file is ready for use in professional RIP software and printing environments. You can select standard paper sizes (A4, A3) or define custom dimensions.
    *   **CMPTone® Swatch Book Printing**: Create a multi-page, visually-sorted swatch book PDF with your own production notes (printer, media, profile) for a perfect physical reference.

### 2. Image Color Extractor

This powerful section allows you to generate color palettes and gradients directly from images and vector files.

#### Key Functions:

*   **Raster Image Color Picking:** Upload a JPG or PNG, then hover anywhere on the image to see a real-time "loupe" showing the CMYK values of the pixel under your cursor. Click to add any color to a printable test strip.
*   **SVG Palette Extraction (Pro Feature):** Upload an SVG file (like a client's logo) and the app will use AI to parse the file and extract every unique color used for fills and strokes. The complete palette is displayed, with options to add colors to the print strip.
*   **AI Gradient Detection (Pro Feature):** The application analyzes your uploaded raster image to find the most prominent multi-step color gradients (e.g., a sunset). Each gradient is displayed with its CMYK color stops and can be printed as a continuous-tone CMYK test strip PDF.
*   **CMPTone® Matching (Pro Feature):** The print strip PDF will include the closest CMPTone® match for each color picked while in Pro mode.

### 3. Colour Tracker (Pro Feature)

This section acts as a project management tool for your colors, allowing you to track color evolution and maintain consistency across different print jobs.

#### Key Functions:

*   **Job Management:** Create, select, and delete different "jobs" or projects.
*   **Color History per Job:** Each job has its own persistent history of color entries. You can add, edit, and delete colors, including notes, the printer used, and standard rendering profiles like GRACol or FOGRA.
*   **Similar Color Search:** Select any color within a job and instantly search across *all* other jobs to find visually similar colors, helping you maintain brand consistency or find suitable alternatives.
*   **AI-Powered Suggestions:** When you update a color in one job, the application's AI can intelligently suggest similar proportional updates for colors in other jobs, streamlining color correction across projects.
*   **Print Strips:** Generate a simple print-out of all colors currently tracked within a specific job for quick physical reference.
*   **Full Data Portability:** Export and import your entire job and suggestion database as a single JSON file, allowing for easy backup and migration.

## How It Works

*   **Frontend:** Built with **Next.js** and **React**, using **TypeScript** for type safety. The UI is constructed with **ShadCN** components and styled with **Tailwind CSS**. State is managed locally within components using React Hooks.
*   **AI Integration:** The "AI Variations", "Gradient Detection", and "SVG Palette Extraction" features are powered by **Genkit**, which communicates with Google's generative AI models to create and analyze color data based on sophisticated prompts.
*   **Backend & Server Actions:** Server-side logic, such as the CMYK PDF generation and color library searches, is handled using Next.js Server Actions to ensure optimal performance.
*   **Persistence:** Your Color History (in the Grid Generator) and all Colour Tracker data (jobs, colors, suggestions) are automatically saved to your browser's `localStorage`, so your work is preserved between sessions.

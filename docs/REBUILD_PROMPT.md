# AI Rebuild Prompt: Colour Matcher Pro

**Role**: You are a Senior Full-Stack Engineer and AI Architect.
**Goal**: Rebuild "Colour Matcher Pro" - a professional web application for print designers and sign makers to manage CMYK color data.

---

### **1. Tech Stack Requirements**
*   **Framework**: Next.js 15 (App Router), TypeScript, React 18.
*   **Styling**: Tailwind CSS + ShadCN UI. 
*   **Icons**: Lucide React.
*   **Backend**: Firebase (Authentication and Firestore).
*   **AI Integration**: Genkit (Gemini 1.5) for logic flows.
*   **PDF Generation**: `pdf-lib` (Crucial: Must support true CMYK color space output).
*   **UI Layout**: The app must be "Viewport Fitting" (100vh) with internal scroll areas. No global body scroll.
*   **Colors**: Primary: Cornflower Blue (`#6495ED`), Accent: 100% Cyan (`hsl(180 100% 50%)`).

---

### **2. Core Features & Logic**

#### **A. The Grid Generator**
*   **Input System**: 4 numeric fields (C, M, Y, K). 
    *   Allow 3 digits max (0-100).
    *   Logic: Auto-tab focus to the next field once 3 digits are entered.
    *   Header includes a "Reset" icon to clear all values.
*   **Generation Logic**:
    *   **Manual Mode**: Generate a 2D grid by varying two chosen CMYK axes by a user-defined "Step" percentage.
    *   **AI Mode (Pro)**: Use Genkit to generate a grid of organic, unique variations where all 4 CMYK values are subtly adjusted simultaneously.
*   **Soft Proofing (Pro)**: Implement a toggle that simulates print gamut by converting CMYK to RGB, then HSL, clamping saturation to ~85%, and converting back.
*   **Interactive Loupe**: Hovering swatches displays CMYK/RGB/HEX and finds the closest match from a provided "CMPTone®" (Pantone simulation) library.

#### **B. Image Color Extractor**
*   **Raster Engine**: Upload JPG/PNG to a canvas. Implement a crosshair loupe that extracts pixel data (`getImageData`) and converts it to CMYK.
*   **SVG Engine (Pro)**: Use Genkit to parse raw SVG XML and extract every unique hex/rgb color used in `fill` or `stroke` attributes.
*   **Gradient Detection (Pro)**: Use Genkit to analyze an image, identify prominent linear gradients, and extract their color stops as CMYK values.
*   **Print Strip**: Collected colors are added to a "Print Strip" list.

#### **C. Colour Tracker (Pro)**
*   **Firestore Structure**:
    *   `/users/{uid}/jobs/{jobId}` (Name, Timestamp)
    *   `/users/{uid}/jobs/{jobId}/colors/{colorId}` (cmyk object, printerId, media, notes, gracol/fogra booleans).
*   **Search Engine**: Implement a "Similar Color Search" using **Delta E (CIE76)**.
    *   Logic: Convert CMYK -> RGB -> XYZ -> Lab. Calculate Euclidean distance in Lab space.
*   **AI Proportional Suggestions**: When a color is edited in one job, Genkit analyzes other jobs for visually similar colors and suggests a proportional "Delta" update (e.g., if user added +5 Cyan here, suggest +5 Cyan there).

#### **D. PDF Engine (`pdf-lib`)**
*   **True CMYK**: All `drawRectangle` calls must use the `cmyk(c/100, m/100, y/100, k/100)` color function to ensure professional RIP software sees pure ink values.
*   **Modes**:
    1.  **Grid PDF**: A4/A3/Custom landscape grid with CMYK labels.
    2.  **Customer Sample**: Replaces all CMYK formulas with simple index numbers (1, 2, 3...) for blind client approvals.
    3.  **Physical Reference Sheet**: Allows user to upload their own logo to the PDF header for a branded production sheet.

---

### **3. Data Model (Firestore Blueprints)**
*   `User`: { id, email, printers: string[] }
*   `Job`: { name, createdAt }
*   `ColorEntry`: { cmyk: {c,m,y,k}, notes, printerId, timestamp, gracol: bool }

---

### **4. UI Design System**
*   Use a clean, professional "Prepress" aesthetic.
*   Cards should have subtle shadows. 
*   Navigation should be Tab-based (Grid Generator | Image Extractor | Colour Tracker).
*   Pro features should be visually locked behind a "Pro Mode" toggle for the demo.

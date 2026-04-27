# Colour Matcher Pro - Technical Specification (Final)

## 1. Project Purpose
A high-end web utility for print professionals to manage, explore, and export CMYK data with production-grade accuracy.

## 2. Technical Stack
- **Framework**: Next.js 15, TypeScript, React 18.
- **UI**: Tailwind CSS, ShadCN UI, Lucide.
- **Backend**: Firebase Auth + Firestore.
- **AI**: Genkit (Gemini 1.5) for pattern recognition and color suggestions.
- **PDF**: `pdf-lib` utilizing native CMYK output.

## 3. Data Model
### Firestore
- `users/{uid}`: Profile + `printers` (string[]).
- `users/{uid}/jobs/{jobId}`: Project metadata.
- `users/{uid}/jobs/{jobId}/colors/{colorId}`:
  - `cmyk`: {c, m, y, k}
  - `notes`: string
  - `printerId`: string
  - `media`: string
  - `gracol/fogra`: boolean
  - `timestamp`: ISO string

## 4. Key Logic & Math
### Color Conversion
- **CMYK to RGB**: Standard inverse-ink formula.
- **RGB to Lab**: Performed via XYZ intermediary for perceptual accuracy.
- **Delta E (CIE76)**: Square root of the sum of squared differences in L, a, and b channels. Used for "Similar Color" search.

### UI Interaction
- **Auto-Focus**: Inputs monitor `value.length`. If length >= 3, shift focus to the next sibling input.
- **Soft Proofing**: Heuristic-based saturation clamping (clamping 'S' in HSL to 85%) to simulate print gamut limitations.

## 5. Professional Features
- **True CMYK PDF**: Bypasses browser RGB conversion. Ready for RIP software (Efi Fiery, VersaWorks, etc.).
- **Customer Sample Mode**: Obfuscates color formulas for client approval.
- **Proportional AI Updates**: Calculates the CMYK delta of a change and applies it to visually similar assets across different projects.

## 6. Layout
- **Viewport Fitting**: The app uses `h-full` and `flex-col` to ensure it fits the browser window without external scrolling. Content-heavy areas use `ScrollArea`.
- **Accent Color**: Vibrant Cyan (#00FFFF) for a modern, technical feel.

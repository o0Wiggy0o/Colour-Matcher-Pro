# Preview Project Workflow

This workflow details how to start the development server and preview the project.

## Steps

1. **Start Development Server**
   - Run `npm run dev` to start the Next.js development server.
   - By default, it uses Turbopack (`--turbopack`).
   - **Troubleshooting**: If the server crashes with memory issues, try running without Turbopack:
     ```powershell
     npx next dev
     ```

2. **Verify Preview**
   - Once the server is ready, open [http://localhost:3000](http://localhost:3000) in your browser.

3. **Genkit Developer UI**
   - If you need to test Genkit flows, run:
     ```powershell
     npm run genkit:dev
     ```
   - Open [http://localhost:4000](http://localhost:4000) for the Genkit Developer UI.

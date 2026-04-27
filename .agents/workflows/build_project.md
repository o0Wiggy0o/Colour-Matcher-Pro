# Build Project Workflow

This workflow details the steps to install dependencies and build the project.

## Steps

1. **Environment Setup**
   - Ensure Node.js >= v20 is installed.
   - If on Windows and using a fresh installation, ensure the Node.js path is in your environment variables.
   - If running in a shell where the path is not updated, you may need to add it manually:
     ```powershell
     $env:Path += ";C:\Program Files\nodejs"
     ```

2. **Install Dependencies**
   - Run `npm install` to install all required packages.
   - Note: This may take a few minutes.

3. **Build the Project**
   - Run `npm run build` to create a production build.
   - **Troubleshooting**: If you encounter memory errors (OOM), try increasing the Node heap size:
     ```powershell
     $env:NODE_OPTIONS = "--max-old-space-size=4096"
     npm run build
     ```

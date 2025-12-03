# Porting to VS Code

This project was prepared for export from Base44. 
The configuration files are currently located in `components/local_dev_setup/` due to platform restrictions.

## Setup Instructions

1. **Move Configuration Files**
   Move the following files from `components/local_dev_setup/` to the **root** of your project folder:
   - `package.json`
   - `vite.config.js`
   - `jsconfig.json`

2. **Install Dependencies**
   Open your terminal in the project root and run:
   ```bash
   npm install
   ```

3. **Environment Setup**
   - `vite.config.js` and `jsconfig.json` are configured to map the `@` alias to the root directory (`./`), preserving the Base44 import structure.
   - You may need to create a `.env` file for any secrets (e.g., `OPENAI_API_KEY`).

4. **Code Adjustments**
   - **LiveKit Integration**: In `components/comms/ActiveNetPanel.js`, the LiveKit import and logic were commented out or simulated. You can now uncomment/restore the real `livekit-client` code since you have the package installed locally.
   - **Base44 SDK**: The app uses `@/api/base44Client`. This file exists in the project but depends on the Base44 platform environment. You will need to:
     - Replace `@/api/base44Client` with your own backend client (e.g., Firebase, Supabase, or a custom Node/Express server).
     - Or mock the `base44` object to return local data for testing.

5. **Run Locally**
   ```bash
   npm run dev
   ```

6. **LiveKit Backend**
   - The backend function `functions/generateLiveKitToken.js` uses `Deno` syntax. You will need to convert this to a Node.js Express route or Next.js API route using the `livekit-server-sdk` (included in dependencies).

## Folder Structure
- `pages/`: Application pages
- `components/`: Reusable components
- `entities/`: JSON schemas (formerly used for Base44 database generation)
- `functions/`: Backend logic (needs migration to Node.js/Python)

Happy coding!
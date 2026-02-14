# Nomad Nexus

Nomad Nexus is a real-time communication and coordination platform with a dark sci-fi aesthetic. It is designed for communities to organize events, communicate via voice and text, and manage user roles and permissions.

## Core Features

- **Role-Based Access Control:** Differentiated permissions for Guests, Members, Officers, and Admins.
- **Event Management:** Create, view, and manage public and private events.
- **Real-Time Comms Console:** Integrated LiveKit for push-to-talk voice channels and direct messaging.
- **AI-Powered Summaries:** On-demand AI analysis to summarize communication transcripts.
- **Admin Dashboard:** Tools for user and event management.
- **Responsive Design:** A consistent user experience across desktop, tablet, and mobile devices.

## Technology Stack

- **Frontend:** React, Vite, React Router
- **Real-Time Communication:** LiveKit
- **Backend & Data Platform:** Base44 (AI-powered low-code platform)
- **Styling:** Tailwind CSS with Radix UI for accessible base components.
- **State Management:** TanStack React Query
- **Testing:** Vitest

---

## Getting Started

### Prerequisites

- Node.js (LTS version recommended)
- npm (comes with Node.js)

### Environment Setup

1.  **Copy the Environment File:**
    This project uses environment variables to connect to backend services. Create a `.env` file from the example:

    ```bash
    cp .env.example .env
    ```

2.  **Fill in Environment Variables:**
    Open the `.env` file and add the required values for the LiveKit and Base44 services.

    | Variable | Description |
    | --- | --- |
    | `LIVEKIT_URL` | The URL for your LiveKit server instance. |
    | `LIVEKIT_API_KEY` | LiveKit API key. |
    | `LIVEKIT_API_SECRET` | LiveKit API secret. |
    | `VITE_BASE44_APP_ID` | Your Base44 application ID. |
    | `VITE_BASE44_BACKEND_URL`| The API endpoint for your Base44 backend. |

    > **Security Note:** Never commit secret keys to your Git repository. The `.gitignore` file is configured to ignore the `.env` file.

### Installation

Install the project dependencies using npm:

```bash
npm install
```

### Running the Development Server

Start the local Vite development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the next available port).

---

## Available Scripts

The `package.json` file includes several scripts for common development tasks:

- `npm run dev`: Starts the Vite development server with hot-reloading.
- `npm run build`: Compiles and bundles the application for production.
- `npm run preview`: Serves the production build locally for testing.
- `npm run lint`: Lints the codebase for style and syntax errors using ESLint.
- `npm run lint:fix`: Automatically fixes linting issues where possible.
- `npm run typecheck`: Runs the TypeScript compiler to check for type errors.
- `npm run test:unit`: Executes the unit test suite using Vitest.
- `npm run test:backend`: Runs backend-focused test suites (`tests/comms`, `tests/admin`, service hardening).
- `npm run backend:preflight`: One-command backend resume validation (`typecheck` + `lint` + `test:backend`).

For Base44 restart sequencing, use `docs/BASE44_BACKEND_RESUME_PLAYBOOK.md`.

---

## Project Structure

- **`src/`**: Frontend application source.
  - **`src/nexus-os/`**: NexusOS shell, services, schemas, validators, and preview workbench.
  - **`src/nexus-os/ui/theme/`**: Shared Nexus design foundations and shell theme layers (global Redscar styling).
  - **`src/pages/`**: Route-level page modules (including AccessGate and onboarding flow).
  - **`src/components/`**: Shared React UI and feature components.
  - **`src/lib/`**: Core utilities, contexts, and app-wide helpers.
  - **`src/api/`**: Base44 integration and frontend function invocation helpers.
- **`functions/`**: Contains backend serverless functions deployed on the Base44 platform. These handle logic like token generation, data validation, and API integrations.
- **`tests/`**: Contains automated tests for the application.
- **`docs/`**: Project documentation, including the detailed test plan.

---

## Backend Functions

The directory `functions/` contains TypeScript files that are deployed as serverless functions on the Base44 backend. These functions are not run locally but are invoked by the frontend application via the Base44 SDK. They are responsible for secure operations that require privileged access, such as minting LiveKit tokens or performing admin-level actions.

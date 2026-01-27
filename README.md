# Base44 App

## Environment setup

Copy the example env file and fill in the placeholders with real values.

```bash
cp .env.example .env
```

### Required variables

| Variable | Description |
| --- | --- |
| `LIVEKIT_URL` | LiveKit server URL (include `http://` or `https://`). |
| `LIVEKIT_API_KEY` | LiveKit API key used to mint tokens. |
| `LIVEKIT_API_SECRET` | LiveKit API secret used to mint tokens. |
| `VITE_BASE44_APP_ID` | Base44 application ID for client auth. |
| `VITE_BASE44_BACKEND_URL` | Base44 API base URL (e.g. your Base44 instance). |

> **Security note:** never commit real LiveKit secrets to git. Use secure values in production.

## Run locally

Install dependencies and start the Vite dev server:

```bash
npm install
npm run dev
```

### LiveKit options for local development

Pick **one** of the following options so LIVE comms can connect:

1. **Local LiveKit server**
   - Install the LiveKit server (via Homebrew or download):
     - <https://docs.livekit.io/realtime/self-hosting/>
   - Run it locally (example using Docker):

     ```bash
     docker run --rm \
       -p 7880:7880 -p 7881:7881 -p 7882:7882 \
       -e LIVEKIT_KEYS="devkey:secret" \
       livekit/livekit-server --dev
     ```

   - Then set your env vars to match:

     ```env
     LIVEKIT_URL=http://localhost:7880
     LIVEKIT_API_KEY=devkey
     LIVEKIT_API_SECRET=secret
     ```

2. **Test/hosted LiveKit server**
   - Use LiveKit Cloud or any hosted test server.
   - Set `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` to the provided values.

> If LIVEKIT values are missing while running on `localhost`, the app will treat it as a development setup but will still warn you that LIVE comms are disabled.

## Production

1. Build the client:

   ```bash
   npm run build
   ```

2. Serve the production build (example):

   ```bash
   npm run preview
   ```

3. Configure your production environment variables:
   - Set the same variables from `.env.example` on your hosting platform.
   - Point `LIVEKIT_URL` to your production LiveKit deployment.
   - Use secure LiveKit API credentials (do not use the dev key/secret).

# LiveKit Load Test Page

This lightweight React page spawns N simulated LiveKit participants, connects them to a room, toggles push-to-talk on/off, and disconnects after a short duration. Use it to stress-test comms infrastructure before a demo.

## How to run

1. Install dependencies (if not already installed):

```
npm install
```

2. Start the dev server:

```
npm run dev
```

3. Open the load test page in your browser:

```
http://localhost:5173/scripts/livekit-load-test.html
```

## Configure the test

Fill in:

- **LiveKit URL** (e.g. `wss://your-livekit-host`)
- **API Key / API Secret** (used to mint room tokens in-browser)
- **Room Name**
- **Participants**, **Duration**, and **PTT On/Off** timing

Then click **Start Load Test**. Each simulated participant will:

- Connect to the room using a generated token.
- Toggle push-to-talk on and off.
- Leave once the duration elapses.

The log panel captures join/leave events and errors.

## Notes

- Browser permission prompts for microphone access will appear on start.
- For realistic audio stress tests, use a machine with microphone access.

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AccessToken } from 'livekit-server-sdk';

dotenv.config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Mock Authentication Middleware
const mockAuth = (req, res, next) => {
  // In local dev, we assume a default user
  req.user = {
    id: 'dev-user-001',
    full_name: 'Local Developer',
    callsign: 'DEV-OPS',
    rank: 'Pioneer',
    role: 'admin'
  };
  next();
};

// Endpoint: Generate LiveKit Token
app.post('/functions/generateLiveKitToken', mockAuth, async (req, res) => {
  try {
    const { roomNames, roomName, participantName } = req.body;
    
    let rooms = [];
    if (roomNames && Array.isArray(roomNames)) {
        rooms = roomNames;
    } else if (roomName) {
        rooms = [roomName];
    } else {
         return res.status(400).json({ error: 'Missing roomNames or roomName' });
    }

    const effectiveParticipantName = participantName || req.user.callsign || 'Unknown';
    
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
        console.error("Missing LiveKit credentials in .env");
        return res.status(500).json({ error: 'Server misconfigured: Missing LiveKit credentials' });
    }

    const tokens = {};

    for (const room of rooms) {
        const at = new AccessToken(apiKey, apiSecret, {
            identity: effectiveParticipantName,
            name: effectiveParticipantName,
        });

        at.addGrant({ roomJoin: true, room: room, canPublish: true, canSubscribe: true });
        tokens[room] = await at.toJwt();
    }

    res.json({ tokens, livekitUrl });

  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Start Server
app.listen(port, () => {
  console.log(`
  🚀 Local Backend Server running at http://localhost:${port}
  
  Endpoints:
  - POST /functions/generateLiveKitToken

  Make sure your .env file has:
  - LIVEKIT_API_KEY
  - LIVEKIT_API_SECRET
  - LIVEKIT_URL
  `);
});
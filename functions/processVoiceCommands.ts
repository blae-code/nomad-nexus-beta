import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const VOICE_COMMANDS = {
  'open workspace': { action: 'navigate', target: 'Workspace' },
  'open comms': { action: 'navigate', target: 'CommsConsole' },
  'open events': { action: 'navigate', target: 'Events' },
  'open settings': { action: 'navigate', target: 'Settings' },
  'toggle comms': { action: 'toggle', target: 'commsDock' },
  'toggle panel': { action: 'toggle', target: 'contextPanel' },
  'open command': { action: 'openPalette' },
  'start ptt': { action: 'startPTT' },
  'stop ptt': { action: 'stopPTT' },
};

const fuzzyMatch = (input, pattern, threshold = 0.7) => {
  const clean = (s) => s.toLowerCase().trim();
  const inp = clean(input);
  const pat = clean(pattern);
  
  if (inp === pat) return 1;
  if (inp.includes(pat) || pat.includes(inp)) return 0.9;
  
  let matched = 0;
  let patIdx = 0;
  for (let i = 0; i < inp.length && patIdx < pat.length; i++) {
    if (inp[i] === pat[patIdx]) {
      matched++;
      patIdx++;
    }
  }
  return patIdx === pat.length ? matched / pat.length : 0;
};

const parseVoiceInput = (input) => {
  let bestMatch = null;
  let bestScore = 0;

  for (const [command, action] of Object.entries(VOICE_COMMANDS)) {
    const score = fuzzyMatch(input, command);
    if (score > bestScore && score >= 0.6) {
      bestScore = score;
      bestMatch = { command, ...action, confidence: score };
    }
  }

  return bestMatch;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { voiceInput, netId } = await req.json();

    if (!voiceInput || typeof voiceInput !== 'string') {
      return Response.json({ error: 'Invalid voice input' }, { status: 400 });
    }

    const parsed = parseVoiceInput(voiceInput);

    if (!parsed) {
      return Response.json({
        success: false,
        message: 'Command not recognized',
        input: voiceInput,
      });
    }

    return Response.json({
      success: true,
      command: parsed.command,
      action: parsed.action,
      target: parsed.target,
      confidence: parsed.confidence,
      executedBy: user.id,
      executedAt: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
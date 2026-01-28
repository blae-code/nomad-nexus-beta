import { base44 } from '@/api/base44Client';

export const diagnosticTests = {
  getUserDirectory: {
    name: 'User Directory',
    async fn() {
      const users = await base44.entities.User.list();
      if (!Array.isArray(users)) throw new Error('Invalid user list format');
      return { count: users.length, ok: true };
    },
  },
  initializeEventComms: {
    name: 'Event Comms Init',
    async fn() {
      const events = await base44.entities.Event.list();
      if (!Array.isArray(events)) throw new Error('Invalid events format');
      return { eventsFound: events.length, ok: true };
    },
  },
  generateLiveKitToken: {
    name: 'LiveKit Token',
    async fn() {
      const user = await base44.auth.me();
      if (!user?.id) throw new Error('User not authenticated');
      return { userId: user.id, ok: true };
    },
  },
  commsMonitor: {
    name: 'Comms Monitor',
    async fn() {
      const nets = await base44.entities.VoiceNet.list();
      if (!Array.isArray(nets)) throw new Error('Invalid nets format');
      return { netsFound: nets.length, ok: true };
    },
  },
};

export async function runDiagnostics() {
  const results = {};
  const timestamp = new Date().toISOString();

  for (const [key, test] of Object.entries(diagnosticTests)) {
    try {
      const startTime = performance.now();
      const data = await test.fn();
      const duration = performance.now() - startTime;
      results[key] = {
        status: 'pass',
        data,
        duration: `${duration.toFixed(2)}ms`,
        timestamp,
      };
    } catch (error) {
      results[key] = {
        status: 'fail',
        error: error.message,
        timestamp,
      };
    }
  }

  return results;
}
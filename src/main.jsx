import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App.jsx';
import '@/index.css';
import { ensureTailwindCdn } from '@/components/hooks/useTailwindReady';
import TailwindError from '@/components/tailwind/TailwindError';
import TailwindReadyGate from '@/components/tailwind/TailwindReadyGate';

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);

const mountApp = () => {
  root.render(
    <TailwindReadyGate timeoutMs={16000}>
      <App />
    </TailwindReadyGate>,
  );
};

const mountTailwindError = (error) => {
  root.render(<TailwindError error={error} elapsedMs={error?.waitedMs ?? 0} />);
};

const bootstrap = async () => {
  try {
    await ensureTailwindCdn({ timeoutMs: 16000 });
    mountApp();
  } catch (error) {
    mountTailwindError(error);
  }
};

bootstrap();

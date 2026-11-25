import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { hasStoredSessionContext } from './auth/session';
import { restoreSession } from './integration/Auth';
import './index.css';

const bootstrap = async (): Promise<void> => {
  if (hasStoredSessionContext()) {
    await restoreSession();
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
};

void bootstrap();

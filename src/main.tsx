import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// self-hosted fonts — no Google Fonts request at runtime
import '@fontsource-variable/space-grotesk/wght.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import '@fontsource-variable/anek-malayalam/wght.css';

import './styles/tokens.css';
import './styles/base.css';
import './styles/effects.css';
import './styles/components.css';
import './styles/stages.css';
import './styles/stages2.css';
import './styles/responsive.css';

import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { DemoApp } from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Demo root element #root not found in demo.html');
}
createRoot(rootElement).render(
  <StrictMode>
    <DemoApp />
  </StrictMode>,
);

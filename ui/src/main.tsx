import './lib/node-polyfills';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { GovFundProvider } from './state/provider';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <GovFundProvider>
        <App />
      </GovFundProvider>
    </BrowserRouter>
  </StrictMode>,
);

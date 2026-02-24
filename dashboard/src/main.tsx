import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { MetricsProvider } from './store/metricsStore.tsx';
import { ThemeProvider } from './store/themeStore.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <MetricsProvider>
          <App />
        </MetricsProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { MetricsProvider } from './store/metricsStore.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <MetricsProvider>
        <App />
      </MetricsProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

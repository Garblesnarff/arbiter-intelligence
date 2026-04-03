import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { ClaimDetailProvider } from './contexts/ClaimDetailContext';
import { ClaimsProvider } from './contexts/ClaimsContext';
import { ToastProvider } from './contexts/ToastContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HashRouter>
      <ToastProvider>
        <ClaimDetailProvider>
          <ClaimsProvider>
            <App />
          </ClaimsProvider>
        </ClaimDetailProvider>
      </ToastProvider>
    </HashRouter>
  </React.StrictMode>
);

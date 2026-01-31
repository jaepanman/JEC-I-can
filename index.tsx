
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Define process.env shim as early as possible for the browser environment.
// Vite prefixes public variables with VITE_, but the SDK specifically requires API_KEY.
const env = (import.meta as any).env || {};
const globalProcess = {
  env: {
    ...env,
    API_KEY: env.VITE_API_KEY || env.API_KEY || ""
  }
};

(window as any).process = globalProcess;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

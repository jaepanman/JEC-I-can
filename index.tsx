import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Define process.env shim for the browser.
const env = (import.meta as any).env || {};
const existingProcess = (window as any).process || (globalThis as any).process || {};
const existingEnv = existingProcess.env || {};

const API_KEY = existingEnv.API_KEY || env.VITE_API_KEY || env.API_KEY || (window as any)._env_?.VITE_API_KEY || "";

const globalProcess = {
  ...existingProcess,
  env: {
    ...existingEnv,
    ...env,
    API_KEY: API_KEY
  }
};

(window as any).process = globalProcess;
(globalThis as any).process = globalProcess;

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
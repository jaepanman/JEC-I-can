
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Shim process.env for the browser environment to satisfy SDK requirements
// and bridge Vite's VITE_ prefix to the expected API_KEY variable.
const env = (import.meta as any).env || {};
(window as any).process = {
  env: {
    API_KEY: env.VITE_API_KEY || env.API_KEY || ""
  }
};

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

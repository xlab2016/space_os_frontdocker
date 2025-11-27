import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LiveSDKProvider } from './context/LiveSDKContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LiveSDKProvider>
      <App />
    </LiveSDKProvider>
  </React.StrictMode>
);

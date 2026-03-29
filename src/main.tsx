import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error handler to help diagnose issues in the preview
window.onerror = function(message, source, lineno, colno, error) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; color: #ef4444; font-family: sans-serif; text-align: center;">
        <h2 style="margin-bottom: 10px;">런타임 오류가 발생했습니다</h2>
        <p style="font-size: 14px; color: #64748b; margin-bottom: 20px;">${message}</p>
        <button onclick="location.reload()" style="background: #0284c7; color: white; border: none; padding: 10px 20px; rounded: 8px; cursor: pointer;">다시 시도</button>
      </div>
    `;
  }
  return false;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

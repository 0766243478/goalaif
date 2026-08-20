// Debug logging
console.log('[SIREEN] main.tsx loading...', {
  rootEl: document.getElementById('root'),
  bodyHTML: document.body.innerHTML?.substring(0, 200)
});

import { createRoot } from 'react-dom/client';
import App from './App';

const rootEl = document.getElementById('root');
console.log('[SIREEN] Root element found:', !!rootEl);
if (rootEl) {
  try {
    console.log('[SIREEN] Creating React root...');
    const root = createRoot(rootEl);
    console.log('[SIREEN] Rendering App component...');
    root.render(<App />);
    console.log('[SIREEN] App rendered successfully');
  } catch (err) {
    console.error('[SIREEN] Fatal error during render:', err);
    document.body.innerHTML = `<div style="padding:20px;color:#ff6b6b;background:#1a1a2e;height:100vh;font-family:sans-serif;">
      <h2>SIREEN Startup Error</h2>
      <pre>${err instanceof Error ? err.message : String(err)}</pre>
      <p style="font-size:12px;color:#888">Check browser console for details</p>
    </div>`;
  }
} else {
  console.error('[SIREEN] ERROR: #root element not found in DOM');
}
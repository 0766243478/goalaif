import { useState } from 'react';

// SIMPLE TEST VERSION - no dependencies except React
function TestApp() {
  const [count, setCount] = useState(0);
  console.log('[TEST] TestApp rendered', { count });
  
  return (
    <div style={{ padding: 20, background: '#0d1117', color: '#fff', minHeight: '100vh' }}>
      <h1>SIREEN Test</h1>
      <p>React is working! Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>Click Me</button>
    </div>
  );
}

export default function App() {
  console.log('[TEST] App component called');
  return <TestApp />;
}

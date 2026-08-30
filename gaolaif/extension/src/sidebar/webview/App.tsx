import { useEffect } from 'react';
import { StoreProvider, useStore } from './store';
import { CopilotLayout } from './ui/layouts/CopilotLayout';
import { ToastProvider } from './ui/components/Toast';
import { useMessageBus } from './hooks/useMessageBus';
import { Text } from './ui/primitives/Text';
import { Stack } from './ui/primitives/Stack';
import './ui'; // imports tokens.css + components.css
import './styles.css'; // legacy styles - will be removed after full migration

function AppContent() {
  const { state, dispatch } = useStore();
  const { send } = useMessageBus();

  useEffect(() => {
    console.log('[Sireen] App mounting, requesting backend status');
    // Backend status only. The OpenRouter credential is owned by the backend
    // environment; the webview never collects, sends, or stores secrets.
    send('sireen.backend.status', {});
    send('sireen.media.request', {});
    send('sireen.session.list', { status: 'active' });
  }, [send]);

  // A lost host message must not leave the webview on the startup spinner
  // forever. Falling back to the workspace keeps the UI recoverable when the
  // backend is still starting or is unavailable (status shows "unavailable").
  useEffect(() => {
    if (state.backendStatus !== null) return;
    const timeout = window.setTimeout(() => {
      dispatch({
        type: 'SET_BACKEND_STATUS',
        status: { backend: 'unavailable', llm: 'unavailable', forge: 'unavailable' },
      });
    }, 5000);
    return () => window.clearTimeout(timeout);
  }, [state.backendStatus, dispatch]);

  if (state.backendStatus === null) {
    return (
      <Stack align="center" justify="center" style={{ height: '100vh' }}>
        <Text variant="body-sm" color="muted">Loading SIREEN...</Text>
      </Stack>
    );
  }
  return <CopilotLayout />;
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </StoreProvider>
  );
}
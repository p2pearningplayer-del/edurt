import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// Automatically attach stored auth token to all /api/* requests for reliable session persistence on Hostinger & proxies
const originalFetch = window.fetch.bind(window);
window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  if (urlStr.startsWith('/api')) {
    const token = localStorage.getItem('edurt_token');
    const headers = new Headers(init?.headers || {});
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
      headers.set('X-Auth-Token', token);
    }
    return originalFetch(input, {
      ...init,
      headers,
      credentials: init?.credentials || 'same-origin',
    });
  }
  return originalFetch(input, init);
};

class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorText: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorText: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorText: error?.message || 'Unexpected rendering error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#0b0f0e', color: '#f8fafc', padding: '3rem', textAlign: 'center' }}>
          <h2 style={{ color: '#10b981', marginBottom: '0.75rem' }}>LearnUp India Portal</h2>
          <p style={{ color: '#94a3b8', marginBottom: '1.25rem' }}>{this.state.errorText}</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              this.setState({ hasError: false, errorText: '' });
              window.location.reload();
            }}
          >
            Reload Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </StrictMode>
);

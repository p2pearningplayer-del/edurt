import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { setupResilientJsonFetch } from './apiConnector.ts';

// Initialize 3-tier resilient JSON API connector (Express -> Hostinger PHP Gateway -> Local JSON DB)
setupResilientJsonFetch();

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

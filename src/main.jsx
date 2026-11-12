import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext.jsx';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Club_Cognisphere ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, sans-serif',
          backgroundColor: '#020617',
          color: '#f8fafc'
        }}>
          <div style={{
            maxWidth: '560px',
            width: '100%',
            backgroundColor: '#0f172a',
            borderRadius: '20px',
            padding: '28px',
            border: '1px solid #334155'
          }}>
            <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#f87171', marginBottom: '8px' }}>
              Application Runtime Error
            </h1>
            <pre style={{
              backgroundColor: '#1e293b',
              padding: '14px',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#fca5a5',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              maxHeight: '220px'
            }}>
              {this.state.error?.stack || this.state.error?.message || String(this.state.error)}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '16px',
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: '#10b981',
                color: '#020617',
                border: 'none',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);

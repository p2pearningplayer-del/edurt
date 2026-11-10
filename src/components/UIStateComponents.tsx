import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCw, Sparkles, Inbox, ArrowRight } from 'lucide-react';

// =============================================================================
// 1. COMPONENT-LEVEL ERROR BOUNDARY
// =============================================================================

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ComponentErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error?.message || 'Unexpected module rendering error' };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ComponentErrorBoundary caught error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '2.5rem 1.5rem',
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 'var(--radius-lg, 12px)',
            textAlign: 'center',
            margin: '1.5rem 0',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 1rem',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f87171',
            }}
          >
            <AlertTriangle size={24} />
          </div>
          <h3 style={{ fontSize: '1.15rem', color: '#f87171', marginBottom: '0.4rem' }}>
            {this.props.fallbackTitle || 'Unable to load this section'}
          </h3>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary, #94a3b8)', maxWidth: '480px', margin: '0 auto 1.25rem' }}>
            {this.props.fallbackMessage ||
              this.state.errorMessage ||
              'A temporary component rendering error occurred. Your session and data are completely secure.'}
          </p>
          <button className="btn btn-secondary btn-sm" onClick={this.handleReset}>
            <RefreshCw size={14} />
            Try Reloading Section
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// =============================================================================
// 2. LOADING SKELETONS (SHIMMER / GLASSMORPHISM)
// =============================================================================

export interface SkeletonProps {
  type?: 'overview' | 'cards' | 'table' | 'courseCard' | 'detail' | 'list';
  count?: number;
}

export const LoadingSkeleton: React.FC<SkeletonProps> = ({ type = 'cards', count = 3 }) => {
  if (type === 'overview') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
        {/* KPI Cards Skeleton */}
        <div className="grid-4" style={{ gap: '1rem' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="surface-card skeleton-card" style={{ height: '110px' }}>
              <div className="skeleton-line" style={{ width: '45%', height: '12px', marginBottom: '12px' }} />
              <div className="skeleton-line" style={{ width: '70%', height: '24px' }} />
            </div>
          ))}
        </div>
        {/* Graph Skeleton */}
        <div className="surface-card skeleton-card" style={{ height: '260px' }}>
          <div className="skeleton-line" style={{ width: '30%', height: '16px', marginBottom: '20px' }} />
          <div style={{ display: 'flex', alignItems: 'flex-end', height: '160px', gap: '1.25rem' }}>
            {[40, 75, 55, 90, 65, 80, 100].map((h, idx) => (
              <div
                key={idx}
                className="skeleton-bar"
                style={{ flex: 1, height: `${h}%`, borderRadius: '6px' }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="surface-card skeleton-card" style={{ padding: '1rem' }}>
        <div className="skeleton-line" style={{ width: '25%', height: '18px', marginBottom: '1rem' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div className="skeleton-line" style={{ flex: 1, height: '18px' }} />
              <div className="skeleton-line" style={{ flex: 2, height: '18px' }} />
              <div className="skeleton-line" style={{ flex: 1, height: '18px' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'courseCard') {
    return (
      <div className="grid-3" style={{ gap: '1.5rem', width: '100%' }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="surface-card skeleton-card" style={{ height: '320px', padding: 0, overflow: 'hidden' }}>
            <div className="skeleton-media" style={{ height: '160px' }} />
            <div style={{ padding: '1.25rem' }}>
              <div className="skeleton-line" style={{ width: '85%', height: '18px', marginBottom: '10px' }} />
              <div className="skeleton-line" style={{ width: '60%', height: '14px', marginBottom: '16px' }} />
              <div className="skeleton-line" style={{ width: '40%', height: '22px' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid-3" style={{ gap: '1.25rem', width: '100%' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="surface-card skeleton-card" style={{ height: '140px' }}>
          <div className="skeleton-line" style={{ width: '40%', height: '14px', marginBottom: '14px' }} />
          <div className="skeleton-line" style={{ width: '80%', height: '22px', marginBottom: '10px' }} />
          <div className="skeleton-line" style={{ width: '60%', height: '12px' }} />
        </div>
      ))}
    </div>
  );
};

// =============================================================================
// 3. PREMIUM EMPTY STATE COMPONENT
// =============================================================================

export interface EmptyStateProps {
  icon?: any;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  badge?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: IconComponent = Inbox,
  title,
  description,
  actionText,
  onAction,
  badge,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="surface-card"
      style={{
        padding: '3.5rem 2rem',
        textAlign: 'center',
        margin: '1.5rem 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, var(--bg-surface, #121816) 0%, rgba(18, 24, 22, 0.6) 100%)',
        border: '1px dashed var(--border-strong, rgba(255, 255, 255, 0.15))',
        borderRadius: 'var(--radius-lg, 14px)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background radial glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '280px',
          height: '280px',
          background: 'radial-gradient(circle, var(--color-primary-soft, rgba(16, 185, 129, 0.08)) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {badge && (
        <span
          className="eyebrow-label"
          style={{
            marginBottom: '1rem',
            padding: '0.2rem 0.65rem',
            borderRadius: '999px',
            background: 'var(--color-primary-soft, rgba(16, 185, 129, 0.12))',
            color: 'var(--color-primary, #10b981)',
            fontSize: '0.72rem',
          }}
        >
          {badge}
        </span>
      )}

      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          background: 'var(--bg-elevated, #18201e)',
          border: '1px solid var(--border-strong, rgba(255, 255, 255, 0.15))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-primary, #10b981)',
          marginBottom: '1.25rem',
          boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.4)',
        }}
      >
        <IconComponent size={28} />
      </div>

      <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 600 }}>{title}</h3>
      <p
        style={{
          color: 'var(--text-secondary, #94a3b8)',
          fontSize: '0.92rem',
          maxWidth: '460px',
          lineHeight: 1.6,
          marginBottom: actionText ? '1.5rem' : '0',
        }}
      >
        {description}
      </p>

      {actionText && onAction && (
        <button
          className="btn btn-primary"
          onClick={onAction}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <span>{actionText}</span>
          <ArrowRight size={16} />
        </button>
      )}
    </motion.div>
  );
};

// =============================================================================
// 4. ANIMATED PAGE WRAPPER (FRAMER MOTION)
// =============================================================================

export const PageTransition: React.FC<{ children: React.ReactNode; tabKey?: string }> = ({
  children,
  tabKey,
}) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabKey}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

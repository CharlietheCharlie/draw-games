'use client';

/**
 * Catches render-time errors thrown anywhere in the 3D scene subtree (Three.js /
 * react-three-fiber components) so a single bad frame's worth of state can't
 * white-screen the whole app — the user keeps the sidebar and gets a friendly
 * "reload" prompt instead of a blank canvas.
 *
 * Scope note: React error boundaries only catch errors thrown during *render*.
 * Errors thrown asynchronously inside a useFrame rAF callback happen outside
 * React's render phase and are NOT caught here — that's a known limitation, not
 * an oversight. WebGL *context loss* is handled separately by {@link WebGLFallback}.
 */
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Optional custom fallback; defaults to a full-area reload prompt. */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class SceneErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // No telemetry backend in this project — surface it to the console so it's
    // still diagnosable in dev / from a user's report.
    console.error('[SceneErrorBoundary] 3D scene crashed:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <SceneErrorFallback />;
    }
    return this.props.children;
  }
}

/** Default fallback: mirrors WebGLFallback's look, with a reload action. */
function SceneErrorFallback() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 24,
        textAlign: 'center',
        color: '#e7ecf5',
        background: 'linear-gradient(160deg, #1a2540, #0d1424)',
      }}
    >
      <div style={{ fontSize: 40 }}>🏟️</div>
      <h2 style={{ margin: 0 }}>3D 畫面發生問題</h2>
      <p style={{ maxWidth: 420, opacity: 0.8, lineHeight: 1.5 }}>
        賽場渲染時發生非預期的錯誤。重新載入通常即可恢復；若持續發生，請改用較新版本的瀏覽器。
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: 4,
          padding: '10px 20px',
          borderRadius: 999,
          border: 'none',
          fontWeight: 700,
          color: '#0d1424',
          background: '#ffd34d',
        }}
      >
        重新載入
      </button>
    </div>
  );
}

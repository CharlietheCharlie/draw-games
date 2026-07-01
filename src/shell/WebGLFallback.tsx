'use client';

/** Shown when the browser can't provide a WebGL context. */
export function WebGLFallback() {
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
      <h2 style={{ margin: 0 }}>無法啟用 3D 畫面</h2>
      <p style={{ maxWidth: 420, opacity: 0.8, lineHeight: 1.5 }}>
        您的瀏覽器或裝置目前不支援 WebGL。請改用較新版本的 Chrome / Edge / Safari，或在設定中啟用硬體加速後重試。
      </p>
    </div>
  );
}

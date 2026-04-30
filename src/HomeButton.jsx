export default function HomeButton() {
  return (
    <>
      <style>{`
        .aor-home-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 998;
          display: flex;
          justify-content: center;
          padding: 8px 16px;
          background: linear-gradient(180deg, rgba(13,13,15,0.96) 0%, rgba(13,13,15,0.7) 100%);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255,215,0,0.08);
        }
        .aor-home-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 5px 16px 5px 12px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,215,0,0.15);
          border-radius: 24px;
          text-decoration: none;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
        }
        .aor-home-btn:hover {
          background: rgba(255,215,0,0.05);
          border-color: rgba(255,215,0,0.4);
        }
        .aor-home-btn-sword {
          font-size: 12px;
          opacity: 0.6;
          transition: opacity 0.2s;
        }
        .aor-home-btn:hover .aor-home-btn-sword { opacity: 1; }
        .aor-home-btn-text {
          font-family: monospace;
          font-size: 9px;
          letter-spacing: 0.35em;
          color: rgba(255,215,0,0.4);
          text-transform: uppercase;
          transition: color 0.2s;
        }
        .aor-home-btn:hover .aor-home-btn-text { color: rgba(255,215,0,0.8); }
        .aor-home-btn-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: rgba(64,224,255,0.3);
          flex-shrink: 0;
          transition: background 0.2s;
        }
        .aor-home-btn:hover .aor-home-btn-dot { background: rgba(64,224,255,0.75); }
      `}</style>
      <div className="aor-home-bar">
        <a href="/" className="aor-home-btn">
          <span className="aor-home-btn-dot"/>
          <span className="aor-home-btn-sword">⚔</span>
          <span className="aor-home-btn-text">AOR</span>
          <span className="aor-home-btn-dot"/>
        </a>
      </div>
    </>
  );
}

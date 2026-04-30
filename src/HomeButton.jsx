export default function HomeButton() {
  return (
    <>
      <style>{`
        .aor-home-btn {
          position: fixed;
          top: 14px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 998;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 6px 14px 6px 10px;
          background: rgba(13,13,15,0.82);
          border: 1px solid rgba(255,215,0,0.18);
          border-radius: 24px;
          text-decoration: none;
          cursor: pointer;
          backdrop-filter: blur(10px);
          transition: border-color 0.2s, background 0.2s;
        }
        .aor-home-btn:hover {
          background: rgba(20,20,26,0.95);
          border-color: rgba(255,215,0,0.45);
        }
        .aor-home-btn-sword {
          font-size: 13px;
          line-height: 1;
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        .aor-home-btn:hover .aor-home-btn-sword {
          opacity: 1;
        }
        .aor-home-btn-text {
          font-family: monospace;
          font-size: 9px;
          letter-spacing: 0.3em;
          color: rgba(255,215,0,0.45);
          text-transform: uppercase;
          transition: color 0.2s;
        }
        .aor-home-btn:hover .aor-home-btn-text {
          color: rgba(255,215,0,0.85);
        }
        .aor-home-btn-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: rgba(64,224,255,0.35);
          flex-shrink: 0;
          transition: background 0.2s;
        }
        .aor-home-btn:hover .aor-home-btn-dot {
          background: rgba(64,224,255,0.8);
        }
      `}</style>
      <a href="/" className="aor-home-btn">
        <span className="aor-home-btn-dot"/>
        <span className="aor-home-btn-sword">⚔</span>
        <span className="aor-home-btn-text">AOR</span>
        <span className="aor-home-btn-dot"/>
      </a>
    </>
  );
}

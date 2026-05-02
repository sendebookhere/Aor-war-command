export const PAGES = [
  { href:"/",             label:"HOME",               color:"#FFD700", accent:"rgba(255,215,0,0.12)",   border:"rgba(255,215,0,0.4)"   },
  { href:"/registro",     label:"Registro",           color:"#A8FF78", accent:"rgba(168,255,120,0.08)", border:"rgba(168,255,120,0.3)" },
  { href:"/reporte",      label:"Ranking",            color:"#40E0FF", accent:"rgba(64,224,255,0.08)",  border:"rgba(64,224,255,0.3)"  },
  { href:"/puntos",       label:"Puntos",             color:"#FF9F43", accent:"rgba(255,159,67,0.08)",  border:"rgba(255,159,67,0.3)"  },
  { href:"/propaganda",   label:"Propaganda",         color:"#C8A2FF", accent:"rgba(200,162,255,0.08)", border:"rgba(200,162,255,0.3)" },
  { href:"/inteligencia", label:"Inteligencia",       color:"#FF6B6B", accent:"rgba(255,107,107,0.08)", border:"rgba(255,107,107,0.3)" },
  { href:"/asamblea",     label:"Asamblea",           color:"#F4D03F", accent:"rgba(244,208,63,0.08)",  border:"rgba(244,208,63,0.3)"  },
  { href:"/noticias",     label:"Noticias Clan",      color:"#FF9F43", accent:"rgba(255,159,67,0.08)",  border:"rgba(255,159,67,0.3)"  },
  { href:"/versus",       label:"Versus",             color:"#FF6B6B", accent:"rgba(255,107,107,0.08)", border:"rgba(255,107,107,0.3)" },
];

function logout() {
  ["aor_session","aor_player_id","aor_player_name","aor_user_identity","aor_auth"].forEach(k=>sessionStorage.removeItem(k));
  window.location.href="/";
}

export default function NavBar({current}) {
  const cur = current || "";
  const isHome = cur === "/";

  // 3 rows of 3: [Registro,Ranking,Puntos] [Propaganda,Intel,Asamblea] [Noticias,CerrarSesión,Versus]
  const row1 = PAGES.slice(1,4);
  const row2 = PAGES.slice(4,7);
  const row3_pages = PAGES.slice(7,9); // Noticias, Versus

  return (
    <div style={{marginBottom:"24px"}}>
      {/* HOME */}
      <a href="/" style={{
        display:"block", textAlign:"center", padding:"12px 10px 10px",
        background: isHome ? "rgba(255,215,0,0.1)" : "rgba(255,255,255,0.02)",
        border:"1px solid "+(isHome ? "rgba(255,215,0,0.35)" : "rgba(255,255,255,0.06)"),
        borderRadius:"10px", textDecoration:"none", marginBottom:"8px",
        pointerEvents: isHome ? "none" : "auto",
      }}>
        <div style={{fontSize:"8px",letterSpacing:"0.5em",color:"rgba(255,255,255,0.2)",fontFamily:"monospace",marginBottom:"3px"}}>ANTIGUA ORDEN</div>
        <div style={{fontSize:"11px",color:"rgba(255,255,255,0.15)",marginBottom:"3px"}}>⚔</div>
        <div style={{fontSize:"8px",letterSpacing:"0.4em",color:isHome?"rgba(255,215,0,0.5)":"rgba(255,255,255,0.15)",fontFamily:"monospace",marginBottom:"3px"}}>[AOR]</div>
        <div style={{fontSize:"13px",color:isHome?"#FFD700":"rgba(255,255,255,0.2)",fontFamily:"monospace",fontWeight:"bold",letterSpacing:"0.25em"}}>HOME</div>
      </a>

      {/* Grid 3x3 */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"5px"}}>
        {[...row1,...row2].map(p=>{
          const active = cur===p.href;
          return (
            <a key={p.href} href={p.href} style={{
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
              padding:"9px 4px", textDecoration:"none",
              background: active ? p.accent : "rgba(255,255,255,0.02)",
              border:"1px solid "+(active ? p.border : "rgba(255,255,255,0.06)"),
              borderRadius:"8px", textAlign:"center",
              pointerEvents: active ? "none" : "auto",
            }}>
              <div style={{fontSize:"10px",color:active?p.color:"rgba(255,255,255,0.3)",fontFamily:"monospace",letterSpacing:"0.04em",fontWeight:active?"bold":"normal",lineHeight:"1.3"}}>
                {p.label}
              </div>
            </a>
          );
        })}
        {/* Row 3: Noticias | Cerrar Sesión | Versus */}
        {row3_pages.map(p=>{
          const active = cur===p.href;
          return (
            <a key={p.href} href={p.href} style={{
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
              padding:"9px 4px", textDecoration:"none",
              background: active ? p.accent : "rgba(255,255,255,0.02)",
              border:"1px solid "+(active ? p.border : "rgba(255,255,255,0.06)"),
              borderRadius:"8px", textAlign:"center",
              pointerEvents: active ? "none" : "auto",
            }}>
              <div style={{fontSize:"10px",color:active?p.color:"rgba(255,255,255,0.3)",fontFamily:"monospace",letterSpacing:"0.04em",fontWeight:active?"bold":"normal",lineHeight:"1.3"}}>
                {p.label}
              </div>
            </a>
          );
        })}
        {/* Cerrar Sesión — center of bottom row */}
        <button onClick={logout} style={{
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
          padding:"9px 4px", cursor:"pointer",
          background:"rgba(255,107,107,0.05)",
          border:"1px solid rgba(255,107,107,0.15)",
          borderRadius:"8px",
          gridColumn:"2", gridRow:"3",
        }}>
          <div style={{fontSize:"10px",color:"rgba(255,107,107,0.55)",fontFamily:"monospace",letterSpacing:"0.04em",lineHeight:"1.3"}}>
            Cerrar Sesión
          </div>
        </button>
      </div>
    </div>
  );
}

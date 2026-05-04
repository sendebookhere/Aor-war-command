// Registration open state — set by App.jsx RegistroTimer
// window.__aorRegistroOpen = true/false

export const PAGES = [
  { href:"/",             label:"HOME",         color:"#FFD700" },
  { href:"/puntos",       label:"Puntos",       color:"#FF9F43", accent:"rgba(255,159,67,0.1)",  border:"rgba(255,159,67,0.3)"  },
  { href:"/registro",     label:"Registro",     color:"#A8FF78", accent:"rgba(168,255,120,0.1)", border:"rgba(168,255,120,0.3)" },
  { href:"/reporte",      label:"Ranking",      color:"#40E0FF", accent:"rgba(64,224,255,0.1)",  border:"rgba(64,224,255,0.3)"  },
  { href:"/propaganda",   label:"Propaganda",   color:"#C8A2FF", accent:"rgba(200,162,255,0.1)", border:"rgba(200,162,255,0.3)" },
  { href:"/inteligencia", label:"Intel.",       color:"#FF6B6B", accent:"rgba(255,107,107,0.1)", border:"rgba(255,107,107,0.3)" },
  { href:"/asamblea",     label:"Asamblea",     color:"#F4D03F", accent:"rgba(244,208,63,0.1)",  border:"rgba(244,208,63,0.3)"  },
  { href:"/noticias",     label:"Noticias",     color:"#FF9F43", accent:"rgba(255,159,67,0.1)",  border:"rgba(255,159,67,0.3)"  },
  { href:"/versus",       label:"Versus",       color:"#FF6B6B", accent:"rgba(255,107,107,0.1)", border:"rgba(255,107,107,0.3)" },
];

function nav(href) {
  if (window.__aorNavigate) window.__aorNavigate(href);
  else window.location.href = href;
}

function logout() {
  // Clear all session data
  ["aor_session","aor_player_id","aor_player_name","aor_user_identity","aor_auth",
   "aor_auth_enabled_cache","aor_goto_profile","aor_last_viewed_player"].forEach(k=>sessionStorage.removeItem(k));
  window.__aorUserRegistered = false;
  window.__aorRegistroOpen = false;
  // Force full page reload so LoginGate re-mounts and shows the login screen
  window.location.replace("/");
}

function Btn({p, cur, current}) {
  const isRanking = p.href==="/reporte";
  const isRegistro = p.href==="/registro";
  const active = cur===p.href && !(isRanking && current==="profile");
  // Pulse registro button when registration is open AND user hasn't registered yet
  // Registro glows when: registration is open AND player hasn't registered this week
  const registroOpen = isRegistro && window.__aorRegistroOpen;
  const userRegistered = window.__aorUserRegistered || false;
  const pulse = registroOpen && !userRegistered && !active;
  return (
    <button onClick={()=>{
      if(isRanking) {
        sessionStorage.removeItem("aor_goto_profile");
        sessionStorage.removeItem("aor_last_viewed_player");
      }
      nav(p.href);
    }} style={{
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      padding:"8px 2px",cursor:active?"default":"pointer",
      background: active ? p.accent : pulse ? "rgba(168,255,120,0.1)" : "rgba(255,255,255,0.02)",
      border:"1px solid "+(active ? p.border : pulse ? "rgba(168,255,120,0.5)" : "rgba(255,255,255,0.06)"),
      borderRadius:"7px",textAlign:"center",width:"100%",
      animation: pulse ? "registroPulse 1.8s ease-in-out infinite" : "none",
    }}>
      <div style={{fontSize:"9px",color:active?p.color:pulse?"#A8FF78":"rgba(255,255,255,0.3)",fontFamily:"monospace",letterSpacing:"0.03em",fontWeight:active||pulse?"bold":"normal",lineHeight:"1.3"}}>
        {p.label}{pulse?" 🔔":""}
      </div>
    </button>
  );
}

const pulseStyle = `@keyframes registroPulse {
  0%,100%{box-shadow:0 0 0 0 rgba(168,255,120,0)}
  50%{box-shadow:0 0 8px 2px rgba(168,255,120,0.4)}
}`;

export default function NavBar({current}) {
  const cur = (current||"").split("?")[0];
  const isHome = cur === "/";
  const playerId = sessionStorage.getItem("aor_player_id");
  const playerName = sessionStorage.getItem("aor_player_name");

  if(typeof document!=="undefined"&&!document.getElementById("aor-pulse-style")){const s=document.createElement("style");s.id="aor-pulse-style";s.textContent=pulseStyle;document.head.appendChild(s);}
  return (
    <div style={{marginBottom:"20px"}}>
      {/* HOME */}
      <button onClick={()=>nav("/")} style={{
        display:"block",width:"100%",textAlign:"center",padding:"10px",
        background: isHome ? "rgba(255,215,0,0.1)" : "rgba(255,255,255,0.02)",
        border:"1px solid "+(isHome ? "rgba(255,215,0,0.3)" : "rgba(255,255,255,0.06)"),
        borderRadius:"10px",marginBottom:"6px",cursor:isHome?"default":"pointer",
      }}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"10px"}}>
          <div style={{textAlign:"left"}}>
            <div style={{fontSize:"7px",letterSpacing:"0.4em",color:"rgba(255,255,255,0.15)",fontFamily:"monospace"}}>ANTIGUA ORDEN</div>
            <div style={{fontSize:"12px",color:isHome?"#FFD700":"rgba(255,255,255,0.2)",fontFamily:"monospace",fontWeight:"bold",letterSpacing:"0.2em"}}>HOME</div>
          </div>
          <div style={{fontSize:"16px",color:"rgba(255,255,255,0.1)"}}>⚔</div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:"7px",letterSpacing:"0.3em",color:isHome?"rgba(255,215,0,0.4)":"rgba(255,255,255,0.1)",fontFamily:"monospace"}}>[AOR]</div>
            <div style={{fontSize:"7px",color:"rgba(255,255,255,0.1)",fontFamily:"monospace",letterSpacing:"0.1em"}}>WAR COMMAND</div>
          </div>
        </div>
      </button>

      {/* Mi Perfil */}
      {playerId && (
        <button onClick={()=>{
          // Signal that we want own profile, then navigate
          sessionStorage.setItem("aor_goto_profile","1");
          if(window.__aorNavigate) window.__aorNavigate("/reporte");
          else window.location.href="/reporte";
        }} style={{
          display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"7px 12px",marginBottom:"6px",width:"100%",cursor:"pointer",
          background: current==="profile" ? "rgba(64,224,255,0.08)" : "rgba(255,255,255,0.02)",
          border:"1px solid "+(current==="profile" ? "rgba(64,224,255,0.25)" : "rgba(255,255,255,0.07)"),
          borderRadius:"8px",
        }}>
          <div style={{fontFamily:"monospace",fontSize:"9px",color:current==="profile"?"#40E0FF":"rgba(255,255,255,0.3)",letterSpacing:"0.1em"}}>MI PERFIL</div>
          <div style={{fontFamily:"Georgia,serif",fontSize:"11px",color:current==="profile"?"rgba(64,224,255,0.8)":"rgba(255,255,255,0.3)"}}>{playerName||""}</div>
        </button>
      )}

      {/* 3×3 grid: Row1 | Row2 | Row3 */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"4px"}}>
        <Btn p={PAGES[1]} cur={cur} current={current}/>
        <Btn p={PAGES[2]} cur={cur} current={current}/>
        <Btn p={PAGES[3]} cur={cur} current={current}/>
        <Btn p={PAGES[4]} cur={cur} current={current}/>
        <Btn p={PAGES[5]} cur={cur} current={current}/>
        <Btn p={PAGES[6]} cur={cur} current={current}/>
        <Btn p={PAGES[7]} cur={cur} current={current}/>
        <button onClick={logout} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"8px 2px",cursor:"pointer",background:"rgba(255,107,107,0.04)",border:"1px solid rgba(255,107,107,0.15)",borderRadius:"7px",width:"100%"}}>
          <div style={{fontSize:"9px",color:"rgba(255,107,107,0.5)",fontFamily:"monospace",letterSpacing:"0.03em"}}>Salir</div>
        </button>
        <Btn p={PAGES[8]} cur={cur} current={current}/>
      </div>
      {(()=>{ const isAcerca = cur==="/acerca"; return(
      <button onClick={()=>nav("/acerca")} style={{width:"100%",marginTop:"6px",padding:"5px",background:isAcerca?"rgba(64,224,255,0.07)":"rgba(255,255,255,0.01)",border:"1px solid "+(isAcerca?"rgba(64,224,255,0.25)":"rgba(255,255,255,0.05)"),borderRadius:"6px",color:isAcerca?"#40E0FF":"rgba(255,255,255,0.15)",fontSize:"8px",cursor:"pointer",fontFamily:"monospace",letterSpacing:"0.1em",fontWeight:isAcerca?"bold":"normal"}}>
        ACERCA DE LA APP
      </button>
      ); })()}
    </div>
  );
}

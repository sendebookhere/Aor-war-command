import PageHeader from "./PageHeader";
import NavBar from "./NavBar";
import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import NalguitasFooter from "./NalguitasFooter";

// ── Comunicaciones — public page for approved clan messages ───────────────
export default function Comunicaciones() {
  const [players, setPlayers]     = useState([]);
  const [msgs, setMsgs]           = useState([]);
  const [logs, setLogs]           = useState([]);
  const [selected, setSelected]   = useState(null); // player picking their name
  const [playerName, setPlayerName] = useState(
    sessionStorage.getItem("aor_player_name") || ""
  );
  const [playerId, setPlayerId]   = useState(
    sessionStorage.getItem("aor_player_id") || null
  );
  const [nameInput, setNameInput] = useState("");
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [feedback, setFeedback]   = useState({});
  const [loading, setLoading]     = useState(true);
  const [dailyLimit, setDailyLimit]   = useState(2);
  const [weeklyLimit, setWeeklyLimit] = useState(14); // admin configurable
  const [blockUntil,  setBlockUntil]  = useState(null); // timestamp when block ends

  useEffect(() => {
    // Load block state from localStorage
    const blocked = localStorage.getItem("aor_prop_block");
    if (blocked && parseInt(blocked) > Date.now()) setBlockUntil(parseInt(blocked));

    Promise.all([
      supabase.from("players").select("id,name,active").eq("active",true).order("name"),
      supabase.from("comunicaciones_msgs").select("*").order("slot"),
      supabase.from("message_logs").select("*").order("created_at", {ascending:false}).limit(500),
      supabase.from("app_settings").select("value").eq("key","daily_msg_limit").single(),
      supabase.from("app_settings").select("value").eq("key","weekly_msg_limit").single(),
    ]).then(([p, m, l, s, sw]) => {
      setPlayers(p.data || []);
      setMsgs(m.data || []);
      setLogs(l.data || []);
      if (s.data?.value) setDailyLimit(parseInt(s.data.value)||2);
      if (sw.data?.value) setWeeklyLimit(parseInt(sw.data.value)||14);
      setLoading(false);
    });
  }, []);

  // Cooldown helpers
  function logsThisWeek(pid) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7*24*60*60*1000);
    return logs.filter(l=>String(l.player_id)===String(pid) && new Date(l.created_at)>weekAgo);
  }
  function lastSentTime(pid) {
    const myLogs = logs.filter(l=>String(l.player_id)===String(pid));
    if (!myLogs.length) return null;
    return new Date(myLogs[0].created_at);
  }
  function cooldownRemaining(pid) {
    const last = lastSentTime(pid);
    if (!last) return 0;
    const diff = 2*60*60*1000 - (Date.now() - last.getTime());
    return diff > 0 ? diff : 0;
  }
  function formatTime(ms) {
    const h = Math.floor(ms/3600000);
    const m = Math.floor((ms%3600000)/60000);
    return h>0?`${h}h ${m}m`:`${m}m`;
  }

  function handleNameInput(val) {
    setNameInput(val);
    if (val.length < 2) { setNameSuggestions([]); return; }
    setNameSuggestions(players.filter(p=>p.name.toLowerCase().includes(val.toLowerCase())).slice(0,5));
  }

  function selectPlayer(p) {
    setPlayerName(p.name);
    setPlayerId(String(p.id));
    setSelected(p);
    setNameInput(p.name);
    setNameSuggestions([]);
  }

  function logsToday(pid) {
    const today = new Date().toISOString().slice(0,10);
    return logs.filter(l=>String(l.player_id)===String(pid) && (l.created_at||"").slice(0,10)===today);
  }

  async function handleCopy(msg) {
    if (!playerId) { alert("Identifícate primero con tu nombre del juego."); return; }
    if (blockUntil && blockUntil > Date.now()) {
      setFeedback(f=>({...f,[msg.id]:"Espera "+formatTime(blockUntil-Date.now())+" para volver a publicar."}));
      return;
    }
    const cooldown = cooldownRemaining(playerId);
    if (cooldown > 0) {
      setFeedback(f=>({...f,[msg.id]:"Cooldown: espera "+formatTime(cooldown)+" desde tu último envío."}));
      return;
    }
    if (logsToday(playerId).length >= dailyLimit) {
      setFeedback(f=>({...f,[msg.id]:`Límite diario de ${dailyLimit} alcanzado.`}));
      return;
    }
    if (logsThisWeek(playerId).length >= weeklyLimit) {
      setFeedback(f=>({...f,[msg.id]:`Límite semanal de ${weeklyLimit} alcanzado.`}));
      return;
    }
    await navigator.clipboard.writeText(msg.content || "");
    const confirmed = window.confirm(
      "¿Ya pegaste este mensaje en el chat general del juego?\n\nSi confirmas: se registra como publicado. Publicación falsa = -50 pts."
    );
    if (!confirmed) return;
    const {error} = await supabase.from("message_logs").insert({
      player_id:   parseInt(playerId),
      player_name: playerName,
      msg_id:      msg.id,
      msg_title:   msg.title,
      created_at:  new Date().toISOString(),
    });
    if (error) { setFeedback(f=>({...f,[msg.id]:"Error: "+error.message})); return; }
    // Award +1 pt acumulado for each confirmed propaganda message
    if (playerId) {
      try {
        const {data:pl, error:pe} = await supabase.from("players").select("pts_acumulados").eq("id",parseInt(playerId)).single();
        if (!pe && pl) {
          const {error:ue} = await supabase.from("players").update({pts_acumulados:(pl.pts_acumulados||0)+1}).eq("id",parseInt(playerId));
          if (ue) console.error("Points update error:", ue.message);
        }
      } catch(e) { console.error("Points error:", e); }
    }
    const blockEnd = Date.now() + 60*60*1000;
    setBlockUntil(blockEnd);
    localStorage.setItem("aor_prop_block", String(blockEnd));
    const {data} = await supabase.from("message_logs").select("*").order("created_at",{ascending:false}).limit(500);
    setLogs(data||[]);
    setFeedback(f=>({...f,[msg.id]:"✓ Registrado. Próximo envío disponible en 1h."}));
    setTimeout(()=>setFeedback(f=>({...f,[msg.id]:""})), 5000);
  }

  // Ranking: top propagandists
  const rankMap = {};
  logs.forEach(l=>{ rankMap[l.player_name] = (rankMap[l.player_name]||0)+1; });
  const ranking = Object.entries(rankMap).sort((a,b)=>b[1]-a[1]).slice(0,10);

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,215,0,0.6)",fontFamily:"monospace",letterSpacing:"0.2em",fontSize:"11px"}}>
      ANTIGUA ORDEN — CARGANDO
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",fontFamily:"Georgia,serif",color:"#d4c9a8",paddingBottom:"40px"}}>

      <div style={{maxWidth:"560px",margin:"0 auto",padding:"20px 20px 0"}}>
        <NavBar current="/propaganda"/>
      </div>
      {/* Header */}
      <div style={{borderBottom:"1px solid rgba(200,162,255,0.1)",padding:"0 20px 16px"}}>
        <div style={{maxWidth:"560px",margin:"0 auto"}}>
<PageHeader page="/propaganda"/>

        </div>
      </div>

      <div style={{maxWidth:"560px",margin:"0 auto",padding:"20px"}}>

        {/* Identity */}
        <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",padding:"12px",marginBottom:"20px",position:"relative"}}>
          <div style={{fontSize:"10px",letterSpacing:"0.15em",color:"rgba(255,255,255,0.3)",marginBottom:"6px",fontFamily:"monospace"}}>IDENTIFICACIÓN</div>
          {playerId
            ? <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <span style={{fontSize:"13px",color:"#FFD700",fontWeight:"bold"}}>{playerName}</span>
                  <span style={{fontSize:"10px",color:"rgba(64,224,255,0.5)",marginLeft:"8px"}}>— {logsToday(playerId).length}/{dailyLimit} publicaciones hoy</span>
                </div>
                <button onClick={()=>{
                  ["aor_session","aor_player_id","aor_player_name","aor_user_identity"].forEach(k=>sessionStorage.removeItem(k));
                  window.location.reload();
                }} style={{fontSize:"9px",color:"rgba(255,107,107,0.6)",background:"transparent",border:"1px solid rgba(255,107,107,0.15)",borderRadius:"4px",padding:"2px 8px",cursor:"pointer"}}>cerrar sesión</button>
              </div>
            : <div>
                <input value={nameInput} onChange={e=>handleNameInput(e.target.value)}
                  placeholder="Escribe tu nombre del juego..."
                  style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"6px",color:"#fff",padding:"8px 10px",fontSize:"12px",outline:"none",boxSizing:"border-box"}}/>
                {nameSuggestions.length>0 && (
                  <div style={{background:"#1a1a22",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"6px",marginTop:"4px"}}>
                    {nameSuggestions.map(p=>(
                      <div key={p.id} onClick={()=>selectPlayer(p)} style={{padding:"8px 12px",cursor:"pointer",fontSize:"12px",color:"#d4c9a8",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                        {p.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
          }
        </div>

        {/* Messages */}
        <div style={{fontSize:"10px",letterSpacing:"0.2em",color:"rgba(64,224,255,0.4)",marginBottom:"12px",fontFamily:"monospace"}}>MENSAJES APROBADOS PARA DIFUSIÓN</div>

        {msgs.length === 0 && (
          <div style={{fontSize:"11px",color:"rgba(255,255,255,0.3)",textAlign:"center",padding:"30px",border:"1px solid rgba(255,255,255,0.05)",borderRadius:"8px"}}>
            El comando aún no ha publicado mensajes aprobados. Vuelve pronto.
          </div>
        )}

        {msgs.map((msg, idx) => {
          const todayLogs = playerId ? logsToday(playerId) : [];
          const alreadyUsed = todayLogs.some(l=>l.msg_id===msg.id);
          const limitReached = todayLogs.length >= dailyLimit;
          const isBlocked = blockUntil && blockUntil > Date.now();
          const hasCooldown = playerId && cooldownRemaining(playerId) > 0;
          const canUse = playerId && !limitReached && !isBlocked && !hasCooldown;

          return (
            <div key={msg.id} style={{
              background:"rgba(255,255,255,0.015)",
              border:"1px solid rgba(64,224,255,0.12)",
              borderLeft:"3px solid "+(idx%2===0?"rgba(64,224,255,0.5)":"rgba(255,215,0,0.5)"),
              borderRadius:"8px",
              padding:"16px",
              marginBottom:"12px",
            }}>
              {/* Title */}
              <div style={{
                fontSize:"9px",letterSpacing:"0.3em",
                color:idx%2===0?"rgba(64,224,255,0.5)":"rgba(255,215,0,0.5)",
                fontFamily:"monospace",marginBottom:"6px",textTransform:"uppercase"
              }}>
                {msg.title || "COMUNICACIÓN "+(idx+1)}
              </div>

              {/* Separator */}
              <div style={{height:"1px",background:"linear-gradient(90deg, "+(idx%2===0?"rgba(64,224,255,0.2)":"rgba(255,215,0,0.2)")+", transparent)",marginBottom:"10px"}}/>

              {/* Content — styled without icons */}
              <div style={{
                fontSize:"13px",
                color:"rgba(255,255,255,0.8)",
                lineHeight:"1.7",
                fontFamily:"Georgia,serif",
                letterSpacing:"0.02em",
                marginBottom:"12px",
              }}>
                {(msg.content || "").split("[AOR]").map((part, i) => (
                  <span key={i}>
                    {i>0 && <span style={{color:"#FFD700",fontWeight:"bold"}}>[AOR]</span>}
                    {part.split("Antigua Orden").map((p2, j) => (
                      <span key={j}>
                        {j>0 && <span style={{color:"#40E0FF",fontWeight:"bold"}}>Antigua Orden</span>}
                        {p2}
                      </span>
                    ))}
                  </span>
                ))}
              </div>

              {/* Bottom separator */}
              <div style={{height:"1px",background:idx%2===0?"linear-gradient(90deg,transparent,rgba(64,224,255,0.15),transparent)":"linear-gradient(90deg,transparent,rgba(255,215,0,0.15),transparent)",marginBottom:"10px"}}/>

              {/* Copy button */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <button
                  onClick={()=>handleCopy(msg)}
                  disabled={!canUse}
                  style={{
                    padding:"7px 18px",
                    background: canUse ? (idx%2===0?"rgba(64,224,255,0.1)":"rgba(255,215,0,0.1)") : "rgba(255,255,255,0.03)",
                    border:"1px solid "+(canUse ? (idx%2===0?"rgba(64,224,255,0.3)":"rgba(255,215,0,0.3)") : "rgba(255,255,255,0.06)"),
                    borderRadius:"6px",
                    color: canUse ? (idx%2===0?"#40E0FF":"#FFD700") : "rgba(255,255,255,0.2)",
                    fontSize:"11px",
                    cursor: canUse ? "pointer" : "default",
                    fontFamily:"monospace",
                    letterSpacing:"0.1em",
                  }}>
                  {!playerId ? "IDENTIFICATE PRIMERO" : isBlocked ? "BLOQUEADO "+formatTime(blockUntil-Date.now()) : hasCooldown ? "COOLDOWN "+formatTime(cooldownRemaining(playerId)) : limitReached ? "LIMITE DIARIO ALCANZADO" : alreadyUsed ? "COPIAR DE NUEVO" : "COPIAR Y PUBLICAR"}
                </button>
                {alreadyUsed && <span style={{fontSize:"9px",color:"rgba(168,255,120,0.5)",fontFamily:"monospace"}}>PUBLICADO HOY</span>}
              </div>
              {feedback[msg.id] && (
                <div style={{fontSize:"10px",color:feedback[msg.id].startsWith("✓")?"#A8FF78":"#FF6B6B",marginTop:"6px",fontFamily:"monospace"}}>{feedback[msg.id]}</div>
              )}
            </div>
          );
        })}

        {/* Ranking */}
        {ranking.length > 0 && (
          <div style={{marginTop:"32px"}}>
            <div style={{fontSize:"9px",letterSpacing:"0.3em",color:"rgba(255,215,0,0.4)",fontFamily:"monospace",marginBottom:"12px"}}>EMBAJADORES DE ANTIGUA ORDEN — RANKING DE DIFUSIÓN</div>
            <div style={{background:"rgba(255,255,255,0.01)",border:"1px solid rgba(255,215,0,0.1)",borderRadius:"8px",overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"24px 1fr auto",gap:"0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                <div style={{padding:"8px 12px",fontSize:"9px",color:"rgba(255,255,255,0.25)",fontFamily:"monospace"}}>#</div>
                <div style={{padding:"8px",fontSize:"9px",color:"rgba(255,255,255,0.25)",fontFamily:"monospace"}}>GUERRERO</div>
                <div style={{padding:"8px 12px",fontSize:"9px",color:"rgba(255,255,255,0.25)",fontFamily:"monospace",textAlign:"right"}}>PUBLICACIONES</div>
              </div>
              {ranking.map(([name, count], i)=>(
                <div key={name} style={{display:"grid",gridTemplateColumns:"24px 1fr auto",borderBottom:"1px solid rgba(255,255,255,0.03)",background:i===0?"rgba(255,215,0,0.04)":"transparent"}}>
                  <div style={{padding:"8px 12px",fontSize:"11px",color:i===0?"#FFD700":i===1?"rgba(255,255,255,0.5)":i===2?"rgba(255,159,67,0.6)":"rgba(255,255,255,0.2)",fontFamily:"monospace"}}>{i+1}</div>
                  <div style={{padding:"8px",fontSize:"12px",color:i===0?"#FFD700":"rgba(255,255,255,0.6)",fontWeight:i===0?"bold":"normal"}}>{name}</div>
                  <div style={{padding:"8px 12px",fontSize:"12px",color:i===0?"#FFD700":"rgba(255,255,255,0.4)",textAlign:"right",fontFamily:"monospace",fontWeight:"bold"}}>{count}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:"9px",color:"rgba(255,255,255,0.15)",marginTop:"6px",fontFamily:"monospace",textAlign:"center"}}>Las auditorías verifican las publicaciones. Publicaciones falsas reportadas: -50 pts acumulados.</div>
          </div>
        )}

      </div>
      <NalguitasFooter/>
    </div>
  );
}

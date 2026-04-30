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

  useEffect(() => {
    Promise.all([
      supabase.from("players").select("id,name,active").eq("active",true).order("name"),
      supabase.from("comunicaciones_msgs").select("*").order("slot"),
      supabase.from("message_logs").select("*").order("created_at", {ascending:false}).limit(200),
    ]).then(([p, m, l]) => {
      setPlayers(p.data || []);
      setMsgs(m.data || []);
      setLogs(l.data || []);
      setLoading(false);
    });
  }, []);

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
    if (!playerId) {
      alert("Identifícate primero con tu nombre del juego.");
      return;
    }
    const todayLogs = logsToday(playerId);
    if (todayLogs.length >= 2) {
      setFeedback(f=>({...f,[msg.id]:"Ya alcanzaste el límite de 2 publicaciones hoy."}));
      return;
    }

    // Copy to clipboard
    await navigator.clipboard.writeText(msg.content || "");

    // Ask confirmation
    const confirmed = window.confirm(
      "¿Ya pegaste este mensaje en el chat general del juego?\n\n" +
      "(Si confirmas, se registra como publicado. Si no lo pegaste, no confirmes — " +
      "las auditorías detectan publicaciones falsas y penalizan con -50 pts)"
    );
    if (!confirmed) return;

    // Save log
    const {error} = await supabase.from("message_logs").insert({
      player_id:   parseInt(playerId),
      player_name: playerName,
      msg_id:      msg.id,
      msg_title:   msg.title,
      created_at:  new Date().toISOString(),
    });
    if (error) {
      setFeedback(f=>({...f,[msg.id]:"Error al registrar: "+error.message}));
      return;
    }
    // Refresh logs
    const {data} = await supabase.from("message_logs").select("*").order("created_at",{ascending:false}).limit(200);
    setLogs(data||[]);
    setFeedback(f=>({...f,[msg.id]:"✓ Registrado — gracias por difundir la palabra de [AOR]"}));
    setTimeout(()=>setFeedback(f=>({...f,[msg.id]:""})), 4000);
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

      {/* Header */}
      <div style={{borderBottom:"1px solid rgba(64,224,255,0.1)",padding:"20px 20px 16px"}}>
        <div style={{maxWidth:"560px",margin:"0 auto"}}>
          <div style={{fontSize:"9px",letterSpacing:"0.5em",color:"rgba(64,224,255,0.35)",marginBottom:"4px",fontFamily:"monospace"}}>ANTIGUA ORDEN — COMUNICACIONES</div>
          <div style={{fontSize:"22px",color:"#FFD700",fontFamily:"serif",marginBottom:"4px"}}>[AOR] Mensajes de Difusión</div>
          <div style={{fontSize:"11px",color:"rgba(255,255,255,0.35)"}}>Mensajes preaprobados por el comando. Cópialos y pégalos en el chat general del juego.</div>
          <div style={{display:"flex",gap:"8px",marginTop:"10px"}}>
            <a href="/registro" style={{fontSize:"10px",color:"#A8FF78",textDecoration:"none"}}>Registro</a>
            <span style={{color:"rgba(255,255,255,0.15)"}}>·</span>
            <a href="/reporte" style={{fontSize:"10px",color:"#40E0FF",textDecoration:"none"}}>Ranking</a>
            <span style={{color:"rgba(255,255,255,0.15)"}}>·</span>
            <a href="/puntos" style={{fontSize:"10px",color:"#FFD700",textDecoration:"none"}}>Puntos</a>
          </div>
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
                  <span style={{fontSize:"10px",color:"rgba(64,224,255,0.5)",marginLeft:"8px"}}>— {logsToday(playerId).length}/2 publicaciones hoy</span>
                </div>
                <button onClick={()=>{setPlayerId(null);setPlayerName("");setNameInput("");}} style={{fontSize:"9px",color:"rgba(255,107,107,0.6)",background:"transparent",border:"1px solid rgba(255,107,107,0.15)",borderRadius:"4px",padding:"2px 8px",cursor:"pointer"}}>cambiar</button>
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
          const limitReached = todayLogs.length >= 2;
          const canUse = playerId && !limitReached;

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
                  {!playerId ? "IDENTIFICATE PRIMERO" : limitReached ? "LIMITE DIARIO ALCANZADO" : alreadyUsed ? "COPIAR DE NUEVO" : "COPIAR Y PUBLICAR"}
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
            <div style={{fontSize:"9px",color:"rgba(255,255,255,0.15)",marginTop:"6px",fontFamily:"monospace",textAlign:"center"}}>Las auditorías verifican que los mensajes hayan sido publicados. Publicaciones falsas: -50 pts.</div>
          </div>
        )}

      </div>
      <NalguitasFooter/>
    </div>
  );
}

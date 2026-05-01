import PageHeader from "./PageHeader";
import NavBar from "./NavBar";
import NalguitasFooter from "./NalguitasFooter";
import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const AVAILABILITY = {
  siempre:      { label:"Conquistador",  sub:"Siempre listo", color:"#A8FF78", icon:"🟢" },
  intermitente: { label:"Refuerzos",     sub:"Intermitente",  color:"#FFD700", icon:"🟡" },
  solo_una:     { label:"Reserva",       sub:"Solo una vez",  color:"#FF9F43", icon:"🟠" },
  no_disponible:{ label:"No disponible",                      color:"#FF6B6B", icon:"🔴" },
  pendiente:    { label:"Sin responder",                      color:"#888888", icon:"⚪" },
};

const RANKS = [
  { label:"Co-Líder 👑",  color:"#FFD700", min:25000, desc:"Leyenda del clan"        },
  { label:"Oficial ⚜️",   color:"#40E0FF", min:5000,  desc:"Pilar de la comunidad"  },
  { label:"Veterano ★★★", color:"#A8FF78", min:1000,  desc:"Guerrero experimentado" },
  { label:"Guerrero ★★",  color:"#FFD700", min:500,   desc:"Miembro consolidado"    },
  { label:"Soldado ★",    color:"#FF9F43", min:100,   desc:"En camino"              },
  { label:"Recluta",      color:"#888888", min:0,     desc:"Recién llegado"         },
  { label:"⚠ Vigilado",  color:"#FF6B6B", min:-9999, desc:"Bajo observación"       },
];

function getRank(acc, hon, name, clanRole) {
  if (name === "PUNK'Z" || clanRole === "Líder")    return { label:"Líder 👑",    color:"#FFD700" };
  if (clanRole === "Co-Líder")  return RANKS.find(r=>r.min===25000)||RANKS[0];
  if (clanRole === "Oficial")   return RANKS.find(r=>r.min===5000) ||RANKS[1];
  if (clanRole === "Veterano")  return RANKS.find(r=>r.min===1000) ||RANKS[2];
  if (clanRole === "Guerrero")  return RANKS.find(r=>r.min===500)  ||RANKS[3];
  if (clanRole === "Soldado")   return RANKS.find(r=>r.min===100)  ||RANKS[4];
  if (clanRole === "⚠ Vigilado") return { label:"⚠ Vigilado", color:"#FF6B6B" };
  const total = (acc||0) + (hon||0);
  if (total < 0)  return { label:"⚠ Vigilado", color:"#FF6B6B" };
  return RANKS.find(r => total >= r.min) || RANKS[RANKS.length-1];
}

function totalPts(p) {
  const sb = (p.pt_batallas_ganadas||0) >= 6 ? 10 : 0;
  return (p.pt_registro||0)
    + (p.pt_registro_temprano||0)
    + (p.pt_disponibilidad_declarada||0)
    + (p.pt_disponibilidad||0)
    + (p.pt_obediencia||0)
    + (p.pt_batallas_ganadas||0)*2
    + (p.pt_batallas_perdidas||0)
    + (p.pt_defensas||0)
    + (p.pt_bonus||0)
    + (p.pt_bandido_post||0)
    + (p.pt_stats||0)
    + (p.pt_whatsapp||0)
    + sb
    - (p.pt_penalizacion||0)
    - (p.pt_no_aparecio||0)
    - (p.pt_ignoro_orden||0)*2
    - (p.pt_abandono||0)*2
    - (p.pt_inactivo_4h||0)*3
    - (p.pt_fuera_castillo||0)*2
  - (p.pt_bandido_pre||0);
}

function Pill({ color, children }) {
  return (
    <span style={{
      fontSize:"9px", padding:"1px 6px", borderRadius:"10px",
      background:color+"22", color, border:"1px solid "+color+"44"
    }}>
      {children}
    </span>
  );
}

// ── Player Profile ─────────────────────────────────────────────────────────
function PlayerProfile({ player, onBack }) {
  const [history, setHistory]   = useState([]);
  const [statsList, setStatsList] = useState([]);
  const [msgLogs,  setMsgLogs]  = useState([]);
  const [loading, setLoading]   = useState(true);
  const [newBp, setNewBp]       = useState("");
  const [newLevel, setNewLevel] = useState("");
  const [statsMsg, setStatsMsg] = useState("");

  useEffect(() => {
    Promise.all([
      supabase.from("war_history").select("*").eq("player_id", player.id).order("created_at", {ascending:false}),
      supabase.from("player_stats").select("*").eq("player_id", player.id).order("created_at", {ascending:false}).limit(10),
      supabase.from("message_logs").select("*").eq("player_id", player.id).order("created_at", {ascending:false}).limit(50),
    ]).then(([h, s, m]) => {
      setHistory(h.data || []);
      setStatsList(s.data || []);
      setMsgLogs(m.data || []);
      setLoading(false);
    });
  }, [player.id]);

  async function revertStats() {
    if (statsList.length < 2) { setStatsMsg("No hay versión anterior disponible"); return; }
    const prev = statsList[1]; // second entry is previous
    if (!confirm("¿Revertir stats al estado anterior? BP: "+prev.bp+" / Poder: "+prev.level)) return;
    await supabase.from("players").update({bp: prev.bp, level: prev.level}).eq("id", player.id);
    // Log the revert
    await supabase.from("player_stats").insert({
      player_id: player.id, player_name: player.name,
      bp: prev.bp, level: prev.level, updated_by: "revert",
    });
    setStatsMsg("✓ Stats revertidos a BP: "+prev.bp+" / Poder: "+prev.level);
    setTimeout(()=>setStatsMsg(""),4000);
  }

  async function saveStats() {
    if (!newBp && !newLevel) return;
    // Weekly limit check
    if (statsList.length > 0) {
      const last = new Date(statsList[0].created_at);
      const diffDays = (new Date() - last) / (1000*60*60*24);
      if (diffDays < 7) {
        const next = new Date(last.getTime() + 7*24*60*60*1000);
        setStatsMsg("⚠ Próxima actualización: " + next.toLocaleDateString("es-MX"));
        return;
      }
    }
    const hasBp    = newBp.trim() !== "";
    const hasLevel = newLevel.trim() !== "";
    // 30% tolerance check
    if (hasBp) {
      const current = player.bp || 0;
      const newVal  = parseInt(newBp);
      if (current > 0) {
        const pct = Math.abs(newVal - current) / current;
        if (pct > 0.30) {
          setStatsMsg("⚠ El nuevo BP ("+newVal.toLocaleString()+") difiere más del 30% del actual ("+current.toLocaleString()+"). Pide al admin que lo ajuste manualmente.");
          return;
        }
      }
    }
    if (hasLevel) {
      const current = player.level || 0;
      const newVal  = parseInt(newLevel);
      if (current > 0) {
        const pct = Math.abs(newVal - current) / current;
        if (pct > 0.30) {
          setStatsMsg("⚠ El nuevo Poder difiere más del 30% del actual. Pide al admin que lo ajuste manualmente.");
          return;
        }
      }
    }
    const pts = hasBp && hasLevel ? 5 : 2;
    const updates = { pt_stats: (player.pt_stats||0) + pts };
    if (hasBp)    updates.bp    = parseInt(newBp);
    if (hasLevel) updates.level = parseInt(newLevel);
    await supabase.from("players").update(updates).eq("id", player.id);
    await supabase.from("player_stats").insert({
      player_id: player.id,
      player_name: player.name,
      bp:    hasBp    ? parseInt(newBp)    : (player.bp||0),
      level: hasLevel ? parseInt(newLevel) : (player.level||0),
      updated_by: "jugador",
    });
    setStatsMsg("✓ +" + pts + " pts acreditados");
    setNewBp(""); setNewLevel("");
  }

  const pts   = totalPts(player);
  const acc   = player.pts_acumulados || 0;
  const hon   = player.pts_honorificos || 0;
  const rank  = getRank(acc, hon, player.name, player.clan_role);
  const avail = AVAILABILITY[player.availability] || AVAILABILITY.pendiente;
  const waLabel = (player.pt_whatsapp||0) === 50 ? "📱 WhatsApp Fundador (+50)" : "📱 WhatsApp Grupo (+25)";

  const breakdown = [
    { label:"Registro",                   val: player.pt_registro||0,                 show: (player.pt_registro||0) > 0 },
    { label:"⭐ Registro anticipado (antes mié 23:59 España)", val: player.pt_registro_temprano||0, show: (player.pt_registro_temprano||0) > 0 },
    { label:"Disponibilidad declarada",   val: player.pt_disponibilidad_declarada||0, show: (player.pt_disponibilidad_declarada||0) > 0 },
    { label:"Apareció / Participó (+3)",  val: player.pt_disponibilidad||0,           show: (player.pt_disponibilidad||0) > 0 },
    { label:"Siguió órdenes",            val: (player.pt_obediencia||0)*2,            show: (player.pt_obediencia||0) > 0 },
    { label:"Batallas ganadas",           val: (player.pt_batallas_ganadas||0)*2,     show: (player.pt_batallas_ganadas||0) > 0 },
    { label:"🌟 Bonus 6+ batallas",      val: 10,                                    show: (player.pt_batallas_ganadas||0) >= 6 },
    { label:"Batallas perdidas",          val: player.pt_batallas_perdidas||0,        show: (player.pt_batallas_perdidas||0) > 0 },
    { label:"Defensas de castillo",       val: player.pt_defensas||0,                show: (player.pt_defensas||0) > 0 },
    { label:"Bonus completo",            val: (player.pt_bonus||0)*5,                show: (player.pt_bonus||0) > 0 },
    { label:"Bandido post-guerra",        val: player.pt_bandido_post||0,             show: (player.pt_bandido_post||0) > 0 },
    { label:"Actualización de stats",     val: player.pt_stats||0,                   show: (player.pt_stats||0) > 0 },
    { label: waLabel,                     val: player.pt_whatsapp||0,                show: (player.pt_whatsapp||0) > 0 },
    { label:"No apareció",               val: -(player.pt_no_aparecio||0),           show: (player.pt_no_aparecio||0) > 0 },
    { label:"Sin registro ni participación", val: -(player.pt_penalizacion||0),      show: (player.pt_penalizacion||0) > 0 },
    { label:"Ignoró órdenes",            val: -(player.pt_ignoro_orden||0)*2,        show: (player.pt_ignoro_orden||0) > 0 },
    { label:"Abandonó defensa",          val: -(player.pt_abandono||0)*2,            show: (player.pt_abandono||0) > 0 },
    { label:"🏰 Fuera del castillo (-2 c/u)", val: -(player.pt_fuera_castillo||0)*2,     show: (player.pt_fuera_castillo||0) > 0 },
    { label:"Inactivo +12h",             val: -(player.pt_inactivo_4h||0)*3,         show: (player.pt_inactivo_4h||0) > 0 },
    { label:"Bandido pre-guerra",        val: -(player.pt_bandido_pre||0),           show: (player.pt_bandido_pre||0) > 0 },
  ].filter(item => item.show);

  return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",padding:"20px",fontFamily:"Georgia,serif",color:"#d4c9a8"}}>
      <div style={{maxWidth:"600px",margin:"0 auto"}}>
        <button onClick={onBack} style={{background:"transparent",border:"none",color:"#40E0FF",cursor:"pointer",fontSize:"13px",marginBottom:"16px",padding:0}}>
          ← Volver al ranking
        </button>

        <NavBar current="/reporte"/>
        {/* Header */}
        <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:"10px",padding:"16px",marginBottom:"16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px"}}>
            <div style={{fontFamily:"serif",fontSize:"22px",color:"#FFD700"}}>{player.name}</div>
            <span style={{fontSize:"20px"}}>{player.whatsapp ? "📱" : "📵"}</span>
          </div>
          <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"8px"}}>
            <Pill color={rank.color}>{rank.label}</Pill>
            <Pill color={avail.color}>{avail.icon} {avail.label}</Pill>
            <Pill color="rgba(255,255,255,0.4)">{player.clan_role}</Pill>
          </div>
          <div style={{display:"flex",gap:"16px",fontSize:"12px",flexWrap:"wrap"}}>
            <span style={{color:"rgba(255,255,255,0.5)"}}>⚔ {((player.level||0)/1000).toFixed(1)}k</span>
            <span style={{color:"rgba(255,255,255,0.5)"}}>💀 {(player.bp||0).toLocaleString()}</span>
            <span style={{color: pts>=0 ? "#A8FF78" : "#FF6B6B", fontWeight:"bold"}}>{pts>0?"+":""}{pts} esta guerra</span>
            <span style={{color:rank.color, fontWeight:"bold"}}>{acc} pts acumulados</span>
          </div>

          {hon > 0 && (
            <div style={{marginTop:"10px",background:"rgba(255,215,0,0.08)",border:"1px solid rgba(255,215,0,0.25)",borderRadius:"6px",padding:"8px 12px"}}>
              <div style={{fontSize:"11px",color:"rgba(255,255,255,0.5)",marginBottom:"6px"}}>Desglose de puntos:</div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:"11px",color:"rgba(255,255,255,0.7)",marginBottom:"3px"}}>
                <span>⚔ Ganados en guerras</span>
                <span style={{color:"#A8FF78",fontWeight:"bold"}}>{(acc+pts).toLocaleString()}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:"11px",color:"rgba(255,255,255,0.7)",marginBottom:"3px"}}>
                <span>⭐ Bonus por cargo ({player.clan_role})</span>
                <span style={{color:"#FFD700",fontWeight:"bold"}}>{hon.toLocaleString()}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:"12px",borderTop:"1px solid rgba(255,215,0,0.2)",paddingTop:"4px",marginTop:"4px"}}>
                <span style={{color:"#FFD700",fontWeight:"bold"}}>Total</span>
                <span style={{color:"#FFD700",fontWeight:"bold"}}>{(acc+pts+hon).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Update stats — only if session matches this player */}
        {(()=>{
          const lockedId = sessionStorage.getItem("aor_player_id");
          if (lockedId && String(player.id) !== lockedId) {
            return (
              <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"8px",padding:"10px 14px",marginBottom:"16px"}}>
                <div style={{fontSize:"10px",color:"rgba(255,255,255,0.3)"}}>🔒 Solo puedes actualizar stats de tu propio perfil. Ve a <a href="/registro" style={{color:"#40E0FF"}}>registro</a> si necesitas cambiar tus datos.</div>
              </div>
            );
          }
          return null;
        })()}
        {(!sessionStorage.getItem("aor_player_id") || String(player.id) === sessionStorage.getItem("aor_player_id")) && (
        <div style={{background:"rgba(255,215,0,0.05)",border:"1px solid rgba(255,215,0,0.15)",borderRadius:"8px",padding:"12px",marginBottom:"16px"}}>
          <div style={{fontSize:"11px",color:"#FFD700",marginBottom:"6px",fontWeight:"bold"}}>📊 Actualizar mis stats</div>
          <div style={{background:"rgba(255,255,255,0.04)",borderRadius:"6px",padding:"7px 10px",marginBottom:"8px",fontSize:"10px"}}>
            <div style={{color:"#A8FF78",marginBottom:"2px"}}>💀 Solo BP → <strong>+2 pts</strong></div>
            <div style={{color:"#A8FF78",marginBottom:"2px"}}>⚔ Solo Poder → <strong>+2 pts</strong></div>
            <div style={{color:"#FFD700",marginBottom:"2px"}}>💀 BP + ⚔ Poder juntos → <strong>+5 pts</strong> (bonus extra)</div>
            <div style={{color:"rgba(255,107,107,0.7)",fontSize:"9px"}}>⚠ Máx ±30% de variación respecto al valor actual</div>
          </div>
          <div style={{display:"flex",gap:"8px",marginBottom:"8px"}}>
            <div style={{flex:1}}>
              <div style={{fontSize:"9px",color:"rgba(255,255,255,0.4)",marginBottom:"3px"}}>💀 Battle Points (actual: {(player.bp||0).toLocaleString()})</div>
              <input value={newBp} onChange={e=>setNewBp(e.target.value)} placeholder={(player.bp||0).toString()} type="number"
                style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"6px",color:"#fff",padding:"8px 10px",fontSize:"12px",outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:"9px",color:"rgba(255,255,255,0.4)",marginBottom:"3px"}}>⚔ Poder (actual: {((player.level||0)/1000).toFixed(1)}k)</div>
              <input value={newLevel} onChange={e=>setNewLevel(e.target.value)} placeholder={(player.level||0).toString()} type="number"
                style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"6px",color:"#fff",padding:"8px 10px",fontSize:"12px",outline:"none",boxSizing:"border-box"}}/>
            </div>
          </div>
          <div style={{display:"flex",gap:"8px",marginTop:"4px"}}>
            <button onClick={saveStats} disabled={!newBp && !newLevel} style={{flex:1,padding:"8px",background:(newBp||newLevel)?"rgba(168,255,120,0.15)":"rgba(255,255,255,0.04)",border:"1px solid "+((newBp||newLevel)?"rgba(168,255,120,0.3)":"rgba(255,255,255,0.08)"),borderRadius:"6px",color:(newBp||newLevel)?"#A8FF78":"rgba(255,255,255,0.3)",fontSize:"11px",cursor:(newBp||newLevel)?"pointer":"default",fontWeight:"bold"}}>
              💾 Guardar{(newBp||newLevel)?" (+"+(newBp&&newLevel?5:2)+" pts)":""}
            </button>
            {(newBp||newLevel) && <button onClick={()=>{setNewBp("");setNewLevel("");}} style={{padding:"8px 12px",background:"rgba(255,107,107,0.1)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:"6px",color:"#FF6B6B",fontSize:"11px",cursor:"pointer"}}>✕</button>}
          </div>
          {statsMsg && <div style={{fontSize:"11px",color:statsMsg.includes("⚠")||statsMsg.includes("Error")?"#FF6B6B":"#A8FF78",marginTop:"6px",fontWeight:"bold"}}>{statsMsg}</div>}
        </div>
        )}

        {/* Current war breakdown */}
        <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"8px",padding:"14px",marginBottom:"16px"}}>
          <div style={{color:"#40E0FF",fontSize:"13px",marginBottom:"10px",fontFamily:"serif"}}>⚔ Guerra actual</div>
          {breakdown.length === 0
            ? <div style={{fontSize:"11px",color:"rgba(255,255,255,0.3)",textAlign:"center"}}>Sin actividad registrada esta guerra</div>
            : breakdown.map((item, i) => (
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 8px",marginBottom:"3px",background:item.val>=0?"rgba(168,255,120,0.05)":"rgba(255,107,107,0.05)",borderRadius:"4px",border:"1px solid "+(item.val>=0?"rgba(168,255,120,0.1)":"rgba(255,107,107,0.1)")}}>
                <span style={{fontSize:"11px",color:"rgba(255,255,255,0.6)"}}>{item.label}</span>
                <span style={{fontSize:"13px",color:item.val>=0?"#A8FF78":"#FF6B6B",fontWeight:"bold"}}>{item.val>0?"+":""}{item.val}</span>
              </div>
            ))
          }
        </div>

        {/* Stats evolution with revert */}
        {statsList.length > 0 && (
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"8px",padding:"14px",marginBottom:"16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
              <div style={{color:"#40E0FF",fontSize:"13px",fontFamily:"serif"}}>📈 Evolución de stats</div>
              {statsList.length >= 2 && (
                <button onClick={revertStats} style={{padding:"3px 10px",background:"rgba(255,107,107,0.1)",border:"1px solid rgba(255,107,107,0.25)",borderRadius:"6px",color:"#FF6B6B",fontSize:"10px",cursor:"pointer"}}>↩ Revertir</button>
              )}
            </div>
            {statsList.map((s, i) => (
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 8px",marginBottom:"3px",background:"rgba(255,255,255,0.02)",borderRadius:"4px",borderLeft:"2px solid "+(s.updated_by==="jugador"?"#A8FF78":"#40E0FF")}}>
                <div>
                  <span style={{fontSize:"11px",color:"rgba(255,255,255,0.6)"}}>💀 {(s.bp||0).toLocaleString()} BP · ⚔ {((s.level||0)/1000).toFixed(1)}k</span>
                  <span style={{fontSize:"9px",color:s.updated_by==="jugador"?"#A8FF78":"#40E0FF",marginLeft:"8px"}}>{s.updated_by==="jugador"?"por jugador":s.updated_by==="revert"?"↩ revertido":"por admin"}</span>
                </div>
                <span style={{fontSize:"10px",color:"rgba(255,255,255,0.3)"}}>{new Date(s.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* Publication history */}
        {msgLogs.length > 0 && (
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"8px",padding:"14px",marginBottom:"16px"}}>
            <div style={{color:"#C8A2FF",fontSize:"13px",marginBottom:"10px",fontFamily:"serif"}}>📡 Historial de propaganda publicada</div>
            {msgLogs.map((m,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"6px 8px",marginBottom:"3px",background:"rgba(200,162,255,0.04)",borderRadius:"4px",borderLeft:"2px solid rgba(200,162,255,0.3)"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:"11px",color:"rgba(255,255,255,0.7)",marginBottom:"2px"}}>{m.msg_title||"Mensaje"}</div>
                  <div style={{fontSize:"9px",color:"rgba(200,162,255,0.5)",fontFamily:"monospace"}}>PUBLICADO EN CHAT</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)"}}>{new Date(m.created_at).toLocaleDateString("es-MX")}</div>
                  <div style={{fontSize:"9px",color:"rgba(255,255,255,0.2)"}}>{new Date(m.created_at).toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"})}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* War history */}
        <div style={{color:"#FFD700",fontSize:"13px",marginBottom:"10px",fontFamily:"serif"}}>📅 Historial de guerras</div>
        {loading && <div style={{fontSize:"11px",color:"rgba(255,255,255,0.3)"}}>Cargando...</div>}
        {!loading && history.length === 0 && <div style={{fontSize:"11px",color:"rgba(255,255,255,0.3)"}}>Sin historial previo.</div>}
        {history.map((h, i) => (
          <div key={i} style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"8px",padding:"10px 14px",marginBottom:"6px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:"11px",color:"rgba(255,255,255,0.5)",marginBottom:"3px"}}>Semana {h.week}</div>
              <Pill color={AVAILABILITY[h.availability]?.color||"#888"}>{AVAILABILITY[h.availability]?.icon} {AVAILABILITY[h.availability]?.label||"—"}</Pill>
            </div>
            <span style={{fontSize:"18px",color:h.total<0?"#FF6B6B":"#FFD700",fontWeight:"bold"}}>{h.total>0?"+":""}{h.total}</span>
          </div>
        ))}
      <NalguitasFooter/>
      </div>
    </div>
  );
}

// ── Public Report ──────────────────────────────────────────────────────────
export default function PublicReport() {
  const [players, setPlayers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    supabase.from("players").select("*").eq("active", true).then(({ data }) => {
      if (data) {
        const rankOrder = p => {
          if (p.name === "PUNK'Z" || p.clan_role === "Líder") return 0;
          if (p.clan_role === "Co-Líder") return 1;
          if (p.clan_role === "Oficial")  return 2;
          const total = (p.pts_acumulados||0) + totalPts(p) + (p.pts_honorificos||0);
          if (total >= 1000) return 3;
          if (total >= 500)  return 4;
          if (total >= 100)  return 5;
          if (total >= 0)    return 6;
          return 7;
        };
        data.sort((a, b) => {
          const ra = rankOrder(a), rb = rankOrder(b);
          if (ra !== rb) return ra - rb;
          const totalA = (a.pts_acumulados||0) + totalPts(a) + (a.pts_honorificos||0);
          const totalB = (b.pts_acumulados||0) + totalPts(b) + (b.pts_honorificos||0);
          if (totalB !== totalA) return totalB - totalA;
          return (b.bp||0) - (a.bp||0);
        });
        setPlayers(data);
      }
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",display:"flex",alignItems:"center",justifyContent:"center",color:"#FFD700",fontFamily:"serif",fontSize:"18px"}}>
      Cargando ranking...
    </div>
  );

  if (selected) return <PlayerProfile player={selected} onBack={() => setSelected(null)} />;

  const waTotal   = players.filter(p => p.whatsapp).length;
  const waReg     = players.filter(p => p.whatsapp && p.registered_form).length;
  const totalReg  = players.filter(p => p.registered_form).length;

  function copyWeekly() {
    const waOnly = players.filter(p=>p.whatsapp);
    const sorted = [...waOnly].sort((a,b) => totalPts(b)-totalPts(a));
    let m = "*[AOR] Reporte Semanal — Grupo WA* ⚔\n\n";
    sorted.forEach((p, i) => {
      const pts = totalPts(p);
      const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":(i+1)+".";
      m += `${medal} *${p.name}* — ${pts>0?"+":""}${pts} pts\n`;
    });
    m += "\n📊 Ranking: https://aor-war-command.vercel.app/reporte";
    navigator.clipboard.writeText(m);
    alert("Copiado!");
  }

  function copyAccum() {
    const waOnly = players.filter(p=>p.whatsapp);
    const sorted = [...waOnly].sort((a,b) => (b.pts_acumulados||0)-(a.pts_acumulados||0));
    let m = "*[AOR] Ranking Acumulado — Grupo WA* 🏆\n_Sin bonificaciones de rango_\n\n";
    sorted.forEach((p, i) => {
      const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":(i+1)+".";
      m += `${medal} *${p.name}* — ${(p.pts_acumulados||0).toLocaleString()} pts\n`;
    });
    m += "\n📊 Ranking: https://aor-war-command.vercel.app/reporte";
    navigator.clipboard.writeText(m);
    alert("Copiado!");
  }

  return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",padding:"20px",fontFamily:"Georgia,serif",color:"#d4c9a8"}}>
      <div style={{maxWidth:"600px",margin:"0 auto"}}>

        <NavBar current="/reporte"/>
        {/* Header */}
        <div style={{textAlign:"center",marginBottom:"20px"}}>
          <PageHeader page="/reporte"/>
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.3)",marginTop:"-16px",marginBottom:"12px",textAlign:"center"}}>Toca un nombre para ver perfil ↓</div>
          <div style={{display:"flex",gap:"8px",justifyContent:"center",marginTop:"10px",flexWrap:"wrap"}}>
            <span style={{fontSize:"10px",color:"#25D366",background:"rgba(37,211,102,0.08)",border:"1px solid rgba(37,211,102,0.2)",borderRadius:"12px",padding:"3px 10px"}}>📱 WA: {waReg}/{waTotal} reg.</span>
            <span style={{fontSize:"10px",color:"#FFD700",background:"rgba(255,215,0,0.08)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:"12px",padding:"3px 10px"}}>📋 {totalReg}/{players.length} registrados</span>
          </div>


        </div>

        {/* Ranks table */}
        <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,215,0,0.15)",borderRadius:"8px",padding:"12px",marginBottom:"16px"}}>
          <div style={{fontFamily:"serif",color:"#FFD700",fontSize:"12px",marginBottom:"8px"}}>⚜️ Sistema de Rangos [AOR]</div>
          {RANKS.map(rank => (
            <div key={rank.label} style={{display:"flex",justifyContent:"space-between",padding:"4px 6px",marginBottom:"2px",borderRadius:"4px",background:rank.color+"08"}}>
              <div>
                <span style={{fontSize:"11px",color:rank.color,fontWeight:"bold"}}>{rank.label}</span>
                <span style={{fontSize:"10px",color:"rgba(255,255,255,0.3)",marginLeft:"8px"}}>{rank.desc}</span>
              </div>
              <span style={{fontSize:"10px",color:rank.color}}>{rank.min>=0?rank.min.toLocaleString()+"+ pts":"< 0 pts"}</span>
            </div>
          ))}
        </div>

        {/* Players list */}
        {players.map((p, i) => {
          const pts     = totalPts(p);
          const acc     = p.pts_acumulados || 0;
          const hon     = p.pts_honorificos || 0;
          const combined = acc + pts + hon;
          const rank    = getRank(acc, hon, p.name, p.clan_role);
          const avail   = AVAILABILITY[p.availability] || AVAILABILITY.pendiente;
          return (
            <div key={p.id} onClick={() => setSelected(p)} style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.08)",borderLeft:"3px solid "+rank.color,borderRadius:"8px",padding:"10px 14px",marginBottom:"6px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
              <div style={{display:"flex",gap:"10px",alignItems:"center"}}>
                <span style={{fontSize:"14px",color:i<3?"#FFD700":"rgba(255,255,255,0.4)",minWidth:"24px"}}>
                  {i===0?"🥇":i===1?"🥈":i===2?"🥉":(i+1)+"."}
                </span>
                <div>
                  <div style={{fontSize:"13px",color:"#40E0FF",textDecoration:"underline",marginBottom:"3px",display:"flex",alignItems:"center",gap:"5px"}}>
                    {p.name} <span style={{fontSize:"12px"}}>{p.whatsapp?"📱":"📵"}</span>
                  </div>
                  <div style={{display:"flex",gap:"4px",flexWrap:"wrap",marginBottom:"2px"}}>
                    <Pill color={rank.color}>{rank.label}</Pill>
                    {p.availability && p.availability !== "pendiente" && <Pill color={avail.color}>{avail.icon} {avail.label}</Pill>}
                    {hon > 0 && <Pill color="#FFD700">⭐ {hon.toLocaleString()}</Pill>}
                    {(p.pt_whatsapp||0) > 0 && <Pill color="#25D366">📱 +{p.pt_whatsapp}</Pill>}
                  </div>
                  <div style={{display:"flex",gap:"8px",fontSize:"10px",color:"rgba(255,255,255,0.35)"}}>
                    <span>⚔ {((p.level||0)/1000).toFixed(1)}k</span>
                    <span>💀 {(p.bp||0).toLocaleString()}</span>
                    {p.timezone==="mexico" && <span>🇲🇽</span>}
                    {p.timezone==="espana" && <span>🇪🇸</span>}
                    {p.timezone==="otra"   && <span>🌍</span>}
                  </div>
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:"16px",color:combined>=0?rank.color:"#FF6B6B",fontWeight:"bold"}}>{combined.toLocaleString()}</div>
                <div style={{fontSize:"10px",color:"rgba(255,255,255,0.3)"}}>{acc} acum + {pts} sem</div>
                {hon > 0 && <div style={{fontSize:"9px",color:"rgba(255,215,0,0.4)"}}>+{hon.toLocaleString()} cargo</div>}
              </div>
            </div>
          );
        })}

        {/* Graphic */}
        {players.length > 0 && (
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"8px",padding:"14px",marginTop:"16px"}}>
            <div style={{fontFamily:"serif",color:"#FFD700",fontSize:"13px",marginBottom:"12px"}}>📊 Gráfico de desempeño (top 10)</div>
            {[...players].sort((a,b)=>totalPts(b)-totalPts(a)).slice(0,10).map((p, i) => {
              const pts = totalPts(p);
              const acc = p.pts_acumulados || 0;
              const maxPts = Math.max(1, ...players.slice(0,10).map(x => Math.abs(totalPts(x))));
              const maxAcc = Math.max(1, ...players.map(x => x.pts_acumulados||0));
              const ptsW = Math.max(0, (pts / maxPts) * 100);
              const accW = Math.max(0, (acc / maxAcc) * 100);
              return (
                <div key={p.id} style={{marginBottom:"8px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:"10px",color:"rgba(255,255,255,0.6)",marginBottom:"3px"}}>
                    <span>{i+1}. {p.name}</span>
                    <span style={{color:"#FFD700"}}>{pts>0?"+":""}{pts} · {acc.toLocaleString()} acum</span>
                  </div>
                  <div style={{height:"5px",background:"rgba(255,255,255,0.06)",borderRadius:"3px",overflow:"hidden",marginBottom:"2px"}}>
                    <div style={{height:"100%",width:ptsW+"%",background:"#40E0FF",borderRadius:"3px"}}/>
                  </div>
                  <div style={{height:"5px",background:"rgba(255,255,255,0.06)",borderRadius:"3px",overflow:"hidden"}}>
                    <div style={{height:"100%",width:accW+"%",background:"#FFD700",borderRadius:"3px"}}/>
                  </div>
                </div>
              );
            })}
            <div style={{display:"flex",gap:"16px",marginTop:"8px",fontSize:"10px"}}>
              <span style={{color:"#40E0FF"}}>━ Puntos semanales</span>
              <span style={{color:"#FFD700"}}>━ Puntos acumulados</span>
            </div>
          </div>
        )}

      <NalguitasFooter/>
      </div>
    </div>
  );
}

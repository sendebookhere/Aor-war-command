import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const ROLES = {
  Lancero:  { color: "#FF6B6B", icon: "⚔️",  desc: "Ataque y captura" },
  Guerrero: { color: "#FFD700", icon: "🛡️",  desc: "Apoyo y defensa"  },
  Guardian: { color: "#40E0FF", icon: "🏰",  desc: "Defensa castillos"},
  Espia:    { color: "#A8FF78", icon: "👁️",  desc: "Inteligencia"     },
  Sin_Rol:  { color: "#666666", icon: "❓",  desc: "Sin asignar"      },
};

const AVAILABILITY = {
  siempre:      { label: "Siempre listo",  color: "#A8FF78", icon: "🟢", suggestedRole: "Lancero",  pts: 3 },
  intermitente: { label: "Intermitente",   color: "#FFD700", icon: "🟡", suggestedRole: "Guardian", pts: 2 },
  solo_una:     { label: "Solo una vez",   color: "#FF9F43", icon: "🟠", suggestedRole: "Espia",    pts: 1 },
  no_participa: { label: "No participa",   color: "#FF6B6B", icon: "🔴", suggestedRole: null,       pts: 0 },
  pendiente:    { label: "Sin responder",  color: "#888888", icon: "⚪", suggestedRole: null,       pts: 0 },
};

const HOURS_MX = ["No sé","00:00","01:00","02:00","03:00","04:00","05:00","06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00"];

function mxToMadrid(h) {
  if (h === "No sé") return "—";
  const hh = parseInt(h);
  return String((hh + 7) % 24).padStart(2,"0") + ":00";
}

// Points system
const POINTS_SYSTEM = {
  positive: [
    { key:"disponibilidad",  label:"Confirmó y apareció",           pts: 3  },
    { key:"obediencia",      label:"Siguió órdenes asignadas",      pts: 2  },
    { key:"batalla_ganada",  label:"Batalla ganada",                pts: 2, unlimited: true },
    { key:"batalla_perdida", label:"Batalla declarada y perdida",   pts: 1, unlimited: true },
    { key:"defensa",         label:"Defensa de castillo",           pts: 1, unlimited: true },
    { key:"bonus_completo",  label:"Cumplió todos los parámetros",  pts: 5  },
  ],
  negative: [
    { key:"no_aparecio",     label:"Confirmó pero no apareció",     pts: -3 },
    { key:"ignoro_orden",    label:"Ignoró orden directa",          pts: -2 },
    { key:"abandono",        label:"Abandonó defensa sin avisar",   pts: -2 },
    { key:"inactivo_4h",     label:"Inactivo +4h sin justificación",pts: -3 },
  ],
};

const RANKS = [
  { label:"Élite ★★★",   color:"#FFD700", min: 30  },
  { label:"Veterano ★★", color:"#40E0FF", min: 18  },
  { label:"Soldado ★",   color:"#A8FF78", min: 8   },
  { label:"Recluta",     color:"#888888", min: 1   },
  { label:"⚠ Vigilado",  color:"#FF6B6B", min: -99 },
];

function getRank(pts) {
  return RANKS.find(r => pts >= r.min) || RANKS[RANKS.length-1];
}

function totalPts(p) {
  return (p.pt_disponibilidad||0) + (p.pt_obediencia||0)
       + (p.pt_batallas_ganadas||0)*2 + (p.pt_batallas_perdidas||0)
       + (p.pt_defensas||0) + (p.pt_bonus||0)
       + (p.pt_no_aparecio||0)*-3 + (p.pt_ignoro_orden||0)*-2
       + (p.pt_abandono||0)*-2 + (p.pt_inactivo_4h||0)*-3;
}

function Pill({ color, children }) {
  return <span style={{ fontSize:"9px", padding:"1px 6px", borderRadius:"10px", background:color+"22", color, border:"1px solid "+color+"44" }}>{children}</span>;
}

function FlagBar({ count }) {
  return (
    <div style={{ display:"flex", gap:"2px", alignItems:"center" }}>
      {Array.from({length:10}).map((_,i)=>(
        <div key={i} style={{ width:"7px", height:"10px", background: i<count?"#FFD700":"rgba(255,215,0,0.12)", borderRadius:"1px" }}/>
      ))}
      <span style={{ fontSize:"9px", color:"rgba(255,255,255,0.3)", marginLeft:"3px" }}>{count}/10</span>
    </div>
  );
}

function PlayerCard({ player, onUpdate }) {
  const role  = ROLES[player.role] || ROLES.Sin_Rol;
  const avail = AVAILABILITY[player.availability] || AVAILABILITY.pendiente;
  const pts   = totalPts(player);
  const rank  = getRank(pts);
  const statusColors = { disponible:"#40E0FF", atacando:"#FF6B6B", defendiendo:"#FFD700", espiando:"#A8FF78", curando:"#FF9F43" };
  const sc = statusColors[player.status] || "#40E0FF";
  return (
    <div style={{ background:player.active?"rgba(255,255,255,0.03)":"rgba(255,80,80,0.03)", border:"1px solid "+(player.active?role.color+"22":"#FF6B6B33"), borderLeft:"3px solid "+avail.color, borderRadius:"8px", padding:"10px 12px", marginBottom:"6px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"4px", flexWrap:"wrap" }}>
        <span style={{ fontFamily:"serif", fontSize:"13px", color:player.active?"#fff":"rgba(255,255,255,0.35)" }}>{player.name}</span>
        <Pill color="rgba(200,200,200,0.4)">{player.clan_role}</Pill>
        {!player.active && <Pill color="#FF6B6B">INACTIVO</Pill>}
        <Pill color={rank.color}>{rank.label} · {pts}pts</Pill>
      </div>
      <div style={{ display:"flex", gap:"8px", alignItems:"center", marginBottom:"6px", flexWrap:"wrap" }}>
        <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.4)" }}>{(player.level/1000).toFixed(1)}k</span>
        <span style={{ fontSize:"11px", color:"#FF6B6B" }}>💀 {(player.bp||0).toLocaleString()}</span>
        <Pill color={avail.color}>{avail.icon} {avail.label}</Pill>
        {player.hour_mx !== "No sé" && <span style={{ fontSize:"10px", color:"rgba(255,255,255,0.4)" }}>MX:{player.hour_mx} ES:{mxToMadrid(player.hour_mx)}</span>}
      </div>
      <div style={{ display:"flex", gap:"6px", alignItems:"center", marginBottom:"6px", flexWrap:"wrap" }}>
        <select value={player.role} onChange={e=>onUpdate(player.id,{role:e.target.value})} style={{ background:role.color+"18", border:"1px solid "+role.color+"44", borderRadius:"4px", color:role.color, fontSize:"11px", padding:"2px 5px", cursor:"pointer" }}>
          {Object.keys(ROLES).map(r=><option key={r} value={r} style={{background:"#1a1a1f",color:ROLES[r].color}}>{r.replace("_"," ")}</option>)}
        </select>
        <select value={player.status} onChange={e=>onUpdate(player.id,{status:e.target.value})} style={{ background:sc+"18", border:"1px solid "+sc+"44", borderRadius:"4px", color:sc, fontSize:"11px", padding:"2px 5px", cursor:"pointer" }}>
          {Object.keys(statusColors).map(s=><option key={s} value={s} style={{background:"#1a1a1f"}}>{s}</option>)}
        </select>
      </div>
      <FlagBar count={player.flags||10}/>
    </div>
  );
}

function RegistrationPanel({ players, onUpdate }) {
  const pending = players.filter(p=>p.availability==="pendiente"&&p.active).length;
  return (
    <div>
      <div style={{ background:"rgba(255,215,0,0.05)", border:"1px solid rgba(255,215,0,0.15)", borderRadius:"8px", padding:"10px 12px", marginBottom:"14px", fontSize:"11px", color:"rgba(255,255,255,0.6)" }}>
        ⚡ <strong style={{color:"#FFD700"}}>{pending} jugadores</strong> sin confirmar participación.
      </div>
      {players.filter(p=>p.active).sort((a,b)=>b.bp-a.bp).map(p=>{
        const avail = AVAILABILITY[p.availability]||AVAILABILITY.pendiente;
        return (
          <div key={p.id} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid "+avail.color+"33", borderLeft:"3px solid "+avail.color, borderRadius:"8px", padding:"10px 12px", marginBottom:"6px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", gap:"6px", alignItems:"center", marginBottom:"6px" }}>
                  <span style={{ fontFamily:"serif", fontSize:"13px", color:"#fff" }}>{p.name}</span>
                  <span style={{ fontSize:"10px", color:"#FF6B6B" }}>💀 {(p.bp||0).toLocaleString()}</span>
                  <span style={{ fontSize:"10px", color:"rgba(255,255,255,0.3)" }}>{(p.level/1000).toFixed(1)}k</span>
                </div>
                <div style={{ display:"flex", gap:"4px", flexWrap:"wrap", marginBottom:"6px" }}>
                  {Object.entries(AVAILABILITY).map(([key,av])=>(
                    <button key={key} onClick={()=>onUpdate(p.id,{ availability:key, role: av.suggestedRole||p.role, pt_disponibilidad: key==="siempre"||key==="intermitente"||key==="solo_una" ? 0 : 0 })} style={{ padding:"3px 8px", borderRadius:"4px", fontSize:"10px", cursor:"pointer", background: p.availability===key ? av.color+"33":"rgba(255,255,255,0.04)", border:"1px solid "+(p.availability===key ? av.color:"rgba(255,255,255,0.08)"), color: p.availability===key ? av.color:"rgba(255,255,255,0.35)" }}>{av.icon} {av.label}</button>
                  ))}
                </div>
                {p.availability!=="pendiente" && p.availability!=="no_participa" && (
                  <div style={{ display:"flex", gap:"8px", alignItems:"center", flexWrap:"wrap" }}>
                    <span style={{ fontSize:"10px", color:"rgba(255,255,255,0.4)" }}>🇲🇽 Hora:</span>
                    <select value={p.hour_mx} onChange={e=>onUpdate(p.id,{hour_mx:e.target.value})} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"4px", color:"#fff", fontSize:"11px", padding:"2px 5px", cursor:"pointer" }}>
                      {HOURS_MX.map(h=><option key={h} value={h} style={{background:"#1a1a1f"}}>{h}</option>)}
                    </select>
                    {p.hour_mx!=="No sé" && <span style={{ fontSize:"10px", color:"rgba(255,255,255,0.4)" }}>ES: {mxToMadrid(p.hour_mx)}</span>}
                  </div>
                )}
              </div>
              {p.availability!=="pendiente" && p.availability!=="no_participa" && (
                <div style={{ textAlign:"right", marginLeft:"10px" }}>
                  <div style={{ fontSize:"9px", color:"rgba(255,255,255,0.3)", marginBottom:"3px" }}>Rol sugerido</div>
                  <Pill color={ROLES[p.role]?.color||"#888"}>{p.role?.replace("_"," ")}</Pill>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PointsPanel({ players, onUpdate }) {
  return (
    <div>
      {/* Legend */}
      <div style={{ marginBottom:"14px" }}>
        <div style={{ fontSize:"11px", color:"#A8FF78", marginBottom:"6px", fontWeight:"bold" }}>✅ Suma de puntos</div>
        <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"10px" }}>
          {POINTS_SYSTEM.positive.map(p=>(
            <div key={p.key} style={{ background:"rgba(168,255,120,0.08)", border:"1px solid rgba(168,255,120,0.2)", borderRadius:"6px", padding:"4px 8px", fontSize:"10px", color:"#A8FF78" }}>
              {p.label} <strong>+{p.pts}{p.unlimited?" (x)":""}</strong>
            </div>
          ))}
        </div>
        <div style={{ fontSize:"11px", color:"#FF6B6B", marginBottom:"6px", fontWeight:"bold" }}>❌ Penalizaciones</div>
        <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"14px" }}>
          {POINTS_SYSTEM.negative.map(p=>(
            <div key={p.key} style={{ background:"rgba(255,107,107,0.08)", border:"1px solid rgba(255,107,107,0.2)", borderRadius:"6px", padding:"4px 8px", fontSize:"10px", color:"#FF6B6B" }}>
              {p.label} <strong>{p.pts}</strong>
            </div>
          ))}
        </div>
        <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.4)", background:"rgba(255,215,0,0.05)", border:"1px solid rgba(255,215,0,0.15)", borderRadius:"6px", padding:"8px 10px" }}>
          📅 Mínimo mensual: <strong style={{color:"#FFD700"}}>20 puntos</strong> · Bajo 20 dos meses seguidos → expulsión · Puntos negativos → expulsión inmediata
        </div>
      </div>

      {/* Leaderboard */}
      {players.filter(p=>p.active).sort((a,b)=>totalPts(b)-totalPts(a)).map((p,i)=>{
        const pts  = totalPts(p);
        const rank = getRank(pts);
        return (
          <div key={p.id} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"8px", padding:"10px 12px", marginBottom:"6px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
              <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                <span style={{ fontSize:"13px", color:i<3?"#FFD700":"rgba(255,255,255,0.7)" }}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":(i+1)+"."} {p.name}</span>
                <Pill color={rank.color}>{rank.label}</Pill>
              </div>
              <span style={{ fontSize:"20px", color: pts<0?"#FF6B6B":"#FFD700", fontWeight:"bold" }}>{pts}</span>
            </div>

            {/* Positive counters */}
            <div style={{ marginBottom:"8px" }}>
              <div style={{ fontSize:"9px", color:"#A8FF78", marginBottom:"4px" }}>SUMA</div>
              <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                {[
                  { label:"✅ Apareció",    key:"pt_disponibilidad",  max:1, color:"#A8FF78", pts:3  },
                  { label:"📋 Órdenes",     key:"pt_obediencia",      max:1, color:"#FFD700", pts:2  },
                  { label:"⚔️ B.Ganadas",   key:"pt_batallas_ganadas",max:9, color:"#40E0FF", pts:2  },
                  { label:"🛡 B.Perdidas",  key:"pt_batallas_perdidas",max:9,color:"#A8FF78", pts:1  },
                  { label:"🏰 Defensas",    key:"pt_defensas",        max:9, color:"#40E0FF", pts:1  },
                  { label:"🌟 Bonus x5",    key:"pt_bonus",           max:1, color:"#FFD700", pts:5  },
                ].map(cat=>(
                  <div key={cat.key} style={{ display:"flex", flexDirection:"column", gap:"2px", alignItems:"center" }}>
                    <span style={{ fontSize:"8px", color:"rgba(255,255,255,0.3)" }}>{cat.label} +{cat.pts}</span>
                    <div style={{ display:"flex", gap:"2px" }}>
                      {Array.from({length:Math.min(cat.max+1, cat.max<=1?2:6)}).map((_,v)=>(
                        <button key={v} onClick={()=>onUpdate(p.id,{[cat.key]:v})} style={{ width:"22px", height:"22px", borderRadius:"4px", fontSize:"10px", cursor:"pointer", background: p[cat.key]===v ? cat.color+"44":"rgba(255,255,255,0.04)", border:"1px solid "+(p[cat.key]===v ? cat.color:"rgba(255,255,255,0.08)"), color: p[cat.key]===v ? cat.color:"rgba(255,255,255,0.3)" }}>{v}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Negative counters */}
            <div>
              <div style={{ fontSize:"9px", color:"#FF6B6B", marginBottom:"4px" }}>PENALIZACIONES</div>
              <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                {[
                  { label:"No apareció -3",   key:"pt_no_aparecio",  color:"#FF6B6B" },
                  { label:"Ignoró orden -2",  key:"pt_ignoro_orden", color:"#FF9F43" },
                  { label:"Abandonó -2",      key:"pt_abandono",     color:"#FF9F43" },
                  { label:"Inactivo 4h -3",   key:"pt_inactivo_4h",  color:"#FF6B6B" },
                ].map(cat=>(
                  <div key={cat.key} style={{ display:"flex", flexDirection:"column", gap:"2px", alignItems:"center" }}>
                    <span style={{ fontSize:"8px", color:"rgba(255,255,255,0.3)" }}>{cat.label}</span>
                    <div style={{ display:"flex", gap:"2px" }}>
                      {[0,1,2,3].map(v=>(
                        <button key={v} onClick={()=>onUpdate(p.id,{[cat.key]:v})} style={{ width:"22px", height:"22px", borderRadius:"4px", fontSize:"10px", cursor:"pointer", background: p[cat.key]===v ? cat.color+"44":"rgba(255,255,255,0.04)", border:"1px solid "+(p[cat.key]===v ? cat.color:"rgba(255,255,255,0.08)"), color: p[cat.key]===v ? cat.color:"rgba(255,255,255,0.3)" }}>{v}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const [players, setPlayers]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [activeTab, setActiveTab] = useState("registro");
  const [phase, setPhase]         = useState(0);
  const [warActive, setWarActive] = useState(true);

  useEffect(() => { loadPlayers(); }, []);

  async function loadPlayers() {
    setLoading(true);
    const { data, error } = await supabase.from("players").select("*").order("bp", { ascending: false });
    if (!error && data) setPlayers(data);
    setLoading(false);
  }

  async function update(id, changes) {
    setSaving(true);
    await supabase.from("players").update(changes).eq("id", id);
    setPlayers(prev => prev.map(p => p.id === id ? {...p, ...changes} : p));
    setSaving(false);
  }

  const WAR_PHASES = ["Fase 1: Captura (0-6h)", "Fase 2: Defensa (6-24h)", "Fase 3: Ataque (24h+)"];
  const confirmed  = players.filter(p=>p.active&&p.availability!=="pendiente"&&p.availability!=="no_participa");
  const pending    = players.filter(p=>p.active&&p.availability==="pendiente");
  const notPlaying = players.filter(p=>p.active&&p.availability==="no_participa");
  const inactive   = players.filter(p=>!p.active);
  const tabs = [{id:"registro",label:"📋 Registro"},{id:"roster",label:"⚔ Roster"},{id:"castles",label:"🏰 Castillos"},{id:"puntos",label:"🏆 Puntos"}];

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#0d0d0f", display:"flex", alignItems:"center", justifyContent:"center", color:"#FFD700", fontFamily:"serif", fontSize:"18px" }}>
      Cargando [AOR]...
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#0d0d0f", fontFamily:"Georgia,serif", color:"#d4c9a8" }}>
      <div style={{ background:"rgba(255,255,255,0.02)", borderBottom:"1px solid rgba(255,215,0,0.15)", padding:"12px 16px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
          <div>
            <div style={{ fontSize:"9px", color:"#40E0FF", letterSpacing:"0.3em" }}>ANTIGUA ORDEN</div>
            <div style={{ fontFamily:"serif", fontSize:"18px", color:"#FFD700" }}>[AOR] War Command</div>
          </div>
          <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
            {saving && <span style={{ fontSize:"10px", color:"#40E0FF" }}>💾</span>}
            <div onClick={()=>setWarActive(!warActive)} style={{ display:"flex", alignItems:"center", gap:"5px", padding:"4px 10px", borderRadius:"20px", cursor:"pointer", background:warActive?"rgba(64,224,255,0.1)":"rgba(255,107,107,0.1)", border:"1px solid "+(warActive?"#40E0FF44":"#FF6B6B44"), fontSize:"10px", color:warActive?"#40E0FF":"#FF6B6B" }}>
              {warActive?"⚔ ACTIVA":"✕ SIN GUERRA"}
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
          {[{label:"Miembros",value:players.filter(p=>p.active).length+"/36",color:"#fff"},{label:"Confirmados",value:confirmed.length,color:"#A8FF78"},{label:"Pendientes",value:pending.length,color:"#FFD700"},{label:"No juegan",value:notPlaying.length,color:"#FF9F43"},{label:"Inactivos",value:inactive.length,color:"#888"}].map(s=>(
            <div key={s.label} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"6px", padding:"4px 10px", textAlign:"center" }}>
              <div style={{ fontSize:"14px", color:s.color }}>{s.value}</div>
              <div style={{ fontSize:"8px", color:"rgba(255,255,255,0.3)", textTransform:"uppercase" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {warActive && (
        <div style={{ padding:"6px 16px", borderBottom:"1px solid rgba(255,215,0,0.08)", display:"flex", gap:"5px", alignItems:"center", overflowX:"auto" }}>
          <span style={{ fontSize:"9px", color:"rgba(255,255,255,0.3)", whiteSpace:"nowrap" }}>FASE:</span>
          {WAR_PHASES.map((ph,i)=>(
            <button key={i} onClick={()=>setPhase(i)} style={{ padding:"3px 8px", borderRadius:"4px", fontSize:"9px", whiteSpace:"nowrap", background:phase===i?"rgba(255,215,0,0.15)":"transparent", border:"1px solid "+(phase===i?"#FFD700":"rgba(255,255,255,0.1)"), color:phase===i?"#FFD700":"rgba(255,255,255,0.35)", cursor:"pointer" }}>{ph}</button>
          ))}
        </div>
      )}

      <div style={{ display:"flex", borderBottom:"1px solid rgba(255,255,255,0.07)", padding:"0 16px", overflowX:"auto" }}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{ padding:"10px 12px", background:"transparent", border:"none", whiteSpace:"nowrap", borderBottom:"2px solid "+(activeTab===t.id?"#40E0FF":"transparent"), color:activeTab===t.id?"#40E0FF":"rgba(255,255,255,0.4)", cursor:"pointer", fontSize:"11px" }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding:"14px 16px" }}>
        {activeTab==="registro" && <RegistrationPanel players={players} onUpdate={update}/>}

        {activeTab==="roster" && (
          <div>
            {Object.keys(ROLES).map(role=>{
              const rp = players.filter(p=>p.role===role&&p.active).sort((a,b)=>b.bp-a.bp);
              if (!rp.length) return null;
              return (
                <div key={role} style={{ marginBottom:"18px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"8px", paddingBottom:"4px", borderBottom:"1px solid "+ROLES[role].color+"22" }}>
                    <span style={{ color:ROLES[role].color, fontSize:"12px" }}>{ROLES[role].icon} {role.replace("_"," ")} — {rp.length}</span>
                    <span style={{ fontSize:"9px", color:"rgba(255,255,255,0.3)" }}>{ROLES[role].desc}</span>
                  </div>
                  {rp.map(p=><PlayerCard key={p.id} player={p} onUpdate={update}/>)}
                </div>
              );
            })}
          </div>
        )}

        {activeTab==="castles" && (
          <div>
            <div style={{ background:"rgba(255,215,0,0.05)", border:"1px solid rgba(255,215,0,0.15)", borderRadius:"8px", padding:"10px 12px", marginBottom:"14px", fontSize:"11px", color:"rgba(255,255,255,0.6)" }}>
              🗺 <strong style={{color:"#FFD700"}}>Fase:</strong> {WAR_PHASES[phase]}
            </div>
            {Object.entries(AVAILABILITY).filter(([k])=>k!=="pendiente"&&k!=="no_participa").map(([key,av])=>{
              const group = confirmed.filter(p=>p.availability===key).sort((a,b)=>b.bp-a.bp);
              if (!group.length) return null;
              return (
                <div key={key} style={{ marginBottom:"14px" }}>
                  <div style={{ fontSize:"11px", color:av.color, marginBottom:"5px" }}>{av.icon} {av.label} — {group.length}</div>
                  {group.map(p=>(
                    <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 10px", marginBottom:"3px", background:av.color+"08", border:"1px solid "+av.color+"22", borderRadius:"6px" }}>
                      <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                        <span style={{ fontSize:"12px", color:"#fff" }}>{p.name}</span>
                        <span style={{ fontSize:"10px", color:"#FF6B6B" }}>💀 {(p.bp||0).toLocaleString()}</span>
                        <Pill color={ROLES[p.role]?.color||"#888"}>{p.role?.replace("_"," ")}</Pill>
                      </div>
                      {p.hour_mx!=="No sé" && <span style={{ fontSize:"9px", color:"rgba(255,255,255,0.4)" }}>MX:{p.hour_mx} ES:{mxToMadrid(p.hour_mx)}</span>}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {activeTab==="puntos" && <PointsPanel players={players} onUpdate={update}/>}
      </div>
    </div>
  );
}

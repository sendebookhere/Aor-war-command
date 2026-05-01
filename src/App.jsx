import NavBar from "./NavBar";
import PageHeader from "./PageHeader";
import NalguitasFooter from "./NalguitasFooter";
import Comunicaciones from "./Comunicaciones";
import Inteligencia from "./Inteligencia";
import Asamblea from "./Asamblea";
import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import PublicReport from "./Report";
import Puntos from "./Puntos";


// ── Constants ──────────────────────────────────────────────────────────────
const ROLES = {
  Lancero:  { color: "#FF6B6B", icon: "⚔",  desc: "Ataque y captura" },
  Guerrero: { color: "#FFD700", icon: "🛡",  desc: "Apoyo y defensa"  },
  Guardian: { color: "#40E0FF", icon: "🏰",  desc: "Defensa castillos"},
  Espia:    { color: "#A8FF78", icon: "👁",  desc: "Inteligencia"     },
  Sin_Rol:  { color: "#666666", icon: "❓",  desc: "Sin asignar"      },
};

const AVAILABILITY = {
  siempre:      { label:"Conquistador",   sub:"Siempre listo", color:"#A8FF78", icon:"🟢", pts:10, penalty:15 },
  intermitente: { label:"Refuerzos",      sub:"Intermitente",  color:"#FFD700", icon:"🟡", pts:5,  penalty:10 },
  solo_una:     { label:"Reserva",        sub:"Solo una vez",  color:"#FF9F43", icon:"🟠", pts:2,  penalty:5  },
  no_disponible:{ label:"No disponible",  color:"#FF6B6B", icon:"🔴", pts:1,  penalty:0  },
  pendiente:    { label:"Sin responder",  color:"#888888", icon:"⚪", pts:0,  penalty:0  },
};

const TASKS = {
  siempre: {
    period1: ["Atacar castillos", "Defender castillos"],
    period2: ["Atacar ciudad enemiga", "Defender castillos"],
  },
  intermitente: {
    period1: ["Atacar castillos", "Defender castillos"],
    period2: ["Atacar ciudad enemiga", "Defender castillos"],
    note: "Debe cumplir al menos una actividad por periodo"
  },
  solo_una: {
    period1: ["Defender ciudad (80k+)", "Defender castillos conquistados", "Espía ciudad enemiga"],
    period2: [],
  },
  no_disponible: { period1: [], period2: [] },
};

const TIMEZONES = {
  mexico: { label:"México",  offset:-6, flag:"🇲🇽" },
  espana: { label:"España",  offset:2,  flag:"🇪🇸" },
  otra:   { label:"Otra",    offset:0,  flag:"🌍"  },
};

const HOURS = ["No sé","00:00","01:00","02:00","03:00","04:00","05:00","06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00"];

function convertTime(hour, fromTz, toTz) {
  if (hour === "No sé") return "—";
  const from = TIMEZONES[fromTz]?.offset || 0;
  const to   = TIMEZONES[toTz]?.offset   || 0;
  const hh   = parseInt(hour);
  const converted = ((hh - from + to) + 24) % 24;
  return String(converted).padStart(2,"0") + ":00";
}

function getTasksForPlayer(availability, level) {
  if (availability === "solo_una") {
    if (level >= 80000) return { period1: ["Defender ciudad propia", "Defender castillos conquistados", "Espía ciudad enemiga"], period2: [] };
    if (level >= 60000) return { period1: ["Defender castillos conquistados", "Espía ciudad enemiga"], period2: [] };
    return { period1: ["Defender castillos conquistados", "Espía ciudad enemiga"], period2: [] };
  }
  return TASKS[availability] || { period1: [], period2: [] };
}

function totalPts(p) {
  const sb=(p.pt_batallas_ganadas||0)>=6?10:0;
  return (p.pt_registro||0)
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
       - (p.pt_penalizacion||0)
       - (p.pt_no_aparecio||0)
       - (p.pt_ignoro_orden||0)*2
       - (p.pt_abandono||0)*2
       - (p.pt_inactivo_4h||0)*3
       - (p.pt_bandido_pre||0)
       + sb;
}

function acumulado(p) { return p.pts_acumulados||0; }

const RANKS = [
  { label:"Co-Líder 👑",   color:"#FFD700", min:25000 },
  { label:"Oficial ⚜",    color:"#40E0FF", min:5000  },
  { label:"Veterano ★★★",  color:"#A8FF78", min:1000  },
  { label:"Guerrero ★★",   color:"#FFD700", min:500   },
  { label:"Soldado ★",     color:"#FF9F43", min:100   },
  { label:"Recluta",       color:"#888888", min:0     },
  { label:"⚠ Vigilado",   color:"#FF6B6B", min:-999  },
];
function getRank(pts) { if(pts<0) return RANKS[RANKS.length-1]; return RANKS.find(r=>pts>=r.min)||RANKS[RANKS.length-2]; }

function Pill({color,children}) {
  return <span style={{fontSize:"9px",padding:"1px 6px",borderRadius:"10px",background:color+"22",color,border:"1px solid "+color+"44"}}>{children}</span>;
}


function Stepper({value, onChange, color="#FFD700"}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:"3px"}}>
      <button onClick={()=>onChange(Math.max(0,value-1))} style={{width:"22px",height:"22px",borderRadius:"4px",fontSize:"14px",cursor:"pointer",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.15)",color:"rgba(255,255,255,0.6)",lineHeight:1,padding:0}}>−</button>
      <span style={{fontSize:"14px",color,minWidth:"22px",textAlign:"center",fontWeight:"bold"}}>{value}</span>
      <button onClick={()=>onChange(value+1)} style={{width:"22px",height:"22px",borderRadius:"4px",fontSize:"14px",cursor:"pointer",background:color+"22",border:"1px solid "+color+"44",color,lineHeight:1,padding:0}}>+</button>
    </div>
  );
}

function computedFlags(p) {
  const battles  = (p.pt_batallas_ganadas||0) + (p.pt_batallas_perdidas||0);
  const defenses = Math.ceil((p.pt_defensas||0)/2);
  const bandido  = (p.pt_bandido_post||0) + (p.pt_bandido_pre||0);
  return Math.max(0, 10 - (battles * 2 + defenses + bandido));
}

function FlagBar({count}) {
  return (
    <div style={{display:"flex",gap:"2px",alignItems:"center"}}>
      {Array.from({length:10}).map((_,i)=>(
        <div key={i} style={{width:"7px",height:"10px",background:i<count?"#FFD700":"rgba(255,215,0,0.12)",borderRadius:"1px"}}/>
      ))}
      <span style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",marginLeft:"3px"}}>{count}/10</span>
    </div>
  );
}


// ── WA Report Buttons (for /registro done screen) ─────────────────────────
function WaReportButtons() {
  const [copied, setCopied] = useState("");
  const [players, setPlayers] = useState([]);
  useEffect(()=>{
    supabase.from("players").select("*").eq("active",true).then(({data})=>{ if(data) setPlayers(data); });
  },[]);
  function totalPtsLocal(p) {
    const sb=(p.pt_batallas_ganadas||0)>=6?10:0;
    return (p.pt_registro||0)+(p.pt_disponibilidad_declarada||0)+(p.pt_disponibilidad||0)
          +(p.pt_obediencia||0)+(p.pt_batallas_ganadas||0)*2+(p.pt_batallas_perdidas||0)
          +(p.pt_defensas||0)+(p.pt_bonus||0)+(p.pt_bandido_post||0)+(p.pt_stats||0)
          +(p.pt_whatsapp||0)+sb
          -(p.pt_penalizacion||0)-(p.pt_no_aparecio||0)
          -(p.pt_ignoro_orden||0)*2-(p.pt_abandono||0)*2-(p.pt_inactivo_4h||0)*3
          -(p.pt_bandido_pre||0);
  }
  const wa = players.filter(p=>p.whatsapp);
  function copySemanal() {
    const sorted = [...wa].sort((a,b)=>totalPtsLocal(b)-totalPtsLocal(a));
    let m = "*[AOR] Reporte Semanal — Grupo WA* ⚔\n\n";
    sorted.forEach((p,i)=>{const pts=totalPtsLocal(p); m+=`${i===0?"🥇":i===1?"🥈":i===2?"🥉":(i+1)+"."} *${p.name}* — ${pts>0?"+":""}${pts} pts\n`;});
    m+=`\n📊 https://aor-war-command.vercel.app/reporte`;
    navigator.clipboard.writeText(m); setCopied("sem"); setTimeout(()=>setCopied(""),2000);
  }
  function copyAcumulado() {
    const sorted = [...wa].sort((a,b)=>(b.pts_acumulados||0)-(a.pts_acumulados||0));
    let m = "*[AOR] Ranking Acumulado — Grupo WA* 🏆\n\n";
    sorted.forEach((p,i)=>{m+=`${i===0?"🥇":i===1?"🥈":i===2?"🥉":(i+1)+"."} *${p.name}* — ${(p.pts_acumulados||0).toLocaleString()} pts\n`;});
    m+=`\n📊 https://aor-war-command.vercel.app/reporte`;
    navigator.clipboard.writeText(m); setCopied("acc"); setTimeout(()=>setCopied(""),2000);
  }
  if (!wa.length) return null;
  return (
    <div style={{width:"100%",maxWidth:"380px",background:"rgba(37,211,102,0.04)",border:"1px solid rgba(37,211,102,0.15)",borderRadius:"10px",padding:"14px"}}>
      <div style={{fontSize:"10px",color:"#25D366",letterSpacing:"0.15em",fontFamily:"monospace",marginBottom:"10px"}}>REPORTES PARA WHATSAPP — {wa.length} MIEMBROS DEL GRUPO</div>
      <div style={{display:"flex",gap:"8px"}}>
        <button onClick={copySemanal} style={{flex:1,padding:"8px",background:copied==="sem"?"rgba(168,255,120,0.15)":"rgba(37,211,102,0.08)",border:"1px solid "+(copied==="sem"?"rgba(168,255,120,0.3)":"rgba(37,211,102,0.2)"),borderRadius:"6px",color:copied==="sem"?"#A8FF78":"#25D366",fontSize:"11px",cursor:"pointer"}}>
          {copied==="sem"?"✓ Copiado":"Reporte semanal WA"}
        </button>
        <button onClick={copyAcumulado} style={{flex:1,padding:"8px",background:copied==="acc"?"rgba(168,255,120,0.15)":"rgba(37,211,102,0.08)",border:"1px solid "+(copied==="acc"?"rgba(168,255,120,0.3)":"rgba(37,211,102,0.2)"),borderRadius:"6px",color:copied==="acc"?"#A8FF78":"#25D366",fontSize:"11px",cursor:"pointer"}}>
          {copied==="acc"?"✓ Copiado":"Ranking acumulado WA"}
        </button>
      </div>
    </div>
  );
}

// ── Registration Form (public) ─────────────────────────────────────────────
function getWarWeek() {
  // Returns string like "2026-W18" — war week Fri→Thu, Ecuador time (UTC-5)
  const now = new Date();
  const ec  = new Date(now.getTime() - 5*60*60*1000); // Ecuador UTC-5
  const day = ec.getDay(); // 0=Sun, 4=Thu, 5=Fri
  const daysFromFriday = (day + 2) % 7; // days since last Friday
  const friday = new Date(ec);
  friday.setDate(ec.getDate() - daysFromFriday);
  const year = friday.getFullYear();
  const week = Math.ceil(((friday - new Date(year,0,1)) / 86400000 + 1) / 7);
  return `${year}-W${week}`;
}


function getEarlyRegistrationBonus(availability) {
  // Bonus for registering early: before Wednesday 23:59 Spain time (CEST = UTC+2)
  const now   = new Date();
  const spain = new Date(now.getTime() + 2*60*60*1000); // Spain CEST = UTC+2
  const day   = spain.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const hour  = spain.getHours();
  const min   = spain.getMinutes();
  // Early window: Mon(1), Tue(2), or Wed(3) before 23:59 Spain
  const isEarly = (day === 1 || day === 2 || (day === 3 && (hour < 23 || (hour === 23 && min <= 59))));
  if (!isEarly) return 0;
  if (availability === "siempre")      return 5;
  if (availability === "intermitente") return 2;
  if (availability === "solo_una")     return 2;
  return 0;
}

function earlyBonusTimeLeft() {
  // Returns human-readable time left in early window
  const now   = new Date();
  const spain = new Date(now.getTime() + 2*60*60*1000);
  const day   = spain.getDay();
  const hour  = spain.getHours();
  // Wednesday 23:59 Spain = day 3, 23:59
  if (day > 3 || (day === 3 && hour >= 24)) return null;
  if (day === 0 || day > 5) return null; // Sun/Sat
  const wedEnd = new Date(spain);
  wedEnd.setDate(spain.getDate() + (3 - day));
  wedEnd.setHours(23, 59, 0, 0);
  const diff = wedEnd - spain;
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h >= 24) { const d = Math.floor(h/24); return `${d}d ${h%24}h`; }
  return `${h}h ${m}m`;
}
function isRegistrationOpen() {
  // Open Mon(1)–Thu(4) all day + Fri(5) before 7am Ecuador (UTC-5)
  // Closed: Fri 7am+ (war starts), Sat(6), Sun(0)
  const now = new Date();
  const ec  = new Date(now.getTime() - 5*60*60*1000);
  const day  = ec.getDay();
  const hour = ec.getHours();
  if (day === 0) return false;                  // Sunday
  if (day === 6) return false;                  // Saturday
  if (day === 5 && hour >= 7) return false;     // Friday 7am+ (war in progress)
  return true;
}

function RegistrationForm({onRegistered}) {
  const [name, setName]             = useState("");
  const [avail, setAvail]           = useState("");
  const [tz, setTz]                 = useState("mexico");
  const [hour, setHour]             = useState("No sé");
  const [task1, setTask1]           = useState("");
  const [task2, setTask2]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]             = useState(false);
  const [error, setError]           = useState("");
  const [allPlayers, setAllPlayers] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [existingAvail, setExistingAvail] = useState(null);
  const [newBp, setNewBp]           = useState("");
  const [newLevel, setNewLevel]     = useState("");
  const [lastStats, setLastStats]   = useState(null);
  const isOpen = isRegistrationOpen();
  const currentWeek = getWarWeek();

  useEffect(()=>{
    supabase.from("players").select("id,name,level,bp,registered_week,availability").eq("active",true).then(({data})=>{
      if(data) {
        setAllPlayers(data);
        const lockedId = sessionStorage.getItem("aor_player_id");
        if (lockedId) {
          const locked = data.find(p=>String(p.id)===lockedId);
          if (locked) setSelectedPlayer(locked);
        }
      }
    });
  },[]);

  async function loadLastStats(playerId) {
    const {data} = await supabase.from("player_stats").select("*").eq("player_id",playerId).order("created_at",{ascending:false}).limit(1);
    if (data && data.length > 0) setLastStats(data[0]);
    else setLastStats(null);
  }

  function handleNameChange(val) {
    setName(val);
    setSelectedPlayer(null);
    setAlreadyRegistered(false);
    setExistingAvail(null);
    if (val.trim().length < 2) { setSuggestions([]); return; }
    const clean = s => s.toLowerCase().replace(/[^a-z0-9]/gi,"").trim();
    const input = clean(val.trim());
    const matches = allPlayers.filter(p => clean(p.name).includes(input));
    setSuggestions(matches.slice(0,5));
  }

  function selectSuggestion(player) {
    setName(player.name);
    setSelectedPlayer(player);
    setSuggestions([]);
    if (player.registered_week === currentWeek) {
      setAlreadyRegistered(true);
      setExistingAvail(player.availability);
    }
    loadLastStats(player.id);
  }

  const tasks = avail ? getTasksForPlayer(avail, 999999) : null;
  const [statsSaved, setStatsSaved] = useState(false);

  async function saveStats() {
    if (!selectedPlayer) { setError("Selecciona tu nombre primero."); return; }
    if (!newBp && !newLevel) return;
    const currentWeek2 = getWarWeek();
    if (selectedPlayer.stats_updated_week === currentWeek2) {
      setError("Ya actualizaste tus stats esta semana.");
      return;
    }
    const hasBp    = newBp.trim() !== "";
    const hasLevel = newLevel.trim() !== "";
    const pts = hasBp && hasLevel ? 5 : 2;
    const updates = { pt_stats: (selectedPlayer.pt_stats||0) + pts, stats_updated_week: currentWeek2 };
    if (hasBp)    updates.bp    = parseInt(newBp);
    if (hasLevel) updates.level = parseInt(newLevel);
    const {error: statsErr} = await supabase.from("players").update(updates).eq("id", selectedPlayer.id);
    if (statsErr) { setError("Error al guardar stats: " + (statsErr.message||"DB error")); return; }
    await supabase.from("player_stats").insert({
      player_id: selectedPlayer.id, player_name: selectedPlayer.name,
      bp:    hasBp    ? parseInt(newBp)    : (selectedPlayer.bp||0),
      level: hasLevel ? parseInt(newLevel) : (selectedPlayer.level||0),
      updated_by: "jugador",
    });
    setStatsSaved(true);
    setNewBp(""); setNewLevel("");
    setTimeout(()=>setStatsSaved(false), 3000);
  }

  async function handleSubmit() {
    if (!name.trim() || !avail) { setError("Completa nombre y disponibilidad."); return; }
    setSubmitting(true);
    let player = selectedPlayer;
    if (!player) {
      const clean = s => s.toLowerCase().replace(/[^a-z0-9]/gi,"").trim();
      const input = clean(name.trim());
      const matches = allPlayers.filter(p => clean(p.name).includes(input));
      if (!matches.length) { setError("Nombre no encontrado. Escribe parte de tu nombre y selecciona de las sugerencias."); setSubmitting(false); return; }
      player = matches[0];
    }
    // Check weekly limit
    if (player.registered_week === currentWeek) {
      setError("Ya te registraste esta semana. Solo puedes registrarte una vez por guerra.");
      setSubmitting(false);
      return;
    }
    const av = AVAILABILITY[avail];
    const hasBp    = newBp.trim() !== "";
    const hasLevel = newLevel.trim() !== "";
    const statsPts = hasBp && hasLevel ? 5 : (hasBp || hasLevel) ? 2 : 0;
    const updates = {
      availability: avail, timezone: tz, hour_mx: hour, task_period1: task1+(task2?"→"+task2:""),
      registered_form: true, registered_week: currentWeek,
      pt_registro: av.pts, pt_disponibilidad_declarada: 0,
      pt_registro_temprano: getEarlyRegistrationBonus(avail),
      ...(statsPts > 0 ? {pt_stats: (player.pt_stats||0) + statsPts, stats_updated_week: getWarWeek()} : {}),
    };
    if (hasBp)    updates.bp    = parseInt(newBp);
    if (hasLevel) updates.level = parseInt(newLevel);
    const {error: updateError} = await supabase.from("players").update(updates).eq("id", player.id);
    if (updateError) {
      console.error("Registration update failed:", updateError);
      setError("Error al guardar: " + (updateError.message || JSON.stringify(updateError)) + ". Avisa al admin.");
      setSubmitting(false);
      return;
    }
    if (hasBp || hasLevel) {
      await supabase.from("player_stats").insert({
        player_id: player.id, player_name: player.name,
        bp: hasBp ? parseInt(newBp) : (selectedPlayer?.bp||0),
        level: hasLevel ? parseInt(newLevel) : (selectedPlayer?.level||0),
        updated_by: "jugador",
      });
    }
    sessionStorage.setItem("aor_player_id", String(player.id));
    sessionStorage.setItem("aor_player_name", player.name);
    setDone(true);
    setSubmitting(false);
    if (onRegistered) onRegistered();
  }

  // Registration closed screen
  if (!isOpen) return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}>
      <div style={{textAlign:"center",maxWidth:"360px"}}>
        <div style={{fontSize:"48px",marginBottom:"16px"}}>🔒</div>
        <div style={{fontFamily:"serif",fontSize:"22px",color:"#FF6B6B",marginBottom:"8px"}}>Registro cerrado</div>
        <div style={{fontSize:"14px",color:"rgba(255,255,255,0.6)"}}>El registro abre los lunes y cierra el viernes a las 7:00am hora Ecuador cuando comienza la guerra.</div>
      </div>
      <NalguitasFooter/>
    </div>
  );

  if (done) return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",padding:"20px",fontFamily:"Georgia,serif",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center",maxWidth:"400px",width:"100%",marginBottom:"24px"}}>
        <div style={{fontSize:"48px",marginBottom:"16px"}}>⚔</div>
        <div style={{fontFamily:"serif",fontSize:"22px",color:"#FFD700",marginBottom:"8px"}}>¡Registrado!</div>
        <div style={{fontSize:"14px",color:"rgba(255,255,255,0.6)",marginBottom:"16px"}}>Tu participación ha sido confirmada. El comando de [AOR] ha sido notificado.</div>
        <div style={{background:"rgba(168,255,120,0.1)",border:"1px solid rgba(168,255,120,0.3)",borderRadius:"8px",padding:"12px",fontSize:"12px",color:"#A8FF78",marginBottom:"16px"}}>
          +{5 + (AVAILABILITY[avail]?.declaredPts||0)} puntos acreditados a tu cuenta
        </div>
        <div style={{display:"flex",gap:"8px",justifyContent:"center",marginBottom:"24px"}}>
          <a href="/reporte" style={{fontSize:"11px",color:"#40E0FF",textDecoration:"none",padding:"6px 14px",border:"1px solid rgba(64,224,255,0.3)",borderRadius:"20px"}}>Ver ranking</a>
          <a href="/propaganda" style={{fontSize:"11px",color:"#FFD700",textDecoration:"none",padding:"6px 14px",border:"1px solid rgba(255,215,0,0.3)",borderRadius:"20px"}}>Propaganda</a>
        </div>
      </div>
      <WaReportButtons/>
      <NalguitasFooter/>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",backgroundImage:"radial-gradient(ellipse at 10% 0%, rgba(64,224,255,0.05) 0%, transparent 50%)",padding:"20px",fontFamily:"Georgia,serif",color:"#d4c9a8"}}>
      <div style={{maxWidth:"560px",margin:"0 auto"}}>
        <NavBar current="/registro"/>
        <PageHeader page="/registro"/>

        {/* Name */}
        <div style={{marginBottom:"16px",position:"relative"}}>
          <label style={{fontSize:"11px",color:"rgba(255,255,255,0.5)",display:"block",marginBottom:"4px"}}>
            NOMBRE EN EL JUEGO
            {sessionStorage.getItem("aor_player_id") && <span style={{color:"#40E0FF",marginLeft:"6px",fontSize:"9px"}}>🔒 sesión: {sessionStorage.getItem("aor_player_name")}</span>}
          </label>
          <input value={name} onChange={e=>{ if(sessionStorage.getItem("aor_player_id")) return; handleNameChange(e.target.value); }} readOnly={!!sessionStorage.getItem("aor_player_id")} placeholder="Escribe tu nombre..." style={{width:"100%",background:sessionStorage.getItem("aor_player_id")?"rgba(64,224,255,0.05)":"rgba(255,255,255,0.05)",border:"1px solid "+(selectedPlayer?"#A8FF78":"rgba(255,255,255,0.15)"),borderRadius:"6px",color:"#fff",padding:"10px 12px",fontSize:"13px",outline:"none",boxSizing:"border-box",cursor:sessionStorage.getItem("aor_player_id")?"not-allowed":"text"}}/>
          {selectedPlayer && <div style={{fontSize:"10px",color:"#A8FF78",marginTop:"3px"}}>✓ {selectedPlayer.name} — {((selectedPlayer.level||0)/1000).toFixed(1)}k</div>}
          {suggestions.length > 0 && (
            <div style={{position:"absolute",top:"100%",left:0,right:0,background:"#1a1a1f",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"6px",zIndex:100,overflow:"hidden",marginTop:"2px"}}>
              {suggestions.map(p=>(
                <div key={p.id} onClick={()=>selectSuggestion(p)} style={{padding:"10px 12px",cursor:"pointer",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(64,224,255,0.1)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <span style={{fontSize:"13px",color:"#fff"}}>{p.name}</span>
                  <span style={{fontSize:"10px",color:"rgba(255,255,255,0.4)"}}>{((p.level||0)/1000).toFixed(1)}k</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats update - right after name */}
        {selectedPlayer && !alreadyRegistered && (
          <div style={{marginBottom:"16px",background:"rgba(255,215,0,0.05)",border:"1px solid rgba(255,215,0,0.15)",borderRadius:"8px",padding:"12px"}}>
            <label style={{fontSize:"11px",color:"#FFD700",display:"block",marginBottom:"4px"}}>
              📊 ACTUALIZA TUS STATS
            </label>
            <div style={{background:"rgba(255,255,255,0.04)",borderRadius:"6px",padding:"8px 10px",marginBottom:"8px",fontSize:"10px"}}>
              <div style={{color:"#A8FF78",marginBottom:"2px"}}>💀 Solo BP → <strong>+2 pts</strong></div>
              <div style={{color:"#A8FF78",marginBottom:"2px"}}>⚔ Solo Poder → <strong>+2 pts</strong></div>
              <div style={{color:"#FFD700"}}>💀 BP + ⚔ Poder juntos → <strong>+5 pts</strong> (bonus extra)</div>
            </div>
            {lastStats ? (
              <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",marginBottom:"8px"}}>
                Últimos: 💀 {lastStats.bp?.toLocaleString()} BP · ⚔ {((lastStats.level||0)/1000).toFixed(1)}k · {new Date(lastStats.created_at).toLocaleDateString()}
              </div>
            ) : (
              <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",marginBottom:"8px"}}>
                Actuales: 💀 {selectedPlayer.bp?.toLocaleString()} BP · ⚔ {((selectedPlayer.level||0)/1000).toFixed(1)}k
              </div>
            )}
            <div style={{display:"flex",gap:"8px"}}>
              <div style={{flex:1}}>
                <div style={{fontSize:"9px",color:"rgba(255,255,255,0.4)",marginBottom:"3px"}}>💀 Battle Points (+2 pts)</div>
                <input value={newBp} onChange={e=>setNewBp(e.target.value)} placeholder={selectedPlayer.bp?.toString()||""} type="number" style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"6px",color:"#fff",padding:"8px 10px",fontSize:"12px",outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:"9px",color:"rgba(255,255,255,0.4)",marginBottom:"3px"}}>⚔ Poder (+2 pts)</div>
                <input value={newLevel} onChange={e=>setNewLevel(e.target.value)} placeholder={selectedPlayer.level?.toString()||""} type="number" style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"6px",color:"#fff",padding:"8px 10px",fontSize:"12px",outline:"none",boxSizing:"border-box"}}/>
              </div>
            </div>
            <div style={{display:"flex",gap:"8px",marginTop:"4px"}}>
              <button type="button" onClick={saveStats} disabled={!newBp&&!newLevel} style={{flex:1,padding:"8px",background:(newBp||newLevel)?"rgba(168,255,120,0.15)":"rgba(255,255,255,0.04)",border:"1px solid "+((newBp||newLevel)?"rgba(168,255,120,0.3)":"rgba(255,255,255,0.08)"),borderRadius:"6px",color:(newBp||newLevel)?"#A8FF78":"rgba(255,255,255,0.3)",fontSize:"11px",cursor:(newBp||newLevel)?"pointer":"default",fontWeight:"bold"}}>
                💾 Guardar stats{(newBp||newLevel)?" (+"+(newBp&&newLevel?5:2)+" pts)":""}
              </button>
              {(newBp||newLevel) && <button type="button" onClick={()=>{setNewBp("");setNewLevel("");}} style={{padding:"8px 12px",background:"rgba(255,107,107,0.1)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:"6px",color:"#FF6B6B",fontSize:"11px",cursor:"pointer"}}>✕</button>}
            </div>
            {statsSaved && <div style={{fontSize:"11px",color:"#A8FF78",marginTop:"6px",fontWeight:"bold"}}>✓ Stats guardados con éxito</div>}
          </div>
        )}

        {/* Availability with inline tasks */}
        <div style={{marginBottom:"16px"}}>
          {earlyBonusTimeLeft() && (
            <div style={{background:"rgba(255,215,0,0.08)",border:"1px solid rgba(255,215,0,0.25)",borderRadius:"8px",padding:"8px 12px",marginBottom:"8px",fontSize:"10px"}}>
              ⭐ <strong style={{color:"#FFD700"}}>¡Bonus por registro anticipado!</strong>
              <span style={{color:"rgba(255,255,255,0.5)"}}> Quedan <strong style={{color:"#FFD700"}}>{earlyBonusTimeLeft()}</strong> para el cierre anticipado (mié 23:59 España)</span>
              <div style={{marginTop:"4px",color:"rgba(255,255,255,0.5)"}}>Conquistador <strong style={{color:"#A8FF78"}}>+5 pts</strong> · Refuerzos <strong style={{color:"#FFD700"}}>+2 pts</strong> · Reserva <strong style={{color:"#FFD700"}}>+2 pts</strong></div>
            </div>
          )}
          <label style={{fontSize:"11px",color:"rgba(255,255,255,0.5)",display:"block",marginBottom:"6px"}}>DISPONIBILIDAD</label>
          <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
            {Object.entries(AVAILABILITY).filter(([k])=>k!=="pendiente").map(([key,av])=>(
              <div key={key}>
                <button onClick={()=>{setAvail(key);setTask1("");}} style={{width:"100%",padding:"10px 14px",borderRadius:"6px",fontSize:"12px",cursor:"pointer",textAlign:"left",background:avail===key?av.color+"22":"rgba(255,255,255,0.03)",border:"1px solid "+(avail===key?av.color:"rgba(255,255,255,0.08)"),color:avail===key?av.color:"rgba(255,255,255,0.5)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span>{av.icon} {av.label}</span>
                    <Pill color={av.color}>+{av.pts} pts</Pill>
                  </div>
                  {key==="siempre" && <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",marginTop:"3px"}}><strong style={{color:"#A8FF78"}}>Siempre listo</strong> — Disponible para todo: ataque, defensa y espionaje.</div>}
                  {key==="intermitente" && <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",marginTop:"3px"}}><strong style={{color:"#FFD700"}}>Intermitente</strong> — Al menos una aparición por periodo.</div>}
                  {key==="solo_una" && <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",marginTop:"3px"}}><strong style={{color:"#FF9F43"}}>Solo una vez</strong> — Una sola participación según tu nivel.</div>}
                  {key==="no_disponible" && <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",marginTop:"3px"}}>Avisas con anticipación — +1 punto por responsabilidad</div>}
                </button>
                {avail===key && key==="intermitente" && (
                  <div style={{marginTop:"4px",padding:"10px",background:"rgba(255,215,0,0.04)",border:"1px solid rgba(255,215,0,0.12)",borderRadius:"6px",borderTop:"none"}}>
                    <div style={{marginBottom:"8px"}}>
                      <div style={{fontSize:"10px",color:"#FFD700",marginBottom:"4px"}}>⚔ Primeras 24h — elige UNA tarea:</div>
                      {["Atacar castillos","Defender castillos"].map(t=>(
                        <button key={t} onClick={()=>setTask1(t)} style={{display:"block",width:"100%",marginBottom:"3px",padding:"6px 10px",borderRadius:"5px",fontSize:"11px",cursor:"pointer",textAlign:"left",background:task1===t?"rgba(255,215,0,0.15)":"rgba(255,255,255,0.03)",border:"1px solid "+(task1===t?"#FFD700":"rgba(255,255,255,0.08)"),color:task1===t?"#FFD700":"rgba(255,255,255,0.5)"}}>{t}</button>
                      ))}
                    </div>
                    <div>
                      <div style={{fontSize:"10px",color:"#FF6B6B",marginBottom:"4px"}}>🏰 Segundas 24h — elige UNA tarea:</div>
                      {["Atacar ciudad enemiga","Defender castillos"].map(t=>(
                        <button key={t} onClick={()=>setTask2(task2===t?"":t)} style={{display:"block",width:"100%",marginBottom:"3px",padding:"6px 10px",borderRadius:"5px",fontSize:"11px",cursor:"pointer",textAlign:"left",background:task2===t?"rgba(255,107,107,0.15)":"rgba(255,255,255,0.03)",border:"1px solid "+(task2===t?"#FF6B6B":"rgba(255,255,255,0.08)"),color:task2===t?"#FF6B6B":"rgba(255,255,255,0.5)"}}>{t}</button>
                      ))}
                    </div>
                  {(task1||task2) && (
                      <div style={{marginTop:"8px",padding:"6px 8px",background:"rgba(255,215,0,0.08)",borderRadius:"5px",fontSize:"10px",color:"#FFD700"}}>
                        ✓ {task1}{task2?" → "+task2:""}
                      </div>
                    )}
                  </div>
                )}
                {avail===key && key==="solo_una" && tasks && tasks.period1.length>0 && (
                  <div style={{marginTop:"4px",padding:"10px",background:"rgba(64,224,255,0.04)",border:"1px solid rgba(64,224,255,0.12)",borderRadius:"6px"}}>
                    <div style={{fontSize:"10px",color:"#40E0FF",marginBottom:"4px"}}>Selecciona tu tarea:</div>
                    {tasks.period1.map(t=>(
                      <button key={t} onClick={()=>setTask1(t)} style={{display:"block",width:"100%",marginBottom:"3px",padding:"6px 10px",borderRadius:"5px",fontSize:"11px",cursor:"pointer",textAlign:"left",background:task1===t?"rgba(64,224,255,0.15)":"rgba(255,255,255,0.03)",border:"1px solid "+(task1===t?"#40E0FF":"rgba(255,255,255,0.08)"),color:task1===t?"#40E0FF":"rgba(255,255,255,0.5)"}}>{t}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
          
        {/* Timezone */}
        <div style={{marginBottom:"16px"}}>
          <label style={{fontSize:"11px",color:"rgba(255,255,255,0.5)",display:"block",marginBottom:"6px"}}>ZONA HORARIA</label>
          <div style={{display:"flex",gap:"6px"}}>
            {Object.entries(TIMEZONES).map(([key,tz2])=>(
              <button key={key} onClick={()=>setTz(key)} style={{flex:1,padding:"8px",borderRadius:"6px",fontSize:"11px",cursor:"pointer",background:tz===key?"rgba(64,224,255,0.15)":"rgba(255,255,255,0.03)",border:"1px solid "+(tz===key?"#40E0FF":"rgba(255,255,255,0.08)"),color:tz===key?"#40E0FF":"rgba(255,255,255,0.5)"}}>
                {tz2.flag} {tz2.label}
              </button>
            ))}
          </div>
        </div>

        {/* Hour */}
        {avail && avail !== "no_disponible" && (
          <div style={{marginBottom:"16px"}}>
            <label style={{fontSize:"11px",color:"rgba(255,255,255,0.5)",display:"block",marginBottom:"6px"}}>HORA DISPONIBLE</label>
            <select value={hour} onChange={e=>setHour(e.target.value)} style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"6px",color:"#fff",padding:"10px 12px",fontSize:"13px",outline:"none"}}>
              {HOURS.map(h=><option key={h} value={h} style={{background:"#1a1a1f"}}>{h}</option>)}
            </select>
            {hour !== "No sé" && (
              <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginTop:"4px"}}>
                {TIMEZONES[tz].flag} {hour} → 🇲🇽 {convertTime(hour,tz,"mexico")} / 🇪🇸 {convertTime(hour,tz,"espana")}
              </div>
            )}
          </div>
        )}

        {alreadyRegistered && (
          <div style={{background:"rgba(255,215,0,0.08)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:"8px",padding:"12px",marginBottom:"14px",fontSize:"12px",color:"#FFD700"}}>
            ⚠ Ya te registraste esta semana como <strong>{AVAILABILITY[existingAvail]?.label}</strong> (+{AVAILABILITY[existingAvail]?.pts} pts). No puedes volver a registrarte hasta la próxima guerra.
          </div>
        )}

        {error && <div style={{background:"rgba(255,107,107,0.1)",border:"1px solid rgba(255,107,107,0.3)",borderRadius:"6px",padding:"10px",fontSize:"11px",color:"#FF6B6B",marginBottom:"12px"}}>{error}</div>}

        <button onClick={handleSubmit} disabled={submitting||alreadyRegistered} style={{width:"100%",padding:"14px",background:alreadyRegistered?"rgba(255,255,255,0.05)":"rgba(64,224,255,0.15)",border:"1px solid "+(alreadyRegistered?"rgba(255,255,255,0.1)":"rgba(64,224,255,0.3)"),borderRadius:"8px",color:alreadyRegistered?"rgba(255,255,255,0.3)":"#40E0FF",fontFamily:"serif",fontSize:"14px",cursor:alreadyRegistered?"not-allowed":"pointer",letterSpacing:"0.1em"}}>
          {submitting ? "Registrando..." : alreadyRegistered ? "Ya registrado esta semana" : "CONFIRMAR PARTICIPACION"}
        </button>

        <div style={{textAlign:"center",fontSize:"10px",color:"rgba(255,255,255,0.3)",marginTop:"12px"}}>
          Al registrarte recibes +{avail?AVAILABILITY[avail].pts:0} puntos automaticamente
        </div>
      </div>
    </div>
  );
}



// ── Message Card components (defined OUTSIDE MensajesTab to prevent focus loss) ─
function WaCard({title, desc, initialValue, titleColor="#25D366", onDelete=null}) {
  const [editing, setEditing]       = useState(false);
  const [draft, setDraft]           = useState(initialValue);
  const [saved, setSaved]           = useState(initialValue);
  const [draftTitle, setDraftTitle] = useState(title);
  const [savedTitle, setSavedTitle] = useState(title);
  const [copied, setCopied]         = useState(false);
  function guardar()  { setSaved(draft); setSavedTitle(draftTitle); setEditing(false); }
  function cancelar() { setDraft(saved); setDraftTitle(savedTitle); setEditing(false); }
  function copiar()   { navigator.clipboard.writeText(saved); setCopied(true); setTimeout(()=>setCopied(false),2000); }
  return (
    <div style={{background:"rgba(37,211,102,0.04)",border:"1px solid rgba(37,211,102,0.15)",borderRadius:"8px",padding:"12px",marginBottom:"8px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"4px"}}>
        <div>
          <div style={{fontSize:"12px",color:titleColor,fontWeight:"bold"}}>{savedTitle}</div>
          {desc&&<div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",marginTop:"1px"}}>{desc}</div>}
        </div>
        {!editing && (
          <div style={{display:"flex",gap:"4px",marginLeft:"8px",flexShrink:0}}>
            <button onClick={()=>setEditing(true)} style={{padding:"3px 8px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:"6px",color:"rgba(255,255,255,0.5)",fontSize:"10px",cursor:"pointer"}}>✏</button>
            {onDelete && <button onClick={()=>{ if(confirm("¿Eliminar este mensaje?")) onDelete(); }} style={{padding:"3px 8px",background:"rgba(255,107,107,0.08)",border:"1px solid rgba(255,107,107,0.15)",borderRadius:"6px",color:"rgba(255,107,107,0.5)",fontSize:"10px",cursor:"pointer"}}>✕</button>}
          </div>
        )}
      </div>
      {editing ? (
        <>
          <input value={draftTitle} onChange={e=>setDraftTitle(e.target.value)} placeholder="Título del mensaje"
            style={{width:"100%",background:"rgba(0,0,0,0.3)",border:"1px solid rgba(37,211,102,0.2)",borderRadius:"6px",color:titleColor,fontSize:"11px",padding:"5px 8px",outline:"none",boxSizing:"border-box",marginBottom:"6px",fontWeight:"bold"}}/>
          <textarea value={draft} onChange={e=>setDraft(e.target.value)} rows={5}
            style={{width:"100%",background:"rgba(0,0,0,0.4)",border:"1px solid rgba(37,211,102,0.3)",borderRadius:"6px",color:"#d4c9a8",fontSize:"11px",padding:"8px",resize:"vertical",outline:"none",boxSizing:"border-box",marginBottom:"8px",fontFamily:"inherit"}}/>
          <div style={{display:"flex",gap:"8px"}}>
            <button onClick={guardar} style={{flex:1,padding:"7px",background:"rgba(168,255,120,0.15)",border:"1px solid rgba(168,255,120,0.3)",borderRadius:"6px",color:"#A8FF78",fontSize:"11px",cursor:"pointer",fontWeight:"bold"}}>💾 Guardar</button>
            <button onClick={cancelar} style={{padding:"7px 12px",background:"rgba(255,107,107,0.1)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:"6px",color:"#FF6B6B",fontSize:"11px",cursor:"pointer"}}>✕ Cancelar</button>
          </div>
        </>
      ) : (
        <><div style={{background:"rgba(0,0,0,0.3)",borderRadius:"6px",padding:"8px",fontSize:"11px",color:"#d4c9a8",whiteSpace:"pre-wrap",marginBottom:"8px",maxHeight:"100px",overflow:"auto",fontFamily:"inherit"}}>{saved}</div>
          <button onClick={copiar} style={{padding:"5px 14px",background:copied?"rgba(168,255,120,0.2)":"rgba(37,211,102,0.1)",border:"1px solid "+(copied?"rgba(168,255,120,0.4)":"rgba(37,211,102,0.25)"),borderRadius:"20px",color:copied?"#A8FF78":titleColor,fontSize:"11px",cursor:"pointer"}}>{copied?"✓ Copiado!":"📋 Copiar"}</button>
        </>
      )}
    </div>
  );
}


function GameCard({title, initialValue, onDelete=null}) {
  const [editing, setEditing]       = useState(false);
  const [draft, setDraft]           = useState(initialValue);
  const [saved, setSaved]           = useState(initialValue);
  const [draftTitle, setDraftTitle] = useState(title);
  const [savedTitle, setSavedTitle] = useState(title);
  const [copied, setCopied]         = useState(false);
  function guardar()  { setSaved(draft); setSavedTitle(draftTitle); setEditing(false); }
  function cancelar() { setDraft(saved); setDraftTitle(savedTitle); setEditing(false); }
  function copiar()   { navigator.clipboard.writeText(saved); setCopied(true); setTimeout(()=>setCopied(false),2000); }
  const len = draft.length; const over = len > 250;
  return (
    <div style={{background:"rgba(64,224,255,0.04)",border:"1px solid "+(over&&editing?"rgba(255,107,107,0.5)":"rgba(64,224,255,0.15)"),borderRadius:"8px",padding:"12px",marginBottom:"8px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
        <div style={{fontSize:"12px",color:"#40E0FF",fontWeight:"bold"}}>{savedTitle}</div>
        <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
          {editing && <span style={{fontSize:"10px",color:over?"#FF6B6B":"rgba(255,255,255,0.4)",fontWeight:over?"bold":"normal"}}>{len}/250{over?" ⚠":""}</span>}
          {!editing && (
            <div style={{display:"flex",gap:"4px",alignItems:"center"}}>
              <span style={{fontSize:"10px",color:"rgba(255,255,255,0.25)"}}>{saved.length}/250</span>
              <button onClick={()=>setEditing(true)} style={{padding:"3px 8px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:"6px",color:"rgba(255,255,255,0.5)",fontSize:"10px",cursor:"pointer"}}>✏</button>
              {onDelete && <button onClick={()=>{ if(confirm("¿Eliminar este mensaje?")) onDelete(); }} style={{padding:"3px 8px",background:"rgba(255,107,107,0.08)",border:"1px solid rgba(255,107,107,0.15)",borderRadius:"6px",color:"rgba(255,107,107,0.5)",fontSize:"10px",cursor:"pointer"}}>✕</button>}
            </div>
          )}
        </div>
      </div>
      {editing ? (
        <>
          <input value={draftTitle} onChange={e=>setDraftTitle(e.target.value)} placeholder="Título del mensaje"
            style={{width:"100%",background:"rgba(0,0,0,0.3)",border:"1px solid rgba(64,224,255,0.2)",borderRadius:"6px",color:"#40E0FF",fontSize:"11px",padding:"5px 8px",outline:"none",boxSizing:"border-box",marginBottom:"6px",fontWeight:"bold"}}/>
          <textarea value={draft} onChange={e=>setDraft(e.target.value)} rows={4}
            style={{width:"100%",background:"rgba(0,0,0,0.4)",border:"1px solid "+(over?"rgba(255,107,107,0.4)":"rgba(64,224,255,0.3)"),borderRadius:"6px",color:"#d4c9a8",fontSize:"11px",padding:"8px",resize:"vertical",outline:"none",boxSizing:"border-box",marginBottom:"8px",fontFamily:"monospace"}}/>
          <div style={{display:"flex",gap:"8px"}}>
            <button onClick={guardar} disabled={over} style={{flex:1,padding:"7px",background:over?"rgba(255,255,255,0.04)":"rgba(168,255,120,0.15)",border:"1px solid "+(over?"rgba(255,255,255,0.08)":"rgba(168,255,120,0.3)"),borderRadius:"6px",color:over?"rgba(255,255,255,0.3)":"#A8FF78",fontSize:"11px",cursor:over?"default":"pointer",fontWeight:"bold"}}>💾 Guardar{over?" (excede 250)":""}</button>
            <button onClick={cancelar} style={{padding:"7px 12px",background:"rgba(255,107,107,0.1)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:"6px",color:"#FF6B6B",fontSize:"11px",cursor:"pointer"}}>✕ Cancelar</button>
          </div>
        </>
      ) : (
        <><div style={{background:"rgba(0,0,0,0.3)",borderRadius:"6px",padding:"8px",fontSize:"11px",color:"#d4c9a8",whiteSpace:"pre-wrap",marginBottom:"8px",maxHeight:"80px",overflow:"auto",fontFamily:"monospace"}}>{saved}</div>
          <button onClick={copiar} style={{padding:"5px 14px",background:copied?"rgba(168,255,120,0.2)":"rgba(64,224,255,0.1)",border:"1px solid "+(copied?"rgba(168,255,120,0.4)":"rgba(64,224,255,0.25)"),borderRadius:"20px",color:copied?"#A8FF78":"#40E0FF",fontSize:"11px",cursor:"pointer"}}>{copied?"✓ Copiado!":"📋 Copiar"}</button>
        </>
      )}
    </div>
  );
}


function InviteCard({name, initialValue}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(initialValue);
  const [saved, setSaved]     = useState(initialValue);
  const [copied, setCopied]   = useState(false);
  function guardar()  { setSaved(draft); setEditing(false); }
  function cancelar() { setDraft(saved); setEditing(false); }
  function copiar()   { navigator.clipboard.writeText(saved); setCopied(true); setTimeout(()=>setCopied(false),2000); }
  const len = draft.length; const over = len > 250;
  return (
    <div style={{background:"rgba(255,159,67,0.04)",border:"1px solid "+(over&&editing?"rgba(255,107,107,0.4)":"rgba(255,159,67,0.2)"),borderRadius:"8px",padding:"10px",marginBottom:"6px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"4px"}}>
        <div style={{fontSize:"11px",color:"#FF9F43",fontWeight:"bold"}}>📵 {name}</div>
        <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
          {editing && <span style={{fontSize:"10px",color:over?"#FF6B6B":"rgba(255,255,255,0.3)"}}>{len}/250</span>}
          {!editing && <><span style={{fontSize:"10px",color:"rgba(255,255,255,0.25)"}}>{saved.length}/250</span><button onClick={()=>setEditing(true)} style={{padding:"3px 8px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:"6px",color:"rgba(255,255,255,0.5)",fontSize:"10px",cursor:"pointer"}}>✏</button></>}
        </div>
      </div>
      {editing ? (
        <><textarea value={draft} onChange={e=>setDraft(e.target.value)} rows={3} autoFocus
            style={{width:"100%",background:"rgba(0,0,0,0.4)",border:"1px solid rgba(255,159,67,0.3)",borderRadius:"6px",color:"#d4c9a8",fontSize:"10px",padding:"6px",resize:"vertical",outline:"none",boxSizing:"border-box",marginBottom:"6px",fontFamily:"monospace"}}/>
          <div style={{display:"flex",gap:"8px"}}>
            <button onClick={guardar} disabled={over} style={{flex:1,padding:"6px",background:over?"rgba(255,255,255,0.04)":"rgba(168,255,120,0.15)",border:"1px solid "+(over?"rgba(255,255,255,0.08)":"rgba(168,255,120,0.3)"),borderRadius:"6px",color:over?"rgba(255,255,255,0.3)":"#A8FF78",fontSize:"11px",cursor:over?"default":"pointer",fontWeight:"bold"}}>💾 Guardar</button>
            <button onClick={cancelar} style={{padding:"6px 10px",background:"rgba(255,107,107,0.1)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:"6px",color:"#FF6B6B",fontSize:"11px",cursor:"pointer"}}>✕</button>
          </div>
        </>
      ) : (
        <><div style={{background:"rgba(0,0,0,0.3)",borderRadius:"4px",padding:"6px",fontSize:"10px",color:"#d4c9a8",fontFamily:"monospace",marginBottom:"6px",wordBreak:"break-all"}}>{saved}</div>
          <button onClick={copiar} style={{padding:"4px 12px",background:copied?"rgba(168,255,120,0.2)":"rgba(64,224,255,0.1)",border:"1px solid "+(copied?"rgba(168,255,120,0.4)":"rgba(64,224,255,0.25)"),borderRadius:"20px",color:copied?"#A8FF78":"#40E0FF",fontSize:"11px",cursor:"pointer"}}>{copied?"✓ Copiado!":"📋 Copiar"}</button>
        </>
      )}
    </div>
  );
}


// ── PropagandaCard — syncs with Supabase comunicaciones_msgs table ─────────
function PropagandaCard({slot}) {
  const [title,   setTitle]   = useState("Comunicación "+slot);
  const [content, setContent] = useState("");
  const [editing, setEditing] = useState(false);
  const [draftT,  setDraftT]  = useState("");
  const [draftC,  setDraftC]  = useState("");
  const [copied,  setCopied]  = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [loaded,  setLoaded]  = useState(false);
  const [dbId,    setDbId]    = useState(null);

  useEffect(()=>{
    supabase.from("comunicaciones_msgs").select("*").eq("slot",slot).single()
      .then(({data})=>{
        if (data) {
          setTitle(data.title||"Comunicación "+slot);
          setContent(data.content||"");
          setDbId(data.id);
        }
        setLoaded(true);
      });
  },[slot]);

  function startEdit() {
    setDraftT(title); setDraftC(content); setEditing(true);
  }

  async function save() {
    setSaving(true);
    const payload = {slot, title:draftT, content:draftC, updated_at:new Date().toISOString()};
    if (dbId) {
      await supabase.from("comunicaciones_msgs").update(payload).eq("id",dbId);
    } else {
      const {data} = await supabase.from("comunicaciones_msgs").insert(payload).select().single();
      if (data) setDbId(data.id);
    }
    setTitle(draftT); setContent(draftC);
    setSaving(false); setEditing(false);
  }

  function cancel() { setEditing(false); }
  function copy() { navigator.clipboard.writeText(content); setCopied(true); setTimeout(()=>setCopied(false),2000); }

  if (!loaded) return <div style={{padding:"12px",fontSize:"10px",color:"rgba(255,255,255,0.3)"}}>Cargando comunicación {slot}...</div>;

  return (
    <div style={{background:"rgba(255,215,0,0.04)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:"8px",padding:"12px",marginBottom:"8px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"4px"}}>
        <div>
          <div style={{fontSize:"12px",color:"#FFD700",fontWeight:"bold"}}>{title}</div>
          <div style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",marginTop:"1px"}}>Slot {slot} · aparece en /propaganda</div>
        </div>
        {!editing && (
          <div style={{display:"flex",gap:"4px",marginLeft:"8px"}}>
            <button onClick={startEdit} style={{padding:"3px 8px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:"6px",color:"rgba(255,255,255,0.5)",fontSize:"10px",cursor:"pointer"}}>✏ Editar</button>
          </div>
        )}
      </div>
      {editing ? (
        <>
          <input value={draftT} onChange={e=>setDraftT(e.target.value)} placeholder="Título"
            style={{width:"100%",background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,215,0,0.25)",borderRadius:"6px",color:"#FFD700",fontSize:"11px",padding:"5px 8px",outline:"none",boxSizing:"border-box",marginBottom:"6px",fontWeight:"bold"}}/>
          <textarea value={draftC} onChange={e=>setDraftC(e.target.value)} rows={4} placeholder="Escribe el mensaje de propaganda. Sin color tags — solo texto. AOR y Antigua Orden se resaltarán automáticamente."
            style={{width:"100%",background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:"6px",color:"#d4c9a8",fontSize:"11px",padding:"8px",outline:"none",boxSizing:"border-box",marginBottom:"8px",resize:"vertical",fontFamily:"Georgia,serif"}}/>
          <div style={{display:"flex",gap:"8px"}}>
            <button onClick={save} disabled={saving} style={{flex:1,padding:"7px",background:"rgba(168,255,120,0.15)",border:"1px solid rgba(168,255,120,0.3)",borderRadius:"6px",color:"#A8FF78",fontSize:"11px",cursor:"pointer",fontWeight:"bold"}}>
              {saving?"Guardando...":"💾 Guardar en /propaganda"}
            </button>
            <button onClick={cancel} style={{padding:"7px 12px",background:"rgba(255,107,107,0.1)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:"6px",color:"#FF6B6B",fontSize:"11px",cursor:"pointer"}}>✕</button>
          </div>
        </>
      ) : (
        <>
          <div style={{background:"rgba(0,0,0,0.25)",borderRadius:"6px",padding:"8px",fontSize:"11px",color:content?"#d4c9a8":"rgba(255,255,255,0.2)",whiteSpace:"pre-wrap",marginBottom:"8px",minHeight:"40px",maxHeight:"100px",overflow:"auto",fontFamily:"Georgia,serif"}}>
            {content || "(sin contenido — haz clic en Editar para agregar el mensaje)"}
          </div>
          <button onClick={copy} disabled={!content} style={{padding:"5px 14px",background:copied?"rgba(168,255,120,0.2)":"rgba(255,215,0,0.08)",border:"1px solid "+(copied?"rgba(168,255,120,0.4)":"rgba(255,215,0,0.2)"),borderRadius:"20px",color:copied?"#A8FF78":"#FFD700",fontSize:"11px",cursor:content?"pointer":"default",opacity:content?1:0.4}}>
            {copied?"✓ Copiado":"📋 Copiar"}
          </button>
        </>
      )}
    </div>
  );
}

// ── Mensajes Tab Component ─────────────────────────────────────────────────
function MensajesTab({players}) {
  const allActive   = players.filter(p=>p.active);
  const waPlayers   = allActive.filter(p=>p.whatsapp);
  const noWaPlayers = allActive.filter(p=>!p.whatsapp);
  const avMap = {siempre:"Conquistador",intermitente:"Refuerzos",solo_una:"Reserva",no_disponible:"No disponible"};

  // Dynamic extra messages
  const [extraWa,   setExtraWa]   = useState([]);
  const [waCards,   setWaCards]   = useState([]);
  // Initialize waCards on first render
  const waCardsInitRef = useRef(false);
  if (!waCardsInitRef.current && (allActive.length > 0 || true)) {
    waCardsInitRef.current = true;
    if (waCards.length === 0) {
      setWaCards([
        {id:"w1",fixed:false,title:`Registro grupo WA (${waRegistrado.length}/${waPlayers.length})`,desc:"Solo miembros del grupo de WhatsApp",content:buildWaRegistro()},
        {id:"w2",fixed:false,title:"Registro completo",desc:"Todos los miembros activos",content:buildRegistro()},
        {id:"w3",fixed:false,title:"Reporte semanal",desc:"Ranking guerra actual",content:buildSemanal()},
        {id:"w4",fixed:false,title:"Ranking acumulado",desc:"Sin bonus de rango",content:buildAcumulado()},
        {id:"w5",fixed:false,title:"Aviso actividad minima",desc:"Para jugadores bajo 20 pts mensuales",content:"*[AOR] Aviso de actividad*\n\nEstas bajo el minimo mensual (20 pts). Registrate para la proxima guerra:\n https://aor-war-command.vercel.app/registro"},
        {id:"w6",fixed:false,title:"Bienvenida nuevo miembro",content:"*Bienvenido a [AOR] Antigua Orden!*\n\nhttps://aor-war-command.vercel.app/registro\nhttps://aor-war-command.vercel.app/reporte\nhttps://aor-war-command.vercel.app/puntos\n\nBuena suerte en batalla!"},
      ]);
    }
  }
  const [extraGame, setExtraGame] = useState([]);
  const [addModal,  setAddModal]  = useState(false);
  const [newTitle,  setNewTitle]  = useState("");
  const [newContent,setNewContent]= useState("");
  const [newType,   setNewType]   = useState("wa"); // "wa" or "game"

  function addMessage() {
    if (!newTitle.trim()) return;
    const item = {id: Date.now(), title: newTitle.trim(), content: newContent};
    if (newType === "wa") setExtraWa(prev=>[...prev, item]);
    else setExtraGame(prev=>[...prev, item]);
    setNewTitle(""); setNewContent(""); setAddModal(false);
  }

  function totalPtsLocal(p) {
    const sb=(p.pt_batallas_ganadas||0)>=6?10:0;
    return (p.pt_registro||0)+(p.pt_disponibilidad_declarada||0)+(p.pt_disponibilidad||0)
          +(p.pt_obediencia||0)+(p.pt_batallas_ganadas||0)*2+(p.pt_batallas_perdidas||0)
          +(p.pt_defensas||0)+(p.pt_bonus||0)+(p.pt_bandido_post||0)+(p.pt_stats||0)
          +(p.pt_whatsapp||0)+sb
          -(p.pt_penalizacion||0)-(p.pt_no_aparecio||0)
          -(p.pt_ignoro_orden||0)*2-(p.pt_abandono||0)*2-(p.pt_inactivo_4h||0)*3
          -(p.pt_fuera_castillo||0)*2-(p.pt_bandido_pre||0);
  }

  const waRegistrado   = waPlayers.filter(p=>p.registered_form);
  const waNoRegistrado = waPlayers.filter(p=>!p.registered_form);
  const NAME_COLORS = ["#FFD700","#40E0FF","#A8FF78","#FF9F43","#FF6B6B","#C8A2FF","#FF79C6","#8BE9FD","#FFB86C","#50FA7B","#F1FA8C","#BD93F9","#FF5555","#7EFFF5"];

  function buildWaRegistro() {
    let m = "*[AOR] Registro de Guerra — Grupo WA*\n\n";
    m += `*Confirmados del grupo (${waRegistrado.length}/${waPlayers.length}):*\n`;
    waRegistrado.sort((a,b)=>(b.level||0)-(a.level||0)).forEach(p=>{
      m += `✅ *${p.name}* | ${avMap[p.availability]||""} | ${((p.level||0)/1000).toFixed(1)}k poder\n`;
    });
    if(waNoRegistrado.length>0){
      m+=`\n*Sin registrar del grupo (${waNoRegistrado.length}):*\n`;
      waNoRegistrado.sort((a,b)=>(b.level||0)-(a.level||0)).forEach(p=>{
        m+=`⏳ *${p.name}* | ${((p.level||0)/1000).toFixed(1)}k poder\n`;
      });
    }
    return m + `\n📋 Regístrate: https://aor-war-command.vercel.app/registro`;
  }
  function buildRegistro() {
    const reg=allActive.filter(p=>p.registered_form).sort((a,b)=>b.bp-a.bp);
    const noReg=allActive.filter(p=>!p.registered_form).sort((a,b)=>b.bp-a.bp);
    let m="*[AOR] Registro de Guerra*\n\n";
    m+=`*Confirmados (${reg.length}):*\n`;
    reg.forEach(p=>{m+=`- *${p.name}* | ${avMap[p.availability]||""}\n`;});
    m+=`\n*Sin registrar (${noReg.length}):*\n`;
    noReg.forEach(p=>{m+=`- *${p.name}*\n`;});
    return m + `\n📋 Regístrate: https://aor-war-command.vercel.app/registro`;
  }
  function buildSemanal() {
    const sorted=[...allActive].sort((a,b)=>totalPtsLocal(b)-totalPtsLocal(a));
    let m="*[AOR] Reporte Semanal* ⚔\n\n";
    sorted.forEach((p,i)=>{const pts=totalPtsLocal(p);m+=`${i===0?"🥇":i===1?"🥈":i===2?"🥉":(i+1)+"."} *${p.name}* — ${pts>0?"+":""}${pts} pts\n`;});
    return m + `\n📊 Ranking: https://aor-war-command.vercel.app/reporte`;
  }
  function buildAcumulado() {
    const sorted=[...allActive].sort((a,b)=>(b.pts_acumulados||0)-(a.pts_acumulados||0));
    let m="*[AOR] Ranking Acumulado* 🏆\n_Sin bonificaciones de rango_\n\n";
    sorted.forEach((p,i)=>{m+=`${i===0?"🥇":i===1?"🥈":i===2?"🥉":(i+1)+"."} *${p.name}* — ${(p.pts_acumulados||0).toLocaleString()} pts\n`;});
    return m + `\n📊 Ver ranking: https://aor-war-command.vercel.app/reporte`;
  }

  return (
    <div style={{padding:"0 16px"}}>
      <div style={{fontFamily:"serif",color:"#25D366",fontSize:"14px",marginBottom:"12px"}}>📱 Mensajes para WhatsApp</div>
      {waCards.map((m,i)=><WaCard key={m.id||i} title={m.title} desc={m.desc} initialValue={m.content} onDelete={m.fixed?null:()=>setWaCards(prev=>prev.filter((_,j)=>j!==i))}/>)}
      {extraWa.map(m=><WaCard key={m.id} title={m.title} initialValue={m.content} onDelete={()=>setExtraWa(prev=>prev.filter(x=>x.id!==m.id))}/>)}
      <button onClick={()=>{setNewType("wa");setAddModal(true);}} style={{width:"100%",padding:"8px",background:"rgba(37,211,102,0.06)",border:"1px dashed rgba(37,211,102,0.25)",borderRadius:"8px",color:"rgba(37,211,102,0.5)",fontSize:"11px",cursor:"pointer",marginBottom:"8px"}}>+ Agregar mensaje WhatsApp</button>

      <div style={{fontFamily:"serif",color:"#FFD700",fontSize:"14px",marginBottom:"6px",marginTop:"20px"}}>📡 Propaganda — Mensajes para la página pública</div>
      <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"10px"}}>Estos 4 mensajes aparecen en <strong style={{color:"#FFD700"}}>/propaganda</strong>. Los miembros los copian y pegan en el chat del juego. Edita y guarda — se actualizan en tiempo real en la página pública.</div>
      <PropagandaCard slot={1}/>
      <PropagandaCard slot={2}/>
      <PropagandaCard slot={3}/>
      <PropagandaCard slot={4}/>

      <div style={{fontFamily:"serif",color:"#40E0FF",fontSize:"14px",marginBottom:"6px",marginTop:"20px"}}>⚔ Chat del juego</div>
      <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",marginBottom:"10px"}}>Máx 250 caracteres · ✏ Editar para modificar · 💾 Guardar confirma cambios</div>
      <GameCard title="Defensa urgente"        initialValue={"<color=#FF6B6B>-- [AOR] ALERTA --</color>\nCastillo bajo ataque. Todos a defender.\n<color=#FFD700>Antigua Orden</color> no cede territorio."}/>
      <GameCard title="Inicio de guerra"              initialValue={"<color=#FFD700>-- [AOR] GUERRA --</color>\n<color=#40E0FF>Antigua Orden</color> entra en combate.\nFase 1: capturar castillos. Sin descanso."}/>
      <GameCard title="Victoria"                     initialValue={"<color=#FFD700>-- [AOR] VICTORIA --</color>\n<color=#40E0FF>Antigua Orden</color> domina la guerra.\nGracias a cada guerrero comprometido."}/>
      <GameCard title="Registrate antes del viernes (interno)" initialValue={"<color=#FFD700>[AOR]</color> Registrate antes del viernes.\n<color=#40E0FF>Antigua Orden</color> cuenta contigo.\nhttps://aor-war-command.vercel.app/registro"}/>
      <GameCard title="Sin registro pierdes 20 puntos"        initialValue={"<color=#FF6B6B>[AOR] AVISO:</color> Sin registro pierdes 20 puntos.\n<color=#FFD700>Antigua Orden</color> necesita tu compromiso.\nhttps://aor-war-command.vercel.app/registro"}/>
      <GameCard title="Unirse al grupo WhatsApp"     initialValue={"<color=#FFD700>[AOR]</color> Unete al grupo de <color=#40E0FF>Antigua Orden</color>.\nBonus de 25 puntos al unirte.\nPide el enlace a un oficial."}/>

      {extraGame.map(m=><GameCard key={m.id} title={m.title} initialValue={m.content} onDelete={()=>setExtraGame(prev=>prev.filter(x=>x.id!==m.id))}/>)}
      <button onClick={()=>{setNewType("game");setAddModal(true);}} style={{width:"100%",padding:"8px",background:"rgba(64,224,255,0.06)",border:"1px dashed rgba(64,224,255,0.25)",borderRadius:"8px",color:"rgba(64,224,255,0.5)",fontSize:"11px",cursor:"pointer",marginBottom:"8px"}}>+ Agregar mensaje chat del juego</button>

      {noWaPlayers.length > 0 && (
        <div style={{marginTop:"16px"}}>
          <div style={{fontFamily:"serif",color:"#FF9F43",fontSize:"13px",marginBottom:"4px"}}>📵 Invitaciones WA individuales ({noWaPlayers.length} sin grupo)</div>
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",marginBottom:"8px"}}>Se actualizan automáticamente según el estado WA en el Roster · ✏ Editar para personalizar</div>
          {noWaPlayers.map((p,i)=>{
            const nc = NAME_COLORS[i % NAME_COLORS.length];
            const def = `<color=${nc}>[AOR] ${p.name}</color> unete al whatsapp del clan, escribe a <color=#40E0FF>Punk'z +52 771 140 4402</color> y confirma participacion en guerra de clanes en <color=#FFD700>aor-war-command.vercel.app/registro</color>`;
            return <InviteCard key={p.id} name={p.name} initialValue={def}/>;
          })}
        </div>
      )}

      <div style={{fontFamily:"serif",color:"#FF6B6B",fontSize:"14px",marginBottom:"6px",marginTop:"24px"}}>🔥 Reclutamiento externo — Español</div>
      <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",marginBottom:"10px"}}>Chat general del juego · Sin link de la app · Máx 250 caracteres</div>
      <GameCard title="📣 Reclutamiento general [ES]" initialValue={"<color=#FFD700>-- [AOR] CLAN ACTIVO --</color>\nBuscas clan organizado con guerras reales?\n<color=#40E0FF>Antigua Orden</color> tiene rangos y estrategia."}/>
      <GameCard title="📣 Reclutamiento corto [ES]" initialValue={"<color=#FFD700>[AOR]</color> <color=#40E0FF>Antigua Orden</color>\nClan activo con guerras semanales.\nEscribenos para ingresar."}/>
      <GameCard title="📣 Élite [ES]" initialValue={"<color=#FFD700>-- ANTIGUA ORDEN --</color>\n<color=#40E0FF>Clan de elite [AOR]</color>\nBuscamos guerreros comprometidos con la victoria."}/>
      <GameCard title="📣 Post-victoria [ES]" initialValue={"<color=#FFD700>[AOR]</color> <color=#40E0FF>Antigua Orden</color> sigue invicta.\nBuscamos nuevos guerreros para la siguiente batalla.\nEscribe a un oficial."}/>

      <div style={{fontFamily:"serif",color:"#FF6B6B",fontSize:"14px",marginBottom:"6px",marginTop:"20px"}}>🔥 Recruitment — English</div>
      <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",marginBottom:"10px"}}>For general game chat · No app link · Max 250 chars</div>
      <GameCard title="📣 General recruitment [EN]" initialValue={"<color=#FFD700>-- [AOR] ACTIVE CLAN --</color>\nLooking for organized clan with real wars?\n<color=#40E0FF>Antigua Orden</color> has ranks and strategy."}/>
      <GameCard title="📣 Short recruitment [EN]" initialValue={"<color=#FFD700>[AOR]</color> <color=#40E0FF>Antigua Orden</color>\nActive clan - weekly wars.\nMessage us to join."}/>
      <GameCard title="📣 Elite style [EN]" initialValue={"<color=#FFD700>-- ANTIGUA ORDEN --</color>\n<color=#40E0FF>Elite clan [AOR]</color>\nSeeking committed warriors. Real battles."}/>
      <GameCard title="📣 Post-victory [EN]" initialValue={"<color=#FFD700>[AOR]</color> <color=#40E0FF>Antigua Orden</color> wins again.\nLooking for new warriors. Next battle incoming.\nContact an officer."}/>

      <div style={{fontFamily:"serif",color:"#FF9F43",fontSize:"14px",marginBottom:"6px",marginTop:"24px"}}>📨 Mensajes múltiples (hasta 4 seguidos)</div>
      <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",marginBottom:"10px"}}>Pega uno por uno con pausa breve entre cada uno para que no se fusionen en un solo globo · Máx 250 c/u</div>

      <div style={{background:"rgba(255,159,67,0.04)",border:"1px solid rgba(255,159,67,0.2)",borderRadius:"10px",padding:"14px",marginBottom:"12px"}}>
        <div style={{fontSize:"12px",color:"#FF9F43",fontWeight:"bold",marginBottom:"10px"}}>🇪🇸 Reclutamiento 4 partes (ES)</div>
        <GameCard title="Parte 1/4 [ES]" initialValue={"<color=#FFD700>-- ANTIGUA ORDEN [AOR] --</color>\nClan organizado con guerras semanales.\nSistema de rangos y puntos."}/>
        <GameCard title="Parte 2/4 [ES]" initialValue={"<color=#FFD700>[AOR]</color> Buscamos jugadores activos.\n<color=#40E0FF>Antigua Orden</color> comprometidos con la guerra.\nCada batalla cuenta para tu rango."}/>
        <GameCard title="Parte 3/4 [ES]" initialValue={"<color=#40E0FF>Que ofrece Antigua Orden:</color>\n<color=#FFD700>Estrategia coordinada</color>\nDefensa organizada y sistema de rangos."}/>
        <GameCard title="Parte 4/4 [ES]" initialValue={"<color=#40E0FF>Antigua Orden [AOR]</color>\n<color=#FFD700>Listo para unirte?</color>\nEscribenos o habla con un oficial."}/>
      </div>

      <div style={{background:"rgba(255,159,67,0.04)",border:"1px solid rgba(255,159,67,0.2)",borderRadius:"10px",padding:"14px",marginBottom:"12px"}}>
        <div style={{fontSize:"12px",color:"#FF9F43",fontWeight:"bold",marginBottom:"10px"}}>🇬🇧 Recruitment 4 parts (EN)</div>
        <GameCard title="Part 1/4 [EN]" initialValue={"<color=#FFD700>-- ANTIGUA ORDEN [AOR] --</color>\nOrganized clan with weekly wars.\nRank and points system."}/>
        <GameCard title="Part 2/4 [EN]" initialValue={"<color=#FFD700>[AOR]</color> Seeking active players.\n<color=#40E0FF>Antigua Orden</color> committed to war.\nEvery battle counts for your rank."}/>
        <GameCard title="Part 3/4 [EN]" initialValue={"<color=#40E0FF>What Antigua Orden offers:</color>\n<color=#FFD700>Coordinated strategy</color>\nOrganized defense and rank system."}/>
        <GameCard title="Part 4/4 [EN]" initialValue={"<color=#40E0FF>Antigua Orden [AOR]</color>\n<color=#FFD700>Ready to join?</color>\nMessage us or contact an officer."}/>
      </div>
    </div>
  );
}


// ── Visits Tab ──────────────────────────────────────────────────────────────

// ── User Activity Table ─────────────────────────────────────────────────────
function UserActivityTable({logs}) {
  const [expanded, setExpanded] = useState(null);

  // Group by player_name (from message_logs embedded in visits via player session)
  // We use session_id to link visits + player names from message_logs
  // For now: show all named activities from message_logs
  const [msgLogs, setMsgLogs] = useState([]);
  const [regLogs, setRegLogs] = useState([]);
  const [voteLogs, setVoteLogs] = useState([]);
  const [assemblyLogs, setAssemblyLogs] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(()=>{
    Promise.all([
      supabase.from("message_logs").select("*").order("created_at",{ascending:false}).limit(500),
      supabase.from("players").select("id,name,registered_week,pt_stats,pts_acumulados,bp,level").eq("active",true),
      supabase.from("difficulty_votes").select("*").order("created_at",{ascending:false}).limit(200),
      supabase.from("assembly_votes").select("*").order("created_at",{ascending:false}).limit(200),
    ]).then(([m,p,d,av])=>{
      setMsgLogs(m.data||[]);
      setRegLogs(p.data||[]);
      setVoteLogs(d.data||[]);
      setAssemblyLogs(av.data||[]);
      setLoaded(true);
    });
  },[]);

  if (!loaded) return <div style={{fontSize:"10px",color:"rgba(255,255,255,0.3)",marginTop:"12px"}}>Cargando actividad por usuario...</div>;

  // Build per-player activity summary
  const playerMap = {};
  regLogs.forEach(p=>{
    if (!playerMap[p.name]) playerMap[p.name]={name:p.name,registros:0,bp_updates:0,propaganda:0,diff_votes:0,assembly_votes:0,pts_acumulados:p.pts_acumulados||0};
    playerMap[p.name].registered_week = p.registered_week;
    playerMap[p.name].bp = p.bp;
    playerMap[p.name].level = p.level;
  });
  msgLogs.forEach(m=>{
    if (!playerMap[m.player_name]) playerMap[m.player_name]={name:m.player_name,registros:0,bp_updates:0,propaganda:0,diff_votes:0,assembly_votes:0};
    playerMap[m.player_name].propaganda = (playerMap[m.player_name].propaganda||0)+1;
  });
  voteLogs.forEach(v=>{
    if (!playerMap[v.player_name]) playerMap[v.player_name]={name:v.player_name,registros:0,bp_updates:0,propaganda:0,diff_votes:0,assembly_votes:0};
    playerMap[v.player_name].diff_votes = (playerMap[v.player_name].diff_votes||0)+1;
  });
  assemblyLogs.forEach(v=>{
    if (!playerMap[v.voter_name]) playerMap[v.voter_name]={name:v.voter_name,registros:0,bp_updates:0,propaganda:0,diff_votes:0,assembly_votes:0};
    playerMap[v.voter_name].assembly_votes = (playerMap[v.voter_name].assembly_votes||0)+1;
  });

  const players = Object.values(playerMap).filter(p=>p.propaganda>0||p.diff_votes>0||p.assembly_votes>0||p.registered_week);
  const sorted = players.sort((a,b)=>((b.propaganda||0)+(b.diff_votes||0)+(b.assembly_votes||0))-((a.propaganda||0)+(a.diff_votes||0)+(a.assembly_votes||0)));

  if (sorted.length===0) return null;

  return (
    <div style={{marginTop:"20px"}}>
      <div style={{fontFamily:"serif",color:"rgba(255,255,255,0.6)",fontSize:"12px",marginBottom:"8px"}}>Actividad registrada por usuario (solo usuarios identificados)</div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"10px"}}>
          <thead>
            <tr style={{borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
              <th style={{textAlign:"left",color:"rgba(255,255,255,0.4)",padding:"4px 8px",fontWeight:"normal"}}>Jugador</th>
              <th style={{textAlign:"center",color:"#C8A2FF",padding:"4px 8px",fontWeight:"normal"}}>Propaganda</th>
              <th style={{textAlign:"center",color:"#FF6B6B",padding:"4px 8px",fontWeight:"normal"}}>Inteligencia</th>
              <th style={{textAlign:"center",color:"#FFD700",padding:"4px 8px",fontWeight:"normal"}}>Asamblea</th>
              <th style={{textAlign:"center",color:"#A8FF78",padding:"4px 8px",fontWeight:"normal"}}>Registrado</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(p=>(
              <tr key={p.name} style={{borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
                <td style={{color:"rgba(255,255,255,0.6)",padding:"5px 8px",fontWeight:"bold"}}>{p.name}</td>
                <td style={{textAlign:"center",color:p.propaganda?"#C8A2FF":"rgba(255,255,255,0.15)",padding:"5px 8px",fontWeight:p.propaganda?"bold":"normal"}}>{p.propaganda||"—"}</td>
                <td style={{textAlign:"center",color:p.diff_votes?"#FF6B6B":"rgba(255,255,255,0.15)",padding:"5px 8px",fontWeight:p.diff_votes?"bold":"normal"}}>{p.diff_votes||"—"}</td>
                <td style={{textAlign:"center",color:p.assembly_votes?"#FFD700":"rgba(255,255,255,0.15)",padding:"5px 8px",fontWeight:p.assembly_votes?"bold":"normal"}}>{p.assembly_votes||"—"}</td>
                <td style={{textAlign:"center",color:p.registered_week?"#A8FF78":"rgba(255,255,255,0.15)",padding:"5px 8px",fontFamily:"monospace"}}>{p.registered_week||"—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VisitsTab() {
  const [visits, setVisits]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("page_visits")
      .select("*")
      .order("visited_at", {ascending: false})
      .limit(2000)
      .then(({data}) => { setVisits(data || []); setLoading(false); });
  }, []);

  if (loading) return <div style={{padding:"20px",color:"rgba(255,255,255,0.4)"}}>Cargando visitas...</div>;
  if (visits.length === 0) return (
    <div style={{padding:"20px",fontSize:"12px",color:"rgba(255,255,255,0.4)",textAlign:"center"}}>
      <div style={{marginBottom:"8px"}}>Sin datos todavía.</div>
      <div style={{fontSize:"10px"}}>Las visitas se registran automáticamente al abrir cualquier página.</div>
    </div>
  );

  const pages      = ["/registro","/reporte","/puntos","/"];
  const pageLabels = {"/registro":"📋 Registro","/reporte":"📊 Reporte","/puntos":"❓ Puntos","/":"⚙ Admin"};
  const pageColors = {"/registro":"#A8FF78","/reporte":"#40E0FF","/puntos":"#FFD700","/":"#FF9F43"};

  // ── Aggregate data ──────────────────────────────────────────────────────
  const today     = new Date().toISOString().slice(0,10);
  const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);

  // Group visits by session_id
  const sessionMap = {}; // sid -> {pages:Set, count, firstVisit, lastVisit}
  const byPage  = {};
  const byDay   = {}; // day -> {page -> {visits, sessions:Set}}

  visits.forEach(v => {
    const pg  = v.page || "/";
    const day = (v.visited_at||"").slice(0,10);
    const sid = v.session_id || "anon_"+day;

    // byPage totals
    byPage[pg] = (byPage[pg]||0) + 1;

    // byDay: track both visit count and unique sessions
    if (!byDay[day]) byDay[day] = {};
    if (!byDay[day][pg]) byDay[day][pg] = {visits:0, sessions:new Set()};
    byDay[day][pg].visits++;
    if (v.session_id) byDay[day][pg].sessions.add(v.session_id);

    // sessionMap
    if (!sessionMap[sid]) sessionMap[sid] = {pages:new Set(), count:0, first:day, last:day};
    sessionMap[sid].pages.add(pg);
    sessionMap[sid].count++;
    if (day > sessionMap[sid].last) sessionMap[sid].last = day;
  });

  const allSessions   = Object.values(sessionMap);
  const totalVisits   = visits.length;
  const uniqueSessions = allSessions.length;
  const returning     = allSessions.filter(s => s.count > 1).length;
  const multiPage     = allSessions.filter(s => s.pages.size > 1).length;
  const avgPerSession = uniqueSessions > 0 ? (totalVisits / uniqueSessions).toFixed(1) : 0;

  // Today vs yesterday
  const todayVisits  = visits.filter(v=>(v.visited_at||"").slice(0,10)===today).length;
  const ydayVisits   = visits.filter(v=>(v.visited_at||"").slice(0,10)===yesterday).length;
  const todaySessions = new Set(visits.filter(v=>(v.visited_at||"").slice(0,10)===today && v.session_id).map(v=>v.session_id)).size;

  // Page unique sessions
  const pageUniq = {};
  pages.forEach(pg => {
    pageUniq[pg] = new Set(visits.filter(v=>(v.page||"/")=== pg && v.session_id).map(v=>v.session_id)).size;
  });

  // Cross-page journey: how many sessions visited both registration AND report
  const regAndReport = allSessions.filter(s=>s.pages.has("/registro")&&s.pages.has("/reporte")).length;

  // Days sorted
  const days = Object.keys(byDay).sort().reverse().slice(0,14);

  const StatCard = ({label, value, sub, color="#FFD700", bg="rgba(255,215,0,0.06)", border="rgba(255,215,0,0.2)"}) => (
    <div style={{flex:1,minWidth:"70px",background:bg,border:"1px solid "+border,borderRadius:"8px",padding:"10px 8px",textAlign:"center"}}>
      <div style={{fontSize:"9px",color:color,fontWeight:"bold",marginBottom:"2px",opacity:0.8}}>{label}</div>
      <div style={{fontSize:"20px",color,fontWeight:"bold",lineHeight:1}}>{value}</div>
      {sub&&<div style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",marginTop:"3px"}}>{sub}</div>}
    </div>
  );

  return (
    <div style={{padding:"0 16px"}}>
      <div style={{fontFamily:"serif",color:"#FFD700",fontSize:"14px",marginBottom:"12px"}}>👁 Visitas a la app</div>

      {/* KPI row */}
      <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"12px"}}>
        <StatCard label="TOTAL CARGAS" value={totalVisits} sub="todas las páginas"/>
        <StatCard label="SESIONES ÚNICAS" value={uniqueSessions} sub="dispositivos distintos" color="#A8FF78" bg="rgba(168,255,120,0.06)" border="rgba(168,255,120,0.2)"/>
        <StatCard label="RECURRENTES" value={returning} sub="volvieron ≥2 veces" color="#40E0FF" bg="rgba(64,224,255,0.06)" border="rgba(64,224,255,0.2)"/>
        <StatCard label="MULTIPÁGINA" value={multiPage} sub="visitaron 2+ secciones" color="#C8A2FF" bg="rgba(200,162,255,0.06)" border="rgba(200,162,255,0.2)"/>
        <StatCard label="PROM/SESIÓN" value={avgPerSession} sub="páginas por visita" color="#FF9F43" bg="rgba(255,159,67,0.06)" border="rgba(255,159,67,0.2)"/>
      </div>

      {/* Today highlight */}
      <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"8px",padding:"10px 14px",marginBottom:"12px",display:"flex",gap:"16px",alignItems:"center",flexWrap:"wrap"}}>
        <div style={{fontSize:"11px",color:"rgba(255,255,255,0.4)"}}>📅 Hoy</div>
        <div><span style={{fontSize:"16px",color:"#FFD700",fontWeight:"bold"}}>{todayVisits}</span><span style={{fontSize:"10px",color:"rgba(255,255,255,0.3)",marginLeft:"4px"}}>cargas</span></div>
        <div><span style={{fontSize:"16px",color:"#A8FF78",fontWeight:"bold"}}>{todaySessions}</span><span style={{fontSize:"10px",color:"rgba(255,255,255,0.3)",marginLeft:"4px"}}>sesiones únicas</span></div>
        <div style={{fontSize:"10px",color:"rgba(255,255,255,0.3)"}}>Ayer: {ydayVisits} cargas</div>
        {regAndReport>0&&<div style={{fontSize:"10px",color:"#40E0FF"}}>🔗 {regAndReport} sesión{regAndReport>1?"es":""} visitó Registro+Reporte</div>}
      </div>

      {/* Per page: visits + unique sessions */}
      <div style={{fontFamily:"serif",color:"rgba(255,255,255,0.6)",fontSize:"12px",marginBottom:"8px"}}>Por página — visitas / sesiones únicas</div>
      <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"16px"}}>
        {pages.map(pg=>(
          <div key={pg} style={{flex:1,minWidth:"80px",background:(pageColors[pg])+"0A",border:"1px solid "+(pageColors[pg])+"33",borderRadius:"8px",padding:"10px 8px",textAlign:"center"}}>
            <div style={{fontSize:"10px",color:pageColors[pg],fontWeight:"bold",marginBottom:"6px"}}>{pageLabels[pg]}</div>
            <div style={{fontSize:"18px",color:pageColors[pg],fontWeight:"bold"}}>{byPage[pg]||0}</div>
            <div style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",marginBottom:"4px"}}>cargas</div>
            <div style={{borderTop:"1px solid "+(pageColors[pg])+"22",paddingTop:"4px"}}>
              <div style={{fontSize:"14px",color:pageColors[pg],fontWeight:"bold",opacity:0.7}}>{pageUniq[pg]||0}</div>
              <div style={{fontSize:"9px",color:"rgba(255,255,255,0.25)"}}>sesiones únicas</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Journey analytics ─────────────────────────────────────── */}
      {(() => {
        // Reconstruct ordered paths per session using sorted visits
        const sorted = [...visits].sort((a,b)=>(a.visited_at||"").localeCompare(b.visited_at||""));
        const sessionPaths = {}; // sid -> [page, page, ...]
        sorted.forEach(v => {
          const sid = v.session_id || ("anon_"+(v.visited_at||"").slice(0,10));
          const pg  = v.page || "/";
          if (!sessionPaths[sid]) sessionPaths[sid] = [];
          const last = sessionPaths[sid][sessionPaths[sid].length-1];
          if (last !== pg) sessionPaths[sid].push(pg); // deduplicate consecutive same-page
        });

        const paths = Object.values(sessionPaths).filter(p=>p.length>0);

        // Entry points
        const entries = {};
        paths.forEach(path => { entries[path[0]] = (entries[path[0]]||0)+1; });
        const entriesTotal = Object.values(entries).reduce((s,v)=>s+v,0);
        const entriesSorted = Object.entries(entries).sort((a,b)=>b[1]-a[1]);

        // Exit points
        const exits = {};
        paths.forEach(path => { const last=path[path.length-1]; exits[last]=(exits[last]||0)+1; });
        const exitsSorted = Object.entries(exits).sort((a,b)=>b[1]-a[1]);

        // 2-step transitions
        const trans2 = {};
        paths.forEach(path => {
          for (let i=0; i<path.length-1; i++) {
            const key = path[i]+" → "+path[i+1];
            trans2[key] = (trans2[key]||0)+1;
          }
        });
        const trans2Sorted = Object.entries(trans2).sort((a,b)=>b[1]-a[1]).slice(0,8);

        // 3-step paths (full journeys)
        const paths3 = {};
        paths.filter(p=>p.length>=2).forEach(path => {
          const key = path.slice(0,3).join(" → ");
          paths3[key] = (paths3[key]||0)+1;
        });
        const paths3Sorted = Object.entries(paths3).sort((a,b)=>b[1]-a[1]).slice(0,6);

        const pLabel = pg => pageLabels[pg] || pg;
        const pColor = pg => pageColors[pg] || "#888";
        const pct = (v,t) => t>0 ? Math.round(v/t*100) : 0;

        return (
          <>
            {/* Entry points */}
            <div style={{fontFamily:"serif",color:"rgba(255,255,255,0.6)",fontSize:"12px",marginBottom:"8px",marginTop:"4px"}}>
              🚪 Punto de entrada — ¿por dónde llegan?
            </div>
            <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",padding:"12px",marginBottom:"14px"}}>
              {entriesSorted.map(([pg,n])=>(
                <div key={pg} style={{marginBottom:"8px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:"11px",marginBottom:"3px"}}>
                    <span style={{color:pColor(pg),fontWeight:"bold"}}>{pLabel(pg)}</span>
                    <span style={{color:"rgba(255,255,255,0.5)"}}>{n} sesiones · <strong style={{color:pColor(pg)}}>{pct(n,entriesTotal)}%</strong></span>
                  </div>
                  <div style={{height:"6px",background:"rgba(255,255,255,0.06)",borderRadius:"3px",overflow:"hidden"}}>
                    <div style={{height:"100%",width:pct(n,entriesTotal)+"%",background:pColor(pg),borderRadius:"3px",transition:"width 0.4s"}}/>
                  </div>
                </div>
              ))}
            </div>

            {/* Common transitions */}
            {trans2Sorted.length > 0 && (
              <>
                <div style={{fontFamily:"serif",color:"rgba(255,255,255,0.6)",fontSize:"12px",marginBottom:"8px"}}>
                  🔀 Transiciones más comunes — de dónde a dónde van
                </div>
                <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",padding:"12px",marginBottom:"14px"}}>
                  {trans2Sorted.map(([key,n])=>{
                    const [from,to] = key.split(" → ");
                    return (
                      <div key={key} style={{display:"flex",alignItems:"center",gap:"6px",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                        <span style={{fontSize:"11px",color:pColor(from),fontWeight:"bold",minWidth:"80px"}}>{pLabel(from)}</span>
                        <span style={{fontSize:"12px",color:"rgba(255,255,255,0.2)"}}>→</span>
                        <span style={{fontSize:"11px",color:pColor(to),fontWeight:"bold",flex:1}}>{pLabel(to)}</span>
                        <span style={{fontSize:"11px",color:"rgba(255,255,255,0.4)",background:"rgba(255,255,255,0.05)",padding:"2px 8px",borderRadius:"10px",flexShrink:0}}>{n}x</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Full journeys */}
            {paths3Sorted.length > 0 && (
              <>
                <div style={{fontFamily:"serif",color:"rgba(255,255,255,0.6)",fontSize:"12px",marginBottom:"8px"}}>
                  🗺 Recorridos más frecuentes (top 6)
                </div>
                <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",padding:"12px",marginBottom:"14px"}}>
                  {paths3Sorted.map(([key,n],i)=>{
                    const steps = key.split(" → ");
                    return (
                      <div key={key} style={{display:"flex",alignItems:"center",gap:"4px",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",flexWrap:"wrap"}}>
                        <span style={{fontSize:"10px",color:"rgba(255,255,255,0.2)",minWidth:"16px"}}>{i+1}.</span>
                        {steps.map((pg,j)=>(
                          <span key={j} style={{display:"flex",alignItems:"center",gap:"4px"}}>
                            <span style={{fontSize:"10px",color:pColor(pg),background:pColor(pg)+"15",border:"1px solid "+pColor(pg)+"30",padding:"2px 7px",borderRadius:"10px",fontWeight:"bold"}}>{pLabel(pg)}</span>
                            {j<steps.length-1 && <span style={{fontSize:"10px",color:"rgba(255,255,255,0.2)"}}>→</span>}
                          </span>
                        ))}
                        <span style={{marginLeft:"auto",fontSize:"11px",color:"rgba(255,255,255,0.4)",flexShrink:0}}>{n}x</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Exit points */}
            <div style={{fontFamily:"serif",color:"rgba(255,255,255,0.6)",fontSize:"12px",marginBottom:"8px"}}>
              🏁 Página de salida — dónde terminan la sesión
            </div>
            <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",padding:"12px",marginBottom:"14px"}}>
              {exitsSorted.map(([pg,n])=>(
                <div key={pg} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  <span style={{fontSize:"11px",color:pColor(pg),fontWeight:"bold"}}>{pLabel(pg)}</span>
                  <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                    <div style={{width:"60px",height:"4px",background:"rgba(255,255,255,0.06)",borderRadius:"2px",overflow:"hidden"}}>
                      <div style={{height:"100%",width:pct(n,paths.length)+"%",background:pColor(pg),borderRadius:"2px"}}/>
                    </div>
                    <span style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",minWidth:"30px",textAlign:"right"}}>{n}x</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        );
      })()}

      {/* Daily table: visits + sessions per day */}
      <div style={{fontFamily:"serif",color:"rgba(255,255,255,0.6)",fontSize:"12px",marginBottom:"8px"}}>Últimas 2 semanas</div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"10px"}}>
          <thead>
            <tr style={{borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
              <th style={{textAlign:"left",color:"rgba(255,255,255,0.4)",padding:"4px 6px",fontWeight:"normal"}}>Fecha</th>
              {pages.map(pg=>(
                <th key={pg} style={{textAlign:"center",color:pageColors[pg],padding:"4px 6px",fontWeight:"normal"}}>{pageLabels[pg]}</th>
              ))}
              <th style={{textAlign:"center",color:"rgba(255,255,255,0.4)",padding:"4px 6px",fontWeight:"normal"}}>Total</th>
              <th style={{textAlign:"center",color:"#A8FF78",padding:"4px 6px",fontWeight:"normal"}}>👤 Únicos</th>
            </tr>
          </thead>
          <tbody>
            {days.map(day => {
              const dayVisits  = pages.reduce((s,pg)=>s+(byDay[day][pg]?.visits||0),0);
              const dayUniq    = new Set(
                visits.filter(v=>(v.visited_at||"").slice(0,10)===day && v.session_id).map(v=>v.session_id)
              ).size;
              const isToday    = day === today;
              return (
                <tr key={day} style={{borderBottom:"1px solid rgba(255,255,255,0.04)",background:isToday?"rgba(255,215,0,0.04)":"transparent"}}>
                  <td style={{color:isToday?"#FFD700":"rgba(255,255,255,0.5)",padding:"5px 6px",fontWeight:isToday?"bold":"normal"}}>{day}{isToday?" ●":""}</td>
                  {pages.map(pg=>{
                    const v = byDay[day][pg]?.visits || 0;
                    const u = byDay[day][pg]?.sessions.size || 0;
                    return (
                      <td key={pg} style={{textAlign:"center",padding:"5px 6px"}}>
                        {v>0
                          ? <><span style={{color:pageColors[pg],fontWeight:"bold"}}>{v}</span><span style={{color:"rgba(255,255,255,0.25)",fontSize:"9px"}}> /{u}</span></>
                          : <span style={{color:"rgba(255,255,255,0.12)"}}>—</span>
                        }
                      </td>
                    );
                  })}
                  <td style={{textAlign:"center",color:"rgba(255,255,255,0.5)",padding:"5px 6px",fontWeight:"bold"}}>{dayVisits}</td>
                  <td style={{textAlign:"center",color:"#A8FF78",padding:"5px 6px",fontWeight:"bold"}}>{dayUniq||"—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{fontSize:"9px",color:"rgba(255,255,255,0.2)",marginTop:"10px"}}>
        Cargas / Únicos · Sesión = un dispositivo/navegador · Recurrente = volvió 2+ veces · Multipágina = visitó 2+ secciones
      </div>

      {/* Per-user named activity */}
      <UserActivityTable logs={visits}/>
    </div>
  );
}



// ── Heroic Points Button ───────────────────────────────────────────────────
function HeroicPointsButton({players, update, reload}) {
  const [open, setOpen]     = useState(false);
  const [selected, setSel]  = useState({});
  const [pts, setPts]       = useState("50");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState("");

  const active = players.filter(p=>p.active);

  function toggleAll(v) {
    const next = {};
    if (v) active.forEach(p=>{ next[p.id]=true; });
    setSel(next);
  }

  async function apply() {
    const chosen = active.filter(p=>selected[p.id]);
    if (!chosen.length) { setMsg("Selecciona al menos un jugador"); return; }
    const n = parseInt(pts)||0;
    if (!n) { setMsg("Ingresa puntos válidos"); return; }
    if (!confirm("¿Asignar +" + n + " pts a " + chosen.length + " jugador(es)" + (reason?" por: "+reason:"") + "?")) return;
    setSaving(true);
    for (const p of chosen) {
      await update(p.id, {pts_acumulados: (p.pts_acumulados||0) + n});
    }
    await reload();
    setMsg(`✓ +${n} pts asignados a ${chosen.length} jugador(es)`);
    setSaving(false);
    setSel({});
    setTimeout(()=>setMsg(""),4000);
  }

  return (
    <>
      <button onClick={()=>setOpen(true)} style={{padding:"6px 12px",background:"rgba(255,215,0,0.1)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:"6px",color:"#FFD700",fontSize:"11px",cursor:"pointer"}}>
        ⭐ Gestas heroicas
      </button>

      {open && (
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.85)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}>
          <div style={{background:"#0d0d0f",border:"1px solid rgba(255,215,0,0.3)",borderRadius:"12px",padding:"20px",width:"100%",maxWidth:"420px",maxHeight:"90vh",overflow:"auto"}}>
            <div style={{fontFamily:"serif",color:"#FFD700",fontSize:"16px",marginBottom:"4px"}}>⭐ Gestas heroicas</div>
            <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",marginBottom:"14px"}}>Asigna puntos a uno o varios jugadores por logros extraordinarios</div>

            <div style={{display:"flex",gap:"8px",marginBottom:"12px"}}>
              <div style={{flex:1}}>
                <div style={{fontSize:"9px",color:"rgba(255,255,255,0.4)",marginBottom:"3px"}}>Puntos a asignar</div>
                <input value={pts} onChange={e=>setPts(e.target.value)} type="number" style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:"6px",color:"#FFD700",padding:"7px 10px",fontSize:"16px",outline:"none",boxSizing:"border-box",fontWeight:"bold"}}/>
              </div>
              <div style={{flex:2}}>
                <div style={{fontSize:"9px",color:"rgba(255,255,255,0.4)",marginBottom:"3px"}}>Motivo (opcional)</div>
                <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="ej: Defensa épica del castillo" style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"6px",color:"#d4c9a8",padding:"7px 10px",fontSize:"11px",outline:"none",boxSizing:"border-box"}}/>
              </div>
            </div>

            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
              <div style={{fontSize:"11px",color:"rgba(255,255,255,0.5)"}}>Seleccionar jugadores:</div>
              <div style={{display:"flex",gap:"6px"}}>
                <button onClick={()=>toggleAll(true)} style={{padding:"2px 8px",fontSize:"9px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"4px",color:"rgba(255,255,255,0.4)",cursor:"pointer"}}>Todos</button>
                <button onClick={()=>toggleAll(false)} style={{padding:"2px 8px",fontSize:"9px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"4px",color:"rgba(255,255,255,0.4)",cursor:"pointer"}}>Ninguno</button>
              </div>
            </div>

            <div style={{maxHeight:"240px",overflow:"auto",marginBottom:"12px"}}>
              {active.sort((a,b)=>a.name.localeCompare(b.name)).map(p=>(
                <div key={p.id} onClick={()=>setSel(s=>({...s,[p.id]:!s[p.id]}))}
                  style={{display:"flex",alignItems:"center",gap:"10px",padding:"7px 10px",marginBottom:"3px",borderRadius:"6px",cursor:"pointer",background:selected[p.id]?"rgba(255,215,0,0.1)":"rgba(255,255,255,0.02)",border:"1px solid "+(selected[p.id]?"rgba(255,215,0,0.3)":"rgba(255,255,255,0.05)")}}>
                  <div style={{width:"16px",height:"16px",borderRadius:"3px",border:"1px solid "+(selected[p.id]?"#FFD700":"rgba(255,255,255,0.2)"),background:selected[p.id]?"#FFD700":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {selected[p.id] && <span style={{color:"#000",fontSize:"10px",fontWeight:"bold"}}>✓</span>}
                  </div>
                  <span style={{fontSize:"12px",color:selected[p.id]?"#FFD700":"rgba(255,255,255,0.6)",flex:1}}>{p.name}</span>
                  <span style={{fontSize:"10px",color:"rgba(255,255,255,0.3)"}}>{(p.pts_acumulados||0)} pts</span>
                </div>
              ))}
            </div>

            {msg && <div style={{fontSize:"11px",color:msg.startsWith("✓")?"#A8FF78":"#FF6B6B",marginBottom:"8px"}}>{msg}</div>}

            <div style={{display:"flex",gap:"8px"}}>
              <button onClick={apply} disabled={saving} style={{flex:1,padding:"9px",background:"rgba(255,215,0,0.15)",border:"1px solid rgba(255,215,0,0.3)",borderRadius:"6px",color:"#FFD700",fontSize:"12px",cursor:"pointer",fontWeight:"bold"}}>
                {saving?"Asignando...":"⭐ Asignar "+pts+" pts a "+Object.values(selected).filter(Boolean).length+" jugador(es)"}
              </button>
              <button onClick={()=>{setOpen(false);setSel({});setMsg("");}} style={{padding:"9px 14px",background:"rgba(255,107,107,0.1)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:"6px",color:"#FF6B6B",fontSize:"12px",cursor:"pointer"}}>✕</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Seguridad Tab (includes Snapshots + security audit) ────────────────────
function SeguridadTab({players}) {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [restoring, setRestoring] = useState(null);
  const [label, setLabel]         = useState("");
  const [msg, setMsg]             = useState("");

  useEffect(()=>{ loadSnapshots(); },[]);

  async function loadSnapshots() {
    try {
      const {data, error} = await supabase.from("player_snapshots")
        .select("id,created_at,label,player_count")
        .order("created_at",{ascending:false}).limit(20);
      if (error) { setMsg("Tabla no encontrada. Créala en Supabase con el SQL del panel."); setLoading(false); return; }
      setSnapshots(data||[]);
    } catch(e) { setMsg("Error: "+e.message); }
    setLoading(false);
  }

  async function saveSnapshot() {
    const code = prompt("Código de seguridad:");
    if (code !== "AORSEGURO") { setMsg("Código incorrecto"); return; }
    if (!confirm("¿Guardar snapshot del estado actual?")) return;
    setSaving(true);
    const {error} = await supabase.from("player_snapshots").insert({
      label: label.trim() || "Snapshot "+new Date().toLocaleString("es-MX"),
      data: players,
      player_count: players.filter(p=>p.active).length,
    });
    if (error) { setMsg("Error: "+error.message); setSaving(false); return; }
    setMsg("✓ Snapshot guardado"); setLabel("");
    await loadSnapshots(); setSaving(false);
    setTimeout(()=>setMsg(""),3000);
  }

  async function restoreSnapshot(snap) {
    const code = prompt("Código de seguridad para restaurar:");
    if (code !== "AORSEGURO") { setMsg("Código incorrecto"); return; }
    if (!confirm("¿Restaurar a \"" + snap.label + "\"? Esto sobreescribirá todos los datos actuales.")) return;
    setRestoring(snap.id);
    const {data} = await supabase.from("player_snapshots").select("data").eq("id",snap.id).single();
    if (!data?.data) { setMsg("Error al cargar snapshot"); setRestoring(null); return; }
    let errors=0;
    for (const p of data.data) {
      const {id, created_at, ...fields} = p;
      const {error} = await supabase.from("players").update(fields).eq("id",id);
      if (error) errors++;
    }
    setRestoring(null);
    setMsg(errors>0 ? "⚠ Restaurado con "+errors+" errores" : "✓ Restaurado correctamente — recarga la app");
    setTimeout(()=>setMsg(""),6000);
  }

  async function deleteSnapshot(id) {
    const code = prompt("Código de seguridad para borrar:");
    if (code !== "AORSEGURO") { setMsg("Código incorrecto"); return; }
    if (!confirm("¿Borrar este snapshot?")) return;
    await supabase.from("player_snapshots").delete().eq("id",id);
    await loadSnapshots();
  }

  return (
    <div style={{padding:"0 16px"}}>
      <div style={{fontFamily:"serif",color:"#FF6B6B",fontSize:"14px",marginBottom:"12px"}}>🔒 Seguridad</div>

      {/* Protection mechanisms */}
      <div style={{background:"rgba(255,107,107,0.04)",border:"1px solid rgba(255,107,107,0.15)",borderRadius:"8px",padding:"14px",marginBottom:"14px"}}>
        <div style={{fontSize:"12px",color:"#FF6B6B",fontWeight:"bold",marginBottom:"10px"}}>🛡 Mecanismos de protección activos</div>
        {[
          {icon:"✅",label:"PIN de acceso al Admin",desc:"Sin PIN no se puede acceder al panel de control"},
          {icon:"✅",label:"Registro: 1 vez por semana",desc:"Ningún jugador puede sobreescribir su registro más de una vez por semana"},
          {icon:"✅",label:"Stats BP/Poder: 1 vez por semana",desc:"Con control de tolerancia ±30% para detectar valores anómalos"},
          {icon:"✅",label:"Historial de stats",desc:"Cada cambio de BP/Poder queda registrado con fecha — puedes ver quién modificó qué"},
          {icon:"✅",label:"Snapshots de respaldo",desc:"Guarda el estado completo antes de cada guerra y restaura en segundos si hay sabotaje"},
          {icon:"⚠",label:"Registro público sin login",desc:"Un rival podría registrar a un miembro tuyo con disponibilidad baja (Reserva). Monitorea el registro antes de cada guerra"},
        ].map((item,i)=>(
          <div key={i} style={{display:"flex",gap:"10px",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
            <span style={{fontSize:"14px",flexShrink:0}}>{item.icon}</span>
            <div>
              <div style={{fontSize:"11px",color:"rgba(255,255,255,0.7)",fontWeight:"bold"}}>{item.label}</div>
              <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)"}}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Response protocol */}
      <div style={{background:"rgba(64,224,255,0.04)",border:"1px solid rgba(64,224,255,0.15)",borderRadius:"8px",padding:"14px",marginBottom:"14px"}}>
        <div style={{fontSize:"12px",color:"#40E0FF",fontWeight:"bold",marginBottom:"10px"}}>⚡ Protocolo de respuesta ante sabotaje</div>
        {[
          {n:"1",text:"Detectas datos incorrectos en el Roster o en el Ranking"},
          {n:"2",text:"Ve a la pestaña Seguridad → sección Snapshots"},
          {n:"3",text:"Identifica el último snapshot ANTES del sabotaje"},
          {n:"4",text:"Haz clic en 🔄 Restaurar — confirma la acción"},
          {n:"5",text:"Recarga la app — todos los datos vuelven al estado guardado"},
          {n:"6",text:"Si el sabotaje fue en stats individuales, usa el botón ↩ Revertir stats en cada perfil desde /reporte"},
        ].map(s=>(
          <div key={s.n} style={{display:"flex",gap:"10px",padding:"5px 0"}}>
            <span style={{width:"18px",height:"18px",background:"rgba(64,224,255,0.15)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"9px",color:"#40E0FF",fontWeight:"bold",flexShrink:0}}>{s.n}</span>
            <span style={{fontSize:"10px",color:"rgba(255,255,255,0.5)"}}>{s.text}</span>
          </div>
        ))}
      </div>

      {/* Snapshot save */}
      <div style={{background:"rgba(168,255,120,0.05)",border:"1px solid rgba(168,255,120,0.2)",borderRadius:"8px",padding:"12px",marginBottom:"12px"}}>
        <div style={{fontSize:"11px",color:"#A8FF78",fontWeight:"bold",marginBottom:"8px"}}>📸 Guardar snapshot ahora</div>
        <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",marginBottom:"8px"}}>Recomendado: guarda uno antes de cada guerra del viernes</div>
        <input value={label} onChange={e=>setLabel(e.target.value)} placeholder="Descripción (ej: Pre-guerra semana 19)" style={{width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"6px",color:"#fff",padding:"8px 10px",fontSize:"11px",outline:"none",marginBottom:"8px"}}/>
        <button onClick={saveSnapshot} disabled={saving} style={{width:"100%",padding:"9px",background:saving?"rgba(255,255,255,0.04)":"rgba(168,255,120,0.15)",border:"1px solid rgba(168,255,120,0.3)",borderRadius:"6px",color:saving?"rgba(255,255,255,0.3)":"#A8FF78",fontSize:"12px",cursor:saving?"default":"pointer",fontWeight:"bold"}}>
          {saving?"Guardando...":"📸 Guardar snapshot ("+players.filter(p=>p.active).length+" jugadores)"}
        </button>
        {msg && <div style={{fontSize:"11px",color:msg.startsWith("✓")?"#A8FF78":"#FF6B6B",marginTop:"6px"}}>{msg}</div>}
      </div>

      {/* Snapshots list */}
      <div style={{fontFamily:"serif",color:"rgba(255,255,255,0.6)",fontSize:"12px",marginBottom:"8px"}}>Historial de snapshots ({snapshots.length})</div>
      {loading && <div style={{fontSize:"11px",color:"rgba(255,255,255,0.3)"}}>Cargando...</div>}
      {!loading && snapshots.length===0 && <div style={{fontSize:"11px",color:"rgba(255,255,255,0.3)",textAlign:"center",padding:"16px"}}>Sin snapshots. Guarda uno antes de cada guerra.</div>}
      {snapshots.map(snap=>(
        <div key={snap.id} style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",padding:"10px 14px",marginBottom:"6px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"8px"}}>
            <div style={{flex:1}}>
              <div style={{fontSize:"12px",color:"#FFD700",fontWeight:"bold",marginBottom:"2px"}}>{snap.label}</div>
              <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)"}}>{new Date(snap.created_at).toLocaleString("es-MX")} · {snap.player_count} jugadores</div>
            </div>
            <div style={{display:"flex",gap:"6px",flexShrink:0}}>
              <button onClick={()=>restoreSnapshot(snap)} disabled={!!restoring} style={{padding:"4px 10px",background:"rgba(64,224,255,0.1)",border:"1px solid rgba(64,224,255,0.25)",borderRadius:"6px",color:"#40E0FF",fontSize:"10px",cursor:"pointer"}}>
                {restoring===snap.id?"...":"🔄 Restaurar"}
              </button>
              <button onClick={()=>deleteSnapshot(snap.id)} style={{padding:"4px 8px",background:"rgba(255,107,107,0.08)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:"6px",color:"#FF6B6B",fontSize:"10px",cursor:"pointer"}}>✕</button>
            </div>
          </div>
        </div>
      ))}

    </div>
  );
}

// ── Daily Limit Setting ─────────────────────────────────────────────────────
function DailyLimitSetting() {
  const [limit, setLimit]   = useState(2);
  const [saved, setSaved]   = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(()=>{
    // Try cached value first for instant render
    const cached = sessionStorage.getItem("daily_msg_limit");
    if (cached) { setLimit(parseInt(cached)||2); setLoaded(true); }
    supabase.from("app_settings").select("value").eq("key","daily_msg_limit").single()
      .then(({data, error})=>{
        if (!error && data?.value) {
          const v = parseInt(data.value)||2;
          setLimit(v);
          sessionStorage.setItem("daily_msg_limit", String(v));
        }
        setLoaded(true);
      });
  },[]);

  async function save() {
    await supabase.from("app_settings")
      .upsert({key:"daily_msg_limit", value:String(limit)}, {onConflict:"key"});
    setSaved(true);
    setTimeout(()=>setSaved(false), 2000);
  }

  if (!loaded) return null;
  return (
    <div style={{background:"rgba(255,215,0,0.05)",border:"1px solid rgba(255,215,0,0.15)",borderRadius:"8px",padding:"12px"}}>
      <div style={{fontSize:"11px",color:"#FFD700",fontWeight:"bold",marginBottom:"8px"}}>⚙ Configuración de Comunicaciones</div>
      <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
        <div style={{flex:1}}>
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.5)",marginBottom:"4px"}}>Máximo de mensajes que cada miembro puede publicar diariamente en el chat general del juego desde <strong style={{color:"#C8A2FF"}}>/propaganda</strong> para reclutar nuevos jugadores al clan</div>
          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
            <button onClick={()=>setLimit(l=>Math.max(1,l-1))} style={{width:"28px",height:"28px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"6px",color:"#fff",cursor:"pointer",fontSize:"14px"}}>−</button>
            <input type="number" value={limit} onChange={e=>setLimit(Math.max(1,parseInt(e.target.value)||1))} min="1" max="20"
              style={{width:"48px",textAlign:"center",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:"6px",color:"#FFD700",padding:"4px",fontSize:"16px",fontWeight:"bold",outline:"none"}}/>
            <button onClick={()=>setLimit(l=>Math.min(20,l+1))} style={{width:"28px",height:"28px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"6px",color:"#fff",cursor:"pointer",fontSize:"14px"}}>+</button>
            <span style={{fontSize:"10px",color:"rgba(255,255,255,0.35)"}}>veces/día</span>
          </div>
        </div>
        <button onClick={save} style={{padding:"8px 14px",background:saved?"rgba(168,255,120,0.15)":"rgba(255,215,0,0.1)",border:"1px solid "+(saved?"rgba(168,255,120,0.3)":"rgba(255,215,0,0.2)"),borderRadius:"6px",color:saved?"#A8FF78":"#FFD700",fontSize:"11px",cursor:"pointer",fontWeight:"bold",flexShrink:0}}>
          {saved?"✓ Guardado":"Guardar"}
        </button>
      </div>
    <NalguitasFooter/>
    </div>
  );
}


// ── WA Report Buttons for Admin Registro tab ──────────────────────────────
function WaReportButtonsAdmin({players}) {
  const [copied, setCopied] = useState("");
  const avMap = {siempre:"Conquistador",intermitente:"Refuerzos",solo_una:"Reserva",no_disponible:"No disponible"};

  function totalPtsLocal(p) {
    const sb=(p.pt_batallas_ganadas||0)>=6?10:0;
    return (p.pt_registro||0)+(p.pt_disponibilidad_declarada||0)+(p.pt_disponibilidad||0)
          +(p.pt_obediencia||0)+(p.pt_batallas_ganadas||0)*2+(p.pt_batallas_perdidas||0)
          +(p.pt_defensas||0)+(p.pt_bonus||0)+(p.pt_bandido_post||0)+(p.pt_stats||0)
          +(p.pt_whatsapp||0)+sb
          -(p.pt_penalizacion||0)-(p.pt_no_aparecio||0)
          -(p.pt_ignoro_orden||0)*2-(p.pt_abandono||0)*2-(p.pt_inactivo_4h||0)*3
          -(p.pt_bandido_pre||0);
  }

  function ptBreakdown(p) {
    const sb=(p.pt_batallas_ganadas||0)>=6?10:0;
    const items=[
      {l:"Registro",v:p.pt_registro||0},
      {l:"Apareció",v:p.pt_disponibilidad||0},
      {l:"Órdenes",v:(p.pt_obediencia||0)*2},
      {l:"Batallas ganadas",v:(p.pt_batallas_ganadas||0)*2},
      {l:"Bonus 6+",v:sb},
      {l:"Batallas perdidas",v:p.pt_batallas_perdidas||0},
      {l:"Defensas",v:p.pt_defensas||0},
      {l:"Bonus completo",v:(p.pt_bonus||0)*5},
      {l:"Bandido post",v:p.pt_bandido_post||0},
      {l:"Stats",v:p.pt_stats||0},
      {l:"WhatsApp",v:p.pt_whatsapp||0},
      {l:"Penalizaciones",v:-((p.pt_penalizacion||0)+(p.pt_no_aparecio||0)+(p.pt_ignoro_orden||0)*2+(p.pt_abandono||0)*2+(p.pt_inactivo_4h||0)*3+(p.pt_bandido_pre||0))},
    ].filter(x=>x.v!==0);
    return items;
  }

  const active = players.filter(p=>p.active);
  const wa = active.filter(p=>p.whatsapp);
  const waReg = wa.filter(p=>p.registered_form);
  const waNoReg = wa.filter(p=>!p.registered_form);
  const noWaReg = active.filter(p=>!p.whatsapp && p.registered_form);
  const noWaNoReg = active.filter(p=>!p.whatsapp && !p.registered_form);

  function copy(key, text) {
    navigator.clipboard.writeText(text);
    setCopied(key); setTimeout(()=>setCopied(""),2500);
  }

  // ── Report 1: Registro con aporte y poder ──────────────────────────────────
  function buildRegistroWA() {
    let m = "*[AOR] Registro de Guerra — Grupo WA*\n\n";
    m += `*Confirmados del grupo (${waReg.length}/${wa.length}):*\n`;
    waReg.sort((a,b)=>(b.level||0)-(a.level||0)).forEach(p=>{
      m += `✅ *${p.name}* | ${avMap[p.availability]||""} | ${((p.level||0)/1000).toFixed(1)}k poder\n`;
    });
    if (waNoReg.length>0) {
      m += `\n*Sin registrar del grupo (${waNoReg.length}):*\n`;
      waNoReg.sort((a,b)=>(b.level||0)-(a.level||0)).forEach(p=>{
        m += `⏳ *${p.name}* | ${((p.level||0)/1000).toFixed(1)}k poder\n`;
      });
    }
    if (noWaNoReg.length>0) {
      m += `\n*Sin registro ni grupo WA (${noWaNoReg.length}):*\n`;
      noWaNoReg.sort((a,b)=>(b.level||0)-(a.level||0)).forEach(p=>{
        m += `📵 *${p.name}* | ${((p.level||0)/1000).toFixed(1)}k poder\n`;
      });
    }
    m += `\n📋 https://aor-war-command.vercel.app/registro`;
    return m;
  }

  // ── Report 2: Top 5 puntos con desglose ───────────────────────────────────
  function buildTop5() {
    const sorted = [...active].sort((a,b)=>totalPtsLocal(b)-totalPtsLocal(a)).slice(0,5);
    let m = "*[AOR] Top 5 de la jornada* ⚔\n\n";
    sorted.forEach((p,i) => {
      const pts = totalPtsLocal(p);
      const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":(i+1)+".";
      m += `${medal} *${p.name}* — ${pts>0?"+":""}${pts} pts\n`;
      ptBreakdown(p).forEach(x=>{ m += `    ${x.l}: ${x.v>0?"+":""}${x.v}\n`; });
      m += "\n";
    });
    m += "📊 https://aor-war-command.vercel.app/reporte";
    return m;
  }

  // ── Report 3: Votación jornada (placeholder — needs assembly_votes) ────────
  function buildVotacion() {
    let m = "*[AOR] Asamblea — Guerrero Implacable* ⭐\n\n";
    m += "Vota por el jugador mas determinante de la semana:\n";
    m += "⚔ https://aor-war-command.vercel.app/asamblea\n\n";
    m += "*Recuerda:* +3 pts por votar. Solo Conquistador, Refuerzos y Reserva pueden votar.";
    return m;
  }

  // ── Report 4: GOAT message ─────────────────────────────────────────────────
  function buildGoat() {
    const sorted = [...active].sort((a,b)=>totalPtsLocal(b)-totalPtsLocal(a));
    const top = sorted[0];
    if (!top) return "";
    const pts = totalPtsLocal(top);
    const breakdown = ptBreakdown(top).map(x=>`• ${x.l}: ${x.v>0?"+":""}${x.v}`).join("\n");
    let m = `🏆 *GUERRERO IMPLACABLE* 🏆\n\n`;
    m += `*${top.name}* lidera la jornada con *${pts>0?"+":""}${pts} puntos*\n\n`;
    m += `*Desglose:*\n${breakdown}\n\n`;
    m += `*[AOR] Antigua Orden* — el esfuerzo se reconoce.\n`;
    m += `📊 https://aor-war-command.vercel.app/reporte`;
    return m;
  }

  // ── Report 5: Semanal WA ──────────────────────────────────────────────────
  function copySemanal() {
    const sorted=[...wa].sort((a,b)=>totalPtsLocal(b)-totalPtsLocal(a));
    let m="*[AOR] Reporte Semanal — Grupo WA* ⚔\n\n";
    sorted.forEach((p,i)=>{const pts=totalPtsLocal(p);m+=`${i===0?"🥇":i===1?"🥈":i===2?"🥉":(i+1)+"."} *${p.name}* — ${pts>0?"+":""}${pts} pts\n`;});
    m+="\n📊 https://aor-war-command.vercel.app/reporte";
    copy("sem",m);
  }
  function copyAcumulado() {
    const sorted=[...wa].sort((a,b)=>(b.pts_acumulados||0)-(a.pts_acumulados||0));
    let m="*[AOR] Ranking Acumulado — Grupo WA* 🏆\n\n";
    sorted.forEach((p,i)=>{m+=`${i===0?"🥇":i===1?"🥈":i===2?"🥉":(i+1)+"."} *${p.name}* — ${(p.pts_acumulados||0).toLocaleString()} pts\n`;});
    m+="\n📊 https://aor-war-command.vercel.app/reporte";
    copy("acc",m);
  }

  const Btn = ({k,label,fn,color="#25D366"}) => (
    <button onClick={()=>fn?fn():copy(k,"")} style={{flex:1,minWidth:"120px",padding:"8px 6px",background:copied===k?"rgba(168,255,120,0.15)":"rgba(255,255,255,0.03)",border:"1px solid "+(copied===k?"rgba(168,255,120,0.35)":"rgba(255,255,255,0.08)"),borderRadius:"6px",color:copied===k?"#A8FF78":color,fontSize:"10px",cursor:"pointer",fontFamily:"monospace",letterSpacing:"0.05em"}}>
      {copied===k?"✓ COPIADO":label}
    </button>
  );

  return (
    <div style={{background:"rgba(37,211,102,0.03)",border:"1px solid rgba(37,211,102,0.12)",borderRadius:"8px",padding:"12px"}}>
      <div style={{fontSize:"9px",color:"rgba(37,211,102,0.6)",letterSpacing:"0.2em",fontFamily:"monospace",marginBottom:"10px"}}>REPORTES — {wa.length} EN GRUPO WA · {active.length} TOTAL</div>
      <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
        <Btn k="regwa" label="REGISTRO + PODER WA" fn={()=>copy("regwa",buildRegistroWA())} color="#25D366"/>
        <Btn k="top5"  label="TOP 5 CON DESGLOSE"  fn={()=>copy("top5",buildTop5())}       color="#FFD700"/>
        <Btn k="vot"   label="CONVOCATORIA ASAMBLEA" fn={()=>copy("vot",buildVotacion())}   color="#C8A2FF"/>
        <Btn k="goat"  label="MENSAJE GOAT"          fn={()=>copy("goat",buildGoat())}      color="#A8FF78"/>
        <Btn k="sem"   label="SEMANAL WA"            fn={copySemanal}                        color="#25D366"/>
        <Btn k="acc"   label="ACUMULADO WA"          fn={copyAcumulado}                     color="#25D366"/>
      </div>
    </div>
  );
}



// ── First Mobilization Button ──────────────────────────────────────────────
function FirstMobilizationButton({players, update, reload}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const active = players.filter(p=>p.active).sort((a,b)=>a.name.localeCompare(b.name));
  async function apply() {
    if (!selected) return;
    setSaving(true);
    const p = active.find(x=>String(x.id)===selected);
    await update(parseInt(selected), {pts_acumulados: (p?.pts_acumulados||0)+3});
    await reload();
    setMsg("✓ +3 pts a "+p?.name+" por primer movilizador");
    setSaving(false); setOpen(false); setSelected(null);
    setTimeout(()=>setMsg(""),3000);
  }
  return (
    <>
      <button onClick={()=>setOpen(true)} style={{padding:"6px 12px",background:"rgba(64,224,255,0.1)",border:"1px solid rgba(64,224,255,0.2)",borderRadius:"6px",color:"#40E0FF",fontSize:"11px",cursor:"pointer"}}>
        Primer movilizador +3
      </button>
      {msg && <div style={{fontSize:"10px",color:"#A8FF78",padding:"4px 0"}}>{msg}</div>}
      {open && (
        <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.85)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}>
          <div style={{background:"#0d0d0f",border:"1px solid rgba(64,224,255,0.3)",borderRadius:"12px",padding:"20px",width:"100%",maxWidth:"360px"}}>
            <div style={{fontFamily:"serif",color:"#40E0FF",fontSize:"15px",marginBottom:"12px"}}>Primer movilizador de tropas +3 pts</div>
            <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"12px"}}>El jugador que primero movilizó tropas recibe +3 pts de bonificación.</div>
            <div style={{maxHeight:"240px",overflow:"auto",marginBottom:"12px"}}>
              {active.map(p=>(
                <div key={p.id} onClick={()=>setSelected(String(p.id))} style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 10px",marginBottom:"3px",borderRadius:"6px",cursor:"pointer",background:selected===String(p.id)?"rgba(64,224,255,0.1)":"rgba(255,255,255,0.02)",border:"1px solid "+(selected===String(p.id)?"rgba(64,224,255,0.3)":"rgba(255,255,255,0.05)")}}>
                  <div style={{width:"16px",height:"16px",borderRadius:"3px",border:"1px solid "+(selected===String(p.id)?"#40E0FF":"rgba(255,255,255,0.2)"),background:selected===String(p.id)?"#40E0FF":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {selected===String(p.id)&&<span style={{color:"#000",fontSize:"10px",fontWeight:"bold"}}>✓</span>}
                  </div>
                  <span style={{fontSize:"12px",color:selected===String(p.id)?"#40E0FF":"rgba(255,255,255,0.6)"}}>{p.name}</span>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:"8px"}}>
              <button onClick={apply} disabled={!selected||saving} style={{flex:1,padding:"9px",background:"rgba(64,224,255,0.15)",border:"1px solid rgba(64,224,255,0.3)",borderRadius:"6px",color:"#40E0FF",fontSize:"12px",cursor:"pointer",fontWeight:"bold"}}>
                {saving?"...":"Asignar +3 pts"}
              </button>
              <button onClick={()=>{setOpen(false);setSelected(null);}} style={{padding:"9px 14px",background:"rgba(255,107,107,0.1)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:"6px",color:"#FF6B6B",fontSize:"12px",cursor:"pointer"}}>✕</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── War Intel Panel ──────────────────────────────────────────────────────────
function WarIntelPanel({players, reload}) {
  const [intel,    setIntel]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [open,     setOpen]     = useState(false);
  const [pos,      setPos]      = useState("");
  const [ranking,  setRanking]  = useState("");
  const [pts,      setPts]      = useState("");
  const [rivals,   setRivals]   = useState([{name:"",abbrev:"",points:"",note:"",players:[]}]);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState("");
  const week = (() => {
    const now=new Date(); const ec=new Date(now.getTime()-5*60*60*1000);
    const day=ec.getDay(); const d=(day+2)%7; const fri=new Date(ec);
    fri.setDate(ec.getDate()-d); const y=fri.getFullYear();
    const w=Math.ceil(((fri-new Date(y,0,1))/86400000+1)/7);
    return `${y}-W${w}`;
  })();

  useEffect(()=>{
    supabase.from("war_intel").select("*").order("created_at",{ascending:false}).limit(1).single()
      .then(({data})=>{ if(data) setIntel(data); setLoading(false); });
  },[]);

  function addRival() { setRivals(r=>[...r,{name:"",abbrev:"",points:"",note:"",players:[]}]); }
  function removeRival(i) { setRivals(r=>r.filter((_,j)=>j!==i)); }
  function updateRival(i,field,val) { setRivals(r=>r.map((x,j)=>j===i?{...x,[field]:val}:x)); }
  function addRivalPlayer(ri) { setRivals(r=>r.map((x,j)=>j===ri?{...x,players:[...x.players,{name:"",bp:"",level:"",note:""}]}:x)); }
  function updateRivalPlayer(ri,pi,field,val) { setRivals(r=>r.map((x,j)=>j===ri?{...x,players:x.players.map((p,k)=>k===pi?{...p,[field]:val}:p)}:x)); }

  async function save() {
    setSaving(true);
    const payload = {week, clan_position:parseInt(pos)||0, clan_ranking:parseInt(ranking)||0, clan_points:parseInt(pts)||0,
      rival_clans: JSON.stringify(rivals.filter(r=>r.name.trim())),
      notable_players: "[]"};
    const {error} = await supabase.from("war_intel").insert(payload);
    if (error) setMsg("Error: "+error.message);
    else { setMsg("✓ Guardado"); setOpen(false);
      supabase.from("war_intel").select("*").order("created_at",{ascending:false}).limit(1).single().then(({data})=>{ if(data) setIntel(data); }); }
    setSaving(false);
  }

  return (
    <div style={{background:"rgba(255,107,107,0.04)",border:"1px solid rgba(255,107,107,0.15)",borderRadius:"8px",padding:"12px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
        <div style={{fontSize:"11px",color:"#FF6B6B",fontWeight:"bold"}}>Resultados de guerra</div>
        <button onClick={()=>setOpen(!open)} style={{padding:"4px 10px",background:"rgba(255,107,107,0.1)",border:"1px solid rgba(255,107,107,0.25)",borderRadius:"6px",color:"#FF6B6B",fontSize:"10px",cursor:"pointer"}}>
          {open?"Cerrar":"+ Registrar"}
        </button>
      </div>
      {intel && !open && (
        <div style={{fontSize:"11px",color:"rgba(255,255,255,0.5)"}}>
          Última: {intel.week} — Posición {intel.clan_position} con {(intel.clan_points||0).toLocaleString()} pts
        </div>
      )}
      {open && (
        <div>
          <div style={{display:"flex",gap:"8px",marginBottom:"8px"}}>
            <div style={{flex:1}}>
              <div style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",marginBottom:"3px",fontFamily:"monospace"}}>POSICIÓN EN GUERRA</div>
              <input value={pos} onChange={e=>setPos(e.target.value)} type="number" placeholder="3"
                style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:"6px",color:"#fff",padding:"7px 10px",fontSize:"13px",outline:"none",boxSizing:"border-box",fontWeight:"bold"}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",marginBottom:"3px",fontFamily:"monospace"}}>RANKING DEL CLAN</div>
              <input value={ranking} onChange={e=>setRanking(e.target.value)} type="number" placeholder="150"
                style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:"6px",color:"#FF9F43",padding:"7px 10px",fontSize:"13px",outline:"none",boxSizing:"border-box",fontWeight:"bold"}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",marginBottom:"3px",fontFamily:"monospace"}}>PUNTOS DEL CLAN</div>
              <input value={pts} onChange={e=>setPts(e.target.value)} type="number" placeholder="85000"
                style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:"6px",color:"#fff",padding:"7px 10px",fontSize:"13px",outline:"none",boxSizing:"border-box"}}/>
            </div>
          </div>
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",marginBottom:"6px",fontFamily:"monospace"}}>CLANES RIVALES</div>
          {rivals.map((rival,ri)=>(
            <div key={ri} style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"6px",padding:"10px",marginBottom:"8px"}}>
              <div style={{display:"flex",gap:"6px",marginBottom:"6px"}}>
                <input value={rival.name} onChange={e=>updateRival(ri,"name",e.target.value)} placeholder="Nombre del clan rival"
                  style={{flex:3,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,107,107,0.15)",borderRadius:"5px",color:"#FF6B6B",padding:"5px 8px",fontSize:"11px",outline:"none",boxSizing:"border-box"}}/>
                <input value={rival.abbrev} onChange={e=>updateRival(ri,"abbrev",e.target.value)} placeholder="[ABC]"
                  style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,107,107,0.12)",borderRadius:"5px",color:"#FF9F43",padding:"5px 8px",fontSize:"11px",outline:"none",boxSizing:"border-box"}}/>
                <input value={rival.points} onChange={e=>updateRival(ri,"points",e.target.value)} placeholder="Pts"
                  style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"5px",color:"#fff",padding:"5px 8px",fontSize:"11px",outline:"none",boxSizing:"border-box"}}/>
                <button onClick={()=>removeRival(ri)} style={{padding:"5px 8px",background:"rgba(255,107,107,0.08)",border:"1px solid rgba(255,107,107,0.15)",borderRadius:"5px",color:"rgba(255,107,107,0.5)",cursor:"pointer",fontSize:"11px"}}>✕</button>
              </div>
              <input value={rival.note} onChange={e=>updateRival(ri,"note",e.target.value)} placeholder="Nota sobre este clan (por qué es memorable)"
                style={{width:"100%",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"5px",color:"rgba(255,255,255,0.5)",padding:"5px 8px",fontSize:"10px",outline:"none",boxSizing:"border-box",marginBottom:"6px"}}/>
              {rival.players.map((pl,pi)=>(
                <div key={pi} style={{display:"flex",gap:"4px",marginBottom:"4px"}}>
                  <div style={{display:"flex",flexDirection:"column",gap:"3px",flex:1}}>
                    <input value={pl.name} onChange={e=>updateRivalPlayer(ri,pi,"name",e.target.value)} placeholder="Jugador notable"
                      style={{width:"100%",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,159,67,0.15)",borderRadius:"4px",color:"#FF9F43",padding:"4px 7px",fontSize:"10px",outline:"none",boxSizing:"border-box"}}/>
                    <div style={{display:"flex",gap:"4px"}}>
                      <input value={pl.bp} onChange={e=>updateRivalPlayer(ri,pi,"bp",e.target.value)} placeholder="BP"
                        style={{flex:1,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"4px",color:"rgba(255,255,255,0.4)",padding:"4px 7px",fontSize:"10px",outline:"none",boxSizing:"border-box"}}/>
                      <input value={pl.level} onChange={e=>updateRivalPlayer(ri,pi,"level",e.target.value)} placeholder="Poder"
                        style={{flex:1,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"4px",color:"rgba(255,255,255,0.4)",padding:"4px 7px",fontSize:"10px",outline:"none",boxSizing:"border-box"}}/>
                    </div>
                  </div>
                </div>
              ))}
              <input value={rival.players[rival.players.length-1]?.note||""} onChange={e=>rival.players.length>0?updateRivalPlayer(ri,rival.players.length-1,"note",e.target.value):null} placeholder="Nota del jugador"
                style={{width:"100%",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:"4px",color:"rgba(255,255,255,0.4)",padding:"4px 7px",fontSize:"10px",outline:"none",boxSizing:"border-box",marginBottom:"4px",display:rival.players.length>0?"block":"none"}}/>
              <button onClick={()=>addRivalPlayer(ri)} style={{fontSize:"10px",color:"rgba(255,159,67,0.5)",background:"transparent",border:"1px dashed rgba(255,159,67,0.2)",borderRadius:"4px",padding:"3px 8px",cursor:"pointer"}}>+ Jugador notable</button>
            </div>
          ))}
          <button onClick={addRival} style={{width:"100%",padding:"6px",background:"rgba(255,107,107,0.05)",border:"1px dashed rgba(255,107,107,0.2)",borderRadius:"6px",color:"rgba(255,107,107,0.5)",fontSize:"10px",cursor:"pointer",marginBottom:"8px"}}>+ Añadir clan rival</button>
          {msg&&<div style={{fontSize:"11px",color:msg.startsWith("✓")?"#A8FF78":"#FF6B6B",marginBottom:"6px"}}>{msg}</div>}
          <button onClick={save} disabled={saving} style={{width:"100%",padding:"9px",background:"rgba(168,255,120,0.12)",border:"1px solid rgba(168,255,120,0.25)",borderRadius:"6px",color:"#A8FF78",fontSize:"12px",cursor:"pointer",fontWeight:"bold"}}>
            {saving?"Guardando...":"Guardar resultados de guerra"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Admin Panel ────────────────────────────────────────────────────────────
function AdminPanel({players, update, loading, saving, reload}) {
  const [activeTab, setActiveTab] = useState("registro");
  const [phase, setPhase]         = useState(0);
  const [warActive, setWarActive] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [newPlayer, setNewPlayer] = useState({name:"",level:"",bp:""});
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(()=>{
    if (showInactive && activeTab==="admin") {
      setTimeout(()=>document.getElementById("inactivos-section")?.scrollIntoView({behavior:"smooth"}),300);
    }
  },[showInactive, activeTab]);

  const WAR_PHASES = ["Fase 1: Captura (0-6h)","Fase 2: Defensa (6-24h)","Fase 3: Ataque (24h+)"];
  const expelled   = players.filter(p=>p.flags===-1);
  const confirmed  = players.filter(p=>p.active&&p.availability!=="pendiente"&&p.availability!=="no_disponible");
  const pending    = players.filter(p=>p.active&&p.availability==="pendiente");
  const notPlaying = players.filter(p=>p.active&&p.availability==="no_disponible");
  const inactive   = players.filter(p=>!p.active && (p.flags||0) !== -1);

  // Phase-based player filters
  const phaseFilters = [
    // Fase 1: attackers
    players.filter(p=>p.active&&(p.availability==="siempre"||(p.availability==="intermitente"&&p.task_period1?.includes("Atacar castillos")))),
    // Fase 2: defenders
    players.filter(p=>p.active&&(p.availability==="siempre"||p.task_period1?.includes("Defender"))),
    // Fase 3: city attackers
    players.filter(p=>p.active&&(p.availability==="siempre"||(p.availability==="intermitente"&&p.task_period1?.includes("ciudad")))),
  ];

  const phaseMessages = [
    `<color=#40E0FF>━━━━━━ [AOR] Fase 1 ━━━━━━</color>\n<color=#FFD700>¡A atacar castillos!</color> Jugadores activos: ${phaseFilters[0].map(p=>p.name).join(", ")}`,
    `<color=#40E0FF>━━━━━━ [AOR] Fase 2 ━━━━━━</color>\n<color=#FFD700>¡Defender castillos!</color> Defensores: ${phaseFilters[1].map(p=>p.name).join(", ")}`,
    `<color=#40E0FF>━━━━━━ [AOR] Fase 3 ━━━━━━</color>\n<color=#FFD700>¡Ataque a ciudad enemiga!</color> Atacantes: ${phaseFilters[2].map(p=>p.name).join(", ")}`,
  ];

  function copyPhaseMessage() {
    navigator.clipboard.writeText(phaseMessages[phase]);
    setCopiedMsg(true);
    setTimeout(()=>setCopiedMsg(false), 2000);
  }

  const tabs = [{id:"registro",label:"📋 Registro"},{id:"roster",label:"⚔ Roster"},{id:"puntos",label:"🏆 Puntos"},{id:"admin",label:"⚙ Admin"},{id:"mensajes",label:"💬 Mensajes"},{id:"links",label:"🔗 Links"},{id:"visitas",label:"👁 Visitas"},{id:"seguridad",label:"🔒 Seguridad"}];

  async function addPlayer() {
    if (!newPlayer.name||!newPlayer.level||!newPlayer.bp) return;
    const maxId = Math.max(...players.map(p=>p.id),0);
    await supabase.from("players").insert({
      id: maxId+1, name: newPlayer.name, level: parseInt(newPlayer.level),
      bp: parseInt(newPlayer.bp), clan_role:"Recruit", last_seen:"hoy",
      active:true, role:"Sin_Rol", availability:"pendiente", hour_mx:"No sé",
      flags:10, status:"disponible"
    });
    setNewPlayer({name:"",level:"",bp:""});
    setAddingPlayer(false);
    reload();
  }

  async function weeklyReset() {
    if (!confirm("¿Archivar puntos de esta guerra y resetear para la siguiente? Esta acción no se puede deshacer.")) return;
    const currentWeek = getWarWeek();
    // Archive all active players' points
    const activePlayers = players.filter(p=>p.active);
    for (const p of activePlayers) {
      const total = totalPts(p);
      if (total !== 0 || p.registered_form) {
        await supabase.from("war_history").insert({
          player_id: p.id, player_name: p.name, week: currentWeek,
          availability: p.availability,
          pt_registro: p.pt_registro||0,
          pt_disponibilidad_declarada: p.pt_disponibilidad_declarada||0,
          pt_disponibilidad: p.pt_disponibilidad||0,
          pt_obediencia: p.pt_obediencia||0,
          pt_batallas_ganadas: p.pt_batallas_ganadas||0,
          pt_batallas_perdidas: p.pt_batallas_perdidas||0,
          pt_defensas: p.pt_defensas||0,
          pt_bonus: p.pt_bonus||0,
          pt_penalizacion: p.pt_penalizacion||0,
          pt_no_aparecio: p.pt_no_aparecio||0,
          pt_ignoro_orden: p.pt_ignoro_orden||0,
          pt_abandono: p.pt_abandono||0,
          pt_inactivo_4h: p.pt_inactivo_4h||0,
          total,
        });
      }
    }
    // Reset weekly points for all players
    await supabase.from("players").update({
      availability: "pendiente", registered_form: false, registered_week: "",
      hour_mx: "No sé", task_period1: "",
      pt_registro: 0, pt_disponibilidad_declarada: 0, pt_disponibilidad: 0,
      pt_obediencia: 0, pt_batallas_ganadas: 0, pt_batallas_perdidas: 0,
      pt_defensas: 0, pt_bonus: 0, pt_penalizacion: 0, pt_no_aparecio: 0,
      pt_ignoro_orden: 0, pt_abandono: 0, pt_inactivo_4h: 0, pt_fuera_castillo: 0,
    }).eq("active", true);
    // Add weekly points to accumulated for each player
    for (const p of activePlayers) {
      const weekPts = totalPts(p);
      if (weekPts !== 0) {
        await supabase.from("players").update({
          pts_acumulados: (p.pts_acumulados||0) + weekPts
        }).eq("id", p.id);
      }
    }
    reload();
    alert("✓ Guerra archivada. Puntos reseteados para la siguiente semana.");
  }

  async function removePlayer(id) {
    if (!confirm("¿Expulsar este jugador? Pasará a la lista de expulsados.")) return;
    await supabase.from("players").update({active: false, flags: -1}).eq("id", id);
    await reload();
  }

  return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",fontFamily:"Georgia,serif",color:"#d4c9a8"}}>
      <div style={{maxWidth:"700px",margin:"0 auto",padding:"0 0 40px 0"}}>
      {/* Header */}
      <div style={{background:"rgba(255,255,255,0.02)",borderBottom:"1px solid rgba(255,215,0,0.15)",padding:"12px 16px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
          <div>
            <div style={{fontSize:"9px",color:"#40E0FF",letterSpacing:"0.3em"}}>ANTIGUA ORDEN · ADMIN</div>
            <div style={{fontFamily:"serif",fontSize:"18px",color:"#FFD700"}}>[AOR] War Command</div>
          </div>
          <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
            {saving && <span style={{fontSize:"10px",color:"#40E0FF"}}>💾</span>}
            <div onClick={()=>setWarActive(!warActive)} style={{display:"flex",alignItems:"center",gap:"5px",padding:"4px 10px",borderRadius:"20px",cursor:"pointer",background:warActive?"rgba(64,224,255,0.1)":"rgba(255,107,107,0.1)",border:"1px solid "+(warActive?"#40E0FF44":"#FF6B6B44"),fontSize:"10px",color:warActive?"#40E0FF":"#FF6B6B"}}>
              {warActive?"⚔ ACTIVA":"✕ SIN GUERRA"}
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
          {[{label:"Miembros",value:players.filter(p=>p.active).length+"/36",color:"#fff",click:null},{label:"Confirmados",value:confirmed.length,color:"#A8FF78",click:null},{label:"Pendientes",value:pending.length,color:"#FFD700",click:null},{label:"No juegan",value:notPlaying.length,color:"#FF9F43",click:null},{label:"Inactivos",value:inactive.length,color:"#888",click:()=>{setActiveTab("admin");setShowInactive(true);setTimeout(()=>document.getElementById("inactivos-section")?.scrollIntoView({behavior:"smooth"}),200);}}].map(s=>(
            <div key={s.label} onClick={s.click||undefined} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"6px",padding:"4px 10px",textAlign:"center",cursor:s.click?"pointer":"default",transition:"all 0.2s"}}>
              <div style={{fontSize:"14px",color:s.color}}>{s.value}</div>
              <div style={{fontSize:"8px",color:"rgba(255,255,255,0.3)",textTransform:"uppercase"}}>{s.label}{s.click?" ↗":""}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Phase */}
      {warActive && (
        <div style={{padding:"8px 16px",borderBottom:"1px solid rgba(255,215,0,0.08)"}}>
          <div style={{display:"flex",gap:"5px",alignItems:"center",overflowX:"auto",marginBottom:"8px"}}>
            <span style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",whiteSpace:"nowrap"}}>FASE:</span>
            {WAR_PHASES.map((ph,i)=>(
              <button key={i} onClick={()=>setPhase(i)} style={{padding:"3px 8px",borderRadius:"4px",fontSize:"9px",whiteSpace:"nowrap",background:phase===i?"rgba(255,215,0,0.15)":"transparent",border:"1px solid "+(phase===i?"#FFD700":"rgba(255,255,255,0.1)"),color:phase===i?"#FFD700":"rgba(255,255,255,0.35)",cursor:"pointer"}}>{ph}</button>
            ))}
          </div>
          {/* Phase players + message */}
          <div style={{background:"rgba(255,215,0,0.04)",border:"1px solid rgba(255,215,0,0.1)",borderRadius:"6px",padding:"8px 10px"}}>
            <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"4px"}}>
              Jugadores para esta fase ({phaseFilters[phase].length}):
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:"4px",marginBottom:"8px"}}>
              {phaseFilters[phase].length === 0
                ? <span style={{fontSize:"10px",color:"rgba(255,255,255,0.3)"}}>Ninguno confirmado aún</span>
                : phaseFilters[phase].map(p=>(
                    <span key={p.id} style={{fontSize:"10px",background:"rgba(255,215,0,0.1)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:"4px",padding:"1px 6px",color:"#FFD700"}}>{p.name}</span>
                  ))
              }
            </div>
            <button onClick={copyPhaseMessage} style={{padding:"4px 12px",borderRadius:"4px",fontSize:"10px",background:copiedMsg?"rgba(168,255,120,0.15)":"rgba(64,224,255,0.1)",border:"1px solid "+(copiedMsg?"rgba(168,255,120,0.3)":"rgba(64,224,255,0.2)"),color:copiedMsg?"#A8FF78":"#40E0FF",cursor:"pointer"}}>
              {copiedMsg?"✓ Copiado!":"📋 Copiar mensaje para el chat"}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,0.07)",padding:"0 16px",overflowX:"auto"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{padding:"10px 12px",background:"transparent",border:"none",whiteSpace:"nowrap",borderBottom:"2px solid "+(activeTab===t.id?"#40E0FF":"transparent"),color:activeTab===t.id?"#40E0FF":"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:"11px"}}>{t.label}</button>
        ))}
      </div>

      <div style={{padding:"14px 0px"}}>

        {/* REGISTRO TAB */}
        {activeTab==="registro" && (
          <div style={{padding:"0 16px"}}>
            <WaReportButtonsAdmin players={players}/>
            <div style={{height:"1px",background:"rgba(255,255,255,0.06)",margin:"12px 0"}}/>
            <div style={{background:"rgba(255,215,0,0.05)",border:"1px solid rgba(255,215,0,0.15)",borderRadius:"8px",padding:"10px 12px",marginBottom:"10px",fontSize:"11px",color:"rgba(255,255,255,0.6)"}}>
              ⚡ <strong style={{color:"#FFD700"}}>{pending.length} jugadores</strong> sin confirmar · <strong style={{color:"#A8FF78"}}>{confirmed.length} confirmados</strong> · <strong style={{color:"#FF9F43"}}>{notPlaying.length} no disponibles</strong>
            </div>
            <button onClick={()=>{
              const registrados = players.filter(p=>p.active&&p.registered_form).sort((a,b)=>b.bp-a.bp);
              const noRegistrados = players.filter(p=>p.active&&!p.registered_form).sort((a,b)=>b.bp-a.bp);
              const avMap = {siempre:"Siempre listo",intermitente:"Intermitente",solo_una:"Solo una vez",no_disponible:"No disponible"};
              let msg = "*[AOR] Registro de Guerra*\n\n";
              msg += `*Confirmados (${registrados.length}):*\n`;
              registrados.forEach(p=>{
                const av = avMap[p.availability]||"";
                if (p.availability==="siempre") {
                  msg += `- *${p.name}* | ${av}\n`;
                } else if (p.availability==="intermitente") {
                  const tarea = p.task_period1||"⚠ Sin seleccionar actividad";
                  msg += `- *${p.name}* | ${av} | ${tarea}\n`;
                } else {
                  const tarea = p.task_period1 ? ` | ${p.task_period1}` : "";
                  msg += `- *${p.name}* | ${av}${tarea}\n`;
                }
              });
              msg += `\n*Sin registrar (${noRegistrados.length}):*\n`;
              noRegistrados.forEach(p=>{ msg += `- *${p.name}*\n`; });
              msg += `\n📋 *Regístrate aquí:* https://aor-war-command.vercel.app/registro`;
              navigator.clipboard.writeText(msg);
              alert("Copiado al portapapeles. Pega en WhatsApp.");
            }} style={{width:"100%",padding:"10px",background:"rgba(37,211,102,0.1)",border:"1px solid rgba(37,211,102,0.3)",borderRadius:"6px",color:"#25D366",fontSize:"12px",cursor:"pointer",marginBottom:"10px"}}>
              📋 Copiar reporte para WhatsApp
            </button>
            {players.filter(p=>p.active).sort((a,b)=>{
              if (a.registered_form && !b.registered_form) return -1;
              if (!a.registered_form && b.registered_form) return 1;
              return b.bp - a.bp;
            }).map(p=>{
              const avail = AVAILABILITY[p.availability]||AVAILABILITY.pendiente;
              const tz    = TIMEZONES[p.timezone]||TIMEZONES.mexico;
              const tasks = getTasksForPlayer(p.availability, p.level);
              return (
                <div key={p.id} style={{background:"rgba(255,255,255,0.02)",border:"1px solid "+avail.color+"33",borderLeft:"3px solid "+avail.color,borderRadius:"8px",padding:"10px 12px",marginBottom:"6px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",gap:"6px",alignItems:"center",marginBottom:"4px",flexWrap:"wrap"}}>
                        <span style={{fontFamily:"serif",fontSize:"13px",color:"#fff"}}>{p.name}</span>
                        <span style={{fontSize:"10px",color:"#FF6B6B"}}>💀 {(p.bp||0).toLocaleString()}</span>
                        <span style={{fontSize:"10px",color:"rgba(255,255,255,0.4)"}}>⚔ {((p.level||0)/1000).toFixed(1)}k</span>
                        <Pill color={avail.color}>{avail.icon} {avail.label}</Pill>
                        {p.registered_form && <Pill color="#A8FF78">✓ Form</Pill>}
                      </div>
                      {p.availability !== "pendiente" && (
                        <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"4px"}}>
                          {tz.flag} {p.hour_mx} → 🇲🇽 {convertTime(p.hour_mx,p.timezone||"mexico","mexico")} · 🇪🇸 {convertTime(p.hour_mx,p.timezone||"mexico","espana")}
                        </div>
                      )}
                      {p.task_period1 && (
                        <div style={{fontSize:"10px",color:"#40E0FF"}}>📋 {p.task_period1}</div>
                      )}
                      {tasks.period1.length > 0 && p.availability !== "pendiente" && p.availability !== "no_disponible" && (
                        <div style={{fontSize:"10px",color:"rgba(255,255,255,0.3)",marginTop:"2px"}}>
                          P1: {tasks.period1.join(" / ")} {tasks.period2.length>0 && "· P2: "+tasks.period2.join(" / ")}
                        </div>
                      )}
                    </div>
                    <div style={{marginLeft:"8px",display:"flex",flexDirection:"column",gap:"4px"}}>
                      <Pill color={getRank(totalPts(p)).color}>{totalPts(p)}pts</Pill>
                      {(p.pts_acumulados||0) < 0 && p.whatsapp && (
                        <button onClick={()=>{
                          const curr = p.pts_acumulados||0;
                          const reduced = Math.round((curr * 0.1) / 10) * 10;
                          if (confirm("¿Reducir pts negativos de "+curr+" a "+reduced+" (90% condonación)?"))
                            update(p.id,{pts_acumulados: reduced});
                        }} style={{padding:"2px 6px",borderRadius:"4px",fontSize:"8px",background:"rgba(255,215,0,0.1)",border:"1px solid rgba(255,215,0,0.2)",color:"#FFD700",cursor:"pointer",whiteSpace:"nowrap"}}>
                          ✨ -90%
                        </button>
                      )}
                      <button onClick={()=>{
                          if(!confirm("¿Borrar la inscripción de "+p.name+"?")) return;
                          update(p.id,{
                            availability:"pendiente", registered_form:false,
                            registered_week:"",
                            hour_mx:"No sé", task_period1:"",
                            pt_registro:0, pt_disponibilidad_declarada:0
                          });
                        }} style={{padding:"2px 6px",borderRadius:"4px",fontSize:"9px",background:p.registered_form?"rgba(255,107,107,0.15)":"rgba(255,255,255,0.04)",border:"1px solid "+(p.registered_form?"rgba(255,107,107,0.3)":"rgba(255,255,255,0.08)"),color:p.registered_form?"#FF6B6B":"rgba(255,255,255,0.3)",cursor:"pointer",whiteSpace:"nowrap"}}>
                          {p.registered_form?"↺ Borrar inscr.":"— Sin inscripción"}
                        </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ROSTER TAB */}
        {activeTab==="roster" && (
          <div style={{padding:"0 16px"}}>
            {players.filter(p=>p.active).sort((a,b)=>{
              if (a.name === "PUNK'Z") return -1;
              if (b.name === "PUNK'Z") return 1;
              const getRankOrder = p => {
                const total = (p.pts_acumulados||0) + (p.pts_honorificos||0);
                if (total >= 25000) return 0;
                if (total >= 5000)  return 1;
                if (total >= 1000)  return 2;
                if (total >= 500)   return 3;
                if (total >= 100)   return 4;
                if (total >= 0)     return 5;
                return 6;
              };
              const ra = getRankOrder(a);
              const rb = getRankOrder(b);
              if (ra !== rb) return ra - rb;
              // Within same rank: registered first
              if (a.registered_form && !b.registered_form) return -1;
              if (!a.registered_form && b.registered_form) return 1;
              // Within registered: by war role
              const roleOrder = ["siempre","intermitente","solo_una","no_disponible","pendiente"];
              const roa = roleOrder.indexOf(a.availability);
              const rob = roleOrder.indexOf(b.availability);
              if (roa !== rob) return roa - rob;
              return b.bp - a.bp;
            }).map(p=>{
              const avail = AVAILABILITY[p.availability]||AVAILABILITY.pendiente;
              const warRole = p.availability==="siempre" ? {label:"Conquistador",icon:"⚔",color:"#A8FF78"}
                : p.availability==="intermitente" ? {label:"Refuerzo",icon:"🛡",color:"#FFD700"}
                : p.availability==="solo_una" ? {label:"Scouting",icon:"👁",color:"#40E0FF"}
                : p.availability==="no_disponible" ? {label:"Ausente",icon:"🚫",color:"#FF6B6B"}
                : {label:"Sin asignar",icon:"❓",color:"#666666"};
              const isEditing = editingId===p.id;
              return (
                <div key={p.id} style={{background:"rgba(255,255,255,0.02)",border:"1px solid "+avail.color+"22",borderLeft:"3px solid "+warRole.color,borderRadius:"8px",padding:"10px 12px",marginBottom:"6px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",gap:"6px",alignItems:"center",marginBottom:"6px",flexWrap:"wrap"}}>
                        <span style={{fontFamily:"serif",fontSize:"13px",color:"#fff"}}>{p.name}</span>
                        {!p.whatsapp && <Pill color="#25D366">📵 Sin WhatsApp</Pill>}
                        <Pill color={warRole.color}>{warRole.icon} {warRole.label}</Pill>
                        <Pill color={getRank((p.pts_acumulados||0)+(p.pts_honorificos||0), p.pts_honorificos, p.name).color}>{p.clan_role}</Pill>
                        <Pill color="#888">{totalPts(p)}pts guerra</Pill>
                      </div>
                      {isEditing ? (
                        <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                          <div style={{display:"flex",gap:"8px"}}>
                            <div>
                              <div style={{fontSize:"9px",color:"rgba(255,255,255,0.4)",marginBottom:"2px"}}>⚔ Poder</div>
                              <input defaultValue={p.level} id={"level_"+p.id} style={{width:"90px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"4px",color:"#fff",padding:"4px 8px",fontSize:"12px",outline:"none"}}/>
                            </div>
                            <div>
                              <div style={{fontSize:"9px",color:"rgba(255,255,255,0.4)",marginBottom:"2px"}}>💀 BP</div>
                              <input defaultValue={p.bp} id={"bp_"+p.id} style={{width:"80px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"4px",color:"#fff",padding:"4px 8px",fontSize:"12px",outline:"none"}}/>
                            </div>
                          </div>
                          <div>
                            <div style={{fontSize:"9px",color:"rgba(255,255,255,0.4)",marginBottom:"2px"}}>Rango del clan</div>
                            <select defaultValue={p.clan_role||"Recluta"} id={"clan_role_"+p.id} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"4px",color:"#fff",padding:"4px 8px",fontSize:"12px",outline:"none"}}>
                              {["Líder","Co-Líder","Oficial","Veterano","Guerrero","Soldado","Recluta"].map(r=><option key={r} value={r} style={{background:"#1a1a1f"}}>{r}</option>)}
                            </select>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                            <div style={{fontSize:"9px",color:"rgba(255,255,255,0.4)"}}>📱 WhatsApp</div>
                            <button onClick={()=>{
                              const newVal = !p.whatsapp;
                              const pts = newVal ? (confirm('Fundador del grupo? OK=50pts / Cancelar=25pts') ? 50 : 25) : 0;
                              update(p.id,{whatsapp:newVal, pt_whatsapp: pts});
                            }} style={{padding:"3px 10px",borderRadius:"4px",fontSize:"10px",background:p.whatsapp?"rgba(37,211,102,0.15)":"rgba(255,107,107,0.15)",border:"1px solid "+(p.whatsapp?"rgba(37,211,102,0.3)":"rgba(255,107,107,0.3)"),color:p.whatsapp?"#25D366":"#FF6B6B",cursor:"pointer"}}>
                              {p.whatsapp?"✓ En grupo":"✕ Sin grupo"}
                            </button>
                          </div>
                          <div style={{fontSize:"9px",color:"rgba(255,215,0,0.6)",padding:"4px 6px",background:"rgba(255,215,0,0.05)",borderRadius:"4px"}}>
                            ⚠ Cambiar rango ajusta pts honoríficos: Líder=25k · Co-Líder=10k · Oficial=1k · resto=0
                          </div>
                          <div style={{display:"flex",gap:"6px"}}>
                            <button onClick={async()=>{
                              const level = parseInt(document.getElementById("level_"+p.id).value);
                              const bp    = parseInt(document.getElementById("bp_"+p.id).value);
                              const clan_role = document.getElementById("clan_role_"+p.id).value;
                              const honorMap = {"Líder":25000,"Co-Líder":25000,"Oficial":5000};
                              const pts_honorificos = honorMap[clan_role]||0;
                              await update(p.id,{level,bp,clan_role,pts_honorificos});
                              await supabase.from("player_stats").insert({
                                player_id: p.id, player_name: p.name,
                                bp, level, updated_by: "admin"
                              });
                              setEditingId(null);
                            }} style={{padding:"5px 12px",borderRadius:"4px",background:"rgba(168,255,120,0.15)",border:"1px solid rgba(168,255,120,0.3)",color:"#A8FF78",fontSize:"11px",cursor:"pointer"}}>Guardar</button>
                            <button onClick={()=>setEditingId(null)} style={{padding:"5px 12px",borderRadius:"4px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.4)",fontSize:"11px",cursor:"pointer"}}>Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{display:"flex",gap:"10px",fontSize:"11px",color:"rgba(255,255,255,0.4)"}}>
                          <span>⚔ {((p.level||0)/1000).toFixed(1)}k</span>
                          <span>💀 {(p.bp||0).toLocaleString()}</span>
                          <FlagBar count={computedFlags(p)}/>
                        </div>
                      )}
                    </div>
                    {!isEditing && (
                      <div style={{display:"flex",flexDirection:"column",gap:"4px",marginLeft:"8px"}}>
                        <button onClick={()=>setEditingId(p.id)} style={{padding:"3px 8px",borderRadius:"4px",fontSize:"10px",background:"rgba(255,215,0,0.1)",border:"1px solid rgba(255,215,0,0.2)",color:"#FFD700",cursor:"pointer"}}>✏ Editar</button>
                        <button onClick={()=>removePlayer(p.id)} style={{padding:"3px 8px",borderRadius:"4px",fontSize:"10px",background:"rgba(255,107,107,0.1)",border:"1px solid rgba(255,107,107,0.2)",color:"#FF6B6B",cursor:"pointer"}}>🚫 Expulsar</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* PUNTOS TAB */}
        {activeTab==="puntos" && (
          <div style={{padding:"0 16px"}}>
            <div style={{display:"flex",gap:"6px",marginBottom:"14px",flexWrap:"wrap"}}>
              {[
                {label:"Siempre listo",color:"#A8FF78",pts:"+10"},
                {label:"Intermitente",color:"#FFD700",pts:"+5"},
                {label:"Solo una vez",color:"#FF9F43",pts:"+2"},
                {label:"No disponible",color:"#888",pts:"+1"},
                {label:"Apareció",color:"#A8FF78",pts:"+3"},
                {label:"Órdenes",color:"#FFD700",pts:"+2"},
                {label:"Batalla ganada",color:"#40E0FF",pts:"+2"},
                {label:"Batalla perdida",color:"#40E0FF",pts:"+1"},
                {label:"Defensa castillo",color:"#40E0FF",pts:"+1"},
                {label:"Todo cumplido",color:"#FFD700",pts:"+5"},
              ].map(c=>(
                <div key={c.label} style={{background:c.color+"11",border:"1px solid "+c.color+"33",borderRadius:"6px",padding:"3px 8px",fontSize:"9px",color:c.color}}>{c.label} <strong>{c.pts}</strong></div>
              ))}
              {[
                {label:"No apareció",color:"#FF6B6B",pts:"-10/-7/-5"},
                {label:"Ignoró orden",color:"#FF6B6B",pts:"-2"},
                {label:"Abandonó",color:"#FF6B6B",pts:"-2"},
                {label:"Inactivo 12h",color:"#FF6B6B",pts:"-3"},
              ].map(c=>(
                <div key={c.label} style={{background:"rgba(255,107,107,0.08)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:"6px",padding:"3px 8px",fontSize:"9px",color:"#FF6B6B"}}>{c.label} <strong>{c.pts}</strong></div>
              ))}
            </div>

            {players.filter(p=>p.active).sort((a,b)=>totalPts(b)-totalPts(a)).map((p,i)=>{
              const pts  = totalPts(p);
              const rank = getRank(pts);
              return (
                <div key={p.id} style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"8px",padding:"10px 12px",marginBottom:"6px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                    <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                      <span style={{fontSize:"13px",color:i<3?"#FFD700":"rgba(255,255,255,0.7)"}}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":(i+1)+"."} {p.name}</span>
                      <Pill color={rank.color}>{rank.label}</Pill>
                    </div>
                    <span style={{fontSize:"20px",color:pts<0?"#FF6B6B":"#FFD700",fontWeight:"bold"}}>{pts}</span>
                  </div>
                  <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                    {/* Apareció — toggle */}
                    <div style={{display:"flex",flexDirection:"column",gap:"2px",alignItems:"center"}}>
                      <span style={{fontSize:"8px",color:"rgba(255,255,255,0.3)"}}>✅ Apareció</span>
                      <button onClick={()=>update(p.id,{pt_disponibilidad:(p.pt_disponibilidad||0)>0?0:3})}
                        style={{padding:"3px 6px",borderRadius:"4px",fontSize:"10px",cursor:"pointer",fontWeight:"bold",
                          background:(p.pt_disponibilidad||0)>0?"rgba(168,255,120,0.2)":"rgba(255,255,255,0.04)",
                          border:"1px solid "+((p.pt_disponibilidad||0)>0?"rgba(168,255,120,0.4)":"rgba(255,255,255,0.1)"),
                          color:(p.pt_disponibilidad||0)>0?"#A8FF78":"rgba(255,255,255,0.3)"}}>
                        {(p.pt_disponibilidad||0)>0?"+3 ✓":"0"}
                      </button>
                    </div>
                    {/* Órdenes — toggle */}
                    <div style={{display:"flex",flexDirection:"column",gap:"2px",alignItems:"center"}}>
                      <span style={{fontSize:"8px",color:"rgba(255,255,255,0.3)"}}>📋 Órdenes</span>
                      <button onClick={()=>update(p.id,{pt_obediencia:(p.pt_obediencia||0)>0?0:2})}
                        style={{padding:"3px 6px",borderRadius:"4px",fontSize:"10px",cursor:"pointer",fontWeight:"bold",
                          background:(p.pt_obediencia||0)>0?"rgba(255,215,0,0.2)":"rgba(255,255,255,0.04)",
                          border:"1px solid "+((p.pt_obediencia||0)>0?"rgba(255,215,0,0.4)":"rgba(255,255,255,0.1)"),
                          color:(p.pt_obediencia||0)>0?"#FFD700":"rgba(255,255,255,0.3)"}}>
                        {(p.pt_obediencia||0)>0?"+2 ✓":"0"}
                      </button>
                    </div>
                    {/* Batallas ganadas */}
                    <div style={{display:"flex",flexDirection:"column",gap:"2px",alignItems:"center"}}>
                      <span style={{fontSize:"8px",color:"rgba(255,255,255,0.3)"}}>⚔ B.Gan +2{(p.pt_batallas_ganadas||0)>=6?" 🌟":""}</span>
                      <Stepper value={p.pt_batallas_ganadas||0} onChange={v=>update(p.id,{pt_batallas_ganadas:v})} color="#40E0FF"/>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:"2px",alignItems:"center"}}>
                      <span style={{fontSize:"8px",color:"rgba(255,255,255,0.3)"}}>🛡 B.Per +1</span>
                      <Stepper value={p.pt_batallas_perdidas||0} onChange={v=>update(p.id,{pt_batallas_perdidas:v})} color="#40E0FF"/>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:"2px",alignItems:"center"}}>
                      <span style={{fontSize:"8px",color:"rgba(255,255,255,0.3)"}}>🏰 Def +1</span>
                      <Stepper value={p.pt_defensas||0} onChange={v=>update(p.id,{pt_defensas:v})} color="#40E0FF"/>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:"2px",alignItems:"center"}}>
                      <span style={{fontSize:"8px",color:"rgba(255,255,255,0.3)"}}>🌟 Bonus</span>
                      <button onClick={()=>update(p.id,{pt_bonus:(p.pt_bonus||0)>0?0:5})}
                        style={{padding:"3px 6px",borderRadius:"4px",fontSize:"10px",cursor:"pointer",fontWeight:"bold",
                          background:(p.pt_bonus||0)>0?"rgba(255,215,0,0.2)":"rgba(255,255,255,0.04)",
                          border:"1px solid "+((p.pt_bonus||0)>0?"rgba(255,215,0,0.4)":"rgba(255,255,255,0.1)"),
                          color:(p.pt_bonus||0)>0?"#FFD700":"rgba(255,255,255,0.3)"}}>
                        {(p.pt_bonus||0)>0?"+5 ✓":"0"}
                      </button>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:"2px",alignItems:"center"}}>
                      <span style={{fontSize:"8px",color:"rgba(255,255,255,0.3)"}}>🏴‍☠ Bandido +1</span>
                      <Stepper value={p.pt_bandido_post||0} onChange={v=>update(p.id,{pt_bandido_post:v})} color="#A8FF78"/>
                    </div>
                    {[].map(()=>null)}
                    {/* No apareció - auto penalty based on declared availability */}
                    <div style={{display:"flex",flexDirection:"column",gap:"2px",alignItems:"center"}}>
                      <span style={{fontSize:"8px",color:"rgba(255,255,255,0.3)"}}>❌ No apareció (-{AVAILABILITY[p.availability]?.penalty||0})</span>
                      <div style={{display:"flex",gap:"2px"}}>
                        {[0,1].map(v=>(
                          <button key={v} onClick={()=>update(p.id,{pt_no_aparecio: v ? AVAILABILITY[p.availability]?.penalty||0 : 0})} style={{width:"36px",height:"22px",borderRadius:"4px",fontSize:"10px",cursor:"pointer",background:(v===0&&(p.pt_no_aparecio||0)===0)||(v===1&&(p.pt_no_aparecio||0)>0)?"rgba(255,107,107,0.44)":"rgba(255,255,255,0.04)",border:"1px solid "+((v===0&&(p.pt_no_aparecio||0)===0)||(v===1&&(p.pt_no_aparecio||0)>0)?"#FF6B6B":"rgba(255,255,255,0.08)"),color:(v===0&&(p.pt_no_aparecio||0)===0)||(v===1&&(p.pt_no_aparecio||0)>0)?"#FF6B6B":"rgba(255,255,255,0.3)"}}>{v===0?"No":"Sí"}</button>
                        ))}
                      </div>
                    </div>
                    {/* No se registró y no participó -20 */}
                    <div style={{display:"flex",flexDirection:"column",gap:"2px",alignItems:"center"}}>
                      <span style={{fontSize:"8px",color:"rgba(255,255,255,0.3)"}}>🚫 Sin registro ni participación (-20)</span>
                      <div style={{display:"flex",gap:"2px"}}>
                        {[0,1].map(v=>(
                          <button key={v} onClick={()=>update(p.id,{pt_penalizacion: v ? 20 : 0})} style={{width:"36px",height:"22px",borderRadius:"4px",fontSize:"10px",cursor:"pointer",background:(v===0&&(p.pt_penalizacion||0)===0)||(v===1&&(p.pt_penalizacion||0)===20)?"rgba(255,107,107,0.44)":"rgba(255,255,255,0.04)",border:"1px solid "+((v===0&&(p.pt_penalizacion||0)===0)||(v===1&&(p.pt_penalizacion||0)===20)?"#FF6B6B":"rgba(255,255,255,0.08)"),color:(v===0&&(p.pt_penalizacion||0)===0)||(v===1&&(p.pt_penalizacion||0)===20)?"#FF6B6B":"rgba(255,255,255,0.3)"}}>{v===0?"No":"Sí"}</button>
                        ))}
                      </div>
                    </div>
                    {/* No se registró pero sí participó +3 */}
                    <div style={{display:"flex",flexDirection:"column",gap:"2px",alignItems:"center"}}>
                      <span style={{fontSize:"8px",color:"rgba(168,255,120,0.8)"}}>✅ Sin registro pero participó (+3)</span>
                      <div style={{display:"flex",gap:"2px"}}>
                        {[0,1].map(v=>(
                          <button key={v} onClick={()=>update(p.id,{pt_disponibilidad: v ? 3 : 0})} style={{width:"36px",height:"22px",borderRadius:"4px",fontSize:"10px",cursor:"pointer",background:(v===0&&(p.pt_disponibilidad||0)===0)||(v===1&&(p.pt_disponibilidad||0)>0)?"rgba(168,255,120,0.44)":"rgba(255,255,255,0.04)",border:"1px solid "+((v===0&&(p.pt_disponibilidad||0)===0)||(v===1&&(p.pt_disponibilidad||0)>0)?"#A8FF78":"rgba(255,255,255,0.08)"),color:(v===0&&(p.pt_disponibilidad||0)===0)||(v===1&&(p.pt_disponibilidad||0)>0)?"#A8FF78":"rgba(255,255,255,0.3)"}}>{v===0?"No":"Sí"}</button>
                        ))}
                      </div>
                    </div>
                    {[
                      {label:"Ignoró -2",key:"pt_ignoro_orden",color:"#FF9F43"},
                      {label:"Abandonó -2",key:"pt_abandono",color:"#FF9F43"},
                      {label:"🏰 Fuera castillo -2",key:"pt_fuera_castillo",color:"#FF6B6B"},
                      {label:"Inactivo 12h -3",key:"pt_inactivo_4h",color:"#FF6B6B"},
                      {label:"🏴‍☠ Bandido pre-guerra -1",key:"pt_bandido_pre",color:"#FF6B6B"},
                    ].map(cat=>(
                      <div key={cat.key} style={{display:"flex",flexDirection:"column",gap:"2px",alignItems:"center"}}>
                        <span style={{fontSize:"8px",color:"rgba(255,255,255,0.3)"}}>{cat.label}</span>
                        <div style={{display:"flex",gap:"2px"}}>
                          {[0,1,2,3].map(v=>(
                            <button key={v} onClick={()=>update(p.id,{[cat.key]:v})} style={{width:"22px",height:"22px",borderRadius:"4px",fontSize:"10px",cursor:"pointer",background:p[cat.key]===v?cat.color+"44":"rgba(255,255,255,0.04)",border:"1px solid "+(p[cat.key]===v?cat.color:"rgba(255,255,255,0.08)"),color:p[cat.key]===v?cat.color:"rgba(255,255,255,0.3)"}}>{v}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ADMIN TAB */}
        {activeTab==="admin" && (
          <div style={{padding:"0 16px"}}>
            {/* Gestas heroicas — FIRST */}
            <div style={{display:"flex",gap:"8px",marginBottom:"12px",flexWrap:"wrap"}}>
              <HeroicPointsButton players={players} update={update} reload={reload}/>
              <FirstMobilizationButton players={players} update={update} reload={reload}/>
            </div>

            {/* War Intel — SECOND */}
            <WarIntelPanel players={players} reload={reload}/>
            <div style={{height:"1px",background:"rgba(255,255,255,0.06)",margin:"16px 0"}}/>

            {/* Daily limit setting */}
            <DailyLimitSetting/>
            <div style={{height:"1px",background:"rgba(255,255,255,0.06)",margin:"16px 0"}}/>

            <div style={{fontFamily:"serif",color:"#FFD700",fontSize:"14px",marginBottom:"12px"}}>➕ Agregar jugador</div>
            {addingPlayer ? (
              <div style={{background:"rgba(64,224,255,0.05)",border:"1px solid rgba(64,224,255,0.15)",borderRadius:"8px",padding:"14px",marginBottom:"16px"}}>
                {[{label:"Nombre en el juego",key:"name",ph:"Exactamente como en el juego"},{label:"⚔ Poder",key:"level",ph:"Ej: 90825"},{label:"💀 Battle Points",key:"bp",ph:"Ej: 2936"}].map(f=>(
                  <div key={f.key} style={{marginBottom:"10px"}}>
                    <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"4px"}}>{f.label}</div>
                    <input value={newPlayer[f.key]} onChange={e=>setNewPlayer({...newPlayer,[f.key]:e.target.value})} placeholder={f.ph} style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"6px",color:"#fff",padding:"8px 10px",fontSize:"12px",outline:"none",boxSizing:"border-box"}}/>
                  </div>
                ))}
                <div style={{display:"flex",gap:"8px"}}>
                  <button onClick={addPlayer} style={{flex:1,padding:"8px",background:"rgba(168,255,120,0.15)",border:"1px solid rgba(168,255,120,0.3)",borderRadius:"6px",color:"#A8FF78",fontSize:"12px",cursor:"pointer"}}>Agregar</button>
                  <button onClick={()=>setAddingPlayer(false)} style={{padding:"8px 12px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"6px",color:"rgba(255,255,255,0.4)",fontSize:"12px",cursor:"pointer"}}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button onClick={()=>setAddingPlayer(true)} style={{width:"100%",padding:"10px",background:"rgba(64,224,255,0.08)",border:"1px dashed rgba(64,224,255,0.3)",borderRadius:"6px",color:"#40E0FF",fontSize:"12px",cursor:"pointer",marginBottom:"16px"}}>+ Nuevo jugador</button>
            )}

            <div style={{fontFamily:"serif",color:"#FFD700",fontSize:"14px",marginBottom:"12px"}}>⚠ Jugadores bajo mínimo mensual</div>
            {players.filter(p=>p.active&&totalPts(p)<20).sort((a,b)=>totalPts(a)-totalPts(b)).map(p=>(
              <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",marginBottom:"4px",background:"rgba(255,107,107,0.05)",border:"1px solid rgba(255,107,107,0.15)",borderRadius:"6px"}}>
                <span style={{fontSize:"12px",color:"#fff"}}>{p.name}</span>
                <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                  <span style={{fontSize:"13px",color:"#FF6B6B",fontWeight:"bold"}}>{totalPts(p)} pts</span>
                  <button onClick={()=>removePlayer(p.id)} style={{padding:"3px 8px",borderRadius:"4px",fontSize:"10px",background:"rgba(255,107,107,0.1)",border:"1px solid rgba(255,107,107,0.2)",color:"#FF6B6B",cursor:"pointer"}}>Expulsar</button>
                </div>
              </div>
            ))}

            <div id="inactivos-section" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px",marginTop:"20px"}}>
              <div style={{fontFamily:"serif",color:"#888",fontSize:"14px"}}>💤 Jugadores inactivos ({inactive.length})</div>
              <button onClick={()=>setShowInactive(!showInactive)} style={{padding:"3px 10px",borderRadius:"4px",fontSize:"10px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.4)",cursor:"pointer"}}>
                {showInactive?"Ocultar":"Ver lista"}
              </button>
            </div>
            {showInactive && (
              <div>
                {inactive.length === 0 && <div style={{fontSize:"11px",color:"rgba(255,255,255,0.3)",marginBottom:"12px"}}>No hay jugadores inactivos.</div>}
                {inactive.map(p=>(
                  <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",marginBottom:"4px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"6px"}}>
                    <div>
                      <div style={{fontSize:"12px",color:"rgba(255,255,255,0.5)"}}>{p.name}</div>
                      <div style={{display:"flex",gap:"6px",alignItems:"center",marginTop:"3px"}}>
                        <span style={{fontSize:"10px",color:"#888"}}>Último: {p.last_seen}</span>
                        <input defaultValue={p.last_seen} id={"ls_"+p.id} style={{width:"80px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"4px",color:"#fff",padding:"2px 6px",fontSize:"10px",outline:"none"}} placeholder="dd.m.aa"/>
                        <button onClick={()=>{ const v=document.getElementById("ls_"+p.id).value; update(p.id,{last_seen:v}); }} style={{padding:"2px 6px",borderRadius:"4px",fontSize:"9px",background:"rgba(255,215,0,0.1)",border:"1px solid rgba(255,215,0,0.2)",color:"#FFD700",cursor:"pointer"}}>✓</button>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:"6px"}}>
                      <button onClick={()=>update(p.id,{active:true})} style={{padding:"3px 8px",borderRadius:"4px",fontSize:"10px",background:"rgba(168,255,120,0.1)",border:"1px solid rgba(168,255,120,0.2)",color:"#A8FF78",cursor:"pointer"}}>Reactivar</button>
                      <button onClick={()=>removePlayer(p.id)} style={{padding:"3px 8px",borderRadius:"4px",fontSize:"10px",background:"rgba(255,107,107,0.1)",border:"1px solid rgba(255,107,107,0.2)",color:"#FF6B6B",cursor:"pointer"}}>Expulsar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* War Intel */}
            <WarIntelPanel players={players} reload={reload}/>
            <div style={{height:"1px",background:"rgba(255,255,255,0.06)",margin:"16px 0"}}/>

            {/* Expulsados */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px",marginTop:"20px"}}>
              <div style={{fontFamily:"serif",color:"#FF6B6B",fontSize:"14px"}}>🚫 Expulsados ({expelled.length})</div>
            </div>
            {expelled.length === 0
              ? <div style={{fontSize:"11px",color:"rgba(255,255,255,0.3)",marginBottom:"12px"}}>Sin expulsados.</div>
              : expelled.map(p=>(
                <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",marginBottom:"4px",background:"rgba(255,107,107,0.03)",border:"1px solid rgba(255,107,107,0.12)",borderRadius:"6px"}}>
                  <div style={{fontSize:"12px",color:"rgba(255,100,100,0.7)"}}>{p.name}</div>
                  <button onClick={()=>update(p.id,{active:true,flags:10})} style={{padding:"3px 8px",borderRadius:"4px",fontSize:"10px",background:"rgba(168,255,120,0.1)",border:"1px solid rgba(168,255,120,0.2)",color:"#A8FF78",cursor:"pointer"}}>Readmitir</button>
                </div>
              ))
            }

            {/* Archive war — LAST */}
            <div style={{marginTop:"24px",background:"rgba(255,107,107,0.04)",border:"1px solid rgba(255,107,107,0.15)",borderRadius:"8px",padding:"12px"}}>
              <div style={{fontFamily:"serif",color:"#FF6B6B",fontSize:"13px",marginBottom:"6px"}}>Cerrar guerra y resetear</div>
              <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",marginBottom:"10px"}}>Archiva los puntos en el historial y resetea contadores para la siguiente guerra. Ejecutar cada viernes.</div>
              <button onClick={weeklyReset} style={{padding:"8px 16px",background:"rgba(255,107,107,0.12)",border:"1px solid rgba(255,107,107,0.25)",borderRadius:"6px",color:"#FF6B6B",fontSize:"12px",cursor:"pointer"}}>
                Archivar guerra y resetear puntos
              </button>
            </div>
          </div>
        )}

        {/* MENSAJES TAB */}
        {activeTab==="mensajes" && <MensajesTab players={players}/>}
        {activeTab==="visitas" && <VisitsTab/>}
        {activeTab==="seguridad" && <SeguridadTab players={players}/>}
        {activeTab==="links" && (
          <div style={{padding:"0 16px"}}>
            <div style={{fontFamily:"serif",color:"#FFD700",fontSize:"14px",marginBottom:"16px"}}>🔗 Links de la app</div>
            {[
              {label:"📊 Ranking / Reporte",url:"https://aor-war-command.vercel.app/reporte",color:"#40E0FF",desc:"Ver posiciones, perfiles y puntos acumulados",icon:"📊"},
              {label:"📋 Registro de Guerra",url:"https://aor-war-command.vercel.app/registro",color:"#A8FF78",desc:"Confirmar participación — cierra jueves 12am MX",icon:"📋"},
              {label:"❓ Cómo funciona",url:"https://aor-war-command.vercel.app/puntos",color:"#FFD700",desc:"Sistema de puntos, rangos y penalizaciones",icon:"❓"},
              {label:"📡 Propaganda",url:"https://aor-war-command.vercel.app/propaganda",color:"#C8A2FF",desc:"Mensajes de difusión preaprobados para el clan",icon:"📡"},
              {label:"Inteligencia",url:"https://aor-war-command.vercel.app/inteligencia",color:"#FF6B6B",desc:"Resultados de guerra, rivales y votación de dificultad",icon:"🎯"},
              {label:"Asamblea",url:"https://aor-war-command.vercel.app/asamblea",color:"#FFD700",desc:"Vota al Guerrero Implacable de la semana",icon:"⚔"},
            ].map(link=>(
              <div key={link.url} style={{background:link.color+"0A",border:"2px solid "+link.color+"33",borderRadius:"12px",padding:"18px 20px",marginBottom:"14px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"6px"}}>
                  <span style={{fontSize:"28px"}}>{link.icon}</span>
                  <div>
                    <div style={{fontSize:"15px",color:link.color,fontWeight:"bold"}}>{link.label}</div>
                    <div style={{fontSize:"11px",color:"rgba(255,255,255,0.45)",marginTop:"2px"}}>{link.desc}</div>
                  </div>
                </div>
                <div style={{fontFamily:"monospace",fontSize:"10px",color:link.color+"AA",background:"rgba(0,0,0,0.3)",padding:"5px 10px",borderRadius:"6px",marginBottom:"10px",wordBreak:"break-all"}}>{link.url}</div>
                <div style={{display:"flex",gap:"8px"}}>
                  <button onClick={()=>navigator.clipboard.writeText(link.url)} style={{flex:1,padding:"8px",background:link.color+"22",border:"1px solid "+link.color+"44",borderRadius:"8px",color:link.color,fontSize:"12px",cursor:"pointer",fontWeight:"bold"}}>📋 Copiar link</button>
                  <a href={link.url} target="_blank" rel="noreferrer" style={{flex:1,padding:"8px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"8px",color:"rgba(255,255,255,0.5)",fontSize:"12px",cursor:"pointer",textDecoration:"none",textAlign:"center",display:"block"}}>🔗 Abrir</a>
                </div>
              </div>
            ))}
          </div>
        )}


      </div>
      </div>
      <div style={{height:"36px"}}/>
      <NalguitasFooter/>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────


// ── Admin Auth ──────────────────────────────────────────────────────────────
const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || "AOR2026";

function AdminAuth({onAuth}) {
  const [pin, setPin]     = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  function tryPin() {
    if (pin === ADMIN_PIN) {
      sessionStorage.setItem("aor_auth", "1");
      onAuth();
    } else {
      setError(true); setShake(true); setPin("");
      setTimeout(()=>setShake(false), 500);
    }
  }

  const publicLinks = [
    {href:"/registro",     color:"#A8FF78", icon:"📋", label:"Registro de Guerra",    desc:"Confirma tu participación y suma puntos"},
    {href:"/reporte",      color:"#40E0FF", icon:"📊", label:"Ranking [AOR]",          desc:"Posiciones, perfiles y puntos del clan"},
    {href:"/puntos",       color:"#FF9F43", icon:"❓", label:"Sistema de Puntos",      desc:"Cómo ganar y perder puntos en cada guerra"},
    {href:"/propaganda",   color:"#C8A2FF", icon:"📡", label:"Propaganda de Guerra",   desc:"Mensajes preaprobados para difundir en el clan"},
    {href:"/inteligencia", color:"#FF6B6B", icon:"⚔",  label:"Inteligencia Militar",   desc:"Resultados de guerra y votación de dificultad rival"},
    {href:"/asamblea",     color:"#FFD700", icon:"★",  label:"Asamblea",               desc:"Vota al Guerrero Implacable de la semana"},
  ];

  return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",fontFamily:"Georgia,serif",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"20px",paddingBottom:"40px"}}>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <PageHeader page="/"/>

      {/* Public links — FIRST, prominent */}
      <div style={{width:"100%",maxWidth:"360px",marginBottom:"28px",animation:"fadeIn 0.7s ease"}}>
        <div style={{fontSize:"9px",color:"rgba(255,255,255,0.25)",letterSpacing:"0.3em",textAlign:"center",marginBottom:"12px"}}>ACCESO ABIERTO — SIN PIN</div>
        {publicLinks.map(l=>(
          <a key={l.href} href={l.href} style={{
            display:"flex",alignItems:"center",gap:"12px",
            padding:"13px 16px",marginBottom:"8px",
            background:l.color+"08",
            border:"1px solid "+l.color+"30",
            borderRadius:"10px",
            textDecoration:"none",
            transition:"all 0.15s",
          }}
          onMouseEnter={e=>{ e.currentTarget.style.background=l.color+"14"; e.currentTarget.style.borderColor=l.color+"55"; }}
          onMouseLeave={e=>{ e.currentTarget.style.background=l.color+"08"; e.currentTarget.style.borderColor=l.color+"30"; }}>
            <span style={{fontSize:"20px",flexShrink:0}}>{l.icon}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:"13px",color:l.color,fontWeight:"bold",marginBottom:"2px"}}>{l.label}</div>
              <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)"}}>{l.desc}</div>
            </div>
            <span style={{fontSize:"12px",color:l.color+"60"}}>›</span>
          </a>
        ))}
      </div>

      {/* Divider */}
      <div style={{width:"100%",maxWidth:"360px",display:"flex",alignItems:"center",gap:"12px",marginBottom:"20px"}}>
        <div style={{flex:1,height:"1px",background:"rgba(255,255,255,0.06)"}}/>
        <div style={{fontSize:"9px",color:"rgba(255,255,255,0.18)",letterSpacing:"0.25em"}}>ADMIN</div>
        <div style={{flex:1,height:"1px",background:"rgba(255,255,255,0.06)"}}/>
      </div>

      {/* PIN entry — secondary, understated */}
      <div style={{width:"100%",maxWidth:"360px",animation:"fadeIn 0.9s ease"}}>
        <div style={{animation:shake?"shake 0.4s ease":"none"}}>
          <input
            value={pin}
            onChange={e=>{ setPin(e.target.value); setError(false); }}
            onKeyDown={e=>e.key==="Enter"&&tryPin()}
            type="password"
            placeholder="PIN de administración"
            autoComplete="off"
            style={{
              width:"100%", boxSizing:"border-box",
              background:"rgba(255,255,255,0.03)",
              border:"1px solid "+(error?"rgba(255,107,107,0.4)":"rgba(255,255,255,0.08)"),
              borderRadius:"8px", color:"rgba(255,255,255,0.7)",
              padding:"11px 14px", fontSize:"15px",
              letterSpacing:"0.2em", textAlign:"center",
              outline:"none", marginBottom:"6px",
            }}
          />
        </div>
        {error && <div style={{fontSize:"10px",color:"rgba(255,107,107,0.7)",textAlign:"center",marginBottom:"6px"}}>PIN incorrecto</div>}
        <button onClick={tryPin} style={{
          width:"100%", padding:"10px",
          background:"rgba(255,255,255,0.04)",
          border:"1px solid rgba(255,255,255,0.08)",
          borderRadius:"8px", color:"rgba(255,255,255,0.4)",
          fontSize:"12px", cursor:"pointer", letterSpacing:"0.1em",
        }}>
          Acceder al panel →
        </button>
      </div>
      <NalguitasFooter/>
    </div>
  );
}

export default function App() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const path = window.location.pathname;
  // Clear auth when user navigates away from admin — forces PIN on return
  if (path !== "/") sessionStorage.removeItem("aor_auth");
  const [authed,  setAuthed]  = useState(!!sessionStorage.getItem("aor_auth"));

  useEffect(()=>{
    loadPlayers();
    // Track page visit with session_id (unique per browser session)
    let sid = localStorage.getItem("aor_sid");
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("aor_sid", sid);
    }
    supabase.from("page_visits").insert({
      page: window.location.pathname,
      visited_at: new Date().toISOString(),
      session_id: sid,
    }).then(()=>{});
  },[]);

  async function loadPlayers() {
    setLoading(true);
    const {data,error} = await supabase.from("players").select("*").order("bp",{ascending:false});
    if (!error&&data) setPlayers(data);
    setLoading(false);
  }

  async function update(id, changes) {
    setSaving(true);
    await supabase.from("players").update(changes).eq("id",id);
    setPlayers(prev=>prev.map(p=>p.id===id?{...p,...changes}:p));
    setSaving(false);
  }

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",display:"flex",alignItems:"center",justifyContent:"center",color:"#FFD700",fontFamily:"serif",fontSize:"18px"}}>
      Cargando [AOR]...
    </div>
  );

  if (path === "/registro") return <RegistrationForm onRegistered={loadPlayers}/>;
  if (path === "/reporte")  return <PublicReport />;
  if (path === "/puntos")         return <Puntos onBack={()=>window.history.back()}/>;
  if (path === "/comunicaciones")  return <Comunicaciones/>;
  if (path === "/propaganda")       return <Comunicaciones/>;
  if (path === "/inteligencia")     return <Inteligencia/>;
  if (path === "/asamblea")         return <Asamblea/>;
  if (!authed) return <AdminAuth onAuth={()=>setAuthed(true)}/>;
  return <AdminPanel players={players} update={update} loading={loading} saving={saving} reload={loadPlayers}/>;
}

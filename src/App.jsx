import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import PublicReport from "./Report";
import Puntos from "./Puntos";


// ── Constants ──────────────────────────────────────────────────────────────
const ROLES = {
  Lancero:  { color: "#FF6B6B", icon: "⚔️",  desc: "Ataque y captura" },
  Guerrero: { color: "#FFD700", icon: "🛡️",  desc: "Apoyo y defensa"  },
  Guardian: { color: "#40E0FF", icon: "🏰",  desc: "Defensa castillos"},
  Espia:    { color: "#A8FF78", icon: "👁️",  desc: "Inteligencia"     },
  Sin_Rol:  { color: "#666666", icon: "❓",  desc: "Sin asignar"      },
};

const AVAILABILITY = {
  siempre:      { label:"Siempre listo",  color:"#A8FF78", icon:"🟢", pts:10, penalty:10 },
  intermitente: { label:"Intermitente",   color:"#FFD700", icon:"🟡", pts:5,  penalty:7  },
  solo_una:     { label:"Solo una vez",   color:"#FF9F43", icon:"🟠", pts:2,  penalty:5  },
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
  return (p.pt_registro||0)
       + (p.pt_disponibilidad_declarada||0)
       + (p.pt_disponibilidad||0)
       + (p.pt_obediencia||0)
       + (p.pt_batallas_ganadas||0)*2
       + (p.pt_batallas_perdidas||0)
       + (p.pt_defensas||0)
       + (p.pt_bonus||0)
       + (p.pt_bandido_post||0)
       - (p.pt_penalizacion||0)
       - (p.pt_no_aparecio||0)
       - (p.pt_ignoro_orden||0)*2
       - (p.pt_abandono||0)*2
       - (p.pt_inactivo_4h||0)*3
       - (p.pt_bandido_pre||0);
}

function acumulado(p) { return p.pts_acumulados||0; }

const RANKS = [
  { label:"Co-Líder 👑",   color:"#FFD700", min:10000 },
  { label:"Oficial ⚜️",    color:"#40E0FF", min:1000  },
  { label:"Veterano ★★★",  color:"#A8FF78", min:600   },
  { label:"Guerrero ★★",   color:"#FFD700", min:300   },
  { label:"Soldado ★",     color:"#FF9F43", min:100   },
  { label:"Recluta",       color:"#888888", min:0     },
  { label:"⚠ Vigilado",   color:"#FF6B6B", min:-999  },
];
function getRank(pts) { return RANKS.find(r=>pts>=r.min)||RANKS[RANKS.length-1]; }

function Pill({color,children}) {
  return <span style={{fontSize:"9px",padding:"1px 6px",borderRadius:"10px",background:color+"22",color,border:"1px solid "+color+"44"}}>{children}</span>;
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

// ── Registration Form (public) ─────────────────────────────────────────────
function getWarWeek() {
  // Returns string like "2026-W18" representing current war week (Friday to Thursday)
  const now = new Date();
  // Adjust to Mexico time (UTC-6)
  const mx = new Date(now.getTime() - 6*60*60*1000);
  const day = mx.getDay(); // 0=Sun, 4=Thu, 5=Fri
  // War week starts Friday, ends Thursday
  const daysFromFriday = (day + 2) % 7; // days since last Friday
  const friday = new Date(mx);
  friday.setDate(mx.getDate() - daysFromFriday);
  const year = friday.getFullYear();
  const week = Math.ceil(((friday - new Date(year,0,1)) / 86400000 + 1) / 7);
  return `${year}-W${week}`;
}

function isRegistrationOpen() {
  // Closes Thursday 12:00am Mexico time (UTC-6)
  const now = new Date();
  const mx = new Date(now.getTime() - 6*60*60*1000);
  const day = mx.getDay(); // 4 = Thursday
  const hour = mx.getHours();
  // Closed: Thursday after midnight (00:00) until Friday 00:00
  if (day === 4 && hour >= 0) return false;
  // Also closed Friday before war starts (optional: keep open all week except Thu)
  return true;
}

function RegistrationForm({onRegistered}) {
  const [name, setName]             = useState("");
  const [avail, setAvail]           = useState("");
  const [tz, setTz]                 = useState("mexico");
  const [hour, setHour]             = useState("No sé");
  const [task1, setTask1]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]             = useState(false);
  const [error, setError]           = useState("");
  const [allPlayers, setAllPlayers] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [existingAvail, setExistingAvail] = useState(null);
  const isOpen = isRegistrationOpen();
  const currentWeek = getWarWeek();

  useEffect(()=>{
    supabase.from("players").select("id,name,level,registered_week,availability").eq("active",true).then(({data})=>{ if(data) setAllPlayers(data); });
  },[]);

  function handleNameChange(val) {
    setName(val);
    setSelectedPlayer(null);
    setAlreadyRegistered(false);
    setExistingAvail(null);
    if (val.trim().length < 2) { setSuggestions([]); return; }
    const clean = s => s.toLowerCase().replace(/[^a-z0-9áéíóúüñ]/gi,"").trim();
    const input = clean(val.trim());
    const matches = allPlayers.filter(p => clean(p.name).includes(input));
    setSuggestions(matches.slice(0,5));
  }

  function selectSuggestion(player) {
    setName(player.name);
    setSelectedPlayer(player);
    setSuggestions([]);
    // Check if already registered this week
    if (player.registered_week === currentWeek) {
      setAlreadyRegistered(true);
      setExistingAvail(player.availability);
    }
  }

  const tasks = avail ? getTasksForPlayer(avail, 999999) : null;

  async function handleSubmit() {
    if (!name.trim() || !avail) { setError("Completa nombre y disponibilidad."); return; }
    setSubmitting(true);
    let player = selectedPlayer;
    if (!player) {
      const clean = s => s.toLowerCase().replace(/[^a-z0-9áéíóúüñ]/gi,"").trim();
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
    await supabase.from("players").update({
      availability: avail, timezone: tz, hour_mx: hour, task_period1: task1,
      registered_form: true, registered_week: currentWeek,
      pt_registro: av.pts, pt_disponibilidad_declarada: 0,
    }).eq("id", player.id);
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
        <div style={{fontSize:"14px",color:"rgba(255,255,255,0.6)"}}>El registro cierra los jueves a las 12:00am hora México. Vuelve el viernes cuando comience la nueva guerra.</div>
      </div>
    </div>
  );

  if (done) return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}>
      <div style={{textAlign:"center",maxWidth:"360px"}}>
        <div style={{fontSize:"48px",marginBottom:"16px"}}>⚔️</div>
        <div style={{fontFamily:"serif",fontSize:"22px",color:"#FFD700",marginBottom:"8px"}}>¡Registrado!</div>
        <div style={{fontSize:"14px",color:"rgba(255,255,255,0.6)",marginBottom:"16px"}}>Tu participación ha sido confirmada. El comando de [AOR] ha sido notificado.</div>
        <div style={{background:"rgba(168,255,120,0.1)",border:"1px solid rgba(168,255,120,0.3)",borderRadius:"8px",padding:"12px",fontSize:"12px",color:"#A8FF78"}}>
          +{5 + (AVAILABILITY[avail]?.declaredPts||0)} puntos acreditados a tu cuenta
        </div>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",backgroundImage:"radial-gradient(ellipse at 10% 0%, rgba(64,224,255,0.05) 0%, transparent 50%)",padding:"20px",fontFamily:"Georgia,serif",color:"#d4c9a8"}}>
      <div style={{maxWidth:"560px",margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"12px"}}>
          <a href="/puntos" style={{fontSize:"11px",color:"#FFD700",textDecoration:"none",padding:"4px 12px",border:"1px solid rgba(255,215,0,0.3)",borderRadius:"20px"}}>❓ Cómo funciona</a>
          <a href="/reporte" style={{fontSize:"11px",color:"#40E0FF",textDecoration:"none",padding:"4px 12px",border:"1px solid rgba(64,224,255,0.3)",borderRadius:"20px"}}>Ver ranking →</a>
        </div>
        <div style={{textAlign:"center",marginBottom:"24px"}}>
          <div style={{fontSize:"9px",color:"#40E0FF",letterSpacing:"0.3em",marginBottom:"4px"}}>ANTIGUA ORDEN</div>
          <div style={{fontFamily:"serif",fontSize:"22px",color:"#FFD700"}}>[AOR] Registro de Guerra</div>
          <div style={{fontSize:"11px",color:"rgba(255,255,255,0.4)",marginTop:"4px"}}>Confirma tu participación y recibe tus puntos</div>
        </div>

        {/* Name */}
        <div style={{marginBottom:"16px",position:"relative"}}>
          <label style={{fontSize:"11px",color:"rgba(255,255,255,0.5)",display:"block",marginBottom:"6px"}}>NOMBRE EN EL JUEGO</label>
          <input value={name} onChange={e=>handleNameChange(e.target.value)} placeholder="Escribe tu nombre..." style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid "+(selectedPlayer?"#A8FF78":"rgba(255,255,255,0.15)"),borderRadius:"6px",color:"#fff",padding:"10px 12px",fontSize:"13px",outline:"none",boxSizing:"border-box"}}/>
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

        {/* Availability */}
        <div style={{marginBottom:"16px"}}>
          <label style={{fontSize:"11px",color:"rgba(255,255,255,0.5)",display:"block",marginBottom:"6px"}}>DISPONIBILIDAD</label>
          <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
            {Object.entries(AVAILABILITY).filter(([k])=>k!=="pendiente").map(([key,av])=>(
              <button key={key} onClick={()=>{setAvail(key);setTask1("");}} style={{padding:"10px 14px",borderRadius:"6px",fontSize:"12px",cursor:"pointer",textAlign:"left",background:avail===key?av.color+"22":"rgba(255,255,255,0.03)",border:"1px solid "+(avail===key?av.color:"rgba(255,255,255,0.08)"),color:avail===key?av.color:"rgba(255,255,255,0.5)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span>{av.icon} {av.label}</span>
                  <Pill color={av.color}>+{av.pts} pts</Pill>
                </div>
                {key==="siempre" && <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",marginTop:"3px"}}>Disponible para todo — ataque, defensa y espionaje cuando se necesite. Sin restricciones.</div>}
                {key==="intermitente" && <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",marginTop:"3px"}}>Al menos una aparición por periodo: primeras 24h (expansión) y segundas 24h (conquista)</div>}
                {key==="solo_una" && <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",marginTop:"3px"}}>Una sola participación — tarea según tu nivel</div>}
                {key==="no_disponible" && <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",marginTop:"3px"}}>Avisas con anticipación — +1 punto por responsabilidad</div>}
              </button>
            ))}
          </div>
        </div>

        {/* Tasks based on availability */}
        {avail === "intermitente" && (
          <div style={{marginBottom:"16px"}}>
            <label style={{fontSize:"11px",color:"rgba(255,255,255,0.5)",display:"block",marginBottom:"8px"}}>TAREAS POR PERIODO</label>
            <div style={{marginBottom:"10px"}}>
              <div style={{fontSize:"10px",color:"#FFD700",marginBottom:"4px"}}>⚔️ Primeras 24h — Captura de castillos</div>
              <div style={{display:"flex",flexDirection:"column",gap:"3px"}}>
                {["Atacar castillos","Defender castillos"].map(t=>(
                  <button key={t} onClick={()=>setTask1(t)} style={{padding:"7px 12px",borderRadius:"6px",fontSize:"11px",cursor:"pointer",textAlign:"left",background:task1===t?"rgba(255,215,0,0.15)":"rgba(255,255,255,0.03)",border:"1px solid "+(task1===t?"#FFD700":"rgba(255,255,255,0.08)"),color:task1===t?"#FFD700":"rgba(255,255,255,0.5)"}}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:"10px",color:"#FF6B6B",marginBottom:"4px"}}>🏰 Segundas 24h — Ataque a ciudades enemigas</div>
              <div style={{display:"flex",flexDirection:"column",gap:"3px"}}>
                {["Atacar ciudad enemiga","Defender castillos"].map(t=>(
                  <button key={t} onClick={()=>setTask1(prev=>prev===t?prev:task1+"→"+t)} style={{padding:"7px 12px",borderRadius:"6px",fontSize:"11px",cursor:"pointer",textAlign:"left",background:task1.includes(t)?"rgba(255,107,107,0.15)":"rgba(255,255,255,0.03)",border:"1px solid "+(task1.includes(t)?"#FF6B6B":"rgba(255,255,255,0.08)"),color:task1.includes(t)?"#FF6B6B":"rgba(255,255,255,0.5)"}}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {avail && avail !== "no_disponible" && avail !== "intermitente" && avail !== "siempre" && tasks && tasks.period1.length > 0 && (
          <div style={{marginBottom:"16px"}}>
            <label style={{fontSize:"11px",color:"rgba(255,255,255,0.5)",display:"block",marginBottom:"6px"}}>TAREA PRINCIPAL</label>
            <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
              {[...tasks.period1, ...(tasks.period2||[])].filter((v,i,a)=>a.indexOf(v)===i).map(t=>(
                <button key={t} onClick={()=>setTask1(t)} style={{padding:"8px 12px",borderRadius:"6px",fontSize:"11px",cursor:"pointer",textAlign:"left",background:task1===t?"rgba(64,224,255,0.15)":"rgba(255,255,255,0.03)",border:"1px solid "+(task1===t?"#40E0FF":"rgba(255,255,255,0.08)"),color:task1===t?"#40E0FF":"rgba(255,255,255,0.5)"}}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

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
            ⚠️ Ya te registraste esta semana como <strong>{AVAILABILITY[existingAvail]?.label}</strong> (+{AVAILABILITY[existingAvail]?.pts} pts). No puedes volver a registrarte hasta la próxima guerra.
          </div>
        )}

        {error && <div style={{background:"rgba(255,107,107,0.1)",border:"1px solid rgba(255,107,107,0.3)",borderRadius:"6px",padding:"10px",fontSize:"11px",color:"#FF6B6B",marginBottom:"12px"}}>{error}</div>}

        <button onClick={handleSubmit} disabled={submitting||alreadyRegistered} style={{width:"100%",padding:"14px",background:alreadyRegistered?"rgba(255,255,255,0.05)":"rgba(64,224,255,0.15)",border:"1px solid "+(alreadyRegistered?"rgba(255,255,255,0.1)":"rgba(64,224,255,0.3)"),borderRadius:"8px",color:alreadyRegistered?"rgba(255,255,255,0.3)":"#40E0FF",fontFamily:"serif",fontSize:"14px",cursor:alreadyRegistered?"not-allowed":"pointer",letterSpacing:"0.1em"}}>
          {submitting ? "Registrando..." : alreadyRegistered ? "Ya registrado esta semana" : "CONFIRMAR PARTICIPACIÓN ⚔️"}
        </button>

        <div style={{textAlign:"center",fontSize:"10px",color:"rgba(255,255,255,0.3)",marginTop:"12px"}}>
          Al registrarte recibes +{avail?AVAILABILITY[avail].pts:0} puntos automáticamente
        </div>
      </div>
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
  const confirmed  = players.filter(p=>p.active&&p.availability!=="pendiente"&&p.availability!=="no_disponible");
  const pending    = players.filter(p=>p.active&&p.availability==="pendiente");
  const notPlaying = players.filter(p=>p.active&&p.availability==="no_disponible");
  const inactive   = players.filter(p=>!p.active);

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

  const tabs = [{id:"registro",label:"📋 Registro"},{id:"roster",label:"⚔ Roster"},{id:"puntos",label:"🏆 Puntos"},{id:"admin",label:"⚙️ Admin"}];

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
      hour_mx: "No sé", task_period1: "", timezone: "mexico",
      pt_registro: 0, pt_disponibilidad_declarada: 0, pt_disponibilidad: 0,
      pt_obediencia: 0, pt_batallas_ganadas: 0, pt_batallas_perdidas: 0,
      pt_defensas: 0, pt_bonus: 0, pt_penalizacion: 0, pt_no_aparecio: 0,
      pt_ignoro_orden: 0, pt_abandono: 0, pt_inactivo_4h: 0,
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
    if (!confirm("¿Expulsar este jugador?")) return;
    await supabase.from("players").update({active:false}).eq("id",id);
    reload();
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
                      {p.registered_form && (
                        <button onClick={()=>update(p.id,{
                          availability:"pendiente", registered_form:false,
                          hour_mx:"No sé", task_period1:"", timezone:"mexico",
                          pt_registro:0, pt_disponibilidad_declarada:0
                        })} style={{padding:"2px 6px",borderRadius:"4px",fontSize:"9px",background:"rgba(255,107,107,0.1)",border:"1px solid rgba(255,107,107,0.2)",color:"#FF6B6B",cursor:"pointer",whiteSpace:"nowrap"}}>
                          ↺ Resetear
                        </button>
                      )}
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
              const rankOrder = ["Co-Líder 👑","Oficial ⚜️","Veterano ★★★","Guerrero ★★","Soldado ★","Recluta","⚠ Vigilado"];
              const getLabel = p => {
                const total = (p.pts_acumulados||0) + totalPts(p) + (p.pts_honorificos||0);
                return total >= 10000 ? "Co-Líder 👑" : total >= 1000 ? "Oficial ⚜️" : total >= 600 ? "Veterano ★★★" : total >= 300 ? "Guerrero ★★" : total >= 100 ? "Soldado ★" : total >= 0 ? "Recluta" : "⚠ Vigilado";
              };
              const ra = rankOrder.indexOf(getLabel(a));
              const rb = rankOrder.indexOf(getLabel(b));
              if (ra !== rb) return ra - rb;
              return b.bp - a.bp;
            }).map(p=>{
              const avail = AVAILABILITY[p.availability]||AVAILABILITY.pendiente;
              const warRole = p.availability==="siempre" ? {label:"Conquistador",icon:"⚔️",color:"#A8FF78"}
                : p.availability==="intermitente" ? {label:"Refuerzo",icon:"🛡️",color:"#FFD700"}
                : p.availability==="solo_una" ? {label:"Scouting",icon:"👁️",color:"#40E0FF"}
                : p.availability==="no_disponible" ? {label:"Ausente",icon:"🚫",color:"#FF6B6B"}
                : {label:"Sin asignar",icon:"❓",color:"#666666"};
              const isEditing = editingId===p.id;
              return (
                <div key={p.id} style={{background:"rgba(255,255,255,0.02)",border:"1px solid "+avail.color+"22",borderLeft:"3px solid "+warRole.color,borderRadius:"8px",padding:"10px 12px",marginBottom:"6px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",gap:"6px",alignItems:"center",marginBottom:"6px",flexWrap:"wrap"}}>
                        <span style={{fontFamily:"serif",fontSize:"13px",color:"#fff"}}>{p.name}</span>
                        <Pill color={warRole.color}>{warRole.icon} {warRole.label}</Pill>
                        <Pill color={getRank(totalPts(p)).color}>{getRank(totalPts(p)).label}</Pill>
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
                            <select defaultValue={p.clan_role} id={"clan_role_"+p.id} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"4px",color:"#fff",padding:"4px 8px",fontSize:"12px",outline:"none"}}>
                              {["Líder","Co-Líder","Oficial","Veterano","Guerrero","Soldado","Recluta"].map(r=><option key={r} value={r} style={{background:"#1a1a1f"}}>{r}</option>)}
                            </select>
                          </div>
                          <div style={{fontSize:"9px",color:"rgba(255,215,0,0.6)",padding:"4px 6px",background:"rgba(255,215,0,0.05)",borderRadius:"4px"}}>
                            ⚠ Cambiar rango ajusta pts honoríficos: Líder=25k · Co-Líder=10k · Oficial=1k · resto=0
                          </div>
                          <div style={{display:"flex",gap:"6px"}}>
                            <button onClick={async()=>{
                              const level = parseInt(document.getElementById("level_"+p.id).value);
                              const bp    = parseInt(document.getElementById("bp_"+p.id).value);
                              const clan_role = document.getElementById("clan_role_"+p.id).value;
                              const honorMap = {"Líder":25000,"Co-Líder":10000,"Oficial":1000};
                              const pts_honorificos = honorMap[clan_role]||0;
                              await update(p.id,{level,bp,clan_role,pts_honorificos});
                              setEditingId(null);
                            }} style={{padding:"5px 12px",borderRadius:"4px",background:"rgba(168,255,120,0.15)",border:"1px solid rgba(168,255,120,0.3)",color:"#A8FF78",fontSize:"11px",cursor:"pointer"}}>Guardar</button>
                            <button onClick={()=>setEditingId(null)} style={{padding:"5px 12px",borderRadius:"4px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.4)",fontSize:"11px",cursor:"pointer"}}>Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{display:"flex",gap:"10px",fontSize:"11px",color:"rgba(255,255,255,0.4)"}}>
                          <span>⚔ {((p.level||0)/1000).toFixed(1)}k</span>
                          <span>💀 {(p.bp||0).toLocaleString()}</span>
                          <FlagBar count={p.flags||10}/>
                        </div>
                      )}
                    </div>
                    {!isEditing && (
                      <div style={{display:"flex",flexDirection:"column",gap:"4px",marginLeft:"8px"}}>
                        <button onClick={()=>setEditingId(p.id)} style={{padding:"3px 8px",borderRadius:"4px",fontSize:"10px",background:"rgba(255,215,0,0.1)",border:"1px solid rgba(255,215,0,0.2)",color:"#FFD700",cursor:"pointer"}}>✏️ Editar</button>
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
                {label:"Inactivo 4h",color:"#FF6B6B",pts:"-3"},
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
                    {[
                      {label:"✅ Apareció +3",key:"pt_disponibilidad",max:1,color:"#A8FF78"},
                      {label:"📋 Órdenes +2",key:"pt_obediencia",max:1,color:"#FFD700"},
                      {label:"⚔️ B.Gan +2",key:"pt_batallas_ganadas",max:9,color:"#40E0FF"},
                      {label:"🛡 B.Per +1",key:"pt_batallas_perdidas",max:9,color:"#40E0FF"},
                      {label:"🏰 Def +1",key:"pt_defensas",max:9,color:"#40E0FF"},
                      {label:"🌟 Bonus +5",key:"pt_bonus",max:1,color:"#FFD700"},
                      {label:"🏴‍☠️ Bandido post-guerra +1",key:"pt_bandido_post",max:9,color:"#A8FF78"},
                    ].map(cat=>(
                      <div key={cat.key} style={{display:"flex",flexDirection:"column",gap:"2px",alignItems:"center"}}>
                        <span style={{fontSize:"8px",color:"rgba(255,255,255,0.3)"}}>{cat.label}</span>
                        <div style={{display:"flex",gap:"2px"}}>
                          {Array.from({length:Math.min(cat.max<=1?2:6,cat.max+1)}).map((_,v)=>(
                            <button key={v} onClick={()=>update(p.id,{[cat.key]:v})} style={{width:"22px",height:"22px",borderRadius:"4px",fontSize:"10px",cursor:"pointer",background:p[cat.key]===v?cat.color+"44":"rgba(255,255,255,0.04)",border:"1px solid "+(p[cat.key]===v?cat.color:"rgba(255,255,255,0.08)"),color:p[cat.key]===v?cat.color:"rgba(255,255,255,0.3)"}}>{v}</button>
                          ))}
                        </div>
                      </div>
                    ))}
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
                          <button key={v} onClick={()=>update(p.id,{pt_disponibilidad: v ? 3 : 0})} style={{width:"36px",height:"22px",borderRadius:"4px",fontSize:"10px",cursor:"pointer",background:(v===0&&(p.pt_disponibilidad||0)===0)||(v===1&&(p.pt_disponibilidad||0)===3)?"rgba(168,255,120,0.44)":"rgba(255,255,255,0.04)",border:"1px solid "+((v===0&&(p.pt_disponibilidad||0)===0)||(v===1&&(p.pt_disponibilidad||0)===3)?"#A8FF78":"rgba(255,255,255,0.08)"),color:(v===0&&(p.pt_disponibilidad||0)===0)||(v===1&&(p.pt_disponibilidad||0)===3)?"#A8FF78":"rgba(255,255,255,0.3)"}}>{v===0?"No":"Sí"}</button>
                        ))}
                      </div>
                    </div>
                    {[
                      {label:"Ignoró -2",key:"pt_ignoro_orden",color:"#FF9F43"},
                      {label:"Abandonó -2",key:"pt_abandono",color:"#FF9F43"},
                      {label:"Inactivo 4h -3",key:"pt_inactivo_4h",color:"#FF6B6B"},
                      {label:"🏴‍☠️ Bandido pre-guerra -1",key:"pt_bandido_pre",color:"#FF6B6B"},
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
            {/* Weekly reset */}
            <div style={{background:"rgba(255,107,107,0.05)",border:"1px solid rgba(255,107,107,0.15)",borderRadius:"8px",padding:"12px",marginBottom:"20px"}}>
              <div style={{fontFamily:"serif",color:"#FF6B6B",fontSize:"13px",marginBottom:"6px"}}>🔄 Cerrar guerra y resetear</div>
              <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"10px"}}>Archiva los puntos de esta guerra en el historial y resetea todos los contadores para la siguiente. Ejecutar cada viernes antes de la nueva guerra.</div>
              <button onClick={weeklyReset} style={{padding:"8px 16px",background:"rgba(255,107,107,0.15)",border:"1px solid rgba(255,107,107,0.3)",borderRadius:"6px",color:"#FF6B6B",fontSize:"12px",cursor:"pointer"}}>
                Archivar guerra y resetear puntos
              </button>
            </div>

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

            <div style={{fontFamily:"serif",color:"#FFD700",fontSize:"14px",marginBottom:"12px"}}>⚠️ Jugadores bajo mínimo mensual</div>
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
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const path = window.location.pathname;

  useEffect(()=>{ loadPlayers(); },[]);

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
  if (path === "/puntos")   return <Puntos onBack={()=>window.history.back()}/>;
  return <AdminPanel players={players} update={update} loading={loading} saving={saving} reload={loadPlayers}/>;
}

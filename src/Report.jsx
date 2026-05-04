import { LoadingScreen } from "./LoadingScreen";
import StatsWidget from "./StatsWidget";
import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { calcWarPts, calcGrandTotal, RANKS } from "./GameRules";

function UniqueCodeManager({playerId, playerName, uniqueCode: initialCode}) {
  const [code, setCode]       = useState(initialCode||"");
  const [draft, setDraft]     = useState("");
  const [editing, setEditing] = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");
  const [prefMode, setPrefMode] = useState(localStorage.getItem("aor_auth_pref")||"phone");

  async function saveCode() {
    if (draft.length !== 6 || !/^\d{6}$/.test(draft)) {
      setError("Debe ser exactamente 6 dígitos"); return;
    }
    // Confirm before saving - no trace left visible
    if (!window.confirm("¿Confirmas tu código único " + draft + "?\n\nAsegúrate de memorizarlo o guardarlo de forma segura. Puedes resetearlo con un administrador si lo olvidas.")) return;
    // Save current as prev before updating
    const {data:curr} = await supabase.from("players").select("unique_code").eq("id",playerId).single();
    const {error: e} = await supabase.from("players").update({unique_code: draft, prev_code: curr?.unique_code||null}).eq("id", playerId);
    if (e) { setError("Error: "+e.message); return; }
    setCode("✓ Registrado"); // Don't show actual code
    setDraft("");
    setEditing(false); setSaved(true);
    setTimeout(()=>setSaved(false), 2000);
  }

  function togglePref(m) {
    setPrefMode(m);
    localStorage.setItem("aor_auth_pref", m);
  }

  return (
    <div style={{background:"rgba(255,215,0,0.04)",border:"1px solid rgba(255,215,0,0.15)",borderRadius:"8px",padding:"14px",marginBottom:"16px"}}>
      <div style={{fontFamily:"monospace",fontSize:"9px",color:"rgba(255,215,0,0.5)",letterSpacing:"0.1em",marginBottom:"8px"}}>CÓDIGO ÚNICO DE ACCESO</div>
      <div style={{fontSize:"9px",color:"rgba(255,255,255,0.4)",marginBottom:"10px",lineHeight:"1.5"}}>
        Usa tu código de 6 dígitos para acceder a la app en lugar de tu número. Ganas <strong style={{color:"#FFD700"}}>+1 punto</strong> por día al usarlo.
      </div>
      {code && code !== "✓ Registrado" ? (
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(255,215,0,0.06)",borderRadius:"5px",padding:"8px 12px",marginBottom:"8px"}}>
          <span style={{fontFamily:"monospace",fontSize:"20px",color:"#FFD700",letterSpacing:"0.3em"}}>{"•".repeat(6)}</span>
          <button onClick={()=>{setDraft("");setEditing(true);}} style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",background:"transparent",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"4px",padding:"2px 8px",cursor:"pointer",fontFamily:"monospace"}}>CAMBIAR</button>
        </div>
      ) : code === "✓ Registrado" ? (
        <div style={{padding:"8px 12px",marginBottom:"8px",background:"rgba(168,255,120,0.06)",borderRadius:"5px",fontFamily:"monospace",fontSize:"10px",color:"#A8FF78"}}>✓ Código configurado</div>
      ) : (
        <div style={{marginBottom:"8px"}}>
          <div style={{fontSize:"9px",color:"rgba(255,255,255,0.25)",marginBottom:"6px",fontFamily:"monospace"}}>Sin código registrado</div>
          <button onClick={()=>setEditing(true)} style={{width:"100%",padding:"8px",background:"rgba(255,215,0,0.08)",border:"1px dashed rgba(255,215,0,0.25)",borderRadius:"6px",color:"#FFD700",fontSize:"10px",cursor:"pointer",fontFamily:"monospace",letterSpacing:"0.1em"}}>
            + CREAR CÓDIGO ÚNICO DE 6 DÍGITOS
          </button>
        </div>
      )}
      {editing && (
        <div style={{marginBottom:"8px"}}>
          <input value={draft} onChange={e=>setDraft(e.target.value.replace(/\D/g,"").slice(0,6))}
            placeholder="6 dígitos" type="tel" maxLength={6}
            style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,215,0,0.3)",borderRadius:"5px",color:"#FFD700",padding:"8px",fontSize:"20px",letterSpacing:"0.3em",textAlign:"center",outline:"none",boxSizing:"border-box",fontFamily:"monospace",marginBottom:"6px"}}/>
          {error && <div style={{fontSize:"9px",color:"#FF6B6B",marginBottom:"4px"}}>{error}</div>}
          <div style={{display:"flex",gap:"6px"}}>
            <button onClick={saveCode} style={{flex:1,padding:"7px",background:"rgba(168,255,120,0.15)",border:"1px solid rgba(168,255,120,0.3)",borderRadius:"5px",color:"#A8FF78",fontSize:"11px",cursor:"pointer",fontFamily:"monospace"}}>GUARDAR</button>
            <button onClick={()=>{setEditing(false);setError("");}} style={{padding:"7px 12px",background:"rgba(255,107,107,0.1)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:"5px",color:"#FF6B6B",fontSize:"11px",cursor:"pointer"}}>✕</button>
          </div>
        </div>
      )}
      {saved && <div style={{fontSize:"9px",color:"#A8FF78",fontFamily:"monospace"}}>✓ Código guardado</div>}
      {/* Preference toggle */}
      <div style={{marginTop:"8px"}}>
        <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,255,255,0.25)",marginBottom:"5px"}}>PREFERENCIA DE ACCESO</div>
        <div style={{display:"flex",gap:"4px"}}>
          <button onClick={()=>togglePref("phone")} style={{flex:1,padding:"5px",background:prefMode==="phone"?"rgba(64,224,255,0.1)":"rgba(255,255,255,0.02)",border:"1px solid "+(prefMode==="phone"?"rgba(64,224,255,0.25)":"rgba(255,255,255,0.06)"),borderRadius:"4px",color:prefMode==="phone"?"#40E0FF":"rgba(255,255,255,0.3)",fontSize:"9px",cursor:"pointer",fontFamily:"monospace"}}>TELÉFONO</button>
          <button onClick={()=>togglePref("code")} disabled={!code} style={{flex:1,padding:"5px",background:prefMode==="code"&&code?"rgba(255,215,0,0.1)":"rgba(255,255,255,0.02)",border:"1px solid "+(prefMode==="code"&&code?"rgba(255,215,0,0.25)":"rgba(255,255,255,0.06)"),borderRadius:"4px",color:prefMode==="code"&&code?"#FFD700":"rgba(255,255,255,0.25)",fontSize:"9px",cursor:code?"pointer":"default",fontFamily:"monospace"}}>CÓDIGO ÚNICO</button>
        </div>
      </div>
    </div>
  );
}

import PageHeader from "./PageHeader";
import NavBar from "./NavBar";
import NalguitasFooter from "./NalguitasFooter";

const AVAILABILITY = {
  siempre:      { label:"Conquistador",  sub:"Siempre listo", color:"#A8FF78", icon:"🟢" },
  intermitente: { label:"Refuerzos",     sub:"Intermitente",  color:"#FFD700", icon:"🟡" },
  solo_una:     { label:"Reserva",       sub:"Solo una vez",  color:"#FF9F43", icon:"🟠" },
  no_disponible:{ label:"No disponible",                      color:"#FF6B6B", icon:"🔴" },
  pendiente:    { label:"Sin responder",                      color:"#888888", icon:"⚪" },
};

// RANKS imported from GameRules

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

function totalPts(p) { return calcWarPts(p); }

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
  const [assemblyWins, setAssemblyWins] = useState([]);
  const [pvpBattles,   setPvpBattles]   = useState([]);
  const [ptsLedger,    setPtsLedger]    = useState([]);
  const [loading, setLoading]   = useState(true);
  const [statsMsg, setStatsMsg] = useState("");

  useEffect(() => {
    // Load all profile data - each query independent so one failure doesn't crash all
    Promise.allSettled([
      supabase.from("war_history").select("*").eq("player_id", player.id).order("created_at", {ascending:false}),
      supabase.from("player_stats").select("*").eq("player_id", player.id).order("created_at", {ascending:false}).limit(10),
      supabase.from("message_logs").select("*").eq("player_id", player.id).order("created_at", {ascending:false}).limit(50),
      supabase.from("assembly_votes").select("week,voter_weight").eq("voted_player_id", player.id).order("created_at", {ascending:false}).limit(20),
      supabase.from("pvp_battles").select("*").or(`challenger_id.eq.${player.id},opponent_id.eq.${player.id}`).order("created_at",{ascending:false}).limit(50),
      supabase.from("pts_ledger").select("*").eq("player_id",player.id).order("created_at",{ascending:false}).limit(50),
    ]).then(([h, s, m, av, pvp, ledger]) => {
      setHistory(h.value?.data || []);
      setStatsList(s.value?.data || []);
      setMsgLogs(m.value?.data || []);
      setAssemblyWins(av.value?.data || []);
      setPvpBattles(pvp.value?.data || []);
      setPtsLedger(ledger.value?.data || []);
      setLoading(false);
    });
  }, [player.id]);

  if (loading) return <LoadingScreen page="/reporte"/>;

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
    const hasBp      = newBp.trim() !== "";
    const hasLevel   = newLevel.trim() !== "";
    const hasNivel   = newNivel.trim() !== "";
    if (!hasBp && !hasLevel && !hasNivel) return;
    // 30% tolerance check for BP
    if (hasBp) {
      const current = player.bp || 0;
      const newVal  = parseInt(newBp);
      if (current > 0 && Math.abs(newVal-current)/current > 0.30) {
        setStatsMsg("⚠ El nuevo BP difiere más del 30%. Pide al admin que lo ajuste.");
        return;
      }
    }
    // 30% tolerance for Poder
    if (hasLevel) {
      const current = player.level || 0;
      const newVal  = parseInt(newLevel);
      if (current > 0 && Math.abs(newVal-current)/current > 0.30) {
        setStatsMsg("⚠ El nuevo Poder difiere más del 30%. Pide al admin que lo ajuste.");
        return;
      }
    }
    // Nivel range check (1-340)
    if (hasNivel) {
      const n = parseInt(newNivel);
      if (n < 1 || n > 340) { setStatsMsg("⚠ Nivel debe estar entre 1 y 340."); return; }
    }
    // Points: BP=+1, Poder=+1, Nivel=+1, all three=+5
    const count = (hasBp?1:0)+(hasLevel?1:0)+(hasNivel?1:0);
    const ptEarned = count===3 ? 5 : count;
    const updates = { pt_stats: (player.pt_stats||0) + ptEarned };
    if (hasBp)    updates.bp           = parseInt(newBp);
    if (hasLevel) updates.level        = parseInt(newLevel);
    if (hasNivel) updates.player_level = parseInt(newNivel);
    await supabase.from("players").update(updates).eq("id", player.id);
    await supabase.from("player_stats").insert({
      player_id: player.id, player_name: player.name,
      bp:    hasBp    ? parseInt(newBp)    : (player.bp||0),
      level: hasLevel ? parseInt(newLevel) : (player.level||0),
      updated_by: "jugador",
    });
    setStatsMsg("✓ +" + ptEarned + " pts — " + [hasBp&&"BP",hasLevel&&"Poder",hasNivel&&"Nivel"].filter(Boolean).join(" · "));
    setNewBp(""); setNewLevel(""); setNewNivel("");
  }

  const pts   = totalPts(player);
  const acc   = player.pts_acumulados || 0;
  const hon   = player.pts_honorificos || 0;
  const rank  = getRank(acc, hon, player.name, player.clan_role);
  const avail = AVAILABILITY[player.availability] || AVAILABILITY.pendiente;
  const waLabel = (player.pt_whatsapp||0) >= 50 ? "📱 WhatsApp Fundador (+50 · antes del lanzamiento)" : "📱 WhatsApp Miembro (+25 · tras el lanzamiento)";

  // Breakdown by category - NO honorificos
  const warItems = [
    { label:"Registro de disponibilidad",         val: player.pt_registro||0,                  show: (player.pt_registro||0)>0 },
    { label:"⭐ Registro anticipado",             val: player.pt_registro_temprano||0,          show: (player.pt_registro_temprano||0)>0 },
    { label:"Disponibilidad declarada",           val: player.pt_disponibilidad_declarada||0,  show: (player.pt_disponibilidad_declarada||0)>0 },
    { label:"Apareció / Participó",               val: player.pt_disponibilidad||0,            show: (player.pt_disponibilidad||0)>0 },
    { label:"Siguió órdenes del admin",          val: (player.pt_obediencia||0)*2,             show: (player.pt_obediencia||0)>0 },
    { label:"Batallas ganadas (×2)",              val: (player.pt_batallas_ganadas||0)*2,      show: (player.pt_batallas_ganadas||0)>0 },
    { label:"🌟 Bonus 6+ batallas",              val: 10,                                      show: (player.pt_batallas_ganadas||0)>=6 },
    { label:"Batallas perdidas",                  val: player.pt_batallas_perdidas||0,         show: (player.pt_batallas_perdidas||0)>0 },
    { label:"Defensas de castillo",               val: player.pt_defensas||0,                  show: (player.pt_defensas||0)>0 },
    { label:"Bonus completo",                     val: (player.pt_bonus||0)*5,                 show: (player.pt_bonus||0)>0 },
    { label:"Bandido post-guerra",                val: player.pt_bandido_post||0,              show: (player.pt_bandido_post||0)>0 },
    { label:"📊 Stats BP/Poder/Nivel",            val: player.pt_stats||0,                     show: (player.pt_stats||0)>0 },
  ].filter(i=>i.show);

  // Read ALL direct pts from pts_ledger — single source of truth
  // ── Week start: last Monday 8:00am Ecuador (UTC-5) = Monday 13:00 UTC ──────
  const weekStartUTC = (() => {
    const now = new Date();
    // Convert to Ecuador time (UTC-5)
    const ec = new Date(now.getTime() - 5 * 3600000);
    // Find last Monday
    const dayOfWeek = ec.getUTCDay(); // 0=Sun,1=Mon,...,6=Sat
    const daysToLastMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const lastMonEc = new Date(ec);
    lastMonEc.setUTCDate(ec.getUTCDate() - daysToLastMon);
    // Set to 8:00am Ecuador = 13:00 UTC
    lastMonEc.setUTCHours(13, 0, 0, 0);
    // If we haven't reached 8am Ecuador yet today (and today is Monday), go back 7 days
    if (now < lastMonEc) lastMonEc.setUTCDate(lastMonEc.getUTCDate() - 7);
    return lastMonEc; // UTC Date object
  })();

  // ── Helper: sum ledger by source ──────────────────────────────────────────
  // acc = ALL time | weekOnly = only entries after last Monday 8am Ecuador
  const ledgerBySource = (sources, weekOnly=false) => {
    let entries = ptsLedger.filter(e => sources.includes(e.source));
    if(weekOnly) entries = entries.filter(e => new Date(e.created_at) >= weekStartUTC);
    return entries.reduce((s,e)=>s+(e.pts||0), 0);
  };

  // ── ACUMULADO (all time) ──────────────────────────────────────────────────
  const propTotal   = ledgerBySource(["propaganda"]);
  const asmTotal    = ledgerBySource(["asamblea_voto","asamblea_ganador","asamblea_pichichi",
    "asamblea_mayor_puntaje","asamblea_empate_votos","asamblea_empate_puntaje",
    "asamblea_racha_2","asamblea_racha_extra"]);
  const intelTotal  = ledgerBySource(["intel_voto"]);
  const pvpTotal    = ledgerBySource(["pvp_registro","pvp_confirmo","pvp_ganador",
    "pvp_dudo_exitoso","pvp_acepto_dudo","pvp_escalo","pvp_gano_video",
    "ranking_semanal","ranking_mensual"]);
  const codigoTotal = ledgerBySource(["codigo_unico"]);
  const noticTotal  = ledgerBySource(["noticia_leida","solicitud_cumplida"]);
  const waTotal     = ledgerBySource(["whatsapp"]);
  const archTotal   = ledgerBySource(["weekly_archive"]);
  const penalTotal  = ledgerBySource(["penalizacion"]);

  // ── SEMANAL (this week only) ──────────────────────────────────────────────
  const wProp   = ledgerBySource(["propaganda"], true);
  const wAsm    = ledgerBySource(["asamblea_voto","asamblea_ganador","asamblea_pichichi",
    "asamblea_mayor_puntaje","asamblea_empate_votos","asamblea_empate_puntaje",
    "asamblea_racha_2","asamblea_racha_extra"], true);
  const wIntel  = ledgerBySource(["intel_voto"], true);
  const wPvp    = ledgerBySource(["pvp_registro","pvp_confirmo","pvp_ganador",
    "pvp_dudo_exitoso","pvp_acepto_dudo","pvp_escalo","pvp_gano_video",
    "ranking_semanal","ranking_mensual"], true);
  const wCodigo = ledgerBySource(["codigo_unico"], true);
  const wNotic  = ledgerBySource(["noticia_leida","solicitud_cumplida"], true);
  const wPenal  = ledgerBySource(["penalizacion"], true);
  // WA bonus is one-time — show in acc only, not weekly
  // Stats pt_stats is a war column — shown in war section already

  // Upper section = SEMANAL: war cols (pt_*) + ledger entries from currentWeek
  const directItems = [
    { label:"📡 Propaganda",    val: wProp,              show: true },
    { label:"🗳 Asamblea",      val: wAsm,               show: true },
    { label:"🔍 Inteligencia",  val: wIntel,             show: true },
    { label:"⚔ Versus PvP",    val: wPvp,               show: true },
    { label:"📰 Noticias",      val: wNotic,             show: true },
    { label:"🔑 Código único",  val: wCodigo,            show: true },
    { label:"⚠ Penalizaciones", val: wPenal,             show: wPenal !== 0 },
  ];

  const penalties = [
    { label:"No apareció",                        val: -(player.pt_no_aparecio||0),            show:(player.pt_no_aparecio||0)>0 },
    { label:"Sin registro ni participación",      val: -(player.pt_penalizacion||0),           show:(player.pt_penalizacion||0)>0 },
    { label:"Ignoró órdenes",                     val: -(player.pt_ignoro_orden||0)*2,         show:(player.pt_ignoro_orden||0)>0 },
    { label:"Abandonó defensa",                   val: -(player.pt_abandono||0)*2,             show:(player.pt_abandono||0)>0 },
    { label:"Fuera del castillo",                 val: -(player.pt_fuera_castillo||0)*2,       show:(player.pt_fuera_castillo||0)>0 },
    { label:"Inactivo +12h",                      val: -(player.pt_inactivo_4h||0)*3,          show:(player.pt_inactivo_4h||0)>0 },
    { label:"Bandido pre-guerra",                 val: -(player.pt_bandido_pre||0),            show:(player.pt_bandido_pre||0)>0 },
  ].filter(i=>i.show);

  // Grand total from GameRules.calcGrandTotal
  // grandTotal: sum of all pts_ledger entries + active war columns
  // This ensures the number matches the category breakdown shown below
  // pts_acumulados may diverge if some entries bypassed the ledger
  // ledgerSum excludes war-column sources (pt_stats, weekly_archive fragments)
  // because those are already counted in calcWarPts or pts_acumulados via reset
  const WAR_SOURCES = ["stats"]; // sources that are pt_* columns, not direct pts
  const ledgerSum = ptsLedger
    .filter(e => !WAR_SOURCES.includes(e.source))
    .reduce((s,e)=>s+(e.pts||0), 0);
  const warPtsForTotal = calcWarPts(player);
  const accBase = Math.max(player.pts_acumulados||0, ledgerSum);
  const grandTotal = accBase + warPtsForTotal;

  // weeklyTotal = pts earned this week:
  //   - calcWarPts: war columns (pt_registro, pt_batallas, etc.) active now
  //   - ledger entries this week: direct awards (propaganda, votos, pvp, código, WA)
  // Note: WA bonus and other direct pts go to pts_acumulados via awardPts
  //       but MAY also appear in ledger. We use pts_acumulados as the base truth.
  const warPtsNow = warPtsForTotal; // same as used in grandTotal
  const ledgerThisWeek = ptsLedger
    .filter(e => new Date(e.created_at) >= weekStartUTC && e.source !== "weekly_archive")
    .reduce((sum, e) => sum + (e.pts || 0), 0);
  const weeklyTotal = warPtsNow + ledgerThisWeek;
  // grandTotal = pts_acumulados (all direct+archived) + warPtsNow (active war cols)

  return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",padding:"20px",fontFamily:"Georgia,serif",color:"#d4c9a8"}}>
      <div style={{maxWidth:"600px",margin:"0 auto"}}>
        <button onClick={onBack} style={{background:"transparent",border:"none",color:"#40E0FF",cursor:"pointer",fontSize:"13px",marginBottom:"16px",padding:0}}>
          ← Volver al ranking
        </button>

        <NavBar current="profile"/>
        {/* Header */}
        {/* ── Profile Header ─────────────────────────────────────────────── */}
        <div style={{background:"rgba(64,224,255,0.03)",border:"1px solid rgba(64,224,255,0.15)",borderRadius:"10px",padding:"16px",marginBottom:"16px"}}>
          {/* Name in yellow + total prominently */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
            <div>
              <div style={{fontFamily:"serif",fontSize:"22px",color:"#FFD700",fontWeight:"bold"}}>{player.name}</div>
              <div style={{fontFamily:"monospace",fontSize:"11px",color:rank.color,fontWeight:"bold",marginTop:"2px"}}>
                {rank.label}
              </div>
            </div>
            <span style={{fontSize:"18px"}}>{player.whatsapp ? "📱" : ""}</span>
          </div>
          {/* War role — updates from registration */}
          <div style={{marginBottom:"10px"}}>
            <span style={{fontSize:"9px",fontFamily:"monospace",color:"rgba(64,224,255,0.4)",letterSpacing:"0.15em"}}>ROL GUERRA ACTUAL · </span>
            <span style={{fontSize:"11px",color:avail.color}}>{avail.icon} {player.availability==="pendiente"||!player.availability?"No definido — regístrate en la guerra actual":avail.label}</span>
          </div>
          {/* Stats + grandTotal inline */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px",padding:"8px 0",borderTop:"1px solid rgba(255,255,255,0.06)",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
            <div style={{display:"flex",gap:"12px",flexWrap:"wrap"}}>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",fontFamily:"monospace"}}>PODER</div>
                <div style={{fontSize:"14px",color:"rgba(255,255,255,0.7)"}}>{((player.level||0)/1000).toFixed(1)}k</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",fontFamily:"monospace"}}>BP</div>
                <div style={{fontSize:"14px",color:"rgba(255,255,255,0.7)"}}>{(player.bp||0).toLocaleString()}</div>
              </div>
              {(player.player_level||0)>0&&<div style={{textAlign:"center"}}>
                <div style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",fontFamily:"monospace"}}>NIVEL</div>
                <div style={{fontSize:"14px",color:"rgba(255,255,255,0.7)"}}>{player.player_level}</div>
              </div>}
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:"9px",color:"rgba(255,215,0,0.4)",fontFamily:"monospace",letterSpacing:"0.1em"}}>ACUMULADO</div>
              <div style={{fontSize:"22px",color:rank.color,fontWeight:"bold",fontFamily:"monospace"}}>{grandTotal}</div>
            </div>
          </div>
          {/* Weekly summary box — shows this week's earnings */}
          <div style={{background:"rgba(64,224,255,0.03)",border:"1px solid rgba(64,224,255,0.12)",borderRadius:"8px",padding:"10px",marginTop:"4px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
              <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(64,224,255,0.4)",letterSpacing:"0.1em"}}>ESTA SEMANA</div>
              <div style={{fontFamily:"monospace",fontSize:"18px",color:"#40E0FF",fontWeight:"bold"}}>{weeklyTotal>0?"+":""}{weeklyTotal}</div>
            </div>
            {/* Tags por categoría — todas suman a grandTotal */}
            <div style={{display:"flex",flexWrap:"wrap",gap:"4px"}}>
              {warPtsNow!==0&&(
                <div style={{fontFamily:"monospace",fontSize:"9px",color:"rgba(64,224,255,0.8)",background:"rgba(64,224,255,0.07)",padding:"2px 7px",borderRadius:"3px",border:"1px solid rgba(64,224,255,0.15)"}}>
                  ⚔ guerra: {warPtsNow>0?"+":""}{warPtsNow}
                </div>
              )}
              {[
                {src:["whatsapp"],          icon:"📱", label:"WA",    color:"rgba(168,255,120,0.8)", bg:"rgba(168,255,120,0.07)", border:"rgba(168,255,120,0.15)"},
                {src:["propaganda"],        icon:"📡", label:"prop",  color:"rgba(200,162,255,0.8)", bg:"rgba(200,162,255,0.07)", border:"rgba(200,162,255,0.15)"},
                {src:["asamblea_voto","asamblea_ganador","asamblea_pichichi","asamblea_mayor_puntaje","asamblea_empate_votos","asamblea_empate_puntaje","asamblea_racha_2","asamblea_racha_extra"],
                                            icon:"🗳", label:"asm",   color:"rgba(255,215,0,0.8)",   bg:"rgba(255,215,0,0.06)",   border:"rgba(255,215,0,0.15)"},
                {src:["intel_voto"],        icon:"🔍", label:"intel", color:"rgba(255,107,107,0.8)", bg:"rgba(255,107,107,0.07)", border:"rgba(255,107,107,0.15)"},
                {src:["pvp_registro","pvp_confirmo","pvp_ganador","pvp_dudo_exitoso","pvp_acepto_dudo","pvp_escalo","pvp_gano_video","ranking_semanal","ranking_mensual"],
                                            icon:"⚔", label:"pvp",   color:"rgba(255,107,107,0.8)", bg:"rgba(255,107,107,0.07)", border:"rgba(255,107,107,0.15)"},
                {src:["noticia_leida","solicitud_cumplida"],
                                            icon:"📰", label:"noticias", color:"rgba(255,159,67,0.8)", bg:"rgba(255,159,67,0.07)", border:"rgba(255,159,67,0.15)"},
                {src:["codigo_unico"],      icon:"🔑", label:"código", color:"rgba(255,215,0,0.7)", bg:"rgba(255,215,0,0.05)",   border:"rgba(255,215,0,0.12)"},
                
              ].map(({src,icon,label,color,bg,border})=>{
                const n=ptsLedger.filter(e=>src.includes(e.source)&&new Date(e.created_at)>=weekStartUTC);
                const t=n.reduce((s,e)=>s+(e.pts||0),0);
                if(!n.length) return null;
                return(
                  <div key={label} style={{fontFamily:"monospace",fontSize:"9px",color,background:bg,padding:"2px 7px",borderRadius:"3px",border:"1px solid "+border}}>
                    {icon} {label}: {t>0?"+":""}{t}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Points breakdown by category */}
          <div style={{marginTop:"10px"}}>
            <div style={{fontSize:"10px",color:"rgba(255,255,255,0.3)",fontFamily:"monospace",letterSpacing:"0.1em",marginBottom:"6px"}}>DESGLOSE SEMANAL</div>
            {warItems.length>0&&(<>
              <div style={{fontSize:"8px",color:"rgba(64,224,255,0.5)",fontFamily:"monospace",letterSpacing:"0.15em",marginBottom:"3px"}}>⚔ GUERRA</div>
              {warItems.map(i=><div key={i.label} style={{display:"flex",justifyContent:"space-between",fontSize:"10px",padding:"2px 0"}}>
                <span style={{color:"rgba(255,255,255,0.45)"}}>{i.label}</span>
                <span style={{color:"#40E0FF",fontFamily:"monospace"}}>{i.val>0?"+":""}{i.val}</span>
              </div>)}
            </>)}
            <div style={{marginTop:"6px"}}>
              <div style={{fontSize:"8px",color:"rgba(200,162,255,0.5)",fontFamily:"monospace",letterSpacing:"0.15em",marginBottom:"3px"}}>📡 ACUMULADO DIRECTO</div>
              {directItems.filter(i=>i.show).map(i=><div key={i.label} style={{display:"flex",justifyContent:"space-between",fontSize:"10px",padding:"2px 0"}}>
                <span style={{color:i.val>0?"rgba(255,255,255,0.6)":i.val<0?"rgba(255,107,107,0.5)":"rgba(255,255,255,0.25)"}}>{i.label}</span>
                <span style={{color:i.val>0?"#C8A2FF":i.val<0?"#FF6B6B":"rgba(255,255,255,0.2)",fontFamily:"monospace",fontWeight:i.val!==0?"bold":"normal"}}>
                  {i.val>0?"+":""}{i.val!==0?i.val:"—"}
                </span>
              </div>)}
              {/* Show unclassified pts if pts_acumulados > ledgerSum */}
              {(player.pts_acumulados||0) > ledgerSum && (
                <div style={{display:"flex",justifyContent:"space-between",fontSize:"10px",padding:"2px 0"}}>
                  <span style={{color:"rgba(255,255,255,0.25)",fontStyle:"italic"}}>Sin clasificar (prev. al ledger)</span>
                  <span style={{color:"rgba(255,255,255,0.3)",fontFamily:"monospace"}}>+{(player.pts_acumulados||0)-ledgerSum}</span>
                </div>
              )}
              <div style={{display:"flex",justifyContent:"space-between",fontSize:"10px",padding:"4px 6px",borderTop:"1px solid rgba(64,224,255,0.15)",marginTop:"4px",background:"rgba(64,224,255,0.03)",borderRadius:"4px"}}>
                <span style={{color:"rgba(64,224,255,0.6)",fontFamily:"monospace",fontSize:"9px",letterSpacing:"0.1em"}}>TOTAL SEMANAL</span>
                <span style={{color:"#40E0FF",fontFamily:"monospace",fontWeight:"bold",fontSize:"13px"}}>{weeklyTotal>0?"+":""}{weeklyTotal}</span>
              </div>
            </div>
            {penalties.length>0&&(<div style={{marginTop:"6px"}}>
              <div style={{fontSize:"8px",color:"rgba(255,107,107,0.5)",fontFamily:"monospace",letterSpacing:"0.15em",marginBottom:"3px"}}>⚠ PENALIZACIONES</div>
              {penalties.map(i=><div key={i.label} style={{display:"flex",justifyContent:"space-between",fontSize:"10px",padding:"2px 0"}}>
                <span style={{color:"rgba(255,107,107,0.6)"}}>{i.label}</span>
                <span style={{color:"#FF6B6B",fontFamily:"monospace"}}>{i.val}</span>
              </div>)}
            </div>)}
          </div>
          {false && hon > 0 && (
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
        {(!sessionStorage.getItem("aor_player_id") || String(player.id) === sessionStorage.getItem("aor_player_id")) ? (
        <StatsWidget player={player} onSaved={(pts, updates) => {
          // Reload profile data after saving
          supabase.from("players").select("*").eq("id", player.id).single().then(({data}) => {
            if (data && typeof window.__aorRefreshProfile === "function") window.__aorRefreshProfile(data);
          });
        }}/>
        ) : (
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"8px",padding:"10px 14px",marginBottom:"16px"}}>
            <div style={{fontSize:"10px",color:"rgba(255,255,255,0.3)"}}>
            Para acceder a este perfil, <a href="/" style={{color:"#40E0FF",cursor:"pointer"}} onClick={(e)=>{e.preventDefault();["aor_session","aor_player_id","aor_player_name","aor_user_identity"].forEach(k=>sessionStorage.removeItem(k));window.location.href="/";}}>cierra sesión</a> e ingresa con este jugador.
          </div>
          </div>
        )}

        {/* Points breakdown - current week all categories */}
        <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"8px",padding:"14px",marginBottom:"16px"}}>
          <div style={{color:"#40E0FF",fontSize:"13px",marginBottom:"10px",fontFamily:"serif"}}>📊 Resumen de puntos acumulados</div>

          {warItems.length>0&&<div style={{marginBottom:"8px"}}>
            <div style={{fontFamily:"monospace",fontSize:"7px",letterSpacing:"0.2em",color:"rgba(64,224,255,0.4)",marginBottom:"4px"}}>⚔ GUERRA DE CLANES</div>
            {warItems.map((item,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 6px",marginBottom:"2px",background:"rgba(168,255,120,0.04)",borderRadius:"4px"}}>
              <span style={{fontSize:"11px",color:"rgba(255,255,255,0.6)"}}>{item.label}</span>
              <span style={{fontSize:"12px",color:"#A8FF78",fontWeight:"bold",fontFamily:"monospace"}}>+{item.val}</span>
            </div>)}
          </div>}

          <div style={{marginBottom:"8px"}}>
            <div style={{fontFamily:"monospace",fontSize:"7px",letterSpacing:"0.2em",color:"rgba(200,162,255,0.4)",marginBottom:"4px"}}>📡 ACUMULADO DIRECTO</div>
            {[
              {l:"📱 WhatsApp",                        v: waTotal,                              color:"#A8FF78"},
              {l:"📊 Stats BP/Poder/Nivel",            v: player.pt_stats||0,                   color:"#40E0FF"},
              {l:"📡 Propaganda publicada",            v: propTotal,                            color:"#C8A2FF"},
              {l:"🗳 Asamblea",                        v: asmTotal,                             color:"#FFD700"},
              {l:"🔍 Inteligencia",                    v: intelTotal,                           color:"#FF6B6B"},
              {l:"⚔ Versus PvP",                      v: pvpTotal,                             color:"#FF6B6B"},
              {l:"📰 Noticias",                        v: noticTotal,                           color:"#FF9F43"},
              {l:"🔑 Código único",                    v: codigoTotal,                          color:"#FFD700"},
              {l:"📦 Cierres de semana anteriores",   v: archTotal,                            color:"rgba(200,200,200,0.7)"},
              {l:"⚠ Penalizaciones",                  v: penalTotal,                           color:"#FF6B6B"},
            ].map((x,i)=>{
              const hasVal = x.v !== 0;
              return(
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"3px 6px",marginBottom:"1px",borderRadius:"3px",background:hasVal?"rgba(255,255,255,0.02)":"transparent"}}>
                  <span style={{fontSize:"10px",color:hasVal?"rgba(255,255,255,0.6)":"rgba(255,255,255,0.2)"}}>{x.l}</span>
                  <span style={{fontSize:"11px",color:hasVal?x.color:"rgba(255,255,255,0.15)",fontWeight:hasVal?"bold":"normal",fontFamily:"monospace"}}>
                    {hasVal?(x.v>0?"+":"")+x.v:"—"}
                  </span>
                </div>
              );
            })}
            <div style={{display:"flex",justifyContent:"space-between",padding:"5px 6px",marginTop:"4px",borderTop:"1px solid rgba(255,215,0,0.2)",background:"rgba(255,215,0,0.03)",borderRadius:"4px"}}>
              <span style={{fontSize:"10px",color:"rgba(255,215,0,0.6)",fontFamily:"monospace",letterSpacing:"0.05em"}}>TOTAL ACUMULADO</span>
              <span style={{fontSize:"13px",color:"#FFD700",fontWeight:"bold",fontFamily:"monospace"}}>{grandTotal}</span>
            </div>
          </div>

          {penalties.length>0&&<div>
            <div style={{fontFamily:"monospace",fontSize:"7px",letterSpacing:"0.2em",color:"rgba(255,107,107,0.4)",marginBottom:"4px"}}>⚠ PENALIZACIONES</div>
            {penalties.map((item,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 6px",marginBottom:"2px",background:"rgba(255,107,107,0.04)",borderRadius:"4px"}}>
              <span style={{fontSize:"11px",color:"rgba(255,255,255,0.6)"}}>{item.label}</span>
              <span style={{fontSize:"12px",color:"#FF6B6B",fontWeight:"bold",fontFamily:"monospace"}}>{item.val}</span>
            </div>)}
          </div>}

          {warItems.length===0&&penalties.length===0&&acc===0&&<div style={{fontSize:"11px",color:"rgba(255,255,255,0.3)",textAlign:"center"}}>Sin actividad esta semana</div>}
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

        {/* Publication history + propaganda cooldown */}
        {msgLogs.length > 0 && (
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"8px",padding:"14px",marginBottom:"16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
              <div style={{color:"#C8A2FF",fontSize:"13px",fontFamily:"serif"}}>Propaganda publicada</div>
              <div style={{fontFamily:"monospace",fontSize:"10px",color:"#C8A2FF"}}>{msgLogs.length} publicaciones</div>
            </div>
            {/* Cooldown timer */}
            {(()=>{
              const blockEnd = localStorage.getItem("aor_prop_block");
              if (!blockEnd || parseInt(blockEnd) <= Date.now()) return null;
              const remaining = parseInt(blockEnd) - Date.now();
              const h = Math.floor(remaining/3600000);
              const m = Math.floor((remaining%3600000)/60000);
              return (
                <div style={{padding:"6px 8px",background:"rgba(255,107,107,0.06)",borderRadius:"4px",marginBottom:"8px",fontFamily:"monospace",fontSize:"9px",color:"#FF6B6B"}}>
                  BLOQUEO ACTIVO — próximo envío en {h>0?h+"h ":""}{m}m
                </div>
              );
            })()}
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

        {/* Unique code management */}
        {sessionStorage.getItem("aor_player_id") && String(player.id)===sessionStorage.getItem("aor_player_id") && (
          <UniqueCodeManager playerId={player.id} playerName={player.name} uniqueCode={player.unique_code}/>
        )}

        {/* ACTIVIDAD ACUMULADA — desglose por fuente sumando al grandTotal */}
        <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",padding:"14px",marginBottom:"16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
            <div style={{fontFamily:"monospace",fontSize:"9px",color:"rgba(255,255,255,0.3)",letterSpacing:"0.1em"}}>DESGLOSE COMPLETO · TODAS LAS CATEGORÍAS</div>
            <div style={{fontFamily:"monospace",fontSize:"14px",color:rank.color,fontWeight:"bold"}}>{grandTotal} pts</div>
          </div>
          {/* War columns (en curso — se archivan al cerrar semana) */}
          {warPtsNow!==0&&(
            <div style={{marginBottom:"6px",padding:"7px 10px",background:"rgba(64,224,255,0.05)",borderRadius:"6px",border:"1px solid rgba(64,224,255,0.15)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontFamily:"Georgia,serif",fontSize:"11px",color:"rgba(255,255,255,0.7)"}}>⚔ Guerra en curso</span>
                <span style={{fontFamily:"monospace",fontSize:"13px",color:"#40E0FF",fontWeight:"bold"}}>{warPtsNow>0?"+":""}{warPtsNow}</span>
              </div>
              {/* Sub-desglose guerra */}
              {[
                {l:"Registro",v:(player.pt_registro||0)+(player.pt_registro_temprano||0)+(player.pt_disponibilidad_declarada||0)},
                {l:"Aparición y órdenes",v:(player.pt_disponibilidad||0)+(player.pt_obediencia||0)*2},
                {l:"Batallas (×2V, ×1D)",v:(player.pt_batallas_ganadas||0)*2+(player.pt_batallas_perdidas||0)},
                {l:"Defensas",v:player.pt_defensas||0},
                {l:"Bonus (6B/completo)",v:(player.pt_bonus||0)*5+((player.pt_batallas_ganadas||0)>=6?10:0)},
                {l:"Stats BP/Poder/Nivel",v:player.pt_stats||0},
                {l:"Bandidos post",v:player.pt_bandido_post||0},
                {l:"Penalizaciones",v:-((player.pt_penalizacion||0)+(player.pt_no_aparecio||0)+(player.pt_ignoro_orden||0)*2+(player.pt_abandono||0)*2+(player.pt_inactivo_4h||0)*3+(player.pt_bandido_pre||0)+(player.pt_fuera_castillo||0)*2)},
              ].filter(x=>x.v!==0).map(x=>(
                <div key={x.l} style={{display:"flex",justifyContent:"space-between",padding:"1px 4px",fontSize:"9px"}}>
                  <span style={{color:"rgba(255,255,255,0.35)"}}>{x.l}</span>
                  <span style={{color:x.v>=0?"rgba(64,224,255,0.7)":"rgba(255,107,107,0.7)",fontFamily:"monospace"}}>{x.v>0?"+":""}{x.v}</span>
                </div>
              ))}
            </div>
          )}
          {/* Direct pts por fuente (de ptsLedger) */}
          {(()=>{
            // ALL categories — including those with 0 entries (shown grayed)
            const CATS=[
              {label:"📱 WhatsApp Fundador",  sources:["whatsapp"],  color:"#A8FF78", desc:"una vez permanente"},
              {label:"📡 Propaganda",  sources:["propaganda"],  color:"#C8A2FF", desc:"+1pt c/mensaje confirmado"},
              {label:"🗳 Asamblea",    sources:["asamblea_voto","asamblea_ganador","asamblea_pichichi","asamblea_mayor_puntaje","asamblea_empate_votos","asamblea_empate_puntaje","asamblea_racha_2","asamblea_racha_extra"], color:"#FFD700", desc:"votar +3 · ganar +10"},
              {label:"🔍 Inteligencia",sources:["intel_voto"],  color:"#FF6B6B", desc:"+1pt c/voto"},
              {label:"⚔ Versus PvP",  sources:["pvp_registro","pvp_confirmo","pvp_ganador","pvp_dudo_exitoso","pvp_acepto_dudo","pvp_escalo","pvp_gano_video","ranking_semanal","ranking_mensual"], color:"#FF6B6B", desc:"+1pt c/set registrado"},
              {label:"📰 Noticias",    sources:["noticia_leida","solicitud_cumplida"], color:"#FF9F43", desc:"+1pt leída · +3pt cumplida"},
              {label:"🔑 Código único",sources:["codigo_unico"], color:"#FFD700", desc:"+1pt c/día"},
              {label:"📦 Cierres semana",sources:["weekly_archive"], color:"rgba(200,200,200,0.5)", desc:"archivado semanalmente"},
              {label:"⚠ Penalizaciones",sources:["penalizacion"], color:"rgba(255,107,107,0.8)", desc:"-pts por incumplimiento"},
            ];
            return CATS.map(({label,sources,color,desc})=>{
              const entries=ptsLedger.filter(e=>sources.includes(e.source));
              const total=entries.reduce((s,e)=>s+(e.pts||0),0);
              const count=entries.length;
              const hasData=count>0;
              return(
                <div key={label} style={{marginBottom:"4px",padding:"7px 10px",background:hasData?color+"06":"rgba(255,255,255,0.01)",borderRadius:"5px",border:"1px solid "+(hasData?color+"15":"rgba(255,255,255,0.05)")}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <span style={{fontFamily:"Georgia,serif",fontSize:"11px",color:hasData?"rgba(255,255,255,0.7)":"rgba(255,255,255,0.25)"}}>{label}</span>
                      <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,255,255,0.2)",marginTop:"1px"}}>{desc}</div>
                    </div>
                    <div style={{textAlign:"right",minWidth:"60px"}}>
                      {hasData
                        ? <><div style={{fontFamily:"monospace",fontSize:"14px",color,fontWeight:"bold"}}>{total>0?"+":""}{total}</div>
                            <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,255,255,0.25)"}}>{count} vez{count>1?"es":""}</div></>
                        : <div style={{fontFamily:"monospace",fontSize:"10px",color:"rgba(255,255,255,0.15)"}}>—</div>
                      }
                    </div>
                  </div>
                  {hasData&&entries.slice(0,4).map((e,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"2px 4px",marginTop:"2px",fontSize:"9px",borderTop:i===0?"1px solid rgba(255,255,255,0.04)":"none"}}>
                      <span style={{color:"rgba(255,255,255,0.3)",maxWidth:"80%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.note?.slice(0,40)||e.source}</span>
                      <span style={{color:e.pts>=0?color:"rgba(255,107,107,0.7)",fontFamily:"monospace",flexShrink:0,marginLeft:"4px"}}>{e.pts>0?"+":""}{e.pts}</span>
                    </div>
                  ))}
                  {hasData&&entries.length>4&&<div style={{fontSize:"8px",color:"rgba(255,255,255,0.2)",paddingLeft:"4px",fontFamily:"monospace",marginTop:"2px"}}>+{entries.length-4} entradas más</div>}
                </div>
              );
            });
          })()}
          {/* Total = grandTotal */}
          <div style={{marginTop:"8px",padding:"6px 10px",background:"rgba(255,215,0,0.04)",borderRadius:"5px",border:"1px solid rgba(255,215,0,0.1)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,255,255,0.3)",letterSpacing:"0.1em"}}>TOTAL ACUMULADO</span>
            <span style={{fontFamily:"monospace",fontSize:"14px",color:rank.color,fontWeight:"bold"}}>{grandTotal}</span>
          </div>
        </div>

        {/* Guerrero Implacable history */}
        {assemblyWins.length > 0 && (
          <div style={{background:"linear-gradient(135deg,rgba(255,215,0,0.06),rgba(255,215,0,0.02))",border:"1px solid rgba(255,215,0,0.2)",borderRadius:"8px",padding:"14px",marginBottom:"16px"}}>
            <div style={{fontFamily:"monospace",fontSize:"9px",letterSpacing:"0.15em",color:"rgba(255,215,0,0.5)",marginBottom:"8px"}}>GUERRERO IMPLACABLE — HISTORIAL</div>
            {assemblyWins.map((v,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 6px",marginBottom:"2px",background:"rgba(255,215,0,0.04)",borderRadius:"4px"}}>
                <span style={{fontFamily:"monospace",fontSize:"9px",color:"rgba(255,255,255,0.35)"}}>{v.week}</span>
                <span style={{fontFamily:"monospace",fontSize:"9px",color:"#FFD700",fontWeight:"bold"}}>{v.voter_weight} pts votación</span>
              </div>
            ))}
            <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,215,0,0.3)",marginTop:"4px"}}>
              {assemblyWins.length} vez{assemblyWins.length>1?"es":""} elegido Guerrero Implacable
            </div>
          </div>
        )}

        {/* PvP Record */}
        {pvpBattles.length>0&&(()=>{
          let w=0,l=0;
          pvpBattles.filter(b=>b.status!=="disputed").forEach(b=>{
            const isC=String(b.challenger_id)===String(player.id);
            const cW=b.status==="confirmed_reversed"?b.opponent_wins:b.challenger_wins;
            const oW=b.status==="confirmed_reversed"?b.challenger_wins:b.opponent_wins;
            if(isC){w+=cW;l+=oW;}else{w+=oW;l+=cW;}
          });
          return(
            <div style={{background:"rgba(255,107,107,0.04)",border:"1px solid rgba(255,107,107,0.15)",borderRadius:"8px",padding:"14px",marginBottom:"16px"}}>
              <div style={{fontFamily:"monospace",fontSize:"9px",letterSpacing:"0.15em",color:"rgba(255,107,107,0.5)",marginBottom:"8px"}}>HISTORIAL PvP</div>
              <div style={{display:"flex",gap:"16px",marginBottom:"10px"}}>
                <div style={{textAlign:"center"}}><div style={{fontSize:"22px",color:"#A8FF78",fontFamily:"monospace",fontWeight:"bold"}}>{w}</div><div style={{fontSize:"8px",color:"rgba(255,255,255,0.3)",fontFamily:"monospace"}}>VICTORIAS</div></div>
                <div style={{textAlign:"center"}}><div style={{fontSize:"22px",color:"#FF6B6B",fontFamily:"monospace",fontWeight:"bold"}}>{l}</div><div style={{fontSize:"8px",color:"rgba(255,255,255,0.3)",fontFamily:"monospace"}}>DERROTAS</div></div>
                <div style={{textAlign:"center"}}><div style={{fontSize:"22px",color:"rgba(255,255,255,0.4)",fontFamily:"monospace",fontWeight:"bold"}}>{pvpBattles.length}</div><div style={{fontSize:"8px",color:"rgba(255,255,255,0.3)",fontFamily:"monospace"}}>SETS</div></div>
              </div>
              {/* H2H desglose por rival - includes pending (unconfirmed) */}
              {(()=>{
                const h2h={};
                pvpBattles.filter(b=>b.status!=="disputed").forEach(b=>{
                  const isC=String(b.challenger_id)===String(player.id);
                  const cW=b.status==="confirmed_reversed"?b.opponent_wins:b.challenger_wins;
                  const oW=b.status==="confirmed_reversed"?b.challenger_wins:b.opponent_wins;
                  const rival=isC?b.opponent_name:b.challenger_name;
                  const mW=isC?cW:oW, thW=isC?oW:cW;
                  if(!h2h[rival]) h2h[rival]={w:0,l:0};
                  h2h[rival].w+=mW; h2h[rival].l+=thW;
                });
                return Object.entries(h2h).sort((a,b)=>b[1].w-a[1].w).map(([rival,r])=>(
                  <div key={rival} style={{display:"flex",justifyContent:"space-between",padding:"4px 8px",marginBottom:"2px",background:"rgba(255,255,255,0.02)",borderRadius:"4px",border:"1px solid rgba(255,255,255,0.04)"}}>
                    <span style={{fontSize:"11px",color:"rgba(255,255,255,0.5)",fontFamily:"Georgia,serif"}}>vs {rival}</span>
                    <div style={{fontFamily:"monospace",fontSize:"11px"}}>
                      <span style={{color:r.w>r.l?"#A8FF78":"rgba(255,107,107,0.7)"}}>{r.w}V</span>
                      <span style={{color:"rgba(255,255,255,0.2)"}}> / </span>
                      <span style={{color:r.l>r.w?"#FF6B6B":"rgba(255,255,255,0.3)"}}>{r.l}D</span>
                    </div>
                  </div>
                ));
              })()}
              {pvpBattles.filter(b=>b.status==="pending").length>0&&(
                <div style={{fontSize:"8px",color:"rgba(255,215,0,0.4)",fontFamily:"monospace",marginTop:"4px"}}>
                  {pvpBattles.filter(b=>b.status==="pending").length} resultado(s) pendiente(s) de confirmar
                </div>
              )}
            </div>
          );
        })()}

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
    supabase.from("players").select("*, unique_code").eq("active", true).then(({ data }) => {
      if (data) {
        const rankOrder = p => {
          if (p.name === "PUNK'Z" || p.clan_role === "Líder") return 0;
          if (p.clan_role === "Co-Líder") return 1;
          if (p.clan_role === "Oficial")  return 2;
          const total = (p.pts_acumulados||0) + totalPts(p); // honorificos excluded (buffer only)
          if (total >= 1000) return 3;
          if (total >= 500)  return 4;
          if (total >= 100)  return 5;
          if (total >= 0)    return 6;
          return 7;
        };
        data.sort((a, b) => {
          const ra = rankOrder(a), rb = rankOrder(b);
          if (ra !== rb) return ra - rb;
          const totalA = (a.pts_acumulados||0) + totalPts(a);
          const totalB = (b.pts_acumulados||0) + totalPts(b);
          if (totalB !== totalA) return totalB - totalA;
          return (b.bp||0) - (a.bp||0);
        });
        setPlayers(data);
        // Expose global to open own profile (used by NavBar "MI PERFIL")
        window.__openOwnProfile = (players) => {
          const sid = sessionStorage.getItem("aor_player_id");
          if (sid) {
            const own = (players||data).find(p=>String(p.id)===sid);
            if (own) { setSelected(own); sessionStorage.setItem("aor_last_viewed_player", String(own.id)); }
          }
        };
        // Auto-open own profile when ?own=1 is in URL
        const sid = sessionStorage.getItem("aor_player_id");
        const ownParam = new URLSearchParams(window.location.search).get("own");
        const gotoProfile = sessionStorage.getItem("aor_goto_profile");
        // Also restore last viewed profile on refresh
        const lastViewed = sessionStorage.getItem("aor_last_viewed_player");
        if ((ownParam === "1" || gotoProfile === "1") && sid) {
          sessionStorage.removeItem("aor_goto_profile");
          const own = data.find(p=>String(p.id)===sid);
          if (own) { setSelected(own); sessionStorage.setItem("aor_last_viewed_player", String(own.id)); }
          if (ownParam) window.history.replaceState({}, "", "/reporte");
        } else if (lastViewed) {
          // Restore last viewed profile (handles refresh)
          const last = data.find(p=>String(p.id)===lastViewed);
          if (last) setSelected(last);
        }
      }
      setLoading(false);
    });
  }, []);

  // React to SPA navigation - popstate fires on pushState
  useEffect(()=>{
    function handleNav() {
      const gotoProfile = sessionStorage.getItem("aor_goto_profile");
      const sid = sessionStorage.getItem("aor_player_id");
      if (gotoProfile==="1") {
        sessionStorage.removeItem("aor_goto_profile");
        if (sid && players.length>0) {
          const own = players.find(p=>String(p.id)===sid);
          if (own) { setSelected(own); return; }
        }
        // Players not loaded yet - flag will be picked up in the players useEffect
        sessionStorage.setItem("aor_goto_profile","1");
      } else {
        setSelected(null); // navigated to /reporte without profile flag = ranking
      }
    }
    window.addEventListener("popstate", handleNav);
    return ()=>window.removeEventListener("popstate", handleNav);
  },[players]);

  if (loading) return <LoadingScreen page="/reporte"/>;

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
            <div key={p.id} onClick={() => { setSelected(p); sessionStorage.setItem("aor_last_viewed_player", String(p.id)); }} style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.08)",borderLeft:"3px solid "+rank.color,borderRadius:"8px",padding:"10px 14px",marginBottom:"6px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
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

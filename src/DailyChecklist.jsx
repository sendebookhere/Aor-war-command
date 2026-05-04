import { useState, useEffect } from "react";
import { supabase } from "./supabase";

// ── Pool of possible daily tasks ─────────────────────────────────────────────
// Each task: id, label, icon, desc, how to check completion, action button
const TASK_POOL = [
  { id:"pvp_registro",   icon:"⚔",  label:"Registra una partida Versus", desc:"Desafía a un rival en la hoja Versus", href:"/versus" },
  { id:"pvp_pending",    icon:"⏳", label:"Resuelve resultados pendientes", desc:"Confirma o duda los sets que esperan tu respuesta", href:"/versus" },
  { id:"propaganda",     icon:"📡", label:"Publica un mensaje de propaganda", desc:"Difunde un mensaje en el chat del juego", href:"/propaganda" },
  { id:"asamblea",       icon:"🗳", label:"Vota en la Asamblea", desc:"Elige al Guerrero Implacable de la semana", href:"/asamblea" },
  { id:"intel",          icon:"🔍", label:"Vota en Inteligencia Militar", desc:"Califica la dificultad de un clan rival", href:"/inteligencia" },
  { id:"stats",          icon:"📊", label:"Actualiza tus stats", desc:"Registra tu BP, Poder y Nivel de esta semana", href:"/registro" },
  { id:"codigo",         icon:"🔑", label:"Crea tu código único", desc:"Configura tu código de acceso de 6 dígitos", href:"/reporte" },
  { id:"pvp_win2",       icon:"🏆", label:"Gana 2 sets en Versus", desc:"Gana 2 sets de 3 batallas (2-3 o 3-3)", href:"/versus" },
  { id:"pvp_9battles",   icon:"💀", label:"Acumula 9 victorias unitarias", desc:"Gana 9 batallas individuales en Versus", href:"/versus" },
  { id:"discord",        icon:"🎮", label:"Visita el Discord del clan", desc:"Entra y saluda a los guerreros de [AOR]", href:null, discord:true },
];

// Seeded random — same 3 tasks per player per jornada
function jornadaKey() {
  const now = new Date();
  const utcH = now.getUTCHours();
  const d = new Date(now);
  if (utcH < 13) d.setUTCDate(d.getUTCDate() - 1); // before 8am Ecuador
  return d.toISOString().slice(0, 10);
}

function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function pickTasks(playerId, jkey) {
  // Deterministic 3 tasks from pool based on player+jornada
  const seed = parseInt(jkey.replace(/-/g,"")) + (playerId || 0);
  const pool = [...TASK_POOL];
  const picks = [];
  let s = seed;
  while (picks.length < 3 && pool.length > 0) {
    s = Math.floor(seededRandom(s + picks.length * 7) * pool.length);
    picks.push(pool.splice(s % pool.length, 1)[0]);
  }
  return picks;
}

function getWarWeek() {
  const now = new Date();
  const ec = new Date(now.getTime() - 5 * 3600000);
  const day = ec.getUTCDay();
  const hour = ec.getUTCHours();
  // Before 8am Monday Ecuador = still previous week
  const ref = new Date(ec);
  if (day === 1 && hour < 8) ref.setUTCDate(ec.getUTCDate() - 7);
  const mon = new Date(ref);
  mon.setUTCDate(ref.getUTCDate() - ((ref.getUTCDay() + 6) % 7));
  const y = mon.getUTCFullYear();
  const w = Math.ceil(((mon - new Date(Date.UTC(y, 0, 1))) / 86400000 + 1) / 7);
  return `${y}-W${String(w).padStart(2, "0")}`;
}

const DISCORD_URL = "https://discord.gg/sb2eHSSmff";
const DISCORD_MSG = playerName => `Saludos nobles guerreros, aquí ${playerName} los saluda y pone la espada a su servicio!`;

export default function DailyChecklist({ playerId, playerName }) {
  const [tasks, setTasks]         = useState([]);
  const [completed, setCompleted] = useState({});
  const [loading, setLoading]     = useState(true);
  const [awarding, setAwarding]   = useState(false);
  const [msg, setMsg]             = useState("");
  const [copied, setCopied]       = useState(false);

  const jkey = jornadaKey();
  const storageKey = `aor_checklist_${playerId}_${jkey}`;

  useEffect(() => {
    if (!playerId) { setLoading(false); return; }
    const todayTasks = pickTasks(playerId, jkey);
    setTasks(todayTasks);

    function doCheck() {
      const saved = localStorage.getItem(storageKey);
      const savedCompleted = saved ? JSON.parse(saved) : {};
      autoCheckTasks(todayTasks, savedCompleted).then(checked => {
        // Award pts for newly completed tasks
        const prev = JSON.parse(localStorage.getItem(storageKey)||"{}");
        const newlyDone = todayTasks.filter(t => checked[t.id] && !prev[t.id]);
        if (newlyDone.length > 0) {
          localStorage.setItem(storageKey, JSON.stringify(checked));
          // Award pts for each newly completed task
          newlyDone.forEach(t => awardPt(1, "checklist_tarea", `Checklist: ${t.id} — jornada ${jkey}`));
          // Check if all done after new completions
          const allNowDone = todayTasks.every(t => checked[t.id]);
          const wasAllDone = todayTasks.every(t => prev[t.id]);
          if (allNowDone && !wasAllDone) {
            awardPt(3, "checklist_bonus", `Checklist completo — jornada ${jkey}`);
            setMsg("🏆 ¡Checklist completo! +6pts totales");
            setTimeout(() => setMsg(""), 4000);
          }
        }
        setCompleted(checked);
        setLoading(false);
      });
    }
    doCheck();
    // Re-check when tab gets focus (user returns from another page)
    window.addEventListener("focus", doCheck);
    return () => window.removeEventListener("focus", doCheck);
  }, [playerId, jkey]);

  async function autoCheckTasks(todayTasks, saved) {
    const checked = { ...saved };
    const week = getWarWeek();
    const today = jkey;

    for (const task of todayTasks) {
      if (checked[task.id]) continue; // already marked

      if (task.id === "pvp_registro") {
        const { data } = await supabase.from("pvp_battles")
          .select("id").eq("challenger_id", playerId)
          .gte("created_at", today + "T13:00:00Z") // 8am Ecuador
          .limit(1);
        if (data?.length) checked[task.id] = true;
      }

      if (task.id === "pvp_pending") {
        const { data } = await supabase.from("pvp_battles")
          .select("id").eq("opponent_id", playerId).eq("status", "pending");
        if (data?.length === 0) checked[task.id] = true; // no pending = all resolved
      }

      if (task.id === "propaganda") {
        const { data } = await supabase.from("message_logs")
          .select("id").eq("player_id", playerId)
          .gte("created_at", today + "T13:00:00Z")
          .limit(1);
        if (data?.length) checked[task.id] = true;
      }

      if (task.id === "asamblea") {
        const { data } = await supabase.from("assembly_votes")
          .select("id").eq("voter_id", playerId).eq("week", week).limit(1);
        if (data?.length) checked[task.id] = true;
      }

      if (task.id === "intel") {
        const { data } = await supabase.from("difficulty_votes")
          .select("id").eq("player_id", playerId).eq("week", week).limit(1);
        if (data?.length) checked[task.id] = true;
      }

      if (task.id === "stats") {
        const { data } = await supabase.from("players")
          .select("stats_updated_week").eq("id", playerId).single();
        if (data?.stats_updated_week === week) checked[task.id] = true;
      }

      if (task.id === "codigo") {
        const { data } = await supabase.from("players")
          .select("unique_code").eq("id", playerId).single();
        if (data?.unique_code?.length === 6) checked[task.id] = true;
      }

      if (task.id === "pvp_win2") {
        const { data } = await supabase.from("pvp_battles")
          .select("challenger_wins,opponent_wins,challenger_id,opponent_id,status")
          .or(`challenger_id.eq.${playerId},opponent_id.eq.${playerId}`)
          .in("status", ["confirmed", "auto_confirmed"])
          .gte("created_at", today + "T13:00:00Z");
        const wins = (data||[]).filter(b => {
          const isChallenger = String(b.challenger_id) === String(playerId);
          const myWins = isChallenger ? b.challenger_wins : b.opponent_wins;
          return myWins >= 2;
        }).length;
        if (wins >= 2) checked[task.id] = true;
      }

      if (task.id === "pvp_9battles") {
        const { data } = await supabase.from("pvp_battles")
          .select("challenger_wins,opponent_wins,challenger_id,opponent_id,status")
          .or(`challenger_id.eq.${playerId},opponent_id.eq.${playerId}`)
          .in("status", ["confirmed", "auto_confirmed"])
          .gte("created_at", today + "T13:00:00Z");
        const totalWins = (data||[]).reduce((sum, b) => {
          const isChallenger = String(b.challenger_id) === String(playerId);
          return sum + (isChallenger ? b.challenger_wins : b.opponent_wins);
        }, 0);
        if (totalWins >= 9) checked[task.id] = true;
      }
    }
    return checked;
  }

  async function markDone(taskId) {
    if (completed[taskId] || awarding) return;
    const newCompleted = { ...completed, [taskId]: true };
    setCompleted(newCompleted);
    localStorage.setItem(storageKey, JSON.stringify(newCompleted));

    // Award +1pt
    setAwarding(true);
    await awardPt(1, "checklist_tarea", `Checklist: ${taskId} — jornada ${jkey}`);

    // Check if all 3 done → bonus +3pts
    const allDone = tasks.every(t => newCompleted[t.id]);
    if (allDone) {
      await awardPt(3, "checklist_bonus", `Checklist completo — jornada ${jkey}`);
      setMsg("🏆 ¡Checklist completo! +1+1+1+3 = +6pts");
    } else {
      setMsg("+1pt por completar la tarea");
    }
    setAwarding(false);
    setTimeout(() => setMsg(""), 3000);
  }

  async function awardPt(pts, source, note) {
    const week = getWarWeek();
    const month = new Date().toISOString().slice(0, 7);
    try {
      const { data: p } = await supabase.from("players")
        .select("pts_acumulados").eq("id", playerId).single();
      await supabase.from("players")
        .update({ pts_acumulados: (p?.pts_acumulados || 0) + pts })
        .eq("id", playerId);
      await supabase.from("pts_ledger").insert({
        player_id: parseInt(playerId), pts, source, note,
        week, month, created_at: new Date().toISOString()
      });
    } catch (e) {}
  }

  function handleDiscord() {
    const msg = DISCORD_MSG(playerName || "Guerrero");
    navigator.clipboard.writeText(msg).then(() => setCopied(true));
    setTimeout(() => setCopied(false), 3000);
    // Open Discord
    window.open(DISCORD_URL, "_blank");
    // Mark done
    markDone("discord");
  }

  const doneCount = tasks.filter(t => completed[t.id]).length;
  const allDone = doneCount === 3;

  if (!playerId) return null;
  if (loading) return (
    <div style={{ width: "100%", maxWidth: "480px", marginBottom: "16px" }}>
      <div style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.2em" }}>Cargando misiones...</div>
    </div>
  );

  return (
    <div style={{ width: "100%", maxWidth: "480px", marginBottom: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <div>
          <div style={{ fontFamily: "monospace", fontSize: "9px", letterSpacing: "0.2em", color: "rgba(255,215,0,0.5)", marginBottom: "2px" }}>
            MISIONES DIARIAS
          </div>
          <div style={{ fontFamily: "monospace", fontSize: "8px", color: "rgba(255,255,255,0.2)" }}>
            Jornada {jkey} · Se renuevan a las 8:00am Ecuador
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "monospace", fontSize: "11px", color: allDone ? "#FFD700" : "rgba(255,255,255,0.3)", fontWeight: "bold" }}>
            {doneCount}/3
          </div>
          <div style={{ fontFamily: "monospace", fontSize: "8px", color: "rgba(255,255,255,0.2)" }}>
            {allDone ? "🏆 +6pts" : `+${doneCount}/${doneCount<3?"6":6}pts`}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: "2px", background: "rgba(255,255,255,0.06)", borderRadius: "1px", marginBottom: "10px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(doneCount / 3) * 100}%`, background: allDone ? "#FFD700" : "#40E0FF", borderRadius: "1px", transition: "width 0.4s ease" }} />
      </div>

      {/* Tasks */}
      {tasks.map((task) => {
        const done = completed[task.id];
        return (
          <div key={task.id} style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "10px 12px", marginBottom: "5px",
            background: done ? "rgba(168,255,120,0.04)" : "rgba(255,255,255,0.02)",
            border: "1px solid " + (done ? "rgba(168,255,120,0.15)" : "rgba(255,255,255,0.05)"),
            borderLeft: "3px solid " + (done ? "rgba(168,255,120,0.5)" : "rgba(255,255,255,0.1)"),
            borderRadius: "7px", transition: "all 0.3s ease",
          }}>
            {/* Checkbox */}
            <div onClick={() => !done && !task.discord && window.__aorNavigate && window.__aorNavigate(task.href)}
              style={{
                width: "18px", height: "18px", borderRadius: "4px", flexShrink: 0,
                background: done ? "rgba(168,255,120,0.2)" : "rgba(255,255,255,0.04)",
                border: "1px solid " + (done ? "rgba(168,255,120,0.5)" : "rgba(255,255,255,0.15)"),
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: done ? "default" : "pointer",
                fontSize: "11px",
              }}>
              {done ? "✓" : ""}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ fontSize: "12px" }}>{task.icon}</span>
                <span style={{ fontSize: "11px", fontFamily: "Georgia,serif", color: done ? "rgba(168,255,120,0.7)" : "rgba(255,255,255,0.6)", textDecoration: done ? "line-through" : "none" }}>
                  {task.label}
                </span>
              </div>
              <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", fontFamily: "monospace", marginTop: "1px" }}>
                {task.desc}
              </div>
            </div>

            {/* Action button */}
            {!done && (
              task.discord ? (
                <div>
                  <button onClick={handleDiscord}
                    style={{ padding: "4px 8px", background: "rgba(114,137,218,0.15)", border: "1px solid rgba(114,137,218,0.3)", borderRadius: "4px", color: "#7289DA", fontSize: "9px", cursor: "pointer", fontFamily: "monospace", display: "block", marginBottom: "2px" }}>
                    🎮 Ir + copiar
                  </button>
                  {copied && <div style={{ fontSize: "8px", color: "rgba(168,255,120,0.6)", fontFamily: "monospace", textAlign: "center" }}>✓ copiado</div>}
                </div>
              ) : (
                <button onClick={() => window.__aorNavigate && window.__aorNavigate(task.href)}
                  style={{ padding: "4px 8px", background: "rgba(64,224,255,0.08)", border: "1px solid rgba(64,224,255,0.2)", borderRadius: "4px", color: "#40E0FF", fontSize: "9px", cursor: "pointer", fontFamily: "monospace", flexShrink: 0 }}>
                  Ir ›
                </button>
              )
            )}
            {done && (
              <div style={{ fontFamily: "monospace", fontSize: "10px", color: "rgba(168,255,120,0.5)", flexShrink: 0 }}>+1pt</div>
            )}
          </div>
        );
      })}

      {/* Bonus indicator */}
      {allDone && (
        <div style={{ display: "flex", justifyContent: "center", padding: "8px", background: "rgba(255,215,0,0.05)", border: "1px solid rgba(255,215,0,0.15)", borderRadius: "7px", marginTop: "4px" }}>
          <span style={{ fontFamily: "monospace", fontSize: "10px", color: "#FFD700" }}>🏆 Bonus completado · +3pts extra · Total: +6pts</span>
        </div>
      )}

      {/* Discord message hint */}
      {tasks.some(t => t.discord && !completed[t.id]) && (
        <div style={{ marginTop: "6px", padding: "6px 10px", background: "rgba(114,137,218,0.05)", border: "1px solid rgba(114,137,218,0.15)", borderRadius: "6px", fontSize: "9px", color: "rgba(114,137,218,0.6)", fontFamily: "monospace" }}>
          💬 Mensaje a copiar: "{DISCORD_MSG(playerName || "Guerrero")}"
        </div>
      )}

      {/* Feedback message */}
      {msg && (
        <div style={{ textAlign: "center", fontFamily: "monospace", fontSize: "10px", color: "#A8FF78", marginTop: "6px", fontWeight: "bold" }}>
          {msg}
        </div>
      )}
    </div>
  );
}

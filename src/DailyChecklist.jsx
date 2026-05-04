import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

// ── Jornada boundary: 8am Ecuador = 13:00 UTC ────────────────────────────────
function jornadaKey() {
  const now = new Date();
  const d = new Date(now);
  if (now.getUTCHours() < 13) d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function getWarWeek() {
  const now = new Date();
  const ec = new Date(now.getTime() - 5 * 3600000);
  const day = ec.getUTCDay(), hour = ec.getUTCHours();
  const ref = new Date(ec);
  if (day === 1 && hour < 8) ref.setUTCDate(ec.getUTCDate() - 7);
  const mon = new Date(ref);
  mon.setUTCDate(ref.getUTCDate() - ((ref.getUTCDay() + 6) % 7));
  const y = mon.getUTCFullYear();
  const w = Math.ceil(((mon - new Date(Date.UTC(y, 0, 1))) / 86400000 + 1) / 7);
  return `${y}-W${String(w).padStart(2, "0")}`;
}

// ── Task definitions ─────────────────────────────────────────────────────────
// priority: "urgent" = always shown (above random 3), "normal" = in random pool
// condition: function to check if task is currently applicable
const ALL_TASKS = [
  { id:"noticias",      icon:"📢", label:"Lee las noticias del clan",          desc:"Hay novedades — leerlas y marcar como leídas", href:"/noticias",     priority:"urgent",  alwaysCheck:true  },
  { id:"asamblea",      icon:"🗳", label:"Vota en la Asamblea",                desc:"La votación está abierta — elige al Guerrero Implacable", href:"/asamblea",     priority:"urgent",  alwaysCheck:true  },
  { id:"intel",         icon:"🔍", label:"Vota en Inteligencia Militar",       desc:"Votación activa — califica la dificultad de un rival", href:"/inteligencia", priority:"urgent",  alwaysCheck:true  },
  { id:"stats",         icon:"📊", label:"Actualiza tus stats",                desc:"No has registrado BP/Poder/Nivel esta semana", href:"/registro",     priority:"urgent",  alwaysCheck:true  },
  { id:"pvp_registro",  icon:"⚔",  label:"Registra una partida Versus",        desc:"Desafía a un rival y registra el resultado", href:"/versus",       priority:"normal"  },
  { id:"pvp_pending",   icon:"⏳", label:"Resuelve resultados pendientes",      desc:"Tienes sets esperando tu confirmación o DUDO", href:"/versus",       priority:"normal"  },
  { id:"propaganda",    icon:"📡", label:"Publica un mensaje de propaganda",    desc:"Difunde un mensaje aprobado en el chat del juego", href:"/propaganda",   priority:"normal"  },
  { id:"codigo",        icon:"🔑", label:"Crea tu código único",               desc:"Configura tu código de acceso de 6 dígitos", href:"/reporte",      priority:"normal"  },
  { id:"pvp_win2",      icon:"🏆", label:"Gana 2 sets en Versus",              desc:"Gana 2 sets (2-3 o 3-3) en esta jornada", href:"/versus",       priority:"normal"  },
  { id:"pvp_9battles",  icon:"💀", label:"Acumula 9 victorias unitarias",      desc:"Gana 9 batallas individuales en Versus hoy", href:"/versus",       priority:"normal"  },
  { id:"discord",       icon:"🎮", label:"Visita el Discord del clan",         desc:"Entra y saluda a los guerreros de [AOR]", href:null,            priority:"normal",  discord:true },
];

const DISCORD_URL = "https://discord.gg/sb2eHSSmff";
const DISCORD_MSG = name => `Saludos nobles guerreros, aquí ${name} los saluda y pone la espada a su servicio!`;

// ── Weight-based random selection ────────────────────────────────────────────
// Lower weight = more likely to be picked (avoid repetition)
function pickRandomTasks(weights, jkey, playerId, count=3) {
  const normalPool = ALL_TASKS.filter(t => t.priority === "normal");
  // Build weighted pool: tasks with lower weight get more tickets
  const maxW = Math.max(...normalPool.map(t => weights[t.id] || 0), 1);
  const tickets = [];
  normalPool.forEach(t => {
    const w = weights[t.id] || 0;
    // Inverse weight: more tickets = lower weight
    const ticketCount = Math.max(1, maxW - w + 1);
    for (let i = 0; i < ticketCount; i++) tickets.push(t.id);
  });
  // Seeded shuffle for determinism within same jornada+player
  const seed = parseInt(jkey.replace(/-/g, "")) + (playerId || 0);
  let s = seed;
  const shuffled = [...tickets];
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = Math.floor(Math.abs(Math.sin(s + i) * 10000)) % (i + 1);
    [shuffled[i], shuffled[s]] = [shuffled[s], shuffled[i]];
  }
  // Pick `count` unique tasks
  const picked = [];
  const seen = new Set();
  for (const id of shuffled) {
    if (!seen.has(id)) { seen.add(id); picked.push(id); }
    if (picked.length === count) break;
  }
  return picked.map(id => ALL_TASKS.find(t => t.id === id));
}

// ── DB check functions ────────────────────────────────────────────────────────
async function checkTask(taskId, playerId, jkey, week) {
  const jStart = jkey + "T13:00:00Z"; // 8am Ecuador = 13:00 UTC

  switch(taskId) {
    case "noticias": {
      // Check if there are unread active news/requests
      const { data: news } = await supabase.from("clan_news")
        .select("id, completions, type, created_at").eq("active", true);
      if (!news?.length) return { applicable: false, done: false };
      const hasUnread = news.some(n => {
        const completions = n.completions || [];
        return !completions.some(c => String(c.player_id) === String(playerId));
      });
      // applicable: only when there is unread content
      return { applicable: news.length > 0 && hasUnread, done: !hasUnread };
    }
    case "asamblea": {
      const { data: settings } = await supabase.from("app_settings")
        .select("value").eq("key","voting_enabled").single();
      const open = settings?.value === "true" || settings?.value === true;
      if (!open) return { applicable: false, done: false };
      const { data: vote } = await supabase.from("assembly_votes")
        .select("id").eq("voter_id", playerId).eq("week", week).limit(1);
      // applicable: only when open AND not yet voted
      const voted = vote?.length > 0;
      return { applicable: open && !voted, done: voted };
    }
    case "intel": {
      const { data: vote } = await supabase.from("difficulty_votes")
        .select("id").eq("player_id", playerId).eq("week", week).limit(1);
      const { data: clans } = await supabase.from("war_intel")
        .select("id").limit(1);
      const hasClans = clans?.length > 0;
      const voted = vote?.length > 0;
      // applicable: only when there are clans to vote AND not yet voted this week
      return { applicable: hasClans && !voted, done: voted };
    }
    case "stats": {
      const { data: p } = await supabase.from("players")
        .select("stats_updated_week").eq("id", playerId).single();
      const alreadyDone = p?.stats_updated_week === week;
      // applicable: true only if NOT already done this week
      return { applicable: !alreadyDone, done: alreadyDone };
    }
    case "codigo": {
      const { data: p } = await supabase.from("players")
        .select("unique_code").eq("id", playerId).single();
      return { applicable: true, done: p?.unique_code?.length === 6 };
    }
    case "pvp_registro": {
      const { data } = await supabase.from("pvp_battles")
        .select("id").eq("challenger_id", playerId)
        .gte("created_at", jStart).limit(1);
      return { applicable: true, done: data?.length > 0 };
    }
    case "pvp_pending": {
      const { data } = await supabase.from("pvp_battles")
        .select("id").eq("opponent_id", playerId).eq("status","pending");
      // Only applicable when you HAVE pending battles to resolve
      // Not applicable = not shown at all (never marked as done automatically)
      const hasPending = data?.length > 0;
      return { applicable: hasPending, done: false };
      // done:true only set when user manually resolves all pending (via handleComplete)
    }
    case "propaganda": {
      const { data } = await supabase.from("message_logs")
        .select("id").eq("player_id", playerId)
        .gte("created_at", jStart).limit(1);
      return { applicable: true, done: data?.length > 0 };
    }
    case "pvp_win2": {
      const { data } = await supabase.from("pvp_battles")
        .select("challenger_wins,opponent_wins,challenger_id,status")
        .or(`challenger_id.eq.${playerId},opponent_id.eq.${playerId}`)
        .in("status",["confirmed","auto_confirmed"])
        .gte("created_at", jStart);
      const wins = (data||[]).filter(b => {
        const isCh = String(b.challenger_id) === String(playerId);
        return (isCh ? b.challenger_wins : b.opponent_wins) >= 2;
      }).length;
      return { applicable: true, done: wins >= 2 };
    }
    case "pvp_9battles": {
      const { data } = await supabase.from("pvp_battles")
        .select("challenger_wins,opponent_wins,challenger_id,status")
        .or(`challenger_id.eq.${playerId},opponent_id.eq.${playerId}`)
        .in("status",["confirmed","auto_confirmed"])
        .gte("created_at", jStart);
      const total = (data||[]).reduce((s,b) => {
        const isCh = String(b.challenger_id) === String(playerId);
        return s + (isCh ? b.challenger_wins : b.opponent_wins);
      }, 0);
      return { applicable: true, done: total >= 9 };
    }
    case "discord":
      return { applicable: true, done: false }; // manual only
    default:
      return { applicable: true, done: false };
  }
}

// ── Weight management ────────────────────────────────────────────────────────
async function loadWeights(playerId) {
  const { data } = await supabase.from("daily_checklist_weights")
    .select("task_id, weight").eq("player_id", playerId);
  const w = {};
  (data||[]).forEach(r => { w[r.task_id] = r.weight; });
  return w;
}

async function updateWeight(playerId, taskId, delta) {
  const { data: existing } = await supabase.from("daily_checklist_weights")
    .select("weight").eq("player_id", playerId).eq("task_id", taskId).single();
  const newWeight = Math.max(0, (existing?.weight || 0) + delta);
  await supabase.from("daily_checklist_weights").upsert({
    player_id: parseInt(playerId), task_id: taskId,
    weight: newWeight, updated_at: new Date().toISOString()
  }, { onConflict: "player_id,task_id" });
}

async function balanceWeights(playerId, weights) {
  // Rule: no task can have more than 6 points difference from the highest
  const vals = Object.values(weights);
  if (!vals.length) return;
  const maxW = Math.max(...vals);
  const updates = [];
  Object.entries(weights).forEach(([id, w]) => {
    if (maxW - w > 6) {
      updates.push(supabase.from("daily_checklist_weights").upsert({
        player_id: parseInt(playerId), task_id: id,
        weight: maxW - 6, updated_at: new Date().toISOString()
      }, { onConflict: "player_id,task_id" }));
    }
  });
  await Promise.all(updates);
}

async function awardPt(playerId, pts, source, note) {
  const week = getWarWeek();
  const month = new Date().toISOString().slice(0, 7);
  try {
    const { data: p } = await supabase.from("players")
      .select("pts_acumulados").eq("id", parseInt(playerId)).single();
    await supabase.from("players")
      .update({ pts_acumulados: (p?.pts_acumulados || 0) + pts })
      .eq("id", parseInt(playerId));
    await supabase.from("pts_ledger").insert({
      player_id: parseInt(playerId), pts, source, note,
      week, month, created_at: new Date().toISOString()
    });
  } catch(e) {}
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DailyChecklist({ playerId, playerName }) {
  const [urgentTasks, setUrgentTasks]   = useState([]); // priority tasks that apply
  const [randomTasks, setRandomTasks]   = useState([]); // today's 3 random tasks
  const [taskStatus, setTaskStatus]     = useState({}); // {taskId: {applicable, done}}
  const [loading, setLoading]           = useState(true);
  const [awarding, setAwarding]         = useState(new Set());
  const [awardedToday, setAwardedToday] = useState({});
  const [msg, setMsg]                   = useState("");
  const [copied, setCopied]             = useState(false);

  const jkey = jornadaKey();
  const week = getWarWeek();
  const awardKey = `aor_checklist_awarded_${playerId}_${jkey}`;

  const loadAll = useCallback(async () => {
    if (!playerId) { setLoading(false); return; }

    // Load what was already awarded today
    const savedAwarded = JSON.parse(localStorage.getItem(awardKey) || "{}");
    setAwardedToday(savedAwarded);

    // Load weights for random selection
    const weights = await loadWeights(playerId);

    // Pick 6 candidates (normal priority), then filter non-applicable, keep first 3
    // This ensures we always show 3 tasks even if some are not applicable
    const candidates = pickRandomTasks(weights, jkey, playerId, 6);
    setRandomTasks(candidates); // store all candidates, filter in render

    // Check ALL tasks statuses
    const urgentList = ALL_TASKS.filter(t => t.priority === "urgent");
    const allToCheck = [...urgentList, ...candidates]; // check all 6 candidates
    const statuses = {};
    await Promise.all(allToCheck.map(async t => {
      statuses[t.id] = await checkTask(t.id, playerId, jkey, week);
    }));
    setTaskStatus(statuses);

    // Urgent tasks: only show when applicable AND not yet done
    // Once done → disappears until next activation
    setUrgentTasks(urgentList.filter(t => {
      const s = statuses[t.id];
      return s?.applicable && !s?.done;
    }));

    // Update weights: +1 for each task that was shown but not done
    // (only once per jornada, tracked in localStorage)
    const shownKey = `aor_checklist_shown_${playerId}_${jkey}`;
    if (!localStorage.getItem(shownKey)) {
      localStorage.setItem(shownKey, "1");
      allToCheck.forEach(t => {
        if (!statuses[t.id]?.done) updateWeight(playerId, t.id, 1);
      }); // only weight tasks that were actually shown (first 3 applicable)
    }

    await balanceWeights(playerId, weights);
    setLoading(false);
  }, [playerId, jkey, week]);

  useEffect(() => {
    loadAll();
    window.addEventListener("focus", loadAll);
    return () => window.removeEventListener("focus", loadAll);
  }, [loadAll]);

  async function handleComplete(task) {
    if (awarding.has(task.id) || awardedToday[task.id]) return;

    // Mark as awarding
    setAwarding(prev => new Set(prev).add(task.id));

    // Award +1pt
    await awardPt(playerId, 1, "checklist_tarea", `Checklist: ${task.id} — ${jkey}`);

    // Update weight +3 (completed)
    await updateWeight(playerId, task.id, 3);

    // Save to localStorage
    const newAwarded = { ...awardedToday, [task.id]: true };
    setAwardedToday(newAwarded);
    localStorage.setItem(awardKey, JSON.stringify(newAwarded));

    // Check if all visible tasks done = bonus
    const allVisible = [...urgentTasks, ...randomTasks];
    const visibleRand = randomTasks.filter(t => taskStatus[t.id]?.applicable !== false);
    const allVisibleNow = [...urgentTasks, ...visibleRand];
    const allDone = allVisibleNow.length > 0 && allVisibleNow.every(t => newAwarded[t.id] || taskStatus[t.id]?.done);
    if (allDone && !awardedToday["__bonus__"]) {
      await awardPt(playerId, 3, "checklist_bonus", `Checklist completo — ${jkey}`);
      const withBonus = { ...newAwarded, "__bonus__": true };
      setAwardedToday(withBonus);
      localStorage.setItem(awardKey, JSON.stringify(withBonus));
      setMsg("🏆 ¡Checklist completo! +6pts totales");
    } else {
      setMsg("+1pt por completar la tarea");
    }

    setAwarding(prev => { const s = new Set(prev); s.delete(task.id); return s; });
    setTimeout(() => setMsg(""), 3000);

    // Refresh status
    const newStatus = await checkTask(task.id, playerId, jkey, week);
    setTaskStatus(prev => ({ ...prev, [task.id]: newStatus }));
  }

  async function handleDiscord() {
    const text = DISCORD_MSG(playerName || "Guerrero");
    navigator.clipboard.writeText(text).then(() => setCopied(true));
    setTimeout(() => setCopied(false), 3000);
    window.open(DISCORD_URL, "_blank");
    await handleComplete(ALL_TASKS.find(t => t.id === "discord"));
  }

  function isDone(task) {
    return awardedToday[task.id] || taskStatus[task.id]?.done;
  }

  const visibleRandom = randomTasks.filter(t => taskStatus[t.id]?.applicable !== false).slice(0, 3);
  const allVisible = [...urgentTasks, ...visibleRandom];
  const doneCount = allVisible.filter(t => isDone(t)).length;
  const totalCount = allVisible.length;
  const bonusDone = awardedToday["__bonus__"];

  if (!playerId) return null;
  if (loading) return (
    <div style={{ width:"100%",maxWidth:"480px",marginBottom:"16px" }}>
      <div style={{ fontFamily:"monospace",fontSize:"9px",color:"rgba(255,255,255,0.2)",letterSpacing:"0.2em" }}>
        Cargando misiones...
      </div>
    </div>
  );

  function TaskRow({ task, isUrgent }) {
    const done = isDone(task);
    const status = taskStatus[task.id];
    const inProgress = awarding.has(task.id);

    return (
      <div style={{
        display:"flex", alignItems:"center", gap:"10px",
        padding:"10px 12px", marginBottom:"5px",
        background: done ? "rgba(168,255,120,0.04)" : isUrgent ? "rgba(255,215,0,0.04)" : "rgba(255,255,255,0.02)",
        border:"1px solid "+(done?"rgba(168,255,120,0.15)":isUrgent?"rgba(255,215,0,0.15)":"rgba(255,255,255,0.05)"),
        borderLeft:"3px solid "+(done?"rgba(168,255,120,0.5)":isUrgent?"rgba(255,215,0,0.4)":"rgba(255,255,255,0.1)"),
        borderRadius:"7px", transition:"all 0.3s ease",
        opacity: inProgress ? 0.6 : 1,
      }}>
        {/* Checkbox */}
        <div style={{
          width:"18px", height:"18px", borderRadius:"4px", flexShrink:0,
          background: done?"rgba(168,255,120,0.2)":"rgba(255,255,255,0.04)",
          border:"1px solid "+(done?"rgba(168,255,120,0.5)":"rgba(255,255,255,0.15)"),
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:"11px", color:"#A8FF78",
        }}>
          {done ? "✓" : ""}
        </div>

        {/* Label + desc */}
        <div style={{ flex:1, minWidth:0 }}>
          {isUrgent && !done && (
            <div style={{ fontFamily:"monospace",fontSize:"7px",letterSpacing:"0.15em",color:"rgba(255,215,0,0.5)",marginBottom:"2px" }}>
              URGENTE
            </div>
          )}
          <div style={{ display:"flex",alignItems:"center",gap:"5px" }}>
            <span style={{ fontSize:"12px" }}>{task.icon}</span>
            <span style={{ fontSize:"11px",fontFamily:"Georgia,serif",
              color:done?"rgba(168,255,120,0.6)":"rgba(255,255,255,0.6)",
              textDecoration:done?"line-through":"none" }}>
              {task.label}
            </span>
          </div>
          <div style={{ fontSize:"9px",color:"rgba(255,255,255,0.25)",fontFamily:"monospace",marginTop:"1px" }}>
            {task.desc}
          </div>
        </div>

        {/* Action */}
        {done ? (
          <div style={{ fontFamily:"monospace",fontSize:"10px",color:"rgba(168,255,120,0.5)",flexShrink:0 }}>+1pt</div>
        ) : task.discord ? (
          <div style={{ flexShrink:0 }}>
            <button onClick={handleDiscord} disabled={inProgress}
              style={{ padding:"4px 8px",background:"rgba(114,137,218,0.15)",
                border:"1px solid rgba(114,137,218,0.3)",borderRadius:"4px",
                color:"#7289DA",fontSize:"9px",cursor:"pointer",fontFamily:"monospace",
                display:"block",marginBottom:"2px" }}>
              🎮 Ir + copiar
            </button>
            {copied && <div style={{ fontSize:"8px",color:"rgba(168,255,120,0.6)",fontFamily:"monospace",textAlign:"center" }}>✓ copiado</div>}
          </div>
        ) : (
          <button onClick={() => window.__aorNavigate && window.__aorNavigate(task.href)}
            disabled={done || inProgress}
            style={{ padding:"4px 8px",background:"rgba(64,224,255,0.08)",
              border:"1px solid rgba(64,224,255,0.2)",borderRadius:"4px",
              color:"#40E0FF",fontSize:"9px",cursor:"pointer",
              fontFamily:"monospace",flexShrink:0 }}>
            Ir ›
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ width:"100%",maxWidth:"480px",marginBottom:"20px" }}>
      {/* Header */}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px" }}>
        <div>
          <div style={{ fontFamily:"monospace",fontSize:"9px",letterSpacing:"0.2em",color:"rgba(255,215,0,0.5)",marginBottom:"2px" }}>
            MISIONES DIARIAS
          </div>
          <div style={{ fontFamily:"monospace",fontSize:"8px",color:"rgba(255,255,255,0.2)" }}>
            Jornada {jkey} · Renueva a las 8:00am Ecuador
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontFamily:"monospace",fontSize:"11px",fontWeight:"bold",
            color: bonusDone?"#FFD700":"rgba(255,255,255,0.3)" }}>
            {doneCount}/{totalCount}
          </div>
          <div style={{ fontFamily:"monospace",fontSize:"8px",color:"rgba(255,255,255,0.2)" }}>
            {bonusDone?"🏆 +6pts":`máx +${totalCount+3}pts`}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height:"2px",background:"rgba(255,255,255,0.06)",borderRadius:"1px",marginBottom:"10px",overflow:"hidden" }}>
        <div style={{ height:"100%",width:`${totalCount>0?(doneCount/totalCount)*100:0}%`,
          background:bonusDone?"#FFD700":"#40E0FF",borderRadius:"1px",transition:"width 0.4s ease" }}/>
      </div>

      {/* URGENT tasks (above random) */}
      {urgentTasks.length > 0 && (
        <>
          {urgentTasks.map(t => <TaskRow key={t.id} task={t} isUrgent={true}/>)}
          {randomTasks.length > 0 && (
            <div style={{ height:"1px",background:"rgba(255,255,255,0.05)",margin:"6px 0" }}/>
          )}
        </>
      )}

      {/* Random tasks — show first 3 that are applicable from candidates */}
      {randomTasks
        .filter(t => taskStatus[t.id]?.applicable !== false)
        .slice(0, 3)
        .map(t => <TaskRow key={t.id} task={t} isUrgent={false}/>)}

      {/* Bonus indicator */}
      {bonusDone && (
        <div style={{ display:"flex",justifyContent:"center",padding:"8px",
          background:"rgba(255,215,0,0.05)",border:"1px solid rgba(255,215,0,0.15)",
          borderRadius:"7px",marginTop:"4px" }}>
          <span style={{ fontFamily:"monospace",fontSize:"10px",color:"#FFD700" }}>
            🏆 Checklist completo · +3pts bonus · Total: +6pts
          </span>
        </div>
      )}

      {/* Discord hint */}
      {randomTasks.some(t => t.discord && !isDone(t)) && (
        <div style={{ marginTop:"6px",padding:"6px 10px",background:"rgba(114,137,218,0.05)",
          border:"1px solid rgba(114,137,218,0.15)",borderRadius:"6px",
          fontSize:"9px",color:"rgba(114,137,218,0.6)",fontFamily:"monospace" }}>
          💬 Mensaje: "{DISCORD_MSG(playerName||"Guerrero")}"
        </div>
      )}

      {/* Feedback */}
      {msg && (
        <div style={{ textAlign:"center",fontFamily:"monospace",fontSize:"10px",
          color:"#A8FF78",marginTop:"6px",fontWeight:"bold" }}>
          {msg}
        </div>
      )}
    </div>
  );
}

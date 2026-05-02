import PageHeader from "./PageHeader";
import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import NavBar from "./NavBar";
import NalguitasFooter from "./NalguitasFooter";

function getWarWeek() {
  const now = new Date();
  const ec  = new Date(now.getTime() - 5*60*60*1000);
  const day = ec.getDay();
  const daysFromFriday = (day + 2) % 7;
  const friday = new Date(ec);
  friday.setDate(ec.getDate() - daysFromFriday);
  const year = friday.getFullYear();
  const week = Math.ceil(((friday - new Date(year,0,1)) / 86400000 + 1) / 7);
  return `${year}-W${week}`;
}

// Rank weight — exact per role
const RANK_WEIGHTS = {
  "Líder":5,     // PUNK'Z
  "Co-Líder":4,  // NALGUITAS, limonloco, Iberico[E]
  "Oficial":3,   // ODIN, iditxa
  "Veterano":2,
  "Guerrero":1, "Soldado":1, "Recluta":1, "⚠ Vigilado":1,
};
// Availability bonus — additive on top of rank
// Conquistador +3, Refuerzos +2, Reserva +1 (but Reserva adds nothing beyond rank base)
const AVAIL_BONUS = { "siempre":3, "intermitente":2, "solo_una":1 };

function voterWeight(player) {
  const rank  = RANK_WEIGHTS[player.clan_role] || 1;
  const bonus = AVAIL_BONUS[player.availability] || 0;
  return rank + bonus;
  // Examples: Punk'z Conquistador = 5+3 = 8
  //           Nalguitas Refuerzos = 4+2 = 6
  //           Oficial Reserva = 3+1 = 4
  //           Guerrero Conquistador = 1+3 = 4
}

export default function Asamblea() {
  const [players, setPlayers]   = useState([]);
  const [votes, setVotes]       = useState([]);
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [votingEnabled, setVotingEnabled] = useState(true);
  const [warModeLocal, setWarModeLocal]   = useState("classic");

  useEffect(()=>{
    Promise.all([
      supabase.from("app_settings").select("value").eq("key","voting_enabled").single(),
      supabase.from("app_settings").select("value").eq("key","war_mode").single(),
    ]).then(([ve, wm])=>{
      const mode = wm.data?.value || "classic";
      setWarModeLocal(mode);
      // Auto-activate if war has ended and not manually disabled
      const now = new Date();
      const spain = new Date(now.getTime() + 2*60*60*1000); // CEST UTC+2
      const day  = spain.getDay();  // 0=Sun, 6=Sat
      const hour = spain.getHours();
      let warEnded = false;
      if (mode === "new") {
        // New: war ends Saturday 18:00 Spain
        warEnded = (day === 6 && hour >= 18) || day === 0; // Sat 18+ or Sunday
      } else {
        // Classic: war ends Sunday 8:00 Spain
        warEnded = (day === 0 && hour >= 8); // Sunday 8am+
      }
      if (warEnded) {
        setVotingEnabled(true);
        // Auto-enable in DB if it was disabled
        if (ve.data?.value === "false") {
          supabase.from("app_settings").upsert({key:"voting_enabled",value:"true"},{onConflict:"key"}).then(()=>{});
        }
      } else {
        setVotingEnabled(ve.data?.value !== "false");
      }
    });
  },[]);
  const sessionLockedId = sessionStorage.getItem("aor_player_id");
  const sessionLockedName = sessionStorage.getItem("aor_player_name");
  const [playerName, setPlayerName] = useState(sessionLockedName||"");
  const [playerId, setPlayerId] = useState(sessionLockedId||null);
  const [nameInput, setNameInput] = useState(sessionLockedName||"");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedVote, setSelectedVote] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const week = getWarWeek();

  useEffect(()=>{
    Promise.all([
      supabase.from("players").select("*").eq("active",true).order("name"),
      supabase.from("assembly_votes").select("*").eq("week",week),
      supabase.from("assembly_votes").select("*").order("created_at",{ascending:false}).limit(100),
    ]).then(([p,v,h])=>{
      setPlayers(p.data||[]);
      setVotes(v.data||[]);
      setHistory(h.data||[]);
      setLoading(false);
    });
  },[]);

  function handleNameInput(val) {
    setNameInput(val);
    if(val.length<2){setSuggestions([]);return;}
    setSuggestions(players.filter(p=>p.name.toLowerCase().includes(val.toLowerCase())).slice(0,5));
  }
  function selectPlayer(p) {
    setPlayerName(p.name); setPlayerId(String(p.id));
    setNameInput(p.name); setSuggestions([]);
    sessionStorage.setItem("aor_player_id",String(p.id));
    sessionStorage.setItem("aor_player_name",p.name);
  }

  const me = players.find(p=>String(p.id)===String(playerId));
  const myVoteThisWeek = votes.find(v=>String(v.voter_id)===String(playerId));
  const canVote = me && me.registered_form && ["siempre","intermitente","solo_una"].includes(me.availability);

  // Tally votes this week
  const tally = {};
  votes.forEach(v=>{ tally[v.voted_player_name]=(tally[v.voted_player_name]||0)+(v.voter_weight||1); });
  const sorted = Object.entries(tally).sort((a,b)=>b[1]-a[1]);
  const winner = sorted[0]?.[0];
  const winnerPlayer = players.find(p=>p.name===winner);

  // History weeks
  const weekTallies = {};
  history.forEach(v=>{
    if (!weekTallies[v.week]) weekTallies[v.week]={};
    weekTallies[v.week][v.voted_player_name]=(weekTallies[v.week][v.voted_player_name]||0)+(v.voter_weight||1);
  });
  const weekWinners = Object.entries(weekTallies).sort((a,b)=>b[0].localeCompare(a[0])).map(([w,t])=>{
    const s=Object.entries(t).sort((a,b)=>b[1]-a[1]);
    return {week:w, winner:s[0]?.[0], votes:s[0]?.[1], all:s};
  });

  async function submitVote() {
    if (!playerId||!selectedVote) return;
    setSaving(true);
    const weight = voterWeight(me);
    const {error} = await supabase.from("assembly_votes").insert({
      voter_id:parseInt(playerId), voter_name:playerName,
      voted_player_id: parseInt(selectedVote),
      voted_player_name: players.find(p=>String(p.id)===String(selectedVote))?.name,
      week, voter_weight:weight,
    });
    if (error) { setMsg("Error: "+error.message); setSaving(false); return; }

    // +3 pts to voter immediately
    const {data:voterData} = await supabase.from("players").select("pts_acumulados").eq("id",parseInt(playerId)).single();
    await supabase.from("players").update({pts_acumulados:(voterData?.pts_acumulados||0)+3}).eq("id",parseInt(playerId));

    // Refresh votes and recalculate winner (+10 to current leader)
    const {data:newVotes} = await supabase.from("assembly_votes").select("*").eq("week",week);
    setVotes(newVotes||[]);

    // Tally to find current leader
    const tally={};
    (newVotes||[]).forEach(v=>{ tally[v.voted_player_name]=(tally[v.voted_player_name]||0)+(v.voter_weight||1); });
    const sorted=Object.entries(tally).sort((a,b)=>b[1]-a[1]);
    if (sorted.length>0) {
      const winnerName=sorted[0][0];
      const winnerPlayer=players.find(p=>p.name===winnerName);
      if (winnerPlayer && String(winnerPlayer.id)!==String(playerId)) {
        // Only award +10 during weekly close, not on each vote
        // Just update guerrero_implacable_week to track current leader
        await supabase.from("players").update({guerrero_implacable_week:week}).eq("id",winnerPlayer.id);
      }
    }

    setMsg("✓ Voto enviado. +3 puntos acreditados.");
    setSaving(false);
  }

  if (loading) return <div style={{minHeight:"100vh",background:"#0d0d0f",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,215,0,0.6)",fontFamily:"monospace",letterSpacing:"0.2em",fontSize:"11px"}}>ASAMBLEA DE CENTURIAS — CARGANDO</div>;

  return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",fontFamily:"Georgia,serif",color:"#d4c9a8",padding:"20px",paddingBottom:"40px"}}>
      <div style={{maxWidth:"560px",margin:"0 auto"}}>
        <NavBar current="/asamblea"/>
        <PageHeader page="/asamblea"/>
        {/* Current standings — parallel display */}
        {(winner || players.length > 0) && (
          <div style={{marginBottom:"20px"}}>
            <div style={{fontSize:"9px",letterSpacing:"0.3em",color:"rgba(255,215,0,0.4)",fontFamily:"monospace",marginBottom:"12px",textAlign:"center"}}>SEMANA {week}</div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"12px"}}>

              {/* Most voted */}
              <div style={{background:"linear-gradient(135deg,rgba(255,215,0,0.08),rgba(255,215,0,0.02))",border:"1px solid rgba(255,215,0,0.25)",borderRadius:"10px",padding:"14px"}}>
                <div style={{fontSize:"8px",letterSpacing:"0.2em",color:"rgba(255,215,0,0.4)",fontFamily:"monospace",marginBottom:"8px"}}>MAS VOTADO +10 pts</div>
                {winner ? (
                  <>
                    {/* Winner - big */}
                    <div style={{fontFamily:"serif",fontSize:"17px",color:"#FFD700",fontWeight:"bold",marginBottom:"2px",lineHeight:1.2}}>{winner}</div>
                    <div style={{fontSize:"13px",color:"#FFD700",fontFamily:"monospace",fontWeight:"bold",marginBottom:"6px"}}>{sorted[0]?.[1]} votos ponderados</div>
                    {sorted[1] && <div style={{fontSize:"9px",color:"rgba(255,107,107,0.5)",marginBottom:"8px",fontFamily:"monospace"}}>+{(sorted[0][1]-sorted[1][1])} sobre el 2°</div>}
                    {/* 2 runners up - smaller */}
                    {sorted.slice(1,3).map(([name,vts],i)=>(
                      <div key={name} style={{display:"flex",justifyContent:"space-between",fontSize:"10px",padding:"3px 0",borderTop:"1px solid rgba(255,255,255,0.04)"}}>
                        <span style={{color:"rgba(255,255,255,0.35)",fontFamily:"Georgia,serif"}}>{i+2}° {name}</span>
                        <span style={{color:"rgba(255,255,255,0.25)",fontFamily:"monospace"}}>{vts} votos</span>
                      </div>
                    ))}
                    <div style={{fontSize:"8px",color:"rgba(255,215,0,0.3)",fontFamily:"monospace",marginTop:"6px"}}>{votes.length} votos emitidos</div>
                  </>
                ) : (
                  <div style={{fontSize:"11px",color:"rgba(255,255,255,0.25)"}}>Sin votos aún</div>
                )}
              </div>

              {/* Highest points */}
              {(() => {
                const eligible = ["siempre","intermitente","solo_una"];
                const ranked = [...players].filter(p=>p.active && eligible.includes(p.availability)).sort((a,b)=>{
                  const pa = (a.pt_registro||0)+(a.pt_disponibilidad_declarada||0)+(a.pt_disponibilidad||0)+(a.pt_obediencia||0)+(a.pt_batallas_ganadas||0)*2+(a.pt_batallas_perdidas||0)+(a.pt_defensas||0)+(a.pt_bonus||0)+(a.pt_bandido_post||0)+((a.pt_batallas_ganadas||0)>=6?10:0)-(a.pt_penalizacion||0)-(a.pt_no_aparecio||0)-(a.pt_ignoro_orden||0)*2-(a.pt_abandono||0)*2-(a.pt_inactivo_4h||0)*3-(a.pt_bandido_pre||0);
                  const pb = (b.pt_registro||0)+(b.pt_disponibilidad_declarada||0)+(b.pt_disponibilidad||0)+(b.pt_obediencia||0)+(b.pt_batallas_ganadas||0)*2+(b.pt_batallas_perdidas||0)+(b.pt_defensas||0)+(b.pt_bonus||0)+(b.pt_bandido_post||0)+((b.pt_batallas_ganadas||0)>=6?10:0)-(b.pt_penalizacion||0)-(b.pt_no_aparecio||0)-(b.pt_ignoro_orden||0)*2-(b.pt_abandono||0)*2-(b.pt_inactivo_4h||0)*3-(b.pt_bandido_pre||0);
                  return pb-pa;
                });
                const top = ranked[0];
                if (!top) return null;
                const tp = p=>(p.pt_registro||0)+(p.pt_disponibilidad_declarada||0)+(p.pt_disponibilidad||0)+(p.pt_obediencia||0)+(p.pt_batallas_ganadas||0)*2+(p.pt_batallas_perdidas||0)+(p.pt_defensas||0)+(p.pt_bonus||0)+(p.pt_bandido_post||0)+((p.pt_batallas_ganadas||0)>=6?10:0)-(p.pt_penalizacion||0)-(p.pt_no_aparecio||0)-(p.pt_ignoro_orden||0)*2-(p.pt_abandono||0)*2-(p.pt_inactivo_4h||0)*3-(p.pt_bandido_pre||0);
                const topPts = tp(top);
                const breakdown = [
                  {l:"Registro",v:top.pt_registro||0},
                  {l:"Apareció",v:top.pt_disponibilidad||0},
                  {l:"Órdenes",v:(top.pt_obediencia||0)*2},
                  {l:"Batallas ganadas",v:(top.pt_batallas_ganadas||0)*2},
                  {l:"Bonus 6+ bat.",v:(top.pt_batallas_ganadas||0)>=6?10:0},
                  {l:"Batallas perdidas",v:top.pt_batallas_perdidas||0},
                  {l:"Defensas",v:top.pt_defensas||0},
                  {l:"Bonus completo",v:(top.pt_bonus||0)*5},
                  {l:"Bandido post",v:top.pt_bandido_post||0},
                  {l:"Penalizaciones",v:-((top.pt_penalizacion||0)+(top.pt_no_aparecio||0)+(top.pt_ignoro_orden||0)*2+(top.pt_abandono||0)*2+(top.pt_inactivo_4h||0)*3+(top.pt_bandido_pre||0))},
                ].filter(x=>x.v!==0);
                // Pichichi: only if UNIQUE top scorer (no tie) and same as most voted
const topPts2 = ranked[1]?tp(ranked[1]):0;
const isUniqueTop = topPts > topPts2;
const isDouble = isUniqueTop && winner===top.name;
                return (
                  <div style={{background:isDouble?"linear-gradient(135deg,rgba(168,255,120,0.1),rgba(255,215,0,0.05))":"linear-gradient(135deg,rgba(168,255,120,0.06),rgba(168,255,120,0.01))",border:"1px solid "+(isDouble?"rgba(168,255,120,0.4)":"rgba(168,255,120,0.2)"),borderRadius:"10px",padding:"14px",position:"relative"}}>
                    {isDouble && <div style={{position:"absolute",top:"8px",right:"8px",fontSize:"8px",color:"#A8FF78",background:"rgba(168,255,120,0.15)",border:"1px solid rgba(168,255,120,0.3)",borderRadius:"4px",padding:"2px 6px",fontFamily:"monospace"}}>+10 EXTRA = 30 TOTAL</div>}
                    <div style={{fontSize:"8px",letterSpacing:"0.2em",color:"rgba(168,255,120,0.5)",fontFamily:"monospace",marginBottom:"8px"}}>
                    {isUniqueTop?"MAYOR PUNTAJE +10 pts":"EMPATE EN PUNTAJE"}
                  </div>
                  {!isUniqueTop && (() => {
                    const tied = ranked.filter(p=>tp(p)===topPts);
                    return (
                      <div style={{marginBottom:"8px"}}>
                        <div style={{fontSize:"9px",color:"#A8FF78",fontFamily:"monospace",marginBottom:"6px"}}>EMPATE — CADA JUGADOR RECIBE +3 PUNTOS:</div>
                        {tied.map(p=>(
                          <div key={p.id} style={{padding:"4px 0",borderBottom:"1px solid rgba(168,255,120,0.08)"}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                              <span style={{fontFamily:"Georgia,serif",fontSize:"11px",color:"#A8FF78",fontWeight:"bold"}}>{p.name}</span>
                              <span style={{fontFamily:"monospace",fontSize:"11px",color:"#A8FF78"}}>+3 pts</span>
                            </div>
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:"9px",color:"rgba(168,255,120,0.5)"}}>
                              <span>{topPts>0?"+":""}{topPts} pts jornada</span>
                              <span>{(p.pts_acumulados||0).toLocaleString()} pts acum.</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  {isUniqueTop && <div style={{fontFamily:"serif",fontSize:"15px",color:"#A8FF78",fontWeight:"bold",marginBottom:"2px",lineHeight:1.2}}>{top.name}</div>}
                  {isUniqueTop && (
                  <div>
                    <div style={{fontSize:"16px",color:"#A8FF78",fontWeight:"bold",fontFamily:"monospace",marginBottom:"2px"}}>{topPts>0?"+":""}{topPts} pts jornada</div>
                    <div style={{fontSize:"9px",color:"rgba(168,255,120,0.5)",fontFamily:"monospace",marginBottom:"6px"}}>{(top.pts_acumulados||0).toLocaleString()} pts acumulados</div>
                  </div>
                )}
                  {isUniqueTop && breakdown.map(x=>(
                      <div key={x.l} style={{display:"flex",justifyContent:"space-between",fontSize:"9px",padding:"2px 0",borderTop:"1px solid rgba(255,255,255,0.04)"}}>
                        <span style={{color:"rgba(255,255,255,0.35)"}}>{x.l}</span>
                        <span style={{color:x.v>=0?"rgba(168,255,120,0.6)":"rgba(255,107,107,0.6)",fontFamily:"monospace"}}>{x.v>0?"+":""}{x.v}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Voting */}
        <div style={{background:"rgba(255,215,0,0.04)",border:"1px solid rgba(255,215,0,0.15)",borderRadius:"10px",padding:"16px",marginBottom:"16px"}}>
          <div style={{fontSize:"10px",letterSpacing:"0.2em",color:"rgba(255,215,0,0.5)",fontFamily:"monospace",marginBottom:"6px"}}>VOTAR — {week}</div>
          <div style={{marginBottom:"14px"}}>
            {/* Voting status indicator */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px",padding:"6px 10px",background:votingEnabled?"rgba(168,255,120,0.05)":"rgba(255,107,107,0.05)",borderRadius:"6px",border:"1px solid "+(votingEnabled?"rgba(168,255,120,0.2)":"rgba(255,107,107,0.2)")}}>
              <div>
                <div style={{fontFamily:"monospace",fontSize:"9px",letterSpacing:"0.1em",color:votingEnabled?"#A8FF78":"#FF6B6B",fontWeight:"bold"}}>{votingEnabled?"VOTACIONES ABIERTAS":"VOTACIONES CERRADAS"}</div>
                <div style={{fontSize:"8px",color:"rgba(255,255,255,0.25)",marginTop:"1px",fontFamily:"monospace"}}>{warModeLocal==="new"?"Auto-abren sáb 18:00h España":"Auto-abren dom 8:00h España"}</div>
              </div>
              <div style={{width:"8px",height:"8px",borderRadius:"50%",background:votingEnabled?"#A8FF78":"#FF6B6B"}}/>
            </div>
            <div style={{fontFamily:"monospace",fontSize:"9px",color:"rgba(255,255,255,0.3)",letterSpacing:"0.1em",marginBottom:"8px"}}>MECÁNICA DE VOTACIÓN</div>

            {/* Rank weights */}
            <div style={{marginBottom:"8px"}}>
              <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,255,255,0.25)",letterSpacing:"0.1em",marginBottom:"5px"}}>PESO POR RANGO</div>
              {[
                {label:"Líder — PUNK'Z",rank:5,color:"#FFD700"},
                {label:"Co-Líder — NALGUITAS · limonloco · Iberico[E]",rank:4,color:"#FFD700"},
                {label:"Oficial — ODIN · iditxa",rank:3,color:"#40E0FF"},
                {label:"Veterano",rank:2,color:"#A8FF78"},
                {label:"Guerrero · Soldado · Recluta",rank:1,color:"rgba(255,255,255,0.4)"},
              ].map(r=>(
                <div key={r.label} style={{display:"flex",justifyContent:"space-between",padding:"4px 8px",marginBottom:"2px",background:"rgba(255,255,255,0.02)",borderRadius:"4px",border:"1px solid rgba(255,255,255,0.05)"}}>
                  <span style={{fontSize:"9px",color:r.color,fontFamily:"Georgia,serif"}}>{r.label}</span>
                  <span style={{fontSize:"10px",color:r.color,fontFamily:"monospace",fontWeight:"bold"}}>{r.rank}</span>
                </div>
              ))}
            </div>

            {/* Availability bonus */}
            <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,255,255,0.25)",letterSpacing:"0.1em",marginBottom:"5px"}}>+ BONUS POR DISPONIBILIDAD (SUMADO AL RANGO)</div>
            <div style={{display:"flex",gap:"4px",marginBottom:"10px"}}>
              {[{a:"Conquistador",b:3,c:"#A8FF78"},{a:"Refuerzos",b:2,c:"#FFD700"},{a:"Reserva",b:1,c:"#FF9F43"}].map(x=>(
                <div key={x.a} style={{flex:1,padding:"5px 4px",background:x.c+"08",border:"1px solid "+x.c+"22",borderRadius:"5px",textAlign:"center"}}>
                  <div style={{fontSize:"9px",color:x.c,fontFamily:"Georgia,serif",marginBottom:"2px"}}>{x.a}</div>
                  <div style={{fontSize:"13px",color:x.c,fontFamily:"monospace",fontWeight:"bold"}}>+{x.b}</div>
                </div>
              ))}
            </div>

            {/* Rewards */}
            <div style={{background:"rgba(255,215,0,0.04)",borderRadius:"6px",padding:"8px 10px",borderLeft:"2px solid rgba(255,215,0,0.3)"}}>
              <div style={{fontSize:"9px",color:"rgba(255,215,0,0.5)",fontFamily:"monospace",letterSpacing:"0.1em",marginBottom:"4px"}}>RECOMPENSAS</div>
              {[
                {t:"Por votar",v:"+3 pts",c:"#A8FF78"},
                {t:"Más votado (único ganador)",v:"+10 pts",c:"#FFD700"},
                {t:"Mayor puntaje de la jornada (único)",v:"+10 pts",c:"#40E0FF"},
                {t:"Ambos en el mismo jugador (Pichichi)",v:"+10 pts extra = 30 total",c:"#A8FF78"},
                {t:"Empate en puntaje",v:"+3 pts c/u",c:"rgba(255,255,255,0.4)"},
              ].map(x=>(
                <div key={x.t} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
                  <span style={{fontSize:"9px",color:"rgba(255,255,255,0.45)",fontFamily:"Georgia,serif"}}>{x.t}</span>
                  <span style={{fontSize:"10px",color:x.c,fontFamily:"monospace",fontWeight:"bold"}}>{x.v}</span>
                </div>
              ))}
            </div>
          </div>

          {!playerId ? (
            <div style={{position:"relative"}}>
              <div style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",marginBottom:"4px",letterSpacing:"0.1em",fontFamily:"monospace"}}>IDENTIFÍCATE</div>
              <input value={nameInput} onChange={e=>handleNameInput(e.target.value)} placeholder="Tu nombre en el juego..."
                style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"6px",color:"#fff",padding:"8px 10px",fontSize:"12px",outline:"none",boxSizing:"border-box"}}/>
              {suggestions.length>0&&(
                <div style={{background:"#1a1a22",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"6px",marginTop:"4px",position:"absolute",width:"100%",zIndex:10}}>
                  {suggestions.map(p=>(<div key={p.id} onClick={()=>selectPlayer(p)} style={{padding:"8px 12px",cursor:"pointer",fontSize:"12px",color:"#d4c9a8",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>{p.name}</div>))}
                </div>
              )}
            </div>
          ) : myVoteThisWeek ? (
            <div style={{padding:"12px",background:"rgba(168,255,120,0.04)",border:"1px solid rgba(168,255,120,0.15)",borderRadius:"8px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:"11px",color:"#A8FF78",fontWeight:"bold"}}>✓ Votaste por: {myVoteThisWeek.voted_player_name}</div>
                  <div style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",marginTop:"2px",fontFamily:"monospace"}}>Peso del voto: {myVoteThisWeek.voter_weight} pts</div>
                </div>
                <button onClick={async()=>{
                  if(!confirm("¿Eliminar tu voto? Perderás los 3 pts acreditados.")) return;
                  await supabase.from("assembly_votes").delete().eq("id",myVoteThisWeek.id);
                  const {data:p} = await supabase.from("players").select("pts_acumulados").eq("id",parseInt(playerId)).single();
                  await supabase.from("players").update({pts_acumulados:Math.max(0,(p?.pts_acumulados||0)-3)}).eq("id",parseInt(playerId));
                  const {data:v} = await supabase.from("assembly_votes").select("*").eq("week",week);
                  setVotes(v||[]);
                }} style={{padding:"4px 8px",background:"rgba(255,107,107,0.08)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:"4px",color:"rgba(255,107,107,0.6)",fontSize:"9px",cursor:"pointer",fontFamily:"monospace"}}>
                  Eliminar voto
                </button>
              </div>
            </div>
          ) : !canVote ? (
            <div style={{textAlign:"center",padding:"12px",background:"rgba(255,107,107,0.05)",border:"1px solid rgba(255,107,107,0.15)",borderRadius:"8px"}}>
              <div style={{fontSize:"11px",color:"#FF6B6B"}}>Solo pueden votar jugadores registrados en Conquistador, Refuerzos o Reserva.</div>
              {!sessionLockedId && <button onClick={()=>{setPlayerId(null);setPlayerName("");setNameInput("");}} style={{marginTop:"8px",padding:"4px 12px",background:"transparent",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"4px",color:"rgba(255,255,255,0.3)",fontSize:"10px",cursor:"pointer"}}>Cambiar jugador</button>}
            </div>
          ) : (
            <div>
              <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"8px",padding:"6px 8px",background:"rgba(255,215,0,0.04)",borderRadius:"5px"}}>
                {playerName} — tu voto vale <strong style={{color:"#FFD700"}}>{voterWeight(me)}</strong> punto{voterWeight(me)>1?"s":""}{" "}
                <span style={{fontSize:"9px",color:"rgba(255,255,255,0.25)"}}>(rango {RANK_WEIGHTS[me?.clan_role]||1} + disponibilidad {AVAIL_BONUS[me?.availability]||0})</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px",marginBottom:"10px",maxHeight:"200px",overflow:"auto"}}>
                {players.filter(p=>String(p.id)!==String(playerId) && ["siempre","intermitente","solo_una"].includes(p.availability)).map(p=>(
                  <button key={p.id} onClick={()=>setSelectedVote(String(p.id))}
                    style={{padding:"8px 10px",borderRadius:"6px",fontSize:"12px",cursor:"pointer",textAlign:"left",
                      background:selectedVote===String(p.id)?"rgba(255,215,0,0.15)":"rgba(255,255,255,0.02)",
                      border:"1px solid "+(selectedVote===String(p.id)?"rgba(255,215,0,0.4)":"rgba(255,255,255,0.07)"),
                      color:selectedVote===String(p.id)?"#FFD700":"rgba(255,255,255,0.6)"}}>
                    {p.name}
                  </button>
                ))}
              </div>
              {msg&&<div style={{fontSize:"11px",color:msg.startsWith("✓")?"#A8FF78":"#FF6B6B",marginBottom:"8px"}}>{msg}</div>}
              <button onClick={submitVote} disabled={!selectedVote||saving} style={{width:"100%",padding:"9px",background:selectedVote?"rgba(255,215,0,0.12)":"rgba(255,255,255,0.03)",border:"1px solid "+(selectedVote?"rgba(255,215,0,0.3)":"rgba(255,255,255,0.07)"),borderRadius:"6px",color:selectedVote?"#FFD700":"rgba(255,255,255,0.25)",fontSize:"12px",cursor:selectedVote?"pointer":"default",fontWeight:"bold"}}>
                {saving?"Enviando...":"Votar (+3 puntos)"}
              </button>
              <button onClick={()=>{setPlayerId(null);setPlayerName("");setNameInput("");}} style={{width:"100%",padding:"6px",marginTop:"6px",background:"transparent",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"6px",color:"rgba(255,255,255,0.25)",fontSize:"10px",cursor:"pointer"}}>Cambiar jugador</button>
            </div>
          )}
        </div>

        {/* Historical winners */}
        {weekWinners.length > 0 && (
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",padding:"14px"}}>
            <div style={{fontSize:"10px",letterSpacing:"0.2em",color:"rgba(255,215,0,0.4)",fontFamily:"monospace",marginBottom:"10px"}}>GUERREROS IMPLACABLES — HISTORIAL</div>
            {weekWinners.slice(0,8).map((w,i)=>(
              <div key={w.week} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 8px",marginBottom:"4px",background:i===0?"rgba(255,215,0,0.06)":"rgba(255,255,255,0.01)",borderRadius:"6px",border:"1px solid "+(i===0?"rgba(255,215,0,0.2)":"rgba(255,255,255,0.04)")}}>
                <div>
                  <div style={{fontSize:"12px",color:i===0?"#FFD700":"rgba(255,255,255,0.6)",fontWeight:i===0?"bold":"normal"}}>{w.winner}</div>
                  <div style={{fontSize:"9px",color:"rgba(255,255,255,0.25)",fontFamily:"monospace"}}>{w.week}</div>
                </div>
                <div style={{fontSize:"11px",color:"rgba(255,215,0,0.5)",fontFamily:"monospace"}}>{w.votes} pts</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <NalguitasFooter/>
    </div>
  );
}

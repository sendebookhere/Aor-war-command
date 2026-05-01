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

const RANK_WEIGHTS = {
  "Líder":3, "Co-Líder":3, "Oficial":2, "Veterano":2,
  "Guerrero":1, "Soldado":1, "Recluta":1, "⚠ Vigilado":1,
};
const LEADER_WEIGHTS = {"PUNK'Z":5, "NALGUITAS":4, "limonloco":4, "Iberico[E]":4};

function voterWeight(player) {
  if (LEADER_WEIGHTS[player.name]) return LEADER_WEIGHTS[player.name];
  return RANK_WEIGHTS[player.clan_role] || 1;
}

export default function Asamblea() {
  const [players, setPlayers]   = useState([]);
  const [votes, setVotes]       = useState([]);
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [playerName, setPlayerName] = useState(sessionStorage.getItem("aor_player_name")||"");
  const [playerId, setPlayerId] = useState(sessionStorage.getItem("aor_player_id")||null);
  const [nameInput, setNameInput] = useState(sessionStorage.getItem("aor_player_name")||"");
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
  const canVote = me && me.registered_week===week && ["siempre","intermitente","solo_una"].includes(me.availability);

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
    // +3 pts to voter
    await supabase.from("players").update({pts_acumulados:(me?.pts_acumulados||0)+3}).eq("id",parseInt(playerId));
    // Refresh votes
    const {data} = await supabase.from("assembly_votes").select("*").eq("week",week);
    setVotes(data||[]);
    setMsg("✓ Voto enviado. +3 puntos acreditados.");
    setSaving(false);
  }

  if (loading) return <div style={{minHeight:"100vh",background:"#0d0d0f",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,215,0,0.6)",fontFamily:"monospace",letterSpacing:"0.2em",fontSize:"11px"}}>ASAMBLEA DE CENTURIAS — CARGANDO</div>;

  return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",fontFamily:"Georgia,serif",color:"#d4c9a8",padding:"20px",paddingBottom:"40px"}}>
      <div style={{maxWidth:"560px",margin:"0 auto"}}>
        <NavBar current="/asamblea"/>

        <PageHeader page="/asamblea"/>

        {/* Current winner */}
        {winner && (
          <div style={{background:"linear-gradient(135deg,rgba(255,215,0,0.1),rgba(255,215,0,0.03))",border:"1px solid rgba(255,215,0,0.3)",borderRadius:"12px",padding:"20px",marginBottom:"20px",textAlign:"center"}}>
            <div style={{fontSize:"9px",letterSpacing:"0.3em",color:"rgba(255,215,0,0.4)",fontFamily:"monospace",marginBottom:"8px"}}>GUERRERO IMPLACABLE — {week}</div>
            <div style={{fontFamily:"serif",fontSize:"26px",color:"#FFD700",fontWeight:"bold",marginBottom:"4px"}}>{winner}</div>
            <div style={{fontSize:"12px",color:"rgba(255,255,255,0.4)"}}>{sorted[0]?.[1]} puntos de votación · {votes.length} votos emitidos</div>
            <div style={{marginTop:"12px"}}>
              {sorted.slice(0,5).map(([name,pts],i)=>(
                <div key={name} style={{display:"flex",justifyContent:"space-between",padding:"4px 8px",marginBottom:"2px",background:"rgba(255,255,255,0.02)",borderRadius:"4px"}}>
                  <span style={{fontSize:"12px",color:i===0?"#FFD700":"rgba(255,255,255,0.5)"}}>{i+1}. {name}</span>
                  <span style={{fontSize:"12px",color:i===0?"#FFD700":"rgba(255,255,255,0.3)",fontFamily:"monospace"}}>{pts} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Voting */}
        <div style={{background:"rgba(255,215,0,0.04)",border:"1px solid rgba(255,215,0,0.15)",borderRadius:"10px",padding:"16px",marginBottom:"16px"}}>
          <div style={{fontSize:"10px",letterSpacing:"0.2em",color:"rgba(255,215,0,0.5)",fontFamily:"monospace",marginBottom:"6px"}}>VOTAR — {week}</div>
          <div style={{fontSize:"11px",color:"rgba(255,255,255,0.45)",marginBottom:"12px"}}>
            Vota por el jugador más determinante de la semana. <strong style={{color:"#FFD700"}}>+3 puntos</strong> al votar. El ganador recibe <strong style={{color:"#FFD700"}}>+10 puntos</strong>. Pesos según rango: Líder=5pts, Co-Líder/Oficial=4pts, Veterano/Guerrero/Soldado=2-1pt.
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
            <div style={{textAlign:"center",padding:"12px",background:"rgba(168,255,120,0.06)",border:"1px solid rgba(168,255,120,0.2)",borderRadius:"8px"}}>
              <div style={{fontSize:"12px",color:"#A8FF78",fontWeight:"bold"}}>✓ Ya votaste esta semana</div>
              <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginTop:"4px"}}>Tu voto fue para: <strong>{myVoteThisWeek.voted_player_name}</strong></div>
            </div>
          ) : !canVote ? (
            <div style={{textAlign:"center",padding:"12px",background:"rgba(255,107,107,0.05)",border:"1px solid rgba(255,107,107,0.15)",borderRadius:"8px"}}>
              <div style={{fontSize:"11px",color:"#FF6B6B"}}>Solo pueden votar jugadores registrados en Conquistador, Refuerzos o Reserva.</div>
              <button onClick={()=>{setPlayerId(null);setPlayerName("");setNameInput("");}} style={{marginTop:"8px",padding:"4px 12px",background:"transparent",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"4px",color:"rgba(255,255,255,0.3)",fontSize:"10px",cursor:"pointer"}}>Cambiar jugador</button>
            </div>
          ) : (
            <div>
              <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"8px"}}>Hola, <strong style={{color:"#FFD700"}}>{playerName}</strong>. Tu voto vale <strong style={{color:"#FFD700"}}>{voterWeight(me)} puntos</strong>.</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px",marginBottom:"10px",maxHeight:"200px",overflow:"auto"}}>
                {players.filter(p=>String(p.id)!==String(playerId) && p.registered_week===week).map(p=>(
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

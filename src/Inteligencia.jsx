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

export default function Inteligencia() {
  const [intel, setIntel]       = useState(null);
  const [players, setPlayers]   = useState([]);
  const [myVotes, setMyVotes]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [playerName, setPlayerName] = useState(sessionStorage.getItem("aor_player_name")||"");
  const [playerId, setPlayerId] = useState(sessionStorage.getItem("aor_player_id")||null);
  const [nameInput, setNameInput] = useState(sessionStorage.getItem("aor_player_name")||"");
  const [suggestions, setSuggestions] = useState([]);
  const week = getWarWeek();

  // Votes: 3 votes of weight 3, 2, 1 assigned to different clans
  const [votes, setVotes] = useState({3:null, 2:null, 1:null}); // {weight: clan_name}
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(()=>{
    Promise.all([
      supabase.from("war_intel").select("*").order("created_at",{ascending:false}).limit(5),
      supabase.from("players").select("id,name,active,availability,registered_week,clan_role").eq("active",true).order("name"),
    ]).then(([i, p])=>{
      if (i.data?.length) setIntel(i.data[0]);
      setPlayers(p.data||[]);
      setLoading(false);
    });
    if (playerId) {
      supabase.from("difficulty_votes").select("*").eq("player_id",parseInt(playerId)).eq("week",week).single()
        .then(({data})=>{ if(data) setMyVotes(data); });
    }
  },[]);

  function handleNameInput(val) {
    setNameInput(val);
    if(val.length<2){setSuggestions([]);return;}
    setSuggestions(players.filter(p=>p.name.toLowerCase().includes(val.toLowerCase())).slice(0,5));
  }
  function selectPlayer(p) {
    setPlayerName(p.name); setPlayerId(String(p.id));
    setNameInput(p.name); setSuggestions([]);
    sessionStorage.setItem("aor_player_id", String(p.id));
    sessionStorage.setItem("aor_player_name", p.name);
    // Load their votes
    supabase.from("difficulty_votes").select("*").eq("player_id",p.id).eq("week",week).single()
      .then(({data})=>{ if(data) setMyVotes(data); });
  }

  // Can vote: must be registered this week in any option except not registered/no participation
  const me = players.find(p=>String(p.id)===String(playerId));
  const canVote = me && me.registered_week === week && ["siempre","intermitente","solo_una"].includes(me.availability);

  const rivalClans = intel?.rival_clans ? (typeof intel.rival_clans === 'string' ? JSON.parse(intel.rival_clans) : intel.rival_clans) : [];

  async function submitVotes() {
    if (!playerId) return;
    if (!votes[3]||!votes[2]||!votes[1]) { setMsg("Asigna los tres votos"); return; }
    if (votes[3]===votes[2]||votes[3]===votes[1]||votes[2]===votes[1]) { setMsg("Cada voto debe ir a un clan diferente"); return; }
    setSaving(true);
    const {error} = await supabase.from("difficulty_votes").insert({
      player_id: parseInt(playerId), player_name: playerName,
      week, votes: JSON.stringify(votes),
    });
    if (error) { setMsg("Error: "+error.message); setSaving(false); return; }
    // Give 3 points to voter
    await supabase.from("players").update({pts_acumulados: (me?.pts_acumulados||0)+3}).eq("id",parseInt(playerId));
    setMyVotes({votes:JSON.stringify(votes)});
    setMsg("✓ Votos registrados. +3 puntos acreditados.");
    setSaving(false);
  }

  if (loading) return <div style={{minHeight:"100vh",background:"#0d0d0f",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,107,107,0.6)",fontFamily:"monospace",letterSpacing:"0.2em",fontSize:"11px"}}>INTELIGENCIA MILITAR — CARGANDO</div>;

  return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",fontFamily:"Georgia,serif",color:"#d4c9a8",padding:"20px",paddingBottom:"40px"}}>
      <div style={{maxWidth:"560px",margin:"0 auto"}}>
        <NavBar current="/inteligencia"/>
        <PageHeader page="/inteligencia"/>
        {/* War results */}
        {intel ? (
          <div style={{background:"rgba(255,107,107,0.05)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:"10px",padding:"16px",marginBottom:"16px"}}>
            <div style={{fontSize:"10px",letterSpacing:"0.2em",color:"rgba(255,107,107,0.5)",fontFamily:"monospace",marginBottom:"10px"}}>ULTIMA GUERRA REGISTRADA — {intel.week}</div>
            <div style={{display:"flex",gap:"16px",marginBottom:"12px"}}>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"28px",color:"#FFD700",fontWeight:"bold"}}>{intel.clan_position||"?"}</div>
                <div style={{fontSize:"9px",color:"rgba(255,255,255,0.35)",fontFamily:"monospace"}}>POSICION</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"28px",color:"#40E0FF",fontWeight:"bold"}}>{(intel.clan_points||0).toLocaleString()}</div>
                <div style={{fontSize:"9px",color:"rgba(255,255,255,0.35)",fontFamily:"monospace"}}>PUNTOS DEL CLAN</div>
              </div>
            </div>
            {rivalClans.length > 0 && (
              <>
                <div style={{fontSize:"10px",letterSpacing:"0.15em",color:"rgba(255,255,255,0.3)",fontFamily:"monospace",marginBottom:"8px"}}>CLANES RIVALES</div>
                {rivalClans.map((clan,i)=>(
                  <div key={i} style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"6px",padding:"10px 12px",marginBottom:"6px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:clan.note?"6px":"0"}}>
                      <div style={{fontSize:"13px",color:"#FF6B6B",fontWeight:"bold"}}>{clan.name}</div>
                      {clan.points&&<div style={{fontSize:"11px",color:"rgba(255,255,255,0.4)",fontFamily:"monospace"}}>{clan.points} pts</div>}
                    </div>
                    {clan.note&&<div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",fontStyle:"italic"}}>{clan.note}</div>}
                    {clan.players?.length>0&&clan.players.map((pl,j)=>(
                      <div key={j} style={{display:"flex",justifyContent:"space-between",background:"rgba(255,107,107,0.05)",borderRadius:"4px",padding:"5px 8px",marginTop:"4px",fontSize:"11px"}}>
                        <div>
                          <span style={{color:"#FF9F43",fontWeight:"bold"}}>{pl.name}</span>
                          {pl.note&&<span style={{color:"rgba(255,255,255,0.35)",marginLeft:"8px",fontSize:"10px"}}>{pl.note}</span>}
                        </div>
                        <div style={{color:"rgba(255,255,255,0.35)",fontSize:"10px",textAlign:"right"}}>
                          {pl.bp&&<div>BP: {Number(pl.bp).toLocaleString()}</div>}
                          {pl.level&&<div>Poder: {Number(pl.level).toLocaleString()}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>
        ) : (
          <div style={{textAlign:"center",padding:"24px",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"10px",marginBottom:"16px"}}>
            <div style={{fontSize:"11px",color:"rgba(255,255,255,0.3)"}}>Sin datos de guerra registrados aún.</div>
            <div style={{fontSize:"10px",color:"rgba(255,255,255,0.2)",marginTop:"4px"}}>El comando los ingresará después de cada guerra.</div>
          </div>
        )}

        {/* Identification + Voting */}
        <div style={{background:"rgba(255,215,0,0.03)",border:"1px solid rgba(255,215,0,0.12)",borderRadius:"10px",padding:"16px",marginBottom:"16px"}}>
          <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.25em",color:"rgba(255,215,0,0.4)",marginBottom:"12px"}}>VOTACION DE DIFICULTAD — {week}</div>

          {/* Identity row */}
          {!playerId ? (
            <div style={{position:"relative",marginBottom:"12px"}}>
              <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.15em",color:"rgba(255,255,255,0.25)",marginBottom:"4px"}}>IDENTIFICATE</div>
              <input value={nameInput} onChange={e=>handleNameInput(e.target.value)} placeholder="Tu nombre en el juego..."
                style={{width:"100%",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"6px",color:"#d4c9a8",padding:"8px 10px",fontSize:"12px",outline:"none",boxSizing:"border-box",fontFamily:"Georgia,serif"}}/>
              {suggestions.length>0&&(
                <div style={{background:"#0f0f14",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"6px",marginTop:"2px",position:"absolute",width:"100%",zIndex:10}}>
                  {suggestions.map(p=>(<div key={p.id} onClick={()=>selectPlayer(p)} style={{padding:"8px 12px",cursor:"pointer",fontSize:"12px",color:"#d4c9a8",borderBottom:"1px solid rgba(255,255,255,0.04)",fontFamily:"Georgia,serif"}}>{p.name}</div>))}
                </div>
              )}
            </div>
          ) : (
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px",padding:"6px 10px",background:"rgba(255,255,255,0.02)",borderRadius:"6px",border:"1px solid rgba(255,255,255,0.06)"}}>
              <span style={{fontFamily:"Georgia,serif",fontSize:"12px",color:"#FFD700"}}>{playerName}</span>
              <button onClick={()=>{setPlayerId(null);setPlayerName("");setNameInput("");}} style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",background:"transparent",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"4px",padding:"2px 7px",cursor:"pointer",fontFamily:"monospace"}}>CAMBIAR</button>
            </div>
          )}

          {playerId && (myVotes ? (
            <div style={{textAlign:"center",padding:"10px",background:"rgba(168,255,120,0.04)",border:"1px solid rgba(168,255,120,0.15)",borderRadius:"6px"}}>
              <div style={{fontFamily:"monospace",fontSize:"10px",color:"#A8FF78",letterSpacing:"0.1em"}}>VOTO REGISTRADO ESTA SEMANA</div>
            </div>
          ) : !canVote ? (
            <div style={{padding:"10px",background:"rgba(255,107,107,0.04)",border:"1px solid rgba(255,107,107,0.12)",borderRadius:"6px"}}>
              <div style={{fontFamily:"monospace",fontSize:"9px",color:"rgba(255,107,107,0.7)",letterSpacing:"0.1em"}}>SOLO PUEDEN VOTAR: CONQUISTADOR · REFUERZOS · RESERVA</div>
            </div>
          ) : rivalClans.length === 0 ? (
            <div style={{fontFamily:"monospace",fontSize:"9px",color:"rgba(255,255,255,0.25)",textAlign:"center",padding:"12px",letterSpacing:"0.1em"}}>SIN CLANES REGISTRADOS PARA VOTAR</div>
          ) : rivalClans.length === 1 ? (
            /* Single clan: vote if you want to face them again */
            <div>
              <div style={{fontFamily:"monospace",fontSize:"9px",color:"rgba(255,255,255,0.35)",letterSpacing:"0.12em",marginBottom:"10px"}}>UN SOLO RIVAL — ¿QUERRÍAS VOLVER A ENFRENTARLOS?</div>
              <div style={{display:"flex",gap:"8px",marginBottom:"12px"}}>
                {["Si, son un reto","No, prefiero evitarlos"].map(opt=>(
                  <button key={opt} onClick={()=>setVotes({3:opt,2:null,1:null})}
                    style={{flex:1,padding:"8px",borderRadius:"6px",cursor:"pointer",fontFamily:"Georgia,serif",fontSize:"11px",
                      background:votes[3]===opt?"rgba(255,107,107,0.12)":"rgba(255,255,255,0.02)",
                      border:"1px solid "+(votes[3]===opt?"rgba(255,107,107,0.35)":"rgba(255,255,255,0.07)"),
                      color:votes[3]===opt?"#FF6B6B":"rgba(255,255,255,0.4)"}}>
                    {opt}
                  </button>
                ))}
              </div>
              {msg&&<div style={{fontFamily:"monospace",fontSize:"9px",color:msg.startsWith("✓")?"#A8FF78":"#FF6B6B",marginBottom:"8px",letterSpacing:"0.1em"}}>{msg}</div>}
              <button onClick={submitVotes} disabled={saving||!votes[3]} style={{width:"100%",padding:"9px",background:votes[3]?"rgba(255,215,0,0.1)":"rgba(255,255,255,0.03)",border:"1px solid "+(votes[3]?"rgba(255,215,0,0.25)":"rgba(255,255,255,0.06)"),borderRadius:"6px",color:votes[3]?"#FFD700":"rgba(255,255,255,0.25)",fontFamily:"monospace",fontSize:"10px",letterSpacing:"0.12em",cursor:votes[3]?"pointer":"default"}}>
                {saving?"...":"ENVIAR VOTO (+3 PUNTOS)"}
              </button>
            </div>
          ) : (
            /* Multiple clans: 3 weighted votes */
            <div>
              <div style={{fontFamily:"monospace",fontSize:"9px",color:"rgba(255,255,255,0.35)",letterSpacing:"0.12em",marginBottom:"10px"}}>ASIGNA TUS 3 VOTOS — CADA VOTO A UN CLAN DIFERENTE</div>
              {[{w:3,label:"VOTO 3 — EL MAS DIFÍCIL",color:"#FF6B6B"},{w:2,label:"VOTO 2 — SEGUNDO MAS DIFÍCIL",color:"#FF9F43"},{w:1,label:"VOTO 1 — TERCERO",color:"rgba(255,255,255,0.35)"}].map(({w,label,color})=>(
                <div key={w} style={{marginBottom:"10px"}}>
                  <div style={{fontFamily:"monospace",fontSize:"8px",color,letterSpacing:"0.1em",marginBottom:"5px"}}>{label}</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(100px,1fr))",gap:"4px"}}>
                    {rivalClans.map((clan,i)=>(
                      <button key={i} onClick={()=>setVotes(v=>({...v,[w]:votes[w]===clan.name?null:clan.name}))}
                        style={{padding:"6px 8px",borderRadius:"5px",cursor:"pointer",textAlign:"left",
                          background:votes[w]===clan.name?"rgba(255,107,107,0.1)":"rgba(255,255,255,0.02)",
                          border:"1px solid "+(votes[w]===clan.name?"rgba(255,107,107,0.3)":"rgba(255,255,255,0.06)"),
                          color:votes[w]===clan.name?color:"rgba(255,255,255,0.4)",
                          fontFamily:"Georgia,serif",fontSize:"11px",
                          opacity:Object.entries(votes).some(([k,v])=>parseInt(k)!==w&&v===clan.name)?0.35:1}}>
                        {clan.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {msg&&<div style={{fontFamily:"monospace",fontSize:"9px",color:msg.startsWith("✓")?"#A8FF78":"#FF6B6B",marginBottom:"8px",letterSpacing:"0.1em"}}>{msg}</div>}
              <button onClick={submitVotes} disabled={saving} style={{width:"100%",padding:"9px",marginTop:"4px",background:"rgba(255,215,0,0.08)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:"6px",color:"#FFD700",fontFamily:"monospace",fontSize:"10px",letterSpacing:"0.12em",cursor:"pointer"}}>
                {saving?"...":"ENVIAR VOTOS (+3 PUNTOS)"}
              </button>
            </div>
          ))}
        </div>
      </div>
      <NalguitasFooter/>
    </div>
  );
}

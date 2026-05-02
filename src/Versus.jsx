import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import NavBar from "./NavBar";
import PageHeader from "./PageHeader";
import NalguitasFooter from "./NalguitasFooter";

function getWarWeek() {
  const now = new Date();
  const ec  = new Date(now.getTime() - 5*60*60*1000);
  const day = ec.getDay();
  const d   = (day+2)%7;
  const fri = new Date(ec); fri.setDate(ec.getDate()-d);
  const y   = fri.getFullYear();
  const w   = Math.ceil(((fri-new Date(y,0,1))/86400000+1)/7);
  return `${y}-W${w}`;
}

export default function Versus() {
  const [players, setPlayers]   = useState([]);
  const [battles, setBattles]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const playerId   = sessionStorage.getItem("aor_player_id");
  const playerName = sessionStorage.getItem("aor_player_name");
  const week = getWarWeek();

  // Challenge form
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [opponent, setOpponent]           = useState(null);
  const [wins, setWins]                   = useState(null); // 0-3 wars won vs this opponent
  const [saving, setSaving]               = useState(false);
  const [msg, setMsg]                     = useState("");

  useEffect(()=>{
    Promise.all([
      supabase.from("players").select("id,name,active,pts_acumulados").eq("active",true).order("name"),
      supabase.from("pvp_battles").select("*").order("created_at",{ascending:false}).limit(100),
    ]).then(([p,b])=>{
      setPlayers(p.data||[]);
      setBattles(b.data||[]);
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);

  async function submitBattle() {
    if (!playerId||!opponent||wins===null) return;
    setSaving(true);
    const losses = 3 - wins;
    const {error} = await supabase.from("pvp_battles").insert({
      challenger_id:   parseInt(playerId),
      challenger_name: playerName,
      opponent_id:     opponent.id,
      opponent_name:   opponent.name,
      challenger_wins: wins,
      opponent_wins:   losses,
      week,
      status: "pending", // opponent must confirm
      created_at: new Date().toISOString(),
    });
    if (error) { setMsg("Error: "+error.message); setSaving(false); return; }
    // +1pt per battle recorded
    const {data:pl} = await supabase.from("players").select("pts_acumulados").eq("id",parseInt(playerId)).single();
    await supabase.from("players").update({pts_acumulados:(pl?.pts_acumulados||0)+1}).eq("id",parseInt(playerId));
    const {data:b} = await supabase.from("pvp_battles").select("*").order("created_at",{ascending:false}).limit(100);
    setBattles(b||[]);
    setMsg("✓ Resultado registrado (+1pt). El rival debe confirmar.");
    setSaving(false); setChallengeOpen(false); setOpponent(null); setWins(null);
    setTimeout(()=>setMsg(""),4000);
  }

  async function confirmBattle(battle) {
    await supabase.from("pvp_battles").update({status:"confirmed"}).eq("id",battle.id);
    const {data:b} = await supabase.from("pvp_battles").select("*").order("created_at",{ascending:false}).limit(100);
    setBattles(b||[]);
  }

  async function disputeBattle(battle) {
    await supabase.from("pvp_battles").update({status:"disputed"}).eq("id",battle.id);
    const {data:b} = await supabase.from("pvp_battles").select("*").order("created_at",{ascending:false}).limit(100);
    setBattles(b||[]);
  }

  const myBattles    = battles.filter(b=>String(b.challenger_id)===String(playerId)||String(b.opponent_id)===String(playerId));
  const pendingForMe = battles.filter(b=>String(b.opponent_id)===String(playerId)&&b.status==="pending");

  // Overall PvP record per player
  const record = {};
  battles.filter(b=>b.status==="confirmed").forEach(b=>{
    [b.challenger_name,b.opponent_name].forEach(n=>{ if(!record[n]) record[n]={w:0,l:0}; });
    record[b.challenger_name].w += b.challenger_wins;
    record[b.challenger_name].l += b.opponent_wins;
    record[b.opponent_name].w   += b.opponent_wins;
    record[b.opponent_name].l   += b.challenger_wins;
  });
  const ranked = Object.entries(record).sort((a,b)=>b[1].w-a[1].w);

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace",fontSize:"9px",letterSpacing:"0.3em",color:"rgba(255,107,107,0.4)"}}>
      VERSUS — CARGANDO
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",fontFamily:"Georgia,serif",color:"#d4c9a8",padding:"20px",paddingBottom:"50px"}}>
      <div style={{maxWidth:"560px",margin:"0 auto"}}>
        <NavBar current="/versus"/>
        <PageHeader page="/versus"/>

        {/* Pending confirmations for me */}
        {pendingForMe.length>0&&(
          <div style={{marginBottom:"16px"}}>
            <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.2em",color:"rgba(255,107,107,0.6)",marginBottom:"8px"}}>RETOS PENDIENTES DE CONFIRMAR</div>
            {pendingForMe.map(b=>(
              <div key={b.id} style={{background:"rgba(255,107,107,0.05)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:"8px",padding:"12px",marginBottom:"6px"}}>
                <div style={{fontFamily:"serif",fontSize:"13px",color:"#FF6B6B",marginBottom:"4px"}}>
                  {b.challenger_name} declara: {b.challenger_wins} victorias de 3 contra ti
                </div>
                <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",marginBottom:"8px",fontFamily:"monospace"}}>{b.week}</div>
                <div style={{display:"flex",gap:"8px"}}>
                  <button onClick={()=>confirmBattle(b)} style={{flex:1,padding:"7px",background:"rgba(168,255,120,0.1)",border:"1px solid rgba(168,255,120,0.25)",borderRadius:"5px",color:"#A8FF78",fontSize:"10px",cursor:"pointer",fontFamily:"monospace"}}>
                    CONFIRMAR
                  </button>
                  <button onClick={()=>disputeBattle(b)} style={{flex:1,padding:"7px",background:"rgba(255,107,107,0.08)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:"5px",color:"#FF6B6B",fontSize:"10px",cursor:"pointer",fontFamily:"monospace"}}>
                    REFUTAR
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Record battle */}
        <div style={{background:"rgba(255,107,107,0.04)",border:"1px solid rgba(255,107,107,0.15)",borderRadius:"10px",padding:"16px",marginBottom:"16px"}}>
          <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.2em",color:"rgba(255,107,107,0.5)",marginBottom:"10px"}}>REGISTRAR RESULTADO PvP (+1pt por registro)</div>
          {!playerId ? (
            <div style={{fontSize:"10px",color:"rgba(255,255,255,0.3)"}}>Inicia sesión para registrar batallas.</div>
          ) : !challengeOpen ? (
            <button onClick={()=>setChallengeOpen(true)} style={{width:"100%",padding:"9px",background:"rgba(255,107,107,0.08)",border:"1px dashed rgba(255,107,107,0.25)",borderRadius:"6px",color:"rgba(255,107,107,0.6)",fontSize:"11px",cursor:"pointer",fontFamily:"monospace",letterSpacing:"0.1em"}}>
              + REGISTRAR RESULTADO DE 3 BATALLAS
            </button>
          ) : (
            <div>
              <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,255,255,0.3)",marginBottom:"6px"}}>ELIGE TU RIVAL</div>
              <div style={{maxHeight:"160px",overflow:"auto",marginBottom:"10px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px"}}>
                {players.filter(p=>String(p.id)!==String(playerId)).map(p=>(
                  <button key={p.id} onClick={()=>setOpponent(p)}
                    style={{padding:"6px 8px",borderRadius:"5px",cursor:"pointer",textAlign:"left",
                      background:opponent?.id===p.id?"rgba(255,107,107,0.12)":"rgba(255,255,255,0.02)",
                      border:"1px solid "+(opponent?.id===p.id?"rgba(255,107,107,0.3)":"rgba(255,255,255,0.06)"),
                      color:opponent?.id===p.id?"#FF6B6B":"rgba(255,255,255,0.5)",
                      fontSize:"11px",fontFamily:"Georgia,serif"}}>
                    {p.name}
                  </button>
                ))}
              </div>
              {opponent&&(
                <>
                  <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,255,255,0.3)",marginBottom:"6px"}}>
                    ¿CUÁNTAS DE LAS 3 GUERRAS GANASTE vs {opponent.name.toUpperCase()}?
                  </div>
                  <div style={{display:"flex",gap:"6px",marginBottom:"10px"}}>
                    {[0,1,2,3].map(n=>(
                      <button key={n} onClick={()=>setWins(n)} style={{flex:1,padding:"10px 4px",borderRadius:"6px",cursor:"pointer",
                        background:wins===n?"rgba(255,107,107,0.15)":"rgba(255,255,255,0.02)",
                        border:"1px solid "+(wins===n?"rgba(255,107,107,0.4)":"rgba(255,255,255,0.08)"),
                        color:wins===n?"#FF6B6B":"rgba(255,255,255,0.4)",
                        fontFamily:"monospace",fontSize:"16px",fontWeight:"bold"}}>
                        {n}
                      </button>
                    ))}
                  </div>
                  {wins!==null&&(
                    <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"8px",textAlign:"center",fontFamily:"monospace"}}>
                      {wins} victoria{wins!==1?"s":""} tuya{wins>0?" ·":""} {3-wins} de {opponent.name}
                    </div>
                  )}
                </>
              )}
              {msg&&<div style={{fontSize:"10px",color:msg.startsWith("✓")?"#A8FF78":"#FF6B6B",marginBottom:"6px"}}>{msg}</div>}
              <div style={{display:"flex",gap:"6px"}}>
                <button onClick={submitBattle} disabled={!opponent||wins===null||saving}
                  style={{flex:1,padding:"8px",background:opponent&&wins!==null?"rgba(168,255,120,0.12)":"rgba(255,255,255,0.03)",border:"1px solid "+(opponent&&wins!==null?"rgba(168,255,120,0.3)":"rgba(255,255,255,0.07)"),borderRadius:"6px",color:opponent&&wins!==null?"#A8FF78":"rgba(255,255,255,0.2)",fontSize:"11px",cursor:"pointer",fontFamily:"monospace"}}>
                  {saving?"...":"ENVIAR"}
                </button>
                <button onClick={()=>{setChallengeOpen(false);setOpponent(null);setWins(null);}}
                  style={{padding:"8px 14px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"6px",color:"rgba(255,255,255,0.3)",fontSize:"11px",cursor:"pointer"}}>
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rankings */}
        {ranked.length>0&&(
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",padding:"14px",marginBottom:"16px"}}>
            <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.2em",color:"rgba(255,215,0,0.4)",marginBottom:"10px"}}>RANKING PvP — BATALLAS CONFIRMADAS</div>
            {ranked.map(([name,r],i)=>(
              <div key={name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 8px",marginBottom:"3px",background:i===0?"rgba(255,215,0,0.05)":"rgba(255,255,255,0.01)",borderRadius:"5px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                  <span style={{fontFamily:"monospace",fontSize:"9px",color:"rgba(255,255,255,0.2)",width:"16px"}}>{i+1}</span>
                  <span style={{fontFamily:"Georgia,serif",fontSize:"12px",color:i===0?"#FFD700":"rgba(255,255,255,0.6)"}}>{name}</span>
                </div>
                <div style={{fontFamily:"monospace",fontSize:"10px"}}>
                  <span style={{color:"#A8FF78"}}>{r.w}V</span>
                  <span style={{color:"rgba(255,255,255,0.2)"}}> / </span>
                  <span style={{color:"#FF6B6B"}}>{r.l}D</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent battles */}
        {myBattles.length>0&&(
          <div>
            <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.2em",color:"rgba(255,255,255,0.25)",marginBottom:"8px"}}>MIS BATALLAS RECIENTES</div>
            {myBattles.slice(0,10).map(b=>{
              const iAmChallenger = String(b.challenger_id)===String(playerId);
              const myWins = iAmChallenger?b.challenger_wins:b.opponent_wins;
              const theirWins = iAmChallenger?b.opponent_wins:b.challenger_wins;
              const rival = iAmChallenger?b.opponent_name:b.challenger_name;
              return (
                <div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",marginBottom:"4px",background:"rgba(255,255,255,0.02)",borderRadius:"6px",border:"1px solid rgba(255,255,255,0.05)"}}>
                  <div>
                    <div style={{fontSize:"11px",color:"rgba(255,255,255,0.6)",fontFamily:"Georgia,serif"}}>vs {rival}</div>
                    <div style={{fontSize:"8px",color:"rgba(255,255,255,0.2)",fontFamily:"monospace"}}>{b.week} · {b.status==="confirmed"?"✓ confirmado":b.status==="disputed"?"⚠ refutado":"⏳ pendiente"}</div>
                  </div>
                  <div style={{fontFamily:"monospace",fontSize:"13px",fontWeight:"bold"}}>
                    <span style={{color:myWins>theirWins?"#A8FF78":myWins<theirWins?"#FF6B6B":"rgba(255,255,255,0.4)"}}>{myWins}</span>
                    <span style={{color:"rgba(255,255,255,0.2)"}}> - </span>
                    <span style={{color:theirWins>myWins?"#FF6B6B":"rgba(255,255,255,0.4)"}}>{theirWins}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <NalguitasFooter/>
    </div>
  );
}

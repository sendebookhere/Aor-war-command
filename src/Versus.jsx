import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import NavBar from "./NavBar";
import PageHeader from "./PageHeader";
import NalguitasFooter from "./NalguitasFooter";

function getWarWeek() {
  const now = new Date();
  const ec  = new Date(now.getTime()-5*60*60*1000);
  const day = ec.getDay();
  const fri = new Date(ec); fri.setDate(ec.getDate()-((day+2)%7));
  const y=fri.getFullYear(), w=Math.ceil(((fri-new Date(y,0,1))/86400000+1)/7);
  return `${y}-W${w}`;
}

function todayStr() { return new Date().toISOString().slice(0,10); }

export default function Versus() {
  const [players, setPlayers]     = useState([]);
  const [battles, setBattles]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [msg, setMsg]             = useState("");
  const playerId   = sessionStorage.getItem("aor_player_id");
  const playerName = sessionStorage.getItem("aor_player_name");
  const week = getWarWeek();

  const [opponent, setOpponent]   = useState(null);
  const [myWins, setMyWins]       = useState(null);
  const [formOpen, setFormOpen]   = useState(false);
  const [saving, setSaving]       = useState(false);

  async function load() {
    const [p,b] = await Promise.all([
      supabase.from("players").select("id,name,pts_acumulados").eq("active",true).order("name"),
      supabase.from("pvp_battles").select("*").order("created_at",{ascending:false}).limit(200),
    ]);
    setPlayers(p.data||[]);
    setBattles(b.data||[]);
    setLoading(false);
  }

  useEffect(()=>{ load(); },[]);

  // My battles today (for daily limit)
  const myBattlesToday = battles.filter(b=>
    String(b.challenger_id)===String(playerId) &&
    b.created_at?.slice(0,10)===todayStr()
  );
  const canChallenge = myBattlesToday.length < 5;

  async function submitBattle() {
    if (!playerId||!opponent||myWins===null) return;
    if (!canChallenge) { setMsg("Límite de 5 desafíos diarios alcanzado."); return; }
    setSaving(true);
    const theirWins = 3 - myWins;
    const {error} = await supabase.from("pvp_battles").insert({
      challenger_id:   parseInt(playerId),
      challenger_name: playerName,
      opponent_id:     opponent.id,
      opponent_name:   opponent.name,
      challenger_wins: myWins,
      opponent_wins:   theirWins,
      week, status:"pending",
      created_at: new Date().toISOString(),
    });
    if (error) { setMsg("Error: "+error.message); setSaving(false); return; }
    // +1pt per set of 3 battles
    try {
      const {data:pl} = await supabase.from("players").select("pts_acumulados").eq("id",parseInt(playerId)).single();
      await supabase.from("players").update({pts_acumulados:(pl?.pts_acumulados||0)+1}).eq("id",parseInt(playerId));
    } catch(e) {}
    await load();
    setMsg("✓ Resultado enviado (+1pt). "+opponent.name+" debe confirmar.");
    setSaving(false); setFormOpen(false); setOpponent(null); setMyWins(null);
    setTimeout(()=>setMsg(""),5000);
  }

  async function confirm(battle) {
    await supabase.from("pvp_battles").update({status:"confirmed"}).eq("id",battle.id);
    // +1pt to opponent too for confirmed battle
    try {
      const {data:pl} = await supabase.from("players").select("pts_acumulados").eq("id",battle.opponent_id).single();
      await supabase.from("players").update({pts_acumulados:(pl?.pts_acumulados||0)+1}).eq("id",battle.opponent_id);
    } catch(e){}
    await load();
  }

  async function dispute(battle) {
    // Disputed: open 5-battle challenge
    await supabase.from("pvp_battles").update({status:"disputed"}).eq("id",battle.id);
    await load();
  }

  async function submitClaim(battle) {
    await supabase.from("pvp_battles").update({status:"claimed"}).eq("id",battle.id);
    setMsg("Claim enviado. El asunto llega a los administradores en Noticias Clan.");
    await supabase.from("clan_news").insert({
      type:"requerimiento",
      title:"CLAIM PvP: "+battle.challenger_name+" vs "+battle.opponent_name,
      body:`${battle.challenger_name} reclama: ganó ${battle.challenger_wins} de 3 batallas vs ${battle.opponent_name}. Resultado en disputa. Se requiere video de 5 batallas sin cortes de ambos jugadores.`,
      author:"Sistema PvP", target:"admin",
    }).catch(()=>{});
    await load();
  }

  const pendingForMe = battles.filter(b=>String(b.opponent_id)===String(playerId)&&b.status==="pending");
  const disputedForMe = battles.filter(b=>String(b.challenger_id)===String(playerId)&&b.status==="disputed");

  // PvP record per player
  const record = {};
  battles.filter(b=>b.status==="confirmed").forEach(b=>{
    if(!record[b.challenger_name]) record[b.challenger_name]={w:0,l:0,pts:0};
    if(!record[b.opponent_name])   record[b.opponent_name]  ={w:0,l:0,pts:0};
    record[b.challenger_name].w+=b.challenger_wins; record[b.challenger_name].l+=b.opponent_wins;
    record[b.opponent_name].w  +=b.opponent_wins;   record[b.opponent_name].l  +=b.challenger_wins;
  });
  const ranked=Object.entries(record).sort((a,b)=>b[1].w-a[1].w);

  // Head-to-head between two players
  function h2h(nameA, nameB) {
    const relevant = battles.filter(b=>b.status==="confirmed"&&((b.challenger_name===nameA&&b.opponent_name===nameB)||(b.challenger_name===nameB&&b.opponent_name===nameA)));
    let aW=0,bW=0;
    relevant.forEach(b=>{ if(b.challenger_name===nameA){aW+=b.challenger_wins;bW+=b.opponent_wins;}else{aW+=b.opponent_wins;bW+=b.challenger_wins;} });
    return {aW,bW,total:aW+bW};
  }

  if (loading) return <div style={{minHeight:"100vh",background:"#0d0d0f",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace",fontSize:"9px",letterSpacing:"0.3em",color:"rgba(255,107,107,0.4)"}}>VERSUS — CARGANDO</div>;

  return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",fontFamily:"Georgia,serif",color:"#d4c9a8",padding:"20px",paddingBottom:"50px"}}>
      <div style={{maxWidth:"560px",margin:"0 auto"}}>
        <NavBar current="/versus"/>
        <PageHeader page="/versus"/>

        {/* Pending confirmations */}
        {pendingForMe.length>0&&(
          <div style={{marginBottom:"16px"}}>
            <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.2em",color:"rgba(255,107,107,0.6)",marginBottom:"8px"}}>RESULTADOS PENDIENTES DE CONFIRMAR</div>
            {pendingForMe.map(b=>(
              <div key={b.id} style={{background:"rgba(255,107,107,0.05)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:"8px",padding:"12px",marginBottom:"6px"}}>
                <div style={{fontSize:"13px",color:"#FF6B6B",marginBottom:"3px",fontFamily:"serif"}}>{b.challenger_name}</div>
                <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"8px",fontFamily:"monospace"}}>
                  declara: ganó {b.challenger_wins} - perdió {b.opponent_wins} de 3 batallas contra ti
                </div>
                <div style={{display:"flex",gap:"6px"}}>
                  <button onClick={()=>confirm(b)} style={{flex:1,padding:"7px",background:"rgba(168,255,120,0.1)",border:"1px solid rgba(168,255,120,0.25)",borderRadius:"5px",color:"#A8FF78",fontSize:"10px",cursor:"pointer",fontFamily:"monospace"}}>✓ CONFIRMAR</button>
                  <button onClick={()=>dispute(b)} style={{flex:1,padding:"7px",background:"rgba(255,107,107,0.08)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:"5px",color:"#FF6B6B",fontSize:"10px",cursor:"pointer",fontFamily:"monospace"}}>✕ REFUTAR → 5 RONDAS</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Disputed - challenger can claim */}
        {disputedForMe.map(b=>(
          <div key={b.id} style={{background:"rgba(255,215,0,0.04)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:"8px",padding:"12px",marginBottom:"8px"}}>
            <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,215,0,0.5)",marginBottom:"6px"}}>RESULTADO REFUTADO POR {b.opponent_name.toUpperCase()}</div>
            <div style={{fontSize:"10px",color:"rgba(255,255,255,0.5)",marginBottom:"8px"}}>
              {b.opponent_name} no confirma tu resultado. Si tienes video de las 5 batallas, presenta un claim. Se resolverá en WhatsApp con videos de ambos jugadores.
            </div>
            <button onClick={()=>submitClaim(b)} style={{width:"100%",padding:"7px",background:"rgba(255,215,0,0.08)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:"5px",color:"#FFD700",fontSize:"10px",cursor:"pointer",fontFamily:"monospace"}}>
              PRESENTAR CLAIM → ADMINISTRADORES
            </button>
          </div>
        ))}

        {/* Record result */}
        <div style={{background:"rgba(255,107,107,0.04)",border:"1px solid rgba(255,107,107,0.15)",borderRadius:"10px",padding:"16px",marginBottom:"16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
            <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.2em",color:"rgba(255,107,107,0.5)"}}>REGISTRAR RESULTADO (+1pt por set de 3)</div>
            <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,255,255,0.25)"}}>{myBattlesToday.length}/5 hoy</div>
          </div>
          {!playerId?(
            <div style={{fontSize:"10px",color:"rgba(255,255,255,0.3)"}}>Inicia sesión para registrar batallas.</div>
          ):!canChallenge?(
            <div style={{fontSize:"10px",color:"rgba(255,107,107,0.5)",fontFamily:"monospace"}}>LÍMITE DIARIO ALCANZADO — 5 desafíos/día</div>
          ):!formOpen?(
            <button onClick={()=>setFormOpen(true)} style={{width:"100%",padding:"9px",background:"rgba(255,107,107,0.08)",border:"1px dashed rgba(255,107,107,0.25)",borderRadius:"6px",color:"rgba(255,107,107,0.6)",fontSize:"11px",cursor:"pointer",fontFamily:"monospace",letterSpacing:"0.1em"}}>
              + REGISTRAR 3 BATALLAS CONTRA UN RIVAL
            </button>
          ):(
            <div>
              <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,255,255,0.3)",marginBottom:"6px"}}>ELIGE TU RIVAL</div>
              <div style={{maxHeight:"150px",overflow:"auto",marginBottom:"10px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px"}}>
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
                    ¿CUÁNTAS GANASTE TÚ DE LAS 3 BATALLAS vs {opponent.name.toUpperCase()}?
                  </div>
                  <div style={{display:"flex",gap:"5px",marginBottom:"10px"}}>
                    {[0,1,2,3].map(n=>(
                      <button key={n} onClick={()=>setMyWins(n)} style={{flex:1,padding:"10px 2px",borderRadius:"6px",cursor:"pointer",
                        background:myWins===n?"rgba(255,107,107,0.15)":"rgba(255,255,255,0.02)",
                        border:"1px solid "+(myWins===n?"rgba(255,107,107,0.4)":"rgba(255,255,255,0.08)"),
                        color:myWins===n?"#FF6B6B":"rgba(255,255,255,0.4)",
                        fontFamily:"monospace",fontSize:"16px",fontWeight:"bold"}}>
                        {n}
                      </button>
                    ))}
                  </div>
                  {myWins!==null&&(
                    <div style={{fontSize:"10px",color:"rgba(255,255,255,0.3)",marginBottom:"8px",textAlign:"center",fontFamily:"monospace"}}>
                      Tú: {myWins} victoria{myWins!==1?"s":""} · {opponent.name}: {3-myWins} victoria{3-myWins!==1?"s":""}
                    </div>
                  )}
                </>
              )}
              {msg&&<div style={{fontSize:"10px",color:msg.startsWith("✓")?"#A8FF78":"#FF6B6B",marginBottom:"6px"}}>{msg}</div>}
              <div style={{display:"flex",gap:"6px"}}>
                <button onClick={submitBattle} disabled={!opponent||myWins===null||saving}
                  style={{flex:1,padding:"8px",background:opponent&&myWins!==null?"rgba(168,255,120,0.12)":"rgba(255,255,255,0.03)",border:"1px solid "+(opponent&&myWins!==null?"rgba(168,255,120,0.3)":"rgba(255,255,255,0.07)"),borderRadius:"6px",color:opponent&&myWins!==null?"#A8FF78":"rgba(255,255,255,0.2)",fontSize:"11px",cursor:"pointer",fontFamily:"monospace"}}>
                  {saving?"...":"ENVIAR RESULTADO"}
                </button>
                <button onClick={()=>{setFormOpen(false);setOpponent(null);setMyWins(null);}}
                  style={{padding:"8px 12px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"6px",color:"rgba(255,255,255,0.3)",fontSize:"11px",cursor:"pointer"}}>✕</button>
              </div>
            </div>
          )}
        </div>

        {/* PvP Rankings */}
        {ranked.length>0&&(
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",padding:"14px",marginBottom:"16px"}}>
            <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.2em",color:"rgba(255,215,0,0.4)",marginBottom:"10px"}}>RANKING PvP — BATALLAS CONFIRMADAS</div>
            {ranked.map(([name,r],i)=>(
              <div key={name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 8px",marginBottom:"3px",background:i===0?"rgba(255,215,0,0.05)":"rgba(255,255,255,0.01)",borderRadius:"5px"}}>
                <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                  <span style={{fontFamily:"monospace",fontSize:"9px",color:"rgba(255,255,255,0.2)",width:"16px"}}>{i+1}</span>
                  <span style={{fontFamily:"Georgia,serif",fontSize:"12px",color:i===0?"#FFD700":"rgba(255,255,255,0.6)"}}>{name}</span>
                </div>
                <div style={{fontFamily:"monospace",fontSize:"10px"}}>
                  <span style={{color:"#A8FF78"}}>{r.w}V</span>
                  <span style={{color:"rgba(255,255,255,0.2)"}}>/</span>
                  <span style={{color:"#FF6B6B"}}>{r.l}D</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent battles */}
        {battles.filter(b=>String(b.challenger_id)===String(playerId)||String(b.opponent_id)===String(playerId)).length>0&&(
          <div>
            <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.2em",color:"rgba(255,255,255,0.25)",marginBottom:"8px"}}>MIS BATALLAS</div>
            {battles.filter(b=>String(b.challenger_id)===String(playerId)||String(b.opponent_id)===String(playerId)).slice(0,15).map(b=>{
              const isChallenger=String(b.challenger_id)===String(playerId);
              const myW=isChallenger?b.challenger_wins:b.opponent_wins;
              const theirW=isChallenger?b.opponent_wins:b.challenger_wins;
              const rival=isChallenger?b.opponent_name:b.challenger_name;
              const statusColor=b.status==="confirmed"?"#A8FF78":b.status==="disputed"||b.status==="claimed"?"#FF6B6B":"rgba(255,215,0,0.6)";
              return (
                <div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",marginBottom:"3px",background:"rgba(255,255,255,0.02)",borderRadius:"6px",border:"1px solid rgba(255,255,255,0.05)"}}>
                  <div>
                    <div style={{fontSize:"11px",color:"rgba(255,255,255,0.6)",fontFamily:"Georgia,serif"}}>vs {rival}</div>
                    <div style={{fontSize:"8px",fontFamily:"monospace",color:statusColor}}>{b.week} · {b.status}</div>
                  </div>
                  <div style={{fontFamily:"monospace",fontSize:"13px",fontWeight:"bold"}}>
                    <span style={{color:myW>theirW?"#A8FF78":myW<theirW?"#FF6B6B":"rgba(255,255,255,0.4)"}}>{myW}</span>
                    <span style={{color:"rgba(255,255,255,0.2)"}}> - </span>
                    <span style={{color:theirW>myW?"#FF6B6B":"rgba(255,255,255,0.4)"}}>{theirW}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {msg&&!formOpen&&<div style={{marginTop:"8px",fontSize:"10px",color:msg.startsWith("✓")?"#A8FF78":"#FF6B6B",fontFamily:"monospace"}}>{msg}</div>}
      </div>
      <NalguitasFooter/>
    </div>
  );
}

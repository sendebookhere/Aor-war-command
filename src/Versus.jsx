import { LoadingScreen } from "./LoadingScreen";
import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import NavBar from "./NavBar";
import PageHeader from "./PageHeader";
import NalguitasFooter from "./NalguitasFooter";

function getWarWeek() {
  const now=new Date(), ec=new Date(now.getTime()-5*3600000);
  const fri=new Date(ec); fri.setDate(ec.getDate()-((ec.getDay()+2)%7));
  const y=fri.getFullYear(), w=Math.ceil(((fri-new Date(y,0,1))/86400000+1)/7);
  return `${y}-W${w}`;
}

export default function Versus() {
  const [players,setPlayers]=useState([]);
  const [battles,setBattles]=useState([]);
  const [loading,setLoading]=useState(true);
  const [msg,setMsg]=useState("");
  const [formOpen,setFormOpen]=useState(false);
  const [opponent,setOpponent]=useState(null);
  const [myWins,setMyWins]=useState(null);
  const [saving,setSaving]=useState(false);
  const playerId=sessionStorage.getItem("aor_player_id");
  const playerName=sessionStorage.getItem("aor_player_name");
  const week=getWarWeek();
  const today=new Date().toISOString().slice(0,10);

  async function load(){
    try{
      const [p,b]=await Promise.all([
        supabase.from("players").select("id,name,pts_acumulados,clan_role").eq("active",true).order("name"),
        supabase.from("pvp_battles").select("*").order("created_at",{ascending:false}).limit(300),
      ]);
      setPlayers(p.data||[]); setBattles(b.data||[]);
    }catch(e){console.error(e);}
    setLoading(false);
  }
  useEffect(()=>{load();},[]);

  const myTodayBattles=battles.filter(b=>String(b.challenger_id)===String(playerId)&&(b.created_at||"").slice(0,10)===today);
  const canChallenge=playerId&&myTodayBattles.length<5;
  const pendingForMe=battles.filter(b=>String(b.opponent_id)===String(playerId)&&b.status==="pending");
  const disputedForMe=battles.filter(b=>String(b.challenger_id)===String(playerId)&&b.status==="disputed");
  const claimedAdmin=battles.filter(b=>b.status==="claimed");
  const myPlayer=players.find(p=>String(p.id)===String(playerId));
  const isAdmin=["Líder","Co-Líder"].includes(myPlayer?.clan_role);

  async function awardPt(pid){
    try{const{data:pl}=await supabase.from("players").select("pts_acumulados").eq("id",parseInt(pid)).single();
    await supabase.from("players").update({pts_acumulados:(pl?.pts_acumulados||0)+1}).eq("id",parseInt(pid));}catch(e){}
  }

  async function submitBattle(){
    if(!playerId||!opponent||myWins===null||saving)return;
    if(!canChallenge){setMsg("Límite de 5 desafíos diarios.");return;}
    setSaving(true);
    const{error}=await supabase.from("pvp_battles").insert({
      challenger_id:parseInt(playerId),challenger_name:playerName,
      opponent_id:opponent.id,opponent_name:opponent.name,
      challenger_wins:myWins,opponent_wins:3-myWins,
      week,status:"pending",created_at:new Date().toISOString(),
    });
    if(error){setMsg("Error: "+error.message);setSaving(false);return;}
    await awardPt(playerId);
    await load();
    setMsg(`✓ Enviado (+1pt). ${opponent.name} debe confirmar.`);
    setSaving(false);setFormOpen(false);setOpponent(null);setMyWins(null);
    setTimeout(()=>setMsg(""),6000);
  }

  async function confirm(b){
    await supabase.from("pvp_battles").update({status:"confirmed"}).eq("id",b.id);
    await awardPt(b.opponent_id);
    await load();
  }

  async function refute(b){
    await supabase.from("pvp_battles").update({status:"disputed"}).eq("id",b.id);
    await load();
  }

  async function submitClaim(b){
    await supabase.from("pvp_battles").update({status:"claimed"}).eq("id",b.id);
    try{await supabase.from("clan_news").insert({
      type:"requerimiento",
      title:`CLAIM PvP — ${b.challenger_name} vs ${b.opponent_name}`,
      body:`${b.challenger_name} reclama: ${b.challenger_wins}V de 3 vs ${b.opponent_name}. Refutado. Se requieren videos sin cortes de ambos jugadores. Si consistentes → ambos +5pts.`,
      author:"Sistema PvP",target:"admin",completions:[],
    });}catch(e){}
    setMsg("Claim enviado a administradores.");
    await load();setTimeout(()=>setMsg(""),6000);
  }

  async function resolveAdmin(b,challWins){
    await supabase.from("pvp_battles").update({status:challWins?"confirmed":"confirmed_reversed"}).eq("id",b.id);
    try{
      const{data:c}=await supabase.from("players").select("pts_acumulados").eq("id",b.challenger_id).single();
      const{data:o}=await supabase.from("players").select("pts_acumulados").eq("id",b.opponent_id).single();
      await supabase.from("players").update({pts_acumulados:(c?.pts_acumulados||0)+5}).eq("id",b.challenger_id);
      await supabase.from("players").update({pts_acumulados:(o?.pts_acumulados||0)+5}).eq("id",b.opponent_id);
    }catch(e){}
    await load();
  }

  const record={};
  battles.filter(b=>b.status==="confirmed"||b.status==="confirmed_reversed").forEach(b=>{
    const cW=b.status==="confirmed_reversed"?b.opponent_wins:b.challenger_wins;
    const oW=b.status==="confirmed_reversed"?b.challenger_wins:b.opponent_wins;
    if(!record[b.challenger_name])record[b.challenger_name]={w:0,l:0,sets:0};
    if(!record[b.opponent_name])record[b.opponent_name]={w:0,l:0,sets:0};
    record[b.challenger_name].w+=cW;record[b.challenger_name].l+=oW;record[b.challenger_name].sets++;
    record[b.opponent_name].w+=oW;record[b.opponent_name].l+=cW;record[b.opponent_name].sets++;
  });
  const ranked=Object.entries(record).sort((a,b)=>b[1].w-a[1].w||a[1].l-b[1].l);

  function h2h(rivalName){
    const rel=battles.filter(b=>(b.status==="confirmed"||b.status==="confirmed_reversed")&&((b.challenger_name===playerName&&b.opponent_name===rivalName)||(b.challenger_name===rivalName&&b.opponent_name===playerName)));
    let mW=0,rW=0;
    rel.forEach(b=>{const isC=b.challenger_name===playerName;const cW=b.status==="confirmed_reversed"?b.opponent_wins:b.challenger_wins;const oW=b.status==="confirmed_reversed"?b.challenger_wins:b.opponent_wins;if(isC){mW+=cW;rW+=oW;}else{mW+=oW;rW+=cW;}});
    return{mW,rW,sets:rel.length};
  }

  const myBattles=battles.filter(b=>String(b.challenger_id)===String(playerId)||String(b.opponent_id)===String(playerId));

  if(loading)return(<div style={{minHeight:"100vh",background:"#0d0d0f",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"8px"}}><div style={{fontFamily:"monospace",fontSize:"7px",letterSpacing:"0.4em",color:"rgba(64,224,255,0.15)"}}>CARGANDO</div><div style={{fontFamily:"monospace",fontSize:"10px",letterSpacing:"0.2em",color:"#FF6B6B",opacity:0.5}}>— VERSUS — PvP —</div></div>);

  return(
    <div style={{minHeight:"100vh",background:"#0d0d0f",fontFamily:"Georgia,serif",color:"#d4c9a8",padding:"20px",paddingBottom:"50px"}}>
      <div style={{maxWidth:"560px",margin:"0 auto"}}>
        <NavBar current="/versus"/>
        <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"8px",padding:"12px 14px",marginBottom:"16px",lineHeight:"1.7"}}><div style={{fontFamily:"monospace",fontSize:"7px",letterSpacing:"0.3em",color:"rgba(255,107,107,0.4)",marginBottom:"6px"}}>VERSUS — SISTEMA PvP</div><div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)"}}>Registra el resultado de <strong style={{color:"#FF6B6B"}}>3 batallas</strong> contra cualquier rival del clan. Cada set registrado suma <strong style={{color:"#A8FF78"}}>+1 pt</strong> (máx. 5 desafíos/día). El rival debe confirmar — si refuta, puedes presentar un <strong style={{color:"#FFD700"}}>claim</strong> que resuelven los administradores con videos. Resolución exitosa: <strong style={{color:"#A8FF78"}}>+5 pts para ambos</strong>.</div></div>
        
        <PageHeader page="/versus"/>
        <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"8px",padding:"12px 14px",marginBottom:"16px"}}>
          <div style={{fontFamily:"monospace",fontSize:"7px",letterSpacing:"0.3em",color:"rgba(255,107,107,0.4)",marginBottom:"6px"}}>VERSUS — PvP</div>
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",lineHeight:"1.7"}}>Registra resultados de 3 batallas contra rivales (+1 pt por set, máx 5/día). El rival confirma o refuta. Discrepancias se resuelven con video. Resolución exitosa: +5 pts para ambos.</div>
        </div>

        {isAdmin&&claimedAdmin.length>0&&(
          <div style={{marginBottom:"16px"}}>
            <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.2em",color:"rgba(255,215,0,0.6)",marginBottom:"8px"}}>CLAIMS PENDIENTES — ADMIN</div>
            {claimedAdmin.map(b=>(
              <div key={b.id} style={{background:"rgba(255,215,0,0.05)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:"8px",padding:"12px",marginBottom:"6px"}}>
                <div style={{fontSize:"12px",color:"#FFD700",marginBottom:"4px",fontFamily:"serif"}}>{b.challenger_name} vs {b.opponent_name}</div>
                <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"6px",fontFamily:"monospace"}}>{b.challenger_name}: {b.challenger_wins}V · {b.opponent_name}: {b.opponent_wins}V</div>
                <div style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",marginBottom:"8px"}}>Revisar videos en WhatsApp. Ambos reciben +5pts. ¿Quién tenía razón?</div>
                <div style={{display:"flex",gap:"6px"}}>
                  <button onClick={()=>resolveAdmin(b,true)} style={{flex:1,padding:"6px",background:"rgba(168,255,120,0.1)",border:"1px solid rgba(168,255,120,0.25)",borderRadius:"5px",color:"#A8FF78",fontSize:"9px",cursor:"pointer",fontFamily:"monospace"}}>{b.challenger_name} ✓</button>
                  <button onClick={()=>resolveAdmin(b,false)} style={{flex:1,padding:"6px",background:"rgba(64,224,255,0.1)",border:"1px solid rgba(64,224,255,0.25)",borderRadius:"5px",color:"#40E0FF",fontSize:"9px",cursor:"pointer",fontFamily:"monospace"}}>{b.opponent_name} ✓</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {pendingForMe.length>0&&(
          <div style={{marginBottom:"16px"}}>
            <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.2em",color:"rgba(255,107,107,0.6)",marginBottom:"8px"}}>RESULTADOS QUE DEBES CONFIRMAR</div>
            {pendingForMe.map(b=>(
              <div key={b.id} style={{background:"rgba(255,107,107,0.05)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:"8px",padding:"12px",marginBottom:"6px"}}>
                <div style={{fontSize:"13px",color:"#FF6B6B",marginBottom:"3px",fontFamily:"serif"}}>{b.challenger_name}</div>
                <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"8px",fontFamily:"monospace"}}>declara: ganó {b.challenger_wins} · perdió {b.opponent_wins} de 3 vs ti</div>
                <div style={{display:"flex",gap:"6px"}}>
                  <button onClick={()=>confirm(b)} style={{flex:1,padding:"7px",background:"rgba(168,255,120,0.1)",border:"1px solid rgba(168,255,120,0.25)",borderRadius:"5px",color:"#A8FF78",fontSize:"10px",cursor:"pointer",fontFamily:"monospace"}}>✓ CONFIRMAR (+1pt)</button>
                  <button onClick={()=>refute(b)} style={{flex:1,padding:"7px",background:"rgba(255,107,107,0.08)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:"5px",color:"#FF6B6B",fontSize:"10px",cursor:"pointer",fontFamily:"monospace"}}>✕ REFUTAR</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {disputedForMe.map(b=>(
          <div key={b.id} style={{background:"rgba(255,215,0,0.04)",border:"1px solid rgba(255,215,0,0.15)",borderRadius:"8px",padding:"12px",marginBottom:"8px"}}>
            <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,215,0,0.5)",marginBottom:"6px"}}>{b.opponent_name.toUpperCase()} REFUTÓ TU RESULTADO</div>
            <div style={{fontSize:"10px",color:"rgba(255,255,255,0.45)",marginBottom:"8px",lineHeight:"1.5"}}>Si tienes video sin cortes de las 5 batallas, presenta un claim. Si los videos son consistentes ambos reciben +5pts.</div>
            <button onClick={()=>submitClaim(b)} style={{width:"100%",padding:"7px",background:"rgba(255,215,0,0.08)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:"5px",color:"#FFD700",fontSize:"10px",cursor:"pointer",fontFamily:"monospace"}}>PRESENTAR CLAIM A ADMINISTRADORES</button>
          </div>
        ))}

        <div style={{background:"rgba(255,107,107,0.04)",border:"1px solid rgba(255,107,107,0.15)",borderRadius:"10px",padding:"16px",marginBottom:"16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
            <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.2em",color:"rgba(255,107,107,0.5)"}}>REGISTRAR 3 BATALLAS (+1pt)</div>
            {playerId&&<div style={{fontFamily:"monospace",fontSize:"8px",color:canChallenge?"rgba(255,255,255,0.25)":"rgba(255,107,107,0.6)"}}>{myTodayBattles.length}/5 hoy</div>}
          </div>
          {!playerId?<div style={{fontSize:"10px",color:"rgba(255,255,255,0.3)"}}>Inicia sesión para registrar batallas.</div>
          :!canChallenge?<div style={{fontSize:"10px",color:"rgba(255,107,107,0.5)",fontFamily:"monospace",textAlign:"center",padding:"8px"}}>LÍMITE DIARIO: 5 desafíos/día</div>
          :!formOpen?<button onClick={()=>setFormOpen(true)} style={{width:"100%",padding:"9px",background:"rgba(255,107,107,0.08)",border:"1px dashed rgba(255,107,107,0.25)",borderRadius:"6px",color:"rgba(255,107,107,0.6)",fontSize:"11px",cursor:"pointer",fontFamily:"monospace",letterSpacing:"0.1em"}}>+ REGISTRAR RESULTADO VS UN RIVAL</button>
          :(
            <div>
              <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,255,255,0.3)",marginBottom:"6px"}}>SELECCIONA TU RIVAL</div>
              <div style={{maxHeight:"150px",overflow:"auto",marginBottom:"10px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px"}}>
                {players.filter(p=>String(p.id)!==String(playerId)).map(p=>{
                  const h=h2h(p.name);
                  return<button key={p.id} onClick={()=>setOpponent(p)} style={{padding:"6px 8px",borderRadius:"5px",cursor:"pointer",textAlign:"left",background:opponent?.id===p.id?"rgba(255,107,107,0.12)":"rgba(255,255,255,0.02)",border:"1px solid "+(opponent?.id===p.id?"rgba(255,107,107,0.3)":"rgba(255,255,255,0.06)"),color:opponent?.id===p.id?"#FF6B6B":"rgba(255,255,255,0.5)",fontSize:"11px",fontFamily:"Georgia,serif"}}>
                    <div>{p.name}</div>
                    {h.sets>0&&<div style={{fontSize:"8px",color:"rgba(255,255,255,0.25)",fontFamily:"monospace"}}>{h.mW}V-{h.rW}D</div>}
                  </button>;
                })}
              </div>
              {opponent&&(<>
                <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,255,255,0.3)",marginBottom:"6px"}}>¿CUÁNTAS DE LAS 3 GANASTE vs {opponent.name.toUpperCase()}?</div>
                <div style={{display:"flex",gap:"5px",marginBottom:"10px"}}>
                  {[0,1,2,3].map(n=><button key={n} onClick={()=>setMyWins(n)} style={{flex:1,padding:"10px 2px",borderRadius:"6px",cursor:"pointer",background:myWins===n?"rgba(255,107,107,0.15)":"rgba(255,255,255,0.02)",border:"1px solid "+(myWins===n?"rgba(255,107,107,0.4)":"rgba(255,255,255,0.08)"),color:myWins===n?"#FF6B6B":"rgba(255,255,255,0.4)",fontFamily:"monospace",fontSize:"16px",fontWeight:"bold"}}>{n}</button>)}
                </div>
                {myWins!==null&&<div style={{fontSize:"10px",color:"rgba(255,255,255,0.3)",marginBottom:"8px",textAlign:"center",fontFamily:"monospace"}}>Tú {myWins}V · {opponent.name} {3-myWins}V</div>}
              </>)}
              {msg&&<div style={{fontSize:"10px",color:msg.startsWith("✓")?"#A8FF78":"#FF6B6B",marginBottom:"6px"}}>{msg}</div>}
              <div style={{display:"flex",gap:"6px"}}>
                <button onClick={submitBattle} disabled={!opponent||myWins===null||saving} style={{flex:1,padding:"8px",background:opponent&&myWins!==null?"rgba(168,255,120,0.12)":"rgba(255,255,255,0.03)",border:"1px solid "+(opponent&&myWins!==null?"rgba(168,255,120,0.3)":"rgba(255,255,255,0.07)"),borderRadius:"6px",color:opponent&&myWins!==null?"#A8FF78":"rgba(255,255,255,0.2)",fontSize:"11px",cursor:"pointer",fontFamily:"monospace"}}>{saving?"...":"ENVIAR (+1pt)"}</button>
                <button onClick={()=>{setFormOpen(false);setOpponent(null);setMyWins(null);}} style={{padding:"8px 12px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"6px",color:"rgba(255,255,255,0.3)",fontSize:"11px",cursor:"pointer"}}>✕</button>
              </div>
            </div>
          )}
        </div>

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
                  <span style={{color:"#A8FF78"}}>{r.w}V</span><span style={{color:"rgba(255,255,255,0.2)"}}>/</span><span style={{color:"#FF6B6B"}}>{r.l}D</span>
                  <span style={{color:"rgba(255,255,255,0.2)",fontSize:"8px"}}> {r.sets}sets</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {myBattles.length>0&&(
          <div>
            <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.2em",color:"rgba(255,255,255,0.25)",marginBottom:"8px"}}>MIS BATALLAS</div>
            {myBattles.slice(0,15).map(b=>{
              const isC=String(b.challenger_id)===String(playerId);
              const cW=b.status==="confirmed_reversed"?b.opponent_wins:b.challenger_wins;
              const oW=b.status==="confirmed_reversed"?b.challenger_wins:b.opponent_wins;
              const mW=isC?cW:oW,thW=isC?oW:cW,rival=isC?b.opponent_name:b.challenger_name;
              const sc={confirmed:"#A8FF78",confirmed_reversed:"#40E0FF",disputed:"#FF6B6B",claimed:"#FFD700",pending:"rgba(255,215,0,0.5)"}[b.status]||"rgba(255,255,255,0.3)";
              return<div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",marginBottom:"3px",background:"rgba(255,255,255,0.02)",borderRadius:"6px",border:"1px solid rgba(255,255,255,0.05)"}}>
                <div>
                  <div style={{fontSize:"11px",color:"rgba(255,255,255,0.6)",fontFamily:"Georgia,serif"}}>vs {rival}</div>
                  <div style={{fontSize:"8px",fontFamily:"monospace",color:sc}}>{b.week} · {b.status}</div>
                </div>
                <div style={{fontFamily:"monospace",fontSize:"13px",fontWeight:"bold"}}>
                  <span style={{color:mW>thW?"#A8FF78":mW<thW?"#FF6B6B":"rgba(255,255,255,0.4)"}}>{mW}</span>
                  <span style={{color:"rgba(255,255,255,0.2)"}}> - </span>
                  <span style={{color:thW>mW?"#FF6B6B":"rgba(255,255,255,0.4)"}}>{thW}</span>
                </div>
              </div>;
            })}
          </div>
        )}
        {msg&&!formOpen&&<div style={{marginTop:"8px",fontSize:"10px",color:msg.startsWith("✓")?"#A8FF78":"#FF6B6B",fontFamily:"monospace"}}>{msg}</div>}
      </div>
      <NalguitasFooter/>
    </div>
  );
}

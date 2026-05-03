import { LoadingScreen } from "./LoadingScreen";
import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { awardPts, revokePts } from "./PtsLedger";
import { PTS } from "./GameRules";
import NavBar from "./NavBar";
import PageHeader from "./PageHeader";
import NalguitasFooter from "./NalguitasFooter";

function getWarWeek(){const now=new Date(),ec=new Date(now.getTime()-5*3600000);const fri=new Date(ec);fri.setDate(ec.getDate()-((ec.getDay()+2)%7));const y=fri.getFullYear(),w=Math.ceil(((fri-new Date(y,0,1))/86400000+1)/7);return`${y}-W${w}`;}
function getMonth(){return new Date().toISOString().slice(0,7);}
function today(){return new Date().toISOString().slice(0,10);}


export default function Versus(){
  const [players,setPlayers]=useState([]);
  const [battles,setBattles]=useState([]);
  const [loading,setLoading]=useState(true);
  const [msg,setMsg]=useState("");
  const [saving,setSaving]=useState(false);
  const [showHow,setShowHow]=useState(false);
  const [formOpen,setFormOpen]=useState(false);
  const [opponent,setOpponent]=useState(null);
  const [myWins,setMyWins]=useState(null);
  const [dudoOpen,setDudoOpen]=useState(false);
  const [dudoBattle,setDudoBattle]=useState(null);
  const [dudoWins,setDudoWins]=useState(null);
  const playerId=sessionStorage.getItem("aor_player_id");
  const playerName=sessionStorage.getItem("aor_player_name");
  const week=getWarWeek();
  const month=getMonth();

  async function load(){try{const[p,b]=await Promise.all([supabase.from("players").select("id,name,pts_acumulados,clan_role").eq("active",true).order("name"),supabase.from("pvp_battles").select("*").order("created_at",{ascending:false}).limit(500)]);setPlayers(p.data||[]);setBattles(b.data||[]);}catch(e){}setLoading(false);}
  useEffect(()=>{load();},[]);

  const myTodayBattles=battles.filter(b=>String(b.challenger_id)===String(playerId)&&(b.created_at||"").slice(0,10)===today());
  const canChallenge=playerId&&myTodayBattles.length<5;
  function alreadyFoughtToday(opId){return battles.some(b=>String(b.challenger_id)===String(playerId)&&String(b.opponent_id)===String(opId)&&(b.created_at||"").slice(0,10)===today());}
  function alreadyDudoToday(battle){return battles.some(b=>b.id!==battle.id&&String(b.opponent_id)===String(playerId)&&String(b.challenger_id)===String(battle.challenger_id)&&b.status==="disputed"&&(b.created_at||"").slice(0,10)===today());}

  async function submitBattle(){
    if(!playerId||!opponent||myWins===null||saving)return;
    if(!canChallenge){setMsg("Límite de 5 desafíos diarios.");return;}
    if(alreadyFoughtToday(opponent.id)){setMsg(`Ya registraste batalla vs ${opponent.name} hoy.`);return;}
    setSaving(true);
    const{error}=await supabase.from("pvp_battles").insert({challenger_id:parseInt(playerId),challenger_name:playerName,opponent_id:opponent.id,opponent_name:opponent.name,challenger_wins:myWins,opponent_wins:3-myWins,week,month,status:"pending",created_at:new Date().toISOString()});
    if(error){setMsg("Error: "+error.message);setSaving(false);return;}
    // +1pt for registering, +1pt extra if won majority (2+)
    const regPts=myWins>=2?2:1;
    await awardPts(playerId,regPts,"pvp_registro",`vs ${opponent?.name}`);
    // +1pt to declared winner (if not tie)
    // majority bonus already in regPts // challenger won majority, already counted above
    await load();
    setMsg(`✓ Batalla registrada (+${regPts}pt). ${opponent.name} debe confirmar o DUDAR.`);
    setSaving(false);setFormOpen(false);setOpponent(null);setMyWins(null);
    setTimeout(()=>setMsg(""),7000);
  }

  async function confirm(b){
    await supabase.from("pvp_battles").update({status:"confirmed"}).eq("id",b.id);
    await awardPts(b.opponent_id,1,"pvp_confirmo",`vs ${b.challenger_name}`);
    // +1pt to winner (opponent wins if challenger_wins < 2)
    if(b.opponent_wins>=2) await awardPts(b.opponent_id,1,"pvp_ganador",`vs ${b.challenger_name}`);
    await load();
  }

  async function submitDudo(){
    if(!dudoBattle||dudoWins===null||saving)return;
    if(alreadyDudoToday(dudoBattle)){setMsg("Solo puedes DUDAR una vez por día contra el mismo jugador.");return;}
    setSaving(true);
    const dudoLosses=5-dudoWins;
    await supabase.from("pvp_battles").update({status:"disputed",disc_wins:dudoWins,disc_losses:dudoLosses}).eq("id",dudoBattle.id);
    // If disputant wins majority (3+): +3pts to disputant, revoke challenger's pts
    if(dudoWins>=3){
      await awardPts(dudoBattle.opponent_id,3,"pvp_dudo_exitoso",`vs ${dudoBattle.challenger_name}`);
      const challPts=dudoBattle.challenger_wins>=2?2:1;
      await revokePts(dudoBattle.challenger_id,challPts,"penalizacion",`DUDO perdido vs ${dudoBattle.opponent_name}`);
    }
    await load();
    const out=dudoWins>=3?`DUDO exitoso — +3pts para ti, se anulan los puntos del desafiador.`:`El desafiador decide si acepta o escala a admins.`;
    setMsg(`DUDO registrado: ${dudoWins}V de 5. ${out}`);
    setSaving(false);setDudoOpen(false);setDudoBattle(null);setDudoWins(null);
    setTimeout(()=>setMsg(""),8000);
  }

  async function acceptDudo(b){
    await supabase.from("pvp_battles").update({status:"disc_accepted"}).eq("id",b.id);
    await awardPts(b.challenger_id,1,"pvp_acepto_dudo",`vs ${b.opponent_name}`);
    await load();
    setMsg("DUDO aceptado. +1pt para ti.");
    setTimeout(()=>setMsg(""),5000);
  }

  async function submitClaim(b){
    await supabase.from("pvp_battles").update({status:"claimed"}).eq("id",b.id);
    await awardPts(b.challenger_id,5,"pvp_escalo",`vs ${b.opponent_name}`);
    try{await supabase.from("clan_news").insert({type:"requerimiento",title:`DUDO ESCALADO — ${b.challenger_name} vs ${b.opponent_name}`,body:`${b.challenger_name} escala el DUDO a admins. Original: ${b.challenger_wins}V de 3. DUDO de ${b.opponent_name}: ${b.disc_wins||"?"}V de 5. Se requieren videos sin cortes en WhatsApp. El que gane las 5 en video recibe +5pts.`,author:"Sistema Versus",target:"admin",completions:[]});}catch(e){}
    await load();
    setMsg("Escalado a admins (+5pts). Envía tu video en WhatsApp.");
    setTimeout(()=>setMsg(""),7000);
  }

  const myPlayer=players.find(p=>String(p.id)===String(playerId));
  const isAdmin=["Líder","Co-Líder"].includes(myPlayer?.clan_role);

  async function resolveAdmin(b,challWins){
    await supabase.from("pvp_battles").update({status:challWins?"confirmed":"confirmed_reversed"}).eq("id",b.id);
    await awardPts(challWins?b.challenger_id:b.opponent_id,5,"pvp_gano_video",`admin resolvió`);
    await load();
  }

  // Weekly & monthly ranking bonuses (run once per week/month)
  async function checkRankingBonuses(){
    // This would need to run at period close - handled by admin via weeklyReset
    // For now just display rankings
  }

  const pendingForMe=battles.filter(b=>String(b.opponent_id)===String(playerId)&&b.status==="pending");
  const dudoForMe=battles.filter(b=>String(b.challenger_id)===String(playerId)&&b.status==="disputed");
  const claimedAdmin=battles.filter(b=>b.status==="claimed");

  // Rankings: all battles (confirmed)
  const allConf=battles.filter(b=>b.status==="confirmed"||b.status==="confirmed_reversed");
  function buildRecord(bList){
    const r={};
    bList.forEach(b=>{const cW=b.status==="confirmed_reversed"?b.opponent_wins:b.challenger_wins;const oW=b.status==="confirmed_reversed"?b.challenger_wins:b.opponent_wins;if(!r[b.challenger_name])r[b.challenger_name]={w:0,l:0};if(!r[b.opponent_name])r[b.opponent_name]={w:0,l:0};r[b.challenger_name].w+=cW;r[b.challenger_name].l+=oW;r[b.opponent_name].w+=oW;r[b.opponent_name].l+=cW;});
    return Object.entries(r).sort((a,b)=>b[1].w-a[1].w||a[1].l-b[1].l);
  }
  const rankGeneral=buildRecord(allConf); // ALL confirmed battles
  const rankWeek=buildRecord(allConf.filter(b=>b.week===week)); // current week
  const rankMonth=buildRecord(allConf.filter(b=>(b.created_at||"").slice(0,7)===month)); // current month from created_at

  // Dudo stats: who has most duds
  const dudoCounts={};
  battles.filter(b=>b.status==="disputed"||b.status==="disc_accepted"||b.status==="claimed").forEach(b=>{dudoCounts[b.opponent_name]=(dudoCounts[b.opponent_name]||0)+1;});
  const topDudo=Object.entries(dudoCounts).sort((a,b)=>b[1]-a[1]).slice(0,3);

  const dudoResolved=battles.filter(b=>b.status==="disc_accepted"||b.status==="confirmed_reversed");
  const dudoPending=battles.filter(b=>b.status==="disputed"||b.status==="claimed");

  const lbl={fontFamily:"monospace",fontSize:"7px",letterSpacing:"0.25em",color:"rgba(255,255,255,0.25)",marginBottom:"6px"};
  const statusColors={confirmed:"#A8FF78",confirmed_reversed:"#40E0FF",disputed:"#FFD700",claimed:"#FF9F43",disc_accepted:"#A8FF78",pending:"rgba(255,255,255,0.3)"};
  const statusLabels={confirmed:"confirmado",confirmed_reversed:"confirmado",disputed:"DUDO activo",claimed:"escalado a admin",disc_accepted:"DUDO resuelto",pending:"pendiente"};

  if(loading)return <LoadingScreen page="/versus"/>;

  return(
    <div style={{minHeight:"100vh",background:"#0d0d0f",fontFamily:"Georgia,serif",color:"#d4c9a8",padding:"20px",paddingBottom:"50px"}}>
      <div style={{maxWidth:"560px",margin:"0 auto"}}>
        <NavBar current="/versus"/>
        <PageHeader page="/versus"/>

        {/* Admin claims */}
        {isAdmin&&claimedAdmin.length>0&&(
          <div style={{marginBottom:"16px"}}>
            <div style={lbl}>⚠ ESCALADOS A ADMIN</div>
            {claimedAdmin.map(b=>(
              <div key={b.id} style={{background:"rgba(255,215,0,0.05)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:"8px",padding:"12px",marginBottom:"6px"}}>
                <div style={{fontSize:"11px",color:"#FFD700",marginBottom:"3px",fontFamily:"monospace"}}>{b.challenger_name} vs {b.opponent_name}</div>
                <div style={{fontSize:"9px",color:"rgba(255,255,255,0.4)",marginBottom:"8px",fontFamily:"monospace"}}>Original: {b.challenger_wins}V de 3 · DUDO: {b.disc_wins||"?"}V de 5</div>
                <div style={{display:"flex",gap:"6px"}}>
                  <button onClick={()=>resolveAdmin(b,true)} style={{flex:1,padding:"6px",background:"rgba(168,255,120,0.1)",border:"1px solid rgba(168,255,120,0.25)",borderRadius:"5px",color:"#A8FF78",fontSize:"9px",cursor:"pointer",fontFamily:"monospace"}}>✓ {b.challenger_name} tenía razón</button>
                  <button onClick={()=>resolveAdmin(b,false)} style={{flex:1,padding:"6px",background:"rgba(64,224,255,0.1)",border:"1px solid rgba(64,224,255,0.25)",borderRadius:"5px",color:"#40E0FF",fontSize:"9px",cursor:"pointer",fontFamily:"monospace"}}>✓ {b.opponent_name} tenía razón</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pending for me */}
        {pendingForMe.length>0&&(
          <div style={{marginBottom:"16px"}}>
            <div style={lbl}>CONFIRMAR O DUDAR</div>
            {pendingForMe.map(b=>(
              <div key={b.id} style={{background:"rgba(255,107,107,0.05)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:"8px",padding:"12px",marginBottom:"6px"}}>
                <div style={{fontSize:"12px",color:"#FF6B6B",marginBottom:"3px",fontFamily:"serif"}}>{b.challenger_name}</div>
                <div style={{fontSize:"10px",color:"rgba(255,255,255,0.45)",marginBottom:"8px",fontFamily:"monospace"}}>ganó {b.challenger_wins} · perdió {b.opponent_wins} de 3 vs ti</div>
                <div style={{display:"flex",gap:"6px"}}>
                  <button onClick={()=>confirm(b)} style={{flex:1,padding:"7px",background:"rgba(168,255,120,0.1)",border:"1px solid rgba(168,255,120,0.25)",borderRadius:"5px",color:"#A8FF78",fontSize:"10px",cursor:"pointer",fontFamily:"monospace"}}>✓ CONFIRMAR (+1pt)</button>
                  <button onClick={()=>{if(alreadyDudoToday(b)){setMsg("Ya DUDASTE hoy vs este jugador.");return;}setDudoBattle(b);setDudoOpen(true);setDudoWins(null);}} style={{flex:1,padding:"7px",background:"rgba(255,215,0,0.08)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:"5px",color:"#FFD700",fontSize:"10px",cursor:"pointer",fontFamily:"monospace"}}>🎲 DUDO</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dudo form */}
        {dudoOpen&&dudoBattle&&(
          <div style={{background:"rgba(255,215,0,0.05)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:"8px",padding:"14px",marginBottom:"16px"}}>
            <div style={lbl}>🎲 DUDO — 5 BATALLAS vs {(dudoBattle.challenger_name||"").toUpperCase()}</div>
            <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"10px"}}>¿Cuántas de las 5 batallas ganaste tú?</div>
            <div style={{display:"flex",gap:"4px",marginBottom:"10px"}}>
              {[0,1,2,3,4,5].map(n=>(
                <button key={n} onClick={()=>setDudoWins(n)} style={{flex:1,padding:"8px 2px",borderRadius:"6px",cursor:"pointer",background:dudoWins===n?"rgba(255,215,0,0.15)":"rgba(255,255,255,0.02)",border:"1px solid "+(dudoWins===n?"rgba(255,215,0,0.4)":"rgba(255,255,255,0.08)"),color:dudoWins===n?"#FFD700":"rgba(255,255,255,0.4)",fontFamily:"monospace",fontSize:"14px",fontWeight:"bold"}}>{n}</button>
              ))}
            </div>
            {dudoWins!==null&&<div style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",marginBottom:"8px",textAlign:"center",fontFamily:"monospace"}}>Tú: {dudoWins}V · {dudoBattle.challenger_name}: {5-dudoWins}V{dudoWins>=3?" → DUDO exitoso (+3pts para ti)":""}</div>}
            <div style={{display:"flex",gap:"6px"}}>
              <button onClick={submitDudo} disabled={dudoWins===null||saving} style={{flex:1,padding:"8px",background:dudoWins!==null?"rgba(255,215,0,0.12)":"rgba(255,255,255,0.03)",border:"1px solid "+(dudoWins!==null?"rgba(255,215,0,0.3)":"rgba(255,255,255,0.07)"),borderRadius:"6px",color:dudoWins!==null?"#FFD700":"rgba(255,255,255,0.2)",fontSize:"11px",cursor:"pointer",fontFamily:"monospace"}}>{saving?"...":"🎲 CONFIRMAR DUDO"}</button>
              <button onClick={()=>{setDudoOpen(false);setDudoBattle(null);setDudoWins(null);}} style={{padding:"8px 12px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"6px",color:"rgba(255,255,255,0.3)",fontSize:"11px",cursor:"pointer"}}>✕</button>
            </div>
          </div>
        )}

        {/* Dudo challenged me */}
        {dudoForMe.map(b=>(
          <div key={b.id} style={{background:"rgba(255,107,107,0.04)",border:"1px solid rgba(255,107,107,0.15)",borderRadius:"8px",padding:"12px",marginBottom:"8px"}}>
            <div style={lbl}>🎲 {(b.opponent_name||"").toUpperCase()} DUDÓ TU RESULTADO</div>
            <div style={{fontSize:"10px",color:"rgba(255,255,255,0.45)",marginBottom:"8px"}}>Su versión: {b.disc_wins||"?"}V de 5 · Tu registro: {b.challenger_wins}V de 3</div>
            <div style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",marginBottom:"8px",lineHeight:"1.5"}}>Si aceptas: +1pt para ti. Si escala a admins: +5pts para ti, el que gana en video se lleva todo.</div>
            <div style={{display:"flex",gap:"6px"}}>
              <button onClick={()=>acceptDudo(b)} style={{flex:1,padding:"7px",background:"rgba(168,255,120,0.08)",border:"1px solid rgba(168,255,120,0.2)",borderRadius:"5px",color:"#A8FF78",fontSize:"9px",cursor:"pointer",fontFamily:"monospace"}}>ACEPTAR (+1pt)</button>
              <button onClick={()=>submitClaim(b)} style={{flex:1,padding:"7px",background:"rgba(255,159,67,0.08)",border:"1px solid rgba(255,159,67,0.2)",borderRadius:"5px",color:"#FF9F43",fontSize:"9px",cursor:"pointer",fontFamily:"monospace"}}>ESCALAR A ADMIN (+5pts)</button>
            </div>
          </div>
        ))}

        {/* Register battle */}
        <div style={{background:"rgba(255,107,107,0.04)",border:"1px solid rgba(255,107,107,0.15)",borderRadius:"10px",padding:"16px",marginBottom:"8px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
            <div style={lbl}>REGISTRAR vs RIVAL</div>
            {playerId&&<div style={{fontFamily:"monospace",fontSize:"8px",color:canChallenge?"rgba(255,255,255,0.2)":"rgba(255,107,107,0.6)"}}>{myTodayBattles.length}/5 hoy</div>}
          </div>
          {!playerId?<div style={{fontSize:"10px",color:"rgba(255,255,255,0.3)"}}>Inicia sesión para registrar batallas.</div>
          :!canChallenge?<div style={{fontSize:"10px",color:"rgba(255,107,107,0.5)",fontFamily:"monospace",textAlign:"center",padding:"8px"}}>LÍMITE DIARIO: 5/día</div>
          :!formOpen?<button onClick={()=>setFormOpen(true)} style={{width:"100%",padding:"9px",background:"rgba(255,107,107,0.08)",border:"1px dashed rgba(255,107,107,0.25)",borderRadius:"6px",color:"rgba(255,107,107,0.6)",fontSize:"11px",cursor:"pointer",fontFamily:"monospace",letterSpacing:"0.1em"}}>+ REGISTRAR vs RIVAL</button>
          :(
            <div>
              <div style={lbl}>SELECCIONA TU RIVAL</div>
              <div style={{maxHeight:"150px",overflow:"auto",marginBottom:"10px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px"}}>
                {players.filter(p=>String(p.id)!==String(playerId)).map(p=>(
                  <button key={p.id} onClick={()=>!alreadyFoughtToday(p.id)&&setOpponent(p)} style={{padding:"6px 8px",borderRadius:"5px",cursor:alreadyFoughtToday(p.id)?"not-allowed":"pointer",textAlign:"left",background:opponent?.id===p.id?"rgba(255,107,107,0.12)":alreadyFoughtToday(p.id)?"rgba(255,255,255,0.01)":"rgba(255,255,255,0.02)",border:"1px solid "+(opponent?.id===p.id?"rgba(255,107,107,0.3)":"rgba(255,255,255,0.06)"),color:opponent?.id===p.id?"#FF6B6B":alreadyFoughtToday(p.id)?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.5)",fontSize:"11px",fontFamily:"Georgia,serif"}}>
                    {p.name}{alreadyFoughtToday(p.id)&&<span style={{fontSize:"8px",color:"rgba(255,255,255,0.2)"}}> ✓hoy</span>}
                  </button>
                ))}
              </div>
              {opponent&&(<>
                <div style={lbl}>¿CUÁNTAS DE 3 GANASTE vs {(opponent.name||"").toUpperCase()}?</div>
                <div style={{display:"flex",gap:"5px",marginBottom:"8px"}}>
                  {[0,1,2,3].map(n=><button key={n} onClick={()=>setMyWins(n)} style={{flex:1,padding:"10px 2px",borderRadius:"6px",cursor:"pointer",background:myWins===n?"rgba(255,107,107,0.15)":"rgba(255,255,255,0.02)",border:"1px solid "+(myWins===n?"rgba(255,107,107,0.4)":"rgba(255,255,255,0.08)"),color:myWins===n?"#FF6B6B":"rgba(255,255,255,0.4)",fontFamily:"monospace",fontSize:"16px",fontWeight:"bold"}}>{n}</button>)}
                </div>
                {myWins!==null&&<div style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",marginBottom:"8px",textAlign:"center",fontFamily:"monospace"}}>Tú {myWins}V · {opponent.name} {3-myWins}V · {myWins>=2?"+2pts":"+1pt"}</div>}
              </>)}
              {msg&&<div style={{fontSize:"10px",color:msg.startsWith("✓")?"#A8FF78":"#FF6B6B",marginBottom:"6px"}}>{msg}</div>}
              <div style={{display:"flex",gap:"6px"}}>
                <button onClick={submitBattle} disabled={!opponent||myWins===null||saving} style={{flex:1,padding:"8px",background:opponent&&myWins!==null?"rgba(168,255,120,0.12)":"rgba(255,255,255,0.03)",border:"1px solid "+(opponent&&myWins!==null?"rgba(168,255,120,0.3)":"rgba(255,255,255,0.07)"),borderRadius:"6px",color:opponent&&myWins!==null?"#A8FF78":"rgba(255,255,255,0.2)",fontSize:"11px",cursor:"pointer",fontFamily:"monospace"}}>{saving?"...":"ENVIAR"}</button>
                <button onClick={()=>{setFormOpen(false);setOpponent(null);setMyWins(null);}} style={{padding:"8px 12px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"6px",color:"rgba(255,255,255,0.3)",fontSize:"11px",cursor:"pointer"}}>✕</button>
              </div>
            </div>
          )}
        </div>
        {/* How it works button */}
        <button onClick={()=>setShowHow(!showHow)} style={{width:"100%",padding:"7px",marginBottom:"16px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"6px",color:"rgba(255,255,255,0.3)",fontSize:"10px",cursor:"pointer",fontFamily:"monospace",letterSpacing:"0.1em"}}>{showHow?"▲ CERRAR":"▼ CÓMO FUNCIONA"}</button>
        {showHow&&(
          <div style={{background:"rgba(255,215,0,0.04)",border:"1px solid rgba(255,215,0,0.15)",borderRadius:"8px",padding:"14px",marginBottom:"16px"}}>
            <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.2em",color:"rgba(255,215,0,0.5)",marginBottom:"10px"}}>🎲 VERSUS — REGLAS (inspirado en el juego Dudo)</div>
            <div style={{fontSize:"10px",color:"rgba(255,255,255,0.5)",lineHeight:"1.8"}}>
              <div style={{marginBottom:"6px"}}><strong style={{color:"#FF6B6B"}}>Registrar:</strong> Declara el resultado de 3 batallas vs un rival. Por registrar ganas <strong style={{color:"#A8FF78"}}>+1pt</strong>. Si ganaste 2 o 3 de las 3, ganas <strong style={{color:"#A8FF78"}}>+2pts</strong>. Solo 1 batalla por rival/día, máx. 5/día.</div>
              <div style={{marginBottom:"6px"}}><strong style={{color:"#A8FF78"}}>Confirmar:</strong> El rival acepta los resultados y gana <strong style={{color:"#A8FF78"}}>+1pt</strong>. El ganador declarado gana también <strong style={{color:"#A8FF78"}}>+1pt</strong> extra.</div>
              <div style={{marginBottom:"6px"}}><strong style={{color:"#FFD700"}}>🎲 DUDO:</strong> Como en el juego de dados — si dudas del resultado, debes demostrar tus propios resultados de <strong style={{color:"#FFD700"}}>5 batallas</strong>. Si ganas la mayoría (3+), ganas <strong style={{color:"#FFD700"}}>+3pts</strong> y se anulan los puntos del desafiador. Solo 1 DUDO por rival/día.</div>
              <div style={{marginBottom:"6px"}}><strong style={{color:"#FF9F43"}}>Escalar a admins:</strong> Si el desafiador no acepta el DUDO, escala con videos — gana <strong style={{color:"#FF9F43"}}>+5pts</strong>. Ambos envían videos de 5 batallas al WhatsApp del clan. El que gane en video se lleva <strong style={{color:"#FF9F43"}}>+5pts</strong> y el otro 0.</div>
              <div><strong style={{color:"#40E0FF"}}>Rankings:</strong> El ganador del ranking <strong style={{color:"#40E0FF"}}>semanal</strong> recibe <strong style={{color:"#40E0FF"}}>+5pts</strong>. El ganador del ranking <strong style={{color:"#40E0FF"}}>mensual</strong> recibe <strong style={{color:"#40E0FF"}}>+10pts</strong>.</div>
            </div>
          </div>
        )}

        {/* All battles - scrollable after 10 */}
        {battles.length>0&&(
          <div style={{marginBottom:"16px"}}>
            <div style={lbl}>TODAS LAS BATALLAS — MÁS RECIENTES PRIMERO</div>
            <div style={{maxHeight:battles.length>10?"400px":"auto",overflow:battles.length>10?"auto":"visible",paddingRight:battles.length>10?"4px":"0"}}>
              {battles.map(b=>(
                <div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",marginBottom:"3px",background:"rgba(255,255,255,0.02)",borderRadius:"6px",border:"1px solid rgba(255,255,255,0.05)"}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:"11px",color:"rgba(255,255,255,0.7)",fontFamily:"monospace"}}>{b.challenger_name} <span style={{color:"rgba(255,255,255,0.3)"}}>vs</span> {b.opponent_name}</div>
                    <div style={{fontSize:"8px",fontFamily:"monospace",color:statusColors[b.status]||"rgba(255,255,255,0.3)"}}>{b.week} · {statusLabels[b.status]||b.status}</div>
                  </div>
                  <div style={{fontFamily:"monospace",fontSize:"13px",fontWeight:"bold",textAlign:"right"}}>
                    <span style={{color:"#A8FF78"}}>{b.challenger_wins}</span><span style={{color:"rgba(255,255,255,0.2)"}}> - </span><span style={{color:"#FF6B6B"}}>{b.opponent_wins}</span>
                    {b.disc_wins!=null&&<div style={{fontSize:"8px",color:"#FFD700"}}>🎲{b.disc_wins}-{b.disc_losses}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dudo tracker */}
        <div style={{marginBottom:"16px"}}>
          <div style={lbl}>🎲 DUDOS — REGISTRO Y ESTADO</div>
          {dudoPending.length>0&&(
            <div style={{marginBottom:"8px"}}>
              <div style={{fontFamily:"monospace",fontSize:"7px",color:"rgba(255,215,0,0.4)",marginBottom:"4px",letterSpacing:"0.2em"}}>EN TRÁMITE</div>
              {dudoPending.map(b=>(
                <div key={b.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 10px",marginBottom:"3px",background:"rgba(255,215,0,0.04)",borderRadius:"5px",border:"1px solid rgba(255,215,0,0.15)"}}>
                  <div>
                    <div style={{fontSize:"10px",color:"#FFD700",fontFamily:"monospace"}}>{b.challenger_name} vs {b.opponent_name}</div>
                    <div style={{fontSize:"8px",color:"rgba(255,255,255,0.3)",fontFamily:"monospace"}}>{b.disc_wins!=null?`DUDO: ${b.disc_wins}V de 5`:""} · {b.status==="claimed"?"Escalado a admin — esperando videos":"Esperando respuesta del desafiador"}</div>
                  </div>
                  <div style={{fontSize:"8px",color:b.status==="claimed"?"#FF9F43":"#FFD700",fontFamily:"monospace",textAlign:"right"}}>{b.status==="claimed"?"📹 VIDEOS":"⏳"}</div>
                </div>
              ))}
            </div>
          )}
          {dudoResolved.length>0&&(
            <div style={{marginBottom:"8px"}}>
              <div style={{fontFamily:"monospace",fontSize:"7px",color:"rgba(168,255,120,0.4)",marginBottom:"4px",letterSpacing:"0.2em"}}>RESUELTOS</div>
              {dudoResolved.map(b=>(
                <div key={b.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 10px",marginBottom:"2px",background:"rgba(168,255,120,0.03)",borderRadius:"5px"}}>
                  <div style={{fontSize:"10px",color:"rgba(255,255,255,0.5)",fontFamily:"monospace"}}>{b.challenger_name} vs {b.opponent_name}</div>
                  <div style={{fontSize:"8px",color:"#A8FF78",fontFamily:"monospace"}}>{b.status==="disc_accepted"?"Aceptado":"Resuelto"}</div>
                </div>
              ))}
            </div>
          )}
          {topDudo.length>0&&(
            <div style={{padding:"8px 10px",background:"rgba(255,107,107,0.04)",borderRadius:"6px",border:"1px solid rgba(255,107,107,0.1)"}}>
              <div style={{fontFamily:"monospace",fontSize:"7px",color:"rgba(255,107,107,0.4)",marginBottom:"4px",letterSpacing:"0.2em"}}>MÁS DUDOS PLANTEADOS</div>
              {topDudo.map(([name,count],i)=>(
                <div key={name} style={{display:"flex",justifyContent:"space-between",fontSize:"10px",padding:"2px 0"}}>
                  <span style={{color:"rgba(255,255,255,0.5)",fontFamily:"Georgia,serif"}}>{i+1}. {name}</span>
                  <span style={{color:"#FF6B6B",fontFamily:"monospace"}}>{count} dudo{count!==1?"s":""}</span>
                </div>
              ))}
            </div>
          )}
          {dudoPending.length===0&&dudoResolved.length===0&&<div style={{fontSize:"10px",color:"rgba(255,255,255,0.2)",textAlign:"center",padding:"8px",fontFamily:"monospace"}}>Sin dudos registrados</div>}
        </div>

        {/* Rankings */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginBottom:"16px"}}>
          {[
            {title:"RANKING GENERAL",data:rankGeneral,bonus:""},
            {title:"RANKING SEMANA",data:rankWeek,bonus:"Top 1: +5pts"},
            {title:"RANKING MES",data:rankMonth,bonus:"Top 1: +10pts"},
          ].map(({title,data,bonus})=>(
            <div key={title} style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",padding:"10px"}}>
              <div style={{fontFamily:"monospace",fontSize:"6px",letterSpacing:"0.15em",color:"rgba(255,215,0,0.4)",marginBottom:"2px"}}>{title}</div>
              {bonus&&<div style={{fontFamily:"monospace",fontSize:"6px",color:"rgba(255,255,255,0.2)",marginBottom:"6px"}}>{bonus}</div>}
              {data.length===0?<div style={{fontSize:"9px",color:"rgba(255,255,255,0.2)",textAlign:"center"}}>—</div>
              :data.slice(0,5).map(([name,r],i)=>(
                <div key={name} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
                  <span style={{fontSize:"9px",color:i===0?"#FFD700":"rgba(255,255,255,0.5)",fontFamily:"Georgia,serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"70px"}}>{i+1}. {name}</span>
                  <span style={{fontSize:"9px",color:i===0?"#FFD700":"rgba(255,255,255,0.3)",fontFamily:"monospace",flexShrink:0}}>{r.w}V</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {msg&&!formOpen&&!dudoOpen&&<div style={{marginTop:"8px",fontSize:"10px",color:msg.startsWith("✓")||msg.startsWith("DUDO a")?"#A8FF78":"#FF9F43",fontFamily:"monospace"}}>{msg}</div>}
      </div>
      <NalguitasFooter/>
    </div>
  );
}

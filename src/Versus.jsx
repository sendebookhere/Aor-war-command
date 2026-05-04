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

  async function load(){
    try{
      const[p,b]=await Promise.all([
        supabase.from("players").select("id,name,pts_acumulados,clan_role").eq("active",true).order("name"),
        supabase.from("pvp_battles").select("*").order("created_at",{ascending:false}).limit(500),
      ]);
      setPlayers(p.data||[]);setBattles(b.data||[]);
    }catch(e){}
    setLoading(false);
  }
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
    const{error}=await supabase.from("pvp_battles").insert({
      challenger_id:parseInt(playerId),challenger_name:playerName,
      opponent_id:opponent.id,opponent_name:opponent.name,
      challenger_wins:myWins,opponent_wins:3-myWins,
      week,month,status:"pending",created_at:new Date().toISOString(),
    });
    if(error){setMsg("Error: "+error.message);setSaving(false);return;}
    const pts=myWins>=2?2:1;
    await awardPts(parseInt(playerId),pts,"pvp_registro",`vs ${opponent.name}`);
    await load();
    setMsg(`✓ Batalla registrada (+${pts}pt). ${opponent.name} debe confirmar o DUDAR.`);
    setSaving(false);setFormOpen(false);setOpponent(null);setMyWins(null);
    setTimeout(()=>setMsg(""),7000);
  }

  async function confirm(b){
    await supabase.from("pvp_battles").update({status:"confirmed"}).eq("id",b.id);
    await awardPts(parseInt(b.opponent_id),1,"pvp_confirmo",`vs ${b.challenger_name}`);
    if(b.opponent_wins>=2) await awardPts(parseInt(b.opponent_id),1,"pvp_ganador",`vs ${b.challenger_name}`);
    await load();
  }

  async function submitDudo(){
    if(!dudoBattle||dudoWins===null||saving)return;
    if(alreadyDudoToday(dudoBattle)){setMsg("Solo puedes DUDAR una vez por día vs el mismo jugador.");return;}
    setSaving(true);
    await supabase.from("pvp_battles").update({status:"disputed",disc_wins:dudoWins,disc_losses:5-dudoWins}).eq("id",dudoBattle.id);
    if(dudoWins>=3){
      await awardPts(parseInt(dudoBattle.opponent_id),3,"pvp_dudo_exitoso",`vs ${dudoBattle.challenger_name}`);
      const challPts=dudoBattle.challenger_wins>=2?2:1;
      await revokePts(parseInt(dudoBattle.challenger_id),challPts,"penalizacion",`DUDO perdido vs ${dudoBattle.opponent_name}`);
    }
    await load();
    setMsg(dudoWins>=3?`DUDO exitoso — +3pts. Puntos del desafiador anulados.`:`DUDO registrado. El desafiador decide.`);
    setSaving(false);setDudoOpen(false);setDudoBattle(null);setDudoWins(null);
    setTimeout(()=>setMsg(""),8000);
  }

  async function acceptDudo(b){
    await supabase.from("pvp_battles").update({status:"disc_accepted"}).eq("id",b.id);
    await awardPts(parseInt(b.challenger_id),1,"pvp_acepto_dudo",`vs ${b.opponent_name}`);
    await load();
    setMsg("DUDO aceptado. +1pt.");setTimeout(()=>setMsg(""),5000);
  }

  async function submitClaim(b){
    await supabase.from("pvp_battles").update({status:"claimed"}).eq("id",b.id);
    await awardPts(parseInt(b.challenger_id),5,"pvp_escalo",`vs ${b.opponent_name}`);
    try{await supabase.from("clan_news").insert({type:"requerimiento",title:`DUDO ESCALADO — ${b.challenger_name} vs ${b.opponent_name}`,body:`${b.challenger_name} escala. Original: ${b.challenger_wins}V de 3. DUDO de ${b.opponent_name}: ${b.disc_wins||"?"}V de 5. Videos en WhatsApp. El que gane en video: +5pts.`,author:"Sistema Versus",target:"admin",completions:[]});}catch(e){}
    await load();
    setMsg("Escalado a admins (+5pts). Envía tu video en WhatsApp.");setTimeout(()=>setMsg(""),7000);
  }

  const myPlayer=players.find(p=>String(p.id)===String(playerId));
  const isAdmin=["Líder","Co-Líder"].includes(myPlayer?.clan_role);

  async function resolveAdmin(b,challWins){
    await supabase.from("pvp_battles").update({status:challWins?"confirmed":"confirmed_reversed"}).eq("id",b.id);
    await awardPts(parseInt(challWins?b.challenger_id:b.opponent_id),5,"pvp_gano_video",`admin resolvió`);
    await load();
  }

  async function awardPvpRankingBonus(type){
    const data=type==="weekly"?rankWeek:rankMonth;
    if(!data.length)return;
    const pts=type==="weekly"?5:10;
    const note=type==="weekly"?`Top 1 PvP semana ${week}`:`Top 1 PvP mes ${month}`;
    const topPlayer=players.find(p=>p.name===data[0][0]);
    if(!topPlayer)return;
    await awardPts(parseInt(topPlayer.id),pts,`ranking_${type}`,note);
    await load();
    setMsg(`✓ +${pts}pts a ${data[0][0]}`);setTimeout(()=>setMsg(""),5000);
  }

  const pendingForMe=battles.filter(b=>String(b.opponent_id)===String(playerId)&&b.status==="pending");
  const dudoForMe=battles.filter(b=>String(b.challenger_id)===String(playerId)&&b.status==="disputed");
  const claimedAdmin=battles.filter(b=>b.status==="claimed");

  // Rankings: count each battle result as individual wins/losses per player
  function buildRecord(bList){
    const r={};
    bList.filter(b=>b.status==="confirmed"||b.status==="confirmed_reversed"||b.status==="pending"||b.status==="disputed").forEach(b=>{
      const confirmed=b.status==="confirmed"||b.status==="confirmed_reversed";
      const cW=b.status==="confirmed_reversed"?b.opponent_wins:b.challenger_wins;
      const oW=b.status==="confirmed_reversed"?b.challenger_wins:b.opponent_wins;
      if(!r[b.challenger_name])r[b.challenger_name]={w:0,l:0,p:0};
      if(!r[b.opponent_name])r[b.opponent_name]={w:0,l:0,p:0};
      if(confirmed){
        r[b.challenger_name].w+=cW;r[b.challenger_name].l+=oW;
        r[b.opponent_name].w+=oW;r[b.opponent_name].l+=cW;
      }else{
        r[b.challenger_name].p++;r[b.opponent_name].p++;
      }
    });
    return r;
  }

  const allRecord=buildRecord(battles);
  const rankGeneral=Object.entries(allRecord).sort((a,b)=>b[1].w-a[1].w||a[1].l-b[1].l);
  const weekBattles=battles.filter(b=>b.week===week);
  const weekRecord=buildRecord(weekBattles);
  const rankWeek=Object.entries(weekRecord).sort((a,b)=>b[1].w-a[1].w||a[1].l-b[1].l);
  const monthBattles=battles.filter(b=>(b.created_at||"").slice(0,7)===month);
  const monthRecord=buildRecord(monthBattles);
  const rankMonth=Object.entries(monthRecord).sort((a,b)=>b[1].w-a[1].w||a[1].l-b[1].l);
  // Losers ranking
  const rankLosers=Object.entries(allRecord).filter(([,r])=>r.l>0).sort((a,b)=>b[1].l-a[1].l);

  const dudoPending=battles.filter(b=>b.status==="disputed"||b.status==="claimed");
  const dudoResolved=battles.filter(b=>b.status==="disc_accepted"||b.status==="confirmed_reversed");

  const C={red:"#FF6B6B",redA:"rgba(255,107,107,",green:"#A8FF78",greenA:"rgba(168,255,120,",gray:"rgba(255,255,255,0.3)",lbl:{fontFamily:"monospace",fontSize:"7px",letterSpacing:"0.25em",color:"rgba(255,255,255,0.25)",marginBottom:"6px"}};

  if(loading)return <LoadingScreen page="/versus"/>;

  return(
    <div style={{minHeight:"100vh",background:"#0d0d0f",fontFamily:"Georgia,serif",color:"#d4c9a8",padding:"20px",paddingBottom:"50px"}}>
      <div style={{maxWidth:"560px",margin:"0 auto"}}>
        <NavBar current="/versus"/>
        <PageHeader page="/versus"/>

        {/* Admin claims */}
        {isAdmin&&claimedAdmin.length>0&&(
          <div style={{marginBottom:"16px"}}>
            <div style={C.lbl}>⚠ ESCALADOS A ADMIN</div>
            {claimedAdmin.map(b=>(
              <div key={b.id} style={{background:"rgba(255,215,0,0.05)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:"8px",padding:"12px",marginBottom:"6px"}}>
                <div style={{fontSize:"11px",color:"#FF6B6B",marginBottom:"3px",fontFamily:"monospace"}}>{b.challenger_name} vs {b.opponent_name}</div>
                <div style={{fontSize:"9px",color:"rgba(255,255,255,0.4)",marginBottom:"8px",fontFamily:"monospace"}}>Original: {b.challenger_wins}V de 3 · DUDO: {b.disc_wins||"?"}V de 5</div>
                <div style={{display:"flex",gap:"6px"}}>
                  <button onClick={()=>resolveAdmin(b,true)} style={{flex:1,padding:"6px",background:C.greenA+"0.1)",border:`1px solid ${C.greenA}0.25)`,borderRadius:"5px",color:C.green,fontSize:"9px",cursor:"pointer",fontFamily:"monospace"}}>✓ {b.challenger_name}</button>
                  <button onClick={()=>resolveAdmin(b,false)} style={{flex:1,padding:"6px",background:"rgba(255,107,107,0.1)",border:"1px solid rgba(255,107,107,0.25)",borderRadius:"5px",color:"#FF6B6B",fontSize:"9px",cursor:"pointer",fontFamily:"monospace"}}>✓ {b.opponent_name}</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Confirm/Dudo pending */}
        {pendingForMe.length>0&&(
          <div style={{marginBottom:"16px"}}>
            <div style={C.lbl}>CONFIRMAR O DUDAR</div>
            {pendingForMe.map(b=>(
              <div key={b.id} style={{background:C.redA+"0.05)",border:`1px solid ${C.redA}0.2)`,borderRadius:"8px",padding:"12px",marginBottom:"6px"}}>
                <div style={{fontSize:"12px",color:C.red,marginBottom:"3px",fontFamily:"serif"}}>{b.challenger_name}</div>
                <div style={{fontSize:"10px",color:"rgba(255,255,255,0.45)",marginBottom:"8px",fontFamily:"monospace"}}>ganó {b.challenger_wins} · perdió {b.opponent_wins} de 3 vs ti</div>
                <div style={{display:"flex",gap:"6px"}}>
                  <button onClick={()=>confirm(b)} style={{flex:1,padding:"7px",background:C.greenA+"0.1)",border:`1px solid ${C.greenA}0.25)`,borderRadius:"5px",color:C.green,fontSize:"10px",cursor:"pointer",fontFamily:"monospace"}}>✓ CONFIRMAR (+1pt)</button>
                  <button onClick={()=>{if(alreadyDudoToday(b)){setMsg("Ya DUDASTE hoy vs este jugador.");return;}setDudoBattle(b);setDudoOpen(true);setDudoWins(null);}} style={{flex:1,padding:"7px",background:"rgba(255,107,107,0.08)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:"5px",color:"#FF6B6B",fontSize:"10px",cursor:"pointer",fontFamily:"monospace"}}>🎲 DUDAR</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dudo form */}
        {dudoOpen&&dudoBattle&&(
          <div style={{background:"rgba(255,215,0,0.05)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:"8px",padding:"14px",marginBottom:"16px"}}>
            <div style={C.lbl}>🎲 DUDO — 5 BATALLAS vs {(dudoBattle.challenger_name||"").toUpperCase()}</div>
            <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"10px"}}>¿Cuántas de las 5 ganaste tú?</div>
            <div style={{display:"flex",gap:"4px",marginBottom:"10px"}}>
              {[0,1,2,3,4,5].map(n=>(
                <button key={n} onClick={()=>setDudoWins(n)} style={{flex:1,padding:"8px 2px",borderRadius:"6px",cursor:"pointer",background:dudoWins===n?"rgba(255,107,107,0.12)":"rgba(255,255,255,0.02)",border:"1px solid "+(dudoWins===n?"rgba(255,107,107,0.35)":"rgba(255,255,255,0.08)"),color:dudoWins===n?"#FF6B6B":C.gray,fontFamily:"monospace",fontSize:"14px",fontWeight:"bold"}}>{n}</button>
              ))}
            </div>
            {dudoWins!==null&&<div style={{fontSize:"9px",color:C.gray,marginBottom:"8px",textAlign:"center",fontFamily:"monospace"}}>Tú: {dudoWins}V · {dudoBattle.challenger_name}: {5-dudoWins}V{dudoWins>=3?" → DUDO exitoso":""}</div>}
            <div style={{display:"flex",gap:"6px"}}>
              <button onClick={submitDudo} disabled={dudoWins===null||saving} style={{flex:1,padding:"8px",background:dudoWins!==null?"rgba(255,107,107,0.1)":"rgba(255,255,255,0.03)",border:"1px solid "+(dudoWins!==null?"rgba(255,107,107,0.3)":"rgba(255,255,255,0.07)"),borderRadius:"6px",color:dudoWins!==null?"#FF6B6B":C.gray,fontSize:"11px",cursor:"pointer",fontFamily:"monospace"}}>{saving?"...":"🎲 CONFIRMAR DUDO"}</button>
              <button onClick={()=>{setDudoOpen(false);setDudoBattle(null);setDudoWins(null);}} style={{padding:"8px 12px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"6px",color:C.gray,fontSize:"11px",cursor:"pointer"}}>✕</button>
            </div>
          </div>
        )}

        {/* Dudo challenged me */}
        {dudoForMe.map(b=>(
          <div key={b.id} style={{background:C.redA+"0.04)",border:`1px solid ${C.redA}0.15)`,borderRadius:"8px",padding:"12px",marginBottom:"8px"}}>
            <div style={C.lbl}>🎲 {(b.opponent_name||"").toUpperCase()} DUDÓ TU RESULTADO</div>
            <div style={{fontSize:"10px",color:"rgba(255,255,255,0.45)",marginBottom:"8px"}}>Su versión: {b.disc_wins||"?"}V de 5 · Tu registro: {b.challenger_wins}V de 3</div>
            <div style={{fontSize:"9px",color:C.gray,marginBottom:"8px",lineHeight:"1.5"}}>Acepta (+1pt) o escala a admins (+5pts, resuelven con videos).</div>
            <div style={{display:"flex",gap:"6px"}}>
              <button onClick={()=>acceptDudo(b)} style={{flex:1,padding:"7px",background:C.greenA+"0.08)",border:`1px solid ${C.greenA}0.2)`,borderRadius:"5px",color:C.green,fontSize:"9px",cursor:"pointer",fontFamily:"monospace"}}>ACEPTAR (+1pt)</button>
              <button onClick={()=>submitClaim(b)} style={{flex:1,padding:"7px",background:"rgba(255,107,107,0.08)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:"5px",color:"#FF6B6B",fontSize:"9px",cursor:"pointer",fontFamily:"monospace"}}>ESCALAR (+5pts)</button>
            </div>
          </div>
        ))}

        {/* REGISTER BATTLE — first, most prominent */}
        <div style={{background:C.redA+"0.04)",border:`1px solid ${C.redA}0.2)`,borderRadius:"10px",padding:"16px",marginBottom:"8px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
            <div style={C.lbl}>REGISTRAR vs RIVAL · +1pt (2+ victorias: +2pts)</div>
            {playerId&&<div style={{fontFamily:"monospace",fontSize:"8px",color:canChallenge?"rgba(255,255,255,0.2)":C.red}}>{myTodayBattles.length}/5 hoy</div>}
          </div>
          {!playerId?<div style={{fontSize:"10px",color:C.gray}}>Inicia sesión para registrar batallas.</div>
          :!canChallenge?<div style={{fontSize:"10px",color:C.red,fontFamily:"monospace",textAlign:"center",padding:"8px"}}>LÍMITE DIARIO: 5/día</div>
          :!formOpen?<button onClick={()=>setFormOpen(true)} style={{width:"100%",padding:"9px",background:C.redA+"0.08)",border:`1px dashed ${C.redA}0.3)`,borderRadius:"6px",color:C.red,fontSize:"11px",cursor:"pointer",fontFamily:"monospace",letterSpacing:"0.1em"}}>+ REGISTRAR vs RIVAL</button>
          :(
            <div>
              <div style={C.lbl}>SELECCIONA TU RIVAL</div>
              <div style={{maxHeight:"150px",overflow:"auto",marginBottom:"10px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px"}}>
                {players.filter(p=>String(p.id)!==String(playerId)).map(p=>(
                  <button key={p.id} onClick={()=>!alreadyFoughtToday(p.id)&&setOpponent(p)} style={{padding:"6px 8px",borderRadius:"5px",cursor:alreadyFoughtToday(p.id)?"not-allowed":"pointer",textAlign:"left",background:opponent?.id===p.id?C.redA+"0.12)":"rgba(255,255,255,0.02)",border:"1px solid "+(opponent?.id===p.id?C.redA+"0.3)":"rgba(255,255,255,0.06)"),color:opponent?.id===p.id?C.red:alreadyFoughtToday(p.id)?C.gray:"rgba(255,255,255,0.5)",fontSize:"11px",fontFamily:"Georgia,serif"}}>
                    {p.name}{alreadyFoughtToday(p.id)&&<span style={{fontSize:"8px",color:C.gray}}> ✓hoy</span>}
                  </button>
                ))}
              </div>
              {opponent&&(<>
                <div style={C.lbl}>¿CUÁNTAS DE 3 GANASTE vs {(opponent.name||"").toUpperCase()}?</div>
                <div style={{display:"flex",gap:"5px",marginBottom:"8px"}}>
                  {[0,1,2,3].map(n=><button key={n} onClick={()=>setMyWins(n)} style={{flex:1,padding:"10px 2px",borderRadius:"6px",cursor:"pointer",background:myWins===n?C.redA+"0.15)":"rgba(255,255,255,0.02)",border:"1px solid "+(myWins===n?C.redA+"0.4)":"rgba(255,255,255,0.08)"),color:myWins===n?C.red:C.gray,fontFamily:"monospace",fontSize:"16px",fontWeight:"bold"}}>{n}</button>)}
                </div>
                {myWins!==null&&<div style={{fontSize:"9px",color:C.gray,marginBottom:"8px",textAlign:"center",fontFamily:"monospace"}}>Tú {myWins}V · {opponent.name} {3-myWins}V · {myWins>=2?"+2pts":"+1pt"}</div>}
              </>)}
              {msg&&<div style={{fontSize:"10px",color:msg.startsWith("✓")?C.green:C.red,marginBottom:"6px"}}>{msg}</div>}
              <div style={{display:"flex",gap:"6px"}}>
                <button onClick={submitBattle} disabled={!opponent||myWins===null||saving} style={{flex:1,padding:"8px",background:opponent&&myWins!==null?C.greenA+"0.12)":"rgba(255,255,255,0.03)",border:"1px solid "+(opponent&&myWins!==null?C.greenA+"0.3)":"rgba(255,255,255,0.07)"),borderRadius:"6px",color:opponent&&myWins!==null?C.green:C.gray,fontSize:"11px",cursor:"pointer",fontFamily:"monospace"}}>{saving?"...":"ENVIAR"}</button>
                <button onClick={()=>{setFormOpen(false);setOpponent(null);setMyWins(null);}} style={{padding:"8px 12px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"6px",color:C.gray,fontSize:"11px",cursor:"pointer"}}>✕</button>
              </div>
            </div>
          )}
        </div>

        {/* COMO FUNCIONA button */}
        <button onClick={()=>setShowHow(!showHow)} style={{width:"100%",padding:"7px",marginBottom:"16px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"6px",color:C.gray,fontSize:"10px",cursor:"pointer",fontFamily:"monospace",letterSpacing:"0.1em"}}>{showHow?"▲ CERRAR":"▼ CÓMO FUNCIONA"}</button>

        {showHow&&(
          <div style={{background:C.redA+"0.04)",border:`1px solid ${C.redA}0.15)`,borderRadius:"8px",padding:"14px",marginBottom:"16px"}}>
            <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.2em",color:C.red,opacity:0.7,marginBottom:"10px"}}>🎲 VERSUS — REGLAS (inspirado en el juego Dudo)</div>
            <div style={{fontSize:"10px",color:"rgba(255,255,255,0.5)",lineHeight:"1.8"}}>
              <div style={{marginBottom:"6px"}}><strong style={{color:C.red}}>Registrar:</strong> 3 batallas vs un rival. Ganaste 0-1: <strong style={{color:C.red}}>+1pt</strong>. Ganaste 2-3: <strong style={{color:C.red}}>+2pts</strong>. Máx 1 por rival/día, 5/día.</div>
              <div style={{marginBottom:"6px"}}><strong style={{color:C.red}}>Confirmar:</strong> El rival acepta y recibe <strong style={{color:C.red}}>+1pt</strong>. El ganador declarado también recibe <strong style={{color:C.red}}>+1pt</strong> extra.</div>
              <div style={{marginBottom:"6px"}}><strong style={{color:C.red}}>🎲 DUDO:</strong> El rival desafía con 5 batallas propias. Si gana 3+ de 5: <strong style={{color:C.red}}>+3pts</strong> y se anulan los puntos del desafiador. Solo 1 DUDO por rival/día.</div>
              <div style={{marginBottom:"6px"}}><strong style={{color:C.red}}>Escalar:</strong> El desafiador puede escalar a admins con videos (<strong style={{color:C.red}}>+5pts</strong>). El que gane en video se lleva <strong style={{color:C.red}}>+5pts</strong>.</div>
              <div><strong style={{color:C.red}}>Rankings:</strong> Top 1 semanal <strong style={{color:C.red}}>+5pts</strong> · Top 1 mensual <strong style={{color:C.red}}>+10pts</strong></div>
            </div>
          </div>
        )}

        {/* ALL BATTLES — most recent first, scrollable after 10 */}
        {battles.length>0&&(
          <div style={{marginBottom:"16px"}}>
            <div style={C.lbl}>TODAS LAS BATALLAS — MÁS RECIENTES PRIMERO</div>
            <div style={{maxHeight:battles.length>10?"360px":"auto",overflowY:battles.length>10?"auto":"visible",paddingRight:battles.length>10?"2px":"0"}}>
              {battles.map(b=>{
                const isMine=String(b.challenger_id)===String(playerId)||String(b.opponent_id)===String(playerId);
                const isC=String(b.challenger_id)===String(playerId);
                const cW=b.status==="confirmed_reversed"?b.opponent_wins:b.challenger_wins;
                const oW=b.status==="confirmed_reversed"?b.challenger_wins:b.opponent_wins;
                const sc={confirmed:"rgba(168,255,120,0.5)",confirmed_reversed:"rgba(64,224,255,0.5)",disputed:"rgba(255,215,0,0.5)",claimed:"rgba(255,159,67,0.5)",disc_accepted:"rgba(168,255,120,0.5)",pending:"rgba(255,255,255,0.25)"}[b.status]||C.gray;
                const slbl={confirmed:"✓ confirmado",confirmed_reversed:"✓ confirmado",disputed:"🎲 DUDO",claimed:"📹 admin",disc_accepted:"✓ dudo resuelto",pending:"⏳ pendiente"}[b.status]||b.status;
                return(
                  <div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",marginBottom:"3px",background:isMine?"rgba(255,107,107,0.04)":"rgba(255,255,255,0.02)",borderRadius:"6px",border:"1px solid "+(isMine?"rgba(255,107,107,0.1)":"rgba(255,255,255,0.05)")}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:"11px",color:isMine?"rgba(255,255,255,0.8)":"rgba(255,255,255,0.55)",fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {b.challenger_name} <span style={{color:C.gray}}>vs</span> {b.opponent_name}
                      </div>
                      <div style={{fontSize:"8px",fontFamily:"monospace",color:sc}}>{b.week} · {slbl}</div>
                    </div>
                    <div style={{fontFamily:"monospace",fontWeight:"bold",textAlign:"right",flexShrink:0,marginLeft:"8px"}}>
                      <span style={{fontSize:"13px",color:cW>0?C.green:C.gray}}>{cW}</span>
                      <span style={{fontSize:"11px",color:C.gray}}> - </span>
                      <span style={{fontSize:"13px",color:oW>0?C.red:C.gray}}>{oW}</span>
                      {b.disc_wins!=null&&<div style={{fontSize:"8px",color:"rgba(255,215,0,0.5)"}}>🎲{b.disc_wins}-{b.disc_losses}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* DUDOS tracker */}
        {(dudoPending.length>0||dudoResolved.length>0)&&(
          <div style={{marginBottom:"16px"}}>
            <div style={C.lbl}>🎲 REGISTRO DE DUDOS</div>
            {dudoPending.length>0&&(
              <div style={{marginBottom:"6px"}}>
                <div style={{fontFamily:"monospace",fontSize:"7px",color:"rgba(255,215,0,0.4)",marginBottom:"3px",letterSpacing:"0.15em"}}>EN TRÁMITE</div>
                {dudoPending.map(b=>(
                  <div key={b.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 8px",marginBottom:"2px",background:"rgba(255,215,0,0.04)",borderRadius:"5px",border:"1px solid rgba(255,215,0,0.12)"}}>
                    <div>
                      <div style={{fontSize:"10px",color:"rgba(255,255,255,0.6)",fontFamily:"monospace"}}>{b.challenger_name} vs {b.opponent_name}</div>
                      <div style={{fontSize:"8px",color:C.gray,fontFamily:"monospace"}}>{b.disc_wins!=null?`${b.disc_wins}V de 5 ·`:""} {b.status==="claimed"?"📹 Esperando videos":"⏳ Esperando al desafiador"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {dudoResolved.length>0&&(
              <div>
                <div style={{fontFamily:"monospace",fontSize:"7px",color:C.greenA+"0.4)",marginBottom:"3px",letterSpacing:"0.15em"}}>RESUELTOS</div>
                {dudoResolved.slice(0,5).map(b=>(
                  <div key={b.id} style={{display:"flex",justifyContent:"space-between",padding:"4px 8px",marginBottom:"2px",background:"rgba(255,255,255,0.01)",borderRadius:"4px"}}>
                    <span style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",fontFamily:"monospace"}}>{b.challenger_name} vs {b.opponent_name}</span>
                    <span style={{fontSize:"8px",color:C.greenA+"0.5)",fontFamily:"monospace"}}>✓</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* RANKINGS — 3 columns: general, week, month */}
        <div style={{marginBottom:"16px"}}>
          <div style={C.lbl}>RANKINGS — MÁS VICTORIAS</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"6px",marginBottom:"8px"}}>
            {[
              {title:"GENERAL",data:rankGeneral,type:null},
              {title:"SEMANA",data:rankWeek,type:"weekly",bonus:"+5pts top 1"},
              {title:"MES",data:rankMonth,type:"monthly",bonus:"+10pts top 1"},
            ].map(({title,data,type,bonus})=>(
              <div key={title} style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",padding:"10px"}}>
                <div style={{fontFamily:"monospace",fontSize:"6px",letterSpacing:"0.15em",color:C.redA+"0.5)",marginBottom:"2px"}}>{title}</div>
                {bonus&&<div style={{fontFamily:"monospace",fontSize:"6px",color:C.gray,marginBottom:"4px"}}>{bonus}</div>}
                {isAdmin&&type&&<button onClick={()=>awardPvpRankingBonus(type)} style={{width:"100%",padding:"3px",marginBottom:"4px",background:C.redA+"0.08)",border:`1px solid ${C.redA}0.2)`,borderRadius:"3px",color:C.red,fontSize:"7px",cursor:"pointer",fontFamily:"monospace"}}>OTORGAR BONUS ADMIN</button>}
                {data.length===0?<div style={{fontSize:"9px",color:C.gray,textAlign:"center",fontFamily:"monospace"}}>sin batallas</div>
                :data.slice(0,5).map(([name,r],i)=>(
                  <div key={name} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
                    <span style={{fontSize:"9px",color:i===0?C.red:"rgba(255,255,255,0.5)",fontFamily:"Georgia,serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"65px"}}>{i+1}. {name}</span>
                    <div style={{fontFamily:"monospace",fontSize:"9px",flexShrink:0,marginLeft:"2px"}}>
                      <span style={{color:r.w>0?C.green:C.gray}}>{r.w}V</span>
                      {r.p>0&&<span style={{color:"rgba(255,215,0,0.4)",fontSize:"8px"}}>+{r.p}⏳</span>}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* MÁS DERROTAS */}
        {rankLosers.length>0&&(
          <div style={{marginBottom:"16px"}}>
            <div style={C.lbl}>MÁS DERROTAS</div>
            <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",padding:"10px"}}>
              {rankLosers.slice(0,5).map(([name,r],i)=>(
                <div key={name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 6px",marginBottom:"2px",background:"rgba(255,255,255,0.01)",borderRadius:"4px"}}>
                  <span style={{fontFamily:"Georgia,serif",fontSize:"11px",color:"rgba(255,255,255,0.5)"}}>{i+1}. {name}</span>
                  <div style={{fontFamily:"monospace",fontSize:"10px"}}>
                    <span style={{color:r.w>0?C.green:C.gray}}>{r.w}V</span>
                    <span style={{color:C.gray}}>/</span>
                    <span style={{color:C.red}}>{r.l}D</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description at bottom */}
        <div style={{background:"rgba(255,107,107,0.03)",border:"1px solid rgba(255,107,107,0.1)",borderRadius:"8px",padding:"12px 14px"}}>
          <div style={{fontFamily:"monospace",fontSize:"7px",letterSpacing:"0.3em",color:C.red,opacity:0.6,marginBottom:"6px"}}>VERSUS — PvP</div>
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",lineHeight:"1.7"}}>
            Registra el resultado de <strong style={{color:C.red}}>3 batallas</strong> vs un rival. Por registrar: <strong style={{color:C.red}}>+1pt</strong> (2-3 victorias: <strong style={{color:C.red}}>+2pts</strong>). El rival confirma (<strong style={{color:C.red}}>+1pt</strong>) o lanza un <strong style={{color:C.red}}>DUDO</strong>. Límite: 1 batalla por rival/día, máx 5/día.
          </div>
        </div>

        {msg&&!formOpen&&!dudoOpen&&<div style={{marginTop:"8px",fontSize:"10px",color:msg.startsWith("✓")||msg.startsWith("DUDO a")?"#A8FF78":"#FF9F43",fontFamily:"monospace"}}>{msg}</div>}
      </div>
      <NalguitasFooter/>
    </div>
  );
}

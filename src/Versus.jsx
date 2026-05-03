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
function today() { return new Date().toISOString().slice(0,10); }
async function awardPts(pid,pts){
  try{const{data:p}=await supabase.from("players").select("pts_acumulados").eq("id",parseInt(pid)).single();
  await supabase.from("players").update({pts_acumulados:(p?.pts_acumulados||0)+pts}).eq("id",parseInt(pid));}catch(e){}
}

export default function Versus() {
  const [players,setPlayers]=useState([]);
  const [battles,setBattles]=useState([]);
  const [loading,setLoading]=useState(true);
  const [msg,setMsg]=useState("");
  const [saving,setSaving]=useState(false);
  const [formOpen,setFormOpen]=useState(false);
  const [opponent,setOpponent]=useState(null);
  const [myWins,setMyWins]=useState(null);
  const [discOpen,setDiscOpen]=useState(false);
  const [discBattle,setDiscBattle]=useState(null);
  const [discWins,setDiscWins]=useState(null);
  const playerId=sessionStorage.getItem("aor_player_id");
  const playerName=sessionStorage.getItem("aor_player_name");
  const week=getWarWeek();

  async function load(){
    try{
      const [p,b]=await Promise.all([
        supabase.from("players").select("id,name,pts_acumulados,clan_role").eq("active",true).order("name"),
        supabase.from("pvp_battles").select("*").order("created_at",{ascending:false}).limit(300),
      ]);
      setPlayers(p.data||[]); setBattles(b.data||[]);
    }catch(e){}
    setLoading(false);
  }
  useEffect(()=>{load();},[]);

  const myTodayBattles=battles.filter(b=>String(b.challenger_id)===String(playerId)&&(b.created_at||"").slice(0,10)===today());
  const canChallenge=playerId&&myTodayBattles.length<5;
  function alreadyFoughtToday(opId){return battles.some(b=>String(b.challenger_id)===String(playerId)&&String(b.opponent_id)===String(opId)&&(b.created_at||"").slice(0,10)===today());}
  function alreadyDisputedToday(battle){return battles.some(b=>b.id!==battle.id&&String(b.opponent_id)===String(playerId)&&String(b.challenger_id)===String(battle.challenger_id)&&b.status==="disputed"&&(b.created_at||"").slice(0,10)===today());}

  async function submitBattle(){
    if(!playerId||!opponent||myWins===null||saving)return;
    if(!canChallenge){setMsg("Límite de 5 desafíos diarios.");return;}
    if(alreadyFoughtToday(opponent.id)){setMsg(`Ya registraste batalla vs ${opponent.name} hoy.`);return;}
    setSaving(true);
    const {error}=await supabase.from("pvp_battles").insert({
      challenger_id:parseInt(playerId),challenger_name:playerName,
      opponent_id:opponent.id,opponent_name:opponent.name,
      challenger_wins:myWins,opponent_wins:3-myWins,
      week,status:"pending",created_at:new Date().toISOString(),
    });
    if(error){setMsg("Error: "+error.message);setSaving(false);return;}
    await awardPts(playerId, myWins>=2?2:1);
    await load();
    setMsg(`✓ Enviado (+${myWins>=2?2:1}pt). ${opponent.name} debe confirmar o discrepar.`);
    setSaving(false);setFormOpen(false);setOpponent(null);setMyWins(null);
    setTimeout(()=>setMsg(""),6000);
  }

  async function confirm(b){
    await supabase.from("pvp_battles").update({status:"confirmed"}).eq("id",b.id);
    await awardPts(b.opponent_id,1);
    await load();
  }

  async function submitDiscrepancy(){
    if(!discBattle||discWins===null||saving)return;
    if(alreadyDisputedToday(discBattle)){setMsg("Solo puedes discrepar una vez por día contra el mismo jugador.");return;}
    setSaving(true);
    await supabase.from("pvp_battles").update({status:"disputed",disc_wins:discWins,disc_losses:5-discWins}).eq("id",discBattle.id);
    // If disputant wins majority (3+ of 5): +3pts to disputant, revoke challenger pts
    if(discWins>=3){
      await awardPts(discBattle.opponent_id,3);
      // Revoke challenger's original pts (deduct what they earned)
      const challPts = discBattle.challenger_wins>=2?2:1;
      try{
        const{data:cp}=await supabase.from("players").select("pts_acumulados").eq("id",discBattle.challenger_id).single();
        await supabase.from("players").update({pts_acumulados:Math.max(0,(cp?.pts_acumulados||0)-challPts)}).eq("id",discBattle.challenger_id);
      }catch(e){}
    }
    await load();
    const outcomeMsg = discWins>=3 ? `+3pts para ti. Se anulan los puntos del desafiador.` : `El desafiador decide si acepta o escala a admins.`;
    setMsg(`Discrepancia registrada: ${discWins}V de 5. ${outcomeMsg}`);
    setSaving(false);setDiscOpen(false);setDiscBattle(null);setDiscWins(null);
    setTimeout(()=>setMsg(""),8000);
  }

  async function acceptDiscrepancy(b){
    await supabase.from("pvp_battles").update({status:"disc_accepted"}).eq("id",b.id);
    // Challenger accepts discrepancy: challenger gets +1pt
    await awardPts(b.challenger_id,1);
    await load();
    setMsg("Discrepancia aceptada. +1pt para ti.");
    setTimeout(()=>setMsg(""),5000);
  }

  async function submitClaim(b){
    await supabase.from("pvp_battles").update({status:"claimed"}).eq("id",b.id);
    await awardPts(b.challenger_id,5);
    try{await supabase.from("clan_news").insert({type:"requerimiento",title:`CLAIM PvP — ${b.challenger_name} vs ${b.opponent_name}`,body:`${b.challenger_name} presenta claim. Original: ${b.challenger_wins}V de 3. Discrepancia de ${b.opponent_name}: ${b.disc_wins||"?"}V de 5. Se requieren videos en WhatsApp. Admin resuelve: quien tenga razón gana +5pts.`,author:"Sistema PvP",target:"admin",completions:[]});}catch(e){}
    await load();
    setMsg("Claim enviado. Envía tu video en WhatsApp.");
    setTimeout(()=>setMsg(""),6000);
  }

  const myPlayer=players.find(p=>String(p.id)===String(playerId));
  const isAdmin=["Líder","Co-Líder"].includes(myPlayer?.clan_role);

  async function resolveAdmin(b,challWins){
    await supabase.from("pvp_battles").update({status:challWins?"confirmed":"confirmed_reversed"}).eq("id",b.id);
    await awardPts(challWins?b.challenger_id:b.opponent_id,5);
    await load();
  }

  const pendingForMe=battles.filter(b=>String(b.opponent_id)===String(playerId)&&b.status==="pending");
  const disputedForMe=battles.filter(b=>String(b.challenger_id)===String(playerId)&&b.status==="disputed");
  const claimedAdmin=battles.filter(b=>b.status==="claimed");
  const record={};
  battles.filter(b=>b.status==="confirmed"||b.status==="confirmed_reversed").forEach(b=>{
    const cW=b.status==="confirmed_reversed"?b.opponent_wins:b.challenger_wins;
    const oW=b.status==="confirmed_reversed"?b.challenger_wins:b.opponent_wins;
    if(!record[b.challenger_name])record[b.challenger_name]={w:0,l:0};
    if(!record[b.opponent_name])record[b.opponent_name]={w:0,l:0};
    record[b.challenger_name].w+=cW;record[b.challenger_name].l+=oW;
    record[b.opponent_name].w+=oW;record[b.opponent_name].l+=cW;
  });
  const ranked=Object.entries(record).sort((a,b)=>b[1].w-a[1].w||a[1].l-b[1].l);
  const lbl={fontFamily:"monospace",fontSize:"7px",letterSpacing:"0.25em",color:"rgba(255,255,255,0.25)",marginBottom:"6px"};
  const statusColors={confirmed:"#A8FF78",confirmed_reversed:"#40E0FF",disputed:"#FFD700",claimed:"#FF9F43",disc_accepted:"#A8FF78",pending:"rgba(255,255,255,0.3)"};
  const statusLabels={confirmed:"confirmado",confirmed_reversed:"confirmado",disputed:"discrepado",claimed:"en revisión admin",disc_accepted:"discrepancia aceptada",pending:"pendiente"};

  if(loading)return <LoadingScreen page="/versus"/>;
  return(
    <div style={{minHeight:"100vh",background:"#0d0d0f",fontFamily:"Georgia,serif",color:"#d4c9a8",padding:"20px",paddingBottom:"50px"}}>
      <div style={{maxWidth:"560px",margin:"0 auto"}}>
        <NavBar current="/versus"/>
        <PageHeader page="/versus"/>
        <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"8px",padding:"12px 14px",marginBottom:"16px"}}>
          <div style={{fontFamily:"monospace",fontSize:"7px",letterSpacing:"0.3em",color:"rgba(255,107,107,0.4)",marginBottom:"8px"}}>VERSUS — CÓMO FUNCIONA</div>
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.45)",lineHeight:"1.8"}}>
            <div style={{marginBottom:"6px"}}>Registra el resultado de <strong style={{color:"#FF6B6B"}}>3 batallas</strong> contra un rival del clan. Por registrar ganas <strong style={{color:"#A8FF78"}}>+1 pt</strong>. Si ganaste 2 o más de las 3 batallas, recibes <strong style={{color:"#A8FF78"}}>+2 pts</strong>. Solo puedes registrar una batalla por rival al día, con un máximo de 5 batallas diarias.</div>
            <div style={{marginBottom:"6px"}}>Al desafiado le aparece el resultado en su perfil y en esta hoja. Puede <strong style={{color:"#A8FF78"}}>ACEPTAR</strong> — y recibe <strong style={{color:"#A8FF78"}}>+1 pt</strong> — o <strong style={{color:"#FFD700"}}>DISCREPAR</strong>, registrando sus propios resultados de 5 batallas entre los dos jugadores.</div>
            <div style={{marginBottom:"6px"}}>Si en las 5 batallas de la discrepancia gana la mayoría el desafiado, se lleva <strong style={{color:"#FFD700"}}>+3 pts</strong> y se anulan los puntos del desafiador. El resultado aparece en el perfil del desafiador y en la sección de Discrepancias de esta hoja.</div>
            <div>El desafiador puede entonces <strong style={{color:"#A8FF78"}}>ACEPTAR la discrepancia</strong> (recibe +1 pt) o <strong style={{color:"#FF9F43"}}>llevar el caso a los administradores</strong> con videos de 5 batallas. El que tenga razón según los videos recibe <strong style={{color:"#FF9F43"}}>+5 pts</strong> y el otro cero.</div>
          </div>
        </div>

        {isAdmin&&claimedAdmin.length>0&&(
          <div style={{marginBottom:"16px"}}>
            <div style={lbl}>⚠ CLAIMS PENDIENTES — ADMIN</div>
            {claimedAdmin.map(b=>(
              <div key={b.id} style={{background:"rgba(255,215,0,0.05)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:"8px",padding:"12px",marginBottom:"6px"}}>
                <div style={{fontSize:"11px",color:"#FFD700",marginBottom:"3px",fontFamily:"monospace"}}>{b.challenger_name} vs {b.opponent_name}</div>
                <div style={{fontSize:"9px",color:"rgba(255,255,255,0.4)",marginBottom:"8px",fontFamily:"monospace"}}>Original: {b.challenger_wins}V de 3 · Discrepancia: {b.disc_wins||"?"}V de 5</div>
                <div style={{display:"flex",gap:"6px"}}>
                  <button onClick={()=>resolveAdmin(b,true)} style={{flex:1,padding:"6px",background:"rgba(168,255,120,0.1)",border:"1px solid rgba(168,255,120,0.25)",borderRadius:"5px",color:"#A8FF78",fontSize:"9px",cursor:"pointer",fontFamily:"monospace"}}>✓ {b.challenger_name}</button>
                  <button onClick={()=>resolveAdmin(b,false)} style={{flex:1,padding:"6px",background:"rgba(64,224,255,0.1)",border:"1px solid rgba(64,224,255,0.25)",borderRadius:"5px",color:"#40E0FF",fontSize:"9px",cursor:"pointer",fontFamily:"monospace"}}>✓ {b.opponent_name}</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {pendingForMe.length>0&&(
          <div style={{marginBottom:"16px"}}>
            <div style={lbl}>CONFIRMAR O DISCREPAR</div>
            {pendingForMe.map(b=>(
              <div key={b.id} style={{background:"rgba(255,107,107,0.05)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:"8px",padding:"12px",marginBottom:"6px"}}>
                <div style={{fontSize:"12px",color:"#FF6B6B",marginBottom:"3px",fontFamily:"serif"}}>{b.challenger_name}</div>
                <div style={{fontSize:"10px",color:"rgba(255,255,255,0.45)",marginBottom:"8px",fontFamily:"monospace"}}>ganó {b.challenger_wins} · perdió {b.opponent_wins} de 3 vs ti</div>
                <div style={{display:"flex",gap:"6px"}}>
                  <button onClick={()=>confirm(b)} style={{flex:1,padding:"7px",background:"rgba(168,255,120,0.1)",border:"1px solid rgba(168,255,120,0.25)",borderRadius:"5px",color:"#A8FF78",fontSize:"10px",cursor:"pointer",fontFamily:"monospace"}}>✓ CONFIRMAR (+1pt)</button>
                  <button onClick={()=>{if(alreadyDisputedToday(b)){setMsg("Ya discrepaste hoy vs este jugador.");return;}setDiscBattle(b);setDiscOpen(true);setDiscWins(null);}} style={{flex:1,padding:"7px",background:"rgba(255,215,0,0.08)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:"5px",color:"#FFD700",fontSize:"10px",cursor:"pointer",fontFamily:"monospace"}}>⚡ DISCREPAR</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {discOpen&&discBattle&&(
          <div style={{background:"rgba(255,215,0,0.05)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:"8px",padding:"14px",marginBottom:"16px"}}>
            <div style={lbl}>DISCREPANCIA — 5 BATALLAS vs {discBattle.challenger_name.toUpperCase()}</div>
            <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"10px"}}>¿Cuántas de las 5 batallas ganaste?</div>
            <div style={{display:"flex",gap:"4px",marginBottom:"10px"}}>
              {[0,1,2,3,4,5].map(n=>(
                <button key={n} onClick={()=>setDiscWins(n)} style={{flex:1,padding:"8px 2px",borderRadius:"6px",cursor:"pointer",background:discWins===n?"rgba(255,215,0,0.15)":"rgba(255,255,255,0.02)",border:"1px solid "+(discWins===n?"rgba(255,215,0,0.4)":"rgba(255,255,255,0.08)"),color:discWins===n?"#FFD700":"rgba(255,255,255,0.4)",fontFamily:"monospace",fontSize:"14px",fontWeight:"bold"}}>{n}</button>
              ))}
            </div>
            {discWins!==null&&<div style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",marginBottom:"8px",textAlign:"center",fontFamily:"monospace"}}>Tú: {discWins}V · {discBattle.challenger_name}: {5-discWins}V</div>}
            <div style={{display:"flex",gap:"6px"}}>
              <button onClick={submitDiscrepancy} disabled={discWins===null||saving} style={{flex:1,padding:"8px",background:discWins!==null?"rgba(255,215,0,0.12)":"rgba(255,255,255,0.03)",border:"1px solid "+(discWins!==null?"rgba(255,215,0,0.3)":"rgba(255,255,255,0.07)"),borderRadius:"6px",color:discWins!==null?"#FFD700":"rgba(255,255,255,0.2)",fontSize:"11px",cursor:"pointer",fontFamily:"monospace"}}>{saving?"...":"ENVIAR DISCREPANCIA"}</button>
              <button onClick={()=>{setDiscOpen(false);setDiscBattle(null);setDiscWins(null);}} style={{padding:"8px 12px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"6px",color:"rgba(255,255,255,0.3)",fontSize:"11px",cursor:"pointer"}}>✕</button>
            </div>
          </div>
        )}

        {disputedForMe.map(b=>(
          <div key={b.id} style={{background:"rgba(255,107,107,0.04)",border:"1px solid rgba(255,107,107,0.15)",borderRadius:"8px",padding:"12px",marginBottom:"8px"}}>
            <div style={lbl}>⚡ {(b.opponent_name||"").toUpperCase()} DISCREPÓ TU RESULTADO</div>
            <div style={{fontSize:"10px",color:"rgba(255,255,255,0.45)",marginBottom:"8px"}}>Su versión: {b.disc_wins||"?"}V de 5 · Tu registro: {b.challenger_wins}V de 3</div>
            <div style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",marginBottom:"8px",lineHeight:"1.5"}}>Acepta (él +3pts) o presenta claim (+5pts para ti, admins resuelven con videos).</div>
            <div style={{display:"flex",gap:"6px"}}>
              <button onClick={()=>acceptDiscrepancy(b)} style={{flex:1,padding:"7px",background:"rgba(168,255,120,0.08)",border:"1px solid rgba(168,255,120,0.2)",borderRadius:"5px",color:"#A8FF78",fontSize:"9px",cursor:"pointer",fontFamily:"monospace"}}>ACEPTAR (+1pt)</button>
              <button onClick={()=>submitClaim(b)} style={{flex:1,padding:"7px",background:"rgba(255,159,67,0.08)",border:"1px solid rgba(255,159,67,0.2)",borderRadius:"5px",color:"#FF9F43",fontSize:"9px",cursor:"pointer",fontFamily:"monospace"}}>ESCALAR A ADMIN (+5pts)</button>
            </div>
          </div>
        ))}

        <div style={{background:"rgba(255,107,107,0.04)",border:"1px solid rgba(255,107,107,0.15)",borderRadius:"10px",padding:"16px",marginBottom:"16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
            <div style={lbl}>REGISTRAR 3 BATALLAS</div>
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
                  <button key={p.id} onClick={()=>!alreadyFoughtToday(p.id)&&setOpponent(p)}
                    style={{padding:"6px 8px",borderRadius:"5px",cursor:alreadyFoughtToday(p.id)?"not-allowed":"pointer",textAlign:"left",
                      background:opponent?.id===p.id?"rgba(255,107,107,0.12)":alreadyFoughtToday(p.id)?"rgba(255,255,255,0.01)":"rgba(255,255,255,0.02)",
                      border:"1px solid "+(opponent?.id===p.id?"rgba(255,107,107,0.3)":"rgba(255,255,255,0.06)"),
                      color:opponent?.id===p.id?"#FF6B6B":alreadyFoughtToday(p.id)?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.5)",
                      fontSize:"11px",fontFamily:"Georgia,serif"}}>
                    {p.name}{alreadyFoughtToday(p.id)&&<span style={{fontSize:"8px",color:"rgba(255,255,255,0.2)"}}> ✓hoy</span>}
                  </button>
                ))}
              </div>
              {opponent&&(<>
                <div style={lbl}>¿CUÁNTAS DE 3 GANASTE vs {opponent.name.toUpperCase()}?</div>
                <div style={{display:"flex",gap:"5px",marginBottom:"8px"}}>
                  {[0,1,2,3].map(n=>(
                    <button key={n} onClick={()=>setMyWins(n)} style={{flex:1,padding:"10px 2px",borderRadius:"6px",cursor:"pointer",
                      background:myWins===n?"rgba(255,107,107,0.15)":"rgba(255,255,255,0.02)",
                      border:"1px solid "+(myWins===n?"rgba(255,107,107,0.4)":"rgba(255,255,255,0.08)"),
                      color:myWins===n?"#FF6B6B":"rgba(255,255,255,0.4)",fontFamily:"monospace",fontSize:"16px",fontWeight:"bold"}}>{n}</button>
                  ))}
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

        {/* Discrepancies section */}
        {battles.filter(b=>b.status==="disputed"||b.status==="disc_accepted").length>0&&(
          <div style={{marginBottom:"16px"}}>
            <div style={lbl}>DISCREPANCIAS Y SUS RESULTADOS</div>
            {battles.filter(b=>b.status==="disputed"||b.status==="disc_accepted").map(b=>(
              <div key={b.id} style={{background:"rgba(255,215,0,0.04)",border:"1px solid rgba(255,215,0,0.15)",borderRadius:"7px",padding:"10px",marginBottom:"4px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:"11px",color:"rgba(255,255,255,0.7)",fontFamily:"monospace"}}>{b.challenger_name} vs {b.opponent_name}</div>
                    <div style={{fontSize:"9px",color:"rgba(255,255,255,0.35)",fontFamily:"monospace"}}>
                      Original: {b.challenger_wins}V-{b.opponent_wins}D de 3 →
                      {b.disc_wins!=null?` Discrepancia: ${b.disc_wins}V-${b.disc_losses}D de 5`:""} ·
                      {b.status==="disc_accepted"?" ✓ Aceptada":" ⚡ En disputa"}
                    </div>
                  </div>
                  <div style={{fontSize:"8px",color:b.status==="disc_accepted"?"#A8FF78":"#FFD700",fontFamily:"monospace",textAlign:"right"}}>
                    {b.status==="disc_accepted"?"ACEPTADA":"DISPUTADA"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {battles.length>0&&(
          <div style={{marginBottom:"16px"}}>
            <div style={lbl}>TODAS LAS BATALLAS — MÁS RECIENTES PRIMERO</div>
            {battles.slice(0,30).map(b=>(
              <div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",marginBottom:"3px",background:"rgba(255,255,255,0.02)",borderRadius:"6px",border:"1px solid rgba(255,255,255,0.05)"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:"11px",color:"rgba(255,255,255,0.7)",fontFamily:"monospace"}}>
                    {b.challenger_name} <span style={{color:"rgba(255,255,255,0.3)"}}>vs</span> {b.opponent_name}
                  </div>
                  <div style={{fontSize:"8px",fontFamily:"monospace",color:statusColors[b.status]||"rgba(255,255,255,0.3)"}}>{b.week} · {statusLabels[b.status]||b.status}</div>
                </div>
                <div style={{fontFamily:"monospace",fontSize:"13px",fontWeight:"bold",textAlign:"right"}}>
                  <span style={{color:"#A8FF78"}}>{b.challenger_wins}</span>
                  <span style={{color:"rgba(255,255,255,0.2)"}}> - </span>
                  <span style={{color:"#FF6B6B"}}>{b.opponent_wins}</span>
                  {b.status==="disputed"&&b.disc_wins!=null&&<div style={{fontSize:"8px",color:"#FFD700"}}>disc: {b.disc_wins}-{b.disc_losses}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {ranked.length>0&&(
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",padding:"14px"}}>
            <div style={lbl}>RANKING PvP — BATALLAS CONFIRMADAS</div>
            {ranked.map(([name,r],i)=>(
              <div key={name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 8px",marginBottom:"3px",background:i===0?"rgba(255,215,0,0.05)":"rgba(255,255,255,0.01)",borderRadius:"5px"}}>
                <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                  <span style={{fontFamily:"monospace",fontSize:"9px",color:"rgba(255,255,255,0.2)",width:"16px"}}>{i+1}</span>
                  <span style={{fontFamily:"Georgia,serif",fontSize:"12px",color:i===0?"#FFD700":"rgba(255,255,255,0.6)"}}>{name}</span>
                </div>
                <div style={{fontFamily:"monospace",fontSize:"10px"}}>
                  <span style={{color:"#A8FF78"}}>{r.w}V</span><span style={{color:"rgba(255,255,255,0.2)"}}>/</span><span style={{color:"#FF6B6B"}}>{r.l}D</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {msg&&!formOpen&&!discOpen&&<div style={{marginTop:"8px",fontSize:"10px",color:msg.startsWith("✓")?"#A8FF78":"#FF6B6B",fontFamily:"monospace"}}>{msg}</div>}
      </div>
      <NalguitasFooter/>
    </div>
  );
}

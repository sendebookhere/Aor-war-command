import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import NavBar from "./NavBar";
import PageHeader from "./PageHeader";
import NalguitasFooter from "./NalguitasFooter";

export default function Noticias() {
  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const playerId   = sessionStorage.getItem("aor_player_id");
  const playerName = sessionStorage.getItem("aor_player_name");

  useEffect(()=>{ load(); },[]);

  async function load() {
    const {data} = await supabase.from("clan_news")
      .select("*").order("created_at",{ascending:false}).limit(50);
    setPosts(data||[]);
    setLoading(false);
  }

  async function markDone(post) {
    if (!playerId) return;
    // Check not already done
    const already = post.completions?.find(c=>String(c.id)===String(playerId));
    if (already) return;
    const completions = [...(post.completions||[]), {
      id: parseInt(playerId), name: playerName,
      at: new Date().toISOString()
    }];
    await supabase.from("clan_news").update({completions}).eq("id", post.id);
    // +1 pt for requirement completion
    if (post.type === "requerimiento") {
      const {data:p} = await supabase.from("players").select("pts_acumulados").eq("id",parseInt(playerId)).single();
      await supabase.from("players").update({pts_acumulados:(p?.pts_acumulados||0)+1}).eq("id",parseInt(playerId));
    }
    load();
  }

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace",fontSize:"9px",letterSpacing:"0.3em",color:"rgba(255,159,67,0.4)"}}>
      CARGANDO...
    </div>
  );

  const news = posts.filter(p=>p.type==="noticia");
  const reqs  = posts.filter(p=>p.type==="requerimiento");

  return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",fontFamily:"Georgia,serif",color:"#d4c9a8",padding:"20px",paddingBottom:"50px"}}>
      <div style={{maxWidth:"560px",margin:"0 auto"}}>
        <NavBar current="/noticias"/>
        <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"8px",padding:"12px 14px",marginBottom:"16px",lineHeight:"1.7"}}><div style={{fontFamily:"monospace",fontSize:"7px",letterSpacing:"0.3em",color:"rgba(255,159,67,0.4)",marginBottom:"6px"}}>NOTICIAS CLAN</div><div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)"}}>Comunicados y requerimientos del mando de <strong style={{color:"#FF9F43"}}>Antigua Orden [AOR]</strong>. Confirma haber leído cada noticia con el botón <strong style={{color:"#FF9F43"}}>✓ LEÍDA</strong> para sumar <strong style={{color:"#A8FF78"}}>+1 pt</strong>. Los requerimientos marcan acciones específicas que el clan necesita de ti.</div></div>
        
        <PageHeader page="/noticias"/>

        {/* Requerimientos */}
        {reqs.length>0&&(
          <div style={{marginBottom:"20px"}}>
            <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.25em",color:"rgba(255,107,107,0.5)",marginBottom:"8px"}}>REQUERIMIENTOS ACTIVOS</div>
            {reqs.map(post=>{
              const done = post.completions?.find(c=>String(c.id)===String(playerId));
              return (
                <div key={post.id} style={{background:"rgba(255,107,107,0.04)",border:"1px solid rgba(255,107,107,0.15)",borderRadius:"8px",padding:"14px",marginBottom:"8px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"6px"}}>
                    <div style={{fontFamily:"serif",fontSize:"14px",color:"#FF6B6B",flex:1}}>{post.title}</div>
                    {!done&&playerId&&(
                      <button onClick={()=>markDone(post)} style={{padding:"4px 10px",background:"rgba(168,255,120,0.1)",border:"1px solid rgba(168,255,120,0.25)",borderRadius:"5px",color:"#A8FF78",fontSize:"9px",cursor:"pointer",fontFamily:"monospace",flexShrink:0,marginLeft:"8px"}}>
                        ✓ CUMPLIDO +1pt
                      </button>
                    )}
                    {done&&<div style={{fontSize:"9px",color:"rgba(168,255,120,0.5)",fontFamily:"monospace",flexShrink:0,marginLeft:"8px"}}>✓ CUMPLIDO</div>}
                  </div>
                  <div style={{fontSize:"12px",color:"rgba(255,255,255,0.55)",lineHeight:"1.6",marginBottom:"8px"}}>{post.body}</div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:"9px",color:"rgba(255,255,255,0.2)",fontFamily:"monospace"}}>
                    <span>Por: {post.author}</span>
                    <span>{new Date(post.created_at).toLocaleDateString("es-ES",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</span>
                  </div>
                  {post.completions?.length>0&&(
                    <div style={{marginTop:"6px",fontSize:"9px",color:"rgba(168,255,120,0.4)",fontFamily:"monospace"}}>
                      Cumplieron: {post.completions.map(c=>c.name).join(", ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Noticias */}
        <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.25em",color:"rgba(255,159,67,0.5)",marginBottom:"8px"}}>NOTICIAS DEL CLAN</div>
        {news.length===0&&reqs.length===0&&(
          <div style={{textAlign:"center",padding:"32px",color:"rgba(255,255,255,0.2)",fontSize:"11px"}}>Sin noticias publicadas aún.</div>
        )}
        {news.map(post=>{
          const read = post.completions?.find(c=>String(c.id)===String(playerId));
          return(
          <div key={post.id} style={{background:"rgba(255,159,67,0.03)",border:"1px solid rgba(255,159,67,0.12)",borderRadius:"8px",padding:"14px",marginBottom:"8px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"6px"}}>
              <div style={{fontFamily:"serif",fontSize:"14px",color:"#FF9F43",flex:1}}>{post.title}</div>
              {!read&&playerId&&(
                <button onClick={()=>markDone(post)} style={{padding:"3px 8px",background:"rgba(255,159,67,0.1)",border:"1px solid rgba(255,159,67,0.25)",borderRadius:"4px",color:"#FF9F43",fontSize:"9px",cursor:"pointer",fontFamily:"monospace",flexShrink:0,marginLeft:"8px"}}>
                  ✓ LEÍDA +1pt
                </button>
              )}
              {read&&<div style={{fontSize:"9px",color:"rgba(255,159,67,0.4)",fontFamily:"monospace",flexShrink:0,marginLeft:"8px"}}>✓ LEÍDA</div>}
            </div>
            <div style={{fontSize:"12px",color:"rgba(255,255,255,0.55)",lineHeight:"1.6",marginBottom:"8px"}}>{post.body}</div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:"9px",color:"rgba(255,255,255,0.2)",fontFamily:"monospace"}}>
              <span>Por: {post.author}</span>
              <span>{new Date(post.created_at).toLocaleDateString("es-ES",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</span>
            </div>
          </div>
          );
        })}
      </div>
      <NalguitasFooter/>
    </div>
  );
}

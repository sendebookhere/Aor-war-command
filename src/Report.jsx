import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const AVAILABILITY = {
  siempre:      { label:"Siempre listo",  color:"#A8FF78", icon:"🟢" },
  intermitente: { label:"Intermitente",   color:"#FFD700", icon:"🟡" },
  solo_una:     { label:"Solo una vez",   color:"#FF9F43", icon:"🟠" },
  no_disponible:{ label:"No disponible",  color:"#FF6B6B", icon:"🔴" },
  pendiente:    { label:"Sin responder",  color:"#888888", icon:"⚪" },
};

const RANKS = [
  { label:"Co-Líder 👑",  color:"#FFD700", min:10000, desc:"Leyenda del clan"        },
  { label:"Oficial ⚜️",   color:"#40E0FF", min:1000,  desc:"Pilar de la comunidad"  },
  { label:"Veterano ★★★", color:"#A8FF78", min:600,   desc:"Guerrero experimentado" },
  { label:"Guerrero ★★",  color:"#FFD700", min:300,   desc:"Miembro consolidado"    },
  { label:"Soldado ★",    color:"#FF9F43", min:100,   desc:"En camino"              },
  { label:"Recluta",      color:"#888888", min:0,     desc:"Recién llegado"         },
  { label:"⚠ Vigilado",  color:"#FF6B6B", min:-9999, desc:"Bajo observación"       },
];

function getRank(acc, hon, name) {
  const total = acc + (hon||0);
  // PUNK'Z is always protected as Leader
  if (name === "PUNK'Z") return { label:"Líder 👑", color:"#FFD700", min:99999 };
  // If total (accumulated + honorary) is negative or zero, rank falls
  if (total <= 0) return { label:"⚠ Vigilado", color:"#FF6B6B", min:-9999 };
  // Honorary points act as buffer - if honorary > 0 but accumulated < 0, rank drops
  if (acc < 0 && (hon||0) > 0) {
    // Rank drops one level from what honorary would give
    if ((hon||0) >= 10000) return RANKS.find(r=>r.min===1000); // Co-Lider drops to Oficial
    if ((hon||0) >= 1000)  return RANKS.find(r=>r.min===0);    // Oficial drops to Recluta
  }
  return RANKS.find(r=>total>=r.min)||RANKS[RANKS.length-1];
}

function totalPts(p) {
  return (p.pt_registro||0)+(p.pt_disponibilidad_declarada||0)+(p.pt_disponibilidad||0)
        +(p.pt_obediencia||0)+(p.pt_batallas_ganadas||0)*2+(p.pt_batallas_perdidas||0)
        +(p.pt_defensas||0)+(p.pt_bonus||0)-(p.pt_penalizacion||0)-(p.pt_no_aparecio||0)
        -(p.pt_ignoro_orden||0)*2-(p.pt_abandono||0)*2-(p.pt_inactivo_4h||0)*3;
}

function Pill({color,children}) {
  return <span style={{fontSize:"9px",padding:"1px 6px",borderRadius:"10px",background:color+"22",color,border:"1px solid "+color+"44"}}>{children}</span>;
}

function PlayerProfile({player, onBack}) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    supabase.from("war_history").select("*").eq("player_id",player.id).order("created_at",{ascending:false}).then(({data})=>{
      setHistory(data||[]);
      setLoading(false);
    });
  },[player.id]);

  const pts  = totalPts(player);
  const acc  = player.pts_acumulados||0;
  const rank = getRank(acc, player.pts_honorificos, player.name);
  const avail = AVAILABILITY[player.availability]||AVAILABILITY.pendiente;

  const breakdown = [
    {label:"Registro",                      val:player.pt_registro||0,                  show:(player.pt_registro||0)>0},
    {label:"Disponibilidad declarada",      val:player.pt_disponibilidad_declarada||0,  show:(player.pt_disponibilidad_declarada||0)>0},
    {label:"Apareció",                      val:(player.pt_disponibilidad||0)*3,        show:(player.pt_disponibilidad||0)>0},
    {label:"Siguió órdenes",               val:(player.pt_obediencia||0)*2,             show:(player.pt_obediencia||0)>0},
    {label:"Batallas ganadas",              val:(player.pt_batallas_ganadas||0)*2,       show:(player.pt_batallas_ganadas||0)>0},
    {label:"Batallas perdidas",             val:player.pt_batallas_perdidas||0,          show:(player.pt_batallas_perdidas||0)>0},
    {label:"Defensas de castillo",          val:player.pt_defensas||0,                  show:(player.pt_defensas||0)>0},
    {label:"Bonus completo",               val:(player.pt_bonus||0)*5,                  show:(player.pt_bonus||0)>0},
    {label:"Sin registro pero participó",  val:3,                                        show:player.pt_disponibilidad===3},
    {label:"No apareció",                  val:-(player.pt_no_aparecio||0),             show:(player.pt_no_aparecio||0)>0},
    {label:"Sin registro ni participación",val:-(player.pt_penalizacion||0),            show:(player.pt_penalizacion||0)>0},
    {label:"Ignoró órdenes",              val:-(player.pt_ignoro_orden||0)*2,           show:(player.pt_ignoro_orden||0)>0},
    {label:"Abandonó defensa",            val:-(player.pt_abandono||0)*2,               show:(player.pt_abandono||0)>0},
    {label:"Inactivo +4h",                val:-(player.pt_inactivo_4h||0)*3,            show:(player.pt_inactivo_4h||0)>0},
  ].filter(r=>r.show);

  return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",padding:"20px",fontFamily:"Georgia,serif",color:"#d4c9a8"}}>
      <div style={{maxWidth:"500px",margin:"0 auto"}}>
        <button onClick={onBack} style={{background:"transparent",border:"none",color:"#40E0FF",cursor:"pointer",fontSize:"13px",marginBottom:"16px",padding:0}}>
          ← Volver al ranking
        </button>

        {/* Header */}
        <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:"10px",padding:"16px",marginBottom:"16px"}}>
          <div style={{fontFamily:"serif",fontSize:"22px",color:"#FFD700",marginBottom:"8px"}}>{player.name}</div>
          <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"8px"}}>
            <Pill color={rank.color}>{rank.label}</Pill>
            <Pill color={avail.color}>{avail.icon} {avail.label}</Pill>
            <Pill color="rgba(255,255,255,0.4)">{player.clan_role}</Pill>
          </div>
          <div style={{display:"flex",gap:"16px",fontSize:"12px",flexWrap:"wrap"}}>
            <span style={{color:"rgba(255,255,255,0.5)"}}>⚔ {((player.level||0)/1000).toFixed(1)}k</span>
            <span style={{color:"rgba(255,255,255,0.5)"}}>💀 {(player.bp||0).toLocaleString()}</span>
            <span style={{color:pts>=0?"#A8FF78":"#FF6B6B",fontWeight:"bold"}}>{pts>0?"+":""}{pts} esta guerra</span>
            <span style={{color:rank.color,fontWeight:"bold"}}>{acc} pts acumulados</span>
          </div>
          {(player.pts_honorificos||0) > 0 && (
            <div style={{marginTop:"10px",background:"rgba(255,215,0,0.08)",border:"1px solid rgba(255,215,0,0.25)",borderRadius:"6px",padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:"11px",color:"#FFD700"}}>⭐ Puntos honoríficos — Rango fundador</span>
              <span style={{fontSize:"15px",color:"#FFD700",fontWeight:"bold"}}>{(player.pts_honorificos).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Current war breakdown */}
        <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"8px",padding:"14px",marginBottom:"16px"}}>
          <div style={{color:"#40E0FF",fontSize:"13px",marginBottom:"10px",fontFamily:"serif"}}>⚔ Guerra actual</div>
          {breakdown.length === 0
            ? <div style={{fontSize:"11px",color:"rgba(255,255,255,0.3)",textAlign:"center"}}>Sin actividad registrada esta guerra</div>
            : breakdown.map((r,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 8px",marginBottom:"3px",background:r.val>=0?"rgba(168,255,120,0.05)":"rgba(255,107,107,0.05)",borderRadius:"4px",border:"1px solid "+(r.val>=0?"rgba(168,255,120,0.1)":"rgba(255,107,107,0.1)")}}>
                <span style={{fontSize:"11px",color:"rgba(255,255,255,0.6)"}}>{r.label}</span>
                <span style={{fontSize:"13px",color:r.val>=0?"#A8FF78":"#FF6B6B",fontWeight:"bold"}}>{r.val>0?"+":""}{r.val}</span>
              </div>
            ))
          }
        </div>

        {/* War history */}
        <div style={{color:"#FFD700",fontSize:"13px",marginBottom:"10px",fontFamily:"serif"}}>📅 Historial de guerras</div>
        {loading && <div style={{fontSize:"11px",color:"rgba(255,255,255,0.3)"}}>Cargando...</div>}
        {!loading && history.length === 0 && <div style={{fontSize:"11px",color:"rgba(255,255,255,0.3)"}}>Sin historial previo.</div>}
        {history.map((h,i)=>(
          <div key={i} style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"8px",padding:"10px 14px",marginBottom:"6px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:"11px",color:"rgba(255,255,255,0.5)",marginBottom:"3px"}}>Semana {h.week}</div>
              <Pill color={AVAILABILITY[h.availability]?.color||"#888"}>{AVAILABILITY[h.availability]?.icon} {AVAILABILITY[h.availability]?.label||"Sin datos"}</Pill>
            </div>
            <span style={{fontSize:"18px",color:h.total<0?"#FF6B6B":"#FFD700",fontWeight:"bold"}}>{h.total>0?"+":""}{h.total}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PublicReport() {
  const [players, setPlayers]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState(null);

  useEffect(()=>{
    supabase.from("players").select("*").eq("active",true).then(({data})=>{
      if(data) {
        const sorted = data.sort((a,b)=>{
          const totalA = (a.pts_acumulados||0) + totalPts(a) + (a.pts_honorificos||0);
          const totalB = (b.pts_acumulados||0) + totalPts(b) + (b.pts_honorificos||0);
          return totalB - totalA;
        });
        setPlayers(sorted);
      }
      setLoading(false);
    });
  },[]);

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",display:"flex",alignItems:"center",justifyContent:"center",color:"#FFD700",fontFamily:"serif",fontSize:"18px"}}>
      Cargando ranking...
    </div>
  );

  if (selected) return <PlayerProfile player={selected} onBack={()=>setSelected(null)}/>;

  return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",padding:"20px",fontFamily:"Georgia,serif",color:"#d4c9a8"}}>
      <div style={{maxWidth:"500px",margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:"20px"}}>
          <div style={{fontSize:"9px",color:"#40E0FF",letterSpacing:"0.3em"}}>ANTIGUA ORDEN</div>
          <div style={{fontFamily:"serif",fontSize:"22px",color:"#FFD700"}}>[AOR] Ranking</div>
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.3)",marginTop:"4px"}}>Toca un nombre para ver su perfil ↓</div>
          <div style={{marginTop:"10px",display:"flex",gap:"8px",justifyContent:"center"}}>
            <a href="/registro" style={{fontSize:"11px",color:"#A8FF78",textDecoration:"none",padding:"4px 12px",border:"1px solid rgba(168,255,120,0.3)",borderRadius:"20px"}}>Ir a registro →</a>
            <a href="/puntos" style={{fontSize:"11px",color:"#FFD700",textDecoration:"none",padding:"4px 12px",border:"1px solid rgba(255,215,0,0.3)",borderRadius:"20px"}}>❓ Cómo funciona</a>
          </div>
        </div>

        {/* Ranks table */}
        <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,215,0,0.15)",borderRadius:"8px",padding:"12px",marginBottom:"16px"}}>
          <div style={{fontFamily:"serif",color:"#FFD700",fontSize:"12px",marginBottom:"8px"}}>⚜️ Sistema de Rangos [AOR]</div>
          {RANKS.map(r=>(
            <div key={r.label} style={{display:"flex",justifyContent:"space-between",padding:"4px 6px",marginBottom:"2px",borderRadius:"4px",background:r.color+"08"}}>
              <div>
                <span style={{fontSize:"11px",color:r.color,fontWeight:"bold"}}>{r.label}</span>
                <span style={{fontSize:"10px",color:"rgba(255,255,255,0.3)",marginLeft:"8px"}}>{r.desc}</span>
              </div>
              <span style={{fontSize:"10px",color:r.color}}>{r.min>=0?r.min.toLocaleString()+"+ pts":"< 0 pts"}</span>
            </div>
          ))}
          <div style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",marginTop:"6px",textAlign:"center"}}>
            Mínimo mensual: 20 pts · -100 pts = candidato a expulsión
          </div>
        </div>

        {/* Players */}
        {players.map((p,i)=>{
          const pts  = totalPts(p);
          const acc  = p.pts_acumulados||0;
          const hon  = p.pts_honorificos||0;
          const combined = acc + pts + hon;
          const rank = getRank(acc, p.pts_honorificos, p.name);
          const avail = AVAILABILITY[p.availability]||AVAILABILITY.pendiente;
          return (
            <div key={p.id} onClick={()=>setSelected(p)} style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.08)",borderLeft:"3px solid "+rank.color,borderRadius:"8px",padding:"10px 14px",marginBottom:"6px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
              <div style={{display:"flex",gap:"10px",alignItems:"center"}}>
                <span style={{fontSize:"14px",color:i<3?"#FFD700":"rgba(255,255,255,0.4)",minWidth:"24px"}}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":(i+1)+"."}</span>
                <div>
                  <div style={{fontSize:"13px",color:"#40E0FF",textDecoration:"underline",marginBottom:"3px"}}>{p.name}</div>
                  <div style={{display:"flex",gap:"4px",flexWrap:"wrap",marginBottom:"2px"}}>
                    <Pill color={rank.color}>{rank.label}</Pill>
                    <Pill color={avail.color}>{avail.icon} {avail.label}</Pill>
                    {hon>0 && <Pill color="#FFD700">⭐ {hon.toLocaleString()}</Pill>}
                  </div>
                  <div style={{display:"flex",gap:"8px",fontSize:"10px",color:"rgba(255,255,255,0.35)"}}>
                    <span>⚔ {((p.level||0)/1000).toFixed(1)}k</span>
                    <span>💀 {(p.bp||0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:"16px",color:combined>=0?rank.color:"#FF6B6B",fontWeight:"bold"}}>{combined.toLocaleString()}</div>
                <div style={{fontSize:"10px",color:"rgba(255,255,255,0.3)"}}>{acc} acum + {pts} hoy</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

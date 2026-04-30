export const PAGES = [
  { href:"/",             label:"HOME",              color:"#FFD700", accent:"rgba(255,215,0,0.15)",  border:"rgba(255,215,0,0.35)"  },
  { href:"/registro",     label:"Registro de Guerra", color:"#A8FF78", accent:"rgba(168,255,120,0.08)", border:"rgba(168,255,120,0.3)" },
  { href:"/reporte",      label:"Ranking",            color:"#40E0FF", accent:"rgba(64,224,255,0.08)",  border:"rgba(64,224,255,0.3)"  },
  { href:"/puntos",       label:"Sistema de Puntos",  color:"#FF9F43", accent:"rgba(255,159,67,0.08)",  border:"rgba(255,159,67,0.3)"  },
  { href:"/propaganda",   label:"Propaganda",         color:"#C8A2FF", accent:"rgba(200,162,255,0.08)", border:"rgba(200,162,255,0.3)" },
  { href:"/inteligencia", label:"Inteligencia",       color:"#FF6B6B", accent:"rgba(255,107,107,0.08)", border:"rgba(255,107,107,0.3)" },
  { href:"/asamblea",     label:"Asamblea",           color:"#FFD700", accent:"rgba(255,215,0,0.08)",   border:"rgba(255,215,0,0.25)"  },
];

export default function NavBar({current}) {
  const current_href = current || "";
  return (
    <div style={{marginBottom:"24px"}}>
      {/* Home button - big */}
      <a href="/" style={{
        display:"block", textAlign:"center", padding:"10px",
        background:"rgba(255,215,0,0.08)", border:"1px solid rgba(255,215,0,0.3)",
        borderRadius:"10px", textDecoration:"none", marginBottom:"8px",
        transition:"all 0.15s",
      }}>
        <div style={{fontSize:"9px",letterSpacing:"0.4em",color:"rgba(255,255,255,0.3)",fontFamily:"monospace",marginBottom:"2px"}}>ANTIGUA ORDEN</div>
        <div style={{fontSize:"14px",color:"rgba(255,255,255,0.2)",marginBottom:"2px"}}>⚔</div>
        <div style={{fontSize:"9px",letterSpacing:"0.3em",color:"rgba(255,215,0,0.5)",fontFamily:"monospace",marginBottom:"2px"}}>[AOR]</div>
        <div style={{fontSize:"14px",color:"#FFD700",fontFamily:"monospace",fontWeight:"bold",letterSpacing:"0.2em"}}>HOME</div>
      </a>
      {/* Other pages - grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"6px"}}>
        {PAGES.slice(1).map(p=>{
          const isCurrent = current_href === p.href;
          return (
            <a key={p.href} href={p.href} style={{
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              padding:"8px 4px", textDecoration:"none",
              background: isCurrent ? p.accent : "rgba(255,255,255,0.02)",
              border:"1px solid "+(isCurrent ? p.border : "rgba(255,255,255,0.07)"),
              borderRadius:"8px", textAlign:"center",
            }}>
              <div style={{fontSize:"10px",color: isCurrent ? p.color : "rgba(255,255,255,0.35)",fontFamily:"monospace",letterSpacing:"0.05em",fontWeight: isCurrent?"bold":"normal"}}>
                {p.label}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

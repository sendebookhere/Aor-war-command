export default function Puntos({onBack}) {
  return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",padding:"20px",fontFamily:"Georgia,serif",color:"#d4c9a8"}}>
      <div style={{maxWidth:"500px",margin:"0 auto"}}>
        <button onClick={onBack} style={{background:"transparent",border:"none",color:"#40E0FF",cursor:"pointer",fontSize:"13px",marginBottom:"16px",padding:0}}>← Volver</button>

        <div style={{textAlign:"center",marginBottom:"24px"}}>
          <div style={{fontSize:"9px",color:"#40E0FF",letterSpacing:"0.3em"}}>ANTIGUA ORDEN</div>
          <div style={{fontFamily:"serif",fontSize:"22px",color:"#FFD700"}}>[AOR] Sistema de Puntos</div>
          <div style={{fontSize:"11px",color:"rgba(255,255,255,0.4)",marginTop:"4px"}}>Cómo ganar y perder puntos en cada guerra</div>
        </div>

        {/* PASO 1: Registrate */}
        <div style={{background:"rgba(64,224,255,0.08)",border:"2px solid #40E0FF",borderRadius:"10px",padding:"14px",marginBottom:"12px"}}>
          <div style={{fontSize:"13px",color:"#40E0FF",fontWeight:"bold",marginBottom:"8px"}}>📋 PASO 1 — Regístrate antes del jueves</div>
          <div style={{fontSize:"11px",color:"rgba(255,255,255,0.7)",marginBottom:"8px"}}>Antes de cada guerra (cierra jueves 12am hora México) entra al formulario de registro y confirma tu participación.</div>
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            {[
              {label:"Siempre listo 🟢",pts:"+10",color:"#A8FF78",desc:"Disponible toda la guerra"},
              {label:"Intermitente 🟡",pts:"+5",color:"#FFD700",desc:"Disponible en uno de los dos periodos"},
              {label:"Solo una vez 🟠",pts:"+2",color:"#FF9F43",desc:"Una sola participación"},
              {label:"No disponible 🔴",pts:"+1",color:"#FF6B6B",desc:"Avisas con anticipación"},
            ].map(r=>(
              <div key={r.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:r.color+"11",borderRadius:"6px",border:"1px solid "+r.color+"33"}}>
                <div>
                  <span style={{fontSize:"12px",color:r.color,fontWeight:"bold"}}>{r.label}</span>
                  <span style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginLeft:"8px"}}>{r.desc}</span>
                </div>
                <span style={{fontSize:"16px",color:r.color,fontWeight:"bold"}}>{r.pts}</span>
              </div>
            ))}
          </div>
        </div>

        {/* PASO 2: Participa */}
        <div style={{background:"rgba(168,255,120,0.08)",border:"2px solid #A8FF78",borderRadius:"10px",padding:"14px",marginBottom:"12px"}}>
          <div style={{fontSize:"13px",color:"#A8FF78",fontWeight:"bold",marginBottom:"8px"}}>⚔️ PASO 2 — Participa en la guerra</div>
          <div style={{fontSize:"11px",color:"rgba(255,255,255,0.7)",marginBottom:"8px"}}>Cada acción durante la guerra suma puntos. El admin los registra después de cada guerra.</div>
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            {[
              {label:"Apareciste y participaste",pts:"+3",color:"#A8FF78"},
              {label:"Seguiste las órdenes del admin",pts:"+2",color:"#FFD700"},
              {label:"Ganaste una batalla",pts:"+2",color:"#40E0FF"},
              {label:"Declaraste una batalla y la perdiste",pts:"+1",color:"#40E0FF"},
              {label:"Defendiste un castillo",pts:"+1",color:"#40E0FF"},
              {label:"Atacaste bandidos DESPUÉS de ganar",pts:"+1",color:"#A8FF78"},
              {label:"Cumpliste TODO perfectamente",pts:"+5",color:"#FFD700"},
              {label:"Participaste sin haberte registrado",pts:"+3",color:"#A8FF78"},
            ].map(r=>(
              <div key={r.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 10px",background:r.color+"08",borderRadius:"6px"}}>
                <span style={{fontSize:"11px",color:"rgba(255,255,255,0.7)"}}>{r.label}</span>
                <span style={{fontSize:"14px",color:r.color,fontWeight:"bold"}}>{r.pts}</span>
              </div>
            ))}
          </div>
        </div>

        {/* PENALIZACIONES */}
        <div style={{background:"rgba(255,107,107,0.08)",border:"2px solid #FF6B6B",borderRadius:"10px",padding:"14px",marginBottom:"12px"}}>
          <div style={{fontSize:"13px",color:"#FF6B6B",fontWeight:"bold",marginBottom:"8px"}}>❌ PENALIZACIONES — Lo que te quita puntos</div>
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            {[
              {label:"Dijiste Siempre listo y no apareciste",pts:"-10",color:"#FF6B6B"},
              {label:"Dijiste Intermitente y no apareciste",pts:"-7",color:"#FF6B6B"},
              {label:"Dijiste Solo una vez y no apareciste",pts:"-5",color:"#FF6B6B"},
              {label:"No te registraste y tampoco participaste",pts:"-20",color:"#FF6B6B"},
              {label:"Ignoraste una orden directa del admin",pts:"-2",color:"#FF9F43"},
              {label:"Abandonaste una defensa sin avisar",pts:"-2",color:"#FF9F43"},
              {label:"Estuviste inactivo +4h sin justificación",pts:"-3",color:"#FF9F43"},
              {label:"Atacaste bandidos ANTES de ganar la guerra",pts:"-1",color:"#FF9F43"},
            ].map(r=>(
              <div key={r.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 10px",background:"rgba(255,107,107,0.05)",borderRadius:"6px"}}>
                <span style={{fontSize:"11px",color:"rgba(255,255,255,0.7)"}}>{r.label}</span>
                <span style={{fontSize:"14px",color:r.color,fontWeight:"bold"}}>{r.pts}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RANGOS */}
        <div style={{background:"rgba(255,215,0,0.06)",border:"2px solid rgba(255,215,0,0.3)",borderRadius:"10px",padding:"14px",marginBottom:"12px"}}>
          <div style={{fontSize:"13px",color:"#FFD700",fontWeight:"bold",marginBottom:"8px"}}>🏆 RANGOS — Puntos acumulados totales</div>
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"8px"}}>Se acumulan guerra tras guerra. No se resetean.</div>
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            {[
              {label:"Co-Líder 👑",pts:"10,000+",color:"#FFD700"},
              {label:"Oficial ⚜️",pts:"1,000+",color:"#40E0FF"},
              {label:"Veterano ★★★",pts:"600+",color:"#A8FF78"},
              {label:"Guerrero ★★",pts:"300+",color:"#FFD700"},
              {label:"Soldado ★",pts:"100+",color:"#FF9F43"},
              {label:"Recluta",pts:"0+",color:"#888"},
              {label:"⚠ Vigilado",pts:"Negativo",color:"#FF6B6B"},
            ].map(r=>(
              <div key={r.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 10px",background:r.color+"08",borderRadius:"6px"}}>
                <span style={{fontSize:"12px",color:r.color,fontWeight:"bold"}}>{r.label}</span>
                <span style={{fontSize:"12px",color:r.color}}>{r.pts} pts</span>
              </div>
            ))}
          </div>
        </div>

        {/* MINIMO */}
        <div style={{background:"rgba(255,107,107,0.05)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:"8px",padding:"12px",textAlign:"center"}}>
          <div style={{fontSize:"12px",color:"#FF6B6B",marginBottom:"4px"}}>⚠️ Mínimo mensual: <strong>20 puntos</strong></div>
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)"}}>Dos meses seguidos bajo 20 pts → expulsión</div>
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)"}}>-100 pts acumulados → candidato a expulsión</div>
        </div>
      </div>
    </div>
  );
}

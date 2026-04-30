export default function Puntos({onBack}) {
  return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",padding:"20px",fontFamily:"Georgia,serif",color:"#d4c9a8"}}>
      <div style={{maxWidth:"600px",margin:"0 auto"}}>
        <button onClick={onBack} style={{background:"transparent",border:"none",color:"#40E0FF",cursor:"pointer",fontSize:"13px",marginBottom:"16px",padding:0}}>← Volver</button>
        <div style={{textAlign:"center",marginBottom:"24px"}}>
          <div style={{fontSize:"9px",color:"#40E0FF",letterSpacing:"0.3em"}}>ANTIGUA ORDEN</div>
          <div style={{fontFamily:"serif",fontSize:"22px",color:"#FFD700"}}>[AOR] Sistema de Puntos</div>
          <div style={{fontSize:"11px",color:"rgba(255,255,255,0.4)",marginTop:"4px"}}>Cómo ganar y perder puntos en cada guerra</div>
        </div>

        {/* REGISTRO */}
        <div style={{background:"rgba(64,224,255,0.08)",border:"2px solid #40E0FF",borderRadius:"10px",padding:"14px",marginBottom:"12px"}}>
          <div style={{fontSize:"13px",color:"#40E0FF",fontWeight:"bold",marginBottom:"8px"}}>📋 PASO 1 — Regístrate antes del viernes</div>
          <div style={{fontSize:"11px",color:"rgba(255,255,255,0.7)",marginBottom:"8px"}}>Cierra el <strong style={{color:"#FFD700"}}>viernes 7:00am Ecuador</strong> · 6:00am México · 14:00h España · una hora antes de que comience la guerra.</div>
          {[
            {label:"Conquistador 🟢",pts:"+10",color:"#A8FF78",desc:"Siempre listo — Disponible toda la guerra"},
            {label:"Refuerzos 🟡",pts:"+5",color:"#FFD700",desc:"Intermitente — Al menos una aparición por periodo"},
            {label:"Reserva 🟠",pts:"+2",color:"#FF9F43",desc:"Solo una vez — Una sola participación"},
            {label:"No disponible 🔴",pts:"+1",color:"#FF6B6B",desc:"Avisas con anticipación"},
          ].map(r=>(
            <div key={r.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:r.color+"11",borderRadius:"6px",border:"1px solid "+r.color+"33",marginBottom:"3px"}}>
              <div><span style={{fontSize:"12px",color:r.color,fontWeight:"bold"}}>{r.label}</span><span style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginLeft:"8px"}}>{r.desc}</span></div>
              <span style={{fontSize:"16px",color:r.color,fontWeight:"bold"}}>{r.pts}</span>
            </div>
          ))}
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginTop:"6px"}}>📊 Actualizar BP y Poder: +2 pts cada uno, +5 si actualizas ambos</div>
        </div>

        {/* PARTICIPACION */}
        <div style={{background:"rgba(168,255,120,0.08)",border:"2px solid #A8FF78",borderRadius:"10px",padding:"14px",marginBottom:"12px"}}>
          <div style={{fontSize:"13px",color:"#A8FF78",fontWeight:"bold",marginBottom:"8px"}}>⚔️ PASO 2 — Participa en la guerra</div>
          {[
            {label:"Apareciste y participaste (una vez por guerra)",pts:"+3",color:"#A8FF78"},
            {label:"Seguiste las órdenes del admin (una vez por guerra)",pts:"+2",color:"#FFD700"},
            {label:"Ganaste una batalla",pts:"+2 c/u",color:"#40E0FF"},
            {label:"Declaraste una batalla y la perdiste",pts:"+1 c/u",color:"#40E0FF"},
            {label:"Defendiste un castillo",pts:"+1 c/u",color:"#40E0FF"},
            {label:"6+ batallas ganadas — bonus automático",pts:"+10",color:"#FFD700"},
            {label:"Atacaste bandidos DESPUÉS de ganar la guerra",pts:"+1 c/u",color:"#A8FF78"},
            {label:"Cumpliste TODO perfectamente (una vez por guerra)",pts:"+5",color:"#FFD700"},
            {label:"Participaste sin haberte registrado antes",pts:"+1",color:"#A8FF78"},
            {label:"Actualizaste solo BP o solo Poder",pts:"+2",color:"#A8FF78"},
            {label:"Actualizaste BP y Poder juntos",pts:"+5",color:"#FFD700"},
          ].map(r=>(
            <div key={r.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 10px",background:r.color+"08",borderRadius:"6px",marginBottom:"2px"}}>
              <span style={{fontSize:"11px",color:"rgba(255,255,255,0.7)"}}>{r.label}</span>
              <span style={{fontSize:"14px",color:r.color,fontWeight:"bold"}}>{r.pts}</span>
            </div>
          ))}
        </div>

        {/* PENALIZACIONES */}
        <div style={{background:"rgba(255,107,107,0.08)",border:"2px solid #FF6B6B",borderRadius:"10px",padding:"14px",marginBottom:"12px"}}>
          <div style={{fontSize:"13px",color:"#FF6B6B",fontWeight:"bold",marginBottom:"8px"}}>❌ PENALIZACIONES</div>
          {[
            {label:"Dijiste Conquistador y no apareciste",pts:"-15",color:"#FF6B6B"},
            {label:"Dijiste Refuerzos y no apareciste",pts:"-10",color:"#FF6B6B"},
            {label:"Dijiste Reserva y no apareciste",pts:"-5",color:"#FF6B6B"},
            {label:"No te registraste y tampoco participaste",pts:"-20",color:"#FF6B6B"},
            {label:"Ignoraste una orden directa del admin",pts:"-2 c/vez",color:"#FF9F43"},
            {label:"Abandonaste una defensa sin avisar",pts:"-2 c/vez",color:"#FF9F43"},
            {label:"Estuviste inactivo +12h sin justificación",pts:"-3 c/vez",color:"#FF9F43"},
            {label:"Atacaste bandidos ANTES de ganar la guerra",pts:"-1 c/vez",color:"#FF9F43"},
          ].map(r=>(
            <div key={r.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 10px",background:"rgba(255,107,107,0.05)",borderRadius:"6px",marginBottom:"2px"}}>
              <span style={{fontSize:"11px",color:"rgba(255,255,255,0.7)"}}>{r.label}</span>
              <span style={{fontSize:"14px",color:r.color,fontWeight:"bold"}}>{r.pts}</span>
            </div>
          ))}
        </div>

        {/* WHATSAPP */}
        <div style={{background:"rgba(37,211,102,0.06)",border:"2px solid rgba(37,211,102,0.3)",borderRadius:"10px",padding:"14px",marginBottom:"12px"}}>
          <div style={{fontSize:"13px",color:"#25D366",fontWeight:"bold",marginBottom:"8px"}}>📱 GRUPO DE WHATSAPP [AOR]</div>
          {[
            {label:"Ya estabas en el grupo al lanzar la app",pts:"+50",color:"#25D366",desc:"Puntos de fundador"},
            {label:"Te unes al grupo ahora",pts:"+25",color:"#A8FF78",desc:"El admin lo actualiza en el Roster"},
          ].map(r=>(
            <div key={r.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:r.color+"08",borderRadius:"6px",border:"1px solid "+r.color+"22",marginBottom:"3px"}}>
              <div><span style={{fontSize:"12px",color:r.color,fontWeight:"bold"}}>{r.label}</span><div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)"}}>{r.desc}</div></div>
              <span style={{fontSize:"16px",color:r.color,fontWeight:"bold"}}>{r.pts}</span>
            </div>
          ))}
        </div>

        {/* RANGOS */}
        <div style={{background:"rgba(255,215,0,0.06)",border:"2px solid rgba(255,215,0,0.3)",borderRadius:"10px",padding:"14px",marginBottom:"12px"}}>
          <div style={{fontSize:"13px",color:"#FFD700",fontWeight:"bold",marginBottom:"8px"}}>🏆 RANGOS — Puntos acumulados totales</div>
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"8px"}}>Se acumulan guerra tras guerra. Los rangos con * tienen bonus honorífico por el cargo.</div>
          {[
            {label:"Líder 👑",pts:"Designado",color:"#FFD700",hon:"25,000"},
            {label:"Co-Líder 👑",pts:"25,000+",color:"#FFD700",hon:"25,000"},
            {label:"Oficial ⚜️",pts:"5,000+",color:"#40E0FF",hon:"5,000"},
            {label:"Veterano ★★★",pts:"1,000+",color:"#A8FF78",hon:"—"},
            {label:"Guerrero ★★",pts:"500+",color:"#FFD700",hon:"—"},
            {label:"Soldado ★",pts:"100+",color:"#FF9F43",hon:"—"},
            {label:"Recluta",pts:"0+",color:"#888",hon:"—"},
            {label:"⚠ Vigilado",pts:"Negativo",color:"#FF6B6B",hon:"—"},
          ].map(r=>(
            <div key={r.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 10px",background:r.color+"08",borderRadius:"6px",marginBottom:"2px"}}>
              <span style={{fontSize:"12px",color:r.color,fontWeight:"bold"}}>{r.label}</span>
              <div style={{textAlign:"right"}}>
                <span style={{fontSize:"12px",color:r.color}}>{r.pts} pts</span>
                {r.hon!=="—" && <div style={{fontSize:"9px",color:"rgba(255,215,0,0.6)"}}>⭐ +{r.hon} honoríficos</div>}
              </div>
            </div>
          ))}
        </div>

        {/* ASCENSOS */}
        <div style={{background:"rgba(64,224,255,0.06)",border:"2px solid rgba(64,224,255,0.3)",borderRadius:"10px",padding:"14px",marginBottom:"12px"}}>
          <div style={{fontSize:"13px",color:"#40E0FF",fontWeight:"bold",marginBottom:"8px"}}>⚜️ ASCENSOS Y DESCENSOS DE RANGO</div>
          <div style={{fontSize:"11px",color:"rgba(255,255,255,0.6)",marginBottom:"6px"}}>📌 Ejemplo de ascenso:</div>
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.5)",background:"rgba(168,255,120,0.05)",border:"1px solid rgba(168,255,120,0.15)",borderRadius:"6px",padding:"8px",marginBottom:"8px"}}>
            Oficial con 960 pts acumulados → ascendido a Co-Líder<br/>
            Puntos honoríficos: 5,000 → 25,000 (+20,000)<br/>
            <strong style={{color:"#A8FF78"}}>Total nuevo: 25,960 pts</strong>
          </div>
          <div style={{fontSize:"11px",color:"rgba(255,255,255,0.6)",marginBottom:"6px"}}>⚠️ Ejemplo de descenso:</div>
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.5)",background:"rgba(255,107,107,0.05)",border:"1px solid rgba(255,107,107,0.15)",borderRadius:"6px",padding:"8px"}}>
            Co-Líder con 960 pts acumulados → bajado a Oficial<br/>
            Puntos honoríficos: 25,000 → 5,000 (-20,000)<br/>
            <strong style={{color:"#FF6B6B"}}>Total nuevo: 5,960 pts (baja a Oficial)</strong><br/><br/>
            Si se baja a Recluta → honoríficos = 0<br/>
            <strong style={{color:"#FF6B6B"}}>Total nuevo: -19,040 pts (Vigilado ⚠)</strong>
          </div>
        </div>

        <div style={{background:"rgba(255,107,107,0.05)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:"8px",padding:"12px",textAlign:"center"}}>
          <div style={{fontSize:"12px",color:"#FF6B6B",marginBottom:"4px"}}>⚠️ Mínimo mensual: <strong>20 puntos</strong></div>
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)"}}>-100 pts acumulados → candidato a expulsión</div>
        </div>
      </div>
    </div>
  );
}

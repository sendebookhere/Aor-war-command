import PageHeader from "./PageHeader";
import NavBar from "./NavBar";
import NalguitasFooter from "./NalguitasFooter";

const S = {
  card: (color) => ({
    background: color+"09",
    border: "1px solid "+color+"30",
    borderLeft: "3px solid "+color+"80",
    borderRadius: "8px",
    padding: "14px",
    marginBottom: "10px",
  }),
  title: (color) => ({
    fontFamily: "monospace",
    fontSize: "9px",
    letterSpacing: "0.25em",
    color: color,
    marginBottom: "10px",
    opacity: 0.8,
  }),
  row: (color, active) => ({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "6px 8px",
    marginBottom: "3px",
    background: active ? color+"12" : "rgba(255,255,255,0.02)",
    borderRadius: "5px",
    border: "1px solid "+(active ? color+"25" : "rgba(255,255,255,0.04)"),
  }),
  pts: (color) => ({
    fontFamily: "monospace",
    fontSize: "13px",
    fontWeight: "bold",
    color: color,
    flexShrink: 0,
    marginLeft: "8px",
  }),
  link: (color) => ({
    display: "block",
    marginTop: "10px",
    padding: "6px 10px",
    background: color+"08",
    border: "1px solid "+color+"20",
    borderRadius: "5px",
    color: color,
    textDecoration: "none",
    fontFamily: "monospace",
    fontSize: "9px",
    letterSpacing: "0.15em",
    textAlign: "center",
  }),
};

function Row({label, pts, desc, color="#40E0FF", active=false}) {
  return (
    <div style={S.row(color, active)}>
      <div style={{flex:1}}>
        <div style={{fontSize:"11px",color:active?color:"rgba(255,255,255,0.65)",fontFamily:"Georgia,serif"}}>{label}</div>
        {desc && <div style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",marginTop:"2px",fontFamily:"monospace"}}>{desc}</div>}
      </div>
      <span style={S.pts(color)}>{pts}</span>
    </div>
  );
}

export default function Puntos() {
  return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",padding:"20px",fontFamily:"Georgia,serif",color:"#d4c9a8",paddingBottom:"50px"}}>
      <div style={{maxWidth:"600px",margin:"0 auto"}}>
        <NavBar current="/puntos"/>
        <PageHeader page="/puntos"/>

        {/* ── PASO 1: REGISTRO ─────────────────────────────────────────── */}
        <div style={S.card("#40E0FF")}>
          <div style={S.title("#40E0FF")}>PASO 1 — REGISTRO DE DISPONIBILIDAD</div>

          <div style={{background:"rgba(255,255,255,0.02)",borderRadius:"6px",padding:"8px 10px",marginBottom:"10px",borderLeft:"2px solid rgba(255,255,255,0.08)"}}>
            <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,255,255,0.3)",letterSpacing:"0.1em",marginBottom:"4px"}}>CIERRE DE REGISTRO</div>
            <div style={{fontSize:"10px",color:"rgba(255,255,255,0.5)",marginBottom:"4px"}}>
              <strong style={{color:"#FFD700"}}>Modo clásico:</strong>{" "}cierra viernes{" "}
              <strong style={{color:"#A8FF78",fontSize:"12px"}}>14:00h España</strong>
              <span style={{color:"rgba(255,255,255,0.3)"}}>{" · "}8:00am Ecuador · 7:00am México</span>
            </div>
            <div style={{fontSize:"10px",color:"rgba(255,255,255,0.5)",marginBottom:"4px"}}>
              <strong style={{color:"#FFD700"}}>Modo nuevo (test):</strong>{" "}cierra viernes{" "}
              <strong style={{color:"#FF9F43",fontSize:"12px"}}>22:00h España</strong>
              <span style={{color:"rgba(255,255,255,0.3)"}}>{" · "}16:00h Ecuador · 15:00h México</span>
            </div>
            <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,255,255,0.2)",marginTop:"4px"}}>
              Clásico: guerra vie 9h → dom 9h España (vie 8h Ecuador) · Nuevo: vie 18h → sáb 18h España (vie 16h Ecuador)
            </div>
          </div>

          {[
            {label:"Conquistador",pts:"+10",color:"#A8FF78",desc:"Disponible toda la guerra"},
            {label:"Refuerzos",pts:"+5",color:"#FFD700",desc:"Al menos una aparición por periodo"},
            {label:"Reserva",pts:"+2",color:"#FF9F43",desc:"Una sola participación"},
            {label:"No disponible",pts:"+1",color:"rgba(255,107,107,0.7)",desc:"Avisas con anticipación"},
          ].map(r=><Row key={r.label} {...r}/>)}

          <div style={{background:"rgba(255,215,0,0.06)",borderRadius:"6px",padding:"8px 10px",marginTop:"8px",border:"1px solid rgba(255,215,0,0.15)"}}>
            <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,215,0,0.5)",letterSpacing:"0.1em",marginBottom:"6px"}}>BONUS REGISTRO ANTICIPADO — antes del miércoles 23:59h España</div>
            {[
              {label:"Conquistador",pts:"+5 bonus",color:"#A8FF78"},
              {label:"Refuerzos",pts:"+2 bonus",color:"#FFD700"},
              {label:"Reserva",pts:"+2 bonus",color:"#FF9F43"},
            ].map(r=><Row key={r.label} {...r}/>)}
          </div>
        </div>

        {/* ── PASO 2: DURANTE LA GUERRA ─────────────────────────────────── */}
        <div style={S.card("#A8FF78")}>
          <div style={S.title("#A8FF78")}>PASO 2 — DURANTE LA GUERRA</div>
          <Row label="Apareciste y participaste" pts="+3" color="#A8FF78" desc="Una vez por guerra"/>
          <Row label="Seguiste las órdenes del admin" pts="+2" color="#A8FF78" desc="Una vez por guerra"/>
          <Row label="Batalla ganada" pts="+2 c/u" color="#40E0FF"/>
          <Row label="Batalla perdida" pts="+1 c/u" color="#40E0FF"/>
          <Row label="Defendiste un castillo" pts="+1 c/u" color="#40E0FF"/>
          <Row label="6+ batallas ganadas en una guerra" pts="+10" color="#FFD700" desc="Bonus automático"/>
          <Row label="Atacaste bandidos después de ganar" pts="+1 c/u" color="#A8FF78"/>
          <Row label="Bonus completo — cumpliste todo" pts="+5" color="#FFD700" desc="Una vez por guerra"/>
          <Row label="Participaste sin registrarte" pts="+1" color="rgba(255,255,255,0.4)"/>
          <Row label="Actualizar solo BP o solo Poder" pts="+2" color="#40E0FF"/>
          <Row label="Actualizar BP y Poder juntos" pts="+5" color="#40E0FF" active/>
          <Row label="Primer movilizador de tropas" pts="+3" color="#FFD700" desc="Solo el primero"/>
          <Row label="Fuera del castillo sin defenderlo" pts="-2 c/u" color="#FF6B6B"/>
        </div>

        {/* ── PENALIZACIONES ────────────────────────────────────────────── */}
        <div style={S.card("#FF6B6B")}>
          <div style={S.title("#FF6B6B")}>PENALIZACIONES</div>
          <Row label="Conquistador — no apareció" pts="-15" color="#FF6B6B"/>
          <Row label="Refuerzos — no apareció" pts="-10" color="#FF6B6B"/>
          <Row label="Reserva — no apareció" pts="-5" color="#FF6B6B"/>
          <Row label="Sin registro y sin participar" pts="-20" color="#FF6B6B" active/>
          <Row label="Ignorar una orden directa" pts="-2 c/u" color="#FF9F43"/>
          <Row label="Abandonar defensa sin avisar" pts="-2 c/u" color="#FF9F43"/>
          <Row label="Fuera del castillo sin defenderlo" pts="-2 c/u" color="#FF9F43"/>
          <Row label="Inactivo +12h sin justificación" pts="-3 c/vez" color="#FF9F43"/>
          <Row label="Atacar bandidos antes de ganar" pts="-1 c/vez" color="#FF9F43"/>
          <div style={{marginTop:"8px",padding:"6px 8px",background:"rgba(255,107,107,0.06)",borderRadius:"4px",fontFamily:"monospace",fontSize:"9px",color:"rgba(255,107,107,0.5)"}}>
            Mínimo mensual: 20 pts · -100 acumulados = candidato a expulsión
          </div>
        </div>

        {/* ── PROPAGANDA ────────────────────────────────────────────────── */}
        <div style={S.card("#C8A2FF")}>
          <div style={S.title("#C8A2FF")}>PROPAGANDA DE GUERRA</div>
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.5)",marginBottom:"8px",lineHeight:"1.6"}}>
            Difunde mensajes preaprobados en el chat general del juego para atraer nuevos guerreros.
          </div>
          <Row label="Publicar un mensaje aprobado" pts="Reputación" color="#C8A2FF" desc={`Hasta el límite diario. Cooldown: 2h entre envíos`}/>
          <Row label="Publicación falsa detectada" pts="-50" color="#FF6B6B" desc="Confirmar sin haber enviado"/>
          <a href="/propaganda" style={S.link("#C8A2FF")}>→ ABRIR PROPAGANDA DE GUERRA</a>
        </div>

        {/* ── INTELIGENCIA MILITAR ──────────────────────────────────────── */}
        <div style={S.card("#FF6B6B")}>
          <div style={S.title("#FF6B6B")}>INTELIGENCIA MILITAR</div>
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.5)",marginBottom:"8px",lineHeight:"1.6"}}>
            Registro de guerras y análisis de rivales. Vota por la dificultad de los clanes enemigos.
          </div>
          <Row label="Votar dificultad de rivales" pts="+3" color="#FF9F43" desc="3 votos ponderados — Conquistador/Refuerzos/Reserva"/>
          <div style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",margin:"4px 0 6px",fontFamily:"monospace"}}>
            Un solo rival: votas si quieres volver a enfrentarte a él
          </div>
          <a href="/inteligencia" style={S.link("#FF6B6B")}>→ ABRIR INTELIGENCIA MILITAR</a>
        </div>

        {/* ── ASAMBLEA DE CENTURIAS ─────────────────────────────────────── */}
        <div style={S.card("#FFD700")}>
          <div style={S.title("#FFD700")}>ASAMBLEA — GUERRERO IMPLACABLE</div>
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.5)",marginBottom:"8px",lineHeight:"1.6"}}>
            Vota por el jugador más determinante de la semana. Solo Conquistador, Refuerzos y Reserva votan y son candidatos.
          </div>

          <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,255,255,0.25)",letterSpacing:"0.1em",marginBottom:"5px"}}>PESO DEL VOTO = RANGO + DISPONIBILIDAD</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px",marginBottom:"8px"}}>
            {[
              {r:"Líder (PUNK'Z)",p:5},{r:"Co-Líder",p:4},{r:"Oficial",p:3},{r:"Veterano",p:2},{r:"Guerrero · Soldado · Recluta",p:1}
            ].map(x=>(
              <div key={x.r} style={{display:"flex",justifyContent:"space-between",padding:"3px 7px",background:"rgba(255,215,0,0.04)",borderRadius:"4px",border:"1px solid rgba(255,215,0,0.08)"}}>
                <span style={{fontSize:"9px",color:"rgba(255,255,255,0.5)",fontFamily:"Georgia,serif"}}>{x.r}</span>
                <span style={{fontSize:"9px",color:"#FFD700",fontFamily:"monospace",fontWeight:"bold"}}>{x.p}</span>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:"4px",marginBottom:"8px"}}>
            {[{a:"Conquistador",b:"+3",c:"#A8FF78"},{a:"Refuerzos",b:"+2",c:"#FFD700"},{a:"Reserva",b:"+1",c:"#FF9F43"}].map(x=>(
              <div key={x.a} style={{flex:1,padding:"4px",background:x.c+"08",border:"1px solid "+x.c+"20",borderRadius:"4px",textAlign:"center"}}>
                <div style={{fontSize:"8px",color:x.c,fontFamily:"monospace"}}>{x.a}</div>
                <div style={{fontSize:"12px",color:x.c,fontWeight:"bold",fontFamily:"monospace"}}>{x.b}</div>
              </div>
            ))}
          </div>
          <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,255,255,0.25)",letterSpacing:"0.1em",marginBottom:"5px"}}>RECOMPENSAS</div>
          <Row label="Votar" pts="+3" color="#A8FF78"/>
          <Row label="Más votado — Guerrero Implacable" pts="+10" color="#FFD700" desc="Único ganador"/>
          <Row label="Mayor puntaje de la jornada" pts="+10" color="#40E0FF" desc="Único ganador"/>
          <Row label="Ambos: Pichichi" pts="+10 extra = 30" color="#A8FF78" active desc="Mismo jugador gana los dos"/>
          <Row label="Empate en puntaje" pts="+3 c/u" color="rgba(255,255,255,0.4)" desc="Cada empatado recibe 3 pts"/>
          <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,215,0,0.35)",letterSpacing:"0.1em",margin:"8px 0 4px"}}>RACHAS CONSECUTIVAS</div>
          <Row label="2 semanas consecutivas" pts="+20" color="#FFD700"/>
          <Row label="3+ semanas (sube +10/semana)" pts="+30+" color="#FFD700"/>
          <a href="/asamblea" style={S.link("#FFD700")}>→ ABRIR ASAMBLEA</a>
        </div>

        {/* ── RANGOS ────────────────────────────────────────────────────── */}
        <div style={S.card("#FF9F43")}>
          <div style={S.title("#FF9F43")}>RANGOS — PUNTOS ACUMULADOS</div>
          {[
            {label:"Líder 👑",desc:"Designado",color:"#FFD700"},
            {label:"Co-Líder 👑",desc:"25,000+ pts",color:"#FFD700"},
            {label:"Oficial ⚜",desc:"5,000+ pts",color:"#40E0FF"},
            {label:"Veterano ★★★",desc:"1,000+ pts",color:"#A8FF78"},
            {label:"Guerrero ★★",desc:"500+ pts",color:"#FF9F43"},
            {label:"Soldado ★",desc:"100+ pts",color:"rgba(255,255,255,0.5)"},
            {label:"Recluta",desc:"0+ pts",color:"rgba(255,255,255,0.3)"},
            {label:"⚠ Vigilado",desc:"Puntos negativos",color:"#FF6B6B"},
          ].map(r=>(
            <div key={r.label} style={{display:"flex",justifyContent:"space-between",padding:"5px 8px",marginBottom:"2px",background:"rgba(255,255,255,0.02)",borderRadius:"4px"}}>
              <span style={{fontSize:"11px",color:r.color,fontFamily:"Georgia,serif"}}>{r.label}</span>
              <span style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",fontFamily:"monospace"}}>{r.desc}</span>
            </div>
          ))}
        </div>

      </div>
      <NalguitasFooter/>
    </div>
  );
}

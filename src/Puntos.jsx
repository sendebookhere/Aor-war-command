import NavBar from "./NavBar";
import PageHeader from "./PageHeader";
import NalguitasFooter from "./NalguitasFooter";
import { RANKS, PTS, SCHEDULE, MIN_MONTHLY_PTS, EXPULSION_THRESHOLD, spainOffset } from "./GameRules";

// ── All values read from GameRules.js — single source of truth ───────────────

function Row({label,pts,desc,color="#40E0FF",highlight=false}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"5px 8px",marginBottom:"2px",background:highlight?"rgba(255,215,0,0.06)":"rgba(255,255,255,0.02)",borderRadius:"5px",border:"1px solid "+(highlight?"rgba(255,215,0,0.15)":"rgba(255,255,255,0.04)")}}>
      <div style={{flex:1}}>
        <div style={{fontSize:"11px",color:"rgba(255,255,255,0.7)",fontFamily:"Georgia,serif"}}>{label}</div>
        {desc&&<div style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",marginTop:"1px",fontFamily:"monospace"}}>{desc}</div>}
      </div>
      <span style={{fontFamily:"monospace",fontSize:"12px",fontWeight:"bold",color,flexShrink:0,marginLeft:"8px"}}>{pts}</span>
    </div>
  );
}

function Card({title,color,children}){
  return(
    <div style={{background:color+"09",border:"1px solid "+color+"28",borderLeft:"3px solid "+color+"70",borderRadius:"8px",padding:"14px",marginBottom:"10px"}}>
      <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.25em",color:color,marginBottom:"10px",opacity:0.85}}>{title}</div>
      {children}
    </div>
  );
}

function TimeBox({label,sched}){
  // sched = { day, h, m } in Ecuador time
  const off = spainOffset();
  const esH = (sched.h + off) % 24;
  const esDay = (sched.h + off) >= 24
    ? {lun:"mar",mar:"mié","mié":"jue",jue:"vie",vie:"sáb","sáb":"dom",dom:"lun"}[sched.day]
    : sched.day;
  const mxH = sched.h - 1 < 0 ? sched.h + 23 : sched.h - 1;
  const fmt12 = h => { const p=h<12?"am":"pm"; const h12=h%12||12; return `${h12}:00${p}`; };
  const fmt24 = h => `${String(h).padStart(2,"0")}:00h`;
  const offLabel = off === 7 ? "verano" : "invierno";
  return(
    <div style={{background:"rgba(255,255,255,0.02)",padding:"6px 8px",borderRadius:"5px"}}>
      <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,215,0,0.5)",marginBottom:"2px"}}>{label}</div>
      <div style={{fontSize:"12px",color:"rgba(255,255,255,0.8)",fontWeight:"bold"}}>{fmt24(esH)} España <span style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",fontWeight:"normal"}}>({offLabel})</span></div>
      <div style={{fontSize:"9px",color:"rgba(255,255,255,0.4)",fontFamily:"monospace"}}>{sched.day} {fmt12(sched.h)} Ecuador · {sched.day} {fmt12(mxH)} México</div>
    </div>
  );
}

export default function Puntos(){
  const P = PTS; // alias for brevity

  return(
    <div style={{minHeight:"100vh",background:"#0d0d0f",padding:"20px",fontFamily:"Georgia,serif",color:"#d4c9a8",paddingBottom:"50px"}}>
      <div style={{maxWidth:"600px",margin:"0 auto"}}>
        <NavBar current="/puntos"/>
        <PageHeader page="/puntos"/>

        <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",padding:"12px 14px",marginBottom:"14px"}}>
          <div style={{fontFamily:"monospace",fontSize:"7px",letterSpacing:"0.3em",color:"rgba(64,224,255,0.4)",marginBottom:"6px"}}>SISTEMA DE PUNTOS — ANTIGUA ORDEN [AOR]</div>
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",lineHeight:"1.7"}}>
            Guía oficial de todas las formas de ganar y perder puntos. El ciclo semanal corre de viernes a viernes. Al cerrar la semana los puntos de guerra se archivan al acumulado permanente. Los puntos de rango son un colchón defensivo — no se suman en ningún contador ni ranking.
          </div>
        </div>

        {/* CÓDIGO ÚNICO */}
        <Card title="ACCESO CON CÓDIGO ÚNICO" color="#FFD700">
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"8px"}}>Configura tu código de 6 dígitos en tu perfil. Se guarda en tu dispositivo.</div>
          <Row label="Primera entrada del día con código único" pts={"+"+P.codigo_unico_dia} color="#FFD700" desc="Una vez por día · reinicia medianoche Ecuador"/>
        </Card>

        {/* REGISTRO */}
        <Card title="REGISTRO DE DISPONIBILIDAD" color="#40E0FF">
          {/* Schedules from GameRules.SCHEDULE */}
          <div style={{background:"rgba(255,255,255,0.02)",borderRadius:"6px",padding:"8px 10px",marginBottom:"10px",border:"1px solid rgba(255,255,255,0.06)"}}>
            <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,255,255,0.3)",letterSpacing:"0.1em",marginBottom:"6px"}}>HORARIOS — CIERRE DEL REGISTRO</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px",marginBottom:"6px"}}>
              <TimeBox label="Sistema 1 — Castillos" sched={SCHEDULE.classic.regClose}/>
              <TimeBox label="Sistema 2 — Ciudades" sched={SCHEDULE.new.regClose}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px"}}>
              <TimeBox label="Registro ABRE" sched={SCHEDULE.regOpen}/>
              <TimeBox label="Bonus anticipado CIERRA" sched={SCHEDULE.earlyBonusEnd}/>
            </div>
          </div>
          <Row label="Conquistador" pts={"+"+P.registro.conquistador} color="#A8FF78" desc="Siempre listo — disponible toda la guerra"/>
          <Row label="Refuerzos" pts={"+"+P.registro.refuerzos} color="#FFD700" desc="Intermitente — al menos una aparición por periodo"/>
          <Row label="Reserva" pts={"+"+P.registro.reserva} color="#FF9F43" desc="Solo una vez — una sola participación"/>
          <Row label="No disponible" pts={"+"+P.registro.no_disponible} color="rgba(255,255,255,0.4)" desc="Avisas con anticipación"/>
          <div style={{marginTop:"8px",padding:"8px 10px",background:"rgba(255,215,0,0.05)",border:"1px solid rgba(255,215,0,0.15)",borderRadius:"6px"}}>
            <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,215,0,0.5)",letterSpacing:"0.1em",marginBottom:"5px"}}>
              BONUS ANTICIPADO — registrarse antes del jueves 7:00am Ecuador
            </div>
            <Row label="Conquistador anticipado" pts={"+"+P.registro_bonus_anticipado.conquistador+" bonus"} color="#A8FF78"/>
            <Row label="Refuerzos o Reserva anticipados" pts={"+"+P.registro_bonus_anticipado.refuerzos+" bonus"} color="#FFD700"/>
          </div>
        </Card>

        {/* GUERRA */}
        <Card title="DURANTE LA GUERRA" color="#A8FF78">
          <Row label="Apareció y participó" pts={"+"+P.guerra.aparecio} color="#A8FF78" desc="Una vez por guerra"/>
          <Row label="Siguió las órdenes del admin" pts={"+"+P.guerra.siguio_ordenes} color="#A8FF78" desc="Una vez por guerra"/>
          <Row label="Batalla ganada" pts={"+"+P.guerra.batalla_ganada+" c/u"} color="#40E0FF"/>
          <Row label="Batalla perdida" pts={"+"+P.guerra.batalla_perdida+" c/u"} color="#40E0FF"/>
          <Row label="Defendió un castillo" pts={"+"+P.guerra.defensa+" c/u"} color="#40E0FF"/>
          <Row label="Bonus 6+ batallas ganadas" pts={"+"+P.guerra.bonus_6_batallas} color="#FFD700" highlight desc="Automático al superar 6 victorias en la misma guerra"/>
          <Row label="Bandidos post-batalla" pts={"+"+P.guerra.bandido_post+" c/u"} color="#A8FF78" desc="Atacar bandidos después de ganar"/>
          <Row label="Bonus completo" pts={"+"+P.guerra.bonus_completo} color="#FFD700" highlight desc="Cumplió todo en la guerra"/>
          <Row label="Participó sin haberse registrado" pts={"+"+P.guerra.sin_registro_participo} color="rgba(255,255,255,0.4)"/>
          <Row label="Primer movilizador de tropas" pts={"+"+P.guerra.primer_movilizador} color="#FFD700" desc="Solo el primero en mover tropas"/>
        </Card>

        {/* STATS */}
        <Card title="ACTUALIZACIÓN DE STATS" color="#40E0FF">
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"8px"}}>Actualiza tu BP, Poder y Nivel en tu perfil. Solo una vez por semana.</div>
          <Row label="Solo BP" pts={"+"+P.guerra.bp_solo} color="#40E0FF"/>
          <Row label="Solo Poder" pts={"+"+P.guerra.poder_solo} color="#40E0FF"/>
          <Row label="Solo Nivel (máx 340)" pts={"+"+P.guerra.nivel_solo} color="#40E0FF"/>
          <Row label="BP + Poder + Nivel juntos" pts={"+"+P.guerra.stats_completo} color="#40E0FF" highlight desc="Máximo — una vez por semana"/>
        </Card>

        {/* PENALIZACIONES */}
        <Card title="PENALIZACIONES" color="#FF6B6B">
          <Row label="Conquistador no apareció" pts={P.penalizaciones.conquistador_no_aparecio} color="#FF6B6B"/>
          <Row label="Refuerzos no apareció" pts={P.penalizaciones.refuerzos_no_aparecio} color="#FF6B6B"/>
          <Row label="Reserva no apareció" pts={P.penalizaciones.reserva_no_aparecio} color="#FF6B6B"/>
          <Row label="Sin registro y sin participar" pts={P.penalizaciones.sin_registro_sin_participar} color="#FF6B6B" highlight/>
          <Row label="Ignoró una orden directa" pts={P.penalizaciones.ignoro_orden+" c/u"} color="#FF9F43"/>
          <Row label="Abandonó defensa sin avisar" pts={P.penalizaciones.abandono_defensa+" c/u"} color="#FF9F43"/>
          <Row label="Fuera del castillo sin defenderlo" pts={P.penalizaciones.fuera_castillo+" c/u"} color="#FF9F43"/>
          <Row label="Inactivo +12h sin justificación" pts={P.penalizaciones.inactivo_12h+" c/vez"} color="#FF9F43"/>
          <Row label="Bandido pre-batalla (antes de ganar)" pts={P.penalizaciones.bandido_pre+" c/vez"} color="#FF9F43"/>
          <div style={{marginTop:"6px",padding:"6px 8px",background:"rgba(255,107,107,0.06)",borderRadius:"4px",fontFamily:"monospace",fontSize:"9px",color:"rgba(255,107,107,0.4)"}}>
            Mínimo mensual para sostener rango: {MIN_MONTHLY_PTS} pts activos · {EXPULSION_THRESHOLD} acumulados = candidato a expulsión (admin decide)
          </div>
        </Card>

        {/* PROPAGANDA */}
        <Card title="PROPAGANDA DE GUERRA" color="#C8A2FF">
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"8px"}}>Difunde mensajes del clan en el chat general del juego. Cooldown de {P.PROPAGANDA_COOLDOWN_MIN}min entre envíos.</div>
          <Row label="Publicar un mensaje aprobado" pts={"+"+P.propaganda.mensaje_confirmado} color="#C8A2FF" desc="Por cada mensaje confirmado en el sistema"/>
          <Row label="Publicación falsa detectada" pts={P.propaganda.publicacion_falsa} color="#FF6B6B" desc="Confirmar sin haber enviado el mensaje"/>
        </Card>

        {/* INTELIGENCIA */}
        <Card title="INTELIGENCIA MILITAR" color="#FF6B6B">
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"8px"}}>Analiza y vota la dificultad de los clanes rivales.</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"3px",marginBottom:"8px"}}>
            {Object.entries(P.INTEL_VOTE_WEIGHTS).map(([rol,peso])=>(
              <div key={rol} style={{textAlign:"center",padding:"4px 2px",background:"rgba(255,107,107,0.04)",borderRadius:"4px"}}>
                <div style={{fontSize:"8px",color:"rgba(255,255,255,0.4)",fontFamily:"monospace"}}>{rol}</div>
                <div style={{fontSize:"13px",color:"#FF6B6B",fontWeight:"bold",fontFamily:"monospace"}}>×{peso}</div>
              </div>
            ))}
          </div>
          <Row label="Votar dificultad de un rival" pts={"+"+P.intel.voto_dificultad} color="#FF9F43" desc="El voto se pondera por tu disponibilidad registrada"/>
        </Card>

        {/* ASAMBLEA */}
        <Card title="ASAMBLEA — GUERRERO IMPLACABLE" color="#FFD700">
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"8px",lineHeight:"1.5"}}>
            Solo {P.ASAMBLEA_ELIGIBLE.join(", ")} votan y son candidatos. Se activa al terminar la guerra.
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"3px",marginBottom:"8px"}}>
            {Object.entries(P.ASAMBLEA_VOTE_WEIGHTS).filter(([k])=>k!=="default").map(([rol,peso])=>(
              <div key={rol} style={{textAlign:"center",padding:"4px 2px",background:"rgba(255,215,0,0.04)",borderRadius:"4px"}}>
                <div style={{fontSize:"7px",color:"rgba(255,255,255,0.4)",fontFamily:"monospace",lineHeight:"1.2"}}>{rol.replace(" 👑","").replace(" ⚜","").replace(" ★★★","").replace(" 🌟","")}</div>
                <div style={{fontSize:"13px",color:"#FFD700",fontWeight:"bold",fontFamily:"monospace"}}>{peso}</div>
              </div>
            ))}
            <div style={{textAlign:"center",padding:"4px 2px",background:"rgba(255,215,0,0.04)",borderRadius:"4px"}}>
              <div style={{fontSize:"7px",color:"rgba(255,255,255,0.4)",fontFamily:"monospace",lineHeight:"1.2"}}>Resto</div>
              <div style={{fontSize:"13px",color:"#FFD700",fontWeight:"bold",fontFamily:"monospace"}}>{P.ASAMBLEA_VOTE_WEIGHTS.default}</div>
            </div>
          </div>
          <Row label="Votar" pts={"+"+P.asamblea.votar} color="#A8FF78"/>
          <Row label="Más votado — Guerrero Implacable" pts={"+"+P.asamblea.mas_votado} color="#FFD700" highlight desc={"Único ganador. Empate = +"+P.asamblea.empate+" c/u"}/>
          <Row label="Mayor puntaje de la jornada" pts={"+"+P.asamblea.mayor_puntaje} color="#40E0FF" highlight desc={"Único ganador. Empate = +"+P.asamblea.empate+" c/u"}/>
          <Row label="Pichichi — gana votos Y puntaje" pts={"+"+(P.asamblea.mas_votado+P.asamblea.mayor_puntaje+P.asamblea.pichichi_extra)+" total"} color="#FFD700" highlight desc={"+"+P.asamblea.mas_votado+"+"+P.asamblea.mayor_puntaje+"+"+P.asamblea.pichichi_extra+" extra al mismo jugador"}/>
          <Row label="Racha 2 semanas consecutivas" pts={"+"+P.asamblea.racha_2sem} color="#FFD700"/>
          <Row label="Racha 3+ semanas" pts={"+"+(P.asamblea.racha_2sem+P.asamblea.racha_extra_por_sem)+"+"} color="#FFD700" highlight desc={"+"+P.asamblea.racha_extra_por_sem+" extra por cada semana adicional"}/>
        </Card>

        {/* VERSUS */}
        <Card title="VERSUS — PvP (estilo Dudo)" color="#FF6B6B">
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"8px"}}>
            Solo {P.VERSUS_LIMITS.max_por_rival_dia} desafío/rival/día · Máx {P.VERSUS_LIMITS.max_batallas_dia}/día · Solo {P.VERSUS_LIMITS.max_dudo_por_rival_dia} DUDO/rival/día
            <span style={{display:"block",marginTop:"2px",color:"rgba(255,107,107,0.6)"}}>El rival tiene <strong>{P.VERSUS_LIMITS.dias_para_confirmar} días</strong> para confirmar o DUDAR · Si no responde: challenger conserva +1pt, rival no recibe nada</span>
          </div>
          <div style={{marginBottom:"6px",padding:"6px 8px",background:"rgba(255,107,107,0.06)",borderRadius:"5px",border:"1px solid rgba(255,107,107,0.15)"}}>
            <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,107,107,0.5)",marginBottom:"4px",letterSpacing:"0.1em"}}>AL DECLARAR EL SET ({P.VERSUS_LIMITS.batallas_por_set} batallas)</div>
            <Row label="Declarar resultado vs un rival" pts={"+"+P.versus.declarar_set} color="#FF6B6B" highlight desc="Siempre, ganes o pierdas. El rival debe confirmar o DUDAR."/>
          </div>
          <div style={{marginBottom:"6px",padding:"6px 8px",background:"rgba(168,255,120,0.04)",borderRadius:"5px",border:"1px solid rgba(168,255,120,0.1)"}}>
            <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(168,255,120,0.5)",marginBottom:"4px",letterSpacing:"0.1em"}}>AL CONFIRMAR EL RIVAL</div>
            <Row label="El rival acepta el resultado" pts={"+"+P.versus.confirmar} color="#A8FF78" desc="Al confirmador, por confirmar"/>
            <Row label="Quien ganó 2 o 3 de 3 batallas" pts={"+"+P.versus.bonus_ganador+" extra"} color="#A8FF78" highlight desc="Challenger o opponent. El que ganó 0-1 ya tiene su +1pt de declaración."/>
          </div>
          <div style={{marginBottom:"6px",padding:"6px 8px",background:"rgba(255,215,0,0.04)",borderRadius:"5px",border:"1px solid rgba(255,215,0,0.1)"}}>
            <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,215,0,0.5)",marginBottom:"4px",letterSpacing:"0.1em"}}>MECÁNICA DUDO ({P.VERSUS_LIMITS.batallas_dudo} batallas · necesitas {P.VERSUS_LIMITS.dudo_victorias_necesarias}+ para ganar)</div>
            <Row label={"DUDO exitoso — ganaste "+P.VERSUS_LIMITS.dudo_victorias_necesarias+"+ de "+P.VERSUS_LIMITS.batallas_dudo} pts={"+"+P.versus.dudo_exitoso} color="#FFD700" highlight desc="Al dudador. Los pts del desafiador son anulados."/>
            <Row label="Desafiador acepta el DUDO" pts={"+"+P.versus.aceptar_dudo} color="#A8FF78"/>
            <Row label="Desafiador escala a admins con videos" pts={"+"+P.versus.escalar_admin} color="#FF9F43" highlight/>
            <Row label="Gana en videos (admin resuelve)" pts={"+"+P.versus.ganar_en_video} color="#FF9F43" desc="El perdedor recibe 0"/>
          </div>
          <div style={{padding:"6px 8px",background:"rgba(64,224,255,0.05)",borderRadius:"5px",border:"1px solid rgba(64,224,255,0.1)"}}>
            <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(64,224,255,0.4)",marginBottom:"4px",letterSpacing:"0.1em"}}>RANKINGS PvP</div>
            <Row label="Ganador del ranking semanal (cierre domingo)" pts={"+"+P.versus.ranking_semanal} color="#40E0FF"/>
            <Row label="Ganador del ranking mensual (último día del mes)" pts={"+"+P.versus.ranking_mensual} color="#FFD700" highlight/>
          </div>
        </Card>

        {/* NOTICIAS */}
        <Card title="NOTICIAS CLAN" color="#FF9F43">
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"8px"}}>Timer: noticias 2 días · solicitudes 1 día. Después pasan a historial sin puntos.</div>
          <Row label="Confirmar noticia leída" pts={"+"+P.noticias.leida} color="#FF9F43"/>
          <Row label="Leer un requerimiento del clan" pts={"+"+P.noticias.requerimiento} color="#FF9F43"/>
          <Row label="Cumplir un requerimiento del clan" pts="+3" color="#FF9F43" highlight/>
          <Row label="Cumplimiento falso detectado" pts="-20" color="#FF6B6B" desc="Admin lo aplica desde el panel de control"/>
        </Card>

        {/* WHATSAPP */}
        <Card title="WHATSAPP — BONO DE INCORPORACIÓN" color="#A8FF78">
          <Row label="Fundador del grupo (antes del lanzamiento)" pts="+50" color="#A8FF78" highlight desc="Una sola vez · permanente · incluido en el acumulado histórico"/>
          <Row label="Nuevo miembro (después del lanzamiento)" pts={"+"+P.whatsapp.bono_incorporacion} color="#A8FF78" desc="Una sola vez · permanente · incluido en el acumulado histórico"/>
          <div style={{marginTop:"6px",fontSize:"9px",color:"rgba(255,255,255,0.25)",fontFamily:"monospace",lineHeight:"1.5"}}>
            Bono permanente. Nunca se pierde. No cuenta en el ranking de jornada pero sí en el acumulado histórico total.
          </div>
        </Card>

        {/* RANGOS — from RANKS */}
        <Card title="RANGOS — PUNTOS ACUMULADOS HISTÓRICOS" color="#FF9F43">
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"10px",lineHeight:"1.6"}}>
            Los rangos se alcanzan acumulando puntos semana a semana. El colchón protege el rango cuando los puntos bajan pero NO se suma en ningún contador ni ranking. Al agotarse el colchón el rango cae.
          </div>
          {RANKS.map(r=>{
            const isProt = r.protected;
            const hasBuffer = r.buffer > 0 && r.buffer !== Infinity;
            const pts = isProt ? "Punk'Z — intocable"
              : r.min === Infinity ? "—"
              : r.min === -Infinity ? "Puntos negativos"
              : r.buffer > 0 ? `Colchón de ${r.buffer.toLocaleString()} pts otorgado`
              : `${r.min.toLocaleString()}+ acumulados`;
            const buf = isProt ? "—"
              : hasBuffer ? `Colchón: ${r.buffer.toLocaleString()} pts`
              : "Sin colchón";
            return(
              <div key={r.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 8px",marginBottom:"2px",background:"rgba(255,255,255,0.02)",borderRadius:"4px",border:"1px solid rgba(255,255,255,0.04)"}}>
                <div>
                  <span style={{fontSize:"12px",color:r.color,fontFamily:"Georgia,serif"}}>{r.label}</span>
                  <div style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",fontFamily:"monospace"}}>{pts}</div>
                </div>
                <span style={{fontSize:"9px",color:"rgba(255,255,255,0.2)",fontFamily:"monospace"}}>{buf}</span>
              </div>
            );
          })}
          <div style={{marginTop:"8px",padding:"6px 8px",background:"rgba(255,107,107,0.06)",borderRadius:"4px"}}>
            <div style={{fontFamily:"monospace",fontSize:"9px",color:"rgba(255,107,107,0.4)"}}>Mínimo mensual: {MIN_MONTHLY_PTS} pts activos para sostener el rango</div>
            <div style={{fontFamily:"monospace",fontSize:"9px",color:"rgba(255,107,107,0.3)",marginTop:"2px"}}>{EXPULSION_THRESHOLD} acumulados = candidato a expulsión (decisión manual del admin)</div>
          </div>
        </Card>

      </div>
      <NalguitasFooter/>
    </div>
  );
}

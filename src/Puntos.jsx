import NavBar from "./NavBar";
import PageHeader from "./PageHeader";
import NalguitasFooter from "./NalguitasFooter";

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

export default function Puntos(){
  return(
    <div style={{minHeight:"100vh",background:"#0d0d0f",padding:"20px",fontFamily:"Georgia,serif",color:"#d4c9a8",paddingBottom:"50px"}}>
      <div style={{maxWidth:"600px",margin:"0 auto"}}>
        <NavBar current="/puntos"/>
        <PageHeader page="/puntos"/>

        <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",padding:"12px 14px",marginBottom:"14px"}}>
          <div style={{fontFamily:"monospace",fontSize:"7px",letterSpacing:"0.3em",color:"rgba(64,224,255,0.4)",marginBottom:"6px"}}>SISTEMA DE PUNTOS — ANTIGUA ORDEN [AOR]</div>
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",lineHeight:"1.7"}}>
            Guia oficial de todas las formas de ganar y perder puntos. El ciclo semanal corre de viernes a viernes. Al cerrar la semana los puntos de guerra se archivan al acumulado permanente. Los puntos del rango son un colchon defensivo y no se suman en ningun contador ni ranking.
          </div>
        </div>

        <Card title="ACCESO CON CODIGO UNICO" color="#FFD700">
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"8px"}}>Configura tu codigo de 6 digitos en tu perfil. Se guarda en tu dispositivo.</div>
          <Row label="Primera vez que entras con codigo unico en el dia" pts="+1" color="#FFD700" desc="Una vez por dia"/>
        </Card>

        <Card title="REGISTRO DE DISPONIBILIDAD" color="#40E0FF">
          <div style={{background:"rgba(255,255,255,0.02)",borderRadius:"6px",padding:"8px 10px",marginBottom:"10px",border:"1px solid rgba(255,255,255,0.06)"}}>
            <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,255,255,0.3)",letterSpacing:"0.1em",marginBottom:"5px"}}>CIERRE DEL REGISTRO</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px"}}>
              <div style={{background:"rgba(255,255,255,0.02)",padding:"6px 8px",borderRadius:"5px"}}>
                <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,215,0,0.5)",marginBottom:"2px"}}>Modo clasico</div>
                <div style={{fontSize:"10px",color:"rgba(255,255,255,0.6)"}}>Viernes 14:00h Espana</div>
                <div style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",fontFamily:"monospace"}}>8am Ecuador · 7am Mexico</div>
              </div>
              <div style={{background:"rgba(255,255,255,0.02)",padding:"6px 8px",borderRadius:"5px"}}>
                <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,215,0,0.5)",marginBottom:"2px"}}>Modo nuevo</div>
                <div style={{fontSize:"10px",color:"rgba(255,255,255,0.6)"}}>Viernes 22:00h Espana</div>
                <div style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",fontFamily:"monospace"}}>16pm Ecuador · 15pm Mexico</div>
              </div>
            </div>
          </div>
          <Row label="Conquistador" pts="+10" color="#A8FF78" desc="Disponible toda la guerra"/>
          <Row label="Refuerzos" pts="+5" color="#FFD700" desc="Al menos una aparicion por periodo"/>
          <Row label="Reserva" pts="+2" color="#FF9F43" desc="Solo una participacion"/>
          <Row label="No disponible" pts="+1" color="rgba(255,255,255,0.4)" desc="Avisas con anticipacion"/>
          <div style={{marginTop:"8px",padding:"8px 10px",background:"rgba(255,215,0,0.05)",border:"1px solid rgba(255,215,0,0.15)",borderRadius:"6px"}}>
            <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,215,0,0.5)",letterSpacing:"0.1em",marginBottom:"5px"}}>BONUS ANTICIPADO — antes del miercoles 23:59h Espana</div>
            <Row label="Conquistador anticipado" pts="+5 bonus" color="#A8FF78"/>
            <Row label="Refuerzos o Reserva anticipados" pts="+2 bonus" color="#FFD700"/>
          </div>
        </Card>

        <Card title="DURANTE LA GUERRA" color="#A8FF78">
          <Row label="Aparecio y participo" pts="+3" color="#A8FF78" desc="Una vez por guerra"/>
          <Row label="Siguio las ordenes del admin" pts="+2" color="#A8FF78" desc="Una vez por guerra"/>
          <Row label="Batalla ganada" pts="+2 c/u" color="#40E0FF"/>
          <Row label="Batalla perdida" pts="+1 c/u" color="#40E0FF"/>
          <Row label="Defendio un castillo" pts="+1 c/u" color="#40E0FF"/>
          <Row label="Bonus 6+ batallas ganadas" pts="+10" color="#FFD700" highlight desc="Automatico al superar 6 victorias en la misma guerra"/>
          <Row label="Bandidos post-batalla" pts="+1 c/u" color="#A8FF78" desc="Atacar bandidos despues de ganar"/>
          <Row label="Bonus completo" pts="+5" color="#FFD700" highlight desc="Cumplio todo en la guerra"/>
          <Row label="Participo sin haberse registrado" pts="+1" color="rgba(255,255,255,0.4)"/>
          <Row label="Primer movilizador de tropas" pts="+3" color="#FFD700" desc="Solo el primero en mover tropas"/>
          <Row label="Fuera del castillo sin defenderlo" pts="-2 c/u" color="#FF6B6B"/>
        </Card>

        <Card title="ACTUALIZACION DE STATS" color="#40E0FF">
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"8px"}}>Actualiza tu BP, Poder y Nivel en tu perfil. Solo una vez por semana.</div>
          <Row label="Solo BP" pts="+1" color="#40E0FF"/>
          <Row label="Solo Poder" pts="+1" color="#40E0FF"/>
          <Row label="Solo Nivel" pts="+1" color="#40E0FF"/>
          <Row label="BP + Poder + Nivel juntos" pts="+5" color="#40E0FF" highlight desc="Maximo — una vez por semana"/>
        </Card>

        <Card title="PENALIZACIONES" color="#FF6B6B">
          <Row label="Conquistador no aparecio" pts="-15" color="#FF6B6B"/>
          <Row label="Refuerzos no aparecio" pts="-10" color="#FF6B6B"/>
          <Row label="Reserva no aparecio" pts="-5" color="#FF6B6B"/>
          <Row label="Sin registro y sin participar" pts="-20" color="#FF6B6B" highlight/>
          <Row label="Ignoro una orden directa" pts="-2 c/u" color="#FF9F43"/>
          <Row label="Abandono defensa sin avisar" pts="-2 c/u" color="#FF9F43"/>
          <Row label="Fuera del castillo sin defenderlo" pts="-2 c/u" color="#FF9F43"/>
          <Row label="Inactivo +12h sin justificacion" pts="-3 c/vez" color="#FF9F43"/>
          <Row label="Bandido pre-batalla (antes de ganar)" pts="-1 c/vez" color="#FF9F43"/>
          <div style={{marginTop:"6px",padding:"6px 8px",background:"rgba(255,107,107,0.06)",borderRadius:"4px",fontFamily:"monospace",fontSize:"9px",color:"rgba(255,107,107,0.4)"}}>
            Minimo mensual para sostener rango: 20 pts activos. -100 acumulados = candidato a expulsion (decision del admin)
          </div>
        </Card>

        <Card title="PROPAGANDA DE GUERRA" color="#C8A2FF">
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"8px"}}>Difunde mensajes del clan en el chat general del juego. Cooldown de 2h entre envios.</div>
          <Row label="Publicar un mensaje aprobado" pts="+1" color="#C8A2FF" desc="Por cada mensaje confirmado en el sistema"/>
          <Row label="Publicacion falsa detectada" pts="-50" color="#FF6B6B" desc="Confirmar sin haber enviado el mensaje"/>
        </Card>

        <Card title="INTELIGENCIA MILITAR" color="#FF6B6B">
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"8px"}}>Analiza y vota la dificultad de los clanes rivales. El voto tiene peso segun tu disponibilidad.</div>
          <Row label="Votar dificultad de un rival" pts="+3" color="#FF9F43" desc="Peso: Conquistador=3 · Refuerzos=2 · Reserva=1"/>
        </Card>

        <Card title="ASAMBLEA — GUERRERO IMPLACABLE" color="#FFD700">
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"8px",lineHeight:"1.5"}}>Solo Conquistador, Refuerzos y Reserva votan y son candidatos. Se activa al terminar la guerra.</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"3px",marginBottom:"8px"}}>
            {[{r:"Lider",p:5},{r:"Co-Lider",p:4},{r:"Oficial",p:3},{r:"Veterano",p:2},{r:"Otros",p:1}].map(x=>(
              <div key={x.r} style={{textAlign:"center",padding:"4px 2px",background:"rgba(255,215,0,0.04)",borderRadius:"4px"}}>
                <div style={{fontSize:"8px",color:"rgba(255,255,255,0.4)",fontFamily:"monospace"}}>{x.r}</div>
                <div style={{fontSize:"13px",color:"#FFD700",fontWeight:"bold",fontFamily:"monospace"}}>{x.p}</div>
              </div>
            ))}
          </div>
          <Row label="Votar" pts="+3" color="#A8FF78"/>
          <Row label="Mas votado — Guerrero Implacable" pts="+10" color="#FFD700" highlight desc="Unico ganador. Empate = +3 c/u"/>
          <Row label="Mayor puntaje de la jornada" pts="+10" color="#40E0FF" highlight desc="Unico ganador. Empate = +3 c/u"/>
          <Row label="Pichichi — gana votos Y puntaje" pts="+30 total" color="#FFD700" highlight desc="+10+10+10 extra al mismo jugador"/>
          <Row label="Racha 2 semanas consecutivas" pts="+20" color="#FFD700"/>
          <Row label="Racha 3+ semanas" pts="+30+" color="#FFD700" highlight desc="+10 extra por cada semana adicional"/>
        </Card>

        <Card title="VERSUS — PvP (estilo Dudo)" color="#FF6B6B">
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"8px"}}>Solo 1 batalla por rival por dia. Max 5 desafios diarios. Solo 1 DUDO por rival por dia.</div>
          <Row label="Registrar 3 batallas — ganaste 0 o 1" pts="+1" color="#FF6B6B"/>
          <Row label="Registrar 3 batallas — ganaste 2 o 3" pts="+2" color="#FF6B6B" highlight/>
          <Row label="El rival confirma el resultado" pts="+1 al rival" color="#A8FF78"/>
          <Row label="DUDO exitoso — ganaste 3 o mas de 5" pts="+3" color="#FFD700" highlight desc="Al que DUDO. Se anulan pts del desafiador"/>
          <Row label="Desafiador acepta el DUDO" pts="+1" color="#A8FF78"/>
          <Row label="Desafiador escala a admins con videos" pts="+5" color="#FF9F43" highlight/>
          <Row label="Gana en videos (admin resuelve)" pts="+5" color="#FF9F43" desc="El perdedor recibe 0"/>
          <div style={{marginTop:"8px",padding:"6px 8px",background:"rgba(64,224,255,0.05)",borderRadius:"5px",border:"1px solid rgba(64,224,255,0.1)"}}>
            <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(64,224,255,0.4)",marginBottom:"4px",letterSpacing:"0.1em"}}>RANKINGS PvP</div>
            <Row label="Ganador del ranking semanal (cierre domingo)" pts="+5" color="#40E0FF"/>
            <Row label="Ganador del ranking mensual (ultimo dia del mes)" pts="+10" color="#FFD700" highlight/>
          </div>
        </Card>

        <Card title="NOTICIAS CLAN" color="#FF9F43">
          <Row label="Confirmar noticia leida" pts="+1" color="#FF9F43"/>
          <Row label="Cumplir un requerimiento del clan" pts="+1" color="#FF9F43"/>
        </Card>

        <Card title="WHATSAPP — BONO DE INCORPORACION" color="#A8FF78">
          <Row label="Incorporacion al grupo WhatsApp del clan" pts="+25" color="#A8FF78" highlight desc="Una sola vez. Permanente. Incluido en el acumulado historico"/>
          <div style={{marginTop:"6px",fontSize:"9px",color:"rgba(255,255,255,0.25)",fontFamily:"monospace",lineHeight:"1.5"}}>
            Bono de bienvenida permanente. Nunca se pierde. No cuenta en el ranking de la jornada pero si en el acumulado historico total.
          </div>
        </Card>

        <Card title="RANGOS — PUNTOS ACUMULADOS HISTORICOS" color="#FF9F43">
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginBottom:"10px",lineHeight:"1.6"}}>
            Los rangos se alcanzan acumulando puntos semana a semana. Los puntos del rango son un colchon defensivo — protegen el rango cuando los puntos bajan pero NO se suman en ningun contador ni ranking. Al agotarse el colchon el rango cae. El rango se defiende activamente cada semana.
          </div>
          {[
            {r:"Lider",pts:"Punk'Z — intocable",col:"#FFD700",buf:"—"},
            {r:"Co-Lider",pts:"Colchon de 25,000 pts otorgado — a defender",col:"#FFD700",buf:"Colchon: 25,000 pts"},
            {r:"Oficial",pts:"Colchon de 5,000 pts otorgado — a defender",col:"#40E0FF",buf:"Colchon: 5,000 pts"},
            {r:"Leyenda",pts:"2,500+ acumulados",col:"#C8A2FF",buf:"Sin colchon"},
            {r:"Veterano",pts:"1,000+ acumulados",col:"#A8FF78",buf:"Sin colchon"},
            {r:"Guerrero",pts:"500+ acumulados",col:"#FF9F43",buf:"Sin colchon"},
            {r:"Soldado",pts:"100 – 499 acumulados",col:"rgba(255,255,255,0.5)",buf:"Sin colchon"},
            {r:"Recluta",pts:"0 – 99 acumulados",col:"rgba(255,255,255,0.3)",buf:"Sin colchon"},
            {r:"Vigilado",pts:"Puntos negativos",col:"#FF6B6B",buf:"Sin colchon"},
          ].map(x=>(
            <div key={x.r} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 8px",marginBottom:"2px",background:"rgba(255,255,255,0.02)",borderRadius:"4px",border:"1px solid rgba(255,255,255,0.04)"}}>
              <div>
                <span style={{fontSize:"12px",color:x.col,fontFamily:"Georgia,serif"}}>{x.r}</span>
                <div style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",fontFamily:"monospace"}}>{x.pts}</div>
              </div>
              <span style={{fontSize:"9px",color:"rgba(255,255,255,0.2)",fontFamily:"monospace"}}>{x.buf}</span>
            </div>
          ))}
          <div style={{marginTop:"8px",padding:"6px 8px",background:"rgba(255,107,107,0.06)",borderRadius:"4px"}}>
            <div style={{fontFamily:"monospace",fontSize:"9px",color:"rgba(255,107,107,0.4)"}}>Minimo mensual: 20 pts activos para sostener el rango</div>
            <div style={{fontFamily:"monospace",fontSize:"9px",color:"rgba(255,107,107,0.3)",marginTop:"2px"}}>-100 acumulados = candidato a expulsion (decision manual del admin)</div>
          </div>
        </Card>

      </div>
      <NalguitasFooter/>
    </div>
  );
}

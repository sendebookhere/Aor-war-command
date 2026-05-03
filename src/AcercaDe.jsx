import NavBar from "./NavBar";
import NalguitasFooter from "./NalguitasFooter";

const VERSIONS = [
  {
    v:"v0.1", title:"Fundación",
    items:["Registro de disponibilidad (Conquistador/Refuerzos/Reserva)","Sistema de rangos inicial","Tabla de jugadores activos","Puntos de guerra: batallas, órdenes, defensas","Ranking de jugadores por puntos","Historial de guerras archivado","weeklyReset manual","Perfil individual de jugador","Columna pts_acumulados en Supabase","Timer regresivo de apertura/cierre de registro"]
  },
  {
    v:"v0.2", title:"Comunicaciones y Admin",
    items:["Panel de control con PIN A2O0R26","Propaganda de guerra con cooldown 2h","Mensajes preformateados para el chat del juego","Toggle modo guerra clásico/nuevo","Roster con BPs y rangos ordenado por BP dentro del rango","WarModeSwitch compartido entre todos los dispositivos","Toggle votaciones on/off","Primo movilizador +3pts","WarIntelPanel con resultados de guerra","Admin: gestión de jugadores (añadir/editar/expulsar)"]
  },
  {
    v:"v0.3", title:"Asamblea e Inteligencia",
    items:["Asamblea de Centurias con votación ponderada por rango","Guerrero Implacable: más votado +10pts","Empates en votos/puntaje: +3pts cada uno","Rachas de semanas consecutivas (+20 a la 2a, +10/sem adicional)","Inteligencia Militar: votos de dificultad por rival (+3pts)","Pesos de voto por disponibilidad: Conquistador=3, Refuerzos=2, Reserva=1","NavBar 3×3 con Versus y Salir","LoginGate con autenticación por teléfono o código único","LoadingScreen centralizado por sección","Descripciones de cada sección"]
  },
  {
    v:"v0.4", title:"Sistema de Acceso y Perfil",
    items:["Código único de 6 dígitos configurable en perfil","Código cacheado en dispositivo (asteriscos en vez de dígitos visibles)","Si hay código guardado, opción de teléfono desaparece","Código anterior guardado al cambiar (visible solo para admin)","Al login: redirige al perfil propio","Botón MI PERFIL en NavBar con nombre del jugador","DEVELOPED BY NALGUITAS TECH en login","Ranking y Perfil: navegación sin recarga (SPA)","Botón Ranking desde perfil y viceversa","Desglose de puntos por categoría en perfil"]
  },
  {
    v:"v0.5", title:"Versus PvP — Sistema Dudo",
    items:["Registrar 3 batallas vs rival: +1pt (0-1V) o +2pts (2-3V)","Confirmar resultado: +1pt al confirmador","DUDO: disputar con 5 batallas — ganador 3+ gana +3pts, se anulan pts del desafiador","Desafiador acepta DUDO: +1pt; escala a admin: +5pts","Admin resuelve con videos: +5pts al ganador","Límite: 1 batalla por rival/día, máx 5/día, 1 DUDO por rival/día","Ranking PvP general, semanal (+5pts top1) y mensual (+10pts top1)","Historial scrollable de todas las batallas","Sección de DUDOs: en trámite + resueltos","Top dudador del clan"]
  },
  {
    v:"v0.6", title:"Navegación SPA",
    items:["Routing SPA sin recargas de página (window.__aorNavigate)","PopState listener para botón atrás del navegador","LoadingScreen unificado: CARGANDO — NOMBRE DE SECCIÓN con color por área","MI PERFIL: usa sessionStorage flag (funciona desde cualquier página)","Ranking/Perfil: __reportNav para cambio interno sin navegar","Una sola pantalla de carga por navegación (LoginGate cacheado)","Todas las páginas tienen su loading screen correcto"]
  },
  {
    v:"v0.7", title:"Reglas Centralizadas y Desglose",
    items:["GameRules.js: fuente única de verdad para rangos, puntos y fórmulas","PtsLedger.js: registro central de todos los puntos con source y note","calcWarPts / calcGrandTotal exportados y usados en toda la app","Puntos.jsx: guía oficial completa de todas las reglas","Desglose semanal en perfil por categoría (guerra / acumulado / penalizaciones)","Top 3 en Asamblea con desglose de origen de puntos","pts_honorificos excluidos de todos los contadores y rankings","Nuevo rango: Leyenda 🌟 (2,500+ pts)","Rangos corregidos: Co-Líder=colchón 25k, Oficial=colchón 5k, Veterano=1k, Guerrero=500"]
  },
  {
    v:"v0.8", title:"Automatización y Conexión DB",
    items:["Auto-reset lunes 9:00am España (detecta automáticamente al cargar la app)","Código único: +1pt primera entrada del día (awardDailyCodePt)","Todas las mecánicas conectadas a PtsLedger: Asamblea, Intel, Noticias, Propaganda, Versus","weeklyReset actualizado: archiva todos los campos incluyendo pt_stats, pt_bandido_post, pt_fuera_castillo","Asamblea: +10pts al Guerrero Implacable al cerrar votaciones (automático)","Versus: botón admin para otorgar bonus semanal/mensual al top 1","Historial de puntos en perfil de jugador (pts_ledger)","Sección Acerca De con versiones de la app"]
  },
];

export default function AcercaDe() {
  return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",padding:"20px",fontFamily:"Georgia,serif",color:"#d4c9a8",paddingBottom:"50px"}}>
      <div style={{maxWidth:"600px",margin:"0 auto"}}>
        <NavBar current="/acerca"/>

        <div style={{textAlign:"center",marginBottom:"24px",padding:"20px"}}>
          <div style={{fontFamily:"monospace",fontSize:"7px",letterSpacing:"0.4em",color:"rgba(64,224,255,0.3)",marginBottom:"8px"}}>ANTIGUA ORDEN [AOR]</div>
          <div style={{fontSize:"22px",color:"#FFD700",marginBottom:"4px"}}>WAR COMMAND</div>
          <div style={{fontFamily:"monospace",fontSize:"9px",color:"rgba(255,255,255,0.2)",marginBottom:"16px"}}>v0.8 — Mayo 2026</div>
          <div style={{display:"inline-block",padding:"6px 16px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"20px",fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.15em",color:"rgba(255,255,255,0.25)"}}>
            DEVELOPED BY NALGUITAS TECH
          </div>
        </div>

        {VERSIONS.slice().reverse().map(ver=>(
          <div key={ver.v} style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"10px",padding:"16px",marginBottom:"10px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
              <div>
                <span style={{fontFamily:"monospace",fontSize:"11px",color:"#FFD700",fontWeight:"bold"}}>{ver.v}</span>
                <span style={{fontFamily:"monospace",fontSize:"9px",color:"rgba(255,255,255,0.3)",marginLeft:"10px",letterSpacing:"0.1em"}}>{ver.title.toUpperCase()}</span>
              </div>
              <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,255,255,0.15)"}}>{ver.items.length} cambios</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"3px"}}>
              {ver.items.map((item,i)=>(
                <div key={i} style={{display:"flex",gap:"8px",fontSize:"10px",color:"rgba(255,255,255,0.5)",padding:"2px 0",borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
                  <span style={{color:"rgba(64,224,255,0.3)",fontFamily:"monospace",flexShrink:0}}>·</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <NalguitasFooter/>
    </div>
  );
}

import { useState } from "react";
import NavBar from "./NavBar";
import NalguitasFooter from "./NalguitasFooter";

const CURRENT_VERSION = "v0.9";
const CURRENT_DATE = "Mayo 2026";

const VERSIONS = [
  {
    v:"v0.1", title:"Fundación", date:"Abr 2026",
    items:[
      "Registro de disponibilidad: Conquistador / Refuerzos / Reserva / No disponible",
      "Sistema de rangos inicial con colchón honorífico",
      "Tabla de jugadores activos ordenada por rango y BP",
      "Puntos de guerra: batallas, órdenes, defensas, aparición",
      "Ranking de jugadores por puntos acumulados",
      "Historial de guerras archivado semanalmente",
      "weeklyReset manual: archiva pt_* a pts_acumulados",
      "Perfil individual con desglose de columnas pt_*",
      "Columna pts_acumulados en Supabase como acumulado histórico",
      "Timer regresivo de apertura y cierre de registro",
    ]
  },
  {
    v:"v0.2", title:"Comunicaciones y Admin", date:"Abr 2026",
    items:[
      "Panel de control con PIN protegido",
      "Propaganda de guerra con cooldown 1h entre mensajes",
      "Mensajes preformateados para el chat del juego (≤250 chars)",
      "Toggle modo guerra clásico / nuevo (switch en admin)",
      "Roster con BP, Poder y rangos ordenado por rango > BP",
      "WarModeSwitch compartido entre dispositivos vía app_settings",
      "Toggle votaciones on/off desde admin",
      "Primer movilizador de tropas: +3pts",
      "WarIntelPanel con resultados de guerra y clanes rivales",
      "Admin: gestión de jugadores (añadir / editar / expulsar)",
    ]
  },
  {
    v:"v0.3", title:"Asamblea e Inteligencia", date:"Abr 2026",
    items:[
      "Asamblea de Centurias con votación ponderada por rango (Líder=5, Co-Líder=4, Oficial=3...)",
      "Guerrero Implacable: más votado +10pts únicamente al ganador",
      "Mayor puntaje de jornada: +10pts únicamente al ganador",
      "Pichichi (más votado Y mayor puntaje): +10pts extra = 30pts total",
      "Empates en votos o puntaje: +3pts c/u en vez del premio único",
      "Rachas: 2 semanas consecutivas +20pts, 3+ semanas +10pts adicional c/sem",
      "Inteligencia Militar: votos de dificultad por clan rival (+1pt ponderado)",
      "Auto-apertura de votaciones al terminar la guerra si admin olvida activarlas",
      "NavBar 3×3 unificado con Salir y Mi Perfil",
      "LoadingScreen centralizado con color por sección y nombre de destino",
    ]
  },
  {
    v:"v0.4", title:"Sistema de Acceso y Perfil", date:"Abr 2026",
    items:[
      "LoginGate: autenticación por número de teléfono o código único de 6 dígitos",
      "Código único cacheado en dispositivo — asteriscos en pantalla al cargar",
      "Si hay código guardado la opción de teléfono desaparece automáticamente",
      "Código anterior accesible solo para admin (campo oculto en roster)",
      "Al login exitoso: redirige directamente al perfil propio (no a home)",
      "Botón MI PERFIL en NavBar muestra nombre del jugador en sesión",
      "Logout: limpia sesión y fuerza recarga completa (window.location.replace)",
      "Routing SPA sin recargas (window.__aorNavigate + PopState listener)",
      "Botones NavBar: solo iluminado el de la página activa",
      "Footer DEVELOPED BY NALGUITAS TECH en todas las páginas públicas",
    ]
  },
  {
    v:"v0.5", title:"Versus PvP — Sistema Dudo", date:"Abr 2026",
    items:[
      "Registrar set de 3 batallas vs rival: +1pt al declarar (siempre, ganes o pierdas)",
      "Confirmar resultado: +1pt al confirmador + +1pt extra al ganador de 2-3 de 3",
      "DUDO: rival disputa con 5 batallas — ganador 3+ recibe +3pts, se anulan pts del desafiador",
      "Desafiador acepta DUDO: +1pt | Escala a admin con video: +5pts | Gana en video: +5pts",
      "Regla de 3 días: si el rival no confirma ni duda, challenger conserva +1pt (auto_confirmed)",
      "Límites: 1 desafío por rival/día, máx 5/día, 1 DUDO por rival/día",
      "Rankings de sets: ganados y perdidos (general / semana / mes), Top 10",
      "Rankings de batallas individuales: más victorias y más derrotas, Top 10",
      "Bonus admin: +5pts top 1 semanal (cierre domingo), +10pts top 1 mensual",
      "Historial scrollable de todas las batallas con estado, resultado y días restantes",
    ]
  },
  {
    v:"v0.6", title:"Noticias y Código Único", date:"May 2026",
    items:[
      "Noticias del Clan: tab Activas / Historial Noticias / Historial Solicitudes",
      "Noticia leída: +1pt (timer 2 días) | Solicitud leída: +1pt (timer 1 día)",
      "Solicitud cumplida: +3pts | Cumplimiento falso: −20pts (admin)",
      "3 rankings en Noticias: más leídas / más solicitudes leídas / más solicitudes cumplidas",
      "Código único: +1pt primera entrada del día (registrado en pts_ledger)",
      "Propaganda: botón CONFIRMÉ se apaga inmediatamente al aplastar (previene doble award)",
      "Propaganda: cooldown global 1h entre mensajes + bloqueo 6h por mensaje específico",
      "Límite diario de mensajes de propaganda configurable desde admin",
      "Historial de publicaciones con timestamp en propaganda",
      "Ranking de difusión en propaganda por player_id (no por nombre — evita inconsistencias)",
    ]
  },
  {
    v:"v0.7", title:"Reglas Centralizadas y Desglose", date:"May 2026",
    items:[
      "GameRules.js: fuente única de verdad — RANKS, PTS, SCHEDULE, calcWarPts, calcGrandTotal",
      "PtsLedger.js: registro central — awardPts() y revokePts() como únicos puntos de entrada",
      "Puntos.jsx: guía oficial completa leyendo 100% de GameRules — ningún valor hardcodeado",
      "calcGrandTotal = MAX(pts_acumulados, ledgerSum) + calcWarPts — nunca subestima puntos",
      "Desglose en perfil: cada categoría muestra total real desde pts_ledger (no texto descriptivo)",
      "Fila 'Sin clasificar' cuando pts_acumulados supera al ledger (datos previos al ledger)",
      "DESGLOSE ACUMULADO (no semanal) en perfil: muestra historia completa",
      "Top 3 en Asamblea corregido: 'Acumulado' = pts_acumulados − pt_whatsapp (sin doble conteo)",
      "Rangos, horarios y PTS importados desde GameRules en Inteligencia, Propaganda y Noticias",
      "Límite de filas eliminado en todas las queries de agregación global (sin techo artificial)",
    ]
  },
  {
    v:"v0.8", title:"Automatización y Base de Datos", date:"May 2026",
    items:[
      "Auto-reset lunes 8:00am Ecuador (detecta automáticamente al cargar la app, idempotente)",
      "weeklyReset archiva pt_stats, pt_bandido_post, pt_fuera_castillo y todos los pt_*",
      "Asamblea: cierre automático de votaciones con award al Guerrero Implacable",
      "Versus: auto-confirm de batallas pendientes tras 3 días sin respuesta",
      "Propaganda ranking usa pts_ledger como fuente de verdad (mismo que perfil)",
      "buildRecord en Versus cuenta SETS ganados (2-3 de 3) no batallas individuales",
      "Retroactive award eliminado de confirm() — eliminó duplicación de pts en Versus",
      "Vote deletion en Asamblea e Inteligencia usa revokePts() — queda registrado en ledger",
      "LoginGate código único escribe a pts_ledger (antes solo actualizaba pts_acumulados)",
      "Sección Acerca De con historial de versiones y changelog completo",
    ]
  },
  {
    v:"v0.9", title:"Región, Horarios y UX", date:"May 2026",
    items:[
      "Zona horaria unificada: 4 botones — Sudamérica / Norteamérica / España / Otro",
      "Región guardada en localStorage Y en players.timezone (DB) al registrarse",
      "Roster del admin muestra bandera y hora correcta según región de cada jugador",
      "Horarios de registro corregidos: S1 vie 7am Ecuador (14h España) · S2 vie 11am Ecuador (18h España)",
      "spainOffset() calcula verano/invierno automáticamente — Puntos.jsx y Registro siempre actualizados",
      "Caja de nombre en registro: muestra Nivel / BP / Poder / Rango debajo al seleccionar jugador",
      "Rankings Versus ordenados descendente; solo aparecen jugadores con victorias",
      "Tablas de batallas individuales (sets × 3): Top 10 victorias y derrotas en paralelo",
      "TIMEZONES expandido a 4 regiones (sur/norte/espana/otro) con offsets correctos",
      "Eliminado segundo set duplicado de botones de región en formulario de registro",
    ]
  },
];

const TECH_STACK = [
  { label:"Frontend",  value:"React 18 + Vite",        icon:"⚛" },
  { label:"DB",        value:"Supabase (PostgreSQL)",   icon:"🗄" },
  { label:"Deploy",    value:"Vercel",                  icon:"▲" },
  { label:"Auth",      value:"Teléfono + Código único", icon:"🔐" },
  { label:"Diseño",    value:"CSS-in-JS · Paleta oscura AOR", icon:"🎨" },
];

const STATS = [
  { label:"Versiones desplegadas", value:"9" },
  { label:"Páginas públicas",      value:"7" },
  { label:"Sistemas de puntos",    value:"8" },
  { label:"Tablas en Supabase",    value:"12+" },
  { label:"Líneas de código",      value:"~8,000" },
  { label:"Tiempo de desarrollo",  value:"~1 semana" },
];

function VersionList() {
  const [open, setOpen] = useState(CURRENT_VERSION);
  return (
    <div>
      {VERSIONS.slice().reverse().map(ver => {
        const isLatest = ver.v === CURRENT_VERSION;
        const isOpen = open === ver.v;
        return (
          <div key={ver.v} style={{marginBottom:"8px"}}>
            {/* Header button */}
            <button
              onClick={() => setOpen(isOpen ? null : ver.v)}
              style={{
                width:"100%", display:"flex", justifyContent:"space-between",
                alignItems:"center", padding:"12px 14px",
                background:isLatest?"rgba(255,215,0,0.06)":isOpen?"rgba(64,224,255,0.05)":"rgba(255,255,255,0.02)",
                border:`1px solid ${isLatest?"rgba(255,215,0,0.25)":isOpen?"rgba(64,224,255,0.2)":"rgba(255,255,255,0.07)"}`,
                borderLeft:`3px solid ${isLatest?"#FFD700":isOpen?"#40E0FF":"rgba(255,255,255,0.1)"}`,
                borderRadius:isOpen?"10px 10px 0 0":"10px",
                cursor:"pointer", textAlign:"left",
              }}
            >
              <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                <span style={{fontFamily:"monospace",fontSize:"13px",color:isLatest?"#FFD700":"#40E0FF",fontWeight:"bold"}}>{ver.v}</span>
                {isLatest && (
                  <span style={{fontFamily:"monospace",fontSize:"7px",background:"rgba(255,215,0,0.12)",border:"1px solid rgba(255,215,0,0.3)",borderRadius:"3px",padding:"1px 6px",color:"#FFD700",letterSpacing:"0.1em"}}>ACTUAL</span>
                )}
                <span style={{fontFamily:"monospace",fontSize:"9px",color:"rgba(255,255,255,0.3)",letterSpacing:"0.08em"}}>{ver.title.toUpperCase()}</span>
              </div>
              <div style={{display:"flex",gap:"10px",alignItems:"center",flexShrink:0}}>
                <span style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,255,255,0.15)"}}>{ver.date}</span>
                <span style={{fontFamily:"monospace",fontSize:"12px",color:isLatest?"#FFD700":isOpen?"#40E0FF":"rgba(255,255,255,0.2)",transition:"transform 0.2s",display:"inline-block",transform:isOpen?"rotate(180deg)":"rotate(0deg)"}}>▾</span>
              </div>
            </button>

            {/* Collapsible content */}
            {isOpen && (
              <div style={{
                background:"rgba(255,255,255,0.01)",
                border:`1px solid ${isLatest?"rgba(255,215,0,0.15)":"rgba(64,224,255,0.12)"}`,
                borderTop:"none", borderRadius:"0 0 10px 10px",
                padding:"10px 14px 12px",
              }}>
                {ver.items.map((item, i) => (
                  <div key={i} style={{display:"flex",gap:"8px",fontSize:"10px",color:"rgba(255,255,255,0.5)",padding:"3px 0",borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
                    <span style={{color:isLatest?"rgba(255,215,0,0.4)":"rgba(64,224,255,0.3)",fontFamily:"monospace",flexShrink:0}}>·</span>
                    <span>{item}</span>
                  </div>
                ))}
                <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,255,255,0.1)",marginTop:"6px",textAlign:"right"}}>{ver.items.length} cambios</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AcercaDe() {
  return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",padding:"20px",fontFamily:"Georgia,serif",color:"#d4c9a8",paddingBottom:"60px"}}>
      <div style={{maxWidth:"600px",margin:"0 auto"}}>
        <NavBar current="/acerca"/>

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <div style={{textAlign:"center",marginBottom:"28px",padding:"28px 20px",background:"rgba(255,215,0,0.02)",border:"1px solid rgba(255,215,0,0.08)",borderRadius:"12px"}}>
          <div style={{fontFamily:"monospace",fontSize:"7px",letterSpacing:"0.5em",color:"rgba(64,224,255,0.35)",marginBottom:"10px"}}>ANTIGUA ORDEN [AOR]</div>
          <div style={{fontSize:"28px",color:"#FFD700",fontWeight:"bold",letterSpacing:"0.05em",marginBottom:"4px"}}>WAR COMMAND</div>
          <div style={{fontFamily:"monospace",fontSize:"10px",color:"rgba(255,255,255,0.2)",marginBottom:"18px",letterSpacing:"0.2em"}}>{CURRENT_VERSION} · {CURRENT_DATE}</div>

          {/* Creator badge */}
          <div style={{display:"inline-block",background:"rgba(64,224,255,0.05)",border:"1px solid rgba(64,224,255,0.25)",borderRadius:"12px",padding:"14px 28px",marginBottom:"16px"}}>
            <div style={{fontFamily:"monospace",fontSize:"7px",letterSpacing:"0.4em",color:"rgba(64,224,255,0.35)",marginBottom:"6px"}}>DESARROLLADO POR</div>
            <div style={{fontSize:"22px",color:"#40E0FF",fontWeight:"bold",letterSpacing:"0.05em",marginBottom:"2px"}}>Nalguitas Tech™</div>
            <div style={{fontFamily:"monospace",fontSize:"7px",color:"rgba(255,255,255,0.15)",letterSpacing:"0.2em"}}>SOLUCIONES PARA EL CAMPO DE BATALLA</div>
          </div>

          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",lineHeight:"1.9",maxWidth:"420px",margin:"0 auto"}}>
            Infraestructura de comando diseñada en el fragor de la batalla.<br/>
            Cada función, cada punto, cada rango — construidos con precisión táctica<br/>
            y desplegados bajo fuego real.<br/>
            <span style={{color:"rgba(168,255,120,0.6)"}}>Misión: llevar a Antigua Orden a la cima del reino.</span>
          </div>
        </div>

        {/* ── TECH STACK ───────────────────────────────────────────────── */}
        <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"10px",padding:"14px",marginBottom:"14px"}}>
          <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.25em",color:"rgba(255,255,255,0.25)",marginBottom:"12px"}}>ARSENAL TECNOLÓGICO</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px"}}>
            {TECH_STACK.map(t=>(
              <div key={t.label} style={{display:"flex",alignItems:"center",gap:"8px",padding:"6px 8px",background:"rgba(255,255,255,0.02)",borderRadius:"6px"}}>
                <span style={{fontSize:"14px"}}>{t.icon}</span>
                <div>
                  <div style={{fontFamily:"monospace",fontSize:"7px",color:"rgba(255,255,255,0.2)",letterSpacing:"0.1em"}}>{t.label.toUpperCase()}</div>
                  <div style={{fontSize:"10px",color:"rgba(255,255,255,0.55)"}}>{t.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── STATS ────────────────────────────────────────────────────── */}
        <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"10px",padding:"14px",marginBottom:"20px"}}>
          <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.25em",color:"rgba(255,255,255,0.25)",marginBottom:"12px"}}>ESTADÍSTICAS DEL PROYECTO</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"6px"}}>
            {STATS.map(s=>(
              <div key={s.label} style={{textAlign:"center",padding:"8px 4px",background:"rgba(255,255,255,0.02)",borderRadius:"6px"}}>
                <div style={{fontFamily:"monospace",fontSize:"14px",color:"#FFD700",fontWeight:"bold"}}>{s.value}</div>
                <div style={{fontFamily:"monospace",fontSize:"7px",color:"rgba(255,255,255,0.25)",lineHeight:"1.3",marginTop:"2px"}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── VERSION HISTORY ──────────────────────────────────────────── */}
        <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.25em",color:"rgba(255,255,255,0.25)",marginBottom:"12px"}}>
          CHANGELOG — HISTORIAL DE VERSIONES
        </div>

        <VersionList/>

        {/* ── CRÉDITOS ─────────────────────────────────────────────────── */}
        <div style={{marginTop:"24px",textAlign:"center",padding:"20px",background:"rgba(255,255,255,0.01)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:"10px"}}>
          <div style={{fontFamily:"monospace",fontSize:"7px",letterSpacing:"0.4em",color:"rgba(255,255,255,0.15)",marginBottom:"10px"}}>CRÉDITOS</div>
          <div style={{fontSize:"11px",color:"rgba(255,255,255,0.3)",lineHeight:"2"}}>
            <div>⚔ Diseño y desarrollo — <span style={{color:"#40E0FF"}}>Nalguitas Tech™</span></div>
            <div>👑 Líder del clan — <span style={{color:"#FFD700"}}>PUNK'Z</span></div>
            <div>🤝 Clan — <span style={{color:"rgba(255,255,255,0.5)"}}>Antigua Orden [AOR]</span></div>
            <div>🎮 Juego — <span style={{color:"rgba(255,255,255,0.5)"}}>Dawn of Ages</span></div>

            <div style={{marginTop:"8px",padding:"10px 14px",background:"rgba(88,101,242,0.06)",border:"1px solid rgba(88,101,242,0.25)",borderRadius:"6px",display:"flex",alignItems:"center",gap:"10px"}}>
              <span style={{fontSize:"20px"}}>🎮</span>
              <div>
                <div style={{fontFamily:"monospace",fontSize:"7px",letterSpacing:"0.2em",color:"rgba(88,101,242,0.6)",marginBottom:"2px"}}>DISCORD DEL CLAN</div>
                <a href="https://discord.gg/sb2eHSSmff" target="_blank" rel="noopener noreferrer"
                  style={{fontSize:"11px",color:"#7289DA",textDecoration:"none",fontFamily:"monospace",letterSpacing:"0.05em"}}>
                  discord.gg/sb2eHSSmff
                </a>
              </div>
            </div>
          </div>
          <div style={{marginTop:"16px",fontFamily:"monospace",fontSize:"7px",letterSpacing:"0.3em",color:"rgba(255,255,255,0.1)"}}>
            © 2026 Nalguitas Tech™ · Todos los derechos reservados
          </div>
        </div>

      </div>
      <NalguitasFooter/>
    </div>
  );
}

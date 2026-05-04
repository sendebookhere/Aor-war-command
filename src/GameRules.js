// ════════════════════════════════════════════════════════════════════════════
// GAME RULES — ANTIGUA ORDEN [AOR]
// Archivo central de reglas. TODA la app lee de aquí.
// Última actualización: sesión mayo 2026
// ════════════════════════════════════════════════════════════════════════════

// ── RANGOS ───────────────────────────────────────────────────────────────────
// Líder y Co-Líder/Oficial: rangos OTORGADOS con colchón a defender.
// El colchón NO cuenta en rankings ni totalizadores — solo protege el rango.
// Al agotarse el colchón el rango cae inmediatamente.
// Punk'Z (Líder) es intocable — nunca pierde el rango.

export const RANKS = [
  { label:"Líder 👑",    color:"#FFD700", min:Infinity, buffer:Infinity, protected:true  },
  { label:"Co-Líder 👑", color:"#FFD700", min:25000,    buffer:25000                     },
  { label:"Oficial ⚜",  color:"#40E0FF", min:5000,     buffer:5000                      },
  { label:"Leyenda 🌟",  color:"#C8A2FF", min:2500,     buffer:0                         },
  { label:"Veterano ★★★",color:"#A8FF78", min:1000,     buffer:0                         },
  { label:"Guerrero ★★", color:"#FF9F43", min:500,      buffer:0                         },
  { label:"Soldado ★",   color:"rgba(255,255,255,0.7)", min:100, buffer:0                },
  { label:"Recluta",     color:"rgba(255,255,255,0.4)", min:0,   buffer:0                },
  { label:"⚠ Vigilado", color:"#FF6B6B", min:-Infinity, buffer:0                        },
];

export function getRank(pts, name) {
  if (name === "PUNK'Z") return RANKS[0]; // intocable
  if (pts < 0) return RANKS[RANKS.length - 1];
  return RANKS.find(r => r.min !== Infinity && pts >= r.min) || RANKS[RANKS.length - 2];
}

export function getRankLabel(pts, name) { return getRank(pts, name).label; }
export function getRankColor(pts, name) { return getRank(pts, name).color; }

// Mínimo mensual para sostener rango
export const MIN_MONTHLY_PTS = 20;
// Candidato a expulsión (decisión manual del admin)
export const EXPULSION_THRESHOLD = -100;

// ── HORARIOS DE GUERRA ────────────────────────────────────────────────────────
// TODOS LOS HORARIOS EN BASE ECUADOR (UTC-5)
// Conversión automática:
//   España VERANO (fin mar→fin oct): UTC+2 → Ecuador+7h
//   España INVIERNO (fin oct→fin mar): UTC+1 → Ecuador+6h
//   México: UTC-6 fijo (sin horario de verano) → Ecuador-1h

export function spainOffset() {
  // Retorna cuántas horas va España adelante de Ecuador según la fecha actual
  const now = new Date();
  const y = now.getUTCFullYear();
  // Último domingo de marzo: inicio verano España
  const lastSunMar = new Date(Date.UTC(y, 2, 31));
  lastSunMar.setUTCDate(31 - lastSunMar.getUTCDay());
  // Último domingo de octubre: fin verano España
  const lastSunOct = new Date(Date.UTC(y, 9, 31));
  lastSunOct.setUTCDate(31 - lastSunOct.getUTCDay());
  const isSummer = now >= lastSunMar && now < lastSunOct;
  return isSummer ? 7 : 6;  // CEST=+7h, CET=+6h desde Ecuador
}

export function mexicoOffset() {
  return -1; // México UTC-6, Ecuador UTC-5 → México va 1h atrás (fijo)
}

// Convierte hora Ecuador a España y México
// h_ec: hora en Ecuador (0-23), day_ec: 'lun','mar',...
// Retorna { ec, es, mx } cada uno con { day, h, m, label }
export function convertTime(day_ec, h_ec, m_ec = 0) {
  const DAYS = ['dom','lun','mar','mié','jue','vie','sáb'];
  const dayIdx = {dom:0,lun:1,mar:2,'mié':3,jue:4,vie:5,'sáb':6};

  function addHours(day, h, delta) {
    let newH = h + delta;
    let d = dayIdx[day];
    while (newH >= 24) { newH -= 24; d = (d+1)%7; }
    while (newH < 0)   { newH += 24; d = (d+6)%7; }
    return { day: DAYS[d], h: newH };
  }

  function fmt12(h, m) {
    const p = h < 12 ? 'am' : 'pm';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2,'0')}${p}`;
  }
  function fmt24(h, m) { return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}h`; }

  const es = addHours(day_ec, h_ec, spainOffset());
  const mx = addHours(day_ec, h_ec, mexicoOffset());

  return {
    ec: { day: day_ec, h: h_ec, m: m_ec, label: `${day_ec} ${fmt12(h_ec, m_ec)}` },
    es: { day: es.day, h: es.h, m: m_ec,
          label: `${es.day} ${fmt24(es.h, m_ec)}`,
          labelWinter: `${addHours(day_ec,h_ec,6).day} ${fmt24(addHours(day_ec,h_ec,6).h, m_ec)}` },
    mx: { day: mx.day, h: mx.h, m: m_ec, label: `${mx.day} ${fmt12(mx.h, m_ec)}` },
  };
}

// Muestra horario completo: "vie 15:00h España · 8:00am Ecuador · 7:00am México"
export function showTime(day_ec, h_ec, m_ec = 0) {
  const t = convertTime(day_ec, h_ec, m_ec);
  return `${t.es.label} España · ${t.ec.label} Ecuador · ${t.mx.label} México`;
}

// ── TABLA MAESTRA DE HORARIOS (base Ecuador) ───────────────────────────────
// Verificada y confirmada. No editar sin actualizar la tabla completa.
//
// EVENTO                        Ecuador        España V    España I    México
// Registro abre                 lun 9:00am     lun 16:00h  lun 15:00h  lun 8:00am
// Bonus anticipado cierra       jue 7:00am     jue 14:00h  jue 13:00h  jue 6:00am
// Reset semanal                 lun 8:00am     lun 15:00h  lun 14:00h  lun 7:00am
// Votaciones abren S1           dom 8:00am     dom 15:00h  dom 14:00h  dom 7:00am
// Votaciones abren S2           sáb 12:00pm    sáb 19:00h  sáb 18:00h  sáb 11:00am
// S1 Guerra inicia              vie 8:00am     vie 15:00h  vie 14:00h  vie 7:00am
// S1 Registro cierra            vie 7:00am     vie 14:00h  vie 13:00h  vie 6:00am
// S1 Guerra termina             dom 8:00am     dom 15:00h  dom 14:00h  dom 7:00am
// S1 Votaciones cierran         vie 7:00am     vie 14:00h  vie 13:00h  vie 6:00am
// S2 Guerra inicia              vie 12:00pm    vie 19:00h  vie 18:00h  vie 11:00am
// S2 Registro cierra            vie 11:00am    vie 18:00h  vie 17:00h  vie 10:00am
// S2 Guerra termina             sáb 12:00pm    sáb 19:00h  sáb 18:00h  sáb 11:00am
// S2 Votaciones cierran         vie 11:00am    vie 18:00h  vie 17:00h  vie 10:00am

export const SCHEDULE = {
  // Ambos sistemas
  regOpen:        { day:'lun', h:9,  m:0 },  // lunes 9:00am Ecuador
  earlyBonusEnd:  { day:'jue', h:7,  m:0 },  // jueves 7:00am Ecuador
  weeklyReset:    { day:'lun', h:8,  m:0 },  // lunes 8:00am Ecuador

  classic: {
    label: "Sistema clásico — Conquista de Castillos",
    note: "24h totales: primera fase castillos → segunda fase ciudades enemigas",
    warStart:     { day:'vie', h:8,  m:0 },  // viernes 8:00am Ecuador
    warEnd:       { day:'dom', h:8,  m:0 },  // domingo 8:00am Ecuador
    regClose:     { day:'vie', h:7,  m:0 },  // viernes 7:00am (1h antes)
    votingOpen:   { day:'dom', h:8,  m:0 },  // domingo 8:00am Ecuador
    votingClose:  { day:'vie', h:7,  m:0 },  // viernes 7:00am (1h antes)
  },
  new: {
    label: "Sistema nuevo — 24h (18h castillos + 6h ciudades)",
    note: "Periodo total 24h: 18h conquista castillos + 6h conquista ciudades principales",
    warStart:     { day:'vie', h:12, m:0 },  // viernes 12:00pm Ecuador
    warEnd:       { day:'sáb', h:12, m:0 },  // sábado 12:00pm Ecuador (24h después)
    regClose:     { day:'vie', h:11, m:0 },  // viernes 11:00am (1h antes)
    votingOpen:   { day:'sáb', h:12, m:0 },  // sábado 12:00pm Ecuador (al terminar guerra)
    votingClose:  { day:'vie', h:11, m:0 },  // viernes 11:00am (1h antes)
  },
};

// ── MECÁNICA DE GUERRA — SISTEMA CLÁSICO ────────────────────────────────────
// Fase 1 (primeras 24h): Conquista de Castillos
//   Cada clan empieza con un castillo con 3 slots de defensa.
//   Ocupar un slot de defensa cuesta 1 bandera.
//   Atacar un castillo cuesta 3 banderas.
//   El defensor resiste o es expulsado sin vida (regresa a ciudad a curarse).
//   Al retirar los 3 defensores sin que otros ocupen los slots:
//     → Cooldown de minutos → se habilita el ataque a la ciudad.
// Fase 2 (después de 24h): Conquista de Ciudades
//   La ciudad tiene tropas donadas por miembros del clan (equipamiento + atributos villager).
//   La dificultad depende del nivel de lo donado.
//   Se puede capturar entre varios jugadores o uno solo con nivel suficiente.
//   Ciudad capturada = clan eliminado de la guerra.

// ── MECÁNICA DE GUERRA — SISTEMA NUEVO ──────────────────────────────────────
// Periodo total: 24 horas
//   Primeras 18h: Conquista de castillos (igual que sistema clásico)
//   Últimas 6h: Conquista de ciudades principales de clanes rivales
// Cambios según patch notes (may 2026):
//   Hora de inicio ajustada de 14:05 a 18:00 (hora juego = 12:00pm Ecuador)
//   Duración reducida de 2 días a 1 día (en prueba, puede revertirse)
//   Protección inicial reducida de 24h a 18h
//   Protección de outpost tras captura: 20min → 15min
//   Pace bajado de 90 a 120 (33% más lento, stat inverso)

// ── TOTALIZADORES — FÓRMULA MAESTRA ──────────────────────────────────────────
// grandTotal = pts_acumulados + warPts_actual
//
// pts_acumulados incluye (archivado semana a semana):
//   - whatsapp bono (al crear jugador)
//   - propaganda, votos asamblea/intel, PvP, código único, noticias
//   - todos los puntos de guerra de semanas anteriores
//
// warPts_actual = puntos de la guerra en curso (se resetean al cerrar semana):
//   - pt_registro + pt_registro_temprano + pt_disponibilidad_declarada
//   - pt_disponibilidad + pt_obediencia + pt_batallas_ganadas*2
//   - pt_batallas_perdidas + pt_defensas + pt_bonus + pt_bandido_post
//   - pt_stats + bonus 6 batallas
//   - minus penalizaciones
//
// pts_honorificos: NUNCA se suman al grandTotal ni a rankings.
//   Son un colchón defensivo que protege el rango de Co-Líder y Oficial.

export function calcWarPts(p) {
  const sb6 = (p.pt_batallas_ganadas || 0) >= 6 ? PTS.guerra.bonus_6_batallas : 0;
  return (
    (p.pt_registro             || 0) +
    (p.pt_registro_temprano    || 0) +
    (p.pt_disponibilidad_declarada || 0) +
    (p.pt_disponibilidad       || 0) +
    (p.pt_obediencia           || 0) +
    (p.pt_batallas_ganadas     || 0) * PTS.guerra.batalla_ganada +
    (p.pt_batallas_perdidas    || 0) +
    (p.pt_defensas             || 0) +
    (p.pt_bonus                || 0) +
    (p.pt_bandido_post         || 0) +
    (p.pt_stats                || 0) +
    sb6 -
    (p.pt_penalizacion         || 0) -
    (p.pt_no_aparecio          || 0) -
    (p.pt_ignoro_orden         || 0) * 2 -
    (p.pt_abandono             || 0) * 2 -
    (p.pt_inactivo_4h          || 0) * 3 -
    (p.pt_fuera_castillo       || 0) * 2 -
    (p.pt_bandido_pre          || 0)
  );
}

export function calcGrandTotal(p) {
  return (p.pts_acumulados || 0) + calcWarPts(p);
  // pts_honorificos EXCLUDED — rank buffer only
}

// ── COLUMNAS DB EN players ────────────────────────────────────────────────────
// pts_acumulados       — acumulado histórico permanente
// pts_honorificos      — colchón de rango (Co-Líder=25000, Oficial=5000) — no contar en totals
// pt_registro          — disponibilidad esta guerra
// pt_registro_temprano — bonus anticipado esta guerra
// pt_disponibilidad_declarada — conquistador/refuerzos/reserva
// pt_disponibilidad    — apareció +3
// pt_obediencia        — siguió órdenes
// pt_batallas_ganadas  — batallas ganadas (se multiplica ×2)
// pt_batallas_perdidas — batallas perdidas (+1 c/u)
// pt_defensas          — defensas de castillo
// pt_bonus             — bonus completo
// pt_bandido_post      — bandidos post-batalla
// pt_stats             — actualización BP/Poder/Nivel
// pt_whatsapp          — bono WhatsApp (ya incluido en pts_acumulados)
// pt_penalizacion      — penalización sin registro ni participación
// pt_no_aparecio       — conquistador/refuerzos/reserva no apareció
// pt_ignoro_orden      — ignoró orden (×2 penalización)
// pt_abandono          — abandonó defensa (×2)
// pt_inactivo_4h       — inactivo +12h (×3)
// pt_fuera_castillo    — fuera castillo sin defenderlo (×2)
// pt_bandido_pre       — bandido pre-batalla (×1)
// player_level         — nivel del jugador en el juego
// bp                   — Battle Power
// level                — Poder del jugador
// unique_code          — código único 6 dígitos
// prev_code            — código anterior
// availability         — siempre / intermitente / solo_una / no_disponible / pendiente
// clan_role            — Líder / Co-Líder / Oficial / Veterano / Guerrero / Soldado / Recluta

export default { RANKS, PTS, getRank, getRankLabel, getRankColor, calcWarPts, calcGrandTotal, MIN_MONTHLY_PTS, EXPULSION_THRESHOLD, WAR_SCHEDULES };

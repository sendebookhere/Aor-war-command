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
export const WAR_SCHEDULES = {
  classic: {
    label: "Modo clásico",
    registrationCloseDay: 5,    // viernes
    registrationCloseHour: 14,  // 14:00h España (UTC+2 verano / UTC+1 invierno)
    warStart: "viernes 14:00h España",
    warEnd:   "domingo 14:00h España",
    votingOpen: "domingo 14:00h España",
  },
  new: {
    label: "Modo nuevo",
    registrationCloseDay: 5,    // viernes
    registrationCloseHour: 22,  // 22:00h España
    warStart: "viernes 22:00h España",
    warEnd:   "sábado 22:00h España",
    votingOpen: "sábado 22:00h España",
  },
};

// Bonus anticipado: antes del miércoles 23:59h España (día 3)
export const EARLY_BONUS_DAY = 3;
export const EARLY_BONUS_HOUR = 23;

// ── PUNTOS POR CATEGORÍA ──────────────────────────────────────────────────────
export const PTS = {

  // CÓDIGO ÚNICO
  codigo_unico_dia: 1,          // +1 primera vez del día

  // REGISTRO DE DISPONIBILIDAD
  registro: {
    conquistador:   10,
    refuerzos:       5,
    reserva:         2,
    no_disponible:   1,
  },
  registro_bonus_anticipado: {  // antes miércoles 23:59h España
    conquistador:    5,
    refuerzos:       2,
    reserva:         2,
  },

  // DURANTE LA GUERRA
  guerra: {
    aparecio:          3,        // una vez por guerra
    siguio_ordenes:    2,        // una vez por guerra
    batalla_ganada:    2,        // c/u
    batalla_perdida:   1,        // c/u
    defensa:           1,        // c/u
    bonus_6_batallas: 10,        // automático al superar 6 victorias
    bandido_post:      1,        // c/u después de ganar
    bonus_completo:    5,        // cumplió todo
    sin_registro_participo: 1,   // participó sin registrarse
    primer_movilizador: 3,       // solo el primero
    bp_solo:           1,        // actualización de stats — solo BP
    poder_solo:        1,        // solo Poder
    nivel_solo:        1,        // solo Nivel
    stats_completo:    5,        // BP + Poder + Nivel juntos (una vez/semana)
  },

  // PENALIZACIONES
  penalizaciones: {
    conquistador_no_aparecio: -15,
    refuerzos_no_aparecio:    -10,
    reserva_no_aparecio:       -5,
    sin_registro_sin_participar: -20,
    ignoro_orden:              -2,   // c/vez
    abandono_defensa:          -2,   // c/vez
    fuera_castillo:            -2,   // c/vez
    inactivo_12h:              -3,   // c/vez
    bandido_pre:               -1,   // c/vez (atacó antes de ganar)
  },

  // PROPAGANDA
  propaganda: {
    mensaje_confirmado:    1,    // por cada mensaje publicado y confirmado
    publicacion_falsa:   -50,    // confirmar sin haber enviado
  },
  PROPAGANDA_COOLDOWN_MIN: 120,  // 2 horas entre envíos

  // INTELIGENCIA MILITAR
  intel: {
    voto_dificultad: 3,          // pesos según disponibilidad
  },
  INTEL_VOTE_WEIGHTS: {
    siempre:       3,            // Conquistador
    intermitente:  2,            // Refuerzos
    solo_una:      1,            // Reserva
  },

  // ASAMBLEA — GUERRERO IMPLACABLE
  asamblea: {
    votar:            3,
    mas_votado:      10,         // único ganador
    mayor_puntaje:   10,         // único ganador
    pichichi_extra:  10,         // ambos a la vez = 30 total
    empate:           3,         // c/u en caso de empate
    racha_2sem:      20,
    racha_extra_por_sem: 10,     // +10 por cada semana adicional a partir de la 3ra
  },
  ASAMBLEA_VOTE_WEIGHTS: {       // peso del voto por rango
    "Líder 👑":    5,
    "Co-Líder 👑": 4,
    "Oficial ⚜":  3,
    "Veterano ★★★":2,
    "Leyenda 🌟":  2,
    default:        1,           // Guerrero, Soldado, Recluta
  },
  ASAMBLEA_ELIGIBLE: ["siempre","intermitente","solo_una"], // disponibilidades que pueden votar/ser elegidos

  // VERSUS — PvP (estilo Dudo)
  versus: {
    registrar_0_1_victorias: 1,  // ganaste 0 o 1 de 3
    registrar_2_3_victorias: 2,  // ganaste 2 o 3 de 3 (mayoría)
    confirmar:               1,  // al rival que confirma
    dudo_exitoso:            3,  // al disputante que gana 3+ de 5
    aceptar_dudo:            1,  // al desafiador que acepta
    escalar_admin:           5,  // al desafiador que escala con videos
    ganar_en_video:          5,  // al que tiene razón según admin
    ranking_semanal:         5,  // top 1 semanal (cierre domingo)
    ranking_mensual:         10, // top 1 mensual (último día del mes)
  },
  VERSUS_LIMITS: {
    max_batallas_dia:  5,        // máx desafíos por día
    max_por_rival_dia: 1,        // solo 1 batalla por rival por día
    max_dudo_por_rival_dia: 1,   // solo 1 DUDO por rival por día
    dudo_victorias_necesarias: 3, // necesita ganar 3+ de 5 para DUDO exitoso
    batallas_por_set: 3,         // tamaño del set normal
    batallas_dudo: 5,            // tamaño del set en DUDO
  },

  // NOTICIAS
  noticias: {
    leida:          1,           // por cada noticia marcada como leída
    requerimiento:  1,           // al cumplir un requerimiento
  },

  // WHATSAPP — BONO DE INCORPORACIÓN
  whatsapp: {
    bono_incorporacion: 25,      // una sola vez, permanente, entra a pts_acumulados
  },

};

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

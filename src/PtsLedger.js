// ── Central Points Ledger ─────────────────────────────────────────────────────
// All point awards go through this module so they can be tracked and displayed
import { supabase } from "./supabase";

export const PT_SOURCES = {
  registro_disponibilidad: "Registro de disponibilidad",
  registro_temprano: "Registro anticipado",
  aparecio: "Apareció / Participó",
  batallas_ganadas: "Batallas ganadas",
  batallas_perdidas: "Batallas perdidas",
  defensas: "Defensas de castillo",
  ordenes: "Siguió órdenes",
  bonus_6batallas: "Bonus 6+ batallas",
  bonus_completo: "Bonus completo",
  bandido_post: "Bandido post-guerra",
  stats_bp: "Actualizó BP",
  stats_poder: "Actualizó Poder",
  stats_nivel: "Actualizó Nivel",
  stats_completo: "Actualizó BP+Poder+Nivel",
  whatsapp: "Ingresó al grupo WhatsApp",
  propaganda: "Mensaje de propaganda publicado",
  asamblea_voto: "Votó en Asamblea",
  asamblea_ganador: "Guerrero Implacable",
  asamblea_pichichi: "Pichichi (votos + puntaje)",
  intel_voto: "Votó en Inteligencia",
  noticia_leida: "Leyó noticia del clan",
  pvp_registro: "Registró batalla PvP",
  pvp_mayoria: "Ganó mayoría en PvP",
  pvp_confirmo: "Confirmó resultado PvP",
  pvp_ganador: "Ganador PvP confirmado",
  pvp_dudo_exitoso: "DUDO exitoso",
  pvp_acepto_dudo: "Aceptó DUDO",
  pvp_escalo: "Escaló DUDO a admin",
  pvp_gano_video: "Ganó en videos (admin)",
  codigo_unico: "Usó código único",
  penalizacion: "Penalización",
};

export async function awardPts(playerId, pts, source, note = "") {
  if (!playerId || !pts) return;
  try {
    // Update pts_acumulados
    const { data: p } = await supabase
      .from("players")
      .select("pts_acumulados")
      .eq("id", parseInt(playerId))
      .single();
    
    await supabase
      .from("players")
      .update({ pts_acumulados: (p?.pts_acumulados || 0) + pts })
      .eq("id", parseInt(playerId));

    // Log to pts_ledger for tracking
    await supabase.from("pts_ledger").insert({
      player_id: parseInt(playerId),
      pts,
      source,
      note,
      week: getWarWeek(),
      month: new Date().toISOString().slice(0, 7),
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    // Ledger table may not exist yet - still award pts
    console.warn("Ledger insert failed:", e.message);
  }
}

export async function revokePts(playerId, pts, source, note = "") {
  await awardPts(playerId, -pts, source, note);
}

export async function getPlayerPtsBreakdown(playerId) {
  try {
    const { data } = await supabase
      .from("pts_ledger")
      .select("*")
      .eq("player_id", parseInt(playerId))
      .order("created_at", { ascending: false })
      .limit(100);
    return data || [];
  } catch (e) {
    return [];
  }
}

export async function getWeeklyBreakdown(playerId, week) {
  try {
    const { data } = await supabase
      .from("pts_ledger")
      .select("*")
      .eq("player_id", parseInt(playerId))
      .eq("week", week)
      .order("created_at", { ascending: false });
    return data || [];
  } catch (e) {
    return [];
  }
}

function getWarWeek() {
  const now = new Date(), ec = new Date(now.getTime() - 5 * 3600000);
  const fri = new Date(ec); fri.setDate(ec.getDate() - ((ec.getDay() + 2) % 7));
  const y = fri.getFullYear(), w = Math.ceil(((fri - new Date(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${w}`;
}

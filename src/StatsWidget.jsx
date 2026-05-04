import { useState } from "react";
import { supabase } from "./supabase";
import { PTS } from "./GameRules";

// ── Shared StatsWidget ────────────────────────────────────────────────────────
// Used in: /registro (after CONFIRMAR PARTICIPACIÓN) and /reporte (perfil)
// Mechanics:
//   • Nivel < 340: BP=+1, Poder=+1, Nivel=+1, all 3=+5
//   • Nivel = 340: Nivel field LOCKED (admin-only via roster)
//                  BP=+2, Poder=+2, BP+Poder=+5
//   • One update per week (stats_updated_week)
//   • Admin can override nivel=340 from roster panel

export default function StatsWidget({ player, onSaved }) {
  const [newBp,    setNewBp]    = useState("");
  const [newLevel, setNewLevel] = useState("");
  const [newNivel, setNewNivel] = useState("");
  const [msg,      setMsg]      = useState("");
  const [saving,   setSaving]   = useState(false);

  const nivelLocked = (player.player_level || 0) >= 340;

  // Pts calculation
  function calcPts() {
    const hasBp    = newBp.trim()    !== "";
    const hasLevel = newLevel.trim() !== "";
    const hasNivel = !nivelLocked && newNivel.trim() !== "";
    const count    = (hasBp ? 1 : 0) + (hasLevel ? 1 : 0) + (hasNivel ? 1 : 0);
    if (count === 0) return 0;
    if (count === 3) return PTS.guerra.stats_completo; // +5
    if (nivelLocked) {
      // Only BP and/or Poder available
      if (hasBp && hasLevel) return PTS.guerra.stats_completo; // +5 both
      return 2; // +2 solo (bp_solo_locked or poder_solo_locked)
    }
    // Nivel available but not all 3 filled
    return count; // +1 per stat
  }

  const pts = calcPts();
  const hasAny = newBp.trim() !== "" || newLevel.trim() !== "" || (!nivelLocked && newNivel.trim() !== "");

  function getWarWeek() {
    const now = new Date(), ec = new Date(now.getTime() - 5 * 3600000);
    const fri = new Date(ec);
    fri.setUTCDate(ec.getUTCDate() - ((ec.getUTCDay() + 2) % 7));
    const y = fri.getUTCFullYear();
    const w = Math.ceil(((fri - new Date(Date.UTC(y, 0, 1))) / 86400000 + 1) / 7);
    return `${y}-W${w}`;
  }

  async function save() {
    if (!hasAny || saving) return;
    setSaving(true);
    setMsg("");

    const week = getWarWeek();
    if (player.stats_updated_week === week) {
      setMsg("⚠ Ya actualizaste tus stats esta semana.");
      setSaving(false);
      return;
    }

    const hasBp    = newBp.trim()    !== "";
    const hasLevel = newLevel.trim() !== "";
    const hasNivel = !nivelLocked && newNivel.trim() !== "";
    const nivelVal = hasNivel ? parseInt(newNivel) : null;

    // Validate nivel range
    if (hasNivel && (nivelVal < 1 || nivelVal > 340)) {
      setMsg("⚠ Nivel debe estar entre 1 y 340.");
      setSaving(false);
      return;
    }

    const earned = calcPts();
    const updates = {
      pt_stats:           (player.pt_stats  || 0) + earned,
      stats_updated_week: week,
    };
    if (hasBp)    updates.bp           = parseInt(newBp);
    if (hasLevel) updates.level        = parseInt(newLevel);
    if (hasNivel) updates.player_level = nivelVal;

    // If nivel reaches 340 after this update, note it
    const reachesMax = hasNivel && nivelVal >= 340;

    const { error } = await supabase.from("players").update(updates).eq("id", player.id);
    if (error) { setMsg("Error al guardar: " + (error.message || "DB error")); setSaving(false); return; }

    // Log to player_stats history
    await supabase.from("player_stats").insert({
      player_id:   player.id,
      player_name: player.name,
      bp:          hasBp    ? parseInt(newBp)    : (player.bp    || 0),
      level:       hasLevel ? parseInt(newLevel) : (player.level || 0),
      updated_by:  "jugador",
    }).catch(() => {});

    // Log to pts_ledger
    const now = new Date();
    const ecNow = new Date(now.getTime() - 5 * 3600000);
    const m = String(ecNow.getUTCMonth() + 1).padStart(2, "0");
    const month = `${ecNow.getUTCFullYear()}-${m}`;
    await supabase.from("pts_ledger").insert({
      player_id: player.id, pts: earned, source: "stats",
      note: [hasBp && "BP", hasLevel && "Poder", hasNivel && `Nv.${nivelVal}`].filter(Boolean).join("+"),
      week, month, created_at: now.toISOString(),
    }).catch(() => {});

    const msg = reachesMax
      ? `✓ Stats guardados (+${earned}pts). ¡Nivel 340 alcanzado! El campo Nivel queda bloqueado.`
      : `✓ Stats guardados (+${earned}pts)`;
    setMsg(msg);
    setNewBp(""); setNewLevel(""); setNewNivel("");
    setSaving(false);
    if (onSaved) onSaved(earned, updates);
  }

  const alreadyDone = player.stats_updated_week === getWarWeek();

  return (
    <div style={{ background: "rgba(255,215,0,0.04)", border: "1px solid rgba(255,215,0,0.15)", borderRadius: "8px", padding: "12px", marginBottom: "16px" }}>

      {/* Header */}
      <div style={{ fontSize: "11px", color: "#FFD700", marginBottom: "8px", fontWeight: "bold" }}>
        📊 ACTUALIZA TUS STATS
      </div>

      {/* Already done indicator */}
      {alreadyDone && (
        <div style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,215,0,0.5)", marginBottom: "8px", padding: "4px 8px", background: "rgba(255,215,0,0.05)", borderRadius: "4px", textAlign: "center" }}>
          ✓ Stats actualizados esta semana
        </div>
      )}

      {/* Rules info box */}
      <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "6px", padding: "7px 10px", marginBottom: "10px", fontSize: "10px" }}>
        {nivelLocked ? (<>
          <div style={{ color: "rgba(255,215,0,0.6)", marginBottom: "2px", fontSize: "9px", fontFamily: "monospace" }}>🎯 NIVEL 340 ALCANZADO — campo bloqueado</div>
          <div style={{ color: "#A8FF78", marginBottom: "2px" }}>💀 Solo BP → <strong>+2 pts</strong></div>
          <div style={{ color: "#A8FF78", marginBottom: "2px" }}>⚔ Solo Poder → <strong>+2 pts</strong></div>
          <div style={{ color: "#FFD700" }}>💀 BP + ⚔ Poder juntos → <strong>+5 pts</strong></div>
        </>) : (<>
          <div style={{ color: "#A8FF78", marginBottom: "2px" }}>💀 Solo BP → <strong>+1 pt</strong> &nbsp; ⚔ Solo Poder → <strong>+1 pt</strong> &nbsp; 🎯 Solo Nivel → <strong>+1 pt</strong></div>
          <div style={{ color: "#FFD700" }}>Los 3 juntos → <strong>+5 pts</strong> (bonus extra)</div>
        </>)}
        <div style={{ color: "rgba(255,255,255,0.25)", fontSize: "8px", marginTop: "3px", fontFamily: "monospace" }}>Una actualización por semana</div>
      </div>

      {/* Current values */}
      <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", marginBottom: "8px" }}>
        Actuales: 💀 {(player.bp || 0).toLocaleString()} BP &nbsp;·&nbsp; ⚔ {((player.level || 0) / 1000).toFixed(1)}k Poder
        {(player.player_level || 0) > 0 && <span> &nbsp;·&nbsp; 🎯 Nivel {player.player_level}{nivelLocked && <span style={{ color: "#FFD700" }}> (MAX)</span>}</span>}
      </div>

      {/* Input fields */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", marginBottom: "3px", fontFamily: "monospace" }}>
            💀 BP <span style={{ color: "rgba(255,255,255,0.2)" }}>+{nivelLocked ? 2 : 1}pt</span>
          </div>
          <input
            value={newBp}
            onChange={e => setNewBp(e.target.value)}
            placeholder={String(player.bp || "")}
            type="number"
            disabled={alreadyDone}
            style={{ width: "100%", background: alreadyDone ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", color: "#fff", padding: "8px 10px", fontSize: "12px", outline: "none", boxSizing: "border-box", cursor: alreadyDone ? "not-allowed" : "text" }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", marginBottom: "3px", fontFamily: "monospace" }}>
            ⚔ Poder <span style={{ color: "rgba(255,255,255,0.2)" }}>+{nivelLocked ? 2 : 1}pt</span>
          </div>
          <input
            value={newLevel}
            onChange={e => setNewLevel(e.target.value)}
            placeholder={String(player.level || "")}
            type="number"
            disabled={alreadyDone}
            style={{ width: "100%", background: alreadyDone ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", color: "#fff", padding: "8px 10px", fontSize: "12px", outline: "none", boxSizing: "border-box", cursor: alreadyDone ? "not-allowed" : "text" }}
          />
        </div>
        {/* Nivel field — hidden when locked */}
        {!nivelLocked ? (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", marginBottom: "3px", fontFamily: "monospace" }}>
              🎯 Nivel <span style={{ color: "rgba(255,255,255,0.2)" }}>+1pt</span>
            </div>
            <input
              value={newNivel}
              onChange={e => { const v = Math.min(340, Math.max(1, parseInt(e.target.value) || 0)); setNewNivel(String(v || "")); }}
              placeholder={(player.player_level || "—") + " / 340"}
              type="number"
              min="1"
              max="340"
              disabled={alreadyDone}
              style={{ width: "100%", background: alreadyDone ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", color: "#fff", padding: "8px 10px", fontSize: "12px", outline: "none", boxSizing: "border-box", cursor: alreadyDone ? "not-allowed" : "text" }}
            />
          </div>
        ) : (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "9px", color: "rgba(255,215,0,0.4)", marginBottom: "3px", fontFamily: "monospace" }}>
              🎯 Nivel <span style={{ color: "rgba(255,215,0,0.3)" }}>MAX</span>
            </div>
            <div style={{ width: "100%", background: "rgba(255,215,0,0.04)", border: "1px solid rgba(255,215,0,0.15)", borderRadius: "6px", color: "rgba(255,215,0,0.4)", padding: "8px 10px", fontSize: "12px", boxSizing: "border-box", textAlign: "center", fontFamily: "monospace" }}>
              340 🔒
            </div>
          </div>
        )}
      </div>

      {/* Save button */}
      {!alreadyDone && (
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            onClick={save}
            disabled={!hasAny || saving}
            style={{ flex: 1, padding: "9px", background: hasAny ? "rgba(168,255,120,0.15)" : "rgba(255,255,255,0.03)", border: "1px solid " + (hasAny ? "rgba(168,255,120,0.35)" : "rgba(255,255,255,0.07)"), borderRadius: "6px", color: hasAny ? "#A8FF78" : "rgba(255,255,255,0.25)", fontSize: "11px", cursor: hasAny ? "pointer" : "default", fontWeight: "bold" }}
          >
            {saving ? "Guardando..." : `💾 Guardar stats${pts > 0 ? ` (+${pts}pts)` : ""}`}
          </button>
          {hasAny && (
            <button
              onClick={() => { setNewBp(""); setNewLevel(""); setNewNivel(""); setMsg(""); }}
              style={{ padding: "9px 12px", background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: "6px", color: "#FF6B6B", fontSize: "11px", cursor: "pointer" }}
            >✕</button>
          )}
        </div>
      )}

      {msg && (
        <div style={{ fontSize: "11px", color: msg.includes("⚠") || msg.includes("Error") ? "#FF6B6B" : "#A8FF78", marginTop: "6px", fontWeight: "bold" }}>
          {msg}
        </div>
      )}
    </div>
  );
}

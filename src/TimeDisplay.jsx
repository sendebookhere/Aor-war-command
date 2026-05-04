// TimeDisplay.jsx — Muestra horarios con conversión automática España/Ecuador/México
// Importa desde GameRules para mantener una sola fuente de verdad

import { SCHEDULE, convertTime, spainOffset } from "./GameRules";

// Componente: muestra una fila de horario con España resaltada, luego Ecuador y México
export function TimeRow({ day_ec, h_ec, m_ec = 0, label = "", accent = "#FFD700" }) {
  const t = convertTime(day_ec, h_ec, m_ec);
  const isWinter = spainOffset() === 6;
  const esLabel = isWinter ? t.es.labelWinter : t.es.label;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
      {label && (
        <div style={{ fontFamily: "monospace", fontSize: "7px", letterSpacing: "0.15em",
          color: "rgba(255,255,255,0.25)", marginBottom: "2px" }}>{label}</div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "baseline" }}>
        {/* España — prioritaria */}
        <span style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: "bold", color: accent }}>
          {esLabel}
        </span>
        <span style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.3)" }}>
          España{isWinter ? " (invierno)" : ""}
        </span>
        <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "9px" }}>·</span>
        {/* Ecuador */}
        <span style={{ fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>
          {t.ec.label}
        </span>
        <span style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.25)" }}>
          Ecuador
        </span>
        <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "9px" }}>·</span>
        {/* México */}
        <span style={{ fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>
          {t.mx.label}
        </span>
        <span style={{ fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.25)" }}>
          México
        </span>
      </div>
    </div>
  );
}

// Versión compacta: "vie 15:00h España · 8:00am Ecuador · 7:00am México"
export function TimeInline({ day_ec, h_ec, m_ec = 0, accent = "#FFD700" }) {
  const t = convertTime(day_ec, h_ec, m_ec);
  const esLabel = spainOffset() === 6 ? t.es.labelWinter : t.es.label;
  return (
    <span>
      <strong style={{ color: accent }}>{esLabel} España</strong>
      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9em" }}>
        {" · "}{t.ec.label} Ecuador{" · "}{t.mx.label} México
      </span>
    </span>
  );
}

// Panel completo de horarios según modo de guerra activo
export function WarSchedulePanel({ warMode, compact = false }) {
  const s = SCHEDULE[warMode === "new" ? "new" : "classic"];
  const accent = warMode === "new" ? "#FF9F43" : "#A8FF78";
  const lbl = { fontFamily: "monospace", fontSize: "7px", letterSpacing: "0.2em",
    color: "rgba(255,255,255,0.25)", marginBottom: "4px", marginTop: "8px" };

  return (
    <div style={{ fontSize: "10px", lineHeight: "1.6" }}>
      <div style={{ fontFamily: "monospace", fontSize: "8px", letterSpacing: "0.15em",
        color: accent, marginBottom: "8px", opacity: 0.8 }}>
        {s.label.toUpperCase()}
      </div>
      <div style={lbl}>REGISTRO ABRE</div>
      <TimeRow day_ec={SCHEDULE.regOpen.day} h_ec={SCHEDULE.regOpen.h} label="" accent={accent}/>
      <div style={lbl}>BONUS ANTICIPADO CIERRA</div>
      <TimeRow day_ec={SCHEDULE.earlyBonusEnd.day} h_ec={SCHEDULE.earlyBonusEnd.h} label="" accent="#FFD700"/>
      <div style={lbl}>REGISTRO CIERRA</div>
      <TimeRow day_ec={s.regClose.day} h_ec={s.regClose.h} label="" accent={accent}/>
      <div style={lbl}>GUERRA INICIA</div>
      <TimeRow day_ec={s.warStart.day} h_ec={s.warStart.h} label="" accent={accent}/>
      {s.warEnd && <>
        <div style={lbl}>GUERRA TERMINA</div>
        <TimeRow day_ec={s.warEnd.day} h_ec={s.warEnd.h} label="" accent={accent}/>
      </>}
      <div style={lbl}>VOTACIONES ASAMBLEA ABREN</div>
      <TimeRow day_ec={s.votingOpen.day} h_ec={s.votingOpen.h} label="" accent="#FFD700"/>
      <div style={lbl}>VOTACIONES ASAMBLEA CIERRAN</div>
      <TimeRow day_ec={s.votingClose.day} h_ec={s.votingClose.h} label="" accent="#FFD700"/>
    </div>
  );
}

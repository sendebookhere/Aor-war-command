import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { awardPts } from "./PtsLedger";
import { PTS } from "./GameRules";
import { LoadingScreen } from "./LoadingScreen";
import NavBar from "./NavBar";
import PageHeader from "./PageHeader";
import NalguitasFooter from "./NalguitasFooter";

export default function Noticias() {
  const [news, setNews]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg]         = useState("");
  const [tab, setTab]         = useState("activas"); // activas | historial_n | historial_s

  const playerId   = sessionStorage.getItem("aor_player_id");
  const playerName = sessionStorage.getItem("aor_player_name");
  const now        = Date.now();
  const DAY        = 86400000;
  const TWO_DAYS   = 2 * DAY;

  async function load() {
    const { data } = await supabase.from("clan_news")
      .select("*").order("created_at", { ascending: false });
    setNews(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function hasRead(post) {
    return (post.completions || []).some(c => String(c.id) === String(playerId));
  }
  function hasCumplido(post) {
    return (post.completions || []).some(c => String(c.id) === String(playerId) && c.cumplido);
  }
  function isExpired(post) {
    const age = now - new Date(post.created_at).getTime();
    return post.type === "requerimiento" ? age > DAY : age > TWO_DAYS;
  }
  function timeLeft(post) {
    const limit = post.type === "requerimiento" ? DAY : TWO_DAYS;
    const ms = limit - (now - new Date(post.created_at).getTime());
    if (ms <= 0) return null;
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  async function markRead(post) {
    if (!playerId || hasRead(post)) return;
    const newComp = [...(post.completions || []), { id: playerId, name: playerName, ts: new Date().toISOString() }];
    await supabase.from("clan_news").update({ completions: newComp }).eq("id", post.id);
    await awardPts(parseInt(playerId), PTS.noticias.leida, "noticia_leida", post.title?.slice(0, 40));
    setMsg("✓ +1pt por lectura");
    setTimeout(() => setMsg(""), 3000);
    load();
  }

  async function markCumplido(post) {
    if (!playerId || hasCumplido(post)) return;
    const newComp = (post.completions || []).map(c =>
      String(c.id) === String(playerId) ? { ...c, cumplido: true, cumplido_ts: new Date().toISOString() } : c
    );
    // If not yet read, mark as read too
    if (!hasRead(post)) newComp.push({ id: playerId, name: playerName, ts: new Date().toISOString(), cumplido: true });
    await supabase.from("clan_news").update({ completions: newComp }).eq("id", post.id);
    await awardPts(parseInt(playerId), PTS.noticias.leida + 3, "solicitud_cumplida", post.title?.slice(0, 40));
    setMsg("✓ +3pts por cumplimiento");
    setTimeout(() => setMsg(""), 3000);
    load();
  }

  // Partition news
  const activas   = news.filter(p => !isExpired(p));
  const noticias  = activas.filter(p => p.type !== "requerimiento");
  const solicitudes = activas.filter(p => p.type === "requerimiento");
  const histN     = news.filter(p => isExpired(p) && p.type !== "requerimiento");
  const histS     = news.filter(p => isExpired(p) && p.type === "requerimiento");

  // Rankings
  const readMap = {}, solReadMap = {}, cumMap = {};
  news.forEach(p => {
    const isReq = p.type === "requerimiento";
    (p.completions || []).forEach(c => {
      readMap[c.name] = (readMap[c.name] || 0) + 1;
      if (isReq) solReadMap[c.name] = (solReadMap[c.name] || 0) + 1;
      if (c.cumplido) cumMap[c.name] = (cumMap[c.name] || 0) + 1;
    });
  });
  const topReaders     = Object.entries(readMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topSolReaders  = Object.entries(solReadMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topCumplidores = Object.entries(cumMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const lbl = { fontFamily: "monospace", fontSize: "7px", letterSpacing: "0.25em", color: "rgba(255,255,255,0.25)", marginBottom: "6px" };
  const cardStyle = (color) => ({ background: `rgba(255,255,255,0.02)`, border: `1px solid rgba(255,255,255,0.07)`, borderRadius: "8px", padding: "12px", marginBottom: "8px" });

  function NewsCard({ post }) {
    const read     = hasRead(post);
    const cumplido = hasCumplido(post);
    const tl       = timeLeft(post);
    const isReq    = post.type === "requerimiento";
    const color    = isReq ? "#FF9F43" : "#FF9F43";
    return (
      <div style={cardStyle(color)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "serif", fontSize: "13px", color: "#FF9F43", marginBottom: "3px" }}>{post.title}</div>
            {isReq && <div style={{ fontFamily: "monospace", fontSize: "7px", color: "rgba(255,159,67,0.4)", letterSpacing: "0.2em" }}>SOLICITUD</div>}
          </div>
          {tl && <div style={{ fontFamily: "monospace", fontSize: "8px", color: "rgba(255,255,255,0.25)", flexShrink: 0, marginLeft: "8px" }}>⏳ {tl}</div>}
        </div>
        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.55)", lineHeight: "1.6", marginBottom: "8px" }}>{post.body}</div>
        <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.2)", fontFamily: "monospace", marginBottom: "8px" }}>
          {new Date(post.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          {" · "}{(post.completions || []).length} lectura(s)
        </div>
        {playerId && (
          <div style={{ display: "flex", gap: "6px" }}>
            {!read ? (
              <button onClick={() => markRead(post)} style={{ flex: 1, padding: "6px", background: "rgba(255,159,67,0.1)", border: "1px solid rgba(255,159,67,0.3)", borderRadius: "5px", color: "#FF9F43", fontSize: "10px", cursor: "pointer", fontFamily: "monospace" }}>
                ✓ LEÍDA (+1pt)
              </button>
            ) : (
              <div style={{ flex: 1, padding: "6px", textAlign: "center", fontFamily: "monospace", fontSize: "9px", color: "rgba(255,159,67,0.4)" }}>✓ leída</div>
            )}
            {isReq && !cumplido && (
              <button onClick={() => markCumplido(post)} style={{ flex: 1, padding: "6px", background: "rgba(168,255,120,0.08)", border: "1px solid rgba(168,255,120,0.25)", borderRadius: "5px", color: "#A8FF78", fontSize: "10px", cursor: "pointer", fontFamily: "monospace" }}>
                ✓ CUMPLIDA (+3pts)
              </button>
            )}
            {isReq && cumplido && (
              <div style={{ flex: 1, padding: "6px", textAlign: "center", fontFamily: "monospace", fontSize: "9px", color: "rgba(168,255,120,0.4)" }}>✓ cumplida</div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (loading) return <LoadingScreen page="/noticias" />;

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0f", fontFamily: "Georgia,serif", color: "#d4c9a8", padding: "20px", paddingBottom: "50px" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>
        <NavBar current="/noticias" />
        <PageHeader page="/noticias" />

        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "12px 14px", marginBottom: "16px" }}>
          <div style={lbl}>NOTICIAS CLAN</div>
          <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", lineHeight: "1.7" }}>
            Lee cada noticia antes de que expire para ganar <strong style={{ color: "#FF9F43" }}>+1pt</strong>. Las noticias tienen 2 días. Las solicitudes tienen 1 día — léelas (+1pt) y cúmplelas (+3pts) a tiempo.
          </div>
        </div>

        {/* Tab navigation */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "16px" }}>
          {[
            { key: "activas", label: `ACTIVAS (${activas.length})` },
            { key: "historial_n", label: `HISTORIAL NOTICIAS (${histN.length})` },
            { key: "historial_s", label: `HISTORIAL SOLICITUDES (${histS.length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, padding: "6px 4px", background: tab === t.key ? "rgba(255,159,67,0.1)" : "rgba(255,255,255,0.02)", border: "1px solid " + (tab === t.key ? "rgba(255,159,67,0.3)" : "rgba(255,255,255,0.07)"), borderRadius: "6px", color: tab === t.key ? "#FF9F43" : "rgba(255,255,255,0.3)", fontSize: "8px", cursor: "pointer", fontFamily: "monospace", letterSpacing: "0.05em" }}>
              {t.label}
            </button>
          ))}
        </div>

        {msg && <div style={{ padding: "8px 12px", marginBottom: "8px", background: "rgba(168,255,120,0.06)", border: "1px solid rgba(168,255,120,0.2)", borderRadius: "6px", fontFamily: "monospace", fontSize: "10px", color: "#A8FF78" }}>{msg}</div>}

        {tab === "activas" && (
          <>
            {solicitudes.length > 0 && (
              <>
                <div style={lbl}>SOLICITUDES EN CURSO</div>
                {solicitudes.map(p => <NewsCard key={p.id} post={p} />)}
              </>
            )}
            {noticias.length > 0 && (
              <>
                <div style={{ ...lbl, marginTop: solicitudes.length > 0 ? "12px" : 0 }}>NOTICIAS ACTUALES</div>
                {noticias.map(p => <NewsCard key={p.id} post={p} />)}
              </>
            )}
            {activas.length === 0 && <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)", textAlign: "center", padding: "24px", fontFamily: "monospace" }}>SIN NOTICIAS ACTIVAS</div>}
          </>
        )}
        {tab === "historial_n" && (
          <>
            <div style={lbl}>HISTORIAL DE NOTICIAS</div>
            {histN.length === 0 && <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)", textAlign: "center", padding: "16px", fontFamily: "monospace" }}>—</div>}
            {histN.map(p => (
              <div key={p.id} style={{ padding: "8px 12px", marginBottom: "4px", background: "rgba(255,255,255,0.01)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{p.title}</div>
                <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>{new Date(p.created_at).toLocaleDateString("es-ES")} · {(p.completions || []).length} lecturas</div>
              </div>
            ))}
          </>
        )}
        {tab === "historial_s" && (
          <>
            <div style={lbl}>HISTORIAL DE SOLICITUDES</div>
            {histS.length === 0 && <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)", textAlign: "center", padding: "16px", fontFamily: "monospace" }}>—</div>}
            {histS.map(p => (
              <div key={p.id} style={{ padding: "8px 12px", marginBottom: "4px", background: "rgba(255,255,255,0.01)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{p.title}</div>
                <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>
                  {new Date(p.created_at).toLocaleDateString("es-ES")} ·{" "}
                  {(p.completions || []).filter(c => c.cumplido).length} cumplidas de {(p.completions || []).length} leídas
                </div>
              </div>
            ))}
          </>
        )}

        {/* Rankings — 3 columns */}
        <div style={{ marginTop: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", padding: "10px" }}>
              <div style={lbl}>MÁS NOTICIAS LEÍDAS</div>
              {topReaders.map(([name, n], i) => (
                <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", padding: "2px 0" }}>
                  <span style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Georgia,serif", overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"70px" }}>{i + 1}. {name}</span>
                  <span style={{ color: "#FF9F43", fontFamily: "monospace" }}>{n}</span>
                </div>
              ))}
              {topReaders.length === 0 && <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>—</div>}
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", padding: "10px" }}>
              <div style={lbl}>MÁS SOL. LEÍDAS</div>
              {topSolReaders.map(([name, n], i) => (
                <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", padding: "2px 0" }}>
                  <span style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Georgia,serif", overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"70px" }}>{i + 1}. {name}</span>
                  <span style={{ color: "#FF9F43", fontFamily: "monospace" }}>{n}</span>
                </div>
              ))}
              {topSolReaders.length === 0 && <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>—</div>}
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", padding: "10px" }}>
              <div style={lbl}>MÁS SOL. CUMPLIDAS</div>
              {topCumplidores.map(([name, n], i) => (
                <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", padding: "2px 0" }}>
                  <span style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Georgia,serif", overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"70px" }}>{i + 1}. {name}</span>
                  <span style={{ color: "#A8FF78", fontFamily: "monospace" }}>{n}</span>
                </div>
              ))}
              {topCumplidores.length === 0 && <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>—</div>}
            </div>
          </div>
        </div>

        <div style={{ marginTop: "8px", padding: "8px 10px", background: "rgba(255,107,107,0.04)", border: "1px solid rgba(255,107,107,0.1)", borderRadius: "6px", fontFamily: "monospace", fontSize: "8px", color: "rgba(255,107,107,0.4)" }}>
          ⚠ Declarar cumplimiento falso = -20pts · El admin puede aplicar la penalización desde el panel de control
        </div>
      </div>
      <NalguitasFooter />
    </div>
  );
}

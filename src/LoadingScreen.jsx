// ── Shared Loading Screen ───────────────────────────────────────────────────
export function LoadingScreen({page}) {
  const pages = {
    "/":             ["AOR COMMAND",           "#FFD700"],
    "/registro":     ["REGISTRO DE GUERRA",    "#A8FF78"],
    "/reporte":      ["RANKING",               "#40E0FF"],
    "/puntos":       ["SISTEMA DE PUNTOS",     "#FF9F43"],
    "/propaganda":   ["PROPAGANDA DE GUERRA",  "#C8A2FF"],
    "/inteligencia": ["INTELIGENCIA MILITAR",  "#FF6B6B"],
    "/asamblea":     ["ASAMBLEA DE CENTURIAS", "#F4D03F"],
    "/noticias":     ["NOTICIAS CLAN",         "#FF9F43"],
    "/versus":       ["VERSUS — PvP",          "#FF6B6B"],
  };
  const [name, color] = pages[page] || ["AOR COMMAND", "#FFD700"];
  return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",display:"flex",
      flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"10px"}}>
      <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.4em",
        color:"rgba(64,224,255,0.2)"}}>CARGANDO</div>
      <div style={{fontFamily:"monospace",fontSize:"11px",letterSpacing:"0.2em",
        color:color,opacity:0.6}}>— {name} —</div>
    </div>
  );
}

// Paleta oficial — 7 colores únicos, uno por hoja
export const PAGE_COLORS = {
  "/":             "#FFD700",  // HOME — oro
  "/registro":     "#A8FF78",  // Registro — verde lima
  "/reporte":      "#40E0FF",  // Ranking — celeste
  "/puntos":       "#FF9F43",  // Puntos — naranja
  "/propaganda":   "#C8A2FF",  // Propaganda — lavanda
  "/inteligencia": "#FF6B6B",  // Inteligencia — rojo coral
  "/asamblea":     "#F4D03F",  // Asamblea — dorado cálido
  "/noticias":     "#FF9F43",  // Noticias Clan — naranja
};

export const PAGE_NAMES = {
  "/":             "HOME",
  "/registro":     "Registro de Guerra",
  "/reporte":      "Ranking [AOR]",
  "/puntos":       "Sistema de Puntos",
  "/propaganda":   "Propaganda de Guerra",
  "/inteligencia": "Inteligencia Militar",
  "/asamblea":     "Asamblea",
  "/noticias":     "Noticias Clan",
  "/inteligencia": "Inteligencia Militar",
  "/asamblea":     "Asamblea",
};

export const PAGE_SUBTITLES = {
  "/":             "Panel de acceso",
  "/registro":     "Confirma tu participación y suma puntos",
  "/reporte":      "Posiciones, perfiles y puntos del clan",
  "/puntos":       "Cómo ganar y perder puntos en cada guerra",
  "/propaganda":   "Mensajes preaprobados para difundir en el chat general",
  "/inteligencia": "Registro de guerras, rivales y análisis táctico",
  "/asamblea":     "Elige al Guerrero Implacable de la semana",
};

// Exact format matching the screenshot
export default function PageHeader({page}) {
  const color    = PAGE_COLORS[page]    || "#FFD700";
  const name     = PAGE_NAMES[page]     || page;
  const subtitle = PAGE_SUBTITLES[page] || "";

  return (
    <div style={{textAlign:"center",marginBottom:"24px",paddingTop:"4px"}}>
      <div style={{
        fontSize:"9px",
        letterSpacing:"0.5em",
        color:"rgba(255,255,255,0.25)",
        fontFamily:"monospace",
        marginBottom:"12px",
        textTransform:"uppercase",
      }}>
        Antigua Orden
      </div>
      <div style={{
        fontSize:"20px",
        color:color+"55",
        marginBottom:"10px",
        letterSpacing:"0.1em",
        fontFamily:"monospace",
        lineHeight:1,
      }}>
        ⚔
      </div>
      <div style={{
        fontSize:"9px",
        letterSpacing:"0.4em",
        color:color+"99",
        fontFamily:"monospace",
        marginBottom:"10px",
        textTransform:"uppercase",
      }}>
        [AOR]
      </div>
      <div style={{
        fontFamily:"Georgia,serif",
        fontSize:"28px",
        color:color,
        marginBottom:"8px",
        fontWeight:"normal",
        lineHeight:1.1,
      }}>
        {name}
      </div>
      {subtitle && (
        <div style={{
          fontSize:"13px",
          color:"rgba(255,255,255,0.4)",
          fontFamily:"Georgia,serif",
          fontWeight:"normal",
        }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

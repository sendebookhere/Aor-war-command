export default function NalguitasFooter() {
  return (
    <>
      <div style={{height:"36px"}}/>
      <div style={{
        position:"fixed",bottom:0,left:0,right:0,height:"28px",
        background:"linear-gradient(90deg,rgba(13,13,15,0.97),rgba(20,20,26,0.97),rgba(13,13,15,0.97))",
        borderTop:"1px solid rgba(64,224,255,0.08)",
        display:"flex",alignItems:"center",justifyContent:"center",
        zIndex:999,backdropFilter:"blur(8px)",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          <div style={{width:"1px",height:"10px",background:"rgba(64,224,255,0.2)"}}/>
          <span style={{fontSize:"9px",letterSpacing:"0.25em",color:"rgba(64,224,255,0.25)",fontFamily:"monospace",textTransform:"uppercase",userSelect:"none"}}>Developed by</span>
          <span style={{fontSize:"9px",letterSpacing:"0.15em",background:"linear-gradient(90deg,rgba(64,224,255,0.5),rgba(255,215,0,0.5))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontFamily:"monospace",fontWeight:"bold",userSelect:"none"}}>NALGUITAS TECH</span>
          <div style={{width:"1px",height:"10px",background:"rgba(255,215,0,0.2)"}}/>
        </div>
      </div>
    </>
  );
}

import { useState, useEffect } from "react";
import { supabase } from "./supabase";

// ── User Auth Gate ──────────────────────────────────────────────────────────
// Called from /registro, /propaganda, /asamblea, /inteligencia when enabled
export function useUserIdentity() {
  const [identity, setIdentity] = useState(null); // {id, name, phone}
  const [loaded, setLoaded] = useState(false);

  useEffect(()=>{
    const stored = sessionStorage.getItem("aor_user_identity");
    if (stored) { try { setIdentity(JSON.parse(stored)); } catch(e){} }
    setLoaded(true);
  },[]);

  function saveIdentity(id, name, phone) {
    const obj = {id, name, phone};
    sessionStorage.setItem("aor_user_identity", JSON.stringify(obj));
    setIdentity(obj);
  }

  function clearIdentity() {
    sessionStorage.removeItem("aor_user_identity");
    setIdentity(null);
  }

  return {identity, loaded, saveIdentity, clearIdentity};
}

export default function UserAuthGate({enabled, onAuthenticated, children}) {
  const [players, setPlayers]     = useState([]);
  const [nameInput, setNameInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [mode, setMode]           = useState("phone"); // "phone" or "code"
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected]   = useState(null);
  const [saving, setSaving]       = useState(false);

  useEffect(()=>{
    if (!enabled) { onAuthenticated && onAuthenticated(null); return; }
    const stored = sessionStorage.getItem("aor_user_identity");
    if (stored) { try { const obj=JSON.parse(stored); onAuthenticated && onAuthenticated(obj); return; } catch(e){} }
    supabase.from("players").select("id,name,phone,unique_code,active").eq("active",true).order("name")
      .then(({data})=>{ setPlayers(data||[]); setLoading(false); });
  },[enabled]);

  if (!enabled) return children || null;

  function handleName(val) {
    setNameInput(val); setSelected(null); setError("");
    if (val.length<2){setSuggestions([]);return;}
    setSuggestions(players.filter(p=>p.name.toLowerCase().includes(val.toLowerCase())).slice(0,5));
  }

  async function verify() {
    if (!selected) { setError("Selecciona tu nombre del juego"); return; }
    setSaving(true); setError("");
    const val = codeInput.trim();
    if (!val) { setError("Ingresa tu número o código"); setSaving(false); return; }

    let ok = false;
    if (mode === "phone") {
      ok = selected.phone && (selected.phone.replace(/\s/g,"") === val.replace(/\s/g,""));
    } else {
      ok = selected.unique_code && selected.unique_code === val;
    }

    if (!ok) { setError("Datos incorrectos"); setSaving(false); return; }

    // Log access
    await supabase.from("user_access_logs").insert({
      player_id: selected.id,
      player_name: selected.name,
      method: mode,
      page: window.location.pathname,
      accessed_at: new Date().toISOString(),
      session_id: localStorage.getItem("aor_sid")||"unknown",
    });

    // +1 pt/day for unique_code users
    if (mode === "code") {
      const today = new Date().toISOString().slice(0,10);
      const {data:existing} = await supabase.from("user_access_logs")
        .select("id").eq("player_id", selected.id).eq("method","code")
        .gte("accessed_at", today+"T00:00:00Z").limit(2);
      if (existing && existing.length === 1) { // first time today
        await supabase.from("players").update({
          pts_acumulados: (selected.pts_acumulados||0) + 1
        }).eq("id", selected.id);
      }
    }

    const identity = {id: selected.id, name: selected.name, phone: selected.phone};
    sessionStorage.setItem("aor_user_identity", JSON.stringify(identity));
    setSaving(false);
    onAuthenticated && onAuthenticated(identity);
  }

  if (loading) return (
    <div style={{padding:"40px",textAlign:"center",fontFamily:"monospace",fontSize:"10px",color:"rgba(255,255,255,0.3)",letterSpacing:"0.2em"}}>
      VERIFICANDO ACCESO...
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",fontFamily:"Georgia,serif"}}>
      <div style={{width:"100%",maxWidth:"360px"}}>
        <div style={{textAlign:"center",marginBottom:"24px"}}>
          <div style={{fontSize:"8px",letterSpacing:"0.5em",color:"rgba(255,255,255,0.2)",fontFamily:"monospace",marginBottom:"4px"}}>ANTIGUA ORDEN</div>
          <div style={{fontSize:"12px",color:"rgba(255,255,255,0.1)",marginBottom:"4px"}}>⚔</div>
          <div style={{fontSize:"8px",letterSpacing:"0.3em",color:"rgba(64,224,255,0.4)",fontFamily:"monospace",marginBottom:"8px"}}>[AOR]</div>
          <div style={{fontSize:"16px",color:"#40E0FF",fontFamily:"monospace",letterSpacing:"0.1em"}}>IDENTIFICACIÓN</div>
        </div>

        {/* Name search */}
        <div style={{marginBottom:"10px",position:"relative"}}>
          <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,255,255,0.25)",letterSpacing:"0.15em",marginBottom:"4px"}}>NOMBRE EN EL JUEGO</div>
          <input value={nameInput} onChange={e=>handleName(e.target.value)}
            placeholder="Escribe tu nombre..."
            style={{width:"100%",background:"rgba(255,255,255,0.03)",border:"1px solid "+(selected?"rgba(64,224,255,0.3)":"rgba(255,255,255,0.1)"),borderRadius:"6px",color:"#d4c9a8",padding:"10px 12px",fontSize:"13px",outline:"none",boxSizing:"border-box",fontFamily:"Georgia,serif"}}/>
          {selected && <div style={{position:"absolute",right:"10px",top:"32px",fontSize:"10px",color:"#40E0FF",fontFamily:"monospace"}}>✓</div>}
          {suggestions.length>0 && !selected && (
            <div style={{background:"#0f0f14",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"6px",marginTop:"2px",position:"absolute",width:"100%",zIndex:10}}>
              {suggestions.map(p=>(
                <div key={p.id} onClick={()=>{setSelected(p);setNameInput(p.name);setSuggestions([]);}} style={{padding:"9px 12px",cursor:"pointer",fontSize:"13px",color:"#d4c9a8",borderBottom:"1px solid rgba(255,255,255,0.04)",fontFamily:"Georgia,serif"}}>
                  {p.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mode selector */}
        <div style={{display:"flex",gap:"4px",marginBottom:"10px"}}>
          <button onClick={()=>{setMode("phone");setCodeInput("");setError("");}} style={{flex:1,padding:"7px",background:mode==="phone"?"rgba(64,224,255,0.1)":"rgba(255,255,255,0.02)",border:"1px solid "+(mode==="phone"?"rgba(64,224,255,0.3)":"rgba(255,255,255,0.07)"),borderRadius:"5px",color:mode==="phone"?"#40E0FF":"rgba(255,255,255,0.3)",fontSize:"10px",cursor:"pointer",fontFamily:"monospace"}}>
            TELÉFONO
          </button>
          <button onClick={()=>{setMode("code");setCodeInput("");setError("");}} style={{flex:1,padding:"7px",background:mode==="code"?"rgba(255,215,0,0.1)":"rgba(255,255,255,0.02)",border:"1px solid "+(mode==="code"?"rgba(255,215,0,0.3)":"rgba(255,255,255,0.07)"),borderRadius:"5px",color:mode==="code"?"#FFD700":"rgba(255,255,255,0.3)",fontSize:"10px",cursor:"pointer",fontFamily:"monospace"}}>
            CÓDIGO ÚNICO
          </button>
        </div>

        {/* Input */}
        <div style={{marginBottom:"8px"}}>
          <div style={{fontFamily:"monospace",fontSize:"8px",color:"rgba(255,255,255,0.25)",letterSpacing:"0.15em",marginBottom:"4px"}}>
            {mode==="phone"?"NÚMERO WHATSAPP (ej: +593977321575)":"CÓDIGO DE 6 DÍGITOS"}
          </div>
          <input value={codeInput} onChange={e=>setCodeInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&verify()}
            type={mode==="code"?"tel":"tel"} placeholder={mode==="phone"?"+591...": "------"}
            autoComplete="off" maxLength={mode==="code"?6:20}
            style={{width:"100%",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"6px",color:"#fff",padding:"10px 12px",fontSize:"16px",outline:"none",boxSizing:"border-box",letterSpacing:mode==="code"?"0.3em":"normal",fontFamily:"monospace"}}/>
        </div>
        {mode==="code" && <div style={{fontSize:"9px",color:"rgba(255,215,0,0.4)",marginBottom:"8px",fontFamily:"monospace"}}>+1 punto al día por usar tu código único</div>}
        {mode==="phone" && <div style={{fontSize:"9px",color:"rgba(255,255,255,0.2)",marginBottom:"8px",fontFamily:"monospace"}}>Si olvidaste tu código, usa tu número siempre</div>}

        {error && <div style={{fontSize:"10px",color:"#FF6B6B",marginBottom:"8px",fontFamily:"monospace",letterSpacing:"0.05em"}}>{error}</div>}

        <button onClick={verify} disabled={saving} style={{width:"100%",padding:"11px",background:"rgba(64,224,255,0.1)",border:"1px solid rgba(64,224,255,0.25)",borderRadius:"7px",color:"#40E0FF",fontSize:"12px",cursor:"pointer",fontFamily:"monospace",letterSpacing:"0.15em",fontWeight:"bold"}}>
          {saving?"VERIFICANDO...":"ACCEDER"}
        </button>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import { storeSession, clearSession } from "./SessionManager";

export default function LoginGate({onLogin, children}) {
  const [authEnabled, setAuthEnabled] = useState(null);
  const [session, setSession] = useState(()=>{
    // Check session immediately (sync) to avoid flash
    try {
      const s = sessionStorage.getItem("aor_session");
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });
  const [checking, setChecking] = useState(true);

  useEffect(()=>{
    // Save the page the user wanted to visit
    const currentPath = window.location.pathname;
    if (currentPath !== "/" && !sessionStorage.getItem("aor_intended_url")) {
      sessionStorage.setItem("aor_intended_url", currentPath);
    }
    // Clean up any stale bypass flags
    supabase.from("app_settings").select("value").eq("key","user_auth_enabled").single()
      .then(({data})=>{
        setAuthEnabled(data?.value === "true");
        setChecking(false);
      })
      .catch(()=>{ setAuthEnabled(false); setChecking(false); });
  },[]);

  if (checking) return <SplashScreen/>;
  if (!authEnabled) return children;   // Auth disabled → pass through
  if (session) return children;         // Already logged in → pass through

  // Not logged in → show login screen
  return <LoginScreen onLogin={(player)=>{
    storeSession(player);
    setSession({id:player.id, name:player.name, clan_role:player.clan_role});
    onLogin && onLogin(player);
    // Navigate to the originally requested page, or to player's profile if going to HOME
    const intended = sessionStorage.getItem("aor_intended_url");
    sessionStorage.removeItem("aor_intended_url");
    if (intended && intended !== "/") {
      window.location.href = intended;
    } else {
      // Default: go directly to own profile
      window.location.href = "/reporte?own=1";
    }
  }}/>;
}

function SplashScreen() {
  return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{fontFamily:"monospace",fontSize:"9px",letterSpacing:"0.4em",color:"rgba(64,224,255,0.2)"}}>CARGANDO...</div>
    </div>
  );
}

function LoginScreen({onLogin}) {
  const [players, setPlayers]     = useState([]);
  const [nameInput, setNameInput] = useState("");
  const [suggestions, setSugg]    = useState([]);
  const [selected, setSelected]   = useState(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [mode, setMode]           = useState("phone"); // "phone" or "code"
  const [error, setError]         = useState(null); // null | "wrong" | "not_registered"
  const [loading, setLoading]     = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [authMethod, setAuthMethod] = useState("both");
  const phoneRef = useRef(null);
  useEffect(()=>{
    supabase.from("app_settings").select("value").eq("key","auth_method").single()
      .then(({data})=>{
        if (data?.value) {
          setAuthMethod(data.value);
          if (data.value==="code_only") setMode("code");
          if (data.value==="phone_only") setMode("phone");
        }
      });
  },[]);

  useEffect(()=>{
    supabase.from("players").select("id,name,clan_role,availability,unique_code,phone,active,pts_acumulados,whatsapp")
      .eq("active",true).order("name")
      .then(({data})=>{ setPlayers(data||[]); setLoading(false); });
  },[]);

  function handleName(val) {
    setNameInput(val); setSelected(null); setPhoneInput(""); setError(null);
    if (val.length<1){setSugg([]);return;}
    const normalize = s => s.toLowerCase().replace(/[''`]/g,"'");
    const matches = players.filter(p=>normalize(p.name).startsWith(normalize(val))).slice(0,6);
    setSugg(matches);
    // Auto-switch to code mode if this player has a cached code
    if (matches.length===1) {
      const cached = localStorage.getItem("aor_saved_code_"+matches[0].name.toLowerCase().slice(0,8));
      if (cached && authMethod !== "phone_only") setMode("code");
    }
  }

  function selectPlayer(p) {
    setSelected(p); setNameInput(p.name); setSugg([]);
    // Restore preferred mode for this player
    const prefMode = localStorage.getItem("aor_pref_mode_"+p.id);
    const cachedCode = localStorage.getItem("aor_code_"+p.id);
    if (prefMode && authMethod !== "phone_only" && !(prefMode==="code" && authMethod==="phone_only")) {
      setMode(prefMode);
      if (prefMode==="code" && cachedCode) setPhoneInput(cachedCode);
      else setPhoneInput("");
    } else {
      if (cachedCode && mode==="code") setPhoneInput(cachedCode);
      else setPhoneInput("");
    }
    setTimeout(()=>phoneRef.current?.focus(), 100);
  }

  async function verify() {
    if (!selected) return;
    if (!phoneInput.trim()) { setError("wrong"); return; }
    setVerifying(true);
    // Normalize phone: strip spaces, dashes, and allow entry without leading +
    function normalizePhone(p) {
      if (!p) return "";
      p = p.replace(/[\s\-]/g,"");
      if (!p.startsWith("+")) p = "+"+p;
      return p;
    }
    const val = phoneInput.trim();
    let ok = false;
    if (mode === "phone") {
      ok = selected.phone && normalizePhone(selected.phone) === normalizePhone(val);
    } else {
      ok = selected.unique_code && selected.unique_code === val.replace(/\D/g,"").slice(0,6);
    }
    if (!ok) {
      // Log failed attempt — wrapped in try/catch so it never hangs
      try {
        await supabase.from("user_access_logs").insert({
          player_id: selected.id, player_name: selected.name,
          method: "failed_"+mode, page: window.location.pathname,
          accessed_at: new Date().toISOString(),
        });
      } catch(e) {}
      setVerifying(false);
      setPhoneInput("");
      if (!selected.phone && !selected.unique_code) setError("not_registered");
      else setError("wrong");
      return;
    }
    // Log success — all in try/catch so nothing blocks login
    try {
      await supabase.from("user_access_logs").insert({
        player_id: selected.id, player_name: selected.name,
        method: mode, page: window.location.pathname,
        accessed_at: new Date().toISOString(),
      });
    } catch(e) {}
    // +1pt for code usage (once per day)
    if (mode === "code") {
      try {
        const today = new Date().toISOString().slice(0,10);
        const {data:logs} = await supabase.from("user_access_logs")
          .select("id").eq("player_id",selected.id).eq("method","code")
          .gte("accessed_at",today+"T00:00:00Z");
        if (logs && logs.length <= 1) {
          await supabase.from("players").update({pts_acumulados:(selected.pts_acumulados||0)+1}).eq("id",selected.id);
        }
      } catch(e) {}
    }
    setVerifying(false);
    onLogin(selected);
  }

  if (error === "wrong" || error === "not_registered") {
    return <ErrorScreen error={error} onRetry={()=>{setError(null);setPhoneInput("");}} playerName={selected?.name}/>;
  }

  return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",fontFamily:"Georgia,serif"}}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .login-in{animation:fadeUp 0.5s ease forwards}
        .login-in-d{animation:fadeUp 0.6s ease 0.1s forwards;opacity:0}
        .login-in-d2{animation:fadeUp 0.6s ease 0.2s forwards;opacity:0}
        input::placeholder{color:rgba(255,255,255,0.2)!important}
      `}</style>

      <div style={{width:"100%",maxWidth:"380px"}}>
        {/* Header */}
        <div className="login-in" style={{textAlign:"center",marginBottom:"32px"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:"12px",marginBottom:"16px"}}>
            <div style={{width:"1px",height:"32px",background:"linear-gradient(to bottom,transparent,rgba(64,224,255,0.4),transparent)"}}/>
            <div>
              <div style={{fontSize:"7px",letterSpacing:"0.6em",color:"rgba(255,255,255,0.2)",fontFamily:"monospace",marginBottom:"6px"}}>ANTIGUA ORDEN</div>
              <div style={{fontSize:"24px",color:"rgba(255,255,255,0.06)"}}>⚔</div>
            </div>
            <div style={{width:"1px",height:"32px",background:"linear-gradient(to bottom,transparent,rgba(64,224,255,0.4),transparent)"}}/>
          </div>
          <div style={{fontSize:"9px",letterSpacing:"0.4em",color:"rgba(64,224,255,0.5)",fontFamily:"monospace",marginBottom:"4px"}}>[AOR]</div>
          <div style={{fontSize:"22px",color:"#40E0FF",fontFamily:"monospace",letterSpacing:"0.08em",fontWeight:"bold"}}>WAR COMMAND</div>
          <div style={{fontSize:"9px",color:"rgba(255,255,255,0.2)",marginTop:"6px",fontFamily:"monospace",letterSpacing:"0.15em"}}>SISTEMA DE ACCESO</div>
        </div>

        {/* Name field */}
        <div className="login-in-d" style={{marginBottom:"10px",position:"relative"}}>
          <div style={{fontFamily:"monospace",fontSize:"7px",letterSpacing:"0.2em",color:"rgba(255,255,255,0.2)",marginBottom:"4px"}}>NOMBRE EN EL JUEGO</div>
          <input value={nameInput} onChange={e=>handleName(e.target.value)}
            disabled={loading} autoFocus
            placeholder={loading?"Cargando...":"Escribe para buscar..."}
            style={{width:"100%",background:"rgba(255,255,255,0.03)",border:"1px solid "+(selected?"rgba(64,224,255,0.4)":"rgba(255,255,255,0.08)"),borderRadius:"8px",color:selected?"#40E0FF":"#d4c9a8",padding:"12px 14px",fontSize:"14px",outline:"none",boxSizing:"border-box",transition:"border 0.2s",fontFamily:"Georgia,serif"}}/>
          {selected && (
            <div style={{position:"absolute",right:"12px",top:"30px",fontFamily:"monospace",fontSize:"9px",color:"#40E0FF"}}>✓ IDENTIFICADO</div>
          )}
          {suggestions.length>0 && (
            <div style={{position:"absolute",width:"100%",background:"#0f0f15",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"6px",marginTop:"2px",zIndex:20,boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
              {suggestions.map(p=>(
                <div key={p.id} onClick={()=>selectPlayer(p)} style={{padding:"10px 14px",cursor:"pointer",borderBottom:"1px solid rgba(255,255,255,0.04)",display:"flex",alignItems:"center",gap:"8px"}}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(64,224,255,0.06)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{width:"6px",height:"6px",borderRadius:"50%",background:"rgba(64,224,255,0.3)",flexShrink:0}}/>
                  <span style={{fontSize:"13px",color:"#d4c9a8",fontFamily:"Georgia,serif"}}>{p.name}</span>
                  {p.clan_role && <span style={{fontSize:"9px",color:"rgba(255,255,255,0.2)",fontFamily:"monospace",marginLeft:"auto"}}>{p.clan_role}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Auth mode + input */}
        {selected && (
          <div className="login-in-d2">
            {authMethod !== "code_only" && authMethod !== "phone_only" && (
              <div style={{display:"flex",gap:"4px",marginBottom:"10px"}}>
                <button onClick={()=>{setMode("phone");setPhoneInput("");if(selected)localStorage.setItem("aor_pref_mode_"+selected.id,"phone");}} style={{flex:1,padding:"7px",background:mode==="phone"?"rgba(64,224,255,0.08)":"transparent",border:"1px solid "+(mode==="phone"?"rgba(64,224,255,0.25)":"rgba(255,255,255,0.06)"),borderRadius:"6px",color:mode==="phone"?"#40E0FF":"rgba(255,255,255,0.3)",fontSize:"9px",cursor:"pointer",fontFamily:"monospace",letterSpacing:"0.1em"}}>
                  CLAVE
                </button>
                <button onClick={()=>{setMode("code");const c=selected?localStorage.getItem("aor_code_"+selected.id):"";setPhoneInput(c||"");if(selected)localStorage.setItem("aor_pref_mode_"+selected.id,"code");}} style={{flex:1,padding:"7px",background:mode==="code"?"rgba(255,215,0,0.08)":"transparent",border:"1px solid "+(mode==="code"?"rgba(255,215,0,0.25)":"rgba(255,255,255,0.06)"),borderRadius:"6px",color:mode==="code"?"#FFD700":"rgba(255,255,255,0.3)",fontSize:"9px",cursor:"pointer",fontFamily:"monospace",letterSpacing:"0.1em"}}>
                  CÓDIGO ÚNICO
                </button>
              </div>
            )}
            <div style={{fontFamily:"monospace",fontSize:"7px",letterSpacing:"0.2em",color:"rgba(255,255,255,0.2)",marginBottom:"4px"}}>
              {mode==="phone"?"CLAVE DE ACCESO — no se almacena":"CÓDIGO ÚNICO DE 6 DÍGITOS"}
            </div>
            <input
              ref={phoneRef}
              value={phoneInput}
              onChange={e=>{
                const v = mode==="code" ? e.target.value.replace(/\D/g,"").slice(0,6) : e.target.value;
                setPhoneInput(v);
                if (mode==="code" && v.length===6 && selected) {
                  // Save code to localStorage keyed by player id (more reliable than name)
                  localStorage.setItem("aor_code_"+selected.id, v);
                  localStorage.setItem("aor_pref_mode_"+selected.id, "code");
                }
              }}
              onKeyDown={e=>e.key==="Enter"&&verify()}
              type={mode==="code"?"password":"tel"}
              placeholder={mode==="phone"?"--- --- --- ---":""}
              autoComplete="off" autoCorrect="off" spellCheck="false"
              style={{width:"100%",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"8px",color:"#fff",padding:"12px 14px",fontSize:mode==="code"?"20px":"14px",outline:"none",boxSizing:"border-box",letterSpacing:"normal",fontFamily:"monospace",marginBottom:"8px"}}/>
            {mode==="code" && <div style={{fontSize:"8px",color:"rgba(255,215,0,0.3)",fontFamily:"monospace",marginBottom:"8px",letterSpacing:"0.1em"}}>+1 PUNTO AL DÍA POR USAR TU CÓDIGO</div>}
            {mode==="phone" && <div style={{fontSize:"8px",color:"rgba(255,255,255,0.15)",fontFamily:"monospace",marginBottom:"8px",letterSpacing:"0.1em"}}>EL NÚMERO NO SE ALMACENA EN NINGÚN CACHÉ</div>}

            <button onClick={verify} disabled={verifying||!phoneInput.trim()} style={{width:"100%",padding:"13px",background:phoneInput?"rgba(64,224,255,0.1)":"rgba(255,255,255,0.02)",border:"1px solid "+(phoneInput?"rgba(64,224,255,0.3)":"rgba(255,255,255,0.05)"),borderRadius:"8px",color:phoneInput?"#40E0FF":"rgba(255,255,255,0.2)",fontSize:"11px",cursor:phoneInput?"pointer":"default",fontFamily:"monospace",letterSpacing:"0.2em",fontWeight:"bold",transition:"all 0.2s"}}>
              {verifying?"VERIFICANDO...":"ACCEDER →"}
            </button>

            <div style={{marginTop:"10px",textAlign:"center",fontSize:"8px",color:"rgba(255,255,255,0.15)",fontFamily:"monospace",lineHeight:"1.6"}}>
              Si olvidaste tu código único, usa tu clave de acceso.
              Si no estás en el sistema, contacta a un administrador.
            </div>
            <div style={{marginTop:"24px",textAlign:"center",fontSize:"7px",letterSpacing:"0.25em",color:"rgba(255,255,255,0.06)",fontFamily:"monospace"}}>
              DEVELOPED BY NALGUITAS TECH
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorScreen({error, onRetry, playerName}) {
  if (error === "not_registered") {
    return (
      <div style={{minHeight:"100vh",background:"#0d0d0f",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",fontFamily:"Georgia,serif"}}>
        <div style={{maxWidth:"360px",textAlign:"center"}}>
          <div style={{fontSize:"48px",marginBottom:"16px",opacity:0.4}}>🚫</div>
          <div style={{fontFamily:"monospace",fontSize:"10px",letterSpacing:"0.2em",color:"rgba(255,107,107,0.5)",marginBottom:"8px"}}>ACCESO DENEGADO</div>
          <div style={{fontSize:"16px",color:"rgba(255,255,255,0.6)",marginBottom:"8px"}}>{playerName}</div>
          <div style={{fontSize:"11px",color:"rgba(255,255,255,0.3)",marginBottom:"20px",lineHeight:"1.6"}}>
            No estás registrado en el sistema.<br/>Contacta a un administrador del clan para solicitar acceso.
          </div>
          <button onClick={onRetry} style={{padding:"10px 24px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"7px",color:"rgba(255,255,255,0.4)",fontSize:"10px",cursor:"pointer",fontFamily:"monospace",letterSpacing:"0.15em"}}>
            INTENTAR DE NUEVO
          </button>
        </div>
      </div>
    );
  }

  // Wrong credentials - cowboy screen
  return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"20px",fontFamily:"Georgia,serif"}}>
      <style>{`@keyframes shake{0%,100%{transform:rotate(0deg)}25%{transform:rotate(-2deg)}75%{transform:rotate(2deg)}}`}</style>
      <div style={{animation:"shake 0.4s ease",fontSize:"72px",marginBottom:"12px"}}>⚔️🛡️</div>
      <div style={{fontFamily:"monospace",fontSize:"8px",letterSpacing:"0.3em",color:"rgba(255,107,107,0.4)",marginBottom:"12px"}}>ACCESO DENEGADO</div>
      <div style={{fontSize:"15px",color:"rgba(255,107,107,0.7)",textAlign:"center",maxWidth:"320px",lineHeight:"1.7",marginBottom:"20px",fontFamily:"Georgia,serif",fontStyle:"italic"}}>
        "El código es incorrecto y lo sabes.<br/>Forastero, este pueblo es muy pequeño para ti y para mí.<br/>Regresa por donde viniste y no veas atrás."
      </div>
      <button onClick={onRetry} style={{padding:"11px 28px",background:"rgba(255,159,67,0.08)",border:"1px solid rgba(255,159,67,0.2)",borderRadius:"7px",color:"rgba(255,159,67,0.7)",fontSize:"10px",cursor:"pointer",fontFamily:"monospace",letterSpacing:"0.2em"}}>
        INTENTAR DE NUEVO
      </button>
    </div>
  );
}

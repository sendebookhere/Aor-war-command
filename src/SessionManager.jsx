import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "./supabase";

const SessionContext = createContext(null);

export function useSession() {
  return useContext(SessionContext);
}

// Global session - persists via sessionStorage (clears on tab close)
export function getStoredSession() {
  try {
    const s = sessionStorage.getItem("aor_session");
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

export function storeSession(player) {
  // Never store phone in session
  const safe = {id: player.id, name: player.name, clan_role: player.clan_role, availability: player.availability};
  sessionStorage.setItem("aor_session", JSON.stringify(safe));
  sessionStorage.setItem("aor_player_id", String(player.id));
  sessionStorage.setItem("aor_player_name", player.name);
  // Also store for backward compat
  sessionStorage.setItem("aor_user_identity", JSON.stringify(safe));
}

export function clearSession() {
  sessionStorage.removeItem("aor_session");
  sessionStorage.removeItem("aor_player_id");
  sessionStorage.removeItem("aor_player_name");
  sessionStorage.removeItem("aor_user_identity");
  sessionStorage.removeItem("aor_auth");
  // Never store phone - always cleared
}

// Country code detection from phone prefix
export function getCountry(phone) {
  if (!phone) return {country:"Desconocido", code:"?", flag:"🌐"};
  const prefixes = [
    {prefix:"+1",country:"EE.UU./Canadá",code:"US/CA",flag:"🇺🇸"},
    {prefix:"+34",country:"España",code:"ES",flag:"🇪🇸"},
    {prefix:"+52",country:"México",code:"MX",flag:"🇲🇽"},
    {prefix:"+57",country:"Colombia",code:"CO",flag:"🇨🇴"},
    {prefix:"+58",country:"Venezuela",code:"VE",flag:"🇻🇪"},
    {prefix:"+591",country:"Bolivia",code:"BO",flag:"🇧🇴"},
    {prefix:"+593",country:"Ecuador",code:"EC",flag:"🇪🇨"},
    {prefix:"+595",country:"Paraguay",code:"PY",flag:"🇵🇾"},
    {prefix:"+598",country:"Uruguay",code:"UY",flag:"🇺🇾"},
    {prefix:"+54",country:"Argentina",code:"AR",flag:"🇦🇷"},
    {prefix:"+55",country:"Brasil",code:"BR",flag:"🇧🇷"},
    {prefix:"+51",country:"Perú",code:"PE",flag:"🇵🇪"},
    {prefix:"+56",country:"Chile",code:"CL",flag:"🇨🇱"},
    {prefix:"+972",country:"Israel",code:"IL",flag:"🇮🇱"},
    {prefix:"+598",country:"Uruguay",code:"UY",flag:"🇺🇾"},
  ].sort((a,b)=>b.prefix.length-a.prefix.length);
  for (const p of prefixes) {
    if (phone.startsWith(p.prefix)) return p;
  }
  return {country:"Otro",code:"?",flag:"🌐"};
}

export default SessionContext;

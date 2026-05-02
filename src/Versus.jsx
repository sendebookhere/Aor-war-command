import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import NavBar from "./NavBar";
import PageHeader from "./PageHeader";
import NalguitasFooter from "./NalguitasFooter";

export default function Versus() {
  return (
    <div style={{minHeight:"100vh",background:"#0d0d0f",fontFamily:"Georgia,serif",color:"#d4c9a8",padding:"20px",paddingBottom:"50px"}}>
      <div style={{maxWidth:"560px",margin:"0 auto"}}>
        <NavBar current="/versus"/>
        <PageHeader page="/versus"/>
        <div style={{textAlign:"center",padding:"32px",color:"rgba(255,255,255,0.2)",fontSize:"11px"}}>
          <div style={{fontSize:"32px",marginBottom:"12px",opacity:0.4}}>⚔</div>
          Sistema de desafíos 1v1 — próximamente
        </div>
      </div>
      <NalguitasFooter/>
    </div>
  );
}
